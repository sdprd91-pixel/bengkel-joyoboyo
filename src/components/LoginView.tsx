import React, { useState } from 'react';
import {
  Lock,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  Wrench,
  KeyRound,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  X,
  Mail,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ShopSettings, UserAccount, UserRole } from '../types';
import shopLogo from '../assets/images/joyoboyo_logo_1785722496730.jpg';
import { loginWithEmail, requestPasswordResetForIdentifier } from '../services/authService';

interface LoginViewProps {
  settings: ShopSettings;
  users: UserAccount[];
  onLogin: (user: UserAccount) => void;
  onUpdateUsers?: (updatedUsers: UserAccount[]) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  settings,
  onLogin,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [usernameInput, setUsernameInput] = useState('admin');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Forgot Password Modal States
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetStatus, setResetStatus] = useState<{
    type: 'success' | 'error';
    message: string;
    email?: string;
  } | null>(null);
  const [showEmergencyGuide, setShowEmergencyGuide] = useState(false);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setUsernameInput(role === 'admin' ? 'admin' : 'kasir');
    setPasswordInput('');
    setErrorMessage('');
  };

  const handleOpenResetModal = () => {
    const defaultVal = usernameInput.trim() || (selectedRole === 'admin' ? 'admin' : 'kasir');
    setResetIdentifier(defaultVal);
    setResetStatus(null);
    setShowEmergencyGuide(false);
    setIsResetModalOpen(true);
  };

  const handleCloseResetModal = () => {
    setIsResetModalOpen(false);
    setResetStatus(null);
    setIsSendingReset(false);
  };

  const handleSendResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) {
      setResetStatus({
        type: 'error',
        message: 'Silakan masukkan username atau email akun Anda.',
      });
      return;
    }

    setIsSendingReset(true);
    setResetStatus(null);

    try {
      const result = await requestPasswordResetForIdentifier(resetIdentifier);
      setResetStatus({
        type: 'success',
        message: 'Tautan reset kata sandi resmi Firebase telah berhasil dikirim ke alamat email:',
        email: result.email,
      });
    } catch (err: any) {
      setResetStatus({
        type: 'error',
        message: err.message || 'Gagal mengirim email reset kata sandi. Pastikan akun terdaftar di sistem.',
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const targetUser = usernameInput.trim() || (selectedRole === 'admin' ? 'admin' : 'kasir');
    if (!passwordInput.trim()) {
      setErrorMessage('Silakan masukkan kata sandi Anda.');
      return;
    }

    setIsAuthenticating(true);

    try {
      const userProfile = await loginWithEmail(targetUser, passwordInput);
      onLogin(userProfile);
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = err.message || 'Gagal masuk. Silakan periksa kembali kata sandi Anda.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Kata sandi tidak sesuai. Silakan periksa kembali.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Koneksi internet bermasalah. Periksa jaringan Anda.';
      }
      setErrorMessage(msg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative z-10">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6 sm:p-8 text-white relative">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white p-1 shadow-lg shrink-0 overflow-hidden border border-white/20">
              <img
                src={shopLogo}
                alt="Logo Bengkel Joyoboyo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-bold tracking-wide uppercase">
                <ShieldCheck className="w-3.5 h-3.5" />
                Sistem Kasir & Manajemen
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1 leading-snug">
                {settings.shopName || 'BENGKEL MOTOR JOYOBOYO'}
              </h1>
              <p className="text-orange-100 text-xs font-medium line-clamp-1">
                {settings.shopTagline || 'Yuwanain Arso II - Keerom Papua'}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Role Selection Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
              Pilih Akses Pengguna
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                id="btn-role-admin"
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedRole === 'admin'
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Admin (Owner)
              </button>

              <button
                id="btn-role-kasir"
                type="button"
                onClick={() => handleRoleChange('kasir')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedRole === 'kasir'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Wrench className="w-4 h-4" />
                Kasir
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Username Akun
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="input-login-username"
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="admin atau kasir"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl text-white text-sm placeholder-slate-500 outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Kata Sandi (Password)
                </label>
                <button
                  id="btn-forgot-password-trigger"
                  type="button"
                  onClick={handleOpenResetModal}
                  className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  autoFocus
                  className="w-full pl-10 pr-11 py-3 bg-slate-950 border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl text-white text-sm placeholder-slate-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Memverifikasi Akun...
                </>
              ) : (
                <>
                  Masuk ke Sistem Bengkel
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Security Note */}
          <div className="pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
              <KeyRound className="w-3.5 h-3.5 text-orange-400" />
              Sistem Terenkripsi Bengkel Motor Joyoboyo
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal Dialog */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            id="modal-forgot-password"
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs text-white">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Pemulihan Kata Sandi Akun</h3>
                  <p className="text-xs text-orange-100">
                    Kirim link reset ke email terdaftar atau gunakan panduan akun
                  </p>
                </div>
              </div>
              <button
                id="btn-close-forgot-modal"
                type="button"
                onClick={handleCloseResetModal}
                className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-200">
              <form onSubmit={handleSendResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Username atau Alamat Email
                  </label>
                  <p className="text-xs text-slate-400 mb-2">
                    Masukkan username (misal: <span className="font-mono text-orange-400">admin</span> atau{' '}
                    <span className="font-mono text-amber-400">kasir</span>) atau alamat email terdaftar akun Anda.
                  </p>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="input-reset-identifier"
                      type="text"
                      required
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="admin, kasir, atau email@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl text-white text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Status Alerts */}
                {resetStatus && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                      resetStatus.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    {resetStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">{resetStatus.message}</p>
                      {resetStatus.email && (
                        <p className="font-mono font-bold text-emerald-200 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/60 inline-block mt-1">
                          {resetStatus.email}
                        </p>
                      )}
                      {resetStatus.type === 'success' && (
                        <p className="text-[11px] text-emerald-400/90 mt-1">
                          Buka email tersebut, klik link resmi yang disertakan, dan buat kata sandi baru Anda.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <button
                  id="btn-send-reset-link"
                  type="submit"
                  disabled={isSendingReset}
                  className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSendingReset ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Mengirim Tautan Pemulihan...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Kirim Tautan Reset ke Email
                    </>
                  )}
                </button>
              </form>

              {/* Emergency Fallback Guidance */}
              <div className="pt-3 border-t border-slate-800">
                <button
                  id="btn-toggle-emergency-guide"
                  type="button"
                  onClick={() => setShowEmergencyGuide(!showEmergencyGuide)}
                  className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 font-medium py-1 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    Panduan Kata Sandi Standar / Cadangan Sistem
                  </span>
                  {showEmergencyGuide ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showEmergencyGuide && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2.5 animate-in fade-in">
                    <div>
                      <span className="font-bold text-orange-400 block mb-0.5">
                        1. Akun Admin / Pemilik Bengkel:
                      </span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Jika Anda belum pernah mengganti kata sandi atau sedang offline, gunakan kata sandi standar sistem:{' '}
                        <code className="text-orange-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                          admin123
                        </code>{' '}
                        atau{' '}
                        <code className="text-orange-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                          admin
                        </code>.
                      </p>
                    </div>
                    <div>
                      <span className="font-bold text-amber-400 block mb-0.5">
                        2. Akun Kasir / Staf Frontdesk:
                      </span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Kata sandi bawaan kasir adalah{' '}
                        <code className="text-amber-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                          kasir123
                        </code>. Jika lupa, Admin dapat mereset atau mengganti kata sandi kasir secara langsung melalui menu{' '}
                        <span className="text-slate-200 font-semibold">Pengaturan &gt; Manajemen Pengguna</span>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                id="btn-close-forgot-footer"
                type="button"
                onClick={handleCloseResetModal}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

