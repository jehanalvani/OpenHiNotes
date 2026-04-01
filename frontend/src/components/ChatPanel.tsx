import { useState, useRef, useEffect } from 'react';
import { Send, AlertCircle, Save, FolderOpen, Trash2, X } from 'lucide-react';
import { ChatMessage } from '@/types';
import { chatApi, SSE_ERROR_PREFIX } from '@/api/chat';
import {
  chatConversationsApi,
  ChatConversationListItem,
  ChatConversation,
} from '@/api/chatConversations';
import { formatMarkdown } from '@/utils/formatMarkdown';

interface ChatPanelProps {
  transcriptionId?: string;
}

interface DisplayMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg">
        <div className="flex items-center gap-1">
          <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 inline-block" style={{ animationDelay: '0ms' }} />
          <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 inline-block" style={{ animationDelay: '150ms' }} />
          <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 inline-block" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export function ChatPanel({ transcriptionId }: ChatPanelProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [awaitingFirstChunk, setAwaitingFirstChunk] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Conversation persistence state
  const [savedConversations, setSavedConversations] = useState<ChatConversationListItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showConversationList, setShowConversationList] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, awaitingFirstChunk]);

  // Load saved conversations when panel opens or transcription changes
  useEffect(() => {
    loadSavedConversations();
  }, [transcriptionId]);

  const loadSavedConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const convos = await chatConversationsApi.list(transcriptionId);
      setSavedConversations(convos);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleSaveConversation = async () => {
    if (!saveTitle.trim() || messages.length === 0) return;

    setIsSaving(true);
    try {
      const messagesToSave = messages
        .filter((m) => !m.isError)
        .map(({ role, content }) => ({ role, content }));

      if (activeConversationId) {
        // Update existing
        await chatConversationsApi.update(activeConversationId, {
          title: saveTitle.trim(),
          messages: messagesToSave,
        });
      } else {
        // Create new
        const created = await chatConversationsApi.create({
          transcription_id: transcriptionId,
          title: saveTitle.trim(),
          messages: messagesToSave,
        });
        setActiveConversationId(created.id);
      }

      setShowSaveDialog(false);
      await loadSavedConversations();
    } catch (err) {
      console.error('Failed to save conversation:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadConversation = async (id: string) => {
    try {
      const convo = await chatConversationsApi.get(id);
      const loaded: DisplayMessage[] = convo.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      setMessages(loaded);
      setActiveConversationId(convo.id);
      setSaveTitle(convo.title);
      setShowConversationList(false);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await chatConversationsApi.delete(id);
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setSaveTitle('');
      }
      await loadSavedConversations();
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setActiveConversationId(null);
    setSaveTitle('');
    setShowConversationList(false);
  };

  const openSaveDialog = () => {
    if (!saveTitle) {
      // Auto-generate a title from first user message
      const firstUserMsg = messages.find((m) => m.role === 'user');
      setSaveTitle(
        firstUserMsg
          ? firstUserMsg.content.slice(0, 60) + (firstUserMsg.content.length > 60 ? '...' : '')
          : 'Chat conversation'
      );
    }
    setShowSaveDialog(true);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: DisplayMessage = {
      role: 'user',
      content: input,
    };

    setInput('');
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setAwaitingFirstChunk(true);

    try {
      const messagesToSend: ChatMessage[] = [...messages.filter(m => !m.isError), userMessage].map(
        ({ role, content }) => ({ role, content }),
      );
      const stream = await chatApi.sendChatMessage(messagesToSend, transcriptionId);

      let assistantMessage = '';
      let receivedContent = false;

      // Add empty assistant message placeholder
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '' },
      ]);

      for await (const chunk of chatApi.parseSSEStream(stream)) {
        // Check if this is an error from the SSE stream
        if (chunk.startsWith(SSE_ERROR_PREFIX)) {
          const errorText = chunk.slice(SSE_ERROR_PREFIX.length);
          setAwaitingFirstChunk(false);
          // Replace the empty assistant message with an error message
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: errorText,
              isError: true,
            };
            return updated;
          });
          setIsStreaming(false);
          return;
        }

        if (!receivedContent) {
          receivedContent = true;
          setAwaitingFirstChunk(false);
        }

        assistantMessage += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: assistantMessage,
          };
          return updated;
        });
      }

      setIsStreaming(false);
      setAwaitingFirstChunk(false);
    } catch (err) {
      const errorText = err instanceof Error ? err.message : 'Failed to send message';
      setAwaitingFirstChunk(false);
      setIsStreaming(false);

      // Show the error inline as an assistant error message
      setMessages((prev) => {
        // If the last message is an empty assistant placeholder, replace it
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && last.content === '') {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: errorText,
            isError: true,
          };
          return updated;
        }
        // Otherwise append a new error message
        return [
          ...prev,
          { role: 'assistant', content: errorText, isError: true },
        ];
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasMessages = messages.filter((m) => !m.isError).length > 0;

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 rounded-t-lg">
        <div className="flex items-center gap-2 min-w-0">
          {activeConversationId && (
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={saveTitle}>
              {saveTitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowConversationList(!showConversationList)}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            title="Saved conversations"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          {hasMessages && (
            <button
              onClick={openSaveDialog}
              disabled={isSaving}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
              title="Save conversation"
            >
              <Save className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              placeholder="Conversation title..."
              className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveConversation();
                if (e.key === 'Escape') setShowSaveDialog(false);
              }}
              autoFocus
            />
            <button
              onClick={handleSaveConversation}
              disabled={isSaving || !saveTitle.trim()}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : activeConversationId ? 'Update' : 'Save'}
            </button>
            <button
              onClick={() => setShowSaveDialog(false)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Conversation list dropdown */}
      {showConversationList && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Saved Conversations</span>
            <button
              onClick={handleNewConversation}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              New
            </button>
          </div>
          {isLoadingConversations ? (
            <p className="text-xs text-gray-500">Loading...</p>
          ) : savedConversations.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">No saved conversations yet.</p>
          ) : (
            <div className="space-y-1">
              {savedConversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleLoadConversation(c.id)}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    activeConversationId === c.id
                      ? 'bg-blue-100 dark:bg-blue-900/40'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(c.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(c.id, e)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
        {messages.length === 0 && !awaitingFirstChunk && (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p className="text-center">
              Start a conversation about {transcriptionId ? 'the transcript' : 'anything'}
            </p>
          </div>
        )}

        {messages.map((message, idx) => {
          // Skip rendering the empty assistant placeholder (typing indicator shown instead)
          if (
            message.role === 'assistant' &&
            message.content === '' &&
            !message.isError &&
            awaitingFirstChunk &&
            idx === messages.length - 1
          ) {
            return null;
          }

          if (message.isError) {
            return (
              <div key={idx} className="flex justify-start">
                <div className="max-w-[85%] px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={idx}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          );
        })}

        {awaitingFirstChunk && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="Type a message..."
            rows={3}
            className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 resize-none"
          />
          <button
            onClick={handleSendMessage}
            disabled={isStreaming || !input.trim()}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
