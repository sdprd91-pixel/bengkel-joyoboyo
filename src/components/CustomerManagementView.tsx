import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Wrench,
  Send,
  Download,
  FileText,
  Clock,
  ChevronRight,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  MessageSquare,
  Sparkles,
  Store,
  Tag,
  ShoppingCart,
  Building2,
} from 'lucide-react';
import { Customer, CustomerVehicle, ServiceOrder, ShopSettings, WholesaleCustomer } from '../types';
import {
  formatDateIndo,
  formatRupiah,
  getWholesaleCustomers,
  saveSingleWholesaleCustomer,
  deleteWholesaleCustomer as removeWholesaleCustomer,
  saveSingleServiceOrder,
} from '../lib/storage';
import { generateCustomerHistoryPDF } from '../lib/pdfGenerator';

interface CustomerManagementViewProps {
  customers: Customer[];
  orders: ServiceOrder[];
  settings: ShopSettings;
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  wholesaleCustomers?: WholesaleCustomer[];
  onSaveWholesaleCustomer?: (customer: WholesaleCustomer) => void;
  onDeleteWholesaleCustomer?: (id: string) => void;
  onOpenWholesaleSale?: (customer: WholesaleCustomer) => void;
  onSaveOrder?: (order: ServiceOrder) => void;
}

