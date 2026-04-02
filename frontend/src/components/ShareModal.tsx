import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Share2,
  Search,
  Users,
  User as UserIcon,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { sharesApi } from '@/api/shares';
import { groupsApi } from '@/api/groups';
import { apiClient } from '@/api/client';
import type { ResourceShare, User, UserGroup } from '@/types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'transcription' | 'collection';
  resourceId: string;
  resourceName: string;
}

export function ShareModal({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceName,
}: ShareModalProps) {
  const [shares, setShares] = useState<ResourceShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [showGroups, setShowGroups] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<'read' | 'write'>('read');
  const [error, setError] = useState<string | null>(null);

  const loadShares = useCallback(async () => {
    try {
      const data = await sharesApi.listForResource(resourceType, resourceId);
      setShares(data);
    } catch {
      // ignore
    }
  }, [resourceType, resourceId]);

  const loadGroups = useCallback(async () => {
    try {
      const data = await groupsApi.list();
      setGroups(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadShares();
      loadGroups();
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
    }
  }, [isOpen, loadShares, loadGroups]);

  // Search users with debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await apiClient.get<User[]>(
          `/users/search?q=${encodeURIComponent(searchQuery)}&limit=5`
        );
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleShareWithUser = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      await sharesApi.create({
        resource_type: resourceType,
        resource_id: resourceId,
        grantee_type: 'user',
        grantee_id: userId,
        permission: selectedPermission,
      });
      await loadShares();
      setSearchQuery('');
      setSearchResults([]);
    } catch (e: any) {
      setError(e.message || 'Failed to share');
    } finally {
      setLoading(false);
    }
  };

  const handleShareWithGroup = async (groupId: string) => {
    setLoading(true);
    setError(null);
    try {
      await sharesApi.create({
        resource_type: resourceType,
        resource_id: resourceId,
        grantee_type: 'group',
        grantee_id: groupId,
        permission: selectedPermission,
      });
      await loadShares();
      setShowGroups(false);
    } catch (e: any) {
      setError(e.message || 'Failed to share');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (shareId: string, permission: 'read' | 'write') => {
    try {
      await sharesApi.update(shareId, permission);
      await loadShares();
    } catch (e: any) {
      setError(e.message || 'Failed to update');
    }
  };

  const handleRevoke = async (shareId: string) => {
    try {
      await sharesApi.delete(shareId);
      await loadShares();
    } catch (e: any) {
      setError(e.message || 'Failed to revoke');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Share {resourceType === 'transcription' ? 'Transcription' : 'Collection'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Resource name */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-750 text-sm text-gray-600 dark:text-gray-400">
          {resourceName}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Permission selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Permission:</span>
            <select
              value={selectedPermission}
              onChange={(e) => setSelectedPermission(e.target.value as 'read' | 'write')}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="read">Read only</option>
              <option value="write">Read & Write</option>
            </select>
          </div>

          {/* Search users */}
          <div className="relative">
            <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
              />
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleShareWithUser(user.id)}
                    disabled={loading}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.display_name || user.email}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Share with group */}
          {groups.length > 0 && (
            <div>
              <button
                onClick={() => setShowGroups(!showGroups)}
                className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                <Users className="w-4 h-4" />
                Share with a group
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showGroups ? 'rotate-180' : ''}`}
                />
              </button>

              {showGroups && (
                <div className="mt-2 space-y-1">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handleShareWithGroup(group.id)}
                      disabled={loading}
                      className="w-full flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {group.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Current shares */}
          {shares.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Shared with
              </h3>
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-750 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          share.grantee_type === 'user'
                            ? 'bg-primary-100 dark:bg-primary-900/30'
                            : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}
                      >
                        {share.grantee_type === 'user' ? (
                          <UserIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        ) : (
                          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {share.grantee?.name || 'Unknown'}
                        </div>
                        {share.grantee?.email && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {share.grantee.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={share.permission}
                        onChange={(e) =>
                          handleUpdatePermission(share.id, e.target.value as 'read' | 'write')
                        }
                        className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        <option value="read">Read</option>
                        <option value="write">Write</option>
                      </select>
                      <button
                        onClick={() => handleRevoke(share.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Revoke access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
