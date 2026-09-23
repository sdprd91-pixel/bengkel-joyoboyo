import {
  AppNotification,
  Customer,
  Employee,
  EmployeeLoan,
  PaymentMethod,
  PayrollRecord,
  PresetLabor,
  ReturnItemDetail,
  ReturnRecord,
  ServiceOrder,
  ShopSettings,
  Sparepart,
  WholesaleCustomer,
} from '../types';
import {
  DEFAULT_CUSTOMERS,
  DEFAULT_EMPLOYEES,
  DEFAULT_EMPLOYEE_LOANS,
  DEFAULT_PAYROLL_RECORDS,
  DEFAULT_PRESET_LABORS,
  DEFAULT_SERVICE_ORDERS,
  DEFAULT_SHOP_SETTINGS,
  DEFAULT_SPAREPARTS,
  DEFAULT_USER_ACCOUNTS,
  DEFAULT_WHOLESALE_CUSTOMERS,
} from '../data/mockData';
import { UserAccount } from '../types';
import {
  saveCustomerFirestore,
  deleteCustomerFirestore,
  saveEmployeeFirestore,
  deleteEmployeeFirestore,
  saveEmployeeLoanFirestore,
  deleteEmployeeLoanFirestore,
  savePayrollRecordFirestore,
  savePresetLaborFirestore,
  deletePresetLaborFirestore,
  saveServiceOrderFirestore,
  deleteServiceOrderFirestore,
  saveSettingsFirestore,
  saveSparepartFirestore,
  deleteSparepartFirestore,
  saveUserAccountFirestore,
  saveWholesaleCustomerFirestore,
  deleteWholesaleCustomerFirestore,
  saveNotificationFirestore,
  saveArchivedOrderFirestore,
  deleteArchivedOrderFirestore,
  clearAllServiceAndSalesOrdersFirestore,
} from './firestoreService';

const KEYS = {
  SETTINGS: 'joyoboyo_settings_v1',
  SERVICE_ORDERS: 'joyoboyo_service_orders_v1',
  ARCHIVED_SERVICE_ORDERS: 'joyoboyo_archived_service_orders_v1',
  LAST_AUTO_ARCHIVE_MONTH: 'joyoboyo_last_archive_month_v1',
  SPAREPARTS: 'joyoboyo_spareparts_v1',
  EMPLOYEES: 'joyoboyo_employees_v1',
  EMPLOYEE_LOANS: 'joyoboyo_employee_loans_v1',
  PAYROLL: 'joyoboyo_payroll_v1',
  PRESET_LABORS: 'joyoboyo_preset_labors_v1',
  CUSTOMERS: 'joyoboyo_customers_v1',
  WHOLESALE_CUSTOMERS: 'joyoboyo_wholesale_customers_v1',
  NOTIFICATIONS: 'joyoboyo_notifications_v1',
  USERS: 'joyoboyo_users_v1',
  AUTH_SESSION: 'joyoboyo_auth_session_v1',
};

// --- User Accounts & Authentication ---
export function getUserAccounts(): UserAccount[] {
  try {
    const raw = localStorage.getItem(KEYS.USERS);
    if (!raw) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USER_ACCOUNTS));
      return DEFAULT_USER_ACCOUNTS;
    }
    const accounts: UserAccount[] = JSON.parse(raw);
    // Ensure both roles exist and have allowedTabs
    if (!accounts.some((a) => a.role === 'kasir')) {
      accounts.push(DEFAULT_USER_ACCOUNTS[1] || DEFAULT_USER_ACCOUNTS[0]);
    }
    if (!accounts.some((a) => a.role === 'admin')) {
      accounts.push(DEFAULT_USER_ACCOUNTS[0]);
    }
    // Migration: ensure allowedTabs are correct
    accounts.forEach((acc) => {
      if (acc.role === 'kasir') {
        if (!acc.username) acc.username = 'kasir';
        if (!acc.allowedTabs || acc.allowedTabs.length === 0) acc.allowedTabs = ['services'];
      } else if (acc.role === 'admin') {
        if (!acc.username) acc.username = 'admin';
        if (!acc.allowedTabs || acc.allowedTabs.length === 0) {
          acc.allowedTabs = ['dashboard', 'services', 'spareparts', 'customers', 'payroll', 'reports', 'settings'];
        }
      }
    });
    return accounts;
  } catch (e) {
    console.error('Failed to load user accounts', e);
    return DEFAULT_USER_ACCOUNTS;
  }
}

export function saveUserAccounts(users: UserAccount[]): void {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  users.forEach((u) => {
    saveUserAccountFirestore(u).catch((err) =>
      console.warn('Failed saving user to Firestore:', err)
    );
  });
}

export function updateUserAccount(updatedUser: UserAccount): UserAccount[] {
  const users = getUserAccounts();
  const idx = users.findIndex((u) => u.id === updatedUser.id || u.role === updatedUser.role);
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...updatedUser };
  } else {
    users.push(updatedUser);
  }
  saveUserAccounts(users);
  return users;
}

