import React, { useEffect, useState } from 'react';
import {
  AppNotification,
  Customer,
  Employee,
  EmployeeLoan,
  PayrollRecord,
  PresetLabor,
  ServiceOrder,
  ShopSettings,
  Sparepart,
  SyncStatus,
  UserAccount,
  WholesaleCustomer,
} from './types';
import {
  clearAllNotifications,
  dismissSingleNotification,
  generateLiveNotifications,
  getAuthSession,
  getCustomers,
  getEmployees,
  getEmployeeLoans,
  getPayrollRecords,
  getPresetLabors,
  getServiceOrders,
  getShopSettings,
  getSpareparts,
  getUserAccounts,
  getWholesaleCustomers,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  resetAllDataToDefault,
  clearAllServiceAndSalesOrders,
  saveAuthSession,
  clearAuthSession,
  saveCustomers,
  saveEmployees,
  savePayrollRecords,
  savePresetLabors,
  saveServiceOrders,
  saveShopSettings,
  saveSpareparts,
  saveUserAccounts,
  saveWholesaleCustomers,
  syncCustomerFromOrder,
} from './lib/storage';
import {
  COLLECTIONS,
  seedInitialFirestoreDataIfEmpty,
  subscribeCollection,
  subscribeDoc,
  syncAllLocalDataToFirestore,
  saveSettingsFirestore,
  saveUserAccountFirestore,
  savePresetLaborFirestore,
} from './lib/firestoreService';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { logoutUser, subscribeAuthState } from './services/authService';
import {
  saveServiceOrderAtomic,
  cancelServiceOrderAtomic,
  processOrderReturnAtomic,
  deleteServiceOrderAtomic,
  ProcessReturnInput,
  ProcessReturnResult,
} from './services/transactionService';
import {
  adjustStockAtomic,
  purchaseStockAtomic,
} from './services/stockService';
import {
  saveCustomer,
  deleteCustomer as removeCustomer,
  saveWholesaleCustomer,
  deleteWholesaleCustomer as removeWholesaleCustomer,
} from './services/customerService';
import {
  saveEmployee,
  deleteEmployee as removeEmployee,
  saveEmployeeLoan,
  deleteEmployeeLoan as removeEmployeeLoan,
  savePayrollRecord,
  deletePayrollRecord as removePayrollRecord,
} from './services/payrollService';

import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { ServiceManagementView } from './components/ServiceManagementView';
import { SparepartInventoryView } from './components/SparepartInventoryView';
import { CustomerManagementView } from './components/CustomerManagementView';
import { PayrollView } from './components/PayrollView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { ThermalPrintModal } from './components/ThermalPrintModal';

