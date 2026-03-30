import { HiDockDevice, StorageInfo, AudioRecording } from '@/types';

const VENDOR_ID = 0x10d6;
const ALTERNATE_VENDOR_ID = 0x3887;
const INTERFACE_NUMBER = 0;
const ENDPOINT_IN = 2;
const ENDPOINT_OUT = 1;

const SUPPORTED_PRODUCTS = [0xaf0c, 0xaf0d, 0xb00d, 0xaf0e, 0xb00e, 0xaf0f];

const COMMANDS = {
  GET_DEVICE_INFO: 1,
  SET_DEVICE_TIME: 3,
  GET_FILE_LIST: 4,
  TRANSFER_FILE: 5,
  GET_FILE_COUNT: 6,
  DELETE_FILE: 7,
  GET_SETTINGS: 11,
  SET_SETTINGS: 12,
  GET_FILE_BLOCK: 13,
  GET_CARD_INFO: 16,
  FORMAT_CARD: 17,
};

interface DeviceInfo {
  model: string;
  serialNumber: string;
  firmwareVersion: string;
}

class DeviceService {
  private device: USBDevice | null = null;
  private sequenceId = 0;
  private receiveBuffer = new Uint8Array(0);

  async requestDevice(): Promise<USBDevice> {
    try {
      const device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: VENDOR_ID, classCode: 0xff },
          { vendorId: ALTERNATE_VENDOR_ID, classCode: 0xff },
        ],
      });
      return device;
    } catch (error) {
      if (error instanceof Error && error.name === 'NotFoundError') {
        throw new Error('No HiDock device found. Please connect your device.');
      }
      throw error;
    }
  }

  async connectDevice(device: USBDevice): Promise<HiDockDevice> {
    try {
      this.device = device;
      this.sequenceId = 0;
      this.receiveBuffer = new Uint8Array(0);

      await device.open();
      await device.selectConfiguration(1);
      await device.claimInterface(INTERFACE_NUMBER);

      const info = await this.getDeviceInfo();
      const storage = await this.getStorageInfo();

      const hiDockDevice: HiDockDevice = {
        id: `${device.vendorId}-${device.productId}-${info.serialNumber}`,
        name: `HiDock ${info.model}`,
        model: info.model,
        serialNumber: info.serialNumber,
        firmwareVersion: info.firmwareVersion,
        connected: true,
        storageInfo: storage,
      };

      return hiDockDevice;
    } catch (error) {
      await this.disconnectDevice();
      throw error;
    }
  }

  async disconnectDevice(): Promise<void> {
    if (this.device) {
      try {
        await this.device.releaseInterface(INTERFACE_NUMBER);
        await this.device.close();
      } catch (error) {
        console.error('Error disconnecting device:', error);
      }
      this.device = null;
      this.receiveBuffer = new Uint8Array(0);
    }
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    const seqId = await this.sendCommand(COMMANDS.GET_DEVICE_INFO);
    const response = await this.receiveResponse(seqId);

    const data = response.body;
    let offset = 0;

    const modelLength = this.readUint16BE(data, offset);
    offset += 2;
    const modelBytes = data.slice(offset, offset + modelLength);
    const model = new TextDecoder().decode(modelBytes);
    offset += modelLength;

    const serialLength = this.readUint16BE(data, offset);
    offset += 2;
    const serialBytes = data.slice(offset, offset + serialLength);
    const serialNumber = new TextDecoder().decode(serialBytes);
    offset += serialLength;

    const fwLength = this.readUint16BE(data, offset);
    offset += 2;
    const fwBytes = data.slice(offset, offset + fwLength);
    const firmwareVersion = new TextDecoder().decode(fwBytes);

    return {
      model,
      serialNumber,
      firmwareVersion,
    };
  }

  async getStorageInfo(): Promise<StorageInfo> {
    const seqId = await this.sendCommand(COMMANDS.GET_CARD_INFO);
    const response = await this.receiveResponse(seqId);

    const data = response.body;
    const totalSpace = this.readUint64BE(data, 0);
    const usedSpace = this.readUint64BE(data, 8);
    const fileCount = this.readUint32BE(data, 16);

    return {
      totalSpace,
      usedSpace,
      freeSpace: totalSpace - usedSpace,
      fileCount,
    };
  }

  async getFileList(onProgress?: (files: AudioRecording[]) => void): Promise<AudioRecording[]> {
    const seqId = await this.sendCommand(COMMANDS.GET_FILE_LIST);
    return this.receiveStreamingFileList(seqId, onProgress);
  }

  async downloadFile(
    fileName: string,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const fileNameBytes = new TextEncoder().encode(fileName);
    const chunks = [];

    const BLOCK_SIZE = 32768;
    let offset = 0;

    while (true) {
      const body = new Uint8Array(fileNameBytes.length + 8);
      body.set(fileNameBytes, 0);
      this.writeUint32BE(body, fileNameBytes.length, offset);
      this.writeUint32BE(body, fileNameBytes.length + 4, BLOCK_SIZE);

      const seqId = await this.sendCommand(COMMANDS.GET_FILE_BLOCK, body);
      const response = await this.receiveResponse(seqId, 30000);

      if (response.body.length === 0) {
        break;
      }

      chunks.push(response.body);
      offset += response.body.length;

      if (onProgress) {
        onProgress(Math.min(100, (offset / 1000000) * 100));
      }

      if (response.body.length < BLOCK_SIZE) {
        break;
      }
    }

    return new Blob(chunks, { type: 'audio/wav' });
  }

  async deleteFile(fileName: string): Promise<void> {
    const fileNameBytes = new TextEncoder().encode(fileName);
    const seqId = await this.sendCommand(COMMANDS.DELETE_FILE, fileNameBytes);
    await this.receiveResponse(seqId);
  }

  async formatStorage(): Promise<void> {
    const seqId = await this.sendCommand(COMMANDS.FORMAT_CARD);
    await this.receiveResponse(seqId, 60000);
  }

  async syncTime(): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);
    const body = new Uint8Array(4);
    this.writeUint32BE(body, 0, timestamp);

    const seqId = await this.sendCommand(COMMANDS.SET_DEVICE_TIME, body);
    await this.receiveResponse(seqId);
  }

  private async sendCommand(commandId: number, body?: Uint8Array): Promise<number> {
    if (!this.device) {
      throw new Error('Device not connected');
    }

    this.sequenceId = (this.sequenceId + 1) % 0x100000000;
    const seqId = this.sequenceId;

    const bodyLen = body?.length ?? 0;
    const packet = new Uint8Array(12 + bodyLen);

    packet[0] = 0x12;
    packet[1] = 0x34;
    this.writeUint16BE(packet, 2, commandId);
    this.writeUint32BE(packet, 4, seqId);
    this.writeUint32BE(packet, 8, bodyLen);

    if (body) {
      packet.set(body, 12);
    }

    await this.device.transferOut(ENDPOINT_OUT, packet);
    return seqId;
  }

  private async receiveResponse(
    expectedSeqId: number,
    timeout: number = 10000
  ): Promise<{ commandId: number; body: Uint8Array }> {
    if (!this.device) {
      throw new Error('Device not connected');
    }

    const startTime = Date.now();
    const buffer = new Uint8Array(65536);

    while (Date.now() - startTime < timeout) {
      try {
        const result = await this.device.transferIn(ENDPOINT_IN, 65536);

        if (result.status === 'ok' && result.data) {
          this.receiveBuffer = new Uint8Array([...this.receiveBuffer, ...new Uint8Array(result.data.buffer)]);
        }

        if (this.receiveBuffer.length >= 12) {
          if (this.receiveBuffer[0] !== 0x12 || this.receiveBuffer[1] !== 0x34) {
            this.receiveBuffer = this.receiveBuffer.slice(1);
            continue;
          }

          const commandId = this.readUint16BE(this.receiveBuffer, 2);
          const seqId = this.readUint32BE(this.receiveBuffer, 4);
          const lengthField = this.readUint32BE(this.receiveBuffer, 8);

          const checksumLen = (lengthField >> 24) & 0xff;
          const bodyLen = lengthField & 0xffffff;
          const totalLen = 12 + bodyLen + checksumLen;

          if (this.receiveBuffer.length >= totalLen) {
            const body = this.receiveBuffer.slice(12, 12 + bodyLen);
            this.receiveBuffer = this.receiveBuffer.slice(totalLen);

            if (seqId === expectedSeqId) {
              return { commandId, body };
            }
          }
        }
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('Timeout')) {
          throw error;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    throw new Error(`Timeout waiting for response (seq: ${expectedSeqId})`);
  }

  private async receiveStreamingFileList(
    expectedSeqId: number,
    onProgress?: (files: AudioRecording[]) => void
  ): Promise<AudioRecording[]> {
    if (!this.device) {
      throw new Error('Device not connected');
    }

    const recordings: AudioRecording[] = [];
    let completeBuffer = new Uint8Array(0);
    const startTime = Date.now();
    const timeout = 30000;

    while (Date.now() - startTime < timeout) {
      try {
        const result = await this.device.transferIn(ENDPOINT_IN, 65536);

        if (result.status === 'ok' && result.data) {
          completeBuffer = new Uint8Array([...completeBuffer, ...new Uint8Array(result.data.buffer)]);
        }

        let offset = 0;
        while (offset < completeBuffer.length) {
          if (offset + 2 <= completeBuffer.length) {
            if (completeBuffer[offset] !== 0x12 || completeBuffer[offset + 1] !== 0x34) {
              offset++;
              continue;
            }
          }

          if (offset + 12 > completeBuffer.length) {
            break;
          }

          const commandId = this.readUint16BE(completeBuffer, offset + 2);
          const seqId = this.readUint32BE(completeBuffer, offset + 4);
          const lengthField = this.readUint32BE(completeBuffer, offset + 8);

          const checksumLen = (lengthField >> 24) & 0xff;
          const bodyLen = lengthField & 0xffffff;
          const totalLen = 12 + bodyLen + checksumLen;

          if (offset + totalLen > completeBuffer.length) {
            break;
          }

          if (seqId === expectedSeqId || seqId === 0) {
            const body = completeBuffer.slice(offset + 12, offset + 12 + bodyLen);

            let bodyOffset = 0;
            while (bodyOffset < body.length) {
              const result = this.parseFileRecord(body, bodyOffset);
              recordings.push(result.recording);
              bodyOffset += result.bytesRead;

              if (onProgress) {
                onProgress(recordings);
              }

              if (bodyOffset >= body.length) {
                break;
              }
            }
          }

          offset += totalLen;
        }

        completeBuffer = completeBuffer.slice(offset);

        if (recordings.length > 0) {
          return recordings;
        }
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('Timeout')) {
          if (recordings.length > 0) {
            return recordings;
          }
          throw error;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    return recordings;
  }

  private parseFileRecord(
    data: Uint8Array,
    offset: number
  ): { recording: AudioRecording; bytesRead: number } {
    const version = data[offset];
    const filenameLen =
      (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    const filenameStart = offset + 4;
    const filenameEnd = filenameStart + filenameLen;

    const fileNameBytes = data.slice(filenameStart, filenameEnd);
    const fileName = new TextDecoder().decode(fileNameBytes);

    const sizeOffset = filenameEnd;
    const size = this.readUint32BE(data, sizeOffset);

    const duration =
      version === 1
        ? size / 16000
        : version === 2
          ? size / 32000
          : size / 16000;

    const signatureOffset = sizeOffset + 4 + 6;
    const signature = data.slice(signatureOffset, signatureOffset + 16);

    const bytesRead = signatureOffset + 16 - offset;

    return {
      recording: {
        id: fileName,
        fileName,
        size,
        duration,
        dateCreated: new Date(),
        fileVersion: version,
        signature,
      },
      bytesRead,
    };
  }

  getDeviceName(): string | null {
    return this.device ? `${this.device.productName}` : null;
  }

  isConnected(): boolean {
    return this.device !== null;
  }

  private readUint16BE(data: Uint8Array, offset: number): number {
    return (data[offset] << 8) | data[offset + 1];
  }

  private readUint32BE(data: Uint8Array, offset: number): number {
    return (
      (data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3]
    );
  }

  private readUint64BE(data: Uint8Array, offset: number): number {
    const high = this.readUint32BE(data, offset);
    const low = this.readUint32BE(data, offset + 4);
    return high * 0x100000000 + low;
  }

  private writeUint16BE(data: Uint8Array, offset: number, value: number): void {
    data[offset] = (value >> 8) & 0xff;
    data[offset + 1] = value & 0xff;
  }

  private writeUint32BE(data: Uint8Array, offset: number, value: number): void {
    data[offset] = (value >> 24) & 0xff;
    data[offset + 1] = (value >> 16) & 0xff;
    data[offset + 2] = (value >> 8) & 0xff;
    data[offset + 3] = value & 0xff;
  }
}

export const deviceService = new DeviceService();
