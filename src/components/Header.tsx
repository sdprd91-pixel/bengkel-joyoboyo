import React, { useState } from 'react';
import {
  Wrench,
  Package,
  Users,
  FileText,
  Settings,
  LayoutDashboard,
  Plus,
  Sparkles,
  UserCheck,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  X,
  Send,
  Trash2,
  LogOut,
  User,
  ShieldCheck,
  Cloud,
  ShoppingCart,
} from 'lucide-react';
import { AppNotification, ShopSettings, SyncStatus, UserAccount } from '../types';
import shopLogo from '../assets/images/joyoboyo_logo_1785722496730.jpg';
import { formatDateJayapura } from '../lib/timezone';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  settings: ShopSettings;
  currentUser: UserAccount | null;
  onLogout: () => void;
  onNewServiceClick: () => void;
  onDirectSaleClick?: () => void;
  lowStockCount: number;
  pendingServicesCount: number;
  notifications: AppNotification[];
  onMarkNotifRead: (id: string) => void;
  onMarkAllNotifsRead?: () => void;
  onDismissNotif?: (id: string) => void;
  onClearAllNotifs: () => void;
  syncStatus?: SyncStatus;
  onTriggerSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  settings,
  currentUser,
  onLogout,
  onNewServiceClick,
  onDirectSaleClick,
  lowStockCount,
  pendingServicesCount,
  notifications,
  onMarkNotifRead,
  onMarkAllNotifsRead,
  onDismissNotif,
  onClearAllNotifs,
  syncStatus = 'SYNCED',
  onTriggerSync,
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'services',
      label: 'Servis & Kasir',
      icon: Wrench,
      badge: pendingServicesCount > 0 ? pendingServicesCount : null,
      badgeColor: 'bg-orange-500 text-white',
    },
    {
      id: 'spareparts',
      label: 'Sparepart',
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : null,
      badgeColor: 'bg-red-500 text-white',
    },
    { id: 'customers', label: 'Pelanggan', icon: UserCheck },
    { id: 'payroll', label: 'Pegawai & Gaji', icon: Users },
    { id: 'reports', label: 'Laporan Keuangan', icon: FileText },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  // Filter items according to current user role and allowedTabs
  const navItems = currentUser
    ? allNavItems.filter((item) => currentUser.allowedTabs.includes(item.id))
    : allNavItems;

  const handleNotifAction = (notif: AppNotification) => {
    onMarkNotifRead(notif.id);
    if (notif.actionTab) {
      setActiveTab(notif.actionTab);
    }
    setIsNotifOpen(false);
  };

  const handleOpenWA = (phone: string, name?: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;
    const msg = encodeURIComponent(
      `Halo Kak! Pengingat dari *${settings.shopName}*: Kendaraan Kakak sudah waktunya untuk servis berkala / ganti oli demi menjaga performa mesin tetap halus. Hubungi kami untuk booking servis!`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, '_blank');
  };

  const renderSyncBadge = () => {
    switch (syncStatus) {
      case 'SYNCING':
        return (
          <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <Cloud className="w-3 h-3" />
            Menyinkronkan...
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-300 border border-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <Cloud className="w-3 h-3" />
            Mode Offline
          </span>
        );
      case 'ERROR':
        return (
          <button
            onClick={onTriggerSync}
            className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30 cursor-pointer hover:bg-red-500/30"
            title="Klik untuk menyinkronkan ulang"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            <Cloud className="w-3 h-3" />
            Sinkronisasi Tertunda (Klik)
          </button>
        );
      case 'ONLINE':
      case 'SYNCED':
      default:
        return (
          <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <Cloud className="w-3 h-3" />
            Firestore Cloud Live
          </span>
        );
    }
  };

  return (
    <header className="bg-[#1E293B] sticky top-0 z-40 shadow-md">
      {/* Top Branding & Action Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Logo & Workshop Name */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 border border-orange-500/50 p-0.5 shadow-lg overflow-hidden shrink-0">
              <img
                src={settings.logoUrl || shopLogo}
                alt={settings.shopName}
                className="w-full h-full object-cover rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-white font-bold text-base sm:text-lg leading-tight tracking-wide">
                  {settings.shopName}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <Sparkles className="w-3 h-3" />
                  {settings.city || 'Arso II'}
                </span>
                {renderSyncBadge()}
              </div>
              <span className="text-orange-400 text-xs font-medium uppercase truncate max-w-xs sm:max-w-md hidden xs:block">
                {settings.shopTagline || 'Integrated Workshop System'}
              </span>
            </div>
          </div>

          {/* Quick Action Buttons & Notifications Drawer Bell */}
          <div className="flex items-center gap-2 sm:gap-4 relative">
            
            {/* Bell Icon for Notifications Drawer */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 relative transition-all cursor-pointer"
                title="Pusat Notifikasi Sistem & Pelanggan"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500 text-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Drawer */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 text-slate-800 overflow-hidden">
                  <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-orange-400" />
                      <span className="font-bold text-xs">Pusat Notifikasi & Alarm</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">
                          {unreadCount} Baru
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && onMarkAllNotifsRead && (
                        <button
                          onClick={onMarkAllNotifsRead}
                          className="text-[10px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 cursor-pointer"
                          title="Tandai semua sebagai sudah dibaca"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Tandai Dibaca
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={onClearAllNotifs}
                          className="text-[10px] text-slate-400 hover:text-red-400 font-semibold flex items-center gap-1 cursor-pointer"
                          title="Hapus / Bersihkan semua notifikasi"
                        >
                          <Trash2 className="w-3 h-3" /> Bersihkan
                        </button>
                      )}
                      <button
                        onClick={() => setIsNotifOpen(false)}
                        className="text-slate-400 hover:text-white p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold">Semua notifikasi bersih!</p>
                        <p className="text-[11px] mt-0.5">Tidak ada peringatan stok atau jadwal saat ini.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3.5 transition-colors relative group ${
                            notif.isRead ? 'bg-white hover:bg-slate-50' : 'bg-orange-50/50 hover:bg-orange-50'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {notif.type === 'LOW_STOCK' && (
                              <div className="p-1.5 rounded-md bg-red-100 text-red-600 shrink-0 mt-0.5">
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                            )}
                            {notif.type === 'NEW_SERVICE' && (
                              <div className="p-1.5 rounded-md bg-blue-100 text-blue-600 shrink-0 mt-0.5">
                                <Wrench className="w-4 h-4" />
                              </div>
                            )}
                            {notif.type === 'CUSTOMER_REMINDER' && (
                              <div className="p-1.5 rounded-md bg-orange-100 text-orange-600 shrink-0 mt-0.5">
                                <Calendar className="w-4 h-4" />
                              </div>
                            )}

                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-xs text-slate-800">{notif.title}</h4>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {new Date(notif.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jayapura' })} WIT
                                  </span>
                                  {onDismissNotif && (
                                    <button
                                      onClick={() => onDismissNotif(notif.id)}
                                      className="text-slate-300 hover:text-red-500 p-0.5 cursor-pointer rounded"
                                      title="Hapus peringatan ini"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-slate-600 mt-1 leading-snug">{notif.message}</p>

                              <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                                {notif.customerPhone ? (
                                  <button
                                    onClick={() => handleOpenWA(notif.customerPhone!)}
                                    className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs cursor-pointer"
                                  >
                                    <Send className="w-3 h-3" /> Kirim WhatsApp Reminder
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleNotifAction(notif)}
                                    className="px-2.5 py-1 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs cursor-pointer"
                                  >
                                    Buka Halaman
                                  </button>
                                )}

                                {!notif.isRead && (
                                  <button
                                    onClick={() => onMarkNotifRead(notif.id)}
                                    className="text-[10px] font-semibold text-slate-400 hover:text-slate-700 cursor-pointer"
                                  >
                                    Tandai Dibaca
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center gap-3 text-right text-xs">
              <div>
                <p className="text-slate-300 text-[11px]">
                  {formatDateJayapura(new Date().toISOString())}
                </p>
                <p className="text-emerald-400 font-mono font-bold text-[11px] flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> WIT (UTC+9)
                </p>
              </div>
              <div className="h-7 w-[1px] bg-slate-700"></div>
            </div>

            {/* Quick Action: Penjualan Sparepart Saja */}
            {onDirectSaleClick && (
              <button
                onClick={onDirectSaleClick}
                className="px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                title="Buka Kasir Penjualan Sparepart Langsung / Grosir"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Jual Sparepart</span>
                <span className="sm:hidden">Sparepart</span>
              </button>
            )}

            {/* Quick Action: Daftar Servis Baru */}
            <button
              onClick={onNewServiceClick}
              className="px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
              title="Daftarkan Unit Servis Baru & Masuk Antrean"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">+ Servis Baru</span>
              <span className="sm:hidden">+ Servis</span>
            </button>

            {/* User Session Profile & Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-white text-xs font-bold leading-tight flex items-center justify-end gap-1">
                    {currentUser.role === 'admin' ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-orange-400" />
                    )}
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-orange-400 font-semibold uppercase">
                    {currentUser.role === 'admin' ? 'User 2 (Admin)' : 'User 1 (Kasir)'}
                  </span>
                </div>

                <button
                  onClick={onLogout}
                  className="p-2.5 rounded-lg bg-slate-800 hover:bg-red-600/90 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
                  title="Keluar / Ganti Akun User"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white border-t border-slate-200/80 shadow-xs overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1.5 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-orange-50 text-orange-600 border border-orange-200/80'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>

                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

