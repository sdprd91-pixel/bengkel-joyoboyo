import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Download,
  Printer,
  Package,
  Wrench,
  Users,
  CheckCircle2,
  PieChart,
  BarChart3,
  CreditCard,
  QrCode,
  Landmark,
  Wallet,
} from 'lucide-react';
import {
  Employee,
  PayrollRecord,
  ServiceOrder,
  ShopSettings,
  Sparepart,
} from '../types';
import { formatDateIndo, formatRupiah } from '../lib/storage';
import { generateFinancialPDFReport } from '../lib/pdfGenerator';

interface ReportsViewProps {
  orders: ServiceOrder[];
  spareparts: Sparepart[];
  employees: Employee[];
  payrollRecords: PayrollRecord[];
  settings: ShopSettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  orders,
  spareparts,
  employees,
  payrollRecords,
  settings,
}) => {
  const now = new Date();
  const currentYearNum = now.getFullYear() < 2026 ? 2026 : now.getFullYear();
  const currentMonthNum = now.getMonth() + 1; // 1 - 12

  const [filterRange, setFilterRange] = useState<
    'HARI_INI' | 'KEMARIN' | 'BULAN_INI' | 'PILIH_BULAN' | 'KUSTOM_TANGGAL' | 'SEMUA'
  >('BULAN_INI');

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);

  const [startDate, setStartDate] = useState<string>(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    now.toISOString().split('T')[0]
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // "YYYY-MM"

  const MONTH_NAMES = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  // Dynamic years starting from 2026
  const startYear = 2026;
  const maxYear = Math.max(2035, now.getFullYear() + 5);
  const yearOptions = Array.from(
    { length: maxYear - startYear + 1 },
    (_, i) => startYear + i
  );

  const selectedMonthPadded = selectedMonth.toString().padStart(2, '0');
  const selectedYearMonthStr = `${selectedYear}-${selectedMonthPadded}`;

  // Filter Service Orders
  const filteredOrders = orders.filter((o) => {
    if (o.status === 'BATAL' || o.paymentStatus !== 'LUNAS') return false;
    const orderDate = (o.completedAt || o.createdAt).split('T')[0];

    if (filterRange === 'HARI_INI') return orderDate === todayStr;
    if (filterRange === 'KEMARIN') return orderDate === yesterdayStr;
    if (filterRange === 'BULAN_INI') return orderDate.startsWith(currentMonthStr);
    if (filterRange === 'PILIH_BULAN') return orderDate.startsWith(selectedYearMonthStr);
    if (filterRange === 'KUSTOM_TANGGAL') {
      if (startDate && endDate) return orderDate >= startDate && orderDate <= endDate;
      if (startDate) return orderDate >= startDate;
      if (endDate) return orderDate <= endDate;
      return true;
    }
    return true; // SEMUA
  });

  // Filter Payroll Records
  const filteredPayroll = payrollRecords.filter((p) => {
    const pDate = (p.paidAt || p.periodEnd || '').split('T')[0];
    if (!pDate) return true;

    if (filterRange === 'HARI_INI') return pDate === todayStr;
    if (filterRange === 'KEMARIN') return pDate === yesterdayStr;
    if (filterRange === 'BULAN_INI') return pDate.startsWith(currentMonthStr);
    if (filterRange === 'PILIH_BULAN') return pDate.startsWith(selectedYearMonthStr);
    if (filterRange === 'KUSTOM_TANGGAL') {
      if (startDate && endDate) return pDate >= startDate && pDate <= endDate;
      if (startDate) return pDate >= startDate;
      if (endDate) return pDate <= endDate;
      return true;
    }
    return true;
  });

  // Human Readable Period Label for PDF, CSV, and UI
  const getPeriodLabel = (): string => {
    if (filterRange === 'HARI_INI') return `Hari Ini (${formatDateIndo(todayStr)})`;
    if (filterRange === 'KEMARIN') return `Kemarin (${formatDateIndo(yesterdayStr)})`;
    if (filterRange === 'BULAN_INI') {
      const monthName = MONTH_NAMES[now.getMonth()];
      return `Bulan ${monthName} ${now.getFullYear()}`;
    }
    if (filterRange === 'PILIH_BULAN') {
      return `Bulan ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
    }
    if (filterRange === 'KUSTOM_TANGGAL') {
      if (startDate && endDate) {
        return `Periode ${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}`;
      }
      if (startDate) return `Mulai ${formatDateIndo(startDate)}`;
      if (endDate) return `Sampai ${formatDateIndo(endDate)}`;
      return 'Rentang Kustom';
    }
    return 'Semua Transaksi';
  };

  const periodLabel = getPeriodLabel();

  // Calculate Financial Breakdown
  const rawRevenue = filteredOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalRefunds = filteredOrders.reduce((acc, o) => acc + (o.totalRefund || 0), 0);
  const totalRevenue = Math.max(0, rawRevenue - totalRefunds);
  const totalLaborRevenue = filteredOrders.reduce((acc, o) => acc + o.subtotalLabor, 0);
  const totalPartRevenue = filteredOrders.reduce((acc, o) => acc + o.subtotalParts, 0);

  // Total HPP (Cost of parts sold minus returned parts)
  const totalPartHPP = filteredOrders.reduce((acc, o) => {
    const partsCost = o.parts.reduce((pAcc, p) => {
      const activeQty = Math.max(0, p.qty - (p.returnedQty || 0));
      return pAcc + (p.buyPrice || 0) * activeQty;
    }, 0);
    return acc + partsCost;
  }, 0);

  // Total Mechanic Commissions
  const totalCommissions = filteredOrders.reduce(
    (acc, o) => acc + (o.mechanicCommissionAmount || 0),
    0
  );

  // Payroll disburse expense
  const totalPayrollExpense = filteredPayroll.reduce((acc, p) => acc + p.netTotal, 0);

  // Net Profit
  const netProfit = totalRevenue - totalPartHPP - totalCommissions;

  // Cash Flow Method Breakdown
  const cashIn = filteredOrders.filter((o) => (o.paymentMethod || 'TUNAI') === 'TUNAI').reduce((a, o) => a + o.totalAmount, 0);
  const qrisIn = filteredOrders.filter((o) => o.paymentMethod === 'QRIS').reduce((a, o) => a + o.totalAmount, 0);
  const transferIn = filteredOrders.filter((o) => o.paymentMethod === 'TRANSFER').reduce((a, o) => a + o.totalAmount, 0);
  const debitIn = filteredOrders.filter((o) => o.paymentMethod === 'DEBIT').reduce((a, o) => a + o.totalAmount, 0);

  // Best Selling Parts Aggregation (Net of returns)
  const partSalesMap: { [code: string]: { name: string; qty: number; revenue: number } } = {};
  filteredOrders.forEach((o) => {
    o.parts.forEach((p) => {
      const netQty = Math.max(0, p.qty - (p.returnedQty || 0));
      if (netQty > 0) {
        if (!partSalesMap[p.code]) {
          partSalesMap[p.code] = { name: p.name, qty: 0, revenue: 0 };
        }
        partSalesMap[p.code].qty += netQty;
        partSalesMap[p.code].revenue += p.sellPrice * netQty;
      }
    });
  });

  const topParts = Object.values(partSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // CSV Export Handler
  const handleExportCSV = () => {
    let csv = 'ID Nota,Tanggal,Pelanggan,Plat Nomor,Motor,Mekanik,Total Jasa,Total Part,Diskon,Total Bayar,Metode,Komisi Mekanik\n';
    filteredOrders.forEach((o) => {
      csv += `"${o.id}","${o.completedAt || o.createdAt}","${o.customerName}","${o.plateNumber}","${o.motorModel}","${o.mechanicName}",${o.subtotalLabor},${o.subtotalParts},${o.discount},${o.totalAmount},"${o.paymentMethod || 'TUNAI'}",${o.mechanicCommissionAmount}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeFilename = periodLabel.replace(/[^a-zA-Z0-9_]/g, '_');
    link.setAttribute('download', `Laporan_Keuangan_Joyoboyo_${safeFilename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="bg-[#1E293B] p-5 rounded-xl border border-slate-700 shadow-sm text-white space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-orange-400" />
              Laporan Keuangan, Laba Rugi & Arus Kas
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Laporan komprehensif harian, bulanan, tahunan, serta kustom tanggal dari kasir.
            </p>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-lg border border-slate-700 flex-wrap">
            {(
              [
                { key: 'HARI_INI', label: 'Hari Ini' },
                { key: 'KEMARIN', label: 'Kemarin' },
                { key: 'BULAN_INI', label: 'Bulan Ini' },
                { key: 'PILIH_BULAN', label: 'Pilih Bulan & Tahun' },
                { key: 'KUSTOM_TANGGAL', label: 'Rentang Tanggal' },
                { key: 'SEMUA', label: 'Semua' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilterRange(item.key)}
                className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer ${
                  filterRange === item.key
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-Panel 1: Month & Year Selector */}
        {filterRange === 'PILIH_BULAN' && (
          <div className="pt-3 border-t border-slate-700 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-900/60 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Calendar className="w-4 h-4 text-orange-400" />
              <span>Filter Bulanan:</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              {/* Select Month */}
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5">
                <span className="text-xs text-slate-400 font-medium">Bulan:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((mName, idx) => (
                    <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                      {mName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Year */}
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5">
                <span className="text-xs text-slate-400 font-medium">Tahun:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
                >
                  {yearOptions.map((yr) => (
                    <option key={yr} value={yr} className="bg-slate-900 text-white">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs font-bold text-orange-400 bg-orange-950/60 border border-orange-500/40 px-3 py-1.5 rounded-lg">
                📌 {periodLabel}
              </div>
            </div>
          </div>
        )}

        {/* Sub-Panel 2: Custom Date Range Selector */}
        {filterRange === 'KUSTOM_TANGGAL' && (
          <div className="pt-3 border-t border-slate-700 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-900/60 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Calendar className="w-4 h-4 text-orange-400" />
              <span>Filter Rentang Tanggal:</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5">
                <span className="text-xs text-slate-400 font-medium">Dari Tanggal:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5">
                <span className="text-xs text-slate-400 font-medium">Sampai Tanggal:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
                />
              </div>

              <div className="text-xs font-bold text-orange-400 bg-orange-950/60 border border-orange-500/40 px-3 py-1.5 rounded-lg">
                📌 {periodLabel}
              </div>
            </div>
          </div>
        )}

        {/* Active Period Label Display */}
        {filterRange !== 'PILIH_BULAN' && filterRange !== 'KUSTOM_TANGGAL' && (
          <div className="text-xs text-slate-300 flex items-center gap-2 pt-2 border-t border-slate-700">
            <span className="font-semibold text-slate-400">Periode Aktif:</span>
            <span className="font-bold text-orange-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-700">
              {periodLabel}
            </span>
          </div>
        )}
      </div>

      {/* Main KPI Profit Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Omzet Pendapatan</span>
          <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            {formatRupiah(totalRevenue)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Dari <strong className="text-orange-600">{filteredOrders.length} transaksi</strong> lunas
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total HPP Sparepart</span>
          <p className="text-2xl font-bold text-red-600 tracking-tight mt-1">
            -{formatRupiah(totalPartHPP)}
          </p>
          <p className="text-xs text-slate-500 mt-2">Modal barang/part terpakai</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Komisi Mekanik</span>
          <p className="text-2xl font-bold text-blue-600 tracking-tight mt-1">
            -{formatRupiah(totalCommissions)}
          </p>
          <p className="text-xs text-slate-500 mt-2">Hak komisi tim mekanik</p>
        </div>

        <div className="bg-emerald-50/80 p-5 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase">ESTIMASI LABA BERSIH OPERASIONAL</span>
          <p className="text-2xl font-bold text-emerald-700 tracking-tight mt-1">
            {formatRupiah(netProfit)}
          </p>
          <p className="text-xs text-emerald-600 mt-2 font-medium">Margin: {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%</p>
        </div>
      </div>

      {/* Cash Flow Breakdown Box */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
          <Wallet className="w-4 h-4 text-orange-500" />
          Arus Kas Masuk Per Metode Pembayaran (Pemasukan Realtime)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">TUNAI / CASH</span>
              <span className="font-mono font-bold text-sm text-slate-900">{formatRupiah(cashIn)}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">QRIS / SCAN</span>
              <span className="font-mono font-bold text-sm text-slate-900">{formatRupiah(qrisIn)}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 text-purple-700 rounded-lg shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">TRANSFER BANK</span>
              <span className="font-mono font-bold text-sm text-slate-900">{formatRupiah(transferIn)}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">KARTU DEBIT</span>
              <span className="font-mono font-bold text-sm text-slate-900">{formatRupiah(debitIn)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Structure Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Revenue Source Bar Breakdown */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-500" />
                Struktur Pendapatan Jasa Servis vs Part
              </h3>
              <p className="text-xs text-slate-500">Perbandingan pemasukan Jasa Servis vs Sparepart</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => generateFinancialPDFReport(settings, filteredOrders, filteredPayroll, periodLabel)}
                className="px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Ekspor PDF Laporan
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-300 cursor-pointer"
              >
                CSV
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Labor Revenue Progress Bar */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-orange-500" />
                  Jasa Servis & Overhaul
                </span>
                <span className="text-orange-600 font-mono">{formatRupiah(totalLaborRevenue)}</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="bg-orange-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      totalRevenue > 0
                        ? Math.round((totalLaborRevenue / totalRevenue) * 100)
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Sparepart Revenue Progress Bar */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-600" />
                  Penjualan Sparepart & Oli
                </span>
                <span className="text-emerald-600 font-mono">{formatRupiah(totalPartRevenue)}</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      totalRevenue > 0
                        ? Math.round((totalPartRevenue / totalRevenue) * 100)
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="font-bold text-slate-800 text-xs mb-3">
              Rincian Transaksi Terkini ({filteredOrders.length} Nota Lunas)
            </h4>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {filteredOrders.map((o) => (
                <div
                  key={o.id}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-800 px-1.5 py-0.5 rounded bg-white border border-slate-200 mr-2">
                      {o.plateNumber}
                    </span>
                    <span className="font-bold text-slate-900">{o.customerName}</span>
                    <span className="text-[10px] text-slate-500 ml-2">({o.motorModel})</span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 block">
                      {formatRupiah(o.totalAmount)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Metode: <strong>{o.paymentMethod || 'TUNAI'}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Top Spareparts Sold */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-200 pb-4 mb-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                Sparepart Terlaris Periode Ini
              </h3>
              <p className="text-xs text-slate-500">Peringkat barang paling sering terpakai</p>
            </div>

            {topParts.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p className="text-xs font-semibold">Belum ada data penjualan part</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topParts.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                          {item.name}
                        </h4>
                        <span className="text-[10px] text-slate-500">
                          Total Omzet: {formatRupiah(item.revenue)}
                        </span>
                      </div>
                    </div>

                    <span className="font-mono font-bold text-orange-600 text-xs px-2.5 py-1 bg-orange-50 rounded-md border border-orange-200">
                      {item.qty} Terjual
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 mt-6">
            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak Rekap Laporan Keuangan
            </button>
          </div>
        </div>

      </div>

      {/* Print Only Signature Block */}
      <div className="hidden print:block pt-8 text-xs font-sans text-slate-900 border-t border-slate-300 mt-8">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[11px] font-bold text-slate-900">Laporan Rekapitulasi Keuangan Resmi - {settings.shopName}</p>
            <p className="text-[10px] text-slate-700 font-semibold">Periode: {periodLabel}</p>
            <p className="text-[10px] text-slate-500 font-medium">Dicetak Pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="text-center w-52">
            <p>{settings.city || 'Arso II'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold mt-1">Pemilik Bengkel,</p>
            <div className="h-16"></div>
            <p className="font-bold border-b border-slate-800 pb-1">({settings.ownerName || 'Yuwanain'})</p>
          </div>
        </div>
      </div>
    </div>
  );
};

