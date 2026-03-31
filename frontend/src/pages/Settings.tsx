import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useAuthStore } from '@/store/useAuthStore';
import { Save, Loader } from 'lucide-react';

export function Settings() {
  const { user } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handleSaveProfile = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      // This would call an API endpoint to update the profile
      // For now, just show a success message
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update profile',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Account</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Contact support to change email
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <input
                type="text"
                value={user?.role || ''}
                disabled
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 capitalize"
              />
            </div>

            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Security</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <button className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors hover:bg-gray-400 dark:hover:bg-gray-500">
                Change Password
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Contact support to reset your password
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">About</h2>

          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">OpenHiNotes</p>
              <p>Version 2.0.0</p>
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="font-medium text-gray-900 dark:text-white mb-2">Features</p>
              <ul className="space-y-1 text-xs">
                <li>Audio transcription with AI</li>
                <li>Multi-speaker detection</li>
                <li>Automatic summarization</li>
                <li>HiDock device support</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