export const CustomerManagementView: React.FC<CustomerManagementViewProps> = ({
  customers,
  orders,
  settings,
  onSaveCustomer,
  onDeleteCustomer,
  wholesaleCustomers: propWholesaleCustomers,
  onSaveWholesaleCustomer: propOnSaveWholesaleCustomer,
  onDeleteWholesaleCustomer: propOnDeleteWholesaleCustomer,
  onOpenWholesaleSale,
  onSaveOrder,
}) => {
  // Main Sub-Tab Mode: 'REGULAR' (Pelanggan Servis Motor) vs 'WHOLESALE' (Daftar Langganan Grosir) vs 'GROSIR_TEMPO' (Grosir Tempo & Piutang)
  const [activeSubTab, setActiveSubTab] = useState<'REGULAR' | 'WHOLESALE' | 'GROSIR_TEMPO'>('REGULAR');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'SEMUA' | 'DUE_REMINDER' | 'LOYAL'>('SEMUA');

  // Customer Detail / History Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [historyVehicleFilter, setHistoryVehicleFilter] = useState<string>('ALL');

  // Add/Edit Regular Customer Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Regular Form Fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formVehicles, setFormVehicles] = useState<CustomerVehicle[]>([
    { plateNumber: '', motorModel: '' },
  ]);

  // --- Wholesale Customers Local State ---
  const [wholesaleList, setWholesaleList] = useState<WholesaleCustomer[]>(() => {
    return propWholesaleCustomers || getWholesaleCustomers();
  });

  useEffect(() => {
    if (propWholesaleCustomers) {
      setWholesaleList(propWholesaleCustomers);
    }
  }, [propWholesaleCustomers]);

  const refreshWholesaleList = () => {
    setWholesaleList(getWholesaleCustomers());
  };

  // Add/Edit Wholesale Customer Modal State
  const [isWholesaleFormOpen, setIsWholesaleFormOpen] = useState(false);
  const [editingWholesale, setEditingWholesale] = useState<WholesaleCustomer | null>(null);

  // Wholesale Form Fields
  const [wName, setWName] = useState('');
  const [wContact, setWContact] = useState('');
  const [wPhone, setWPhone] = useState('');
  const [wAddress, setWAddress] = useState('');
  const [wDiscount, setWDiscount] = useState<number>(0);
  const [wNotes, setWNotes] = useState('');

  // Message Reminder Dispatch Modal
  const [reminderModalCustomer, setReminderModalCustomer] = useState<Customer | null>(null);
  const [reminderVehicle, setReminderVehicle] = useState<CustomerVehicle | null>(null);
  const [reminderChannel, setReminderChannel] = useState<'WHATSAPP' | 'EMAIL' | 'SMS'>('WHATSAPP');
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderSentAlert, setReminderSentAlert] = useState(false);

  // --- Grosir Tempo / Credit Management State ---
  const [tempoFilter, setTempoFilter] = useState<'SEMUA' | 'JATUH_TEMPO' | 'BELUM_LUNAS' | 'LUNAS'>('SEMUA');
  const [editingDueDateOrder, setEditingDueDateOrder] = useState<ServiceOrder | null>(null);
  const [newDueDate, setNewDueDate] = useState<string>('');

  const [payingTempoOrder, setPayingTempoOrder] = useState<ServiceOrder | null>(null);
  const [tempoPaymentAmount, setTempoPaymentAmount] = useState<number>(0);
  const [tempoPaymentMethod, setTempoPaymentMethod] = useState<'TUNAI' | 'TRANSFER' | 'QRIS' | 'DEBIT'>('TUNAI');
  const [tempoPaymentNotes, setTempoPaymentNotes] = useState<string>('');

  // Handle Save New Due Date
  const handleSaveDueDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDueDateOrder || !newDueDate) return;

    const updatedOrder: ServiceOrder = {
      ...editingDueDateOrder,
      dueDate: newDueDate,
      updatedAt: new Date().toISOString(),
    };

    saveSingleServiceOrder(updatedOrder);
    onSaveOrder?.(updatedOrder);
    setEditingDueDateOrder(null);
    alert(`Tanggal jatuh tempo untuk nota ${updatedOrder.id} berhasil diperbarui!`);
  };

  // Handle Save Tempo Payment
  const handleSaveTempoPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingTempoOrder || tempoPaymentAmount <= 0) {
      alert('Masukkan nominal pembayaran yang valid!');
      return;
    }

    const currentPaid = payingTempoOrder.paidAmount || 0;
    const newPaidAmount = currentPaid + tempoPaymentAmount;
    const isFullyPaid = newPaidAmount >= payingTempoOrder.totalAmount;

    const updatedOrder: ServiceOrder = {
      ...payingTempoOrder,
      paidAmount: newPaidAmount,
      changeAmount: isFullyPaid ? Math.max(0, newPaidAmount - payingTempoOrder.totalAmount) : 0,
      paymentStatus: isFullyPaid ? 'LUNAS' : 'BELUM',
      status: isFullyPaid ? 'LUNAS' : payingTempoOrder.status,
      completedAt: isFullyPaid ? new Date().toISOString() : payingTempoOrder.completedAt,
      paymentMethod: tempoPaymentMethod,
      notes: `${payingTempoOrder.notes || ''} [Pelunasan Rp ${tempoPaymentAmount.toLocaleString('id-ID')} via ${tempoPaymentMethod}${
        tempoPaymentNotes ? ` - ${tempoPaymentNotes}` : ''
      }]`.trim(),
      updatedAt: new Date().toISOString(),
    };

    saveSingleServiceOrder(updatedOrder);
    onSaveOrder?.(updatedOrder);
    setPayingTempoOrder(null);
    alert(
      isFullyPaid
        ? `Pembayaran berhasil disetor! Status nota ${updatedOrder.id} sekarang LUNAS.`
        : `Pembayaran cicilan/DP sebesar ${formatRupiah(tempoPaymentAmount)} berhasil dicatat.`
    );
  };

  // Send WhatsApp Reminder for Grosir Tempo
  const handleSendTempoWA = (ord: ServiceOrder) => {
    let phone = ord.customerPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    }

    const remaining = ord.totalAmount - (ord.paidAmount || 0);
    const dueStr = ord.dueDate ? formatDateIndo(ord.dueDate) : 'Segera';

    let text = `*Yth. ${ord.customerName}*\n\n`;
    text += `Semoga sehat selalu. Kami dari *${settings.shopName}* menginfokan rincian transaksi Grosir Tempo / Kredit piutang sebagai berikut:\n\n`;
    text += `• *No Nota:* ${ord.id}\n`;
    text += `• *Tanggal Transaksi:* ${formatDateIndo(ord.createdAt)}\n`;
    text += `• *Total Transaksi:* ${formatRupiah(ord.totalAmount)}\n`;
    text += `• *Sudah Dibayar:* ${formatRupiah(ord.paidAmount || 0)}\n`;
    text += `• *SISA PIUTANG TEMPO:* *${formatRupiah(remaining)}*\n`;
    text += `• *Jatuh Tempo:* ${dueStr}\n\n`;
    text += `Mohon dapat dilakukan pelunasan melalui Transfer Rekening atau Tunai di toko/bengkel kami.\n`;
    text += `Hubungi/WA: ${settings.phone} (${settings.shopName})\n\n`;
    text += `Terima kasih banyak atas kerjasamanya! 🙏`;

    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank');
  };

  // Filter Regular Customers
  const filteredCustomers = customers.filter((cust) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      cust.name.toLowerCase().includes(term) ||
      cust.phone.includes(term) ||
      (cust.email && cust.email.toLowerCase().includes(term)) ||
      cust.vehicles.some(
        (v) =>
          v.plateNumber.toLowerCase().includes(term) || v.motorModel.toLowerCase().includes(term)
      );

    if (!matchesSearch) return false;

    if (filterType === 'DUE_REMINDER') {
      const now = Date.now();
      return cust.vehicles.some((v) => {
        if (!v.nextServiceDueDate) return true;
        return new Date(v.nextServiceDueDate).getTime() <= now + 5 * 24 * 60 * 60 * 1000;
      });
    }

    if (filterType === 'LOYAL') {
      return cust.totalVisits >= 3;
    }

    return true;
  });

  // Filter Wholesale Customers
  const filteredWholesale = wholesaleList.filter((w) => {
    const term = searchTerm.toLowerCase().trim();
    return (
      w.name.toLowerCase().includes(term) ||
      w.phone.includes(term) ||
      (w.contactPerson && w.contactPerson.toLowerCase().includes(term)) ||
      (w.address && w.address.toLowerCase().includes(term))
    );
  });

  // Handlers for Add/Edit Regular Customer
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormNotes('');
    setFormVehicles([{ plateNumber: '', motorModel: '' }]);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormName(cust.name);
    setFormPhone(cust.phone);
    setFormEmail(cust.email || '');
    setFormAddress(cust.address || '');
    setFormNotes(cust.notes || '');
    setFormVehicles(cust.vehicles.length > 0 ? cust.vehicles : [{ plateNumber: '', motorModel: '' }]);
    setIsFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      alert('Nama dan Nomor HP pelanggan wajib diisi!');
      return;
    }

    const cleanVehicles = formVehicles.filter(
      (v) => v.plateNumber.trim() !== '' || v.motorModel.trim() !== ''
    );

    const updatedCust: Customer = {
      id: editingCustomer ? editingCustomer.id : `CUST-${Date.now().toString().slice(-4)}`,
      name: formName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim(),
      address: formAddress.trim(),
      notes: formNotes.trim(),
      vehicles: cleanVehicles,
      totalVisits: editingCustomer ? editingCustomer.totalVisits : 0,
      totalSpent: editingCustomer ? editingCustomer.totalSpent : 0,
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString(),
    };

    onSaveCustomer(updatedCust);
    setIsFormOpen(false);
  };

  // Handlers for Wholesale Customer CRUD
  const handleOpenAddWholesale = () => {
    setEditingWholesale(null);
    setWName('');
    setWContact('');
    setWPhone('');
    setWAddress('');
    setWDiscount(0);
    setWNotes('');
    setIsWholesaleFormOpen(true);
  };

  const handleOpenEditWholesale = (item: WholesaleCustomer) => {
    setEditingWholesale(item);
    setWName(item.name);
    setWContact(item.contactPerson || '');
    setWPhone(item.phone);
    setWAddress(item.address || '');
    setWDiscount(item.discountPercent || 0);
    setWNotes(item.notes || '');
    setIsWholesaleFormOpen(true);
  };

  const handleSaveWholesaleForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wName.trim() || !wPhone.trim()) {
      alert('Nama Toko/Langganan Grosir dan No. HP/WA wajib diisi!');
      return;
    }

    const updatedWholesale: WholesaleCustomer = {
      id: editingWholesale ? editingWholesale.id : `GSR-${Date.now().toString().slice(-4)}`,
      name: wName.trim(),
      contactPerson: wContact.trim() || undefined,
      phone: wPhone.trim(),
      address: wAddress.trim() || undefined,
      discountPercent: Number(wDiscount) || 0,
      notes: wNotes.trim() || undefined,
      createdAt: editingWholesale ? editingWholesale.createdAt : new Date().toISOString(),
    };

    if (propOnSaveWholesaleCustomer) {
      propOnSaveWholesaleCustomer(updatedWholesale);
    } else {
      saveSingleWholesaleCustomer(updatedWholesale);
      refreshWholesaleList();
    }
    setIsWholesaleFormOpen(false);
  };

  const handleDeleteWholesaleItem = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus langganan grosir "${name}"?`)) {
      if (propOnDeleteWholesaleCustomer) {
        propOnDeleteWholesaleCustomer(id);
      } else {
        removeWholesaleCustomer(id);
        refreshWholesaleList();
      }
    }
  };

  // Open Service Reminder Trigger Modal
  const handleOpenReminderModal = (cust: Customer, vehicle?: CustomerVehicle) => {
    const targetVehicle = vehicle || cust.vehicles[0];
    setReminderModalCustomer(cust);
    setReminderVehicle(targetVehicle);
    setReminderChannel('WHATSAPP');
    setReminderSentAlert(false);

    const defaultMsg = `Halo Yth. Bp/Ibu ${cust.name},\n\nKami dari *${settings.shopName}* ingin mengingatkan bahwa sepeda motor *${targetVehicle ? targetVehicle.motorModel : 'Anda'} (${targetVehicle ? targetVehicle.plateNumber : ''})* sudah waktunya untuk servis berkala / ganti oli.\n\nNikmati layanan servis cepat, garansi 7 hari, dan pengecekan injeksi gratis di bengkel kami.\n\nAlamat: ${settings.address}\nTelp/WA: ${settings.phone}\n\nTerima kasih, salam sehat di jalan!`;
    setReminderMessage(defaultMsg);
  };

  const handleSendReminder = () => {
    if (!reminderModalCustomer) return;

    if (reminderChannel === 'WHATSAPP') {
      const cleanPhone = reminderModalCustomer.phone.replace(/[^0-9]/g, '');
      const formattedPhone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;
      const encoded = encodeURIComponent(reminderMessage);
      window.open(`https://wa.me/${formattedPhone}?text=${encoded}`, '_blank');
    }

    setReminderSentAlert(true);
    setTimeout(() => {
      setReminderSentAlert(false);
      setReminderModalCustomer(null);
    }, 2000);
  };

  // Compute Stats
  const totalCustomers = customers.length;
  const dueRemindersCount = customers.filter((c) =>
    c.vehicles.some(
      (v) =>
        v.nextServiceDueDate &&
        new Date(v.nextServiceDueDate).getTime() <= Date.now() + 5 * 24 * 60 * 60 * 1000
    )
  ).length;
  const totalVehicles = customers.reduce((acc, c) => acc + c.vehicles.length, 0);

  // Compute Grosir Tempo Data
  const todayStr = new Date().toISOString().split('T')[0];

  const allTempoOrders = orders.filter((o) => {
    const isUnpaid = o.paymentStatus === 'BELUM' || (o.paidAmount || 0) < o.totalAmount;
    const hasDueDate = Boolean(o.dueDate);
    const isGrosirOrder =
      o.complaint?.toLowerCase().includes('grosir') ||
      o.plateNumber?.includes('GROSIR') ||
      o.motorModel?.toLowerCase().includes('grosir');
    return isUnpaid || hasDueDate || isGrosirOrder;
  });

  const unpaidTempoOrders = allTempoOrders.filter((o) => (o.paidAmount || 0) < o.totalAmount);

  const totalTempoBalance = unpaidTempoOrders.reduce(
    (acc, o) => acc + (o.totalAmount - (o.paidAmount || 0)),
    0
  );

  const overdueCount = unpaidTempoOrders.filter((o) => o.dueDate && o.dueDate < todayStr).length;

  const filteredTempoOrders = allTempoOrders.filter((ord) => {
    const term = searchTerm.toLowerCase().trim();
    const matchSearch =
      ord.customerName.toLowerCase().includes(term) ||
      ord.customerPhone.includes(term) ||
      ord.id.toLowerCase().includes(term);

    if (!matchSearch) return false;

    const remaining = ord.totalAmount - (ord.paidAmount || 0);

    if (tempoFilter === 'JATUH_TEMPO') {
      return remaining > 0 && ord.dueDate && ord.dueDate <= todayStr;
    }
    if (tempoFilter === 'BELUM_LUNAS') {
      return remaining > 0;
    }
    if (tempoFilter === 'LUNAS') {
      return remaining <= 0;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1E293B] p-5 rounded-xl border border-slate-700 shadow-sm text-white">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-400" />
            Manajemen Pelanggan & Langganan Grosir
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Kelola data pelanggan servis motor & daftar langganan grosir sparepart untuk toko/bengkel mitra.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'REGULAR' ? (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Tambah Pelanggan Baru
            </button>
          ) : (
            <button
              onClick={handleOpenAddWholesale}
              className="px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Tambah Langganan Grosir
            </button>
          )}
        </div>
      </div>

      {/* Primary Sub-Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('REGULAR')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'REGULAR'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className={`w-4 h-4 ${activeSubTab === 'REGULAR' ? 'text-orange-400' : 'text-slate-400'}`} />
          Pelanggan Servis Motor
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeSubTab === 'REGULAR' ? 'bg-orange-500/30 text-orange-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {totalCustomers}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('WHOLESALE')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'WHOLESALE'
              ? 'bg-purple-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Store className={`w-4 h-4 ${activeSubTab === 'WHOLESALE' ? 'text-purple-300' : 'text-slate-400'}`} />
          Daftar Langganan Grosir
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeSubTab === 'WHOLESALE' ? 'bg-purple-500/30 text-purple-200' : 'bg-purple-50 text-purple-700'
            }`}
          >
            {wholesaleList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('GROSIR_TEMPO')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'GROSIR_TEMPO'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className={`w-4 h-4 ${activeSubTab === 'GROSIR_TEMPO' ? 'text-amber-200' : 'text-slate-400'}`} />
          Grosir Tempo & Piutang
          {unpaidTempoOrders.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeSubTab === 'GROSIR_TEMPO'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}
            >
              {unpaidTempoOrders.length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'REGULAR' ? (
        <>
          {/* Stats Summary Cards for Regular */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Total Pelanggan Terdaftar</span>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalCustomers} Orang</p>
              </div>
              <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Waktunya Servis Berkala</span>
                <p className="text-2xl font-bold text-orange-600 mt-0.5">{dueRemindersCount} Motor</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                <Calendar className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Total Unit Motor Terdata</span>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalVehicles} Unit</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Wrench className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari nama, No. HP, plat nomor, atau model motor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-orange-500 focus:bg-white text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
              {(
                [
                  { key: 'SEMUA', label: 'Semua Pelanggan' },
                  { key: 'DUE_REMINDER', label: '⚠️ Perlu Reminder Servis' },
                  { key: 'LOYAL', label: '⭐ Pelanggan Setia (≥3x)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterType(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    filterType === tab.key
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Table List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-500" />
                Daftar Pelanggan ({filteredCustomers.length} Orang)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Nama Pelanggan & WA</th>
                    <th className="py-3.5 px-4">Kendaraan Terdaftar</th>
                    <th className="py-3.5 px-4 text-center">Total Servis</th>
                    <th className="py-3.5 px-4">Total Biaya</th>
                    <th className="py-3.5 px-4 text-center">Pengingat Servis</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Tidak ditemukan data pelanggan yang sesuai kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((cust) => {
                      return (
                        <tr key={cust.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 text-sm">{cust.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{cust.phone}</span>
                            </div>
                            {cust.address && (
                              <p className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5">
                                📍 {cust.address}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              {cust.vehicles.map((v, vIdx) => (
                                <div key={vIdx} className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-800">
                                    {v.plateNumber || 'No Plat'}
                                  </span>
                                  <span className="text-[11px] font-medium text-slate-700">
                                    {v.motorModel}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                            <span className="px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full border border-orange-200">
                              {cust.totalVisits} Kunjungan
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {formatRupiah(cust.totalSpent)}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleOpenReminderModal(cust)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" /> Kirim Reminder
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedCustomer(cust);
                                  setHistoryVehicleFilter('ALL');
                                }}
                                className="p-1.5 rounded bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 transition-colors cursor-pointer"
                                title="Lihat Riwayat Servis Lengkap"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(cust)}
                                className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                                title="Edit Data Pelanggan"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Hapus pelanggan ${cust.name}?`)) onDeleteCustomer(cust.id);
                                }}
                                className="p-1.5 rounded bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 transition-colors cursor-pointer"
                                title="Hapus Pelanggan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeSubTab === 'WHOLESALE' ? (
        /* WHOLESALE CUSTOMERS SUB-TAB */
        <div className="space-y-4">
          {/* Wholesale Info Banner */}
          <div className="bg-purple-900/90 text-white p-4 rounded-xl border border-purple-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-purple-800 rounded-lg text-purple-200">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-purple-100">Daftar Langganan & Mitra Bengkel Grosir</h3>
                <p className="text-xs text-purple-200 mt-0.5">
                  Setiap langganan grosir berhak mendapatkan harga grosir sparepart (otomatis terpotong) saat transaksi penjualan barang.
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenAddWholesale}
              className="px-3.5 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah Langganan Baru
            </button>
          </div>

          {/* Search Bar Wholesale */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari nama toko, penanggung jawab, No HP, atau alamat langganan grosir..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-purple-500 focus:bg-white text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Wholesale Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWholesale.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                Belum ada data langganan grosir yang sesuai pencarian.
              </div>
            ) : (
              filteredWholesale.map((w) => (
                <div
                  key={w.id}
                  className="bg-white rounded-xl border border-purple-100 hover:border-purple-300 shadow-xs hover:shadow-md transition-all p-4 flex flex-col justify-between space-y-3 relative group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded border border-purple-200">
                            {w.id}
                          </span>
                          {w.discountPercent && w.discountPercent > 0 ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                              Diskon {w.discountPercent}%
                            </span>
                          ) : null}
                        </div>
                        <h4 className="font-bold text-slate-900 text-base mt-1 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-purple-600" />
                          {w.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditWholesale(w)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors cursor-pointer"
                          title="Edit Langganan Grosir"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteWholesaleItem(w.id, w.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Hapus / Kurangi Langganan Grosir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600">
                      {w.contactPerson && (
                        <p className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-semibold text-[11px]">Penanggung Jawab:</span>
                          <strong className="text-slate-800">{w.contactPerson}</strong>
                        </p>
                      )}
                      <p className="flex items-center gap-1.5 font-mono">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-bold text-slate-800">{w.phone}</span>
                      </p>
                      {w.address && (
                        <p className="text-[11px] text-slate-500 truncate">
                          📍 {w.address}
                        </p>
                      )}
                      {w.notes && (
                        <div className="p-2 bg-purple-50/60 rounded-lg text-[11px] text-purple-900 font-medium border border-purple-100 mt-1">
                          💬 {w.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <a
                      href={`https://wa.me/${w.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(
                        `Halo ${w.name}, salam dari ${settings.shopName}. Kami siap melayani pemesanan sparepart grosir!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Send className="w-3 h-3" /> WA Langganan
                    </a>

                    {onOpenWholesaleSale && (
                      <button
                        onClick={() => onOpenWholesaleSale(w)}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <ShoppingCart className="w-3 h-3" /> Transaksi Grosir
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* --- Grosir Tempo & Tagihan Piutang View --- */
        <div className="space-y-6">
          {/* Header Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Total Sisa Piutang Tempo</span>
                <p className="text-2xl font-extrabold text-red-600 mt-0.5">
                  {formatRupiah(totalTempoBalance)}
                </p>
              </div>
              <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Jatuh Tempo / Menunggak</span>
                <p className="text-2xl font-extrabold text-amber-600 mt-0.5">{overdueCount} Nota</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">Total Transaksi Tempo</span>
                <p className="text-2xl font-extrabold text-purple-900 mt-0.5">
                  {allTempoOrders.length} Nota
                </p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-700 rounded-lg">
                <FileText className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama pelanggan, no hp, atau no nota..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
              {(
                [
                  { key: 'SEMUA', label: 'Semua Status' },
                  { key: 'JATUH_TEMPO', label: '⚠️ Menunggak / Jatuh Tempo' },
                  { key: 'BELUM_LUNAS', label: '⏳ Belum Lunas' },
                  { key: 'LUNAS', label: '✅ Sudah Lunas' },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setTempoFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    tempoFilter === f.key
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table / List of Tempo Orders */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {filteredTempoOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                Tidak ada data transaksi Grosir Tempo yang sesuai dengan filter ini.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTempoOrders.map((ord) => {
                  const remaining = ord.totalAmount - (ord.paidAmount || 0);
                  const isFullyPaid = remaining <= 0;

                  // Due status calculation
                  let dueBadgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                  let dueText = 'Belum Diatur';

                  if (isFullyPaid) {
                    dueBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    dueText = 'LUNAS';
                  } else if (ord.dueDate) {
                    if (ord.dueDate < todayStr) {
                      const diffDays = Math.ceil(
                        (new Date(todayStr).getTime() - new Date(ord.dueDate).getTime()) /
                          (1000 * 3600 * 24)
                      );
                      dueBadgeColor = 'bg-red-100 text-red-800 border-red-300 animate-pulse';
                      dueText = `⚠️ Terlambat ${diffDays} Hari (${formatDateIndo(ord.dueDate)})`;
                    } else if (ord.dueDate === todayStr) {
                      dueBadgeColor = 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold';
                      dueText = `⚠️ Jatuh Tempo Hari Ini! (${formatDateIndo(ord.dueDate)})`;
                    } else {
                      const diffDays = Math.ceil(
                        (new Date(ord.dueDate).getTime() - new Date(todayStr).getTime()) /
                          (1000 * 3600 * 24)
                      );
                      dueBadgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
                      dueText = `⏳ Sisa ${diffDays} Hari (${formatDateIndo(ord.dueDate)})`;
                    }
                  }

                  return (
                    <div key={ord.id} className="p-4 hover:bg-slate-50/80 transition-colors space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 font-mono font-black text-xs">
                            {ord.id}
                          </span>
                          <span className="font-extrabold text-slate-900 text-sm">
                            {ord.customerName}
                          </span>
                          <span className="font-mono text-xs text-slate-500">
                            ({ord.customerPhone || '-'})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${dueBadgeColor}`}
                          >
                            {dueText}
                          </span>
                        </div>
                      </div>

                      {/* Detail row */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Tanggal Transaksi</span>
                          <span className="font-semibold text-slate-800">
                            {formatDateIndo(ord.createdAt)}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[10px]">Total Belanja</span>
                          <span className="font-mono font-bold text-slate-900">
                            {formatRupiah(ord.totalAmount)}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[10px]">Sudah Dibayar (DP/Cicil)</span>
                          <span className="font-mono font-bold text-emerald-700">
                            {formatRupiah(ord.paidAmount || 0)}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block text-[10px]">SISA PIUTANG TEMPO</span>
                          <span
                            className={`font-mono font-black text-sm ${
                              remaining > 0 ? 'text-red-600' : 'text-emerald-600'
                            }`}
                          >
                            {formatRupiah(remaining)}
                          </span>
                        </div>
                      </div>

                      {/* Items list preview */}
                      {ord.parts && ord.parts.length > 0 && (
                        <p className="text-[11px] text-slate-600">
                          <strong>Barang Grosir:</strong>{' '}
                          {ord.parts.map((p) => `${p.name} (x${p.qty})`).join(', ')}
                        </p>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => {
                            setEditingDueDateOrder(ord);
                            setNewDueDate(ord.dueDate || todayStr);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200 cursor-pointer transition-colors"
                        >
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          Ubah Tanggal Tempo
                        </button>

                        {!isFullyPaid && (
                          <button
                            onClick={() => {
                              setPayingTempoOrder(ord);
                              setTempoPaymentAmount(remaining);
                              setTempoPaymentNotes('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Bayar / Pelunasan
                          </button>
                        )}

                        <button
                          onClick={() => handleSendTempoWA(ord)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Kirim Notifikasi WA
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Customer Profile & Service History Log Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 bg-[#1E293B] text-white flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-orange-400" />
                  Riwayat Servis Pelanggan: {selectedCustomer.name}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 font-mono">
                  No. HP: {selectedCustomer.phone} | Alamat: {selectedCustomer.address || '-'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateCustomerHistoryPDF(settings, selectedCustomer, orders)}
                  className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export PDF
                </button>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Vehicles Registered Cards */}
              <div>
                <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">
                  Kendaraan Terdaftar ({selectedCustomer.vehicles.length} Unit)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedCustomer.vehicles.map((v, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-white text-xs">
                          {v.plateNumber}
                        </span>
                        <h5 className="font-bold text-slate-800 text-xs mt-1">{v.motorModel}</h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Servis Terakhir: {v.lastServiceDate ? formatDateIndo(v.lastServiceDate) : '-'}
                        </p>
                      </div>

                      <button
                        onClick={() => handleOpenReminderModal(selectedCustomer, v)}
                        className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Kirim Pesan Pengingat Servis"
                      >
                        <Send className="w-3.5 h-3.5" /> Reminder
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Service History Timeline Filter & Table */}
              <div className="border-t border-slate-200 pt-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    Timeline Riwayat Pengerjaan Servis & Sparepart
                  </h4>

                  {/* Filter by vehicle */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-semibold">Filter Motor:</span>
                    <select
                      value={historyVehicleFilter}
                      onChange={(e) => setHistoryVehicleFilter(e.target.value)}
                      className="bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="ALL">Semua Motor</option>
                      {selectedCustomer.vehicles.map((v, vIdx) => (
                        <option key={vIdx} value={v.plateNumber}>
                          {v.plateNumber} - {v.motorModel}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Table */}
                {(() => {
                  const custOrders = orders.filter((o) => {
                    const matchCustomer =
                      o.customerPhone === selectedCustomer.phone ||
                      o.customerName.toLowerCase() === selectedCustomer.name.toLowerCase();
                    if (!matchCustomer) return false;
                    if (historyVehicleFilter !== 'ALL') {
                      return o.plateNumber.toUpperCase() === historyVehicleFilter.toUpperCase();
                    }
                    return true;
                  });

                  if (custOrders.length === 0) {
                    return (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                        Belum ada riwayat pengerjaan servis tercatat untuk filter ini.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {custOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded">
                                {ord.id}
                              </span>
                              <span className="font-mono font-bold text-orange-600 text-xs">
                                {ord.plateNumber}
                              </span>
                              <span className="text-xs font-medium text-slate-700">
                                ({ord.motorModel})
                              </span>
                            </div>

                            <span className="text-[11px] text-slate-500 font-medium">
                              {formatDateIndo(ord.createdAt)}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600">
                            <strong>Keluhan:</strong> {ord.complaint}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <div>
                              <strong className="text-slate-700 block mb-1">Jasa Perbaikan:</strong>
                              <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                                {ord.labors.map((l, lIdx) => (
                                  <li key={lIdx}>
                                    {l.name} ({formatRupiah(l.price)})
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <strong className="text-slate-700 block mb-1">Sparepart Diganti:</strong>
                              {ord.parts.length === 0 ? (
                                <span className="text-[11px] text-slate-400 italic">
                                  Tidak ada penggantian sparepart
                                </span>
                              ) : (
                                <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                                  {ord.parts.map((p, pIdx) => (
                                    <li key={pIdx}>
                                      {p.name} x{p.qty} ({formatRupiah(p.sellPrice)})
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs text-slate-500">
                              Mekanik: <strong>{ord.mechanicName}</strong>
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              Total: {formatRupiah(ord.totalAmount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Add / Edit Customer Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#1E293B] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-400" />
                {editingCustomer ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama Lengkap Pelanggan *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Misal: Pak Hendro Wibowo"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    No. WhatsApp / HP *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="0812-3456-7890"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email (Opsional)</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="pelanggan@gmail.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Alamat Domisili</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Jl. Pemuda No. 12, Juwana, Pati"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Registered Vehicles input list */}
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Daftar Motor Pelanggan</label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormVehicles([...formVehicles, { plateNumber: '', motorModel: '' }])
                    }
                    className="text-[11px] font-bold text-orange-600 hover:underline cursor-pointer"
                  >
                    + Tambah Unit Motor
                  </button>
                </div>

                {formVehicles.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Plat (e.g. K 4821 YW)"
                      value={v.plateNumber}
                      onChange={(e) => {
                        const copy = [...formVehicles];
                        copy[idx].plateNumber = e.target.value;
                        setFormVehicles(copy);
                      }}
                      className="w-1/3 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold uppercase"
                    />
                    <input
                      type="text"
                      placeholder="Model Motor (e.g. Vario 150 Esp)"
                      value={v.motorModel}
                      onChange={(e) => {
                        const copy = [...formVehicles];
                        copy[idx].motorModel = e.target.value;
                        setFormVehicles(copy);
                      }}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Add / Edit Wholesale Customer Form Modal */}
      {isWholesaleFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-purple-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Store className="w-4 h-4 text-purple-300" />
                {editingWholesale ? 'Edit Langganan Grosir' : 'Tambah Langganan Grosir Baru'}
              </h3>
              <button
                onClick={() => setIsWholesaleFormOpen(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWholesaleForm} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama Toko / Bengkel / Langganan Grosir *
                </label>
                <input
                  type="text"
                  required
                  value={wName}
                  onChange={(e) => setWName(e.target.value)}
                  placeholder="Misal: Toko Motor Sentosa (Arso I)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nama Penanggung Jawab
                  </label>
                  <input
                    type="text"
                    value={wContact}
                    onChange={(e) => setWContact(e.target.value)}
                    placeholder="Misal: Pak Sentosa"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    No. HP / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={wPhone}
                    onChange={(e) => setWPhone(e.target.value)}
                    placeholder="0813-9876-5432"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Alamat Toko/Bengkel</label>
                  <input
                    type="text"
                    value={wAddress}
                    onChange={(e) => setWAddress(e.target.value)}
                    placeholder="Jl. Poros Utama Arso I"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-purple-700 block mb-1">Diskon Khusus (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={wDiscount === 0 ? '' : wDiscount}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setWDiscount(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full bg-purple-50 border border-purple-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-purple-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Catatan / Jenis Langganan</label>
                <textarea
                  rows={3}
                  value={wNotes}
                  onChange={(e) => setWNotes(e.target.value)}
                  placeholder="Pengambilan grosir oli, ban, dan sparepart injeksi rutin per minggu..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWholesaleFormOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Simpan Langganan Grosir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Send Service Reminder Message Modal */}
      {reminderModalCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-[#1E293B] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-orange-400" />
                Kirim Pengingat Servis Rutin
              </h3>
              <button
                onClick={() => setReminderModalCustomer(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {reminderSentAlert ? (
                <div className="p-6 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-slate-800 text-base">Notifikasi Berhasil Dikirim!</h4>
                  <p className="text-xs text-slate-500">
                    Pesan reminder servis telah diteruskan ke WhatsApp / SMS pelanggan.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                    <p>
                      Penerima: <strong>{reminderModalCustomer.name}</strong> ({reminderModalCustomer.phone})
                    </p>
                    <p>
                      Motor: <strong>{reminderVehicle?.motorModel}</strong> ({reminderVehicle?.plateNumber})
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Saluran Media:</label>
                    <div className="flex gap-2">
                      {(
                        [
                          { key: 'WHATSAPP', label: 'WhatsApp (1-Click)' },
                          { key: 'SMS', label: 'SMS / Email' },
                        ] as const
                      ).map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setReminderChannel(c.key)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                            reminderChannel === c.key
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Draf Pesan Pengingat:</label>
                    <textarea
                      rows={6}
                      value={reminderMessage}
                      onChange={(e) => setReminderMessage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
                    ></textarea>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => setReminderModalCustomer(null)}
                      className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSendReminder}
                      className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Kirim Sekarang
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Edit Due Date Modal */}
      {editingDueDateOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                Atur Tanggal Jatuh Tempo
              </h3>
              <button
                onClick={() => setEditingDueDateOrder(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDueDate} className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                <p>
                  <strong>No. Nota:</strong> {editingDueDateOrder.id}
                </p>
                <p>
                  <strong>Pelanggan:</strong> {editingDueDateOrder.customerName}
                </p>
                <p>
                  <strong>Sisa Tagihan:</strong>{' '}
                  <span className="font-bold text-red-600">
                    {formatRupiah(editingDueDateOrder.totalAmount - (editingDueDateOrder.paidAmount || 0))}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Pilih Tanggal Jatuh Tempo Baru *
                </label>
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDueDateOrder(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
                >
                  Simpan Tanggal Tempo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Pay / Settle Tempo Order Modal */}
      {payingTempoOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                Catat Pelunasan / Cicilan Tempo
              </h3>
              <button
                onClick={() => setPayingTempoOrder(null)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTempoPayment} className="p-5 space-y-4">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <p>
                  <strong>No. Nota:</strong> {payingTempoOrder.id}
                </p>
                <p>
                  <strong>Pelanggan:</strong> {payingTempoOrder.customerName} (
                  {payingTempoOrder.customerPhone})
                </p>
                <p>
                  <strong>Total Belanja:</strong> {formatRupiah(payingTempoOrder.totalAmount)}
                </p>
                <p>
                  <strong>Sudah Dibayar:</strong> {formatRupiah(payingTempoOrder.paidAmount || 0)}
                </p>
                <p className="pt-1 border-t border-emerald-200 text-sm font-black text-red-700">
                  Sisa Harus Dibayar:{' '}
                  {formatRupiah(payingTempoOrder.totalAmount - (payingTempoOrder.paidAmount || 0))}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Nominal Setoran Pembayaran (Rp) *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setTempoPaymentAmount(
                        payingTempoOrder.totalAmount - (payingTempoOrder.paidAmount || 0)
                      )
                    }
                    className="text-[11px] text-emerald-600 font-bold hover:underline cursor-pointer"
                  >
                    Pelunasan Pas
                  </button>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={tempoPaymentAmount ? tempoPaymentAmount.toLocaleString('id-ID') : ''}
                  placeholder="Masukkan jumlah uang bayar..."
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setTempoPaymentAmount(raw ? parseInt(raw, 10) : 0);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono text-sm text-slate-900 font-extrabold focus:outline-none focus:border-emerald-600"
                />

                {/* Quick Nominal Buttons */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[50000, 100000, 150000, 200000, 500000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTempoPaymentAmount(val)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer font-mono"
                    >
                      {val >= 1000 ? `${val / 1000}rb` : val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Metode Bayar:</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['TUNAI', 'TRANSFER', 'QRIS', 'DEBIT'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTempoPaymentMethod(m)}
                      className={`py-1.5 text-[10px] font-extrabold rounded-lg border cursor-pointer ${
                        tempoPaymentMethod === m
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catatan Pembayaran (Opsional):
                </label>
                <input
                  type="text"
                  value={tempoPaymentNotes}
                  onChange={(e) => setTempoPaymentNotes(e.target.value)}
                  placeholder="Misal: Titip kasir / Transfer via Bank BCA..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayingTempoOrder(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
                >
                  Simpan Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

