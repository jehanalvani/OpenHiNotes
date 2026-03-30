import { useNavigate } from 'react-router-dom';
import { LogOut, User, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';

interface HeaderProps {
  title: string;
  deviceConnected?: boolean;
}

export function Header({ title, deviceConnected = false }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useAppStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>

      <div className="flex items-center gap-4">
        {deviceConnected && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900 rounded-lg">
            <div className="w-2 h-2 bg-green-600 rounded-full" />
            <span className="text-sm text-green-700 dark:text-green-300">Device Connected</span>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{user?.email}</span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50">
              <div className="p-4 border-b border-gray-200 dark:border-gray-600">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.display_name || 'User'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
