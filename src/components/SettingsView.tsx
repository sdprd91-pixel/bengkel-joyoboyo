import React, { useState, useEffect } from 'react';
import {
  Settings,
  Printer,
  RotateCcw,
  Save,
  CheckCircle2,
  Store,
  Phone,
  MapPin,
  FileText,
  Percent,
  KeyRound,
  ShieldCheck,
  User,
  Eye,
  EyeOff,
  Users,
  Edit2,
  Edit3,
  Upload,
  Image as ImageIcon,
  Lock,
  Smartphone,
  ExternalLink,
  HelpCircle,
  Play,
  Check,
  Wrench,
  Plus,
  Trash2,
  Search,
  Tag,
  AlertCircle,
  X,
  Cloud,
  Database,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Employee, PresetLabor, ServiceOrder, ShopSettings, UserAccount } from '../types';
import shopLogo from '../assets/images/joyoboyo_logo_1785722496730.jpg';
import { ThermalPrintModal } from './ThermalPrintModal';
import { formatRupiah } from '../lib/storage';
import { DEFAULT_PRESET_LABORS } from '../data/mockData';
import { compressLogoImage, testFirestoreConnection } from '../lib/firestoreService';
import { firebaseConfig, firestoreDbId } from '../lib/firebase';
import { UserManagementSection } from './settings/UserManagementSection';
import { BackupRestoreSection } from './settings/BackupRestoreSection';
import { AuditLogSection } from './settings/AuditLogSection';

interface SettingsViewProps {
  settings: ShopSettings;
  users: UserAccount[];
  presetLabors: PresetLabor[];
  employees?: Employee[];
  currentUser?: UserAccount;
  onSaveSettings: (settings: ShopSettings) => void;
  onUpdateUsers: (users: UserAccount[]) => void;
  onSavePresetLabors: (labors: PresetLabor[]) => void;
  onSaveEmployee?: (employee: Employee) => void;
  onDeleteEmployee?: (id: string) => void;
  onResetData: () => void;
  onSyncAllToCloud?: () => Promise<{ success: boolean; message: string }>;
  onClearTransactions?: () => Promise<void> | void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  users,
  presetLabors,
  employees = [],
  currentUser,
  onSaveSettings,
  onUpdateUsers,
  onSavePresetLabors,
  onSaveEmployee,
  onDeleteEmployee,
  onResetData,
  onSyncAllToCloud,
  onClearTransactions,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [formData, setFormData] = useState<ShopSettings>({ ...settings });
  const [isSaved, setIsSaved] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudSyncResult, setCloudSyncResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [testConnResult, setTestConnResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setTestConnResult(null);
    try {
      const res = await testFirestoreConnection();
      setTestConnResult({
        success: res.success,
        message: res.message,
      });
    } catch (err: any) {
      setTestConnResult({
        success: false,
        message: err.message || 'Koneksi gagal.',
      });
    } finally {
      setIsTestingConn(false);
    }
  };

  // Users management state inside settings
  const [userList, setUserList] = useState<UserAccount[]>([...users]);
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [userSavedMsg, setUserSavedMsg] = useState(false);
  const [showTestThermalModal, setShowTestThermalModal] = useState(false);

  // Preset Labors management state inside settings
  const DEFAULT_LABOR_CATEGORIES = [
    'Servis Rutin',
    'CVT & Matik',
    'Pelumas',
    'Pengereman',
    'Kaki-kaki',
    'Mesin',
    'Mesin Berat',
    'Kelistrikan',
    'Pendingin',
    'Bahan Bakar',
    'Penggerak',
  ];

