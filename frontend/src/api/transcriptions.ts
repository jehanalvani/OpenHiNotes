import { apiClient } from './client';
import { Transcription, PaginatedResponse } from '@/types';

export const transcriptionsApi = {
  async uploadAndTranscribe(
    file: File,
    language: string = 'auto',
    autoSummarize: boolean = false,
    templateId?: string
  ): Promise<Transcription> {
    const extraFields: Record<string, string> = {
      language,
      auto_summarize: autoSummarize.toString(),
    };

    if (templateId) {
      extraFields.template_id = templateId;
    }

    return apiClient.uploadFile<Transcription>(
      '/transcriptions/upload',
      file,
      extraFields
    );
  },

  async getTranscriptions(
    skip: number = 0,
    limit: number = 20
  ): Promise<PaginatedResponse<Transcription>> {
    return apiClient.get<PaginatedResponse<Transcription>>(
      `/transcriptions?skip=${skip}&limit=${limit}`
    );
  },

  async getTranscription(id: string): Promise<Transcription> {
    return apiClient.get<Transcription>(`/transcriptions/${id}`);
  },

  async updateSpeakers(
    id: string,
    speakers: Record<string, string>
  ): Promise<Transcription> {
    return apiClient.patch<Transcription>(`/transcriptions/${id}/speakers`, {
      speakers,
    });
  },

  async updateNotes(id: string, notes: string): Promise<Transcription> {
    return apiClient.patch<Transcription>(`/transcriptions/${id}/notes`, {
      notes,
    });
  },

  async deleteTranscription(id: string): Promise<void> {
    return apiClient.delete<void>(`/transcriptions/${id}`);
  },
};
