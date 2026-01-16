import { useEffect, useMemo, useState } from 'react';
import { X, Settings, Trash2, Plus, KeyRound, Check } from 'lucide-react';
import * as api from '@/app/api';

export type CurrentUser = { id: string; email: string; role: 'admin' | 'user' };

export function UserManagementModal(props: {
  isDarkMode: boolean;
  currentUser: CurrentUser;
  onClose: () => void;
}) {
  const { isDarkMode, currentUser, onClose } = props;

  const [tab, setTab] = useState<'users' | 'password'>('users');
  const [users, setUsers] = useState<api.ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create user
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  // Role selection (admin-only)
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');

  // Change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [nextPassword2, setNextPassword2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  // Per-user role updates (admin-only)
  const [roleDraft, setRoleDraft] = useState<Record<string, 'admin' | 'user'>>({});
  const [roleBusy, setRoleBusy] = useState<Record<string, boolean>>({});

  const containerCls = useMemo(() => {
    return isDarkMode
      ? 'bg-gray-900 text-white border border-gray-700'
      : 'bg-white text-gray-900 border border-gray-200';
  }, [isDarkMode]);

  const isAdmin = currentUser.role === 'admin';

  const mutedTextCls = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const subtleBgCls = isDarkMode ? 'bg-gray-800' : 'bg-gray-50';
  const inputCls = isDarkMode
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';

  async function refreshUsers() {
    setLoading(true);
    setError(null);
    try {
      const u = await api.listUsers();
      setUsers(u);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Keep a draft role value per user for the inline editor.
    setRoleDraft((prev) => {
      const next: Record<string, 'admin' | 'user'> = { ...prev };
      for (const u of users) {
        const role = (u.role || 'user') as 'admin' | 'user';
        if (!next[u.id]) next[u.id] = role;
      }
      return next;
    });
  }, [users]);

  const canCreate = newEmail.trim().length > 0 && newPassword.length >= 8;

  const onCreate = async () => {
    if (!canCreate) return;
    if (!isAdmin) return;
    setCreateBusy(true);
    setCreateMsg(null);
    setError(null);
    try {
      await api.createUserWithRole(newEmail.trim(), newPassword, newRole);
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      setCreateMsg('User created');
      await refreshUsers();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create user');
    } finally {
      setCreateBusy(false);
    }
  };

  const onDelete = async (id: string, email: string) => {
    if (!isAdmin) return;
    if (id === currentUser.id) return;
    if (!confirm(`Delete user ${email}? Their vault items will also be deleted.`)) return;
    setError(null);
    try {
      await api.deleteUser(id);
      await refreshUsers();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete user');
    }
  };

  const onResetPassword = async (id: string, email: string) => {
    if (!isAdmin) return;
    if (id === currentUser.id) return;
    const next = prompt(`Set a new password for ${email} (minimum 8 characters):`);
    if (next == null) return;
    if (next.trim().length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    const confirm2 = prompt('Confirm the new password:');
    if (confirm2 == null) return;
    if (confirm2 !== next) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    try {
      await api.resetUserPassword(id, next);
      setCreateMsg(`Password reset for ${email}`);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to reset password');
    }
  };

  const onUpdateRole = async (id: string, email: string) => {
    if (!isAdmin) return;
    if (id === currentUser.id) return;
    const nextRole = roleDraft[id] || 'user';
    setError(null);
    setCreateMsg(null);
    setRoleBusy((m) => ({ ...m, [id]: true }));
    try {
      await api.updateUserRole(id, nextRole);
      setCreateMsg(`Role updated for ${email}`);
      await refreshUsers();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update role');
    } finally {
      setRoleBusy((m) => ({ ...m, [id]: false }));
    }
  };

  const onChangePassword = async () => {
    setPwMsg(null);
    setError(null);
    if (nextPassword.length < 8) {
      setPwMsg('New password must be at least 8 characters');
      return;
    }
    if (nextPassword !== nextPassword2) {
      setPwMsg('New passwords do not match');
      return;
    }
    setPwBusy(true);
    try {
      await api.changeMyPassword(currentPassword, nextPassword);
      setCurrentPassword('');
      setNextPassword('');
      setNextPassword2('');
      setPwMsg('Password updated');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to change password');
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
      <div className={`w-full max-w-3xl rounded-xl shadow-lg overflow-hidden ${containerCls}`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-lg flex items-center justify-center ${subtleBgCls}`}>
              <Settings className={isDarkMode ? 'text-gray-200' : 'text-gray-700'} />
            </div>
            <div>
              <div className="text-lg">User Management</div>
              <div className={`text-xs ${mutedTextCls}`}>Signed in as {currentUser.email}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className={`flex items-center gap-2 px-6 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setTab('users')}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              tab === 'users'
                ? isDarkMode
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-900'
                : isDarkMode
                ? 'text-gray-300 hover:bg-gray-800'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setTab('password')}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              tab === 'password'
                ? isDarkMode
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-900'
                : isDarkMode
                ? 'text-gray-300 hover:bg-gray-800'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Change Password
          </button>
        </div>

        <div className="p-6">
          {error ? (
            <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${isDarkMode ? 'border-red-800 bg-red-900/30 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {error}
            </div>
          ) : null}

          {tab === 'users' ? (
            <div className="space-y-6">
              <div className={`rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className={`px-4 py-3 border-b text-sm ${isDarkMode ? 'border-gray-700 text-gray-200' : 'border-gray-200 text-gray-700'} flex items-center justify-between`}>
                  <div>Existing users</div>
                  <button
                    onClick={refreshUsers}
                    disabled={loading}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'} disabled:opacity-60`}
                  >
                    {loading ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>
                <div className="divide-y divide-gray-200/10">
                  {users.length === 0 && !loading ? (
                    <div className={`px-4 py-6 text-sm ${mutedTextCls}`}>No users found.</div>
                  ) : null}
                  {users.map((u) => {
                    const isMe = u.id === currentUser.id;
                    const role = (u.role || 'user') as 'admin' | 'user';
                    const draftRole = roleDraft[u.id] || role;
                    const dirty = draftRole !== role;
                    return (
                      <div key={u.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm truncate">{u.email}</div>
                          <div className={`text-xs ${mutedTextCls}`}>{isMe ? 'Current session' : 'User'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && !isMe ? null : (
                            <span
                              className={`text-xs px-2 py-1 rounded-full border ${
                                isDarkMode
                                  ? 'border-gray-700 bg-gray-800 text-gray-200'
                                  : 'border-gray-200 bg-gray-50 text-gray-700'
                              }`}
                              title={role === 'admin' ? 'Admin' : 'User'}
                            >
                              {role.toUpperCase()}
                            </span>
                          )}

                          {isAdmin && !isMe ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={draftRole}
                                onChange={(e) =>
                                  setRoleDraft((m) => ({
                                    ...m,
                                    [u.id]: (e.target.value as any) || 'user',
                                  }))
                                }
                                className={`px-2 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputCls}`}
                                disabled={!!roleBusy[u.id]}
                                title="Change role"
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>

                              <button
                                onClick={() => onUpdateRole(u.id, u.email)}
                                disabled={!dirty || !!roleBusy[u.id]}
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 ${
                                  isDarkMode
                                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                }`}
                                title={dirty ? 'Apply role change' : 'Role unchanged'}
                              >
                                <Check className="size-4" />
                                {roleBusy[u.id] ? 'Saving…' : 'Save'}
                              </button>
                            </div>
                          ) : null}

                          {isAdmin ? (
                            <>
                              <button
                                onClick={() => onResetPassword(u.id, u.email)}
                                disabled={isMe}
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 ${
                                  isDarkMode
                                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                }`}
                                title={isMe ? 'Use Change Password for your own account' : 'Reset password'}
                              >
                                <KeyRound className="size-4" />
                                Reset
                              </button>

                              <button
                                onClick={() => onDelete(u.id, u.email)}
                                disabled={isMe}
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 ${
                                  isDarkMode
                                    ? 'bg-gray-800 hover:bg-gray-700 text-red-300'
                                    : 'bg-gray-100 hover:bg-gray-200 text-red-700'
                                }`}
                                title={isMe ? 'You cannot delete the user you are signed in as' : 'Delete user'}
                              >
                                <Trash2 className="size-4" />
                                Delete
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {isAdmin ? (
                <div className={`rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className={`px-4 py-3 border-b text-sm ${isDarkMode ? 'border-gray-700 text-gray-200' : 'border-gray-200 text-gray-700'}`}>
                    Create new user
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Email</label>
                        <input
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          type="email"
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputCls}`}
                          placeholder="new.user@example.com"
                          disabled={createBusy}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Role</label>
                        <select
                          value={newRole}
                          onChange={(e) => setNewRole((e.target.value as any) || 'user')}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputCls}`}
                          disabled={createBusy}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Temporary password</label>
                        <input
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          type="password"
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputCls}`}
                          placeholder="Minimum 8 characters"
                          disabled={createBusy}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className={`text-xs ${mutedTextCls}`}>Passwords are stored securely using a salted hash.</div>
                      <button
                        onClick={onCreate}
                        disabled={!canCreate || createBusy}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition-colors"
                      >
                        <Plus className="size-4" />
                        {createBusy ? 'Creating…' : 'Create'}
                      </button>
                    </div>

                    {createMsg ? (
                      <div className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>{createMsg}</div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className={`px-4 py-3 border-b text-sm ${isDarkMode ? 'border-gray-700 text-gray-200' : 'border-gray-200 text-gray-700'}`}>
                  Change your password
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Current password</label>
                    <input
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      type="password"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputCls}`}
                      placeholder="••••••••••"
                      disabled={pwBusy}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>New password</label>
                      <input
                        value={nextPassword}
                        onChange={(e) => setNextPassword(e.target.value)}
                        type="password"
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputCls}`}
                        placeholder="Minimum 8 characters"
                        disabled={pwBusy}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Confirm new password</label>
                      <input
                        value={nextPassword2}
                        onChange={(e) => setNextPassword2(e.target.value)}
                        type="password"
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputCls}`}
                        placeholder="Repeat new password"
                        disabled={pwBusy}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onChangePassword();
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className={`text-xs ${mutedTextCls}`}>After changing your password, your session remains valid.</div>
                    <button
                      onClick={onChangePassword}
                      disabled={pwBusy || !currentPassword || !nextPassword || !nextPassword2}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition-colors"
                    >
                      <KeyRound className="size-4" />
                      {pwBusy ? 'Updating…' : 'Update password'}
                    </button>
                  </div>

                  {pwMsg ? (
                    <div className={`text-sm ${pwMsg === 'Password updated' ? (isDarkMode ? 'text-green-300' : 'text-green-700') : (isDarkMode ? 'text-yellow-200' : 'text-yellow-800')}`}>{pwMsg}</div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