  const [laborList, setLaborList] = useState<PresetLabor[]>(presetLabors || []);
  const [laborSearch, setLaborSearch] = useState('');
  const [selectedLaborCategory, setSelectedLaborCategory] = useState<string>('Semua');
  const [editingLaborId, setEditingLaborId] = useState<string | null>(null);
  const [customLaborCategories, setCustomLaborCategories] = useState<string[]>([]);
  const [laborForm, setLaborForm] = useState<{
    name: string;
    price: number | '';
    category: string;
    customCategory: string;
  }>({
    name: '',
    price: '',
    category: 'Servis Rutin',
    customCategory: '',
  });
  const [laborAlert, setLaborAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Dynamic list of all available categories
  const allCategoryOptions = Array.from(
    new Set([
      ...DEFAULT_LABOR_CATEGORIES,
      ...laborList.map((l) => l.category).filter(Boolean),
      ...customLaborCategories,
    ])
  );

  useEffect(() => {
    if (users && users.length > 0) {
      setUserList([...users]);
    }
  }, [users]);

  useEffect(() => {
    if (settings) {
      setFormData({ ...settings });
    }
  }, [settings]);

  useEffect(() => {
    if (presetLabors) {
      setLaborList(presetLabors);
    }
  }, [presetLabors]);

  const showLaborAlert = (message: string, type: 'success' | 'error' = 'success') => {
    setLaborAlert({ message, type });
    setTimeout(() => setLaborAlert(null), 3000);
  };

  // Sample Order for Printer Testing
  const dummyTestOrder: ServiceOrder = {
    id: 'TES-PRINT-58',
    customerName: 'Pelanggan Uji Coba Printer',
    customerPhone: '0812-3456-7890',
    plateNumber: 'PA 5882 YW',
    motorModel: 'Honda Vario 150 Esp (2022)',
    mechanicId: 'MEK-01',
    mechanicName: 'Mekanik Joyoboyo',
    status: 'SELESAI',
    complaint: 'Uji coba cetak struk termal bengkel',
    labors: [{ id: 'L-01', name: 'Servis Injeksi & Tune Up', price: 60000 }],
    parts: [{ partId: 'P-01', code: 'OIL-MPX2', name: 'Oli AHM MPX2 Matic 0.8L', qty: 1, buyPrice: 48000, sellPrice: 58000 }],
    subtotalLabor: 60000,
    subtotalParts: 58000,
    discount: 8000,
    totalAmount: 110000,
    paymentStatus: 'LUNAS',
    paymentMethod: 'TUNAI',
    paidAmount: 120000,
    changeAmount: 10000,
    mechanicCommissionPercent: 25,
    mechanicCommissionAmount: 15000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Logo Management Handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      alert('Akses Terbatas: Hanya pengguna dengan akun Admin yang berhak mengubah logo resmi bengkel.');
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file gambar logo terlalu besar! Maksimal 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          const compressed = await compressLogoImage(reader.result, 400, 400, 0.85);
          setFormData((prev) => ({ ...prev, logoUrl: compressed }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLogo = () => {
    if (!isAdmin) {
      alert('Akses Terbatas: Hanya pengguna dengan akun Admin yang berhak mengubah logo resmi bengkel.');
      return;
    }
    setFormData((prev) => ({ ...prev, logoUrl: shopLogo }));
  };

  const handleTriggerCloudSync = async () => {
    if (!onSyncAllToCloud) return;
    setIsSyncingCloud(true);
    setCloudSyncResult(null);
    try {
      const res = await onSyncAllToCloud();
      setCloudSyncResult({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
    } catch (err: any) {
      setCloudSyncResult({
        type: 'error',
        message: `Gagal sinkronisasi: ${err?.message || 'Error koneksi'}`,
      });
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => {
        setCloudSyncResult(null);
      }, 5000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    onUpdateUsers(userList);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleUserChange = (role: 'kasir' | 'admin', field: keyof UserAccount, value: string) => {
    setUserList((prev) =>
      prev.map((u) => {
        if (u.role === role) {
          return { ...u, [field]: value };
        }
        return u;
      })
    );
  };

  const togglePasswordVisibility = (role: string) => {
    setShowPasswords((prev) => ({ ...prev, [role]: !prev[role] }));
  };

  const handleSaveUsersOnly = () => {
    onUpdateUsers(userList);
    setUserSavedMsg(true);
    setTimeout(() => setUserSavedMsg(false), 2500);
  };

  // Handlers for Preset Labor Settings
  const handleAddOrUpdateLabor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!laborForm.name.trim()) {
      showLaborAlert('Nama jasa servis tidak boleh kosong', 'error');
      return;
    }
    const numericPrice = Number(laborForm.price) || 0;
    if (numericPrice < 0) {
      showLaborAlert('Tarif jasa servis tidak boleh negatif', 'error');
      return;
    }

    // Determine target category
    let finalCategory = laborForm.category;
    if (laborForm.category === 'Lainnya') {
      finalCategory = laborForm.customCategory.trim() || 'Lainnya';
    } else {
      finalCategory = laborForm.category.trim();
    }

    // Automatically add custom category to options if new
    if (
      finalCategory &&
      finalCategory !== 'Lainnya' &&
      !DEFAULT_LABOR_CATEGORIES.includes(finalCategory) &&
      !customLaborCategories.includes(finalCategory)
    ) {
      setCustomLaborCategories((prev) => [...prev, finalCategory]);
    }

    let updated: PresetLabor[];

    if (editingLaborId) {
      updated = laborList.map((item) =>
        item.id === editingLaborId
          ? {
              ...item,
              name: laborForm.name.trim(),
              price: numericPrice,
              category: finalCategory,
            }
          : item
      );
      showLaborAlert(`Jasa servis "${laborForm.name.trim()}" berhasil diperbarui!`, 'success');
    } else {
      const newLabor: PresetLabor = {
        id: `L-${Date.now()}`,
        name: laborForm.name.trim(),
        price: numericPrice,
        category: finalCategory,
      };
      updated = [newLabor, ...laborList];
      showLaborAlert(`Jasa servis "${newLabor.name}" berhasil ditambahkan!`, 'success');
    }

    setLaborList(updated);
    onSavePresetLabors(updated);

    // Reset Form
    setEditingLaborId(null);
    setLaborForm({ name: '', price: '', category: 'Servis Rutin', customCategory: '' });
  };

  const handleEditLaborClick = (labor: PresetLabor) => {
    setEditingLaborId(labor.id);
    const cat = labor.category || 'Servis Rutin';
    if (allCategoryOptions.includes(cat)) {
      setLaborForm({
        name: labor.name,
        price: labor.price,
        category: cat,
        customCategory: '',
      });
    } else {
      setLaborForm({
        name: labor.name,
        price: labor.price,
        category: 'Lainnya',
        customCategory: cat,
      });
    }
  };

  const handleCancelLaborEdit = () => {
    setEditingLaborId(null);
    setLaborForm({ name: '', price: '', category: 'Servis Rutin', customCategory: '' });
  };

  const handleDeleteLabor = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus jasa servis "${name}"?`)) {
      const updated = laborList.filter((item) => item.id !== id);
      setLaborList(updated);
      onSavePresetLabors(updated);
      showLaborAlert(`Jasa servis "${name}" berhasil dihapus`, 'success');
      if (editingLaborId === id) {
        handleCancelLaborEdit();
      }
    }
  };

  const handleResetLaborDefaults = () => {
    if (confirm('Apakah Anda yakin ingin mereset seluruh daftar jasa servis ke preset standar bawaan?')) {
      setLaborList(DEFAULT_PRESET_LABORS);
      onSavePresetLabors(DEFAULT_PRESET_LABORS);
      showLaborAlert('Daftar jasa servis berhasil direset ke standar bawaan', 'success');
      handleCancelLaborEdit();
    }
  };

  // Employee management state inside settings
  const [empSearchSettings, setEmpSearchSettings] = useState('');
  const [isEmpModalOpenSettings, setIsEmpModalOpenSettings] = useState(false);
  const [editingEmpSettings, setEditingEmpSettings] = useState<Employee | null>(null);
  const [empFormSettings, setEmpFormSettings] = useState({
    name: '',
    phone: '',
    role: 'Mekanik Senior' as Employee['role'],
    dailyBaseSalary: 90000,
    commissionRateLabor: 30,
    bankInfo: '',
  });

  const handleOpenEmpModalSettings = (emp?: Employee) => {
    if (emp) {
      setEditingEmpSettings(emp);
      setEmpFormSettings({
        name: emp.name,
        phone: emp.phone || '',
        role: emp.role,
        dailyBaseSalary: emp.dailyBaseSalary || 0,
        commissionRateLabor: emp.commissionRateLabor || 0,
        bankInfo: emp.bankInfo || '',
      });
    } else {
      setEditingEmpSettings(null);
      setEmpFormSettings({
        name: '',
        phone: '',
        role: 'Mekanik Senior',
        dailyBaseSalary: 90000,
        commissionRateLabor: 30,
        bankInfo: '',
      });
    }
    setIsEmpModalOpenSettings(true);
  };

  const handleSaveEmpSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empFormSettings.name.trim()) {
      alert('Nama karyawan tidak boleh kosong!');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newEmp: Employee = {
      id: editingEmpSettings?.id || `EMP-${Date.now()}`,
      name: empFormSettings.name.trim(),
      phone: empFormSettings.phone.trim(),
      role: empFormSettings.role,
      dailyBaseSalary: Number(empFormSettings.dailyBaseSalary) || 0,
      commissionRateLabor: Number(empFormSettings.commissionRateLabor) || 0,
      joinDate: editingEmpSettings?.joinDate || todayStr,
      status: editingEmpSettings?.status || 'Aktif',
      bankInfo: empFormSettings.bankInfo.trim(),
    };

    if (onSaveEmployee) {
      onSaveEmployee(newEmp);
    }
    setIsEmpModalOpenSettings(false);
  };

  const handleDeleteEmpSettings = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data pegawai "${name}"?\nCatatan: Riwayat pengerjaan servis & komisi terdahulu tetap tersimpan.`)) {
      if (onDeleteEmployee) {
        onDeleteEmployee(id);
      }
    }
  };

  const laborCategories = Array.from(
    new Set(['Semua', ...allCategoryOptions, 'Lainnya'])
  );

  const filteredLabors = laborList.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(laborSearch.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(laborSearch.toLowerCase()));
    const matchesCat =
      selectedLaborCategory === 'Semua' || item.category === selectedLaborCategory;
    return matchesSearch && matchesCat;
  });


  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto relative">
      {/* Save Success Alert Banner */}
      {isSaved && (
        <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-lg border border-emerald-500 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>Pengaturan Bengkel & Struk Termal Berhasil Disimpan!</span>
          </div>
          <span className="text-xs bg-emerald-700 text-emerald-100 font-semibold px-2.5 py-1 rounded-lg">
            Tersimpan
          </span>
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-[#1E293B] p-5 rounded-xl border border-slate-700 shadow-sm flex items-center justify-between text-white">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-orange-400" />
            Pengaturan Bengkel & Struk Termal
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Atur identitas bengkel, footer nota struk, ukuran printer termal & reset data demo.
          </p>
        </div>

        {isSaved && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Tersimpan!
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Workshop Profile */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Store className="w-5 h-5 text-orange-500" />
              Profil & Identitas Bengkel
            </h3>
          </div>

          {/* Dynamic Workshop Logo Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative group w-16 h-16 rounded-xl bg-slate-900 border-2 border-orange-500/60 p-1 shadow-md shrink-0 overflow-hidden flex items-center justify-center">
                <img
                  src={formData.logoUrl || shopLogo}
                  alt="Logo Bengkel Motor"
                  className="w-full h-full object-cover rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800">Logo Resmi Bengkel</h4>
                  <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full border border-orange-300">Dinamis</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Logo ini muncul secara otomatis di Header Aplikasi, Dashboard, Struk Kasir Termal, & Slip Gaji.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isAdmin ? (
                <>
                  <label
                    htmlFor="shop-logo-upload"
                    className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Unggah Logo Baru
                  </label>
                  <input
                    id="shop-logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleResetLogo}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all"
                    title="Kembalikan ke Logo Default"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </>
              ) : (
                <div className="px-3.5 py-2 bg-slate-100 border border-slate-300 text-slate-500 font-medium text-xs rounded-xl flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Khusus Admin</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                Nama Bengkel:
              </label>
              <input
                type="text"
                required
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-bold text-slate-900 tracking-wide uppercase focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                Tagline / Subtitle Bengkel:
              </label>
              <input
                type="text"
                value={formData.shopTagline}
                onChange={(e) => setFormData({ ...formData, shopTagline: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                Alamat Bengkel Lengkap:
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                Kota / Kabupaten:
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                Nama Pemilik Bengkel (Owner):
              </label>
              <input
                type="text"
                required
                value={formData.ownerName || ''}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                placeholder="Contoh: Yuwanain"
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">
                No. Telepon / WhatsApp:
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Printer & Receipt Settings */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                Konfigurasi Cetak Struk Termal
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Atur ukuran kertas, batas lebar cetak, ukuran & model font, serta skala cetak agar hasil tidak terpotong di printer POS-58 / POS-80.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowTestThermalModal(true)}
              className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
              title="Buka jendela uji coba cetak struk dengan sampel nota"
            >
              <Printer className="w-4 h-4" />
              <span>Uji Coba Cetak Struk (Live Test)</span>
            </button>
          </div>

          {/* Row 1: Ukuran Kertas & Model Font */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                Ukuran Kertas Printer Termal:
              </label>
              <div className="flex gap-2">
                {(['58mm', '80mm'] as const).map((width) => (
                  <button
                    key={width}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        paperWidth: width,
                        printWidthPreset: width === '80mm' ? '72mm' : '38mm',
                        printFontSize: width === '80mm' ? '11px' : '9px',
                        printAlign: 'center',
                      })
                    }
                    className={`flex-1 py-2.5 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                      formData.paperWidth === width
                        ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {width === '58mm' ? 'POS-58 (58mm Standard)' : 'POS-80 (80mm Lebar)'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                Model Font Struk:
              </label>
              <div className="flex gap-2">
                {[
                  { label: 'Monospace (Rekomendasi Struk)', value: 'mono' },
                  { label: 'Compact Sans', value: 'sans' },
                ].map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, fontFamily: f.value as 'mono' | 'sans' })
                    }
                    className={`flex-1 py-2.5 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                      (formData.fontFamily || 'mono') === f.value
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Batas Lebar Area Cetak & Ukuran Teks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                Batas Lebar Area Cetak (Print Width):
              </label>
              <select
                value={formData.printWidthPreset || (formData.paperWidth === '80mm' ? '72mm' : '38mm')}
                onChange={(e) =>
                  setFormData({ ...formData, printWidthPreset: e.target.value as any })
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                {formData.paperWidth === '58mm' ? (
                  <>
                    <option value="38mm">38mm (Fix 38mm - Rekomendasi Bebas Terpotong)</option>
                    <option value="48mm">48mm (Lebar Full 48mm)</option>
                    <option value="35mm">35mm (Lebar 35mm)</option>
                    <option value="32mm">32mm (Lebar 32mm)</option>
                    <option value="30mm">30mm (Lebar 30mm)</option>
                    <option value="28mm">28mm (Lebar 28mm)</option>
                  </>
                ) : (
                  <option value="72mm">72mm (Standar POS-80)</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                Ukuran Teks Struk (Font Size):
              </label>
              <select
                value={formData.printFontSize || (formData.paperWidth === '80mm' ? '11px' : '9px')}
                onChange={(e) => setFormData({ ...formData, printFontSize: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="9px">9px (Fix 9px - Standar Bengkel)</option>
                <option value="8.5px">8.5px (Sedikit Lebih Kecil)</option>
                <option value="8px">8px (Kecil Rapat)</option>
                <option value="7.5px">7.5px (Sangat Kecil)</option>
                <option value="7px">7px (Mikro)</option>
                <option value="10px">10px (Sedang)</option>
                <option value="11px">11px (Besar)</option>
              </select>
            </div>
          </div>

          {/* Row 3: Posisi Cetak Alignment & Scale Printer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                Posisi Teks (Alignment):
              </label>
              <div className="flex gap-2">
                {[
                  { label: 'Rata Tengah (Tengah Struk)', value: 'center' },
                  { label: 'Rata Kiri', value: 'left' },
                ].map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, printAlign: a.value as 'left' | 'center', leftMarginMm: '0mm' })
                    }
                    className={`flex-1 py-2.5 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                      (formData.printAlign || 'center') === a.value
                        ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                Skala Cetak (Print Scale):
              </label>
              <div className="flex gap-2">
                {[
                  { label: '90% (Fix 90%)', value: '90%' },
                  { label: '85%', value: '85%' },
                  { label: '100% (Normal)', value: '100%' },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, printScale: s.value })}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                      (formData.printScale || '90%') === s.value
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                Default Rate Komisi Mekanik (%):
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.defaultLaborCommission === 0 ? '' : formData.defaultLaborCommission}
                placeholder="0"
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  setFormData({ ...formData, defaultLaborCommission: e.target.value === '' ? 0 : Number(e.target.value) })
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                Pesan Header Nota Struk:
              </label>
              <input
                type="text"
                value={formData.headerMessage}
                onChange={(e) => setFormData({ ...formData, headerMessage: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">
              Pesan Footer Struk (Syarat Garansi / Ucapan):
            </label>
            <textarea
              rows={2}
              value={formData.footerMessage}
              onChange={(e) => setFormData({ ...formData, footerMessage: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
            ></textarea>
          </div>
        </div>

        {/* Section 3: User Accounts & Firebase RBAC Management */}
        <UserManagementSection
          users={userList}
          currentUser={currentUser}
          onRefreshUsers={() => onUpdateUsers(userList)}
        />

        {/* Section 3B: Database Backup & Restore */}
        <BackupRestoreSection
          currentUser={currentUser}
          onDataRestored={() => onSyncAllToCloud?.()}
          onClearTransactions={onClearTransactions}
        />

        {/* Section 3C: Security Audit Trail */}
        {isAdmin && (
          <AuditLogSection currentUser={currentUser} />
        )}

        {/* Section 4: Service Labor Settings (Pengaturan Jasa Servis) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-slate-800 text-base">
                  Pengaturan Jasa Servis & Tarif Bengkel
                </h3>
                <span className="text-[10px] bg-orange-100 text-orange-700 font-extrabold px-2 py-0.5 rounded-full border border-orange-200">
                  {laborList.length} Item
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Kelola daftar pekerjaan & tarif jasa servis preset yang digunakan mekanik saat membuat SPK / nota servis.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetLaborDefaults}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-colors"
              title="Reset ke daftar jasa standar awal"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Reset ke Standar
            </button>
          </div>

          {/* Toast / Alert inside section */}
          {laborAlert && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                laborAlert.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {laborAlert.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{laborAlert.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setLaborAlert(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Form Add / Edit Jasa Servis */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              editingLaborId
                ? 'bg-orange-50/70 border-orange-300 ring-1 ring-orange-300'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
                {editingLaborId ? (
                  <>
                    <Edit3 className="w-4 h-4 text-orange-600" />
                    Edit Jasa Servis #{editingLaborId}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-orange-600" />
                    Tambah Jasa Servis Baru
                  </>
                )}
              </h4>

              {editingLaborId && (
                <button
                  type="button"
                  onClick={handleCancelLaborEdit}
                  className="text-xs text-slate-500 hover:text-slate-700 underline font-bold cursor-pointer"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Nama Jasa / Pekerjaan Servis <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={laborForm.name}
                  onChange={(e) => setLaborForm({ ...laborForm, name: e.target.value })}
                  placeholder="Contoh: Servis CVT & Ganti Gemuk"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Tarif Jasa (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={laborForm.price}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setLaborForm({
                      ...laborForm,
                      price: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                  placeholder="45000"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Kategori Pekerjaan <span className="text-[10px] text-orange-600 font-bold">(Pilih / "Lainnya" Ketik Manual)</span>
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={laborForm.category}
                      onChange={(e) => setLaborForm({ ...laborForm, category: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
                    >
                      {allCategoryOptions.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="Lainnya">➕ Lainnya (Ketik Manual...)</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleAddOrUpdateLabor}
                      className={`px-4 py-2 rounded-lg font-bold text-xs text-white shrink-0 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                        editingLaborId
                          ? 'bg-orange-600 hover:bg-orange-700'
                          : 'bg-slate-900 hover:bg-slate-800'
                      }`}
                    >
                      {editingLaborId ? (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          Simpan
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          Tambah
                        </>
                      )}
                    </button>
                  </div>

                  {laborForm.category === 'Lainnya' && (
                    <div className="p-2.5 bg-orange-50/90 border border-orange-300 rounded-lg space-y-1">
                      <label className="text-[10px] font-extrabold text-orange-800 block">
                        Ketik Kategori Pekerjaan Baru:
                      </label>
                      <input
                        type="text"
                        value={laborForm.customCategory}
                        onChange={(e) => setLaborForm({ ...laborForm, customCategory: e.target.value })}
                        placeholder="Contoh: Tune Up Injeksi, Las Knalpot, Coating..."
                        className="w-full bg-white border border-orange-300 rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      <p className="text-[9.5px] text-orange-700 font-medium">
                        *Kategori baru akan otomatis tersimpan & muncul di daftar pilihan selanjutnya.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Search & Category Filter Toolbar */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row gap-2 justify-between items-center">
              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={laborSearch}
                  onChange={(e) => setLaborSearch(e.target.value)}
                  placeholder="Cari nama atau kategori..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                />
                {laborSearch && (
                  <button
                    type="button"
                    onClick={() => setLaborSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-500 font-medium self-end sm:self-auto">
                Menampilkan <strong>{filteredLabors.length}</strong> dari <strong>{laborList.length}</strong> jenis jasa
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {laborCategories.map((cat) => {
                const count =
                  cat === 'Semua'
                    ? laborList.length
                    : laborList.filter((l) => l.category === cat).length;
                if (count === 0 && cat !== 'Semua') return null;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedLaborCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 text-[11px] ${
                      selectedLaborCategory === cat
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                        selectedLaborCategory === cat
                          ? 'bg-slate-700 text-slate-100'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* List of Labor Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredLabors.length === 0 ? (
              <div className="md:col-span-2 py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                Tidak ada data jasa servis yang cocok dengan pencarian / filter.
              </div>
            ) : (
              filteredLabors.map((item) => {
                const isEditingThis = editingLaborId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isEditingThis
                        ? 'bg-orange-50 border-orange-400 ring-1 ring-orange-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                          {item.category || 'Servis Rutin'}
                        </span>
                      </div>
                      <h5 className="font-bold text-slate-800 text-xs truncate" title={item.name}>
                        {item.name}
                      </h5>
                      <p className="text-xs font-extrabold text-orange-600 font-mono mt-0.5">
                        {formatRupiah(item.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditLaborClick(item)}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isEditingThis
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-orange-100 hover:text-orange-700'
                        }`}
                        title="Edit Pekerjaan Ini"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteLabor(item.id, item.name)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-700 text-xs transition-all cursor-pointer"
                        title="Hapus Pekerjaan Ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section 5: Employee Management (Kelola Data Pegawai & Mekanik) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-slate-800 text-base">
                  Daftar & Edit Data Pegawai / Mekanik
                </h3>
                <span className="text-[10px] bg-orange-100 text-orange-700 font-extrabold px-2 py-0.5 rounded-full border border-orange-200">
                  {employees.length} Orang
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Kelola nama, jabatan, nomor HP, gaji pokok harian, dan persen komisi mekanik bengkel.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleOpenEmpModalSettings()}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Tambah Karyawan Baru
            </button>
          </div>

          {/* Filter / Search Employee */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={empSearchSettings}
                onChange={(e) => setEmpSearchSettings(e.target.value)}
                placeholder="Cari nama pegawai atau No. HP..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-orange-500"
              />
              {empSearchSettings && (
                <button
                  type="button"
                  onClick={() => setEmpSearchSettings('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Table list of employees */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Nama Pegawai</th>
                  <th className="py-2.5 px-3">Jabatan</th>
                  <th className="py-2.5 px-3">No. HP</th>
                  <th className="py-2.5 px-3 text-right">Gaji Pokok / Hari</th>
                  <th className="py-2.5 px-3 text-center">Komisi %</th>
                  <th className="py-2.5 px-3">Info Rekening</th>
                  <th className="py-2.5 px-3 text-center">Aksi Pegawai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {employees
                  .filter((emp) => {
                    if (!empSearchSettings.trim()) return true;
                    const q = empSearchSettings.toLowerCase();
                    return (
                      emp.name.toLowerCase().includes(q) ||
                      (emp.phone && emp.phone.toLowerCase().includes(q)) ||
                      emp.role.toLowerCase().includes(q)
                    );
                  })
                  .map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-extrabold text-slate-800">{emp.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                          {emp.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{emp.phone || '-'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        {formatRupiah(emp.dailyBaseSalary)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-orange-600">
                        {emp.commissionRateLabor}%
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 italic">{emp.bankInfo || '-'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEmpModalSettings(emp)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 text-slate-700 hover:text-orange-600 font-bold text-[11px] flex items-center gap-1 border border-slate-200 cursor-pointer transition-colors"
                            title="Edit Data Pegawai"
                          >
                            <Edit2 className="w-3 h-3 text-orange-500" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEmpSettings(emp.id, emp.name)}
                            className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold text-[11px] flex items-center gap-1 border border-red-200 cursor-pointer transition-colors"
                            title="Hapus Pegawai"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Edit / Tambah Pegawai di Settings */}
        {isEmpModalOpenSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-md w-full text-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <h3 className="font-bold text-slate-100 text-base">
                  {editingEmpSettings ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEmpModalOpenSettings(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEmpSettings} className="p-5 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Nama Lengkap Karyawan <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Mas Agus Purwanto"
                    value={empFormSettings.name}
                    onChange={(e) => setEmpFormSettings({ ...empFormSettings, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                      No. Handphone:
                    </label>
                    <input
                      type="text"
                      placeholder="0812-xxxx"
                      value={empFormSettings.phone}
                      onChange={(e) => setEmpFormSettings({ ...empFormSettings, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                      Jabatan:
                    </label>
                    <select
                      value={empFormSettings.role}
                      onChange={(e) => setEmpFormSettings({ ...empFormSettings, role: e.target.value as Employee['role'] })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-amber-400"
                    >
                      <option value="Mekanik Senior">Mekanik Senior</option>
                      <option value="Mekanik Junior">Mekanik Junior</option>
                      <option value="Kasir">Kasir</option>
                      <option value="Kepala Bengkel">Kepala Bengkel</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                      Gaji Pokok / Hari (Rp):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={empFormSettings.dailyBaseSalary === 0 ? '' : empFormSettings.dailyBaseSalary}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEmpFormSettings({ ...empFormSettings, dailyBaseSalary: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                      Persen Komisi Jasa (%):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={empFormSettings.commissionRateLabor === 0 ? '' : empFormSettings.commissionRateLabor}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setEmpFormSettings({ ...empFormSettings, commissionRateLabor: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Info Rekening Bank (Opsional):
                  </label>
                  <input
                    type="text"
                    placeholder="BCA 142098877 a/n Agus"
                    value={empFormSettings.bankInfo}
                    onChange={(e) => setEmpFormSettings({ ...empFormSettings, bankInfo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  {editingEmpSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteEmpSettings(editingEmpSettings.id, editingEmpSettings.name);
                        setIsEmpModalOpenSettings(false);
                      }}
                      className="px-3 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold text-xs border border-red-500/40 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEmpModalOpenSettings(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    {editingEmpSettings ? 'Simpan Perubahan' : 'Simpan Karyawan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        {/* Section 6: Cloud Database Synchronization */}
        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-xl text-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                  Sinkronisasi Cloud Firestore & Akses Online
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Realtime Active
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Database terhubung langsung ke Cloud Firestore. Siap digunakan online di Vercel, GitHub, maupun perangkat manapun secara real-time.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                disabled={isTestingConn}
                onClick={handleTestConnection}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Periksa konektivitas langsung ke Firebase Firestore"
              >
                {isTestingConn ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                    <span>Menguji Ping...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tes Koneksi Firestore</span>
                  </>
                )}
              </button>

              {onSyncAllToCloud && (
                <button
                  type="button"
                  disabled={isSyncingCloud}
                  onClick={handleTriggerCloudSync}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer transition-all"
                >
                  {isSyncingCloud ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sedang Menyinkronkan...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Unggah Semua Data ke Cloud
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Test Connection Result Alert */}
          {testConnResult && (
            <div
              className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                testConnResult.success
                  ? 'bg-emerald-950/80 border border-emerald-600 text-emerald-300'
                  : 'bg-red-950/80 border border-red-600 text-red-300'
              }`}
            >
              {testConnResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{testConnResult.message}</span>
            </div>
          )}

          {cloudSyncResult && (
            <div
              className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                cloudSyncResult.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-600 text-emerald-300'
                  : 'bg-red-950/80 border border-red-600 text-red-300'
              }`}
            >
              {cloudSyncResult.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{cloudSyncResult.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-orange-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Database Firestore
              </span>
              <p className="text-[11px] font-mono text-slate-400 truncate" title={firestoreDbId}>
                ID: {firestoreDbId}
              </p>
              <p className="text-[10px] text-slate-500">Project: {firebaseConfig.projectId}</p>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Siap Online & Vercel
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Terkonfigurasi dengan SPA rewrite (<code className="text-orange-300">vercel.json</code>). Refresh halaman di Vercel tidak akan 404.
              </p>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" /> Akses Multi-Device
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Dapat dibuka di HP, Tablet kasir, maupun laptop admin dengan pembaruan data otomatis detik per detik.
              </p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  'Apakah Anda yakin ingin mereset seluruh data aplikasi ke sampel bawaan Bengkel Motor Joyoboyo Yuwanain Arso II?'
                )
              ) {
                onResetData();
              }
            }}
            className="px-4 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Seluruh Data Ke bawaan Demo
          </button>

          <button
            type="submit"
            className="px-8 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            Simpan Pengaturan Bengkel
          </button>
        </div>
      </form>

      {/* Live Test Thermal Print Modal */}
      <ThermalPrintModal
        isOpen={showTestThermalModal}
        onClose={() => setShowTestThermalModal(false)}
        settings={formData}
        order={dummyTestOrder}
        type="RECEIPT"
      />
    </div>
  );
};
