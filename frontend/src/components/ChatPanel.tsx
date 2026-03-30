import { useState, useRef, useEffect } from 'react';
import { Send, Loader } from 'lucide-react';
import { ChatMessage } from '@/types';
import { chatApi } from '@/api/chat';

interface ChatPanelProps {
  transcriptionId?: string;
}

export function ChatPanel({ transcriptionId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
    };

    setInput('');
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setError(null);

    try {
      const messagesToSend: ChatMessage[] = [...messages, userMessage];
      const stream = await chatApi.sendChatMessage(messagesToSend, transcriptionId);

      let assistantMessage = '';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '' },
      ]);

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantMessage += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage,
                  };
                  return updated;
                });
              }
            } catch (e) {
              console.error('Failed to parse SSE message:', data);
            }
          }
        }
      }

      setIsStreaming(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      setError(message);
      setIsStreaming(false);
      setMessages((prev) => prev.slice(0, -1));
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
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p className="text-center">
              Start a conversation about {transcriptionId ? 'the transcript' : 'anything'}
            </p>
          </div>
        )}

        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg">
              <Loader className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="Type a message..."
            rows={3}
            className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
          />
          <button
            onClick={handleSendMessage}
            disabled={isStreaming || !input.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
