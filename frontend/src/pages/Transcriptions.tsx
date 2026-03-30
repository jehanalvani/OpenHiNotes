import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { transcriptionsApi } from '@/api/transcriptions';
import { Transcription } from '@/types';
import { format } from 'date-fns';
import { Trash2, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export function Transcriptions() {
  const navigate = useNavigate();
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadTranscriptions();
  }, []);

  const loadTranscriptions = async () => {
    setIsLoading(true);
    try {
      const response = await transcriptionsApi.getTranscriptions(0, 100);
      setTranscriptions(response.items);
    } catch (error) {
      console.error('Failed to load transcriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this transcription?')) {
      try {
        await transcriptionsApi.deleteTranscription(id);
        setTranscriptions((prev) => prev.filter((t) => t.id !== id));
      } catch (error) {
        console.error('Failed to delete transcription:', error);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Loader className="w-4 h-4 text-yellow-600 animate-spin" />;
    }
  };

  const filteredTranscriptions = transcriptions.filter((t) => {
    const matchesSearch = t.original_filename
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout title="Transcriptions">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search transcriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          <button
            onClick={loadTranscriptions}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              Loading transcriptions...
            </div>
          ) : filteredTranscriptions.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              {transcriptions.length === 0
                ? 'No transcriptions yet'
                : 'No transcriptions match your search'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Language
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTranscriptions.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => navigate(`/transcriptions/${t.id}`)}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {t.original_filename}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 uppercase">
                        {t.language}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {t.audio_duration
                          ? `${Math.ceil(t.audio_duration / 60)} min`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(t.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(t.status)}
                          <span className="capitalize text-gray-700 dark:text-gray-300">
                            {t.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600 dark:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