export default function App() {
  // Auth Session & Multi User State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(getAuthSession());
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(getUserAccounts());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(navigator.onLine ? 'SYNCED' : 'OFFLINE');

  const [activeTab, setActiveTab] = useState<string>(() => {
    const session = getAuthSession();
    if (session) {
      return session.allowedTabs.includes('dashboard') ? 'dashboard' : session.allowedTabs[0] || 'services';
    }
    return 'services';
  });

  // Core Data States
  const [settings, setSettings] = useState<ShopSettings>(getShopSettings());
  const [orders, setOrders] = useState<ServiceOrder[]>(getServiceOrders());
  const [spareparts, setSpareparts] = useState<Sparepart[]>(getSpareparts());
  const [employees, setEmployees] = useState<Employee[]>(getEmployees());
  const [employeeLoans, setEmployeeLoans] = useState<EmployeeLoan[]>(() => getEmployeeLoans());
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(getPayrollRecords());
  const [presetLabors, setPresetLabors] = useState<PresetLabor[]>(getPresetLabors());
  const [customers, setCustomers] = useState<Customer[]>(getCustomers());
  const [wholesaleCustomers, setWholesaleCustomers] = useState<WholesaleCustomer[]>(() => getWholesaleCustomers());
  const [selectedWholesaleForSale, setSelectedWholesaleForSale] = useState<WholesaleCustomer | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>(generateLiveNotifications());

  // Thermal Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printOrder, setPrintOrder] = useState<ServiceOrder | null>(null);
  const [printPayroll, setPrintPayroll] = useState<PayrollRecord | null>(null);
  const [printEmployee, setPrintEmployee] = useState<Employee | null>(null);
  const [printType, setPrintType] = useState<'RECEIPT' | 'WORK_ORDER' | 'PAYROLL_SLIP'>('RECEIPT');

  // Trigger New Service & Direct Sale Modal from Header
  const [openCreateServiceFlag, setOpenCreateServiceFlag] = useState(false);
  const [openDirectSaleFlag, setOpenDirectSaleFlag] = useState(false);

  // Online / Offline Network Listeners
  useEffect(() => {
    const handleOnline = () => setSyncStatus('SYNCED');
    const handleOffline = () => setSyncStatus('OFFLINE');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // One-time cleanup effect to ensure any previously loaded demo/mock service orders are cleared
  useEffect(() => {
    const raw = localStorage.getItem('joyoboyo_service_orders_v1');
    const rawArch = localStorage.getItem('joyoboyo_archived_service_orders_v1');
    let needsPurge = false;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.some((o: any) => o.id?.startsWith('SRV-20260723-') || o.id === 'SRV-20260722-010')) {
          needsPurge = true;
        }
      } catch (e) {}
    }
    if (rawArch) {
      try {
        const parsedArch = JSON.parse(rawArch);
        if (parsedArch.some((o: any) => o.id?.startsWith('SRV-20260723-') || o.id === 'SRV-20260722-010')) {
          needsPurge = true;
        }
      } catch (e) {}
    }
    if (needsPurge) {
      clearAllServiceAndSalesOrders();
      setOrders([]);
    }
  }, []);

  // Firebase Auth Observer
  useEffect(() => {
    const unsubAuth = subscribeAuthState((account) => {
      if (account) {
        setCurrentUser((prev) => {
          if (prev && prev.id === account.id && prev.role === account.role && prev.name === account.name) {
            return prev;
          }
          return account;
        });
        saveAuthSession(account);
      }
    });
    return () => unsubAuth();
  }, []);

  // Initialize Firestore listeners and seed initial data
  useEffect(() => {
    // 1. Settings doc is public read, always subscribe
    const unsubSettings = subscribeDoc<ShopSettings>(
      COLLECTIONS.SETTINGS,
      'current',
      (data) => {
        if (data) {
          setSettings(data);
          saveShopSettings(data);
        }
      }
    );

    // If user is not authenticated yet, do not query protected collections
    if (!currentUser) {
      return () => {
        unsubSettings();
      };
    }

    // 2. Seed initial data if Firestore is fresh
    seedInitialFirestoreDataIfEmpty();

    // 3. Real-time Listeners for authenticated session
    const unsubSpareparts = subscribeCollection<Sparepart>(
      COLLECTIONS.SPAREPARTS,
      (data) => {
        if (data && data.length > 0) {
          setSpareparts(data);
          saveSpareparts(data);
        }
      }
    );

    const unsubOrders = subscribeCollection<ServiceOrder>(
      COLLECTIONS.SERVICE_ORDERS,
      (data) => {
        if (data) {
          setOrders(data);
          saveServiceOrders(data);
        }
      }
    );

    const unsubCustomers = subscribeCollection<Customer>(
      COLLECTIONS.CUSTOMERS,
      (data) => {
        if (data) {
          setCustomers(data);
          saveCustomers(data);
        }
      }
    );

    const unsubWholesale = subscribeCollection<WholesaleCustomer>(
      COLLECTIONS.WHOLESALE_CUSTOMERS,
      (data) => {
        if (data) {
          setWholesaleCustomers(data);
          saveWholesaleCustomers(data);
        }
      }
    );

    const unsubLabors = subscribeCollection<PresetLabor>(
      COLLECTIONS.PRESET_LABORS,
      (data) => {
        if (data && data.length > 0) {
          setPresetLabors(data);
          savePresetLabors(data);
        }
      }
    );

    const unsubEmployees = subscribeCollection<Employee>(
      COLLECTIONS.EMPLOYEES,
      (data) => {
        if (data && data.length > 0) {
          setEmployees(data);
          saveEmployees(data);
        }
      }
    );

    const unsubLoans = subscribeCollection<EmployeeLoan>(
      COLLECTIONS.EMPLOYEE_LOANS,
      (data) => {
        if (data) {
          setEmployeeLoans(data);
        }
      }
    );

    const unsubPayroll = subscribeCollection<PayrollRecord>(
      COLLECTIONS.PAYROLL_RECORDS,
      (data) => {
        if (data) {
          setPayrollRecords(data);
          savePayrollRecords(data);
        }
      }
    );

    const unsubUsers = subscribeCollection<UserAccount>(
      COLLECTIONS.USERS,
      (data) => {
        if (data && data.length > 0) {
          setUserAccounts(data);
          saveUserAccounts(data);
        }
      }
    );

    return () => {
      unsubSpareparts();
      unsubOrders();
      unsubCustomers();
      unsubWholesale();
      unsubLabors();
      unsubEmployees();
      unsubLoans();
      unsubPayroll();
      unsubUsers();
      unsubSettings();
    };
  }, [currentUser?.id]);

  // Enforce access control on tab switching
  useEffect(() => {
    if (!currentUser) return;
    const allowed = Array.isArray(currentUser.allowedTabs) && currentUser.allowedTabs.length > 0
      ? currentUser.allowedTabs
      : (currentUser.role === 'admin'
          ? ['dashboard', 'services', 'spareparts', 'customers', 'payroll', 'reports', 'settings']
          : ['services', 'customers', 'spareparts']);
    if (!allowed.includes(activeTab)) {
      const fallbackTab = allowed[0] || 'services';
      if (fallbackTab !== activeTab) {
        setActiveTab(fallbackTab);
      }
    }
  }, [currentUser?.id, currentUser?.role, currentUser?.allowedTabs?.join(','), activeTab]);

  // Auto generate notifications on state changes (Live synchronization with real data)
  useEffect(() => {
    setNotifications(generateLiveNotifications({ spareparts, orders, customers }));
  }, [orders, spareparts, customers]);

  // Sync state data to localStorage before unload
  useEffect(() => {
    const handleUnload = () => {
      saveShopSettings(settings);
      saveServiceOrders(orders);
      saveSpareparts(spareparts);
      saveEmployees(employees);
      savePayrollRecords(payrollRecords);
      savePresetLabors(presetLabors);
      saveCustomers(customers);
      saveWholesaleCustomers(wholesaleCustomers);
      saveUserAccounts(userAccounts);
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [
    settings,
    orders,
    spareparts,
    employees,
    payrollRecords,
    presetLabors,
    customers,
    wholesaleCustomers,
    userAccounts,
  ]);

  // Auth Handlers
  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    saveAuthSession(user);
    const initialTab = user.allowedTabs.includes('dashboard') ? 'dashboard' : user.allowedTabs[0] || 'services';
    setActiveTab(initialTab);
  };

  const handleLogout = async () => {
    await logoutUser(currentUser);
    setCurrentUser(null);
    saveAuthSession(null);
  };

  const handleUpdateUsers = (updatedUsers: UserAccount[]) => {
    setUserAccounts(updatedUsers);
    saveUserAccounts(updatedUsers);
    if (currentUser) {
      const refreshedSelf = updatedUsers.find((u) => u.id === currentUser.id || u.role === currentUser.role);
      if (refreshedSelf) {
        setCurrentUser(refreshedSelf);
        saveAuthSession(refreshedSelf);
      }
    }
  };

  // Sync / Refresh helper
  const reloadAllData = () => {
    const s = getShopSettings();
    const o = getServiceOrders();
    const sp = getSpareparts();
    const e = getEmployees();
    const el = getEmployeeLoans();
    const p = getPayrollRecords();
    const pl = getPresetLabors();
    const c = getCustomers();
    setSettings(s);
    setOrders(o);
    setSpareparts(sp);
    setEmployees(e);
    setEmployeeLoans(el);
    setPayrollRecords(p);
    setPresetLabors(pl);
    setCustomers(c);
    setNotifications(generateLiveNotifications({ spareparts: sp, orders: o, customers: c }));
  };

  // --- Handlers for Service Orders ---
  const handleSaveOrder = async (order: ServiceOrder) => {
    setSyncStatus('SYNCING');
    try {
      const prevOrder = orders.find((o) => o.id === order.id) || null;
      const res = await saveServiceOrderAtomic(order, currentUser, prevOrder);

      // Auto update local list
      const existingIdx = orders.findIndex((o) => o.id === res.order.id);
      let updatedOrders: ServiceOrder[];
      if (existingIdx >= 0) {
        updatedOrders = [...orders];
        updatedOrders[existingIdx] = res.order;
      } else {
        updatedOrders = [res.order, ...orders];
      }
      setOrders(updatedOrders);
      saveServiceOrders(updatedOrders);

      // Sync customer profile
      syncCustomerFromOrder(res.order);
      const updatedCusts = getCustomers();
      setCustomers(updatedCusts);

      setSyncStatus('SYNCED');
    } catch (err: any) {
      console.error('Save order error:', err);
      setSyncStatus('ERROR');
      alert(`Gagal menyimpan nota: ${err.message || 'Terjadi kesalahan'}`);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus permanen nota ini dari database?')) {
      return;
    }
    setSyncStatus('SYNCING');
    try {
      await deleteServiceOrderAtomic(id, currentUser);
      const updated = orders.filter((o) => o.id !== id);
      setOrders(updated);
      saveServiceOrders(updated);
      setSyncStatus('SYNCED');
    } catch (err: any) {
      console.error('Delete order error:', err);
      setSyncStatus('ERROR');
      alert(err.message || 'Gagal menghapus nota');
    }
  };

  const handleCancelOrder = async (orderId: string, reason: string) => {
    setSyncStatus('SYNCING');
    try {
      const res = await cancelServiceOrderAtomic(orderId, reason, currentUser);
      alert(res.message);
      setSyncStatus('SYNCED');
    } catch (err: any) {
      console.error('Cancel order error:', err);
      setSyncStatus('ERROR');
      alert(err.message || 'Gagal membatalkan nota');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: ServiceOrder['status']) => {
    const existing = orders.find((o) => o.id === orderId);
    if (!existing) return;

    if (newStatus === 'BATAL') {
      const reason = window.prompt('Masukkan alasan pembatalan nota:', 'Pelanggan membatalkan servis');
      if (reason) {
        await handleCancelOrder(orderId, reason);
      }
      return;
    }

    const updatedOrder: ServiceOrder = {
      ...existing,
      status: newStatus,
      completedAt: newStatus === 'SELESAI' || newStatus === 'LUNAS' ? new Date().toISOString() : existing.completedAt,
      paymentStatus: newStatus === 'LUNAS' ? 'LUNAS' : existing.paymentStatus,
    };
    await handleSaveOrder(updatedOrder);
  };

  // --- Handlers for Returns & Restocking ---
  const handleProcessReturn = async (input: ProcessReturnInput): Promise<ProcessReturnResult> => {
    setSyncStatus('SYNCING');
    try {
      const result = await processOrderReturnAtomic({ ...input, user: currentUser });
      if (result.success && result.updatedOrder) {
        const updatedOrders = orders.map((o) => (o.id === result.updatedOrder!.id ? result.updatedOrder! : o));
        setOrders(updatedOrders);
        saveServiceOrders(updatedOrders);

        // Update spareparts stock in state immediately
        const lastReturnRecord = result.updatedOrder.returnHistory?.[result.updatedOrder.returnHistory.length - 1];
        if (lastReturnRecord?.items && lastReturnRecord.items.length > 0) {
          const updatedParts = [...spareparts];
          lastReturnRecord.items.forEach((item) => {
            const idx = updatedParts.findIndex((p) => p.id === item.partId);
            if (idx >= 0) {
              updatedParts[idx] = {
                ...updatedParts[idx],
                stock: (updatedParts[idx].stock || 0) + item.qty,
              };
            }
          });
          setSpareparts(updatedParts);
          saveSpareparts(updatedParts);
        }
      }
      setSyncStatus('SYNCED');
      return result;
    } catch (err: any) {
      console.error('Process return error:', err);
      setSyncStatus('ERROR');
      return {
        success: false,
        message: err.message || 'Gagal memproses retur barang.',
        totalRefund: 0,
      };
    }
  };

  // --- Handlers for Spareparts ---
  const handleSaveSparepart = async (part: Sparepart) => {
    setSyncStatus('SYNCING');
    try {
      const existingIdx = spareparts.findIndex((p) => p.id === part.id);
      let updated: Sparepart[];
      if (existingIdx >= 0) {
        updated = [...spareparts];
        updated[existingIdx] = part;
      } else {
        updated = [part, ...spareparts];
      }
      setSpareparts(updated);
      saveSpareparts(updated);
      setSyncStatus('SYNCED');
    } catch (err) {
      setSyncStatus('ERROR');
    }
  };

  const handleDeleteSparepart = async (id: string) => {
    setSyncStatus('SYNCING');
    try {
      const updated = spareparts.filter((p) => p.id !== id);
      setSpareparts(updated);
      saveSpareparts(updated);
      setSyncStatus('SYNCED');
    } catch (err) {
      setSyncStatus('ERROR');
    }
  };

  const handleAdjustStock = async (partId: string, newStock: number, reason: string) => {
    setSyncStatus('SYNCING');
    try {
      const res = await adjustStockAtomic({
        partId,
        newStock,
        reason,
        user: currentUser,
      });
      alert(res.message);
      setSyncStatus('SYNCED');
    } catch (err: any) {
      console.error('Adjust stock error:', err);
      setSyncStatus('ERROR');
      alert(`Gagal menyesuaikan stok: ${err.message || 'Error'}`);
    }
  };

  // --- Handlers for Customers ---
  const handleSaveCustomer = async (cust: Customer) => {
    setSyncStatus('SYNCING');
    try {
      const saved = await saveCustomer(cust, currentUser);
      const idx = customers.findIndex((c) => c.id === saved.id);
      let updated: Customer[];
      if (idx >= 0) {
        updated = [...customers];
        updated[idx] = saved;
      } else {
        updated = [saved, ...customers];
      }
      setCustomers(updated);
      saveCustomers(updated);
      setSyncStatus('SYNCED');
    } catch (err: any) {
      console.error('Save customer error:', err);
      setSyncStatus('ERROR');
      alert(err.message || 'Gagal menyimpan pelanggan');
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus data pelanggan ini?')) return;
    setSyncStatus('SYNCING');
    try {
      await removeCustomer(id, currentUser);
      const updated = customers.filter((c) => c.id !== id);
      setCustomers(updated);
      saveCustomers(updated);
      setSyncStatus('SYNCED');
    } catch (err: any) {
      setSyncStatus('ERROR');
      alert(err.message || 'Gagal menghapus pelanggan');
    }
  };

  // --- Handlers for Wholesale Customers ---
  const handleSaveWholesaleCustomer = async (cust: WholesaleCustomer) => {
    setSyncStatus('SYNCING');
    try {
      const saved = await saveWholesaleCustomer(cust, currentUser);
      const idx = wholesaleCustomers.findIndex((c) => c.id === saved.id);
      let updated: WholesaleCustomer[];
      if (idx >= 0) {
        updated = [...wholesaleCustomers];
        updated[idx] = saved;
      } else {
        updated = [saved, ...wholesaleCustomers];
      }
      setWholesaleCustomers(updated);
      saveWholesaleCustomers(updated);
      setSyncStatus('SYNCED');
    } catch (err: any) {
      setSyncStatus('ERROR');
      alert(err.message || 'Gagal menyimpan data grosir');
    }
  };

  const handleDeleteWholesaleCustomer = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus langganan grosir ini?')) return;
    setSyncStatus('SYNCING');
    try {
      await removeWholesaleCustomer(id, currentUser);
      const updated = wholesaleCustomers.filter((c) => c.id !== id);
      setWholesaleCustomers(updated);
      saveWholesaleCustomers(updated);
      setSyncStatus('SYNCED');
    } catch (err: any) {
      setSyncStatus('ERROR');
      alert(err.message || 'Gagal menghapus pelanggan grosir');
    }
  };

  const handleOpenWholesaleSale = (cust: WholesaleCustomer) => {
    setSelectedWholesaleForSale(cust);
    setActiveTab('services');
  };

  // --- Handlers for Preset Labors ---
  const handleSavePresetLabors = (updatedLabors: PresetLabor[]) => {
    savePresetLabors(updatedLabors);
    setPresetLabors(updatedLabors);
    updatedLabors.forEach((pl) => {
      savePresetLaborFirestore(pl).catch(console.warn);
    });
  };

  // --- Handlers for Employees ---
  const handleSaveEmployee = async (emp: Employee) => {
    setSyncStatus('SYNCING');
    try {
      const saved = await saveEmployee(emp, currentUser);
      const idx = employees.findIndex((e) => e.id === saved.id);
      let updated: Employee[];
      if (idx >= 0) {
        updated = [...employees];
        updated[idx] = saved;
      } else {
        updated = [saved, ...employees];
      }
      setEmployees(updated);
      saveEmployees(updated);
      setSyncStatus('SYNCED');
    } catch (err: any) {
      setSyncStatus('ERROR');
      alert(err.message || 'Gagal menyimpan pegawai');
    }
  };

  const handleDeleteEmp = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus pegawai ini?')) return;
    setSyncStatus('SYNCING');
    try {
      await removeEmployee(id, currentUser);
      const updated = employees.filter((e) => e.id !== id);
      setEmployees(updated);
      saveEmployees(updated);
      setSyncStatus('SYNCED');
    } catch (err: any) {
      setSyncStatus('ERROR');
      alert(err.message || 'Gagal menghapus pegawai');
    }
  };

  // --- Handlers for Payroll ---
  const handleSavePayrollRecord = async (record: PayrollRecord) => {
    setSyncStatus('SYNCING');
    try {
      const saved = await savePayrollRecord(record, currentUser);
      const idx = payrollRecords.findIndex((p) => p.id === saved.id);
      let updated: PayrollRecord[];
      if (idx >= 0) {
        updated = [...payrollRecords];
        updated[idx] = saved;
      } else {
        updated = [saved, ...payrollRecords];
      }
      setPayrollRecords(updated);
      savePayrollRecords(updated);
      setSyncStatus('SYNCED');
    } catch (err: any) {
      setSyncStatus('ERROR');
      alert(err.message || 'Gagal menyimpan slip gaji');
    }
  };

  const handleSaveEmployeeLoan = async (loan: EmployeeLoan) => {
    setSyncStatus('SYNCING');
    try {
      const saved = await saveEmployeeLoan(loan, currentUser);
      const idx = employeeLoans.findIndex((l) => l.id === saved.id);
      let updated: EmployeeLoan[];
      if (idx >= 0) {
        updated = [...employeeLoans];
        updated[idx] = saved;
      } else {
        updated = [saved, ...employeeLoans];
      }
      setEmployeeLoans(updated);
      setSyncStatus('SYNCED');
    } catch (err: any) {
      setSyncStatus('ERROR');
      alert(err.message || 'Gagal menyimpan kasbon');
    }
  };

  const handleDeleteEmployeeLoan = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus catatan kasbon ini?')) return;
    setSyncStatus('SYNCING');
    try {
      await removeEmployeeLoan(id, currentUser);
      const updated = employeeLoans.filter((l) => l.id !== id);
      setEmployeeLoans(updated);
      setSyncStatus('SYNCED');
    } catch (err: any) {
      setSyncStatus('ERROR');
      alert(err.message || 'Gagal menghapus kasbon');
    }
  };

  // --- Handlers for Settings ---
  const handleSaveSettings = (newSettings: ShopSettings) => {
    saveShopSettings(newSettings);
    setSettings(newSettings);
    saveSettingsFirestore(newSettings).catch(console.warn);
  };

  const handleSyncAllToCloud = async () => {
    setSyncStatus('SYNCING');
    const res = await syncAllLocalDataToFirestore({
      settings,
      users: userAccounts,
      spareparts,
      orders,
      customers,
      wholesaleCustomers,
      presetLabors,
      employees,
      employeeLoans,
      payrollRecords,
    });
    setSyncStatus(res.success ? 'SYNCED' : 'ERROR');
    return res;
  };

  const handleResetData = () => {
    resetAllDataToDefault();
    reloadAllData();
    alert('Data berhasil direset ke sampel bawaan Bengkel Motor Joyoboyo Yuwana!');
  };

  const handleClearTransactions = async () => {
    setSyncStatus('SYNCING');
    try {
      clearAllServiceAndSalesOrders();
      setOrders([]);
      const freshNotifs = generateLiveNotifications({ spareparts, orders: [], customers });
      setNotifications(freshNotifs);
      setSyncStatus('SYNCED');
    } catch (err: any) {
      console.error('Failed to clear transactions:', err);
      setSyncStatus('ERROR');
      throw err;
    }
  };

  // --- Handlers for Notifications ---
  const handleMarkNotifRead = (id: string) => {
    const updated = markNotificationAsRead(id);
    setNotifications(updated);
  };

  const handleMarkAllNotifsRead = () => {
    const updated = markAllNotificationsAsRead();
    setNotifications(updated);
  };

  const handleDismissNotif = (id: string) => {
    const updated = dismissSingleNotification(id);
    setNotifications(updated);
  };

  const handleClearAllNotifs = () => {
    const updated = clearAllNotifications();
    setNotifications(updated);
  };

  // --- Print Trigger Helpers ---
  const handleTriggerOrderPrint = (
    order: ServiceOrder,
    type: 'RECEIPT' | 'WORK_ORDER' = 'RECEIPT'
  ) => {
    setPrintOrder(order);
    setPrintPayroll(null);
    setPrintEmployee(null);
    setPrintType(type);
    setIsPrintModalOpen(true);
  };

  const handleTriggerPayrollPrint = (record: PayrollRecord, emp: Employee) => {
    setPrintPayroll(record);
    setPrintEmployee(emp);
    setPrintOrder(null);
    setPrintType('PAYROLL_SLIP');
    setIsPrintModalOpen(true);
  };

  // Header quick actions
  const handleHeaderNewService = () => {
    setActiveTab('services');
    setOpenCreateServiceFlag(true);
  };

  const handleHeaderDirectSale = () => {
    setActiveTab('services');
    setOpenDirectSaleFlag(true);
  };

  // Low stock count for badge
  const lowStockCount = spareparts.filter((p) => p.stock <= p.minStock).length;
  // Pending services count for badge
  const pendingCount = orders.filter((o) => o.status === 'MENUNGGU' || o.status === 'PROSES').length;

  // Render Login View if user is not authenticated
  if (!currentUser) {
    return (
      <LoginView
        settings={settings}
        users={userAccounts}
        onLogin={handleLogin}
        onUpdateUsers={handleUpdateUsers}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-800 font-sans antialiased selection:bg-orange-500 selection:text-white">
      {/* Top Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setOpenCreateServiceFlag(false);
          setOpenDirectSaleFlag(false);
        }}
        settings={settings}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNewServiceClick={handleHeaderNewService}
        onDirectSaleClick={handleHeaderDirectSale}
        lowStockCount={lowStockCount}
        pendingServicesCount={pendingCount}
        notifications={notifications}
        onMarkNotifRead={handleMarkNotifRead}
        onMarkAllNotifsRead={handleMarkAllNotifsRead}
        onDismissNotif={handleDismissNotif}
        onClearAllNotifs={handleClearAllNotifs}
        syncStatus={syncStatus}
        onTriggerSync={handleSyncAllToCloud}
      />

      {/* Main View Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && currentUser.allowedTabs.includes('dashboard') && (
          <DashboardView
            orders={orders}
            spareparts={spareparts}
            employees={employees}
            settings={settings}
            onNewService={handleHeaderNewService}
            onNavigateTab={setActiveTab}
            onPrintOrder={handleTriggerOrderPrint}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onRestockPart={() => {
              setActiveTab('spareparts');
            }}
          />
        )}

        {activeTab === 'services' && currentUser.allowedTabs.includes('services') && (
          <ServiceManagementView
            orders={orders}
            spareparts={spareparts}
            employees={employees}
            presetLabors={presetLabors}
            settings={settings}
            onSaveOrder={handleSaveOrder}
            onDeleteOrder={handleDeleteOrder}
            onPrintOrder={handleTriggerOrderPrint}
            onProcessReturn={handleProcessReturn}
            initialCreateOpen={openCreateServiceFlag}
            initialDirectSaleOpen={openDirectSaleFlag}
            onRefreshOrders={reloadAllData}
            wholesaleCustomerForDirectSale={selectedWholesaleForSale}
            onClearWholesaleCustomerForDirectSale={() => setSelectedWholesaleForSale(null)}
          />
        )}

        {activeTab === 'spareparts' && currentUser.allowedTabs.includes('spareparts') && (
          <SparepartInventoryView
            spareparts={spareparts}
            onSaveSparepart={handleSaveSparepart}
            onDeleteSparepart={handleDeleteSparepart}
            onAdjustStock={(partId, delta) => {
              const part = spareparts.find((p) => p.id === partId);
              if (part) {
                const targetStock = Math.max(0, part.stock + delta);
                handleAdjustStock(partId, targetStock, delta >= 0 ? `Restock manual +${delta}` : `Koreksi stok ${delta}`);
              }
            }}
          />
        )}

        {activeTab === 'customers' && currentUser.allowedTabs.includes('customers') && (
          <CustomerManagementView
            customers={customers}
            orders={orders}
            settings={settings}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            wholesaleCustomers={wholesaleCustomers}
            onSaveWholesaleCustomer={handleSaveWholesaleCustomer}
            onDeleteWholesaleCustomer={handleDeleteWholesaleCustomer}
            onOpenWholesaleSale={handleOpenWholesaleSale}
            onSaveOrder={handleSaveOrder}
          />
        )}

        {activeTab === 'payroll' && currentUser.allowedTabs.includes('payroll') && (
          <PayrollView
            employees={employees}
            payrollRecords={payrollRecords}
            employeeLoans={employeeLoans}
            orders={orders}
            settings={settings}
            onSaveEmployee={handleSaveEmployee}
            onDeleteEmployee={handleDeleteEmp}
            onSavePayrollRecord={handleSavePayrollRecord}
            onSaveEmployeeLoan={handleSaveEmployeeLoan}
            onDeleteEmployeeLoan={handleDeleteEmployeeLoan}
            onPrintPayroll={handleTriggerPayrollPrint}
          />
        )}

        {activeTab === 'reports' && currentUser.allowedTabs.includes('reports') && (
          <ReportsView
            orders={orders}
            spareparts={spareparts}
            employees={employees}
            payrollRecords={payrollRecords}
            settings={settings}
          />
        )}

        {activeTab === 'settings' && currentUser.allowedTabs.includes('settings') && (
          <SettingsView
            settings={settings}
            users={userAccounts}
            presetLabors={presetLabors}
            employees={employees}
            currentUser={currentUser}
            onSaveSettings={handleSaveSettings}
            onUpdateUsers={handleUpdateUsers}
            onSavePresetLabors={handleSavePresetLabors}
            onSaveEmployee={handleSaveEmployee}
            onDeleteEmployee={handleDeleteEmp}
            onResetData={handleResetData}
            onSyncAllToCloud={handleSyncAllToCloud}
            onClearTransactions={handleClearTransactions}
          />
        )}
      </main>

      {/* Thermal Printer Receipt Modal */}
      <ThermalPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        settings={settings}
        order={printOrder}
        payroll={printPayroll}
        employee={printEmployee}
        type={printType}
      />
    </div>
  );
}
