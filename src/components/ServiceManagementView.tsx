import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  Edit2,
  Trash2,
  DollarSign,
  Package,
  User,
  Phone,
  FileText,
  X,
  CreditCard,
  Check,
  AlertCircle,
  Tag,
  ArrowRight,
  ShoppingCart,
  Maximize2,
  Minimize2,
  Calendar,
  Archive,
  FolderArchive,
  RefreshCw,
  Info,
  CalendarDays,
  Layers,
  CalendarRange,
  Droplets,
  Sparkles,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import {
  Employee,
  PaymentMethod,
  PresetLabor,
  ServiceLaborItem,
  ServiceOrder,
  ServiceSparepartItem,
  ServiceStatus,
  ShopSettings,
  Sparepart,
  WholesaleCustomer,
} from '../types';
import { formatDateIndo, formatRupiah, getArchivedServiceOrders, forceArchiveCurrentOrders, ProcessReturnInput, ProcessReturnResult, processOrderReturn } from '../lib/storage';
import { DirectSparepartSaleModal } from './DirectSparepartSaleModal';
import { ReturnSparepartModal } from './ReturnSparepartModal';

interface ServiceManagementViewProps {
  orders: ServiceOrder[];
  spareparts: Sparepart[];
  employees: Employee[];
  presetLabors: PresetLabor[];
  settings: ShopSettings;
  onSaveOrder: (order: ServiceOrder) => void;
  onDeleteOrder: (id: string) => void;
  onPrintOrder: (order: ServiceOrder, type?: 'RECEIPT' | 'WORK_ORDER') => void;
  onProcessReturn?: (input: ProcessReturnInput) => Promise<ProcessReturnResult> | ProcessReturnResult;
  initialCreateOpen?: boolean;
  initialDirectSaleOpen?: boolean;
  onRefreshOrders?: () => void;
  wholesaleCustomerForDirectSale?: WholesaleCustomer | null;
  onClearWholesaleCustomerForDirectSale?: () => void;
}

