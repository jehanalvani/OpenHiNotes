import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Transcription } from '@/types';

interface TranscriptionViewerProps {
  transcription: Transcription;
}

export function TranscriptionViewer({ transcription }: TranscriptionViewerProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcription.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const speakerColors: Record<string, string> = {
    SPEAKER_0: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300',
    SPEAKER_1: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300',
    SPEAKER_2: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300',
    SPEAKER_3: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300',
    SPEAKER_4: 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-300',
  };

  const getSpeakerColor = (speaker: string | undefined, index: number) => {
    if (!speaker) return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    return speakerColors[speaker] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
  };

  const getSpeakerName = (speaker: string | undefined) => {
    if (!speaker) return 'Unknown';
    return transcription.speakers[speaker] || speaker;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Transcript</h3>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy All
            </>
          )}
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {transcription.segments.map((segment, idx) => (
          <div key={idx} className="flex gap-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 w-12 pt-1">
              {formatTimestamp(segment.start)}
            </div>
            <div className="flex-1">
              <div
                className={`inline-block px-2 py-1 rounded text-xs font-semibold mb-1 ${getSpeakerColor(
                  segment.speaker,
                  idx
                )}`}
              >
                {getSpeakerName(segment.speaker)}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{segment.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Full Text</h4>
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-6 whitespace-pre-wrap">
          {transcription.text}
        </p>
      </div>
    </div>
  );
}
