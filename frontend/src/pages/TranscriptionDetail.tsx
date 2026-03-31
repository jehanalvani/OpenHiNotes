import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { TranscriptionViewer } from '@/components/TranscriptionViewer';
import { SpeakerEditor } from '@/components/SpeakerEditor';
import { ChatPanel } from '@/components/ChatPanel';
import { transcriptionsApi } from '@/api/transcriptions';
import { summariesApi } from '@/api/summaries';
import { templatesApi } from '@/api/templates';
import { Transcription, Summary, SummaryTemplate } from '@/types';
import { format } from 'date-fns';
import { Save, Loader, Plus } from 'lucide-react';

export function TranscriptionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [templates, setTemplates] = useState<SummaryTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [showSpeakerEditor, setShowSpeakerEditor] = useState(false);
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const t = await transcriptionsApi.getTranscription(id);
      setTranscription(t);
      setNotes(t.notes || '');

      const s = await summariesApi.getSummaries(id);
      setSummaries(s);

      const temps = await templatesApi.getTemplates();
      setTemplates(temps);
      if (temps.length > 0) {
        setSelectedTemplate(temps[0].id);
      }
    } catch (error) {
      console.error('Failed to load transcription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!transcription) return;

    setIsSavingNotes(true);
    try {
      const updated = await transcriptionsApi.updateNotes(transcription.id, notes);
      setTranscription(updated);
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleSaveSpeakers = async (speakers: Record<string, string>) => {
    if (!transcription) return;

    try {
      const updated = await transcriptionsApi.updateSpeakers(transcription.id, speakers);
      setTranscription(updated);
      setShowSpeakerEditor(false);
    } catch (error) {
      console.error('Failed to save speakers:', error);
    }
  };

  const handleGenerateSummary = async () => {
    if (!transcription) return;

    setIsGeneratingSummary(true);
    try {
      const summary = await summariesApi.createSummary({
        transcription_id: transcription.id,
        template_id: !showCustomPrompt ? selectedTemplate : undefined,
        custom_prompt: showCustomPrompt ? customPrompt : undefined,
      });

      setSummaries((prev) => [...prev, summary]);
      setShowCustomPrompt(false);
      setCustomPrompt('');
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (isLoading) {
    return (
      <Layout title="Transcription">
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!transcription) {
    return (
      <Layout title="Transcription">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Transcription not found</p>
          <button
            onClick={() => navigate('/transcriptions')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Transcriptions
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={transcription.original_filename}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Language</p>
            <p className="font-semibold text-gray-900 dark:text-white uppercase">
              {transcription.language}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Duration</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {transcription.audio_duration
                ? `${Math.ceil(transcription.audio_duration / 60)} min`
                : '-'}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Status</p>
            <p className="font-semibold text-gray-900 dark:text-white capitalize">
              {transcription.status}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Date</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {format(new Date(transcription.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        <TranscriptionViewer
          transcription={transcription}
          onSpeakerUpdate={async (speakerId, newName) => {
            if (!transcription) return;
            const updatedSpeakers = { ...transcription.speakers, [speakerId]: newName };
            try {
              const updated = await transcriptionsApi.updateSpeakers(transcription.id, updatedSpeakers);
              setTranscription(updated);
            } catch (error) {
              console.error('Failed to update speaker:', error);
            }
          }}
        />

        {transcription.status === 'completed' && (
          <>
            {showSpeakerEditor ? (
              <SpeakerEditor
                speakers={transcription.speakers}
                segments={transcription.segments}
                onSave={handleSaveSpeakers}
              />
            ) : (
              <button
                onClick={() => setShowSpeakerEditor(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Edit Speaker Names
              </button>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveNotes}
                rows={4}
                placeholder="Add notes about this transcription..."
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {isSavingNotes && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Saving...</p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Summaries
              </h3>

              {summaries.length > 0 && (
                <div className="space-y-4 mb-6">
                  {summaries.map((summary) => (
                    <div
                      key={summary.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {format(new Date(summary.created_at), 'MMM d, yyyy HH:mm')} •{' '}
                        {summary.model_used}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {summary.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                {showCustomPrompt ? (
                  <>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      rows={4}
                      placeholder="Enter custom prompt for summarization..."
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleGenerateSummary}
                        disabled={isGeneratingSummary || !customPrompt.trim()}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isGeneratingSummary && <Loader className="w-4 h-4 animate-spin" />}
                        Generate
                      </button>
                      <button
                        onClick={() => setShowCustomPrompt(false)}
                        className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a template...</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-3">
                      <button
                        onClick={handleGenerateSummary}
                        disabled={isGeneratingSummary || !selectedTemplate}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isGeneratingSummary && <Loader className="w-4 h-4 animate-spin" />}
                        <Plus className="w-4 h-4" />
                        Generate Summary
                      </button>
                      <button
                        onClick={() => setShowCustomPrompt(true)}
                        className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                      >
                        Custom Prompt
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Chat</h3>
              <ChatPanel transcriptionId={transcription.id} />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
