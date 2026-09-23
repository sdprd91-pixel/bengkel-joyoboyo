import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
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
  UserAccount,
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

// Firestore collection names
export const COLLECTIONS = {
  USERS: 'users',
  SPAREPARTS: 'spareparts',
  SERVICE_ORDERS: 'service_orders',
  ARCHIVED_ORDERS: 'archived_orders',
  CUSTOMERS: 'customers',
  WHOLESALE_CUSTOMERS: 'wholesale_customers',
  PRESET_LABORS: 'preset_labors',
  EMPLOYEES: 'employees',
  EMPLOYEE_LOANS: 'employee_loans',
  PAYROLL_RECORDS: 'payroll_records',
  SETTINGS: 'settings',
  NOTIFICATIONS: 'notifications',
} as const;

// Generic helper to subscribe to a Firestore collection with real-time updates
export function subscribeCollection<T extends { id?: string }>(
  collectionName: string,
  onData: (data: T[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const colRef = collection(db, collectionName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...(docSnap.data() as T), id: docSnap.id });
        });
        onData(items);
      },
      (error) => {
        console.warn(`Firestore sync note for collection ${collectionName}:`, error.message);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.warn(`Firestore subscribe note for ${collectionName}:`, err?.message);
    if (onError) onError(err);
    return () => {};
  }
}

// Generic helper to subscribe to a single Firestore document
export function subscribeDoc<T>(
  collectionName: string,
  docId: string,
  onData: (data: T | null) => void,
  onError?: (err: Error) => void
) {
  try {
    const docRef = doc(db, collectionName, docId);
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onData(docSnap.data() as T);
        } else {
          onData(null);
        }
      },
      (error) => {
        console.warn(`Firestore sync note for doc ${collectionName}/${docId}:`, error.message);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.warn(`Firestore subscribe note for doc ${collectionName}/${docId}:`, err?.message);
    if (onError) onError(err);
    return () => {};
  }
}

// Helper to recursively strip undefined properties before sending to Firestore
function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item)) as unknown as T;
  }
  const clean: any = {};
  for (const [key, value] of Object.entries(obj as any)) {
    if (value !== undefined) {
      clean[key] = stripUndefined(value);
    }
  }
  return clean as T;
}

// --- Specific Firestore Operations ---

// Spareparts & Oils
export async function saveSparepartFirestore(part: Sparepart): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SPAREPARTS, part.id);
  await setDoc(docRef, stripUndefined(part), { merge: true });
}

export async function deleteSparepartFirestore(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SPAREPARTS, id);
  await deleteDoc(docRef);
}

export async function saveAllSparepartsFirestore(parts: Sparepart[]): Promise<void> {
  const batch = writeBatch(db);
  parts.forEach((p) => {
    const docRef = doc(db, COLLECTIONS.SPAREPARTS, p.id);
    batch.set(docRef, stripUndefined(p), { merge: true });
  });
  await batch.commit();
}

// Update Sparepart stock during sales/service
export async function updateSparepartStockFirestore(partId: string, deltaQty: number): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SPAREPARTS, partId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const current = snap.data() as Sparepart;
    const newStock = Math.max(0, (current.stock || 0) + deltaQty);
    await updateDoc(docRef, {
      stock: newStock,
      lastUpdated: new Date().toISOString(),
    });
  }
}

// Service Orders (Transactions)
export async function saveServiceOrderFirestore(order: ServiceOrder): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SERVICE_ORDERS, order.id);
  await setDoc(docRef, stripUndefined(order), { merge: true });
}

export async function deleteServiceOrderFirestore(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.SERVICE_ORDERS, id);
  await deleteDoc(docRef);
}

export async function saveAllServiceOrdersFirestore(orders: ServiceOrder[]): Promise<void> {
  const batch = writeBatch(db);
  orders.forEach((o) => {
    const docRef = doc(db, COLLECTIONS.SERVICE_ORDERS, o.id);
    batch.set(docRef, stripUndefined(o), { merge: true });
  });
  await batch.commit();
}

// Archived Orders
export async function saveArchivedOrderFirestore(order: ServiceOrder): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ARCHIVED_ORDERS, order.id);
  await setDoc(docRef, stripUndefined(order), { merge: true });
}

export async function deleteArchivedOrderFirestore(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.ARCHIVED_ORDERS, id);
  await deleteDoc(docRef);
}

