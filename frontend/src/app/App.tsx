import { useEffect, useMemo, useState } from 'react';
import { PasswordList } from '@/app/components/PasswordList';
import { Sidebar } from '@/app/components/Sidebar';
import { PasswordForm } from '@/app/components/PasswordForm';
import { PasswordGenerator } from '@/app/components/PasswordGenerator';
import { UserManagementModal, type CurrentUser } from '@/app/components/UserManagement';
import * as api from '@/app/api';

const BUILD_ID: string = (import.meta as any).env?.VITE_BUILD_ID ?? 'rebased-v5-roles-20260116014000';

export interface Credential {
  id: string;
  username: string;
  password: string;
}

export type EntryType = 'Application' | 'Server';
export type ServerType = 'VM' | 'Bare Metal' | 'Docker Container' | 'CT' | 'Systemd-Nspawn';

export interface PasswordEntry {
  id: string;
  title: string;
  type: EntryType;
  urls: string[];
  ips: string[];
  serverType?: ServerType;
  credentials: Credential[];
  notes: string;
  category: string;
  iconKind?: 'url' | 'upload' | null;
  iconUrl?: string | null;
  iconRef?: string | null;
  iconMime?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function parseApiItem(item: api.ApiVaultItem): PasswordEntry {
  return {
    ...item,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

function serializeEntry(entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>): Omit<
  api.ApiVaultItem,
  'id' | 'createdAt' | 'updatedAt'
> {
  return {
    ...entry,
  };
}

function AuthOverlay(props: {
  mode: 'login' | 'register' | 'recover';
  setMode: (m: 'login' | 'register' | 'recover') => void;
  allowRegister: boolean | null;
  recoveryEnabled: boolean | null;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  recoveryKey: string;
  setRecoveryKey: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  newPassword2: string;
  setNewPassword2: (v: string) => void;
  onSubmit: () => void;
  info: string | null;
  error: string | null;
  loading: boolean;
  isDarkMode: boolean;
}) {
  const {
    mode,
    setMode,
    allowRegister,
    recoveryEnabled,
    email,
    setEmail,
    password,
    setPassword,
    recoveryKey,
    setRecoveryKey,
    newPassword,
    setNewPassword,
    newPassword2,
    setNewPassword2,
    onSubmit,
    info,
    error,
    loading,
    isDarkMode,
  } = props;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
      <div
        className={`w-full max-w-md rounded-xl shadow-lg p-6 ${isDarkMode ? 'bg-gray-900 text-white border border-gray-700' : 'bg-white text-gray-900'}`}
      >
        <div className="text-xl mb-1">
          {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Reset password'}
        </div>
        <div className={`text-sm mb-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {mode === 'login'
            ? 'Authenticate to access your encrypted vault.'
            : mode === 'register'
            ? 'Create your account. Your vault data is encrypted at rest.'
            : recoveryEnabled
            ? 'Reset your password using the configured recovery key.'
            : 'Password recovery is disabled on this server.'}
        </div>

        {info ? (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${isDarkMode ? 'border-green-800 bg-green-900/30 text-green-200' : 'border-green-200 bg-green-50 text-green-700'}`}
          >
            {info}
          </div>
        ) : null}

        {error ? (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${isDarkMode ? 'border-red-800 bg-red-900/30 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}
          >
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          <div>
            <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          {mode !== 'recover' ? (
            <div>
              <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                placeholder="••••••••••"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSubmit();
                }}
              />
            </div>
          ) : (
            <>
              <div>
                <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Recovery key</label>
                <input
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  type="password"
                  autoComplete="off"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                  placeholder="Configured server recovery key"
                  disabled={loading || !recoveryEnabled}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>New password</label>
                  <input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                    placeholder="Minimum 8 characters"
                    disabled={loading || !recoveryEnabled}
                  />
                </div>
                <div>
                  <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Confirm new password</label>
                  <input
                    value={newPassword2}
                    onChange={(e) => setNewPassword2(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                    placeholder="Repeat new password"
                    disabled={loading || !recoveryEnabled}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSubmit();
                    }}
                  />
                </div>
              </div>
            </>
          )}

          <button
            onClick={onSubmit}
            disabled={
              loading ||
              !email ||
              (mode === 'recover'
                ? !recoveryEnabled || !recoveryKey || !newPassword || !newPassword2
                : !password)
            }
            className="w-full mt-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Reset password'}
          </button>

          <div className={`text-sm mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {mode === 'login' ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  {allowRegister ? (
                    <>
                      No account?{' '}
                      <button className="text-blue-600 hover:underline" onClick={() => setMode('register')} disabled={loading}>
                        Register
                      </button>
                    </>
                  ) : null}
                </div>

                <button
                  className={`text-blue-600 hover:underline ${!recoveryEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => setMode('recover')}
                  disabled={loading || !recoveryEnabled}
                >
                  Forgot password?
                </button>
              </div>
            ) : mode === 'register' ? (
              <>
                Already have an account?{' '}
                <button className="text-blue-600 hover:underline" onClick={() => setMode('login')} disabled={loading}>
                  Sign in
                </button>
              </>
            ) : (
              <>
                Back to{' '}
                <button className="text-blue-600 hover:underline" onClick={() => setMode('login')} disabled={loading}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="fixed bottom-2 right-3 z-50 text-[10px] text-gray-400 opacity-70" data-build-id>
        {BUILD_ID}
      </div>
    </div>
  );
}

export default function App() {
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('pm_theme');
      if (v === 'light') return false;
      if (v === 'dark') return true;
    } catch {
      // ignore
    }
    return true;
  });

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pm_theme', next ? 'dark' : 'light');
      } catch {
        // ignore
      }
      return next;
    });
  };

  const [token, setTokenState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('pm_token');
    } catch {
      return null;
    }
  });
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'recover'>(() => (token ? 'login' : 'login'));
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRecoveryKey, setAuthRecoveryKey] = useState('');
  const [authNewPassword, setAuthNewPassword] = useState('');
  const [authNewPassword2, setAuthNewPassword2] = useState('');
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [allowRegister, setAllowRegister] = useState<boolean | null>(null);
  const [recoveryEnabled, setRecoveryEnabled] = useState<boolean | null>(null);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);

  // Registration is single-user: only show Register when there are no users in the database.
  useEffect(() => {
    let cancelled = false;
    api
      .registrationStatus()
      .then((s) => {
        if (cancelled) return;
        setAllowRegister(!!s.allowRegister);
        if (!s.allowRegister) setAuthMode('login');
      })
      .catch(() => {
        if (cancelled) return;
        // Fail closed: hide registration.
        setAllowRegister(false);
        setAuthMode('login');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .recoveryStatus()
      .then((s) => {
        if (cancelled) return;
        setRecoveryEnabled(!!s.enabled);
      })
      .catch(() => {
        if (cancelled) return;
        setRecoveryEnabled(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => ['All', ...Array.from(new Set(passwords.map((p) => p.category)))], [passwords]);

  const filteredPasswords = useMemo(() => {
    return passwords.filter((p) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        selectedCategory === 'Application' ||
        selectedCategory === 'Server' ||
        p.category === selectedCategory;

      const matchesType =
        selectedCategory !== 'Application' && selectedCategory !== 'Server'
          ? true
          : p.type === (selectedCategory as EntryType);
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesCategory && matchesType;

      const matchesQuery =
        p.title.toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q) ||
        (p.host || '').toLowerCase().includes(q) ||
        (p.url || '').toLowerCase().includes(q) ||
        (p.urls || []).some((u) => (u || '').toLowerCase().includes(q)) ||
        (p.ips || []).some((ip) => (ip || '').toLowerCase().includes(q)) ||
        (p.credentials || []).some((c) => (c.username || '').toLowerCase().includes(q));

      return matchesCategory && matchesType && matchesQuery;
    });
  }, [passwords, selectedCategory, searchQuery]);

  async function loadVault() {
    const items = await api.listVault();
    setPasswords(items.map(parseApiItem));
  }

  useEffect(() => {
    if (!token) return;
    setAuthError(null);
    loadVault().catch((e: any) => {
      setAuthError(e?.message ?? 'Failed to load vault');
      api.setToken(null);
      setTokenState(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Load current user identity once authenticated (used for user management safeguards).
  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      return;
    }
    let cancelled = false;
    api
      .me()
      .then((me) => {
        if (cancelled) return;
        setCurrentUser({ id: me.id, email: me.email, role: (me.role as any) || 'user' });
      })
      .catch(() => {
        if (cancelled) return;
        // If token is invalid, force logout.
        api.setToken(null);
        setTokenState(null);
        setCurrentUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAuthSubmit = async () => {
    if (authMode === 'register' && allowRegister === false) {
      setAuthError('Registration is disabled');
      setAuthMode('login');
      return;
    }
    if (authMode === 'recover' && !recoveryEnabled) {
      setAuthError('Password recovery is disabled');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    setAuthInfo(null);
    try {
      if (authMode === 'recover') {
        if (authNewPassword.length < 8) throw new Error('New password must be at least 8 characters');
        if (authNewPassword !== authNewPassword2) throw new Error('New passwords do not match');
        await api.recoverPassword(authEmail, authRecoveryKey, authNewPassword);
        setAuthInfo('Password reset. You can now sign in.');
        setAuthMode('login');
        setAuthPassword('');
        setAuthRecoveryKey('');
        setAuthNewPassword('');
        setAuthNewPassword2('');
        return;
      }

      const res = authMode === 'login' ? await api.login(authEmail, authPassword) : await api.register(authEmail, authPassword);
      api.setToken(res.token);
      setTokenState(res.token);
      setAuthPassword('');
      setAuthRecoveryKey('');
      setAuthNewPassword('');
      setAuthNewPassword2('');
      setIsFormOpen(false);
      setEditingEntry(null);
    } catch (e: any) {
      setAuthError(e?.message ?? 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    api.setToken(null);
    setTokenState(null);
    setPasswords([]);
    setCurrentUser(null);
    setIsUserMgmtOpen(false);
    setAuthEmail('');
    setAuthPassword('');
    setAuthMode('login');
  };

  const handleAddNew = () => {
    setEditingEntry(null);
    setIsFormOpen(true);
  };

  const handleAddPassword = async (
    entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>,
    opts?: { iconFile?: File | null; iconImportUrl?: string | null }
  ) => {
    const created = await api.createVault(serializeEntry(entry));

    // Optional icon upload (overrides icon url)
    let finalItem = created;
    if (opts?.iconFile) {
      const up = await api.uploadVaultIcon(created.id, opts.iconFile);
      finalItem = { ...created, iconKind: up.iconKind, iconUrl: up.iconUrl, iconRef: up.iconRef, iconMime: up.iconMime } as any;
    } else if (opts?.iconImportUrl) {
      const up = await api.importVaultIcon(created.id, opts.iconImportUrl);
      finalItem = { ...created, iconKind: up.iconKind, iconUrl: up.iconUrl, iconRef: up.iconRef, iconMime: up.iconMime } as any;
    }

    setPasswords((prev) => [...prev, parseApiItem(finalItem)]);
    setIsFormOpen(false);
  };

  const handleEditPassword = async (
    entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>,
    opts?: { iconFile?: File | null; iconImportUrl?: string | null }
  ) => {
    if (!editingEntry) return;
    const updated = await api.updateVault(editingEntry.id, serializeEntry(entry));

    let finalItem = updated;
    if (opts?.iconFile) {
      const up = await api.uploadVaultIcon(editingEntry.id, opts.iconFile);
      finalItem = { ...updated, iconKind: up.iconKind, iconUrl: up.iconUrl, iconRef: up.iconRef, iconMime: up.iconMime } as any;
    } else if (opts?.iconImportUrl) {
      const up = await api.importVaultIcon(editingEntry.id, opts.iconImportUrl);
      finalItem = { ...updated, iconKind: up.iconKind, iconUrl: up.iconUrl, iconRef: up.iconRef, iconMime: up.iconMime } as any;
    }

    setPasswords((prev) => prev.map((p) => (p.id === editingEntry.id ? parseApiItem(finalItem) : p)));
    setEditingEntry(null);
    setIsFormOpen(false);
  };

  const handleDelete = async (id: string) => {
    await api.deleteVault(id);
    setPasswords((prev) => prev.filter((p) => p.id !== id));
  };

  const openEditForm = (entry: PasswordEntry) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingEntry(null);
  };

  // Make sure the API module knows the token
  useEffect(() => {
    api.setToken(token);
  }, [token]);

  return (
    <div className={`h-screen w-screen flex overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Sidebar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onAddNew={handleAddNew}
        onOpenGenerator={() => setIsGeneratorOpen(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onLogout={token ? handleLogout : undefined}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PasswordList
          passwords={filteredPasswords}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onEdit={openEditForm}
          onDelete={handleDelete}
          isDarkMode={isDarkMode}
          onOpenSettings={token && currentUser ? () => setIsUserMgmtOpen(true) : undefined}
        />
      </div>

      {isFormOpen && (
        <PasswordForm
          entry={editingEntry}
          onSave={editingEntry ? handleEditPassword : handleAddPassword}
          onClose={handleCloseForm}
          isDarkMode={isDarkMode}
        />
      )}

      {isGeneratorOpen && (
        <PasswordGenerator onClose={() => setIsGeneratorOpen(false)} isDarkMode={isDarkMode} />
      )}

      {isUserMgmtOpen && token && currentUser ? (
        <UserManagementModal
          isDarkMode={isDarkMode}
          currentUser={currentUser}
          onClose={() => setIsUserMgmtOpen(false)}
        />
      ) : null}

      {!token && (
        <AuthOverlay
          mode={authMode}
          setMode={setAuthMode}
          allowRegister={allowRegister}
          recoveryEnabled={recoveryEnabled}
          email={authEmail}
          setEmail={setAuthEmail}
          password={authPassword}
          setPassword={setAuthPassword}
          recoveryKey={authRecoveryKey}
          setRecoveryKey={setAuthRecoveryKey}
          newPassword={authNewPassword}
          setNewPassword={setAuthNewPassword}
          newPassword2={authNewPassword2}
          setNewPassword2={setAuthNewPassword2}
          onSubmit={handleAuthSubmit}
          info={authInfo}
          error={authError}
          loading={authLoading}
          isDarkMode={isDarkMode}
        />
      )}
      <div className="fixed bottom-2 right-3 z-50 text-[10px] text-gray-400 opacity-70" data-build-id>
        {BUILD_ID}
      </div>
    </div>
  );
}
