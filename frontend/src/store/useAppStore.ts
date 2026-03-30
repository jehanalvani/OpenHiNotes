import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  HiDockDevice,
  AudioRecording,
  Transcription,
  SummaryTemplate,
} from '@/types';

interface AppState {
  device: HiDockDevice | null;
  recordings: AudioRecording[];
  isDeviceConnected: boolean;
  selectedRecordings: string[];
  theme: 'dark' | 'light';
  transcriptions: Transcription[];
  templates: SummaryTemplate[];

  setDevice: (device: HiDockDevice | null) => void;
  setRecordings: (recordings: AudioRecording[]) => void;
  addRecordings: (recordings: AudioRecording[]) => void;
  toggleRecordingSelection: (id: string) => void;
  clearSelectedRecordings: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setTranscriptions: (transcriptions: Transcription[]) => void;
  setTemplates: (templates: SummaryTemplate[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      device: null,
      recordings: [],
      isDeviceConnected: false,
      selectedRecordings: [],
      theme: 'light',
      transcriptions: [],
      templates: [],

      setDevice: (device: HiDockDevice | null) => {
        set({
          device,
          isDeviceConnected: device?.connected ?? false,
        });
      },

      setRecordings: (recordings: AudioRecording[]) => {
        set({ recordings });
      },

      addRecordings: (recordings: AudioRecording[]) => {
        set((state) => ({
          recordings: [...state.recordings, ...recordings],
        }));
      },

      toggleRecordingSelection: (id: string) => {
        set((state) => {
          const selected = state.selectedRecordings.includes(id)
            ? state.selectedRecordings.filter((sid) => sid !== id)
            : [...state.selectedRecordings, id];
          return { selectedRecordings: selected };
        });
      },

      clearSelectedRecordings: () => {
        set({ selectedRecordings: [] });
      },

      setTheme: (theme: 'dark' | 'light') => {
        set({ theme });
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      setTranscriptions: (transcriptions: Transcription[]) => {
        set({ transcriptions });
      },

      setTemplates: (templates: SummaryTemplate[]) => {
        set({ templates });
      },
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
);
