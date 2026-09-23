import React from 'react';
import {
  Wrench,
  Package,
  Users,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Plus,
  Printer,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  Employee,
  ServiceOrder,
  ShopSettings,
  Sparepart,
} from '../types';
import { formatDateIndo, formatRupiah } from '../lib/storage';
import shopLogo from '../assets/images/joyoboyo_logo_1785722496730.jpg';

interface DashboardViewProps {
  orders: ServiceOrder[];
  spareparts: Sparepart[];
  employees: Employee[];
  settings: ShopSettings;
  onNewService: () => void;
  onNavigateTab: (tab: string) => void;
  onPrintOrder: (order: ServiceOrder, type?: 'RECEIPT' | 'WORK_ORDER') => void;
  onUpdateOrderStatus: (orderId: string, status: ServiceOrder['status']) => void;
  onRestockPart: (part: Sparepart) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  spareparts,
  employees,
  settings,
  onNewService,
  onNavigateTab,
  onPrintOrder,
  onUpdateOrderStatus,
  onRestockPart,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Filter Today's Orders (Active)
  const todayOrders = orders.filter(
    (o) => o.status !== 'BATAL' && o.createdAt && o.createdAt.startsWith(todayStr)
  );

  // Revenue Today (from LUNAS orders created or completed today, excluding BATAL)
  const todayRevenue = orders
    .filter((o) => o.status !== 'BATAL' && o.paymentStatus === 'LUNAS' && (o.updatedAt?.startsWith(todayStr) || o.createdAt?.startsWith(todayStr)))
    .reduce((acc, o) => acc + o.totalAmount, 0);

  // Today Mechanic Commissions
  const todayCommissions = orders
    .filter((o) => o.status !== 'BATAL' && o.paymentStatus === 'LUNAS' && (o.updatedAt?.startsWith(todayStr) || o.createdAt?.startsWith(todayStr)))
    .reduce((acc, o) => acc + (o.mechanicCommissionAmount || 0), 0);

  // Count active queues
  const queueOrders = orders.filter(
    (o) => o.status === 'MENUNGGU' || o.status === 'PROSES'
  );

  // Count completed
  const completedTodayCount = todayOrders.filter(
    (o) => o.status === 'SELESAI' || o.status === 'LUNAS'
  ).length;