export function getAuthSession(): UserAccount | null {
  try {
    const raw = localStorage.getItem(KEYS.AUTH_SESSION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read auth session', e);
    return null;
  }
}

export function saveAuthSession(user: UserAccount | null): void {
  if (user) {
    localStorage.setItem(KEYS.AUTH_SESSION, JSON.stringify(user));
  } else {
    localStorage.removeItem(KEYS.AUTH_SESSION);
  }
}

export function clearAuthSession(): void {
  localStorage.removeItem(KEYS.AUTH_SESSION);
}



// --- Shop Settings ---
export function getShopSettings(): ShopSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SHOP_SETTINGS));
      return DEFAULT_SHOP_SETTINGS;
    }
    const settings = JSON.parse(raw);
    // Auto migration if shopName was old default without Yuwanain Arso II
    if (settings.shopName && (settings.shopName.includes('YUWANA') || settings.shopName.includes('Yuwana')) && !settings.shopName.includes('YUWANAIN')) {
      settings.shopName = DEFAULT_SHOP_SETTINGS.shopName;
      settings.address = DEFAULT_SHOP_SETTINGS.address;
      settings.city = DEFAULT_SHOP_SETTINGS.city;
      saveShopSettings(settings);
    }
    if (!settings.ownerName) {
      settings.ownerName = DEFAULT_SHOP_SETTINGS.ownerName;
      saveShopSettings(settings);
    }
    if (!settings.logoUrl) {
      settings.logoUrl = DEFAULT_SHOP_SETTINGS.logoUrl;
      saveShopSettings(settings);
    }
    if (!settings.printerMode) {
      settings.printerMode = DEFAULT_SHOP_SETTINGS.printerMode || 'BROWSER';
      saveShopSettings(settings);
    }
    if (settings.feedLines === undefined) {
      settings.feedLines = DEFAULT_SHOP_SETTINGS.feedLines || 3;
      saveShopSettings(settings);
    }
    if (!settings.printWidthPreset) {
      settings.printWidthPreset = settings.paperWidth === '80mm' ? '72mm' : '38mm';
      saveShopSettings(settings);
    }
    if (!settings.printFontSize) {
      settings.printFontSize = settings.paperWidth === '80mm' ? '11px' : '9px';
      saveShopSettings(settings);
    }
    if (!settings.fontFamily) {
      settings.fontFamily = 'mono';
      saveShopSettings(settings);
    }
    if (!settings.printAlign) {
      settings.printAlign = 'center';
      saveShopSettings(settings);
    }
    if (!settings.leftMarginMm) {
      settings.leftMarginMm = '0mm';
      saveShopSettings(settings);
    }
    if (!settings.printScale) {
      settings.printScale = '90%';
      saveShopSettings(settings);
    }
    return settings;
  } catch (e) {
    console.error('Failed to load shop settings', e);
    return DEFAULT_SHOP_SETTINGS;
  }
}

export function saveShopSettings(settings: ShopSettings): void {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  saveSettingsFirestore(settings).catch((err) =>
    console.warn('Failed saving settings to Firestore:', err)
  );
}

