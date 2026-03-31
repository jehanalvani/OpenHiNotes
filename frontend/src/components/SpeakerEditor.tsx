import { useState } from 'react';
import { Save } from 'lucide-react';
import { TranscriptionSegment } from '@/types';

interface SpeakerEditorProps {
  speakers: Record<string, string>;
  segments: TranscriptionSegment[];
  onSave: (speakers: Record<string, string>) => void;
  isLoading?: boolean;
}

export function SpeakerEditor({ speakers, segments, onSave, isLoading = false }: SpeakerEditorProps) {
  const [editedSpeakers, setEditedSpeakers] = useState<Record<string, string>>(speakers);

  const uniqueSpeakers = Array.from(
    new Set(segments.map((s) => s.speaker).filter(Boolean))
  ).sort();

  const getSampleText = (speaker: string) => {
    const sample = segments.find((s) => s.speaker === speaker);
    return sample ? sample.text.substring(0, 100) : '';
  };

  const handleSpeakerNameChange = (speakerId: string, name: string) => {
    setEditedSpeakers((prev) => ({
      ...prev,
      [speakerId]: name,
    }));
  };

  const handleSave = () => {
    onSave(editedSpeakers);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Edit Speaker Names</h3>

      <div className="space-y-4">
        {uniqueSpeakers.map((speaker) => (
          <div key={speaker} className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {speaker}
            </label>
            <input
              type="text"
              value={editedSpeakers[speaker!] || ''}
              onChange={(e) => handleSpeakerNameChange(speaker!, e.target.value)}
              disabled={isLoading}
              placeholder="Enter custom name..."
              className="px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {getSampleText(speaker!)}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={isLoading}
        className="mt-6 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
      >
        <Save className="w-4 h-4" />
        Save Speaker Names
      </button>
    </div>
  );
}