  // Low Stock Items
  const lowStockParts = spareparts.filter((p) => p.stock <= p.minStock);

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome & Quick Info Banner */}
      <div className="bg-[#1E293B] p-5 sm:p-6 rounded-xl border border-slate-700 shadow-sm text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 border-2 border-orange-500/50 p-1 shadow-xl shrink-0 overflow-hidden">
            <img
              src={settings.logoUrl || shopLogo}
              alt={settings.shopName}
              className="w-full h-full object-cover rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-1 rounded-md bg-orange-500/20 text-orange-400 font-bold text-xs border border-orange-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                Bengkel Buka & Operasional
              </span>
              <span className="text-xs text-slate-300 flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
              Selamat Datang di <span className="text-orange-400">{settings.shopName}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Sistem manajemen servis motor, persediaan sparepart, komisi mekanik & cetak struk termal terpadu.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onNewService}
            className="px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Daftar Servis Baru
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Omzet Hari Ini</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 tracking-tight">
            {formatRupiah(todayRevenue)}
          </p>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-600 font-bold">{todayOrders.length} transaksi</span> lunas hari ini
          </p>
        </div>

        {/* Card 2: Active Service Queue */}
        <div
          onClick={() => onNavigateTab('services')}
          className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Antrean Servis</span>
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 tracking-tight">
            {queueOrders.length} <span className="text-sm font-normal text-slate-500">Unit</span>
          </p>
          <p className="text-xs text-slate-500 mt-2 flex items-center justify-between font-medium">
            <span>{completedTodayCount} selesai hari ini</span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
          </p>
        </div>

        {/* Card 3: Mechanic Commission Today */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Komisi Mekanik</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800 tracking-tight">
            {formatRupiah(todayCommissions)}
          </p>
          <p className="text-xs text-slate-500 mt-2 flex items-center justify-between font-medium">
            <span>{employees.filter((e) => e.role.includes('Mekanik')).length} Mekanik Bertugas</span>
            <span className="text-blue-600 font-bold text-[11px]">Auto Compute</span>
          </p>
        </div>

        {/* Card 4: Low Stock Alert with Theme's Red Accent Border */}
        <div
          onClick={() => onNavigateTab('spareparts')}
          className={`p-4 sm:p-5 rounded-xl border shadow-sm relative overflow-hidden group transition-all cursor-pointer bg-white ${
            lowStockParts.length > 0
              ? 'border-slate-200 border-l-4 border-l-red-500'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stok Kritis</span>
            <div
              className={`p-2 rounded-lg border ${
                lowStockParts.length > 0
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}
            >
              {lowStockParts.length > 0 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Package className="w-5 h-5" />
              )}
            </div>
          </div>
          <p
            className={`text-2xl font-bold tracking-tight ${
              lowStockParts.length > 0 ? 'text-red-600' : 'text-slate-800'
            }`}
          >
            {lowStockParts.length} <span className="text-sm font-normal text-slate-500">Item</span>
          </p>
          <p className="text-xs text-slate-500 mt-2 flex items-center justify-between font-medium">
            <span>
              {lowStockParts.length > 0
                ? 'Perlu re-stock segera'
                : 'Semua stok dalam aman'}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
          </p>
        </div>
      </div>

      {/* Main Grid Section: Queue & Low Stock Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Service Queue List (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Antrean Servis Hari Ini
                </h3>
                <p className="text-xs text-slate-500">
                  Update pengerjaan, tambah sparepart, atau cetak tiket pengerjaan
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('services')}
              className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1"
            >
              Lihat Semua ({orders.length})
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Queue Items */}
          {queueOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-500 my-auto">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500/60 mb-2" />
              <p className="text-sm font-bold text-slate-700">Tidak ada antrean pengerjaan aktif</p>
              <p className="text-xs text-slate-500 mt-1">
                Semua motor servis sudah selesai dikerjakan!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {queueOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-50/80 border border-slate-200/90 rounded-lg p-3.5 hover:bg-slate-100/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded text-xs border border-slate-200 shadow-2xs">
                        {order.plateNumber}
                      </span>
                      <span className="font-bold text-slate-800 text-sm">
                        {order.motorModel}
                      </span>
                      <span className="text-xs text-slate-500">
                        • {order.customerName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          order.status === 'PROSES'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-1 italic">
                      "{order.complaint || 'Servis berkala'}"
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                      <span>Mekanik: <strong className="text-slate-700">{order.mechanicName}</strong></span>
                      <span>Total: <strong className="text-orange-600">{formatRupiah(order.totalAmount)}</strong></span>
                      <span>Jam: {formatDateIndo(order.createdAt).split(',')[1] || '-'}</span>
                    </div>
                  </div>

                  {/* Actions & Status Changer */}
                  <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                    {/* Print Mech Ticket */}
                    <button
                      onClick={() => onPrintOrder(order, 'WORK_ORDER')}
                      title="Cetak Tiket Kerja Mekanik"
                      className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shadow-2xs"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {/* Quick Status Buttons */}
                    {order.status === 'MENUNGGU' && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'PROSES')}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                      >
                        Mulai Kerjakan
                      </button>
                    )}

                    {order.status === 'PROSES' && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'SELESAI')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                      >
                        Selesaikan Servis
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Parts Sidebar Widget (1 Col) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-50 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Peringatan Stok</h3>
                  <p className="text-xs text-slate-500">Sparepart menipis / hampir habis</p>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('spareparts')}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                Gudang &gt;
              </button>
            </div>

            {lowStockParts.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <Package className="w-10 h-10 mx-auto text-emerald-500/60 mb-2" />
                <p className="text-xs font-semibold text-slate-600">Semua Stok Sparepart Aman</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {lowStockParts.map((part) => (
                  <div
                    key={part.id}
                    className="p-3 bg-red-50/50 border border-red-200/80 rounded-lg flex items-center justify-between gap-2"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                        {part.name}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-mono text-slate-700">{part.code}</span>
                        <span>• Rak: {part.rackLocation}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-red-700 px-2 py-0.5 rounded bg-red-100 border border-red-200 block">
                        Sisa: {part.stock} {part.unit}
                      </span>
                      <button
                        onClick={() => onRestockPart(part)}
                        className="mt-1 text-[10px] font-bold text-orange-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        + Restock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigateTab('spareparts')}
              className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all text-center block"
            >
              Kelola Seluruh Inventaris Sparepart
            </button>
          </div>
        </div>

      </div>

      {/* Mechanic Performance Summary Row (Signature #2D3748 Dark Accent Card from Theme) */}
      <div className="bg-[#2D3748] rounded-xl border border-slate-700 p-5 sm:p-6 shadow-sm text-white">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/80 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Kinerja Mekanik & Estimasi Komisi Tim
              </h3>
              <p className="text-xs text-slate-300">
                Hitungan otomatis komisi servis berdasarkan unit yang diselesaikan
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('payroll')}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
          >
            Penggajian Karyawan &gt;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {employees.map((emp) => {
            // Count completed jobs for this mechanic
            const empJobs = orders.filter((o) => o.mechanicId === emp.id);
            const completedJobs = empJobs.filter((o) => o.paymentStatus === 'LUNAS');
            const totalCommissionEarned = completedJobs.reduce(
              (acc, o) => acc + (o.mechanicCommissionAmount || 0),
              0
            );

            return (
              <div
                key={emp.id}
                className="bg-slate-800/90 border border-slate-700 rounded-lg p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-200">
                      {emp.role}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Komisi: {emp.commissionRateLabor}%
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-sm mt-2">{emp.name}</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{emp.phone}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Motor Servis</span>
                    <span className="font-bold text-white">{completedJobs.length} Unit</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Estimasi Komisi</span>
                    <span className="font-black text-orange-400">
                      {formatRupiah(totalCommissionEarned)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
