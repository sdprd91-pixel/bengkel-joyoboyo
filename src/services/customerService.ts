import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Customer, CustomerVehicle, UserAccount, WholesaleCustomer } from '../types';
import { getJayapuraISOString } from '../lib/timezone';
import { recordAuditLog } from './auditService';

export const CUSTOMERS_COLLECTION = 'customers';
export const WHOLESALE_CUSTOMERS_COLLECTION = 'wholesale_customers';

function cleanPayload<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if a customer with the same phone or vehicle plate already exists
 */
export async function checkDuplicateCustomer(
  phone: string,
  plateNumber?: string,
  excludeCustomerId?: string
): Promise<{ isDuplicate: boolean; matchedCustomer?: Customer; message?: string }> {
  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone && !plateNumber) return { isDuplicate: false };

    const colRef = collection(db, CUSTOMERS_COLLECTION);
    const snap = await getDocs(colRef);

    for (const docSnap of snap.docs) {
      if (excludeCustomerId && docSnap.id === excludeCustomerId) continue;
      const cust = docSnap.data() as Customer;
      const existingCleanPhone = (cust.phone || '').replace(/[^0-9]/g, '');

      if (cleanPhone && existingCleanPhone && (existingCleanPhone === cleanPhone || (cleanPhone.length >= 9 && existingCleanPhone.endsWith(cleanPhone.slice(-8))))) {
        return {
          isDuplicate: true,
          matchedCustomer: { ...cust, id: docSnap.id },
          message: `Nomor telepon ${phone} sudah terdaftar atas nama ${cust.name}.`,
        };
      }

      if (plateNumber && cust.vehicles) {
        const cleanPlate = plateNumber.toUpperCase().replace(/\s+/g, '');
        const matchedVehicle = cust.vehicles.find(
          (v) => (v.plateNumber || '').toUpperCase().replace(/\s+/g, '') === cleanPlate
        );
        if (matchedVehicle) {
          return {
            isDuplicate: true,
            matchedCustomer: { ...cust, id: docSnap.id },
            message: `Plat nomor ${plateNumber} sudah terdaftar pada pelanggan ${cust.name}.`,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Duplicate check warning:', err);
  }
  return { isDuplicate: false };
}

/**
 * Save / Update Customer
 */
export async function saveCustomer(
  customer: Customer,
  user?: UserAccount | null
): Promise<Customer> {
  const now = getJayapuraISOString();
  const customerId = customer.id || `CUST-${Date.now().toString().slice(-6)}`;
  const isNew = !customer.createdAt;

  const fullCustomer: Customer = {
    ...customer,
    id: customerId,
    name: customer.name.trim(),
    phone: customer.phone.trim(),
    createdAt: customer.createdAt || now,
    totalVisits: Number(customer.totalVisits) || 0,
    totalSpent: Math.round(Number(customer.totalSpent) || 0),
    vehicles: customer.vehicles || [],
  };

  const docRef = doc(db, CUSTOMERS_COLLECTION, customerId);
  await setDoc(docRef, cleanPayload(fullCustomer), { merge: true });

  await recordAuditLog({
    action: isNew ? 'CREATE_CUSTOMER' : 'EDIT_CUSTOMER',
    module: 'Customers',
    description: `${isNew ? 'Menambahkan' : 'Memperbarui'} data pelanggan ${fullCustomer.name} (${fullCustomer.phone}).`,
    userId: user?.id,
    userName: user?.name,
    role: user?.role,
    documentId: customerId,
  });

  return fullCustomer;
}

/**
 * Delete Customer (Admin Only)
 */
export async function deleteCustomer(
  customerId: string,
  user?: UserAccount | null
): Promise<void> {
  if (user && user.role !== 'admin') {
    throw new Error('Hanya Admin yang berhak menghapus data pelanggan.');
  }

  const docRef = doc(db, CUSTOMERS_COLLECTION, customerId);
  const snap = await getDoc(docRef);
  const custName = snap.exists() ? (snap.data() as Customer).name : customerId;

  await deleteDoc(docRef);

  await recordAuditLog({
    action: 'DELETE_CUSTOMER',
    module: 'Customers',
    description: `Menghapus data pelanggan ${custName} (ID: ${customerId}).`,
    userId: user?.id,
    userName: user?.name,
    role: user?.role,
    documentId: customerId,
  });
}

/**
 * Save / Update Wholesale Customer
 */
export async function saveWholesaleCustomer(
  wholesale: WholesaleCustomer,
  user?: UserAccount | null
): Promise<WholesaleCustomer> {
  const now = getJayapuraISOString();
  const id = wholesale.id || `GSR-${Date.now().toString().slice(-6)}`;

  const fullWholesale: WholesaleCustomer = {
    ...wholesale,
    id,
    createdAt: wholesale.createdAt || now,
  };

  const docRef = doc(db, WHOLESALE_CUSTOMERS_COLLECTION, id);
  await setDoc(docRef, cleanPayload(fullWholesale), { merge: true });

  await recordAuditLog({
    action: 'EDIT_CUSTOMER',
    module: 'Wholesale Customers',
    description: `Menyimpan data langganan grosir ${fullWholesale.name} (${fullWholesale.phone}).`,
    userId: user?.id,
    userName: user?.name,
    role: user?.role,
    documentId: id,
  });

  return fullWholesale;
}

/**
 * Delete Wholesale Customer
 */
export async function deleteWholesaleCustomer(
  id: string,
  user?: UserAccount | null
): Promise<void> {
  if (user && user.role !== 'admin') {
    throw new Error('Hanya Admin yang berhak menghapus pelanggan grosir.');
  }

  const docRef = doc(db, WHOLESALE_CUSTOMERS_COLLECTION, id);
  await deleteDoc(docRef);

  await recordAuditLog({
    action: 'DELETE_CUSTOMER',
    module: 'Wholesale Customers',
    description: `Menghapus langganan grosir ID: ${id}.`,
    userId: user?.id,
    userName: user?.name,
    role: user?.role,
    documentId: id,
  });
}
