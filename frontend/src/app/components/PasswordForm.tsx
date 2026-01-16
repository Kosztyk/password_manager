import { X, Save, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import * as api from '@/app/api';
import type { PasswordEntry, Credential, EntryType, ServerType } from '@/app/App';

interface PasswordFormProps {
  entry: PasswordEntry | null;
  onSave: (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>, opts?: { iconFile?: File | null }) => void;
  onClose: () => void;
  isDarkMode: boolean;
}

export function PasswordForm({ entry, onSave, onClose, isDarkMode }: PasswordFormProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<EntryType>('Application');
  const [category, setCategory] = useState('General');
  const [notes, setNotes] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [ips, setIps] = useState<string[]>(['']);
  const [serverType, setServerType] = useState<ServerType>('VM');
  const [credentials, setCredentials] = useState<Credential[]>([
    { id: Date.now().toString(), username: '', password: '' }
  ])
  const [iconKind, setIconKind] = useState<'url' | 'upload' | null>(null);
  const [iconUrl, setIconUrl] = useState('');
  const [iconCandidates, setIconCandidates] = useState<api.ApiIconCandidate[]>([]);
  const [iconPickOpen, setIconPickOpen] = useState(false);
  const [iconLoading, setIconLoading] = useState(false);
  const [iconError, setIconError] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);

;

  useEffect(() => {
    setIconFile(null);
    setIconCandidates([]);
    setIconPickOpen(false);
    setIconError(null);
    setIconLoading(false);
    setIconKind(entry?.iconKind ?? null);
    setIconUrl(entry?.iconUrl ?? '');

    if (entry) {
      setTitle(entry.title);
      setType(entry.type);
      setCategory(entry.category);
      setNotes(entry.notes);
      setUrls(entry.urls.length > 0 ? entry.urls : ['']);
      setIps(entry.ips.length > 0 ? entry.ips : ['']);
      setServerType(entry.serverType || 'VM');
      setCredentials(entry.credentials.length > 0 ? entry.credentials : [
        { id: Date.now().toString(), username: '', password: '' }
      ]);
    } else {
      setTitle('');
      setType('Application');
      setCategory('General');
      setNotes('');
      setUrls(['']);
      setIps(['']);
      setServerType('VM');
      setCredentials([{ id: Date.now().toString(), username: '', password: '' }]);
      setIconKind(null);
      setIconUrl('');
    }
  }, [entry]);

  const handleSubmit = (e?: any) => {
    if (e?.preventDefault) e.preventDefault();
    
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    const hasValidCredentials = credentials.some(c => c.username.trim() && c.password.trim());
    if (!hasValidCredentials) {
      alert('Please add at least one username and password');
      return;
    }

    // Filter out empty URLs, IPs, and credentials
    const validUrls = urls.filter(url => url.trim());
    const validIps = ips.filter(ip => ip.trim());
    const validCredentials = credentials.filter(c => c.username.trim() && c.password.trim());

        onSave(
      {
        title: title.trim(),
        type,
        category,
        iconKind: iconKind,
        iconUrl: iconUrl || null,
        iconRef: null,
        iconMime: null,
        notes: notes.trim(),
        urls: type === 'Application' ? validUrls : [],
        ips: type === 'Server' ? validIps : [],
        serverType: type === 'Server' ? serverType : undefined,
        credentials: validCredentials,
      },
      { iconFile, iconImportUrl: iconFile ? null : (iconKind === 'url' && iconUrl ? iconUrl : null) }
    );
  };

  // URL handlers
  const addUrl = () => {
    setUrls([...urls, '']);
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const removeUrl = (index: number) => {
    if (urls.length > 1) {
      setUrls(urls.filter((_, i) => i !== index));
    }
  };

  // IP handlers
  const addIp = () => {
    setIps([...ips, '']);
  };

  const updateIp = (index: number, value: string) => {
    const newIps = [...ips];
    newIps[index] = value;
    setIps(newIps);
  };

  const removeIp = (index: number) => {
    if (ips.length > 1) {
      setIps(ips.filter((_, i) => i !== index));
    }
  };

  // Credential handlers
  const addCredential = () => {
    setCredentials([
      ...credentials,
      { id: Date.now().toString(), username: '', password: '' }
    ]);
  };

  const updateCredential = (index: number, field: 'username' | 'password', value: string) => {
    const newCredentials = [...credentials];
    newCredentials[index][field] = value;
    setCredentials(newCredentials);
  };

  const removeCredential = (index: number) => {
    if (credentials.length > 1) {
      setCredentials(credentials.filter((_, i) => i !== index));
    }
  };

  const labelClass = `block text-sm mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`;
  const labelClassNoMb = `block text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`;
  const subLabelClass = `block text-xs mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`;
  const inputClass = `w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
    isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'
  }`;
  const inputClassSm = `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
    isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'
  }`;
  const rowRemoveBtnClass = `p-2 rounded transition-colors ${
    isDarkMode ? 'text-gray-300 hover:text-red-400 hover:bg-red-950/40' : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
  }`;
  const credentialCardClass = `p-4 border rounded-lg ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`;
  const subtleTextClass = `text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`;
  const modalClass = `rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col ${
    isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
  }`;
  const headerClass = `flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`;
  const footerClass = `flex items-center justify-end gap-3 p-6 border-t ${
    isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'
  }`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className={modalClass}>
        {/* Header */}
        <div className={headerClass}>
          <h2 className="text-xl">{entry ? 'Edit Password' : 'Add New Password'}</h2>
          <button
            onClick={onClose}
            className={`p-2 rounded transition-colors ${isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className={labelClass}>
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
                placeholder="e.g., GitHub, Production Server"
                required
              />
            </div>

            {/* Type Selection */}
            <div>
              <label htmlFor="type" className={labelClass}>
                Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as EntryType)}
                className={inputClass}
              >
                <option value="Application">Application</option>
                <option value="Server">Server</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className={labelClass}>
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                <option value="General">General</option>
                <option value="Email">Email</option>
                <option value="Development">Development</option>
                <option value="Social Media">Social Media</option>
                <option value="Banking">Banking</option>
                <option value="Shopping">Shopping</option>
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
                <option value="VM">VM</option>
                <option value="Container">Container</option>
                <option value="HomeLab">HomeLab</option>
              </select>
            </div>

            {/* Conditional: URLs for Application */}
            {type === 'Application' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClassNoMb}>URLs</label>
                  <button
                    type="button"
                    onClick={addUrl}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="size-4" />
                    Add URL
                  </button>
                </div>
                <div className="space-y-2">
                  {urls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateUrl(index, e.target.value)}
                        className={`flex-1 ${inputClass}`}
                        placeholder="https://example.com"
                      />
                      {urls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeUrl(index)}
                          className={rowRemoveBtnClass}
                          title="Remove URL"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conditional: IPs and Server Type for Server */}
            {type === 'Server' && (
              <>
                <div>
                  <label htmlFor="serverType" className={labelClass}>
                    Server Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="serverType"
                    value={serverType}
                    onChange={(e) => setServerType(e.target.value as ServerType)}
                    className={inputClass}
                  >
                    <option value="VM">VM</option>
                    <option value="Bare Metal">Bare Metal</option>
                    <option value="Docker Container">Docker Container</option>
                    <option value="CT">CT</option>
                    <option value="Systemd-Nspawn">Systemd-Nspawn</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelClassNoMb}>IP Addresses</label>
                    <button
                      type="button"
                      onClick={addIp}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="size-4" />
                      Add IP
                    </button>
                  </div>
                  <div className="space-y-2">
                    {ips.map((ip, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ip}
                          onChange={(e) => updateIp(index, e.target.value)}
                          className={`flex-1 ${inputClass} font-mono`}
                          placeholder="e.g., 192.168.1.100"
                        />
                        {ips.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeIp(index)}
                            className={rowRemoveBtnClass}
                            title="Remove IP"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Credentials Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClassNoMb}>
                  Credentials <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addCredential}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus className="size-4" />
                  Add Credential
                </button>
              </div>
              <div className="space-y-4">
                {credentials.map((credential, index) => (
                  <div key={credential.id} className={credentialCardClass}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={subtleTextClass}>Credential {index + 1}</span>
                      {credentials.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCredential(index)}
                          className={`p-1 rounded transition-colors ${isDarkMode ? 'text-gray-300 hover:text-red-400 hover:bg-red-950/40' : 'text-gray-600 hover:text-red-600 hover:bg-red-100'}`}
                          title="Remove credential"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className={subLabelClass}>
                          Username
                        </label>
                        <input
                          type="text"
                          value={credential.username}
                          onChange={(e) => updateCredential(index, 'username', e.target.value)}
                          className={inputClassSm}
                          placeholder="username or email"
                        />
                      </div>
                      <div>
                        <label className={subLabelClass}>
                          Password
                        </label>
                        <input
                          type="text"
                          value={credential.password}
                          onChange={(e) => updateCredential(index, 'password', e.target.value)}
                          className={`${inputClassSm} font-mono`}
                          placeholder="Enter password"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

      
      {/* Icon */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Icon</label>

        <div className="flex gap-2">
          <input
            type="text"
            value={iconUrl}
            onChange={(e) => {
              setIconUrl(e.target.value);
              setIconKind(e.target.value ? 'url' : null);
            }}
            placeholder="Icon URL (optional)"
            className={`flex-1 px-3 py-2 rounded-lg border ${
              isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <button
            type="button"
            onClick={async () => {
              setIconLoading(true);
              setIconError(null);
              try {
                const firstUrl = (urls && urls.length ? urls[0] : undefined) || undefined;
                const candidates = await api.suggestIcons(title, firstUrl);
                setIconCandidates(candidates);
                setIconPickOpen(true);
              } catch (e: any) {
                setIconError(e?.message ?? 'Failed to fetch icons');
              } finally {
                setIconLoading(false);
              }
            }}
            className={`px-3 py-2 rounded-lg border text-sm ${
              isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            disabled={iconLoading || !title.trim()}
            title={title.trim() ? 'Search icons' : 'Enter a title first'}
          >
            {iconLoading ? 'Searching…' : 'Auto'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setIconFile(e.target.files?.[0] ?? null)}
            className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}
          />
          {iconFile ? (
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Will upload: {iconFile.name}</span>
          ) : null}
        </div>

        {iconError ? <div className="text-sm text-red-400">{iconError}</div> : null}
      </div>

      {iconPickOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className={`w-full max-w-3xl rounded-xl border shadow-xl ${
              isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <div
              className={`flex items-center justify-between p-4 border-b ${
                isDarkMode ? 'border-gray-800' : 'border-gray-200'
              }`}
            >
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Pick an icon</h3>
              <button
                type="button"
                onClick={() => setIconPickOpen(false)}
                className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {iconCandidates.length === 0 ? (
                <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>No icons found.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[55vh] overflow-auto">
                  {iconCandidates.map((c) => (
                    <button
                      key={c.url}
                      type="button"
                      onClick={() => {
                        setIconKind('url');
                        setIconUrl(c.url);
                        setIconPickOpen(false);
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 ${
                        isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      title={`${c.source}${c.slug ? ` (${c.slug})` : ''}`}
                    >
                      <img src={c.url} alt="" className="w-10 h-10 object-contain" />
                      <span className={`text-[10px] truncate w-full ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{c.source}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={`flex justify-end gap-2 p-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
              <button
                type="button"
                onClick={() => {
                  setIconKind(null);
                  setIconUrl('');
                  setIconPickOpen(false);
                }}
                className={`px-4 py-2 rounded-lg border text-sm ${
                  isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIconPickOpen(false)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
        </form>
        {/* Footer */}
        <div className={footerClass}>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2.5 rounded-lg transition-colors ${isDarkMode ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-200'}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Save className="size-4" />
            {entry ? 'Update' : 'Save'} Password
          </button>
        </div>
      </div>
    </div>
  );
}