export const ServiceManagementView: React.FC<ServiceManagementViewProps> = ({
  orders,
  spareparts,
  employees,
  presetLabors,
  settings,
  onSaveOrder,
  onDeleteOrder,
  onPrintOrder,
  onProcessReturn,
  initialCreateOpen = false,
  initialDirectSaleOpen = false,
  onRefreshOrders,
  wholesaleCustomerForDirectSale,
  onClearWholesaleCustomerForDirectSale,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('SEMUA');

  // Period Filter States (Pencarian Harian, Bulanan, Tahunan)
  const [periodType, setPeriodType] = useState<'SEMUA' | 'HARIAN' | 'BULANAN' | 'TAHUNAN'>('SEMUA');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().substring(0, 7));
  const [selectedYear, setSelectedYear] = useState<string>(() => new Date().getFullYear().toString());
  const [dataScope, setDataScope] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');

  // Archive States
  const [archivedOrders, setArchivedOrders] = useState<ServiceOrder[]>(() => getArchivedServiceOrders());
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [archiveAlert, setArchiveAlert] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Return Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnModalOrder, setReturnModalOrder] = useState<ServiceOrder | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(initialCreateOpen);
  const [isServiceModalMaximized, setIsServiceModalMaximized] = useState(false);
  const [isDirectSaleOpen, setIsDirectSaleOpen] = useState(initialDirectSaleOpen);

  useEffect(() => {
    if (initialCreateOpen) {
      handleOpenCreateModal();
    }
  }, [initialCreateOpen]);

  useEffect(() => {
    if (initialDirectSaleOpen) {
      setIsDirectSaleOpen(true);
    }
  }, [initialDirectSaleOpen]);

  useEffect(() => {
    if (wholesaleCustomerForDirectSale) {
      setIsDirectSaleOpen(true);
    }
  }, [wholesaleCustomerForDirectSale]);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);

  // Form State for Service Order
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [motorModel, setMotorModel] = useState('');
  const [complaint, setComplaint] = useState('');
  const [mechanicId, setMechanicId] = useState('');
  const [status, setStatus] = useState<ServiceStatus>('MENUNGGU');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  // Service Labors & Parts in Form
  const [selectedLabors, setSelectedLabors] = useState<ServiceLaborItem[]>([]);
  const [selectedParts, setSelectedParts] = useState<ServiceSparepartItem[]>([]);

  // Search & Filter States inside Service Form Modal
  const [laborSearchQuery, setLaborSearchQuery] = useState('');
  const [showCustomLaborModal, setShowCustomLaborModal] = useState(false);
  const [customLaborName, setCustomLaborName] = useState('');
  const [customLaborPrice, setCustomLaborPrice] = useState<number | ''>('');

  const [partSearchQuery, setPartSearchQuery] = useState('');
  const [partCategoryFilter, setPartCategoryFilter] = useState<string>('Semua');

  // Checkout Payment Modal State
  const [checkoutOrder, setCheckoutOrder] = useState<ServiceOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TUNAI');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Mechanics Filter
  const mechanics = employees.filter((e) => e.status === 'Aktif' && e.role.includes('Mekanik'));

  // Reset Form
  const resetForm = () => {
    setEditingOrder(null);
    setCustomerName('');
    setCustomerPhone('');
    setPlateNumber('');
    setMotorModel('');
    setComplaint('');
    setMechanicId(mechanics[0]?.id || '');
    setStatus('MENUNGGU');
    setDiscount(0);
    setNotes('');
    setSelectedLabors([]);
    setSelectedParts([]);
    setLaborSearchQuery('');
    setPartSearchQuery('');
    setPartCategoryFilter('Semua');
    setShowCustomLaborModal(false);
    setCustomLaborName('');
    setCustomLaborPrice('');
  };

  const handleOpenCreateModal = () => {
    resetForm();
    if (mechanics.length > 0) {
      setMechanicId(mechanics[0].id);
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (order: ServiceOrder) => {
    setEditingOrder(order);
    setCustomerName(order.customerName);
    setCustomerPhone(order.customerPhone);
    setPlateNumber(order.plateNumber);
    setMotorModel(order.motorModel);
    setComplaint(order.complaint);
    setMechanicId(order.mechanicId);
    setStatus(order.status);
    setDiscount(order.discount || 0);
    setNotes(order.notes || '');
    setSelectedLabors([...order.labors]);
    setSelectedParts([...order.parts]);
    setLaborSearchQuery('');
    setPartSearchQuery('');
    setPartCategoryFilter('Semua');
    setShowCustomLaborModal(false);
    setIsModalOpen(true);
  };

  // Add Labor to Form
  const handleAddLabor = (preset: PresetLabor) => {
    const newItem: ServiceLaborItem = {
      id: 'LAB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: preset.name,
      price: preset.price,
    };
    setSelectedLabors([...selectedLabors, newItem]);
  };

  const handleAddCustomLabor = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customLaborName.trim()) {
      alert('Mohon masukkan nama jasa servis!');
      return;
    }
    const price = typeof customLaborPrice === 'number' ? customLaborPrice : 0;
    const newItem: ServiceLaborItem = {
      id: 'LAB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: customLaborName.trim(),
      price: price,
    };
    setSelectedLabors([...selectedLabors, newItem]);
    setCustomLaborName('');
    setCustomLaborPrice('');
    setShowCustomLaborModal(false);
  };

  const handleRemoveLabor = (id: string) => {
    setSelectedLabors(selectedLabors.filter((l) => l.id !== id));
  };

  // Filtered Labors & Parts for Modal Form
  const filteredPresetLabors = presetLabors.filter((p) => {
    if (!laborSearchQuery.trim()) return true;
    const q = laborSearchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.price.toString().includes(q) ||
      formatRupiah(p.price).toLowerCase().includes(q)
    );
  });

  const partCategories = [
    'Semua',
    'Oli & Pelumas',
    ...Array.from(
      new Set(
        spareparts
          .map((p) => p.category)
          .filter((cat) => Boolean(cat) && cat !== 'Oli & Pelumas')
      )
    ),
  ];

  const filteredSpareparts = spareparts.filter((sp) => {
    const matchesCategory =
      partCategoryFilter === 'Semua' || sp.category === partCategoryFilter;
    if (!matchesCategory) return false;

    if (!partSearchQuery.trim()) return true;
    const q = partSearchQuery.toLowerCase();
    return (
      sp.name.toLowerCase().includes(q) ||
      sp.code.toLowerCase().includes(q) ||
      sp.category.toLowerCase().includes(q) ||
      (sp.rackLocation && sp.rackLocation.toLowerCase().includes(q))
    );
  });

  // Add Part to Form
  const handleAddPart = (part: Sparepart) => {
    const existingIndex = selectedParts.findIndex((p) => p.partId === part.id);
    if (existingIndex >= 0) {
      const updated = [...selectedParts];
      if (updated[existingIndex].qty < part.stock) {
        updated[existingIndex].qty += 1;
        setSelectedParts(updated);
      } else {
        alert(`Stok ${part.name} hanya tersisa ${part.stock} ${part.unit}`);
      }
    } else {
      if (part.stock < 1) {
        alert(`Stok ${part.name} sedang habis!`);
        return;
      }
      setSelectedParts([
        ...selectedParts,
        {
          partId: part.id,
          code: part.code,
          name: part.name,
          qty: 1,
          sellPrice: part.sellPrice,
          buyPrice: part.buyPrice,
        },
      ]);
    }
  };

  const handleUpdatePartQty = (partId: string, delta: number) => {
    const partRef = spareparts.find((sp) => sp.id === partId);
    setSelectedParts(
      selectedParts
        .map((p) => {
          if (p.partId === partId) {
            const newQty = p.qty + delta;
            if (partRef && newQty > partRef.stock) {
              alert(`Stok tidak mencukupi. Maksimal ${partRef.stock}`);
              return p;
            }
            return { ...p, qty: newQty };
          }
          return p;
        })
        .filter((p) => p.qty > 0)
    );
  };

  // Calculations for Form
  const subtotalLabor = selectedLabors.reduce((acc, l) => acc + l.price, 0);
  const subtotalParts = selectedParts.reduce((acc, p) => acc + p.sellPrice * p.qty, 0);
  const grandTotal = Math.max(0, subtotalLabor + subtotalParts - discount);

  // Selected Mechanic Ref
  const selectedMechObj = employees.find((e) => e.id === mechanicId);
  const commissionPercent = selectedMechObj?.commissionRateLabor || settings.defaultLaborCommission || 25;
  const commissionAmount = Math.round((subtotalLabor * commissionPercent) / 100);

  // Submit Order Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!plateNumber.trim() || !customerName.trim()) {
      alert('Mohon isi Nama Pelanggan dan Plat Nomor Motor!');
      return;
    }

    const todayDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const orderId =
      editingOrder?.id || `SRV-${todayDate}-${Math.floor(100 + Math.random() * 900)}`;

    const newOrder: ServiceOrder = {
      id: orderId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || '-',
      plateNumber: plateNumber.trim().toUpperCase(),
      motorModel: motorModel.trim() || 'Motor Honda/Yamaha/Suzuki',
      complaint: complaint.trim(),
      mechanicId,
      mechanicName: selectedMechObj?.name || 'Mekanik Bengkel',
      status,
      createdAt: editingOrder ? editingOrder.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: status === 'LUNAS' || status === 'SELESAI' ? new Date().toISOString() : editingOrder?.completedAt,
      labors: selectedLabors,
      parts: selectedParts,
      subtotalLabor,
      subtotalParts,
      discount,
      totalAmount: grandTotal,
      paidAmount: editingOrder?.paidAmount || (status === 'LUNAS' ? grandTotal : 0),
      changeAmount: editingOrder?.changeAmount || 0,
      paymentMethod: editingOrder?.paymentMethod || 'TUNAI',
      paymentStatus: status === 'LUNAS' ? 'LUNAS' : 'BELUM',
      mechanicCommissionPercent: commissionPercent,
      mechanicCommissionAmount: commissionAmount,
      notes,
    };

    onSaveOrder(newOrder);
    setIsModalOpen(false);
    resetForm();
  };

  // Open Checkout Modal
  const handleOpenCheckout = (order: ServiceOrder) => {
    setCheckoutOrder(order);
    setPaidAmount(order.totalAmount);
    setPaymentMethod('TUNAI');
  };

  // Submit Checkout Payment
  const handleProcessCheckout = () => {
    if (!checkoutOrder) return;

    if (paidAmount < checkoutOrder.totalAmount) {
      alert('Nominal pembayaran kurang dari total tagihan!');
      return;
    }

    const change = paidAmount - checkoutOrder.totalAmount;

    const updatedOrder: ServiceOrder = {
      ...checkoutOrder,
      status: 'LUNAS',
      paymentStatus: 'LUNAS',
      paidAmount,
      changeAmount: change,
      paymentMethod,
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    onSaveOrder(updatedOrder);
    setCheckoutOrder(null);

    // Prompt thermal print automatically
    onPrintOrder(updatedOrder, 'RECEIPT');
  };

  // Quick Date Helpers
  const setQuickDateToday = () => {
    setSelectedDate(new Date().toISOString().substring(0, 10));
    setPeriodType('HARIAN');
  };

  const setQuickDateYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().substring(0, 10));
    setPeriodType('HARIAN');
  };

  const setQuickMonthCurrent = () => {
    setSelectedMonth(new Date().toISOString().substring(0, 7));
    setPeriodType('BULANAN');
  };

  const setQuickMonthPrevious = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    setSelectedMonth(d.toISOString().substring(0, 7));
    setPeriodType('BULANAN');
  };

  const setQuickYearCurrent = () => {
    setSelectedYear(new Date().getFullYear().toString());
    setPeriodType('TAHUNAN');
  };

  // Manual Archive Action
  const handleForceArchive = () => {
    const { active, archived } = forceArchiveCurrentOrders();
    setArchivedOrders(archived);
    setIsArchiveConfirmOpen(false);
    setArchiveAlert({
      message: 'Semua nota di list aktif berhasil dipindahkan ke Data Arsip dan list tampilan telah dikosongkan.',
      type: 'success',
    });
    if (onRefreshOrders) {
      onRefreshOrders();
    }
    setTimeout(() => setArchiveAlert(null), 5000);
  };

  // Combine Active Orders and Archived Orders
  const activeOrderIds = new Set(orders.map((o) => o.id));
  const uniqueArchivedOrders = archivedOrders.filter((a) => !activeOrderIds.has(a.id));

  let sourceOrdersList: (ServiceOrder & { isArchived?: boolean })[] = [];
  if (dataScope === 'ACTIVE') {
    sourceOrdersList = orders.map((o) => ({ ...o, isArchived: false }));
  } else if (dataScope === 'ARCHIVED') {
    sourceOrdersList = uniqueArchivedOrders.map((o) => ({ ...o, isArchived: true }));
  } else {
    sourceOrdersList = [
      ...orders.map((o) => ({ ...o, isArchived: false })),
      ...uniqueArchivedOrders.map((o) => ({ ...o, isArchived: true })),
    ];
  }

  // Filter Orders by Search, Status, and Period
  const filteredOrders = sourceOrdersList.filter((o) => {
    const matchSearch =
      o.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.motorModel.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === 'SEMUA' || o.status === statusFilter;

    const dateStr = o.createdAt || o.completedAt || '';
    let matchPeriod = true;

    if (periodType === 'HARIAN' && selectedDate) {
      matchPeriod = dateStr.substring(0, 10) === selectedDate;
    } else if (periodType === 'BULANAN' && selectedMonth) {
      matchPeriod = dateStr.substring(0, 7) === selectedMonth;
    } else if (periodType === 'TAHUNAN' && selectedYear) {
      matchPeriod = dateStr.substring(0, 4) === selectedYear;
    }

    return matchSearch && matchStatus && matchPeriod;
  });

  const totalFilteredRevenue = filteredOrders.reduce(
    (sum, o) => sum + (o.status !== 'BATAL' && o.paymentStatus === 'LUNAS' ? o.totalAmount : 0),
    0
  );
  const totalLunasCount = filteredOrders.filter((o) => o.status !== 'BATAL' && o.paymentStatus === 'LUNAS').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Alert Banner */}
      {archiveAlert && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{archiveAlert.message}</span>
          </div>
          <button onClick={() => setArchiveAlert(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1E293B] p-5 rounded-xl border border-slate-700 shadow-sm text-white">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-orange-400" />
            Manajemen Servis & Kasir Bengkel
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Daftarkan unit masuk, kelola pengerjaan mekanik, input sparepart & checkout kasir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsArchiveConfirmOpen(true)}
            className="px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
            title="Arsipkan nota list aktif & kosongkan tampilan"
          >
            <FolderArchive className="w-4 h-4 text-amber-400" />
            Arsipkan & Kosongkan List
          </button>

          <button
            onClick={() => setIsDirectSaleOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <ShoppingCart className="w-5 h-5" />
            Penjualan Sparepart Saja
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm flex items-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            Daftar Servis Baru
          </button>
        </div>
      </div>

      {/* Auto Archive Info & Status Badges */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-800">Sistem Pengarsipan Otomatis Setiap Tanggal 1</p>
            <p className="text-slate-600 mt-0.5">
              Setiap pergantian bulan (tanggal 1 berjalan), seluruh nota dari bulan sebelumnya otomatis diarsipkan ke <strong>Data Arsip</strong> dan list aktif dikosongkan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-800 font-bold text-[11px] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            List Aktif: {orders.length}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-800 font-bold text-[11px] flex items-center gap-1.5">
            <Archive className="w-3.5 h-3.5 text-purple-600" />
            Data Arsip: {archivedOrders.length}
          </span>
        </div>
      </div>

      {/* Filter & Period Search Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        {/* Row 1: Period Selection & Scope Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Period Type Selector */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0 mr-1">
              <Calendar className="w-4 h-4 text-orange-500" /> Periode:
            </span>
            <button
              type="button"
              onClick={() => setPeriodType('SEMUA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                periodType === 'SEMUA'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Periode
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('HARIAN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                periodType === 'HARIAN'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Harian (Tanggal)
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('BULANAN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                periodType === 'BULANAN'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Bulanan (Bulan)
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('TAHUNAN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                periodType === 'TAHUNAN'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tahunan (Tahun)
            </button>
          </div>

          {/* Data Scope Tabs (Sumber Data) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
            <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Sumber:
            </span>
            <button
              type="button"
              onClick={() => setDataScope('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                dataScope === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua (Aktif + Arsip)
            </button>
            <button
              type="button"
              onClick={() => setDataScope('ACTIVE')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                dataScope === 'ACTIVE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Aktif
            </button>
            <button
              type="button"
              onClick={() => setDataScope('ARCHIVED')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                dataScope === 'ARCHIVED'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Data Arsip
            </button>
          </div>
        </div>

        {/* Row 2: Dynamic Date Picker Inputs & Quick Selectors */}
        {periodType !== 'SEMUA' && (
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
            {periodType === 'HARIAN' && (
              <>
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <CalendarDays className="w-4 h-4 text-orange-500" /> Pilih Tanggal:
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-md px-3 py-1 font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={setQuickDateToday}
                  className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={setQuickDateYesterday}
                  className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer"
                >
                  Kemarin
                </button>
              </>
            )}

            {periodType === 'BULANAN' && (
              <>
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <CalendarRange className="w-4 h-4 text-orange-500" /> Pilih Bulan:
                </span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white border border-slate-300 rounded-md px-3 py-1 font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={setQuickMonthCurrent}
                  className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer"
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={setQuickMonthPrevious}
                  className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer"
                >
                  Bulan Lalu
                </button>
              </>
            )}

            {periodType === 'TAHUNAN' && (
              <>
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-orange-500" /> Pilih Tahun:
                </span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-white border border-slate-300 rounded-md px-3 py-1 font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                >
                  {['2024', '2025', '2026', '2027', '2028'].map((y) => (
                    <option key={y} value={y}>
                      Tahun {y}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={setQuickYearCurrent}
                  className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer"
                >
                  Tahun Ini
                </button>
              </>
            )}
          </div>
        )}

        {/* Row 3: Search Input & Status Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-1">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Plat Nomor / Nama / Motor / No Nota..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none py-1">
            {['SEMUA', 'MENUNGGU', 'PROSES', 'SELESAI', 'LUNAS', 'BATAL'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? st === 'BATAL'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-orange-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {st === 'BATAL' ? 'BATAL / DIRETUR' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Results Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Menampilkan <strong>{filteredOrders.length}</strong> nota
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Lunas: <strong>{totalLunasCount}</strong> nota
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
            <span>Total Omset Periode:</span>
            <span>{formatRupiah(totalFilteredRevenue)}</span>
          </div>
        </div>
      </div>

      {/* Service Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Plat & Motor</th>
                <th className="py-3.5 px-4">Pelanggan</th>
                <th className="py-3.5 px-4">Keluhan & Catatan</th>
                <th className="py-3.5 px-4">Mekanik</th>
                <th className="py-3.5 px-4">Status & Waktu</th>
                <th className="py-3.5 px-4 text-right">Total Biaya</th>
                <th className="py-3.5 px-4 text-center">Aksi & Kasir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Wrench className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                    <p className="font-bold text-slate-600">Tidak ada data nota servis ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Coba ganti kata kunci pencarian, filter status, atau periode tanggal.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  let statusBadge = 'bg-slate-100 text-slate-600';
                  let statusLabel: string = order.status;
                  if (order.status === 'MENUNGGU') statusBadge = 'bg-yellow-100 text-yellow-700';
                  if (order.status === 'PROSES') statusBadge = 'bg-blue-100 text-blue-700';
                  if (order.status === 'SELESAI') statusBadge = 'bg-purple-100 text-purple-700';
                  if (order.status === 'LUNAS') statusBadge = 'bg-green-100 text-green-700';
                  if (order.status === 'BATAL') {
                    statusBadge = 'bg-red-100 text-red-700 border border-red-200';
                    statusLabel = 'BATAL / DIRETUR';
                  }

                  const isCancelled = order.status === 'BATAL';

                  return (
                    <tr key={order.id} className={`hover:bg-slate-50 transition-colors ${isCancelled ? 'bg-red-50/20 opacity-85' : ''}`}>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200 block w-fit">
                            {order.plateNumber}
                          </span>
                          {order.isArchived && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold border border-purple-200">
                              Arsip
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-slate-800">{order.motorModel}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{order.id}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{order.customerName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{order.customerPhone}</p>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-600 italic">
                          "{order.complaint || 'Servis rutin berkala'}"
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-1">
                          <span>Jasa: {order.labors.length}</span>
                          <span>• Part: {order.parts.length}</span>
                          {order.parts.some((p) => (p.returnedQty || 0) > 0) && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">
                              <RotateCcw className="w-2.5 h-2.5" />
                              Retur: {order.parts.reduce((a, b) => a + (b.returnedQty || 0), 0)} pcs
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {order.mechanicName}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusBadge}`}>
                          {statusLabel}
                        </span>
                        <p className="text-[10px] text-slate-500 font-mono mt-1">
                          {formatDateIndo(order.createdAt)}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        {isCancelled ? (
                          <div>
                            <span className="line-through text-slate-400 text-xs block">
                              {formatRupiah((order.totalAmount || 0) + (order.totalRefund || 0))}
                            </span>
                            <span className="font-bold text-xs text-red-600">
                              Rp 0 (Diretur)
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-sm text-orange-600 block">
                              {formatRupiah(order.totalAmount)}
                            </span>
                            {order.totalRefund && order.totalRefund > 0 ? (
                              <span className="text-[10px] text-amber-700 font-bold block">
                                Refund: -{formatRupiah(order.totalRefund)}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print Receipt / Work Order */}
                          <button
                            onClick={() => onPrintOrder(order, 'WORK_ORDER')}
                            title="Cetak Tiket Mekanik"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onPrintOrder(order, 'RECEIPT')}
                            title="Cetak Struk Kasir / Nota"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Retur Barang Button (Available if order has parts and not already 100% returned) */}
                          {order.parts && order.parts.length > 0 && !isCancelled && (
                            <button
                              onClick={() => {
                                setReturnModalOrder(order);
                                setIsReturnModalOpen(true);
                              }}
                              title="Retur Barang (Kembalikan ke Stok Inventaris)"
                              className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 hover:border-orange-300 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(order)}
                            title="Edit Data Servis"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-100 text-slate-700 hover:text-orange-600 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Checkout Button */}
                          {isCancelled ? (
                            <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                              BATAL
                            </span>
                          ) : order.paymentStatus !== 'LUNAS' ? (
                            <button
                              onClick={() => handleOpenCheckout(order)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-all cursor-pointer"
                            >
                              Bayar
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                              LUNAS
                            </span>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm(`Hapus nota servis ${order.id} (${order.plateNumber})?`)) {
                                onDeleteOrder(order.id);
                              }
                            }}
                            title="Hapus Nota"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
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

      {/* ========================================================= */}
      {/* MODAL: INPUT / EDIT SERVICE ORDER                         */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs transition-all duration-200 ${
          isServiceModalMaximized ? 'p-0' : 'p-3'
        } overflow-y-auto`}>
          <div className={`bg-slate-900 border border-slate-700 shadow-2xl text-slate-100 flex flex-col overflow-hidden transition-all duration-200 ${
            isServiceModalMaximized
              ? 'w-screen h-screen max-w-none max-h-none rounded-none border-none'
              : 'max-w-4xl w-full rounded-3xl my-auto'
          }`}>
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base">
                    {editingOrder ? 'Edit Data Servis & Part' : 'Pendaftaran Servis Motor Baru'}
                  </h3>
                  <p className="text-xs text-slate-400">Input rincian kendaraan, mekanik, jasa & sparepart</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Maximize / Minimize Button */}
                <button
                  type="button"
                  onClick={() => setIsServiceModalMaximized(!isServiceModalMaximized)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold px-3"
                  title={isServiceModalMaximized ? 'Tampilan Minimal / Ukuran Normal' : 'Tampilan Maksimal / Layar Penuh'}
                >
                  {isServiceModalMaximized ? (
                    <>
                      <Minimize2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Minimal</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Maksimal</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Tutup Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitForm} className={`p-5 space-y-6 overflow-y-auto ${
              isServiceModalMaximized ? 'flex-1 max-h-none' : 'max-h-[78vh]'
            }`}>
              {/* Row 1: Customer & Motor Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Nama Pelanggan <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pak Hendro"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    No. Handphone / WA
                  </label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Plat Nomor <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="K 4821 YW"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-amber-400 tracking-wider focus:outline-none focus:border-amber-500 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Tipe Motor / Tahun
                  </label>
                  <input
                    type="text"
                    placeholder="Honda Vario 150 Esp"
                    value={motorModel}
                    onChange={(e) => setMotorModel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Row 2: Complaint & Mechanic */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Keluhan / Permintaan Servis Pelanggan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Suara gredek CVT saat awal angkatan, rem belakang blong..."
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Pilih Mekanik Penanggung Jawab
                  </label>
                  <select
                    value={mechanicId}
                    onChange={(e) => setMechanicId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-amber-400 focus:outline-none focus:border-amber-500"
                  >
                    {mechanics.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role} - Komisi {m.commissionRateLabor}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Items Picker - Labors & Spareparts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Left Col: Labor Selection */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    {/* Header & Subtotal */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                      <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                        <Wrench className="w-4 h-4 text-amber-400" />
                        Jasa Servis ({selectedLabors.length})
                      </h4>
                      <span className="text-[11px] font-bold font-mono text-amber-400">
                        Subtotal: {formatRupiah(subtotalLabor)}
                      </span>
                    </div>

                    {/* Search Bar for Jasa Servis */}
                    <div className="mb-3 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Cari jasa servis (cth: CVT, Injeksi, Ganti Oli)..."
                            value={laborSearchQuery}
                            onChange={(e) => setLaborSearchQuery(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                          />
                          {laborSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setLaborSearchQuery('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
                              title="Hapus pencarian"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowCustomLaborModal(!showCustomLaborModal)}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                            showCustomLaborModal
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-amber-400'
                          }`}
                          title="Tambah jasa manual / kustom"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Jasa Manual</span>
                        </button>
                      </div>

                      {/* Inline Custom Labor Form */}
                      {showCustomLaborModal && (
                        <div className="p-3 bg-slate-900/90 border border-amber-500/40 rounded-xl space-y-2 animate-in fade-in duration-200">
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Tambah Jasa Kustom / Manual:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              placeholder="Nama Jasa (cth: Pasang Klakson Keong)"
                              value={customLaborName}
                              onChange={(e) => setCustomLaborName(e.target.value)}
                              className="sm:col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                            />
                            <input
                              type="number"
                              min={0}
                              placeholder="Biaya (Rp)"
                              value={customLaborPrice === '' ? '' : customLaborPrice}
                              onChange={(e) =>
                                setCustomLaborPrice(
                                  e.target.value === '' ? '' : Number(e.target.value)
                                )
                              }
                              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setShowCustomLaborModal(false);
                                setCustomLaborName('');
                                setCustomLaborPrice('');
                              }}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-slate-200"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={handleAddCustomLabor}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Tambahkan ke Nota
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Preset Labors Chips List */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] font-bold text-slate-400">
                          {laborSearchQuery ? (
                            <span>
                              Hasil Pencarian Preset:{' '}
                              <strong className="text-amber-400 font-mono">
                                {filteredPresetLabors.length}
                              </strong>
                            </span>
                          ) : (
                            'Pilih Preset Jasa Cepat:'
                          )}
                        </p>
                        {laborSearchQuery && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Kata kunci: "{laborSearchQuery}"
                          </span>
                        )}
                      </div>

                      {filteredPresetLabors.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 p-1 bg-slate-900/50 rounded-xl border border-slate-800/60">
                          {filteredPresetLabors.map((p) => (
                            <button
                              type="button"
                              key={p.id}
                              onClick={() => handleAddLabor(p)}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/50 text-slate-300 text-[11px] font-semibold border border-slate-800 transition-all text-left flex items-center gap-1.5 group cursor-pointer"
                              title={`Klik untuk menambahkan ${p.name}`}
                            >
                              <Plus className="w-3 h-3 text-amber-400 group-hover:scale-125 transition-transform" />
                              <span>{p.name}</span>
                              <span className="text-amber-400 font-mono text-[10px]">
                                ({formatRupiah(p.price)})
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs">
                          <p className="mb-1.5">Tidak ada preset jasa bernama "{laborSearchQuery}".</p>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomLaborName(laborSearchQuery);
                              setShowCustomLaborModal(true);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:underline"
                          >
                            <Plus className="w-3 h-3" /> Tambah "{laborSearchQuery}" sebagai Jasa Baru
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Selected Labors List in Order */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                        <span>Jasa Terpilih di Nota:</span>
                        <span className="text-slate-500">{selectedLabors.length} item</span>
                      </p>
                      {selectedLabors.length > 0 ? (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {selectedLabors.map((lab) => (
                            <div
                              key={lab.id}
                              className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-xs hover:border-slate-700 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                <span className="font-medium text-slate-200">{lab.name}</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono font-bold text-amber-400">
                                  {formatRupiah(lab.price)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLabor(lab.id)}
                                  className="text-slate-500 hover:text-red-400 p-0.5 transition-colors"
                                  title="Hapus jasa dari nota"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-2.5 text-center text-slate-500 text-[11px] italic bg-slate-900/30 rounded-xl border border-dashed border-slate-800/80">
                          Belum ada jasa servis yang ditambahkan
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Col: Spareparts & Oil Selection */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    {/* Header & Subtotal */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                      <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-emerald-400" />
                        Sparepart & Oli ({selectedParts.length})
                      </h4>
                      <span className="text-[11px] font-bold font-mono text-emerald-400">
                        Subtotal: {formatRupiah(subtotalParts)}
                      </span>
                    </div>

                    {/* Search Bar for Spareparts & Oil */}
                    <div className="mb-2.5">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Cari sparepart / oli (nama, kode, cth: MPX, Yamalube, Busi)..."
                          value={partSearchQuery}
                          onChange={(e) => setPartSearchQuery(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                        {partSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setPartSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
                            title="Hapus pencarian"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Category Filter Pills (with special badge for Oli & Pelumas) */}
                    <div className="mb-2.5">
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[10.5px]">
                        {partCategories.map((cat) => {
                          const isActive = partCategoryFilter === cat;
                          const isOil = cat === 'Oli & Pelumas';
                          return (
                            <button
                              type="button"
                              key={cat}
                              onClick={() => setPartCategoryFilter(cat)}
                              className={`px-2 py-0.5 rounded-lg font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                                isActive
                                  ? isOil
                                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                                    : 'bg-emerald-500 text-slate-950 shadow-xs'
                                  : isOil
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                              }`}
                            >
                              {isOil && <Droplets className="w-3 h-3" />}
                              <span>{cat}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Search Results / Inventory Items Picker List */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] font-bold text-slate-400">
                          Pilih Item ({filteredSpareparts.length} tersedia):
                        </p>
                        {partCategoryFilter !== 'Semua' && (
                          <span className="text-[10px] text-emerald-400 font-semibold">
                            Kategori: {partCategoryFilter}
                          </span>
                        )}
                      </div>

                      {filteredSpareparts.length > 0 ? (
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1 p-1 bg-slate-900/50 rounded-xl border border-slate-800/60">
                          {filteredSpareparts.map((sp) => {
                            const isOil = sp.category === 'Oli & Pelumas';
                            const isOutOfStock = sp.stock <= 0;
                            const isLowStock = sp.stock > 0 && sp.stock <= (sp.minStock || 3);
                            const alreadyInOrder = selectedParts.find(
                              (p) => p.partId === sp.id
                            );

                            return (
                              <div
                                key={sp.id}
                                className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${
                                  isOutOfStock
                                    ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                                    : alreadyInOrder
                                    ? 'bg-emerald-950/20 border-emerald-500/40'
                                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                                  <div
                                    className={`p-1.5 rounded-lg shrink-0 ${
                                      isOil
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : 'bg-emerald-500/20 text-emerald-400'
                                    }`}
                                  >
                                    {isOil ? (
                                      <Droplets className="w-3.5 h-3.5" />
                                    ) : (
                                      <Package className="w-3.5 h-3.5" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className="font-semibold text-slate-100 truncate text-[11.5px]">
                                        {sp.name}
                                      </p>
                                      {isOil && (
                                        <span className="text-[9px] font-bold px-1 py-0.2 rounded-sm bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                          OLI
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono truncate">
                                      {sp.code} {sp.rackLocation ? `• ${sp.rackLocation}` : ''}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="text-right">
                                    <p className="font-mono font-bold text-emerald-400 text-[11px]">
                                      {formatRupiah(sp.sellPrice)}
                                    </p>
                                    <p
                                      className={`text-[9.5px] font-mono font-bold ${
                                        isOutOfStock
                                          ? 'text-red-400'
                                          : isLowStock
                                          ? 'text-amber-400'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {isOutOfStock
                                        ? 'Habis'
                                        : `Stok: ${sp.stock} ${sp.unit}`}
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    disabled={isOutOfStock}
                                    onClick={() => handleAddPart(sp)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                      isOutOfStock
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : alreadyInOrder
                                        ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                                        : 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200'
                                    }`}
                                    title={
                                      isOutOfStock
                                        ? 'Stok habis'
                                        : `Tambah ${sp.name} ke nota`
                                    }
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>{alreadyInOrder ? `+1 (${alreadyInOrder.qty})` : 'Pilih'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs">
                          Tidak ditemukan sparepart atau oli sesuai filter "{partSearchQuery || partCategoryFilter}"
                        </div>
                      )}
                    </div>

                    {/* Selected Parts List in Order */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                        <span>Sparepart & Oli Terpilih di Nota:</span>
                        <span className="text-slate-500">{selectedParts.length} jenis</span>
                      </p>
                      {selectedParts.length > 0 ? (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {selectedParts.map((part) => (
                            <div
                              key={part.partId}
                              className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-xs hover:border-slate-700 transition-colors"
                            >
                              <div className="min-w-0 flex-1 mr-2">
                                <p className="font-semibold text-slate-200 truncate">{part.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {formatRupiah(part.sellPrice)} / {part.code}
                                </p>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <div className="flex items-center border border-slate-700 rounded-lg bg-slate-950 px-1 py-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePartQty(part.partId, -1)}
                                    className="px-1.5 font-bold hover:text-amber-400 text-slate-400 transition-colors"
                                    title="Kurangi jumlah"
                                  >
                                    -
                                  </button>
                                  <span className="px-2 font-mono font-bold text-slate-100">
                                    {part.qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePartQty(part.partId, 1)}
                                    className="px-1.5 font-bold hover:text-amber-400 text-slate-400 transition-colors"
                                    title="Tambah jumlah"
                                  >
                                    +
                                  </button>
                                </div>

                                <span className="font-mono font-bold text-emerald-400 min-w-[70px] text-right">
                                  {formatRupiah(part.sellPrice * part.qty)}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleUpdatePartQty(part.partId, -part.qty)}
                                  className="text-slate-500 hover:text-red-400 p-0.5 transition-colors"
                                  title="Hapus dari nota"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-2.5 text-center text-slate-500 text-[11px] italic bg-slate-900/30 rounded-xl border border-dashed border-slate-800/80">
                          Belum ada sparepart atau oli yang ditambahkan
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Row 4: Status, Discount & Total Summary Bar */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      Status Pengerjaan:
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ServiceStatus)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-400"
                    >
                      <option value="MENUNGGU">MENUNGGU (Antrean)</option>
                      <option value="PROSES">DALAM PROSES</option>
                      <option value="SELESAI">SELESAI</option>
                      <option value="LUNAS">LUNAS & DIAMBIL</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      Diskon / Potongan (Rp):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={discount === 0 ? '' : discount}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setDiscount(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-28 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-100"
                    />
                  </div>
                </div>

                <div className="text-right w-full sm:w-auto">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Grand Total Tagihan:
                  </span>
                  <span className="text-2xl font-black text-amber-400 font-mono">
                    {formatRupiah(grandTotal)}
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Est. Komisi Mekanik ({commissionPercent}%):{' '}
                    <strong className="text-slate-200">{formatRupiah(commissionAmount)}</strong>
                  </p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  {editingOrder ? 'Simpan Perubahan Servis' : 'Simpan & Daftarkan Servis'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CHECKOUT & PAYMENT                                 */}
      {/* ========================================================= */}
      {checkoutOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-md w-full text-slate-100 overflow-hidden">
            
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base">Pembayaran & Kasir</h3>
                  <p className="text-xs text-slate-400">Pilih metode & hitung kembalian</p>
                </div>
              </div>
              <button
                onClick={() => setCheckoutOrder(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Plat: {checkoutOrder.plateNumber} ({checkoutOrder.customerName})
                </span>
                <p className="text-3xl font-black text-amber-400 font-mono mt-1">
                  {formatRupiah(checkoutOrder.totalAmount)}
                </p>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1.5 block">
                  Metode Pembayaran:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['TUNAI', 'QRIS', 'TRANSFER', 'DEBIT'] as PaymentMethod[]).map((pm) => (
                    <button
                      type="button"
                      key={pm}
                      onClick={() => setPaymentMethod(pm)}
                      className={`p-2.5 rounded-xl font-bold text-xs border transition-all ${
                        paymentMethod === pm
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Paid Amount */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1.5 block">
                  Nominal Diterima (Uang Tunai / Transfer):
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={paidAmount ? paidAmount.toLocaleString('id-ID') : ''}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setPaidAmount(raw ? parseInt(raw, 10) : 0);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono font-black text-lg text-emerald-400 focus:outline-none focus:border-amber-500"
                />

                {/* Quick Cash Buttons */}
                <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                  {[checkoutOrder.totalAmount, 20000, 50000, 100000, 150000, 200000, 500000].map((nominal) => (
                    <button
                      key={nominal}
                      type="button"
                      onClick={() => setPaidAmount(nominal)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-bold font-mono transition-colors shrink-0 cursor-pointer"
                    >
                      {nominal === checkoutOrder.totalAmount
                        ? 'Uang Pas'
                        : nominal >= 1000
                        ? `${nominal / 1000}rb`
                        : formatRupiah(nominal)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Change Calculation */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400">Uang Kembalian:</span>
                <span className="font-mono font-black text-emerald-400 text-base">
                  {formatRupiah(Math.max(0, paidAmount - checkoutOrder.totalAmount))}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutOrder(null)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessCheckout}
                  className="w-2/3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  Proses Bayar & Cetak Struk
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Direct Sparepart Sale Modal */}
      <DirectSparepartSaleModal
        isOpen={isDirectSaleOpen}
        onClose={() => {
          setIsDirectSaleOpen(false);
          onClearWholesaleCustomerForDirectSale?.();
        }}
        spareparts={spareparts}
        settings={settings}
        preselectedWholesaleCustomer={wholesaleCustomerForDirectSale}
        onCompleteSale={(newOrder) => {
          onSaveOrder(newOrder);
          onPrintOrder(newOrder, 'RECEIPT');
        }}
      />

      {/* Return Sparepart Modal */}
      {isReturnModalOpen && returnModalOrder && (
        <ReturnSparepartModal
          isOpen={isReturnModalOpen}
          onClose={() => {
            setIsReturnModalOpen(false);
            setReturnModalOrder(null);
          }}
          order={returnModalOrder}
          spareparts={spareparts}
          settings={settings}
          onProcessReturn={async (input) => {
            if (onProcessReturn) {
              return await onProcessReturn(input);
            }
            return processOrderReturn(input);
          }}
        />
      )}

      {/* Manual Archive Confirmation Modal */}
      {isArchiveConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-500/20 text-amber-400">
                <FolderArchive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold">Konfirmasi Pengarsipan Nota</h3>
                <p className="text-xs text-slate-400 mt-0.5">Memindahkan list aktif ke Data Arsip</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              Apakah Anda yakin ingin memindahkan seluruh <strong>{orders.length} nota</strong> di list aktif saat ini ke <strong>Data Arsip</strong>? Tampilan list aktif akan dikosongkan.
              <br /><br />
              <span className="text-amber-400 font-semibold">
                * Catatan: Data yang diarsipkan tidak hilang dan dapat dicari/dilihat kembali kapan saja menggunakan filter "Data Arsip" atau "Semua (Aktif + Arsip)".
              </span>
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsArchiveConfirmOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleForceArchive}
                className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FolderArchive className="w-4 h-4" />
                Ya, Arsipkan List
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};