// --- Service Orders & Archive ---
export function getArchivedServiceOrders(): ServiceOrder[] {
  try {
    const raw = localStorage.getItem(KEYS.ARCHIVED_SERVICE_ORDERS);
    if (!raw) return [];
    let parsed: ServiceOrder[] = JSON.parse(raw);
    const hasMock = parsed.some((o) => o.id.startsWith('SRV-20260723-') || o.id === 'SRV-20260722-010');
    if (hasMock) {
      parsed = parsed.filter((o) => !o.id.startsWith('SRV-20260723-') && o.id !== 'SRV-20260722-010');
      localStorage.setItem(KEYS.ARCHIVED_SERVICE_ORDERS, JSON.stringify(parsed));
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load archived service orders', e);
    return [];
  }
}

export function saveArchivedServiceOrders(archivedOrders: ServiceOrder[]): void {
  localStorage.setItem(KEYS.ARCHIVED_SERVICE_ORDERS, JSON.stringify(archivedOrders));
  archivedOrders.forEach((o) => {
    saveArchivedOrderFirestore(o).catch((err) =>
      console.warn('Failed saving archived order to Firestore:', err)
    );
  });
}

/**
 * Automatically archives service & sales orders created before current month YYYY-MM.
 * Clears past orders from active list ("mengosongkan list yang tampil").
 */
export function checkAndAutoArchiveServiceOrders(): { active: ServiceOrder[]; archived: ServiceOrder[] } {
  try {
    const rawActive = localStorage.getItem(KEYS.SERVICE_ORDERS);
    let activeList: ServiceOrder[] = rawActive ? JSON.parse(rawActive) : [];

    const rawArchived = localStorage.getItem(KEYS.ARCHIVED_SERVICE_ORDERS);
    let archivedList: ServiceOrder[] = rawArchived ? JSON.parse(rawArchived) : [];

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const remainingActive: ServiceOrder[] = [];
    const newlyArchived: ServiceOrder[] = [];

    activeList.forEach((order) => {
      const orderDateStr = order.createdAt || order.completedAt || new Date().toISOString();
      const orderYearMonth = orderDateStr.substring(0, 7);

      // Archive orders from previous months (e.g. < 2026-08)
      if (orderYearMonth < currentYearMonth) {
        newlyArchived.push(order);
      } else {
        remainingActive.push(order);
      }
    });

    if (newlyArchived.length > 0) {
      const archivedMap = new Map<string, ServiceOrder>();
      archivedList.forEach((o) => archivedMap.set(o.id, o));
      newlyArchived.forEach((o) => archivedMap.set(o.id, o));

      archivedList = Array.from(archivedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      saveArchivedServiceOrders(archivedList);
      saveServiceOrders(remainingActive);
      localStorage.setItem(KEYS.LAST_AUTO_ARCHIVE_MONTH, currentYearMonth);

      return { active: remainingActive, archived: archivedList };
    }

    return { active: activeList, archived: archivedList };
  } catch (e) {
    console.error('Failed auto archive service orders', e);
    const active = localStorage.getItem(KEYS.SERVICE_ORDERS);
    return {
      active: active ? JSON.parse(active) : [],
      archived: getArchivedServiceOrders(),
    };
  }
}

export function getServiceOrders(): ServiceOrder[] {
  try {
    const raw = localStorage.getItem(KEYS.SERVICE_ORDERS);
    if (!raw) {
      localStorage.setItem(KEYS.SERVICE_ORDERS, JSON.stringify([]));
      return [];
    }
    let parsed: ServiceOrder[] = JSON.parse(raw);
    const hasMockOrders = parsed.some(
      (o) => o.id.startsWith('SRV-20260723-') || o.id === 'SRV-20260722-010'
    );
    if (hasMockOrders) {
      parsed = parsed.filter(
        (o) => !o.id.startsWith('SRV-20260723-') && o.id !== 'SRV-20260722-010'
      );
      localStorage.setItem(KEYS.SERVICE_ORDERS, JSON.stringify(parsed));
    }
    const { active } = checkAndAutoArchiveServiceOrders();
    return active;
  } catch (e) {
    console.error('Failed to load service orders', e);
    return [];
  }
}

export function clearAllServiceAndSalesOrders(): void {
  localStorage.setItem(KEYS.SERVICE_ORDERS, JSON.stringify([]));
  localStorage.setItem(KEYS.ARCHIVED_SERVICE_ORDERS, JSON.stringify([]));
  clearAllServiceAndSalesOrdersFirestore().catch((err) =>
    console.warn('Failed clearing Firestore service orders:', err)
  );
}

export function saveServiceOrders(orders: ServiceOrder[]): void {
  localStorage.setItem(KEYS.SERVICE_ORDERS, JSON.stringify(orders));
  orders.forEach((o) => {
    saveServiceOrderFirestore(o).catch((err) =>
      console.warn('Failed saving order to Firestore:', err)
    );
  });
}

export function saveSingleServiceOrder(order: ServiceOrder): ServiceOrder[] {
  const orders = getServiceOrders();
  const idx = orders.findIndex((o) => o.id === order.id);
  if (idx >= 0) {
    orders[idx] = { ...order, updatedAt: new Date().toISOString() };
  } else {
    orders.unshift(order);
  }
  saveServiceOrders(orders);
  saveServiceOrderFirestore(idx >= 0 ? orders[idx] : order).catch((err) =>
    console.warn('Failed saving single order to Firestore:', err)
  );
  return orders;
}

export function deleteServiceOrder(id: string): ServiceOrder[] {
  const orders = getServiceOrders().filter((o) => o.id !== id);
  const archived = getArchivedServiceOrders().filter((o) => o.id !== id);
  localStorage.setItem(KEYS.SERVICE_ORDERS, JSON.stringify(orders));
  localStorage.setItem(KEYS.ARCHIVED_SERVICE_ORDERS, JSON.stringify(archived));
  deleteServiceOrderFirestore(id).catch((err) =>
    console.warn('Failed deleting order from Firestore:', err)
  );
  deleteArchivedOrderFirestore(id).catch((err) =>
    console.warn('Failed deleting archived order from Firestore:', err)
  );
  return orders;
}

/**
 * Manually force archive all current active orders to reset/empty the active list
 */
export function forceArchiveCurrentOrders(): { active: ServiceOrder[]; archived: ServiceOrder[] } {
  const activeList = getServiceOrders();
  const existingArchived = getArchivedServiceOrders();

  const archivedMap = new Map<string, ServiceOrder>();
  existingArchived.forEach((o) => archivedMap.set(o.id, o));
  activeList.forEach((o) => archivedMap.set(o.id, o));

  const updatedArchived = Array.from(archivedMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  saveArchivedServiceOrders(updatedArchived);
  saveServiceOrders([]);

  return { active: [], archived: updatedArchived };
}

/**
 * Get all orders combined (Active + Archived) for complete multi-period searching
 */
export function getAllOrdersCombined(): ServiceOrder[] {
  const active = getServiceOrders();
  const archived = getArchivedServiceOrders();

  const map = new Map<string, ServiceOrder>();
  archived.forEach((o) => map.set(o.id, o));
  active.forEach((o) => map.set(o.id, o));

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// --- Spareparts ---
export function getSpareparts(): Sparepart[] {
  try {
    const raw = localStorage.getItem(KEYS.SPAREPARTS);
    if (!raw) {
      localStorage.setItem(KEYS.SPAREPARTS, JSON.stringify(DEFAULT_SPAREPARTS));
      return DEFAULT_SPAREPARTS;
    }
    const parts: Sparepart[] = JSON.parse(raw);
    // Migration: ensure every sparepart has a wholesalePrice
    let hasChanges = false;
    parts.forEach((p) => {
      if (p.wholesalePrice === undefined || p.wholesalePrice === null) {
        p.wholesalePrice = Math.round((p.sellPrice || 0) * 0.9);
        hasChanges = true;
      }
    });
    if (hasChanges) {
      saveSpareparts(parts);
    }
    return parts;
  } catch (e) {
    console.error('Failed to load spareparts', e);
    return DEFAULT_SPAREPARTS;
  }
}

export function saveSpareparts(parts: Sparepart[]): void {
  localStorage.setItem(KEYS.SPAREPARTS, JSON.stringify(parts));
  parts.forEach((p) => {
    saveSparepartFirestore(p).catch((err) =>
      console.warn('Failed saving sparepart to Firestore:', err)
    );
  });
}

export function saveSingleSparepart(part: Sparepart): Sparepart[] {
  const parts = getSpareparts();
  const idx = parts.findIndex((p) => p.id === part.id);
  const updatedPart = { ...part, lastUpdated: new Date().toISOString() };
  if (idx >= 0) {
    parts[idx] = updatedPart;
  } else {
    parts.unshift(updatedPart);
  }
  localStorage.setItem(KEYS.SPAREPARTS, JSON.stringify(parts));
  saveSparepartFirestore(updatedPart).catch((err) =>
    console.warn('Failed saving single sparepart to Firestore:', err)
  );
  return parts;
}

export function deleteSparepart(id: string): Sparepart[] {
  const parts = getSpareparts().filter((p) => p.id !== id);
  localStorage.setItem(KEYS.SPAREPARTS, JSON.stringify(parts));
  deleteSparepartFirestore(id).catch((err) =>
    console.warn('Failed deleting sparepart from Firestore:', err)
  );
  return parts;
}

export function adjustSparepartStock(partId: string, quantityDelta: number): boolean {
  const parts = getSpareparts();
  const idx = parts.findIndex((p) => p.id === partId);
  if (idx >= 0) {
    const newStock = parts[idx].stock + quantityDelta;
    if (newStock < 0) return false;
    parts[idx].stock = newStock;
    parts[idx].lastUpdated = new Date().toISOString();
    saveSingleSparepart(parts[idx]);
    return true;
  }
  return false;
}

export interface ProcessReturnInput {
  orderId: string;
  returnItems?: {
    partId: string;
    qty: number;
    reason: string;
  }[];
  items?: {
    partId: string;
    qty: number;
    reason: string;
  }[];
  refundPaymentMethod?: PaymentMethod;
  refundNotes?: string;
  processedBy?: string;
}

export interface ProcessReturnResult {
  success: boolean;
  message: string;
  updatedOrder?: ServiceOrder;
  updatedSpareparts?: Sparepart[];
  returnRecord?: ReturnRecord;
}

/**
 * Process return for items in a sales/service order.
 * Automatically adds the returned items back into spareparts inventory stock.
 */
export function processOrderReturn(input: ProcessReturnInput): ProcessReturnResult {
  try {
    const orders = getServiceOrders();
    const orderIdx = orders.findIndex((o) => o.id === input.orderId);
    if (orderIdx === -1) {
      return { success: false, message: `Nota dengan ID ${input.orderId} tidak ditemukan.` };
    }

    const order = { ...orders[orderIdx] };
    const spareparts = getSpareparts();
    const returnItemDetails: ReturnItemDetail[] = [];
    let totalRefund = 0;

    const returnTimestamp = new Date().toISOString();
    const returnRecordId = `RET-${returnTimestamp.substring(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const itemsToProcess = input.items || input.returnItems || [];

    // Process each return item
    itemsToProcess.forEach((req) => {
      if (req.qty <= 0) return;

      const partInOrderIndex = order.parts.findIndex((p) => p.partId === req.partId);
      if (partInOrderIndex === -1) return;

      const partInOrder = { ...order.parts[partInOrderIndex] };
      const alreadyReturned = partInOrder.returnedQty || 0;
      const maxReturnable = Math.max(0, partInOrder.qty - alreadyReturned);

      const actualReturnQty = Math.min(req.qty, maxReturnable);
      if (actualReturnQty <= 0) return;

      // 1. Update returnedQty on order item
      partInOrder.returnedQty = alreadyReturned + actualReturnQty;
      partInOrder.returnReason = req.reason || 'Retur Penjualan';
      partInOrder.returnDate = returnTimestamp;
      order.parts[partInOrderIndex] = partInOrder;

      // 2. Calculate refund for this part
      const refundSubtotal = partInOrder.sellPrice * actualReturnQty;
      totalRefund += refundSubtotal;

      returnItemDetails.push({
        partId: partInOrder.partId,
        partCode: partInOrder.code,
        partName: partInOrder.name,
        qty: actualReturnQty,
        sellPrice: partInOrder.sellPrice,
        refundSubtotal,
        reason: req.reason || 'Retur Penjualan',
      });

      // 3. Increment stock in spareparts master inventory (Kembali Bertambah Sesuai Jumlah Return)
      const spIdx = spareparts.findIndex((sp) => sp.id === req.partId);
      if (spIdx >= 0) {
        spareparts[spIdx].stock = (spareparts[spIdx].stock || 0) + actualReturnQty;
        spareparts[spIdx].lastUpdated = returnTimestamp;
        saveSingleSparepart(spareparts[spIdx]);
      }
    });

    if (returnItemDetails.length === 0) {
      return { success: false, message: 'Tidak ada item yang dipilih untuk diretur.' };
    }

    // 4. Create ReturnRecord
    const newReturnRecord: ReturnRecord = {
      id: returnRecordId,
      returnDate: returnTimestamp,
      items: returnItemDetails,
      totalRefund,
      refundPaymentMethod: input.refundPaymentMethod || 'TUNAI',
      refundNotes: input.refundNotes,
      processedBy: input.processedBy || 'Kasir Bengkel',
    };

    // Calculate net parts subtotal
    const netSubtotalParts = order.parts.reduce((sum, p) => {
      const remainingQty = Math.max(0, p.qty - (p.returnedQty || 0));
      return sum + p.sellPrice * remainingQty;
    }, 0);

    const subtotalLabor = (order.labors || []).reduce((sum, l) => sum + (l.price || 0), 0);
    const newTotalAmount = Math.max(0, subtotalLabor + netSubtotalParts - (order.discount || 0));

    const isAllPartsReturned = order.parts.length > 0 && order.parts.every((p) => (p.returnedQty || 0) >= p.qty);
    const isDirectSaleWithoutLabor = (order.labors || []).length === 0;
    const isFullyCancelled = isAllPartsReturned && (isDirectSaleWithoutLabor || subtotalLabor === 0);

    order.returnHistory = [...(order.returnHistory || []), newReturnRecord];
    order.totalRefund = (order.totalRefund || 0) + totalRefund;
    order.subtotalParts = netSubtotalParts;
    order.totalAmount = newTotalAmount;
    if (isFullyCancelled) {
      order.status = 'BATAL';
      order.paymentStatus = 'BELUM';
    }
    order.updatedAt = returnTimestamp;

    // Append return summary note to order notes
    const returnDateFormatted = new Date().toLocaleDateString('id-ID');
    const returnSummaryNote = `[RETUR ${returnDateFormatted}] ${returnItemDetails.map((i) => `${i.qty}x ${i.partName}`).join(', ')} (Refund: Rp ${totalRefund.toLocaleString('id-ID')})${isFullyCancelled ? ' [NOTA DIRETUR PENUH / BATAL]' : ''}`;
    order.notes = order.notes ? `${order.notes}\n${returnSummaryNote}` : returnSummaryNote;

    // Save updated order
    orders[orderIdx] = order;
    saveServiceOrders(orders);
    saveSingleServiceOrder(order);

    return {
      success: true,
      message: `Retur berhasil diproses! Stok ${returnItemDetails.map((i) => `${i.qty}x ${i.partName} (+${i.qty})`).join(', ')} otomatis bertambah kembali.${isFullyCancelled ? ' Nota otomatis dibatalkan / diretur penuh.' : ''}`,
      updatedOrder: order,
      updatedSpareparts: spareparts,
      returnRecord: newReturnRecord,
    };
  } catch (error: any) {
    console.error('Error processing order return:', error);
    return {
      success: false,
      message: `Gagal memproses retur: ${error?.message || 'Terjadi kesalahan sistem'}`,
    };
  }
}

// --- Employees ---
export function getEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(KEYS.EMPLOYEES);
    if (!raw) {
      localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(DEFAULT_EMPLOYEES));
      return DEFAULT_EMPLOYEES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load employees', e);
    return DEFAULT_EMPLOYEES;
  }
}

export function saveEmployees(employees: Employee[]): void {
  localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(employees));
  employees.forEach((emp) => {
    saveEmployeeFirestore(emp).catch((err) =>
      console.warn('Failed saving employee to Firestore:', err)
    );
  });
}

export function saveSingleEmployee(employee: Employee): Employee[] {
  const list = getEmployees();
  const idx = list.findIndex((e) => e.id === employee.id);
  if (idx >= 0) {
    list[idx] = employee;
  } else {
    list.unshift(employee);
  }
  localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
  saveEmployeeFirestore(employee).catch((err) =>
    console.warn('Failed saving single employee to Firestore:', err)
  );
  return list;
}

export function deleteEmployee(id: string): Employee[] {
  const list = getEmployees().filter((e) => e.id !== id);
  localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(list));
  deleteEmployeeFirestore(id).catch((err) =>
    console.warn('Failed deleting employee from Firestore:', err)
  );
  return list;
}

// --- Payroll Records ---
export function getPayrollRecords(): PayrollRecord[] {
  try {
    const raw = localStorage.getItem(KEYS.PAYROLL);
    if (!raw) {
      localStorage.setItem(KEYS.PAYROLL, JSON.stringify(DEFAULT_PAYROLL_RECORDS));
      return DEFAULT_PAYROLL_RECORDS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load payroll records', e);
    return DEFAULT_PAYROLL_RECORDS;
  }
}

export function savePayrollRecords(records: PayrollRecord[]): void {
  localStorage.setItem(KEYS.PAYROLL, JSON.stringify(records));
  records.forEach((r) => {
    savePayrollRecordFirestore(r).catch((err) =>
      console.warn('Failed saving payroll record to Firestore:', err)
    );
  });
}

export function saveSinglePayrollRecord(record: PayrollRecord): PayrollRecord[] {
  const list = getPayrollRecords();
  list.unshift(record);
  localStorage.setItem(KEYS.PAYROLL, JSON.stringify(list));
  savePayrollRecordFirestore(record).catch((err) =>
    console.warn('Failed saving payroll record to Firestore:', err)
  );
  return list;
}

// --- Employee Loans / Kasbon ---
export function getEmployeeLoans(): EmployeeLoan[] {
  try {
    const raw = localStorage.getItem(KEYS.EMPLOYEE_LOANS);
    if (!raw) {
      localStorage.setItem(KEYS.EMPLOYEE_LOANS, JSON.stringify(DEFAULT_EMPLOYEE_LOANS));
      return DEFAULT_EMPLOYEE_LOANS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load employee loans', e);
    return DEFAULT_EMPLOYEE_LOANS;
  }
}

export function saveEmployeeLoans(loans: EmployeeLoan[]): void {
  localStorage.setItem(KEYS.EMPLOYEE_LOANS, JSON.stringify(loans));
  loans.forEach((l) => {
    saveEmployeeLoanFirestore(l).catch((err) =>
      console.warn('Failed saving employee loan to Firestore:', err)
    );
  });
}

export function saveSingleEmployeeLoan(loan: EmployeeLoan): EmployeeLoan[] {
  const loans = getEmployeeLoans();
  loans.unshift(loan);
  localStorage.setItem(KEYS.EMPLOYEE_LOANS, JSON.stringify(loans));
  saveEmployeeLoanFirestore(loan).catch((err) =>
    console.warn('Failed saving employee loan to Firestore:', err)
  );
  return loans;
}

export function deleteEmployeeLoan(id: string): EmployeeLoan[] {
  const loans = getEmployeeLoans().filter((l) => l.id !== id);
  localStorage.setItem(KEYS.EMPLOYEE_LOANS, JSON.stringify(loans));
  deleteEmployeeLoanFirestore(id).catch((err) =>
    console.warn('Failed deleting employee loan from Firestore:', err)
  );
  return loans;
}

export function getEmployeeLoanBalance(employeeId: string): number {
  const loans = getEmployeeLoans().filter((l) => l.employeeId === employeeId);
  const totalBorrowed = loans
    .filter((l) => l.type === 'PINJAMAN')
    .reduce((sum, l) => sum + l.amount, 0);
  const totalRepaid = loans
    .filter((l) => l.type === 'CICILAN' || l.type === 'PELUNASAN' || l.type === 'POTONG_GAJI')
    .reduce((sum, l) => sum + l.amount, 0);
  return Math.max(0, totalBorrowed - totalRepaid);
}

// --- Preset Labors ---
export function getPresetLabors(): PresetLabor[] {
  try {
    const raw = localStorage.getItem(KEYS.PRESET_LABORS);
    if (!raw) {
      localStorage.setItem(KEYS.PRESET_LABORS, JSON.stringify(DEFAULT_PRESET_LABORS));
      return DEFAULT_PRESET_LABORS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_PRESET_LABORS;
  }
}

export function savePresetLabors(labors: PresetLabor[]): void {
  localStorage.setItem(KEYS.PRESET_LABORS, JSON.stringify(labors));
  labors.forEach((pl) => {
    savePresetLaborFirestore(pl).catch((err) =>
      console.warn('Failed saving preset labor to Firestore:', err)
    );
  });
}

// --- Customers Storage ---
export function getCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(KEYS.CUSTOMERS);
    if (!raw) {
      localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(DEFAULT_CUSTOMERS));
      return DEFAULT_CUSTOMERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load customers', e);
    return DEFAULT_CUSTOMERS;
  }
}

export function saveCustomers(customers: Customer[]): void {
  localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
  customers.forEach((c) => {
    saveCustomerFirestore(c).catch((err) =>
      console.warn('Failed saving customer to Firestore:', err)
    );
  });
}

export function saveSingleCustomer(customer: Customer): Customer[] {
  const list = getCustomers();
  const idx = list.findIndex((c) => c.id === customer.id);
  if (idx >= 0) {
    list[idx] = customer;
  } else {
    list.unshift(customer);
  }
  localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(list));
  saveCustomerFirestore(customer).catch((err) =>
    console.warn('Failed saving customer to Firestore:', err)
  );
  return list;
}

export function deleteCustomer(id: string): Customer[] {
  const list = getCustomers().filter((c) => c.id !== id);
  localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(list));
  deleteCustomerFirestore(id).catch((err) =>
    console.warn('Failed deleting customer from Firestore:', err)
  );
  return list;
}

// --- Wholesale Customers Storage ---
export function getWholesaleCustomers(): WholesaleCustomer[] {
  try {
    const raw = localStorage.getItem(KEYS.WHOLESALE_CUSTOMERS);
    if (!raw) {
      localStorage.setItem(KEYS.WHOLESALE_CUSTOMERS, JSON.stringify(DEFAULT_WHOLESALE_CUSTOMERS));
      return DEFAULT_WHOLESALE_CUSTOMERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load wholesale customers', e);
    return DEFAULT_WHOLESALE_CUSTOMERS;
  }
}

export function saveWholesaleCustomers(list: WholesaleCustomer[]): void {
  localStorage.setItem(KEYS.WHOLESALE_CUSTOMERS, JSON.stringify(list));
  list.forEach((w) => {
    saveWholesaleCustomerFirestore(w).catch((err) =>
      console.warn('Failed saving wholesale customer to Firestore:', err)
    );
  });
}

export function saveSingleWholesaleCustomer(customer: WholesaleCustomer): WholesaleCustomer[] {
  const list = getWholesaleCustomers();
  const idx = list.findIndex((c) => c.id === customer.id);
  if (idx >= 0) {
    list[idx] = customer;
  } else {
    list.unshift(customer);
  }
  localStorage.setItem(KEYS.WHOLESALE_CUSTOMERS, JSON.stringify(list));
  saveWholesaleCustomerFirestore(customer).catch((err) =>
    console.warn('Failed saving single wholesale customer to Firestore:', err)
  );
  return list;
}

export function deleteWholesaleCustomer(id: string): WholesaleCustomer[] {
  const list = getWholesaleCustomers().filter((c) => c.id !== id);
  localStorage.setItem(KEYS.WHOLESALE_CUSTOMERS, JSON.stringify(list));
  deleteWholesaleCustomerFirestore(id).catch((err) =>
    console.warn('Failed deleting wholesale customer from Firestore:', err)
  );
  return list;
}

// Automatically sync customer visit totals or vehicles whenever order is saved
export function syncCustomerFromOrder(order: ServiceOrder): void {
  const customers = getCustomers();
  let cust = customers.find(
    (c) => c.phone.trim() === order.customerPhone.trim() || c.name.toLowerCase() === order.customerName.toLowerCase()
  );

  const nowISO = new Date().toISOString();
  // calculate next due date (+60 days)
  const nextDueDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  if (cust) {
    // Update existing customer
    cust.totalVisits += 1;
    cust.totalSpent += order.totalAmount;
    const vIdx = cust.vehicles.findIndex((v) => v.plateNumber.toUpperCase() === order.plateNumber.toUpperCase());
    if (vIdx >= 0) {
      cust.vehicles[vIdx].lastServiceDate = order.completedAt || order.createdAt;
      cust.vehicles[vIdx].nextServiceDueDate = nextDueDate;
      if (order.motorModel) cust.vehicles[vIdx].motorModel = order.motorModel;
    } else {
      cust.vehicles.push({
        plateNumber: order.plateNumber,
        motorModel: order.motorModel,
        lastServiceDate: order.completedAt || order.createdAt,
        nextServiceDueDate: nextDueDate,
        notes: order.complaint,
      });
    }
    saveSingleCustomer(cust);
  } else {
    // Create new customer record automatically
    const newCust: Customer = {
      id: `CUST-${Date.now().toString().slice(-4)}`,
      name: order.customerName,
      phone: order.customerPhone,
      createdAt: nowISO,
      totalVisits: 1,
      totalSpent: order.totalAmount,
      vehicles: [
        {
          plateNumber: order.plateNumber,
          motorModel: order.motorModel,
          lastServiceDate: order.completedAt || order.createdAt,
          nextServiceDueDate: nextDueDate,
          notes: order.complaint,
        },
      ],
    };
    saveSingleCustomer(newCust);
  }
}

// --- Live Notifications Storage & Generator ---
const DISMISSED_NOTIFS_KEY = 'joyoboyo_dismissed_notifs_v1';

function getDismissedNotifIds(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_NOTIFS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveDismissedNotifIds(ids: string[]): void {
  localStorage.setItem(DISMISSED_NOTIFS_KEY, JSON.stringify(ids));
}

export function getStoredNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(KEYS.NOTIFICATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveStoredNotifications(notifs: AppNotification[]): void {
  localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifs));
}

export function generateLiveNotifications(liveData?: {
  spareparts?: Sparepart[];
  orders?: ServiceOrder[];
  customers?: Customer[];
}): AppNotification[] {
  let notifs: AppNotification[] = getStoredNotifications();
  const dismissedIds = new Set(getDismissedNotifIds());
  const spareparts = liveData?.spareparts || getSpareparts();
  const orders = liveData?.orders || getServiceOrders();
  const customers = liveData?.customers || getCustomers();

  const activeNotifIds = new Set<string>();

  // 1. Check Low Stock / Out of Stock Spareparts
  spareparts.forEach((sp) => {
    const minThreshold = sp.minStock ?? 3;
    const isOutOfStock = sp.stock <= 0;
    const isLowStock = sp.stock > 0 && sp.stock <= minThreshold;

    if (isOutOfStock || isLowStock) {
      const id = `notif-lowstock-${sp.id}`;
      activeNotifIds.add(id);

      const title = isOutOfStock
        ? `🚨 Stok Habis: ${sp.name}`
        : `⚠️ Stok Menipis: ${sp.name}`;
      const message = isOutOfStock
        ? `Stok sparepart "${sp.name}" (${sp.code}) telah HABIS (0 ${sp.unit}). Segera lakukan restock atau order ke distributor.`
        : `Sisa stok "${sp.name}" sisa ${sp.stock} ${sp.unit} (Batas minimum: ${minThreshold} ${sp.unit}). Segera jadwalkan pengadaan.`;

      const existingIndex = notifs.findIndex((n) => n.id === id);
      if (existingIndex >= 0) {
        // Update content if changed
        notifs[existingIndex] = {
          ...notifs[existingIndex],
          title,
          message,
          relatedId: sp.id,
          actionTab: 'spareparts',
        };
      } else if (!dismissedIds.has(id)) {
        notifs.unshift({
          id,
          type: 'LOW_STOCK',
          title,
          message,
          timestamp: new Date().toISOString(),
          isRead: false,
          relatedId: sp.id,
          actionTab: 'spareparts',
        });
      }
    }
  });

  // 2. Check Pending Service Orders (Menunggu Ditangani)
  orders.forEach((ord) => {
    if (ord.status === 'MENUNGGU') {
      const id = `notif-neworder-${ord.id}`;
      activeNotifIds.add(id);

      const title = `🛠️ Antrean Servis: ${ord.plateNumber || 'Unit Masuk'}`;
      const message = `Unit ${ord.motorModel || 'Motor'} (${ord.plateNumber || '-'}) an. ${ord.customerName || 'Pelanggan'} telah terdaftar dan menunggu pengerjaan teknisi.`;

      const existingIndex = notifs.findIndex((n) => n.id === id);
      if (existingIndex >= 0) {
        notifs[existingIndex] = {
          ...notifs[existingIndex],
          title,
          message,
          relatedId: ord.id,
          actionTab: 'services',
        };
      } else if (!dismissedIds.has(id)) {
        notifs.unshift({
          id,
          type: 'NEW_SERVICE',
          title,
          message,
          timestamp: ord.createdAt || new Date().toISOString(),
          isRead: false,
          relatedId: ord.id,
          actionTab: 'services',
        });
      }
    } else if (ord.status === 'SELESAI' && ord.paymentStatus !== 'LUNAS') {
      // 3. Service completed waiting for cashier checkout
      const id = `notif-checkout-${ord.id}`;
      activeNotifIds.add(id);

      const formattedTotal = ord.totalAmount ? `Rp ${ord.totalAmount.toLocaleString('id-ID')}` : 'Rp 0';
      const title = `💳 Siap Bayar: ${ord.plateNumber || 'Nota Servis'}`;
      const message = `Pengerjaan unit ${ord.plateNumber || ''} (${ord.customerName || ''}) telah selesai. Total tagihan ${formattedTotal} menunggu pelunasan kasir.`;

      const existingIndex = notifs.findIndex((n) => n.id === id);
      if (existingIndex >= 0) {
        notifs[existingIndex] = {
          ...notifs[existingIndex],
          title,
          message,
          relatedId: ord.id,
          actionTab: 'services',
        };
      } else if (!dismissedIds.has(id)) {
        notifs.unshift({
          id,
          type: 'SERVICE_COMPLETED',
          title,
          message,
          timestamp: ord.completedAt || ord.updatedAt || new Date().toISOString(),
          isRead: false,
          relatedId: ord.id,
          actionTab: 'services',
        });
      }
    }
  });

  // 4. Check Customer Service Due Reminders
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTime = new Date(todayStr).getTime();

  customers.forEach((cust) => {
    if (cust.vehicles && Array.isArray(cust.vehicles)) {
      cust.vehicles.forEach((v) => {
        if (v.nextServiceDueDate) {
          const dueTime = new Date(v.nextServiceDueDate).getTime();
          // Alert if due date is reached or approaching within 7 days
          if (!isNaN(dueTime) && todayTime >= dueTime - 7 * 24 * 60 * 60 * 1000) {
            const id = `notif-reminder-${cust.id}-${v.plateNumber.replace(/\s+/g, '')}`;
            activeNotifIds.add(id);

            const isPastDue = todayTime > dueTime;
            const title = isPastDue
              ? `⚠️ Lewat Jadwal Servis: ${v.plateNumber}`
              : `📅 Jadwal Servis Mendatang: ${v.plateNumber}`;
            const message = `Motor ${v.motorModel} (${v.plateNumber}) an. ${cust.name} ${
              isPastDue ? 'sudah melewati' : 'mendekati'
            } jadwal servis rutin / ganti oli (${v.nextServiceDueDate}).`;

            const existingIndex = notifs.findIndex((n) => n.id === id);
            if (existingIndex >= 0) {
              notifs[existingIndex] = {
                ...notifs[existingIndex],
                title,
                message,
                relatedId: cust.id,
                actionTab: 'customers',
                customerPhone: cust.phone,
              };
            } else if (!dismissedIds.has(id)) {
              notifs.unshift({
                id,
                type: 'CUSTOMER_REMINDER',
                title,
                message,
                timestamp: new Date().toISOString(),
                isRead: false,
                relatedId: cust.id,
                actionTab: 'customers',
                customerPhone: cust.phone,
              });
            }
          }
        }
      });
    }
  });

  // Auto-cleanup stale automatic notifications that are no longer active
  notifs = notifs.filter((n) => {
    // If it's a generated ID prefix, verify if it's still active
    if (
      n.id.startsWith('notif-lowstock-') ||
      n.id.startsWith('notif-neworder-') ||
      n.id.startsWith('notif-checkout-') ||
      n.id.startsWith('notif-reminder-')
    ) {
      return activeNotifIds.has(n.id);
    }
    return true;
  });

  // Sort by timestamp desc
  notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  saveStoredNotifications(notifs);
  return notifs;
}

export function markNotificationAsRead(notifId: string): AppNotification[] {
  const notifs = getStoredNotifications().map((n) =>
    n.id === notifId ? { ...n, isRead: true } : n
  );
  saveStoredNotifications(notifs);
  return notifs;
}

export function markAllNotificationsAsRead(): AppNotification[] {
  const notifs = getStoredNotifications().map((n) => ({ ...n, isRead: true }));
  saveStoredNotifications(notifs);
  return notifs;
}

export function dismissSingleNotification(notifId: string): AppNotification[] {
  const dismissed = getDismissedNotifIds();
  if (!dismissed.includes(notifId)) {
    dismissed.push(notifId);
    saveDismissedNotifIds(dismissed);
  }
  const notifs = getStoredNotifications().filter((n) => n.id !== notifId);
  saveStoredNotifications(notifs);
  return notifs;
}

export function clearAllNotifications(): AppNotification[] {
  const currentNotifs = getStoredNotifications();
  const dismissed = getDismissedNotifIds();
  currentNotifs.forEach((n) => {
    if (!dismissed.includes(n.id)) dismissed.push(n.id);
  });
  saveDismissedNotifIds(dismissed);
  saveStoredNotifications([]);
  return [];
}

// --- Helper Reset Demo Data ---
export function resetAllDataToDefault(): void {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SHOP_SETTINGS));
  localStorage.setItem(KEYS.SERVICE_ORDERS, JSON.stringify(DEFAULT_SERVICE_ORDERS));
  localStorage.setItem(KEYS.SPAREPARTS, JSON.stringify(DEFAULT_SPAREPARTS));
  localStorage.setItem(KEYS.EMPLOYEES, JSON.stringify(DEFAULT_EMPLOYEES));
  localStorage.setItem(KEYS.PAYROLL, JSON.stringify(DEFAULT_PAYROLL_RECORDS));
  localStorage.setItem(KEYS.PRESET_LABORS, JSON.stringify(DEFAULT_PRESET_LABORS));
  localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(DEFAULT_CUSTOMERS));
  localStorage.removeItem(KEYS.NOTIFICATIONS);
}


import {
  formatCurrencyWIT,
  formatDateJayapura,
  formatDateTimeJayapura,
  getJayapuraISOString,
} from './timezone';

// Format Rupiah Helper
export function formatRupiah(amount: number): string {
  return formatCurrencyWIT(amount);
}

// Date Formatter Helper (Asia/Jayapura WIT)
export function formatDateIndo(isoString: string): string {
  return formatDateTimeJayapura(isoString);
}

export function formatDateOnlyIndo(isoString: string): string {
  return formatDateJayapura(isoString);
}