// Clear all active service orders and archived orders from Firestore
export async function clearAllServiceAndSalesOrdersFirestore(): Promise<void> {
  try {
    const srvSnap = await getDocs(collection(db, COLLECTIONS.SERVICE_ORDERS));
    if (!srvSnap.empty) {
      const batch = writeBatch(db);
      srvSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    const archSnap = await getDocs(collection(db, COLLECTIONS.ARCHIVED_ORDERS));
    if (!archSnap.empty) {
      const batch = writeBatch(db);
      archSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err: any) {
    console.warn('clearAllServiceAndSalesOrdersFirestore warning:', err?.message || err);
  }
}

// Customers
export async function saveCustomerFirestore(customer: Customer): Promise<void> {
  const docRef = doc(db, COLLECTIONS.CUSTOMERS, customer.id);
  await setDoc(docRef, stripUndefined(customer), { merge: true });
}

export async function deleteCustomerFirestore(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.CUSTOMERS, id);
  await deleteDoc(docRef);
}

// Wholesale Customers
export async function saveWholesaleCustomerFirestore(customer: WholesaleCustomer): Promise<void> {
  const docRef = doc(db, COLLECTIONS.WHOLESALE_CUSTOMERS, customer.id);
  await setDoc(docRef, stripUndefined(customer), { merge: true });
}

export async function deleteWholesaleCustomerFirestore(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.WHOLESALE_CUSTOMERS, id);
  await deleteDoc(docRef);
}

// Preset Labors
export async function savePresetLaborFirestore(preset: PresetLabor): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PRESET_LABORS, preset.id);
  await setDoc(docRef, stripUndefined(preset), { merge: true });
}

export async function deletePresetLaborFirestore(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PRESET_LABORS, id);
  await deleteDoc(docRef);
}

// Employees
export async function saveEmployeeFirestore(employee: Employee): Promise<void> {
  const docRef = doc(db, COLLECTIONS.EMPLOYEES, employee.id);
  await setDoc(docRef, stripUndefined(employee), { merge: true });
}

export async function deleteEmployeeFirestore(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.EMPLOYEES, id);
  await deleteDoc(docRef);
}

// Employee Loans
export async function saveEmployeeLoanFirestore(loan: EmployeeLoan): Promise<void> {
  const docRef = doc(db, COLLECTIONS.EMPLOYEE_LOANS, loan.id);
  await setDoc(docRef, stripUndefined(loan), { merge: true });
}

export async function deleteEmployeeLoanFirestore(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.EMPLOYEE_LOANS, id);
  await deleteDoc(docRef);
}

// Payroll Records
export async function savePayrollRecordFirestore(record: PayrollRecord): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PAYROLL_RECORDS, record.id);
  await setDoc(docRef, stripUndefined(record), { merge: true });
}

// Compress / resize image for Firestore storage (ensures document size stays well under 1MB)
export async function compressLogoImage(
  dataUrl: string,
  maxWidth = 400,
  maxHeight = 400,
  quality = 0.85
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

// Shop Settings
export async function saveSettingsFirestore(settings: ShopSettings): Promise<void> {
  try {
    let cleanSettings = { ...settings };
    if (cleanSettings.logoUrl && cleanSettings.logoUrl.startsWith('data:image/')) {
      cleanSettings.logoUrl = await compressLogoImage(cleanSettings.logoUrl, 400, 400, 0.85);
    }
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'current');
    await setDoc(docRef, stripUndefined(cleanSettings), { merge: true });
  } catch (err: any) {
    console.warn('saveSettingsFirestore note:', err?.message || err);
    throw err;
  }
}

// Users
export async function saveUserAccountFirestore(user: UserAccount): Promise<void> {
  const docRef = doc(db, COLLECTIONS.USERS, user.id);
  await setDoc(docRef, stripUndefined(user), { merge: true });
}

export async function deleteUserAccountFirestore(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.USERS, id);
  await deleteDoc(docRef);
}

// Notifications
export async function saveNotificationFirestore(notif: AppNotification): Promise<void> {
  const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notif.id);
  await setDoc(docRef, stripUndefined(notif), { merge: true });
}

