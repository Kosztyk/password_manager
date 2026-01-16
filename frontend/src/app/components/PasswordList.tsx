import { Search, ExternalLink, Edit2, Trash2, Copy, Eye, EyeOff, Key, Server, Settings } from 'lucide-react';
import { useState } from 'react';
import * as api from '@/app/api';
import type { PasswordEntry } from '@/app/App';

interface PasswordListProps {
  passwords: PasswordEntry[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onEdit: (entry: PasswordEntry) => void;
  onDelete: (id: string) => void;
  isDarkMode: boolean;
  onOpenSettings?: () => void;
}

export function PasswordList({ 
  passwords, 
  searchQuery, 
  onSearchChange, 
  onEdit, 
  onDelete,
  isDarkMode,
  onOpenSettings
}: PasswordListProps) {
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [failedIcons, setFailedIcons] = useState<Set<string>>(new Set());

  const togglePasswordVisibility = (credentialId: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(credentialId)) {
        newSet.delete(credentialId);
      } else {
        newSet.add(credentialId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return '';
    }
  };

  const resolveIconUrl = (entry: PasswordEntry): string => {
    if (entry.iconKind === 'upload' && entry.iconRef) return api.iconFileUrl(entry.iconRef);
    if (entry.iconKind === 'url' && entry.iconUrl) return entry.iconUrl;
    const u = (entry.urls && entry.urls.length ? entry.urls[0] : entry.url) || '';
    return u ? getFaviconUrl(u) : '';
  };

  const handleIconError = (id: string) => {
    setFailedIcons(prev => new Set(prev).add(id));
  };

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header with Search */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-6`}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className={`text-2xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Password Vault</h2>
            {onOpenSettings ? (
              <button
                onClick={onOpenSettings}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                title="Settings"
              >
                <Settings className="size-4" />
                Settings
              </button>
            ) : null}
          </div>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 size-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search passwords..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Password List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-3">
          {passwords.length === 0 ? (
            <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <p>No passwords found</p>
              <p className="text-sm mt-2">Try adjusting your search or add a new password</p>
            </div>
          ) : (
            passwords.map(entry => (
              <div
                key={entry.id}
                className={`border rounded-lg p-5 transition-shadow ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 hover:shadow-lg hover:shadow-gray-900/50' 
                    : 'bg-white border-gray-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 flex items-center gap-3">
                    {/* App Icon */}
                    <div className={`size-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      {(() => {
                        const iconUrl = resolveIconUrl(entry);
                        const canShowIcon = Boolean(iconUrl) && !failedIcons.has(entry.id);

                        if (canShowIcon) {
                          return (
                            <img
                              src={iconUrl}
                              alt={`${entry.title} icon`}
                              className="size-8"
                              onError={() => handleIconError(entry.id)}
                            />
                          );
                        }

                        return entry.type === 'Server' ? (
                          <Server className={`size-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                        ) : (
                          <Key className={`size-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        );
                      })()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-lg mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{entry.title}</h3>
                      <div className={`flex items-center gap-2 text-sm flex-wrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span>{entry.category}</span>
                        <span>•</span>
                        <span className="text-blue-600">{entry.type}</span>
                        {entry.type === 'Server' && entry.serverType && (
                          <>
                            <span>•</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {entry.serverType}
                            </span>
                          </>
                        )}
                        {entry.type === 'Application' && entry.urls.length > 0 && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {entry.urls.map((url, index) => (
                                url && (
                                  <a
                                    key={index}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                                  >
                                    {new URL(url).hostname}
                                    <ExternalLink className="size-3" />
                                  </a>
                                )
                              ))}
                            </div>
                          </>
                        )}
                        {entry.type === 'Server' && entry.ips.length > 0 && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {entry.ips.map((ip, index) => (
                                <span key={index} className={`font-mono text-xs px-2 py-0.5 rounded ${
                                  isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {ip}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(entry)}
                      className={`p-2 rounded transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700' 
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                      title="Edit"
                    >
                      <Edit2 className="size-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this password?')) {
                          onDelete(entry.id);
                        }
                      }}
                      className={`p-2 rounded transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700' 
                          : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                      }`}
                      title="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Credentials */}
                <div className="space-y-3">
                  {entry.credentials.map((credential, credIndex) => (
                    <div key={credential.id} className="space-y-2">
                      {entry.credentials.length > 1 && (
                        <div className={`text-xs mt-3 mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          Credential {credIndex + 1}
                        </div>
                      )}
                      
                      {/* Username */}
                      <div className="flex items-center gap-2">
                        <div className={`w-24 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Username:</div>
                        <div className="flex-1 flex items-center gap-2">
                          <code className={`flex-1 px-3 py-1.5 rounded text-sm font-mono ${
                            isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-900'
                          }`}>
                            {credential.username}
                          </code>
                          <button
                            onClick={() => copyToClipboard(credential.username, `${credential.id}-username`)}
                            className={`p-1.5 rounded transition-colors ${
                              isDarkMode 
                                ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700' 
                                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title="Copy username"
                          >
                            {copiedField === `${credential.id}-username` ? (
                              <span className="text-xs text-green-600">✓</span>
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Password */}
                      <div className="flex items-center gap-2">
                        <div className={`w-24 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Password:</div>
                        <div className="flex-1 flex items-center gap-2">
                          <code className={`flex-1 px-3 py-1.5 rounded text-sm font-mono ${
                            isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-900'
                          }`}>
                            {visiblePasswords.has(credential.id) ? credential.password : '••••••••••••'}
                          </code>
                          <button
                            onClick={() => togglePasswordVisibility(credential.id)}
                            className={`p-1.5 rounded transition-colors ${
                              isDarkMode 
                                ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700' 
                                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title={visiblePasswords.has(credential.id) ? "Hide password" : "Show password"}
                          >
                            {visiblePasswords.has(credential.id) ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(credential.password, `${credential.id}-password`)}
                            className={`p-1.5 rounded transition-colors ${
                              isDarkMode 
                                ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700' 
                                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title="Copy password"
                          >
                            {copiedField === `${credential.id}-password` ? (
                              <span className="text-xs text-green-600">✓</span>
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Notes */}
                  {entry.notes && (
                    <div className={`flex gap-2 pt-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                      <div className={`w-24 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Notes:</div>
                      <div className={`flex-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{entry.notes}</div>
                    </div>
                  )}
                </div>

                <div className={`mt-3 pt-3 border-t text-xs ${isDarkMode ? 'border-gray-700 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                  Last updated: {entry.updatedAt.toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}