import { useState, useRef, useEffect } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import { ChatMessage } from '@/types';
import { chatApi, SSE_ERROR_PREFIX } from '@/api/chat';

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, awaitingFirstChunk]);

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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
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
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