// Push all local workshop data directly to Cloud Firestore (One-Click Cloud Sync)
export async function syncAllLocalDataToFirestore(payload: {
  settings: ShopSettings;
  users: UserAccount[];
  spareparts: Sparepart[];
  orders: ServiceOrder[];
  customers: Customer[];
  wholesaleCustomers: WholesaleCustomer[];
  presetLabors: PresetLabor[];
  employees: Employee[];
  employeeLoans: EmployeeLoan[];
  payrollRecords: PayrollRecord[];
}): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Settings
    let safeSettings = { ...payload.settings };
    if (safeSettings.logoUrl && safeSettings.logoUrl.startsWith('data:image/')) {
      safeSettings.logoUrl = await compressLogoImage(safeSettings.logoUrl, 400, 400, 0.85);
    }
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'current'), stripUndefined(safeSettings), { merge: true });

    // 2. Users
    if (payload.users && payload.users.length > 0) {
      const userBatch = writeBatch(db);
      payload.users.forEach((u) => {
        userBatch.set(doc(db, COLLECTIONS.USERS, u.id), stripUndefined(u), { merge: true });
      });
      await userBatch.commit();
    }

    // 3. Spareparts in chunks of 25
    const chunk = <T>(arr: T[], size: number): T[][] => {
      const res: T[][] = [];
      for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
      return res;
    };

    for (const partsChunk of chunk(payload.spareparts, 25)) {
      const b = writeBatch(db);
      partsChunk.forEach((p) => b.set(doc(db, COLLECTIONS.SPAREPARTS, p.id), stripUndefined(p), { merge: true }));
      await b.commit();
    }

    // 4. Service Orders
    for (const ordersChunk of chunk(payload.orders, 25)) {
      const b = writeBatch(db);
      ordersChunk.forEach((o) => b.set(doc(db, COLLECTIONS.SERVICE_ORDERS, o.id), stripUndefined(o), { merge: true }));
      await b.commit();
    }

    // 5. Customers
    for (const custChunk of chunk(payload.customers, 25)) {
      const b = writeBatch(db);
      custChunk.forEach((c) => b.set(doc(db, COLLECTIONS.CUSTOMERS, c.id), stripUndefined(c), { merge: true }));
      await b.commit();
    }

    // 6. Wholesale Customers
    if (payload.wholesaleCustomers.length > 0) {
      const b = writeBatch(db);
      payload.wholesaleCustomers.forEach((w) => b.set(doc(db, COLLECTIONS.WHOLESALE_CUSTOMERS, w.id), stripUndefined(w), { merge: true }));
      await b.commit();
    }

    // 7. Preset Labors
    if (payload.presetLabors.length > 0) {
      const b = writeBatch(db);
      payload.presetLabors.forEach((pl) => b.set(doc(db, COLLECTIONS.PRESET_LABORS, pl.id), stripUndefined(pl), { merge: true }));
      await b.commit();
    }

    // 8. Employees
    if (payload.employees.length > 0) {
      const b = writeBatch(db);
      payload.employees.forEach((emp) => b.set(doc(db, COLLECTIONS.EMPLOYEES, emp.id), stripUndefined(emp), { merge: true }));
      await b.commit();
    }

    // 9. Employee Loans
    if (payload.employeeLoans.length > 0) {
      const b = writeBatch(db);
      payload.employeeLoans.forEach((l) => b.set(doc(db, COLLECTIONS.EMPLOYEE_LOANS, l.id), stripUndefined(l), { merge: true }));
      await b.commit();
    }

    // 10. Payroll Records
    if (payload.payrollRecords.length > 0) {
      const b = writeBatch(db);
      payload.payrollRecords.forEach((pr) => b.set(doc(db, COLLECTIONS.PAYROLL_RECORDS, pr.id), stripUndefined(pr), { merge: true }));
      await b.commit();
    }

    return { success: true, message: 'Seluruh data bengkel berhasil disinkronkan ke Cloud Firestore!' };
  } catch (err: any) {
    console.error('syncAllLocalDataToFirestore error:', err);
    return { success: false, message: `Gagal sinkronisasi data: ${err?.message || 'Error tidak diketahui'}` };
  }
}

let isSeedingInProgress = false;

