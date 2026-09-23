import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  User,
  Plus,
  Trash2,
  Mail,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
} from 'lucide-react';
import { UserAccount, UserRole } from '../../types';
import {
  createNewUserAccount,
  sendPasswordReset,
  changeCurrentPassword,
  updateUserAccount,
  deleteUserAccount,
} from '../../services/authService';

interface UserManagementSectionProps {
  users: UserAccount[];
  currentUser?: UserAccount;
  onRefreshUsers?: () => void;
}

export const UserManagementSection: React.FC<UserManagementSectionProps> = ({
  users,
  currentUser,
  onRefreshUsers,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  // State for Add User Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('kasir');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // State for Change Own Password Modal
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newOwnPassword, setNewOwnPassword] = useState('');
  const [confirmOwnPassword, setConfirmOwnPassword] = useState('');
  const [showOwnPass, setShowOwnPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Status message
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      showStatus('Harap isi semua kolom pendaftaran akun.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showStatus('Password minimal 6 karakter.', 'error');
      return;
    }

    setIsCreating(true);
    try {
      if (!currentUser) throw new Error('Sesi Admin tidak aktif.');
      await createNewUserAccount(
        currentUser,
        newEmail.trim().toLowerCase(),
        newPassword,
        newName.trim(),
        newEmail.split('@')[0] || newName.toLowerCase().replace(/\s+/g, ''),
        newRole,
        newRole === 'admin'
          ? ['dashboard', 'services', 'spareparts', 'customers', 'payroll', 'reports', 'settings']
          : ['services']
      );

      showStatus(`Akun ${newName} (${newRole.toUpperCase()}) berhasil dibuat di Firebase Auth & Firestore.`);
      setIsAddModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('kasir');
      onRefreshUsers?.();
    } catch (err: any) {
      showStatus(`Gagal membuat akun: ${err?.message || 'Error tidak diketahui'}`, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendResetEmail = async (email: string, name: string) => {
    if (!confirm(`Kirim link pemulihan kata sandi (Password Reset) ke email ${email}?`)) {
      return;
    }
    try {
      await sendPasswordReset(email);
      showStatus(`Email instruksi reset kata sandi telah dikirim ke ${email}.`);
    } catch (err: any) {
      showStatus(`Gagal mengirim reset password: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleToggleRole = async (targetUser: UserAccount) => {
    if (!currentUser) return;
    if (targetUser.id === currentUser.id) {
      showStatus('Anda tidak dapat mengubah peran akun Anda sendiri.', 'error');
      return;
    }
    const nextRole: UserRole = targetUser.role === 'admin' ? 'kasir' : 'admin';
    const nextTabs =
      nextRole === 'admin'
        ? ['dashboard', 'services', 'spareparts', 'customers', 'payroll', 'reports', 'settings']
        : ['services'];

    if (
      !confirm(
        `Ubah hak akses pengguna ${targetUser.name} dari ${targetUser.role.toUpperCase()} menjadi ${nextRole.toUpperCase()}?`
      )
    ) {
      return;
    }

    try {
      await updateUserAccount(currentUser, {
        ...targetUser,
        role: nextRole,
        allowedTabs: nextTabs,
      });
      showStatus(`Hak akses ${targetUser.name} diperbarui menjadi ${nextRole.toUpperCase()}.`);
      onRefreshUsers?.();
    } catch (err: any) {
      showStatus(`Gagal mengubah hak akses: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleToggleStatus = async (targetUser: UserAccount) => {
    if (!currentUser) return;
    if (targetUser.id === currentUser.id) {
      showStatus('Anda tidak dapat menonaktifkan akun yang sedang digunakan.', 'error');
      return;
    }
    const nextStatus = targetUser.status === 'Non-Aktif' ? 'Aktif' : 'Non-Aktif';
    try {
      await updateUserAccount(currentUser, {
        ...targetUser,
        status: nextStatus,
      });
      showStatus(`Status akun ${targetUser.name} diubah menjadi ${nextStatus}.`);
      onRefreshUsers?.();
    } catch (err: any) {
      showStatus(`Gagal mengubah status akun: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleDeleteUser = async (targetUser: UserAccount) => {
    if (!currentUser) return;
    if (targetUser.id === currentUser.id) {
      showStatus('Anda tidak dapat menghapus akun Anda sendiri.', 'error');
      return;
    }
    if (
      !confirm(
        `PERINGATAN: Hapus profil akun ${targetUser.name} (${targetUser.email}) dari sistem bengkel?`
      )
    ) {
      return;
    }

    try {
      await deleteUserAccount(currentUser, targetUser.id, targetUser.name);
      showStatus(`Akun ${targetUser.name} berhasil dihapus.`);
      onRefreshUsers?.();
    } catch (err: any) {
      showStatus(`Gagal menghapus akun: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOwnPassword || !confirmOwnPassword) {
      showStatus('Harap isi kolom password baru.', 'error');
      return;
    }
    if (newOwnPassword !== confirmOwnPassword) {
      showStatus('Konfirmasi password baru tidak cocok.', 'error');
      return;
    }
    if (newOwnPassword.length < 6) {
      showStatus('Password baru minimal 6 karakter.', 'error');
      return;
    }

    setIsChangingPass(true);
    try {
      await changeCurrentPassword(newOwnPassword, currentUser);
      showStatus('Kata sandi Anda berhasil diperbarui di Firebase Authentication.');
      setIsChangePasswordModalOpen(false);
      setCurrentPassword('');
      setNewOwnPassword('');
      setConfirmOwnPassword('');
    } catch (err: any) {
      showStatus(`Gagal mengganti password: ${err?.message || 'Gagal'}. Harap login ulang jika sesi telah usang.`, 'error');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-slate-800 text-base">
              Manajemen Pengguna & Hak Akses (Firebase Auth & RBAC)
            </h3>
            <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
              Enterprise RBAC
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kelola akun staf kasir dan admin pemilik secara aman menggunakan enkripsi Firebase Authentication.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsChangePasswordModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            Ubah Password Saya
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Akun Baru
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              : 'bg-red-50 border border-red-300 text-red-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200 text-[11px]">
            <tr>
              <th className="py-2.5 px-3.5">Nama & Pengguna</th>
              <th className="py-2.5 px-3.5">Email Akun</th>
              <th className="py-2.5 px-3.5 text-center">Hak Akses (Role)</th>
              <th className="py-2.5 px-3.5 text-center">Status</th>
              <th className="py-2.5 px-3.5">Menu yang Dapat Diakses</th>
              {isAdmin && <th className="py-2.5 px-3.5 text-center">Tindakan</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {users.map((u) => {
              const isMe = u.id === currentUser?.id;
              return (
                <tr key={u.id || u.email} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          u.role === 'admin'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-orange-100 text-orange-700 border border-orange-200'
                        }`}
                      >
                        {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          {u.name}
                          {isMe && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-700 font-extrabold px-1.5 py-0.2 rounded border border-emerald-300">
                              Anda
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          UID: {u.id ? `${u.id.substring(0, 8)}...` : '-'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3.5 font-mono text-slate-700 font-semibold">{u.email}</td>
                  <td className="py-3 px-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-extrabold text-[11px] border ${
                        u.role === 'admin'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-orange-50 text-orange-700 border-orange-200'
                      }`}
                    >
                      {u.role === 'admin' ? (
                        <ShieldCheck className="w-3 h-3 text-blue-600" />
                      ) : (
                        <User className="w-3 h-3 text-orange-600" />
                      )}
                      {u.role === 'admin' ? 'ADMIN (PEMILIK)' : 'KASIR (STAF)'}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.status === 'Non-Aktif'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {u.status || 'Aktif'}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-slate-600 text-[11px]">
                    {u.role === 'admin' ? (
                      <span className="font-semibold text-slate-800">
                        Semua Menu (Full Access Dashboard, Servis, Sparepart, Pelanggan, Gaji, Laporan, Pengaturan)
                      </span>
                    ) : (
                      <span className="font-semibold text-orange-700">
                        Menu Servis & Kasir Transaksi Saja
                      </span>
                    )}
                  </td>

                  {isAdmin && (
                    <td className="py-3 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendResetEmail(u.email, u.name)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 border border-slate-200 cursor-pointer"
                          title="Kirim Link Reset Password"
                        >
                          <Mail className="w-3 h-3 text-slate-500" />
                          Reset
                        </button>

                        {!isMe && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleRole(u)}
                              className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center gap-1 border border-blue-200 cursor-pointer"
                              title="Ubah Role (Admin / Kasir)"
                            >
                              Role
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold flex items-center gap-1 border border-slate-200 cursor-pointer"
                              title="Aktifkan / Nonaktifkan Akun"
                            >
                              {u.status === 'Non-Aktif' ? (
                                <UserCheck className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <UserX className="w-3 h-3 text-amber-600" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="p-1 rounded bg-red-50 hover:bg-red-600 text-red-600 hover:text-white transition-colors cursor-pointer"
                              title="Hapus Akun"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Tambah Akun Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-md w-full text-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-slate-100 text-base">Tambah Akun Pengguna Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">
                  Nama Lengkap Pengguna <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">
                  Email Akun (Digunakan untuk Login) <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Contoh: kasir.joyoboyo@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">
                  Kata Sandi Awal (Minimal 6 Karakter) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">
                  Peran Akun (Role Akses) <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewRole('kasir')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      newRole === 'kasir'
                        ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs">Kasir / Staf</div>
                    <div className="text-[10px] mt-0.5 opacity-80">Akses Servis & Kasir saja</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRole('admin')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      newRole === 'admin'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs">Admin / Owner</div>
                    <div className="text-[10px] mt-0.5 opacity-80">Akses seluruh menu & laporan</div>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/20"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mendaftarkan...
                    </>
                  ) : (
                    'Daftarkan Akun'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ubah Password Akun Sendiri */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-md w-full text-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-slate-100 text-base">Ubah Kata Sandi Saya</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChangePasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleChangeOwnPassword} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">
                  Kata Sandi Saat Ini <span className="text-red-400">*</span>
                </label>
                <input
                  type={showOwnPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">
                  Kata Sandi Baru (Minimal 6 Karakter) <span className="text-red-400">*</span>
                </label>
                <input
                  type={showOwnPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={newOwnPassword}
                  onChange={(e) => setNewOwnPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">
                  Ulangi Kata Sandi Baru <span className="text-red-400">*</span>
                </label>
                <input
                  type={showOwnPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={confirmOwnPassword}
                  onChange={(e) => setConfirmOwnPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOwnPass}
                    onChange={(e) => setShowOwnPass(e.target.checked)}
                    className="rounded text-orange-500"
                  />
                  <span>Tampilkan Karakter Sandi</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isChangingPass}
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/20"
                >
                  {isChangingPass ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memperbarui...
                    </>
                  ) : (
                    'Perbarui Sandi'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
