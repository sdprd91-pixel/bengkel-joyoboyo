import React, { useState } from 'react';
import {
  Users,
  Plus,
  DollarSign,
  Printer,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  CreditCard,
  FileSpreadsheet,
  Award,
  ChevronRight,
  Calculator,
  FileText,
  Search,
  Wrench,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Info,
  Clock,
  Sparkles,
  Receipt,
  HelpCircle,
} from 'lucide-react';
import {
  Employee,
  EmployeeLoan,
  PaymentMethod,
  PayrollRecord,
  ServiceOrder,
  ShopSettings,
} from '../types';
import { formatDateIndo, formatRupiah, getAllOrdersCombined } from '../lib/storage';
import { generatePayrollSlipPDF } from '../lib/pdfGenerator';

interface PayrollViewProps {
  employees: Employee[];
  payrollRecords: PayrollRecord[];
  employeeLoans: EmployeeLoan[];
  orders: ServiceOrder[];
  settings: ShopSettings;
  onSaveEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onSavePayrollRecord: (record: PayrollRecord) => void;
  onSaveEmployeeLoan: (loan: EmployeeLoan) => void;
  onDeleteEmployeeLoan: (id: string) => void;
  onPrintPayroll: (record: PayrollRecord, employee: Employee) => void;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  employees,
  payrollRecords,
  employeeLoans,
  orders,
  settings,
  onSaveEmployee,
  onDeleteEmployee,
  onSavePayrollRecord,
  onSaveEmployeeLoan,
  onDeleteEmployeeLoan,
  onPrintPayroll,
}) => {
  // Tab Navigation inside Payroll View
  const [activeSubTab, setActiveSubTab] = useState<'SERVICES' | 'LOANS' | 'EMPLOYEES' | 'PAYROLL_HISTORY'>('SERVICES');

  // Filter States
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('ALL');
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Default to current month start and end
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const [periodStart, setPeriodStart] = useState<string>(firstDayOfMonth);
  const [periodEnd, setPeriodEnd] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals State
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [isManageEmpModalOpen, setIsManageEmpModalOpen] = useState(false);
  const [manageEmpSearch, setManageEmpSearch] = useState('');

  // Employee Form
  const [empName, setEmpName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empRole, setEmpRole] = useState<Employee['role']>('Mekanik Senior');
  const [dailySalary, setDailySalary] = useState<number>(90000);
  const [commissionRate, setCommissionRate] = useState<number>(30);
  const [bankInfo, setBankInfo] = useState('');

  // Loan Modal State
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [loanModalType, setLoanModalType] = useState<'PINJAMAN' | 'CICILAN'>('PINJAMAN');
  const [loanEmpId, setLoanEmpId] = useState<string>('');
  const [loanAmount, setLoanAmount] = useState<number>(100000);
  const [loanDate, setLoanDate] = useState<string>(todayStr);
  const [loanNotes, setLoanNotes] = useState<string>('');

  // Payroll Payout Modal State
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [payoutStart, setPayoutStart] = useState<string>(firstDayOfMonth);
  const [payoutEnd, setPayoutEnd] = useState<string>(todayStr);
  const [bonus, setBonus] = useState<number>(0);
  const [deductions, setDeductions] = useState<number>(0); // Kasbon deduction
  const [payMethod, setPayMethod] = useState<PaymentMethod>('TRANSFER');
  const [payoutNotes, setPayoutNotes] = useState('');

  // Auto calculate working days from start date to end date
  const calculateDaysBetween = (startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 1;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  };

  const daysWorked = calculateDaysBetween(payoutStart, payoutEnd);

  // --- Helper to calculate employee loan balance ---
  const getEmployeeBalance = (empId: string): { borrowed: number; repaid: number; balance: number } => {
    const loans = employeeLoans.filter((l) => l.employeeId === empId);
    const borrowed = loans
      .filter((l) => l.type === 'PINJAMAN')
      .reduce((sum, l) => sum + l.amount, 0);
    const repaid = loans
      .filter((l) => l.type === 'CICILAN' || l.type === 'PELUNASAN' || l.type === 'POTONG_GAJI')
      .reduce((sum, l) => sum + l.amount, 0);
    return {
      borrowed,
      repaid,
      balance: Math.max(0, borrowed - repaid),
    };
  };

  const totalAllLoansBalance = employees.reduce((acc, emp) => acc + getEmployeeBalance(emp.id).balance, 0);

  // Combine Active and Archived Service Orders for total accurate service history calculation
  const allOrdersList = getAllOrdersCombined();

  // Filter Completed Service Work Orders for Mechanics
  const filteredCompletedOrders = allOrdersList.filter((o) => {
    if (o.paymentStatus !== 'LUNAS' && o.status !== 'SELESAI') return false;
    if (filterEmployeeId !== 'ALL' && o.mechanicId !== filterEmployeeId) return false;

    const orderDate = (o.completedAt || o.createdAt || '').split('T')[0];
    if (periodStart && orderDate < periodStart) return false;
    if (periodEnd && orderDate > periodEnd) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPlate = o.plateNumber.toLowerCase().includes(q);
      const matchCust = o.customerName.toLowerCase().includes(q);
      const matchMech = o.mechanicName.toLowerCase().includes(q);
      const matchMotor = o.motorModel.toLowerCase().includes(q);
      const matchId = o.id.toLowerCase().includes(q);
      if (!matchPlate && !matchCust && !matchMech && !matchMotor && !matchId) return false;
    }

    return true;
  });

  const totalFilteredServicesCount = filteredCompletedOrders.length;
  const totalFilteredLaborAmount = filteredCompletedOrders.reduce((acc, o) => acc + o.subtotalLabor, 0);
  const totalFilteredCommissionAmount = filteredCompletedOrders.reduce(
    (acc, o) => acc + (o.mechanicCommissionAmount || 0),
    0
  );

  // Filter Loan Records
  const filteredLoans = employeeLoans.filter((l) => {
    if (filterEmployeeId !== 'ALL' && l.employeeId !== filterEmployeeId) return false;
    if (periodStart && l.date < periodStart) return false;
    if (periodEnd && l.date > periodEnd) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = l.employeeName.toLowerCase().includes(q);
      const matchNotes = (l.notes || '').toLowerCase().includes(q);
      if (!matchName && !matchNotes) return false;
    }
    return true;
  });

  // Filter Payroll History Records
  const filteredPayrollRecords = payrollRecords.filter((p) => {
    if (filterEmployeeId !== 'ALL' && p.employeeId !== filterEmployeeId) return false;
    const paidDate = p.paidAt.split('T')[0];
    if (periodStart && paidDate < periodStart) return false;
    if (periodEnd && paidDate > periodEnd) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.employeeName.toLowerCase().includes(q);
      const matchId = p.id.toLowerCase().includes(q);
      if (!matchName && !matchId) return false;
    }
    return true;
  });

  // --- Handlers ---
  const handleOpenEmpModal = (emp?: Employee) => {
    if (emp) {
      setEditingEmp(emp);
      setEmpName(emp.name);
      setEmpPhone(emp.phone);
      setEmpRole(emp.role);
      setDailySalary(emp.dailyBaseSalary);
      setCommissionRate(emp.commissionRateLabor);
      setBankInfo(emp.bankInfo || '');
    } else {
      setEditingEmp(null);
      setEmpName('');
      setEmpPhone('');
      setEmpRole('Mekanik Senior');
      setDailySalary(90000);
      setCommissionRate(30);
      setBankInfo('');
    }
    setIsEmployeeModalOpen(true);
  };

  const handleSubmitEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) {
      alert('Mohon isi nama karyawan!');
      return;
    }

    const newEmp: Employee = {
      id: editingEmp?.id || `EMP-${Date.now()}`,
      name: empName.trim(),
      phone: empPhone.trim(),
      role: empRole,
      dailyBaseSalary: Number(dailySalary),
      commissionRateLabor: Number(commissionRate),
      joinDate: editingEmp?.joinDate || todayStr,
      status: editingEmp?.status || 'Aktif',
      bankInfo: bankInfo.trim(),
    };

    onSaveEmployee(newEmp);
    setIsEmployeeModalOpen(false);
  };

  // Open Loan Modal
  const handleOpenLoanModal = (type: 'PINJAMAN' | 'CICILAN', empId?: string) => {
    setLoanModalType(type);
    const targetEmpId = empId || (filterEmployeeId !== 'ALL' ? filterEmployeeId : employees[0]?.id || '');
    setLoanEmpId(targetEmpId);
    setLoanAmount(100000);
    setLoanDate(todayStr);
    setLoanNotes(type === 'PINJAMAN' ? 'Pinjaman / Kasbon Karyawan' : 'Pembayaran Cicilan Kasbon');
    setIsLoanModalOpen(true);
  };

  const handleSubmitLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const empObj = employees.find((e) => e.id === loanEmpId);
    if (!empObj) {
      alert('Pilih karyawan terlebih dahulu!');
      return;
    }
    if (loanAmount <= 0) {
      alert('Jumlah pinjaman/cicilan harus lebih dari Rp 0!');
      return;
    }

    const newLoan: EmployeeLoan = {
      id: `LOAN-${Date.now()}`,
      employeeId: empObj.id,
      employeeName: empObj.name,
      type: loanModalType === 'PINJAMAN' ? 'PINJAMAN' : 'CICILAN',
      amount: Number(loanAmount),
      date: loanDate,
      notes: loanNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    onSaveEmployeeLoan(newLoan);
    setIsLoanModalOpen(false);
  };

  // Open Payroll Payout Modal
  const handleOpenPayrollModal = (empId?: string) => {
    const targetId = empId || (filterEmployeeId !== 'ALL' ? filterEmployeeId : employees[0]?.id || '');
    setSelectedEmpId(targetId);
    setPayoutStart(periodStart);
    setPayoutEnd(periodEnd);
    setBonus(0);

    // Auto calculate active loan balance for deductions recommendation
    const loanInfo = getEmployeeBalance(targetId);
    setDeductions(Math.min(loanInfo.balance, 200000)); // Default recommend max 200k or full balance
    setPayoutNotes('Penggajian & Komisi Servis Periode ' + periodStart + ' s/d ' + periodEnd);
    setIsPayrollModalOpen(true);
  };

  // Selected Employee object in Payout Modal
  const selectedEmpObj = employees.find((e) => e.id === selectedEmpId);
  const selectedEmpLoanBalance = selectedEmpId ? getEmployeeBalance(selectedEmpId).balance : 0;

  // Calculate completed orders for selected employee in payout period
  const empCompletedOrdersInPayoutPeriod = allOrdersList.filter((o) => {
    if (o.mechanicId !== selectedEmpId || (o.paymentStatus !== 'LUNAS' && o.status !== 'SELESAI')) return false;
    const orderDate = (o.completedAt || o.createdAt || '').split('T')[0];
    return orderDate >= payoutStart && orderDate <= payoutEnd;
  });

  const totalCommissionCalculatedInPayout = empCompletedOrdersInPayoutPeriod.reduce(
    (acc, o) => acc + (o.mechanicCommissionAmount || 0),
    0
  );

  const baseSalaryTotalInPayout = (selectedEmpObj?.dailyBaseSalary || 0) * daysWorked;
  const netSalaryPayout = Math.max(
    0,
    baseSalaryTotalInPayout + totalCommissionCalculatedInPayout + bonus - deductions
  );

  // Submit Payroll Payout
  const handleConfirmPayout = () => {
    if (!selectedEmpObj) return;

    const record: PayrollRecord = {
      id: `PAY-${Date.now()}`,
      employeeId: selectedEmpObj.id,
      employeeName: selectedEmpObj.name,
      employeeRole: selectedEmpObj.role,
      periodStart: payoutStart,
      periodEnd: payoutEnd,
      paidAt: new Date().toISOString(),
      daysWorked,
      totalBaseSalary: baseSalaryTotalInPayout,
      totalCommission: totalCommissionCalculatedInPayout,
      bonus,
      deductions,
      loanDeduction: deductions > 0 ? deductions : 0,
      netTotal: netSalaryPayout,
      paymentMethod: payMethod,
      notes: payoutNotes,
    };

    onSavePayrollRecord(record);

    // If kasbon deduction applied, automatically log POTONG_GAJI in employee loans
    if (deductions > 0) {
      const loanDeductionRecord: EmployeeLoan = {
        id: `LOAN-PAY-${Date.now()}`,
        employeeId: selectedEmpObj.id,
        employeeName: selectedEmpObj.name,
        type: 'POTONG_GAJI',
        amount: deductions,
        date: todayStr,
        notes: `Potongan kasbon pencairan gaji (${record.id})`,
        createdAt: new Date().toISOString(),
      };
      onSaveEmployeeLoan(loanDeductionRecord);
    }

    setIsPayrollModalOpen(false);

    // Trigger Print Thermal Slip
    onPrintPayroll(record, selectedEmpObj);
  };

  // Preset Date Handlers
  const handleSetQuickDate = (preset: 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME') => {
    if (preset === 'TODAY') {
      setPeriodStart(todayStr);
      setPeriodEnd(todayStr);
    } else if (preset === 'THIS_MONTH') {
      setPeriodStart(firstDayOfMonth);
      setPeriodEnd(todayStr);
    } else if (preset === 'LAST_MONTH') {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setPeriodStart(lastMonthStart);
      setPeriodEnd(lastMonthEnd);
    } else if (preset === 'ALL_TIME') {
      setPeriodStart('2024-01-01');
      setPeriodEnd(todayStr);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="bg-[#1E293B] p-5 sm:p-6 rounded-2xl border border-slate-700 shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Gaji & Kasbon Terintegrasi
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-orange-400 shrink-0" />
            Manajemen Gaji & Kasbon Karyawan
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Proses gaji otomatis tersinkronisasi dengan riwayat pengerjaan servis motor, komisi mekanik, serta fitur pencatatan dan potongan pinjaman (kasbon).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenEmpModal()}
            className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            + Tambah Pegawai Baru
          </button>
          <button
            onClick={() => {
              setActiveSubTab('EMPLOYEES');
              setIsManageEmpModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs sm:text-sm flex items-center gap-1.5 border border-slate-700 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Edit2 className="w-4 h-4 text-amber-400" />
            Edit & Hapus Pegawai
          </button>
          <button
            onClick={() => handleOpenPayrollModal()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Calculator className="w-4 h-4 stroke-[2.5]" />
            Hitung & Cairkan Gaji
          </button>
          <button
            onClick={() => handleOpenLoanModal('PINJAMAN')}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center gap-2 border border-slate-600 cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-emerald-400" />
            Tambah Pinjaman / Kasbon
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Karyawan Aktif</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-800 mt-1.5">{employees.length} Orang</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {employees.filter((e) => e.role.includes('Mekanik')).length} Mekanik, {employees.filter((e) => e.role === 'Kasir').length} Kasir
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Servis Motor Dikerjakan</span>
            <Wrench className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-xl font-black text-orange-600 mt-1.5">{totalFilteredServicesCount} Unit</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Total Hak Komisi: <strong className="text-slate-700">{formatRupiah(totalFilteredCommissionAmount)}</strong>
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Kasbon / Pinjaman</span>
            <CreditCard className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-xl font-black text-red-600 mt-1.5">{formatRupiah(totalAllLoansBalance)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Sisa pinjaman belum dilunasi</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Gaji Dicairkan (Filtered)</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-emerald-600 mt-1.5">
            {formatRupiah(filteredPayrollRecords.reduce((a, r) => a + r.netTotal, 0))}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{filteredPayrollRecords.length} kali pencairan slip</p>
        </div>
      </div>

      {/* FILTER CONTROL BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Filter className="w-4 h-4 text-orange-500" />
            Filter Pencarian Pegawai & Tanggal Riwayat Pengerjaan
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">Presisi:</span>
            <button
              onClick={() => handleSetQuickDate('TODAY')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 font-bold text-[11px] transition-colors"
            >
              Hari Ini
            </button>
            <button
              onClick={() => handleSetQuickDate('THIS_MONTH')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 font-bold text-[11px] transition-colors"
            >
              Bulan Ini
            </button>
            <button
              onClick={() => handleSetQuickDate('LAST_MONTH')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 font-bold text-[11px] transition-colors"
            >
              Bulan Lalu
            </button>
            <button
              onClick={() => handleSetQuickDate('ALL_TIME')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 font-bold text-[11px] transition-colors"
            >
              Semua Waktu
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Employee Selector Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 flex items-center justify-between">
              <span>Pilih Pegawai / Mekanik:</span>
              {filterEmployeeId !== 'ALL' && (
                <span className="text-[10px] text-orange-600 font-bold">Pegawai Terpilih</span>
              )}
            </label>
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">-- Semua Karyawan & Mekanik --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
            {filterEmployeeId !== 'ALL' && (
              <div className="flex gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const emp = employees.find((e) => e.id === filterEmployeeId);
                    if (emp) handleOpenEmpModal(emp);
                  }}
                  className="flex-1 py-1 px-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-[11px] rounded-lg border border-orange-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Edit2 className="w-3 h-3 text-orange-600" />
                  Edit Pegawai Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const emp = employees.find((e) => e.id === filterEmployeeId);
                    if (emp) {
                      if (confirm(`Apakah Anda yakin ingin menghapus data pegawai "${emp.name}"?`)) {
                        onDeleteEmployee(emp.id);
                        setFilterEmployeeId('ALL');
                      }
                    }
                  }}
                  className="py-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] rounded-lg border border-red-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                  Hapus
                </button>
              </div>
            )}
          </div>

          {/* Date Start */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">
              Mulai Dari Tanggal:
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Date End */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">
              Sampai Tanggal:
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Search Query */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">
              Cari Keyword (Plat/Nota/Motor):
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Plat motor, nama, SPK..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* MAIN NAVIGATION SUB-TABS */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-4 bg-white p-2 rounded-xl shadow-2xs overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('SERVICES')}
          className={`px-4 py-2.5 rounded-lg font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'SERVICES'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Riwayat Servis Motor ({filteredCompletedOrders.length})
        </button>

        <button
          onClick={() => setActiveSubTab('LOANS')}
          className={`px-4 py-2.5 rounded-lg font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'LOANS'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Catatan Pinjaman & Kasbon ({filteredLoans.length})
        </button>

        <button
          onClick={() => setActiveSubTab('EMPLOYEES')}
          className={`px-4 py-2.5 rounded-lg font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'EMPLOYEES'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Daftar Karyawan ({employees.length})
        </button>

        <button
          onClick={() => setActiveSubTab('PAYROLL_HISTORY')}
          className={`px-4 py-2.5 rounded-lg font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'PAYROLL_HISTORY'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Riwayat Pencairan Gaji ({filteredPayrollRecords.length})
        </button>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: RIWAYAT PENGERJAAN SERVIS MOTOR                */}
      {/* ========================================================= */}
      {activeSubTab === 'SERVICES' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm space-y-0">
          <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-500" />
                Riwayat Pengerjaan Servis Motor Mekanik
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rincian pengerjaan unit motor yang selesai dan hak komisi mekanik pada periode {periodStart} s/d {periodEnd}
              </p>
            </div>

            {filteredCompletedOrders.length > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs text-amber-900 font-bold">
                <span>Total Komisi Mekanik:</span>
                <span className="font-mono text-sm text-orange-600 font-black">
                  {formatRupiah(totalFilteredCommissionAmount)}
                </span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">No. SPK & Tanggal</th>
                  <th className="py-3.5 px-4">Mekanik / Karyawan</th>
                  <th className="py-3.5 px-4">Plat & Model Motor</th>
                  <th className="py-3.5 px-4">Pelanggan</th>
                  <th className="py-3.5 px-4 text-right">Biaya Jasa Servis</th>
                  <th className="py-3.5 px-4 text-center">Komisi %</th>
                  <th className="py-3.5 px-4 text-right">Hak Komisi Mekanik</th>
                  <th className="py-3.5 px-4 text-center">Aksi Gaji</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCompletedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Tidak ada riwayat pengerjaan servis motor yang cocok dengan filter tanggal/pegawai.
                    </td>
                  </tr>
                ) : (
                  filteredCompletedOrders.map((ord) => {
                    const orderDate = (ord.completedAt || ord.createdAt || '').split('T')[0];
                    return (
                      <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px] block w-fit border border-slate-200">
                            {ord.id}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">{orderDate}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800 block">{ord.mechanicName || 'Mekanik'}</span>
                          <span className="text-[10px] text-orange-600 font-semibold">
                            {employees.find((e) => e.id === ord.mechanicId)?.role || 'Mekanik'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono font-extrabold text-slate-800 bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200 text-[11px] inline-block mr-1">
                            {ord.plateNumber}
                          </span>
                          <span className="text-xs text-slate-600 block sm:inline font-medium">
                            {ord.motorModel}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {ord.customerName}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                          {formatRupiah(ord.subtotalLabor)}
                        </td>

                        <td className="py-3 px-4 text-center font-bold text-orange-600">
                          {ord.mechanicCommissionPercent || 30}%
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-black text-orange-600 text-sm">
                          +{formatRupiah(ord.mechanicCommissionAmount || 0)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenPayrollModal(ord.mechanicId)}
                            className="px-2.5 py-1 rounded-lg bg-orange-100 hover:bg-orange-500 text-orange-700 hover:text-white font-bold text-[11px] transition-all cursor-pointer"
                          >
                            Proses Gaji
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: CATATAN PINJAMAN & KASBON PEGAWAI              */}
      {/* ========================================================= */}
      {activeSubTab === 'LOANS' && (
        <div className="space-y-6">
          {/* Top Actions & Summary by Employee */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                  Rekapitulasi Pinjaman & Kasbon Masing-Masing Karyawan
                </h3>
                <p className="text-xs text-slate-500">
                  Pantau total pinjaman, cicilan, dan sisa saldonya yang tersambung dengan penggajian
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenLoanModal('PINJAMAN')}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  + Catat Pinjaman Baru
                </button>
                <button
                  onClick={() => handleOpenLoanModal('CICILAN')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <DollarSign className="w-4 h-4 stroke-[3]" />
                  + Bayar Cicilan / Pelunasan
                </button>
              </div>
            </div>

            {/* Employee Loan Summary Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {employees.map((emp) => {
                const bal = getEmployeeBalance(emp.id);
                return (
                  <div
                    key={emp.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-sm">{emp.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          {emp.role}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>Total Meminjam:</span>
                          <span className="font-mono text-slate-700 font-bold">{formatRupiah(bal.borrowed)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Di-cicil / Pelunasan:</span>
                          <span className="font-mono text-emerald-600 font-bold">-{formatRupiah(bal.repaid)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">SISA PINJAMAN</span>
                        <span
                          className={`font-mono font-extrabold text-sm ${
                            bal.balance > 0 ? 'text-red-600' : 'text-emerald-600'
                          }`}
                        >
                          {formatRupiah(bal.balance)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenLoanModal('PINJAMAN', emp.id)}
                          className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-bold"
                          title="Tambah Pinjaman"
                        >
                          + Pinjam
                        </button>
                        {bal.balance > 0 && (
                          <button
                            onClick={() => handleOpenLoanModal('CICILAN', emp.id)}
                            className="px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[10px] font-bold"
                            title="Bayar Cicilan"
                          >
                            Cicil
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Loan Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Riwayat Transaksi Pinjaman & Cicilan</h3>
                <p className="text-xs text-slate-500">
                  Daftar rinci pencatatan pinjaman, cicilan tunai, dan potongan gaji otomatis
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Tanggal Transaksi</th>
                    <th className="py-3.5 px-4">Nama Pegawai</th>
                    <th className="py-3.5 px-4">Tipe Transaksi</th>
                    <th className="py-3.5 px-4 text-right">Jumlah (Rp)</th>
                    <th className="py-3.5 px-4">Catatan / Keperluan</th>
                    <th className="py-3.5 px-4 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredLoans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Belum ada catatan pinjaman atau cicilan pada filter tanggal ini.
                      </td>
                    </tr>
                  ) : (
                    filteredLoans.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                          {formatDateIndo(l.date)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {l.employeeName}
                        </td>
                        <td className="py-3 px-4">
                          {l.type === 'PINJAMAN' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-extrabold text-[10px] border border-red-200">
                              + PINJAMAN BARU
                            </span>
                          )}
                          {l.type === 'CICILAN' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] border border-emerald-200">
                              - CICILAN TUNAI
                            </span>
                          )}
                          {l.type === 'PELUNASAN' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] border border-emerald-200">
                              - PELUNASAN
                            </span>
                          )}
                          {l.type === 'POTONG_GAJI' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-extrabold text-[10px] border border-orange-200">
                              - POTONG GAJI
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-sm">
                          <span className={l.type === 'PINJAMAN' ? 'text-red-600' : 'text-emerald-600'}>
                            {l.type === 'PINJAMAN' ? '+' : '-'}{formatRupiah(l.amount)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 italic">
                          {l.notes || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              if (confirm(`Hapus catatan pinjaman ${l.employeeName} Rp ${l.amount.toLocaleString()}?`)) {
                                onDeleteEmployeeLoan(l.id);
                              }
                            }}
                            className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: DAFTAR KARYAWAN & STRUKTUR KOMISI              */}
      {/* ========================================================= */}
      {activeSubTab === 'EMPLOYEES' && (
        <div className="space-y-6">
          {/* Top Banner for Employee Subtab */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                Daftar & Manajemen Pegawai Bengkel ({employees.length} Orang)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola data karyawan, tentukan gaji pokok harian, persentase komisi servis, serta opsi tambah & hapus pegawai.
              </p>
            </div>

            <button
              onClick={() => handleOpenEmpModal()}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              + Tambah Karyawan Baru
            </button>
          </div>

          {/* Grid View Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {employees.length === 0 ? (
              <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-sm text-slate-600">Belum ada data pegawai.</p>
                <p className="text-xs text-slate-400 mt-1">Klik tombol di atas untuk menambah karyawan baru.</p>
              </div>
            ) : (
              employees.map((emp) => {
                const empOrders = allOrdersList.filter(
                  (o) => o.mechanicId === emp.id && (o.paymentStatus === 'LUNAS' || o.status === 'SELESAI')
                );
                const totalEarnedCommissions = empOrders.reduce(
                  (acc, o) => acc + (o.mechanicCommissionAmount || 0),
                  0
                );
                const loanBal = getEmployeeBalance(emp.id).balance;

                return (
                  <div
                    key={emp.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                          {emp.role}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEmpModal(emp)}
                            title="Edit Data Pegawai"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-orange-600 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Apakah Anda yakin ingin menghapus data pegawai "${emp.name}"?\nCatatan: Riwayat servis dan gaji terdahulu tetap tersimpan.`)) {
                                onDeleteEmployee(emp.id);
                              }
                            }}
                            title="Hapus Pegawai"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-extrabold text-slate-800 text-base mt-3">{emp.name}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{emp.phone || '-'}</p>
                      {emp.bankInfo && (
                        <p className="text-[11px] text-slate-500 mt-1 font-medium italic">
                          💳 {emp.bankInfo}
                        </p>
                      )}

                      <div className="mt-4 space-y-1.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Gaji Pokok / Hari:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {formatRupiah(emp.dailyBaseSalary)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Rate Komisi Jasa:</span>
                          <span className="font-bold text-orange-600">{emp.commissionRateLabor}%</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200">
                          <span className="text-slate-500">Motor Dikerjakan:</span>
                          <span className="font-bold text-emerald-600">{empOrders.length} Unit</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Sisa Kasbon:</span>
                          <span className={`font-mono font-bold ${loanBal > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                            {formatRupiah(loanBal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Total Komisi</span>
                          <span className="font-bold text-orange-600 text-sm">
                            {formatRupiah(totalEarnedCommissions)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenPayrollModal(emp.id)}
                          className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs transition-all shadow-2xs cursor-pointer"
                        >
                          Proses Gaji
                        </button>
                      </div>

                      {/* Quick action buttons for edit and delete */}
                      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
                        <button
                          onClick={() => handleOpenEmpModal(emp)}
                          className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Apakah Anda yakin ingin menghapus data pegawai "${emp.name}"?\nCatatan: Riwayat pengerjaan tetap tersimpan.`)) {
                              onDeleteEmployee(emp.id);
                            }
                          }}
                          className="py-1.5 px-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors border border-red-200"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Table List View for Employees */}
          {employees.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs mt-6">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Tabel Rincian & Aksi Pegawai</h4>
                <span className="text-xs text-slate-500 font-medium">Total: {employees.length} Karyawan</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Nama Pegawai</th>
                      <th className="py-3 px-4">Jabatan</th>
                      <th className="py-3 px-4">No. HP</th>
                      <th className="py-3 px-4 text-right">Gaji Pokok / Hari</th>
                      <th className="py-3 px-4 text-center">Komisi %</th>
                      <th className="py-3 px-4 text-right">Sisa Kasbon</th>
                      <th className="py-3 px-4">Info Rekening</th>
                      <th className="py-3 px-4 text-center">Aksi Pegawai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {employees.map((emp) => {
                      const loanBal = getEmployeeBalance(emp.id).balance;
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-extrabold text-slate-800">
                            {emp.name}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200">
                              {emp.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {emp.phone || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                            {formatRupiah(emp.dailyBaseSalary)}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-orange-600">
                            {emp.commissionRateLabor}%
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            <span className={loanBal > 0 ? 'text-red-600' : 'text-slate-500'}>
                              {formatRupiah(loanBal)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 italic font-medium">
                            {emp.bankInfo || '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenEmpModal(emp)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 text-slate-700 hover:text-orange-600 font-bold text-[11px] flex items-center gap-1 border border-slate-200 cursor-pointer transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Apakah Anda yakin ingin menghapus pegawai "${emp.name}"?`)) {
                                    onDeleteEmployee(emp.id);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold text-[11px] flex items-center gap-1 border border-red-200 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 4: RIWAYAT PENCAIRAN GAJI & SLIP                  */}
      {/* ========================================================= */}
      {activeSubTab === 'PAYROLL_HISTORY' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-orange-500" />
                Riwayat Pembayaran Gaji, Komisi & Potongan Kasbon
              </h3>
              <p className="text-xs text-slate-500">Daftar pencairan slip gaji karyawan yang telah diproses</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">No. Slip & Tanggal</th>
                  <th className="py-3.5 px-4">Karyawan</th>
                  <th className="py-3.5 px-4">Periode Kerja</th>
                  <th className="py-3.5 px-4 text-right">Gaji Pokok</th>
                  <th className="py-3.5 px-4 text-right">Komisi Servis</th>
                  <th className="py-3.5 px-4 text-right">Potongan Kasbon</th>
                  <th className="py-3.5 px-4 text-right">Total Net Cair</th>
                  <th className="py-3.5 px-4 text-center">Cetak Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPayrollRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Belum ada riwayat penggajian pada filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredPayrollRecords.map((pay) => {
                    const empObj = employees.find((e) => e.id === pay.employeeId);

                    return (
                      <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px] block w-fit mb-1 border border-slate-200">
                            {pay.id}
                          </span>
                          <p className="text-[10px] text-slate-500">{formatDateIndo(pay.paidAt)}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{pay.employeeName}</p>
                          <p className="text-[10px] text-slate-500">{pay.employeeRole}</p>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                          {pay.periodStart} s/d {pay.periodEnd} ({pay.daysWorked} hr)
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                          {formatRupiah(pay.totalBaseSalary)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-600">
                          +{formatRupiah(pay.totalCommission)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-red-600 font-bold">
                          {pay.deductions > 0 ? `-${formatRupiah(pay.deductions)}` : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600 text-sm">
                          {formatRupiah(pay.netTotal)}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => empObj && onPrintPayroll(pay, empObj)}
                              title="Cetak Termal Slip Gaji"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5 text-orange-400" />
                              Termal
                            </button>
                            <button
                              type="button"
                              onClick={() => generatePayrollSlipPDF(settings, pay, empObj)}
                              title="Unduh PDF Slip Gaji"
                              className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 border border-orange-500/30 font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              PDF
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
      )}

      {/* ========================================================= */}
      {/* MODAL 1: PAYROLL PAYOUT CALCULATOR & SLIP (AUTO)          */}
      {/* ========================================================= */}
      {isPayrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-xl w-full text-slate-100 overflow-hidden my-auto">
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base">Hitung & Cairkan Gaji Karyawan</h3>
                  <p className="text-xs text-slate-400">Otomatisasi komisi servis & sinkronisasi potongan kasbon</p>
                </div>
              </div>
              <button
                onClick={() => setIsPayrollModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Select Employee */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                  Pilih Karyawan / Mekanik:
                </label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-orange-400"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.role}) - Komisi {e.commissionRateLabor}%
                    </option>
                  ))}
                </select>
              </div>

              {/* Period Selectors */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1 block">
                    Dari Tanggal:
                  </label>
                  <input
                    type="date"
                    value={payoutStart}
                    onChange={(e) => setPayoutStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1 block">
                    Sampai Tanggal:
                  </label>
                  <input
                    type="date"
                    value={payoutEnd}
                    onChange={(e) => setPayoutEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1 block">
                    Jumlah Hari Kerja (Otomatis):
                  </label>
                  <div className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-2 text-xs font-mono font-black text-amber-400 text-center flex items-center justify-center gap-1.5 cursor-not-allowed select-none">
                    <span>{daysWorked} Hari Kerja</span>
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                      Otomatis
                    </span>
                  </div>
                </div>
              </div>

              {/* Auto Computed Breakdown */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">
                    Gaji Pokok Harian ({daysWorked} hr x {formatRupiah(selectedEmpObj?.dailyBaseSalary || 0)}):
                  </span>
                  <span className="font-mono font-bold text-slate-200">{formatRupiah(baseSalaryTotalInPayout)}</span>
                </div>

                <div className="flex justify-between items-center bg-orange-950/30 p-2 rounded-xl border border-orange-900/40">
                  <div>
                    <span className="text-orange-300 font-bold block">
                      Komisi Hak Mekanik ({empCompletedOrdersInPayoutPeriod.length} Unit Motor):
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Otomatis dihitung dari {selectedEmpObj?.commissionRateLabor}% biaya jasa servis
                    </span>
                  </div>
                  <span className="font-mono font-black text-sm text-orange-400">
                    +{formatRupiah(totalCommissionCalculatedInPayout)}
                  </span>
                </div>

                {/* Kasbon / Loan Sync Section */}
                <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      Sisa Kasbon/Pinjaman Pegawai:
                    </span>
                    <span className="font-mono font-black text-red-400">
                      {formatRupiah(selectedEmpLoanBalance)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        Bonus / Tip (Rp):
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={bonus === 0 ? '' : bonus}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setBonus(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs font-mono font-bold text-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">
                        Potong Kasbon (Rp):
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={selectedEmpLoanBalance > 0 ? selectedEmpLoanBalance : 99999999}
                        value={deductions === 0 ? '' : deductions}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setDeductions(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs font-mono font-bold text-red-400"
                      />
                    </div>
                  </div>

                  {selectedEmpLoanBalance > 0 && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-semibold">Opsi Cepat Potong:</span>
                      <button
                        type="button"
                        onClick={() => setDeductions(selectedEmpLoanBalance)}
                        className="px-2 py-0.5 rounded bg-red-900/50 hover:bg-red-800 text-red-200 text-[10px] font-bold border border-red-700"
                      >
                        Potong Lunas ({formatRupiah(selectedEmpLoanBalance)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeductions(Math.round(selectedEmpLoanBalance / 2))}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-600"
                      >
                        50%
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeductions(0)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                      >
                        Rp 0
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm">
                  <span className="font-black text-slate-200 uppercase">NET GAJI CAIR DITERIMA:</span>
                  <span className="font-mono font-black text-2xl text-emerald-400">
                    {formatRupiah(netSalaryPayout)}
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Metode Bayar:</span>
                {(['TRANSFER', 'TUNAI'] as PaymentMethod[]).map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPayMethod(pm)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      payMethod === pm ? 'bg-orange-500 text-slate-950 font-black' : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayrollModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayout}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Cairkan & Cetak Slip Termal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CATAT PINJAMAN / CICILAN KASBON                  */}
      {/* ========================================================= */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-md w-full text-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-100 text-base">
                {loanModalType === 'PINJAMAN' ? 'Tambah Catatan Pinjaman / Kasbon' : 'Catat Bayar Cicilan / Pelunasan'}
              </h3>
              <button
                onClick={() => setIsLoanModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLoan} className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                  Pilih Karyawan: <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={loanEmpId}
                  onChange={(e) => setLoanEmpId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-orange-400"
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.role}) - Sisa Pinjaman: {formatRupiah(getEmployeeBalance(e.id).balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                  Tipe Transaksi:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLoanModalType('PINJAMAN')}
                    className={`py-2 text-xs font-extrabold rounded-xl border ${
                      loanModalType === 'PINJAMAN'
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    + Pinjaman Baru
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoanModalType('CICILAN')}
                    className={`py-2 text-xs font-extrabold rounded-xl border ${
                      loanModalType === 'CICILAN'
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    - Bayar Cicilan
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Jumlah (Rp): <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={loanAmount ? loanAmount.toLocaleString('id-ID') : ''}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setLoanAmount(raw ? parseInt(raw, 10) : 0);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    {loanModalType === 'PINJAMAN' ? 'Tanggal Meminjam:' : 'Tanggal Mencicil/Lunas:'}
                  </label>
                  <input
                    type="date"
                    required
                    value={loanDate}
                    onChange={(e) => setLoanDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                  Catatan / Keperluan Pinjaman:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pinjaman biaya servis HP / Cicilan tunai"
                  value={loanNotes}
                  onChange={(e) => setLoanNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`w-2/3 py-2.5 rounded-xl text-slate-950 font-black text-xs shadow-lg ${
                    loanModalType === 'PINJAMAN' ? 'bg-red-500 hover:bg-red-400' : 'bg-emerald-500 hover:bg-emerald-400'
                  }`}
                >
                  Simpan Transaksi Pinjaman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ADD / EDIT EMPLOYEE                              */}
      {/* ========================================================= */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-md w-full text-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-base">
                {editingEmp ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
              </h3>
              <button
                onClick={() => setIsEmployeeModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEmp} className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                  Nama Lengkap Karyawan <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Mas Agus Purwanto"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
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
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                    Jabatan:
                  </label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value as Employee['role'])}
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
                    value={dailySalary === 0 ? '' : dailySalary}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setDailySalary(e.target.value === '' ? 0 : Number(e.target.value))}
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
                    value={commissionRate === 0 ? '' : commissionRate}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCommissionRate(e.target.value === '' ? 0 : Number(e.target.value))}
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
                  value={bankInfo}
                  onChange={(e) => setBankInfo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div className="flex gap-2 pt-2">
                {editingEmp && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          `Apakah Anda yakin ingin menghapus data pegawai "${editingEmp.name}"?\nCatatan: Data transaksi dan komisi terdahulu tidak akan hilang.`
                        )
                      ) {
                        onDeleteEmployee(editingEmp.id);
                        setIsEmployeeModalOpen(false);
                      }
                    }}
                    className="px-3 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold text-xs border border-red-500/40 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20"
                >
                  {editingEmp ? 'Simpan Perubahan' : 'Simpan Karyawan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================= */}
      {/* MODAL MANAGEMENT PEGAWAI (EDIT & HAPUS PEGAWAI QUICK MODAL) */}
      {/* ========================================================= */}
      {isManageEmpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-2xl w-full text-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="font-bold text-slate-100 text-base">Kelola & Edit Data Pegawai</h3>
                  <p className="text-xs text-slate-400">Daftar seluruh karyawan dan mekanik bengkel ({employees.length} orang)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageEmpModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-800 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manageEmpSearch}
                  onChange={(e) => setManageEmpSearch(e.target.value)}
                  placeholder="Cari nama pegawai / no hp..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {manageEmpSearch && (
                  <button
                    type="button"
                    onClick={() => setManageEmpSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsManageEmpModalOpen(false);
                  handleOpenEmpModal();
                }}
                className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                + Tambah Karyawan Baru
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {employees
                .filter((emp) => {
                  if (!manageEmpSearch.trim()) return true;
                  const q = manageEmpSearch.toLowerCase();
                  return (
                    emp.name.toLowerCase().includes(q) ||
                    (emp.phone && emp.phone.toLowerCase().includes(q)) ||
                    emp.role.toLowerCase().includes(q)
                  );
                })
                .map((emp) => (
                  <div
                    key={emp.id}
                    className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                          {emp.role}
                        </span>
                        <span className="text-xs font-mono text-slate-400">{emp.phone || 'No HP -'}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-100 text-sm mt-1">{emp.name}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                        <span>Gaji Pokok: <strong className="text-slate-200 font-mono">{formatRupiah(emp.dailyBaseSalary)}</strong> / hari</span>
                        <span>Komisi Jasa: <strong className="text-amber-400 font-bold">{emp.commissionRateLabor}%</strong></span>
                        {emp.bankInfo && <span className="italic">💳 {emp.bankInfo}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsManageEmpModalOpen(false);
                          handleOpenEmpModal(emp);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Apakah Anda yakin ingin menghapus pegawai "${emp.name}"?\nCatatan: Riwayat pengerjaan servis & komisi terdahulu tetap tersimpan.`)) {
                            onDeleteEmployee(emp.id);
                            if (filterEmployeeId === emp.id) setFilterEmployeeId('ALL');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-600 text-red-400 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-red-500/30 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                type="button"
                onClick={() => setIsManageEmpModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
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