// Seed initial data into Firestore if Firestore collections are empty
export async function seedInitialFirestoreDataIfEmpty(): Promise<void> {
  const seedFlagKey = 'joyoboyo_firestore_seeded_done';
  if (typeof window !== 'undefined' && sessionStorage.getItem(seedFlagKey)) {
    return;
  }
  if (isSeedingInProgress) return;
  isSeedingInProgress = true;

  try {
    // 1. Check if settings/current exists. If so, DB is already seeded.
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'current');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
      if (typeof window !== 'undefined') sessionStorage.setItem(seedFlagKey, 'true');
      isSeedingInProgress = false;
      return;
    }

    // Otherwise, seed initial workshop settings
    let localSettings: ShopSettings = DEFAULT_SHOP_SETTINGS;
    try {
      const raw = localStorage.getItem('joyoboyo_settings_v1');
      if (raw) localSettings = JSON.parse(raw);
    } catch (e) {}
    await setDoc(settingsRef, stripUndefined(localSettings), { merge: true });

    // Seed User Accounts
    const usersSnap = await getDocs(query(collection(db, COLLECTIONS.USERS), limit(1)));
    if (usersSnap.empty) {
      let localUsers: UserAccount[] = DEFAULT_USER_ACCOUNTS;
      try {
        const raw = localStorage.getItem('joyoboyo_users_v1');
        if (raw) localUsers = JSON.parse(raw);
      } catch (e) {}
      const batch = writeBatch(db);
      localUsers.forEach((u) => {
        const { password, ...safeUser } = u;
        batch.set(doc(db, COLLECTIONS.USERS, safeUser.id), stripUndefined(safeUser), { merge: true });
      });
      await batch.commit();
    }

    // Seed Spareparts
    const partsSnap = await getDocs(query(collection(db, COLLECTIONS.SPAREPARTS), limit(1)));
    if (partsSnap.empty) {
      let localParts: Sparepart[] = DEFAULT_SPAREPARTS;
      try {
        const raw = localStorage.getItem('joyoboyo_spareparts_v1');
        if (raw) localParts = JSON.parse(raw);
      } catch (e) {}
      const batch = writeBatch(db);
      localParts.forEach((p) => {
        batch.set(doc(db, COLLECTIONS.SPAREPARTS, p.id), p, { merge: true });
      });
      await batch.commit();
    }

    // Seed Preset Labors
    const presetSnap = await getDocs(query(collection(db, COLLECTIONS.PRESET_LABORS), limit(1)));
    if (presetSnap.empty) {
      let localPreset: PresetLabor[] = DEFAULT_PRESET_LABORS;
      try {
        const raw = localStorage.getItem('joyoboyo_preset_labors_v1');
        if (raw) localPreset = JSON.parse(raw);
      } catch (e) {}
      const batch = writeBatch(db);
      localPreset.forEach((pl) => {
        batch.set(doc(db, COLLECTIONS.PRESET_LABORS, pl.id), pl, { merge: true });
      });
      await batch.commit();
    }

    // Seed Employees
    const empSnap = await getDocs(query(collection(db, COLLECTIONS.EMPLOYEES), limit(1)));
    if (empSnap.empty) {
      let localEmp: Employee[] = DEFAULT_EMPLOYEES;
      try {
        const raw = localStorage.getItem('joyoboyo_employees_v1');
        if (raw) localEmp = JSON.parse(raw);
      } catch (e) {}
      const batch = writeBatch(db);
      localEmp.forEach((emp) => {
        batch.set(doc(db, COLLECTIONS.EMPLOYEES, emp.id), emp, { merge: true });
      });
      await batch.commit();
    }

    // Seed Wholesale Customers
    const wholeSnap = await getDocs(query(collection(db, COLLECTIONS.WHOLESALE_CUSTOMERS), limit(1)));
    if (wholeSnap.empty) {
      let localWhole: WholesaleCustomer[] = DEFAULT_WHOLESALE_CUSTOMERS;
      try {
        const raw = localStorage.getItem('joyoboyo_wholesale_customers_v1');
        if (raw) localWhole = JSON.parse(raw);
      } catch (e) {}
      const batch = writeBatch(db);
      localWhole.forEach((w) => {
        batch.set(doc(db, COLLECTIONS.WHOLESALE_CUSTOMERS, w.id), w, { merge: true });
      });
      await batch.commit();
    }

    if (typeof window !== 'undefined') sessionStorage.setItem(seedFlagKey, 'true');
  } catch (err: any) {
    console.warn('Initial Firestore seed check note:', err?.message || err);
  } finally {
    isSeedingInProgress = false;
  }
}
