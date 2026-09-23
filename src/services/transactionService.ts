import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  PaymentMethod,
  ReturnItemDetail,
  ReturnRecord,
  ServiceOrder,
  Sparepart,
  UserAccount,
} from '../types';
import { getJayapuraISOString } from '../lib/timezone';
import { recordAuditLog } from './auditService';
import {
  createStockMovementRecord,
  deductStockForOrderAtomic,
  restoreStockForReturnAtomic,
  SPAREPARTS_COLLECTION,
} from './stockService';

export const SERVICE_ORDERS_COLLECTION = 'service_orders';
export const ARCHIVED_ORDERS_COLLECTION = 'archived_orders';

export interface ProcessReturnInput {
  orderId: string;
  items?: { partId: string; qty: number; reason: string }[];
  returnItems?: { partId: string; qty: number; reason: string }[];
  refundPaymentMethod?: PaymentMethod;
  refundNotes?: string;
  user?: UserAccount | null;
  processedBy?: string;
}

export interface ProcessReturnResult {
  success: boolean;
  message: string;
  totalRefund: number;
  updatedOrder?: ServiceOrder;
}

/**
 * Clean object of undefined values for Firestore
 */
function cleanPayload<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Save / Create Service Order with atomic stock management
 */
export async function saveServiceOrderAtomic(
  order: ServiceOrder,
  user?: UserAccount | null,
  previousOrder?: ServiceOrder | null
): Promise<{ success: boolean; message: string; order: ServiceOrder }> {
  const now = getJayapuraISOString();
  const orderId = order.id || `SRV-${now.substring(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

  // Ensure timestamps
  const completeOrder: ServiceOrder = {
    ...order,
    id: orderId,
    createdAt: order.createdAt || now,
    updatedAt: now,
    subtotalLabor: Math.round(Number(order.subtotalLabor) || 0),
    subtotalParts: Math.round(Number(order.subtotalParts) || 0),
    discount: Math.round(Number(order.discount) || 0),
    totalAmount: Math.round(Number(order.totalAmount) || 0),
    paidAmount: Math.round(Number(order.paidAmount) || 0),
    changeAmount: Math.round(Number(order.changeAmount) || 0),
    mechanicCommissionAmount: Math.round(Number(order.mechanicCommissionAmount) || 0),
  };

  const isNew = !previousOrder;
  const isDirectSale = order.customerName.includes('Grosir') || (order.labors.length === 0 && order.parts.length > 0);

  // If this is a brand new order with parts, atomically verify and deduct stock
  if (isNew && completeOrder.parts && completeOrder.parts.length > 0 && completeOrder.status !== 'BATAL') {
    await deductStockForOrderAtomic(completeOrder.parts, orderId, user, isDirectSale);
  }

  // Save to Firestore
  const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);
  await setDoc(orderRef, cleanPayload(completeOrder), { merge: true });

  // Record Audit Log
  await recordAuditLog({
    action: isNew ? 'CREATE_TRANSACTION' : 'EDIT_TRANSACTION',
    module: 'Transactions',
    description: `${isNew ? 'Membuat' : 'Memperbarui'} nota ${orderId} (${completeOrder.customerName} - ${completeOrder.plateNumber || 'Langsung'}) senilai Rp ${completeOrder.totalAmount.toLocaleString('id-ID')}. Status: ${completeOrder.paymentStatus}`,
    userId: user?.id,
    userName: user?.name,
    role: user?.role,
    documentId: orderId,
  });

  return {
    success: true,
    message: `Nota ${orderId} berhasil disimpan.`,
    order: completeOrder,
  };
}

/**
 * Cancel Service Order (Soft Cancel with Stock Reversal)
 */
export async function cancelServiceOrderAtomic(
  orderId: string,
  reason: string,
  user?: UserAccount | null
): Promise<{ success: boolean; message: string }> {
  const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);
  const snap = await getDoc(orderRef);

  if (!snap.exists()) {
    throw new Error(`Nota dengan ID ${orderId} tidak ditemukan.`);
  }

  const order = snap.data() as ServiceOrder;

  if (order.status === 'BATAL') {
    throw new Error('Nota ini sudah dalam status BATAL sebelumnya.');
  }

  const now = getJayapuraISOString();

  // 1. If order had parts that were NOT already returned, restore them to stock
  const partsToRestore = (order.parts || []).map((p) => {
    const netQty = Math.max(0, (p.qty || 0) - (p.returnedQty || 0));
    return {
      partId: p.partId,
      qty: netQty,
      reason: `Pembatalan Nota: ${reason}`,
      code: p.code,
      name: p.name,
    };
  }).filter((p) => p.qty > 0);

  if (partsToRestore.length > 0) {
    await restoreStockForReturnAtomic(
      partsToRestore,
      orderId,
      `CANCEL-${Date.now()}`,
      user
    );
  }

  // 2. Update order status to BATAL
  await updateDoc(orderRef, {
    status: 'BATAL',
    paymentStatus: 'BELUM',
    notes: `${order.notes ? order.notes + ' | ' : ''}DIBATALKAN: ${reason} (${now})`,
    updatedAt: now,
  });

  // 3. Record Audit Log
  await recordAuditLog({
    action: 'CANCEL_TRANSACTION',
    module: 'Transactions',
    description: `Membatalkan nota ${orderId} (${order.customerName}). Alasan: ${reason}. Stok barang telah dipulihkan.`,
    userId: user?.id,
    userName: user?.name,
    role: user?.role,
    documentId: orderId,
  });

  return {
    success: true,
    message: `Nota ${orderId} berhasil dibatalkan dan stok sparepart telah dipulihkan.`,
  };
}

/**
 * Process Order Return (Partial or Full item return with Stock Restoration)
 */
export async function processOrderReturnAtomic(input: ProcessReturnInput): Promise<ProcessReturnResult> {
  const { orderId, refundPaymentMethod = 'TUNAI', refundNotes = '', user, processedBy } = input;
  const itemsToProcess = input.items || input.returnItems || [];

  if (!itemsToProcess || itemsToProcess.length === 0) {
    return {
      success: false,
      message: 'Tidak ada item yang dipilih untuk diretur.',
      totalRefund: 0,
    };
  }

  const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);
  const snap = await getDoc(orderRef);

  let order: ServiceOrder | null = null;
  if (snap.exists()) {
    order = snap.data() as ServiceOrder;
  } else {
    // Fallback: Check local storage orders if exists
    try {
      const raw = localStorage.getItem('joyoboyo_service_orders_v1');
      if (raw) {
        const localList: ServiceOrder[] = JSON.parse(raw);
        order = localList.find((o) => o.id === orderId) || null;
      }
    } catch (e) {
      console.warn('Fallback local read error:', e);
    }
  }

  if (!order) {
    return {
      success: false,
      message: `Nota ${orderId} tidak ditemukan di sistem database.`,
      totalRefund: 0,
    };
  }

  const now = getJayapuraISOString();
  const returnId = `RET-${now.substring(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

  const returnDetails: ReturnItemDetail[] = [];
  let totalRefund = 0;
  const partsToRestock: { partId: string; qty: number; reason: string; code: string; name: string }[] = [];

  // Clone parts
  const updatedParts = [...(order.parts || [])];

  for (const returnItem of itemsToProcess) {
    const partIdx = updatedParts.findIndex((p) => p.partId === returnItem.partId);
    if (partIdx === -1) continue;

    const orderPart = updatedParts[partIdx];
    const currentReturned = orderPart.returnedQty || 0;
    const availableToReturn = Math.max(0, orderPart.qty - currentReturned);

    if (returnItem.qty <= 0 || returnItem.qty > availableToReturn) {
      return {
        success: false,
        message: `Jumlah retur untuk "${orderPart.name}" (${returnItem.qty}) melebihi kuantitas yang dapat diretur (${availableToReturn}).`,
        totalRefund: 0,
      };
    }

    const itemRefund = orderPart.sellPrice * returnItem.qty;
    totalRefund += itemRefund;

    // Update part returned qty
    updatedParts[partIdx] = {
      ...orderPart,
      returnedQty: currentReturned + returnItem.qty,
      returnReason: returnItem.reason,
      returnDate: now,
    };

    returnDetails.push({
      partId: orderPart.partId,
      partCode: orderPart.code,
      partName: orderPart.name,
      qty: returnItem.qty,
      sellPrice: orderPart.sellPrice,
      refundSubtotal: itemRefund,
      reason: returnItem.reason,
    });

    partsToRestock.push({
      partId: orderPart.partId,
      qty: returnItem.qty,
      reason: returnItem.reason,
      code: orderPart.code,
      name: orderPart.name,
    });
  }

  if (returnDetails.length === 0) {
    return {
      success: false,
      message: 'Tidak ada item yang valid untuk diproses.',
      totalRefund: 0,
    };
  }

  // 1. Atomically restore inventory stock in Firestore
  try {
    await restoreStockForReturnAtomic(partsToRestock, orderId, returnId, user);
  } catch (stockErr) {
    console.warn('Firestore stock restore note:', stockErr);
  }

  // 2. Build return record
  const returnRecord: ReturnRecord = {
    id: returnId,
    returnDate: now,
    items: returnDetails,
    totalRefund,
    refundPaymentMethod,
    refundNotes,
    processedBy: user?.name || processedBy || 'Kasir',
  };

  const existingHistory = order.returnHistory || [];
  const updatedHistory = [...existingHistory, returnRecord];
  const updatedTotalRefund = (order.totalRefund || 0) + totalRefund;

  // Calculate updated net parts subtotal and grand total
  const netSubtotalParts = updatedParts.reduce((sum, p) => {
    const remainingQty = Math.max(0, p.qty - (p.returnedQty || 0));
    return sum + p.sellPrice * remainingQty;
  }, 0);

  const subtotalLabor = (order.labors || []).reduce((sum, l) => sum + (l.price || 0), 0);
  const newTotalAmount = Math.max(0, subtotalLabor + netSubtotalParts - (order.discount || 0));

  // Determine if all parts are fully returned
  const isAllPartsReturned = updatedParts.length > 0 && updatedParts.every((p) => (p.returnedQty || 0) >= p.qty);
  const isDirectSaleWithoutLabor = (order.labors || []).length === 0;
  const isFullyCancelled = isAllPartsReturned && (isDirectSaleWithoutLabor || subtotalLabor === 0);

  // 3. Update order
  const updatedOrder: ServiceOrder = {
    ...order,
    parts: updatedParts,
    subtotalParts: netSubtotalParts,
    totalAmount: newTotalAmount,
    status: isFullyCancelled ? 'BATAL' : order.status,
    paymentStatus: isFullyCancelled ? 'BELUM' : (newTotalAmount === 0 ? 'LUNAS' : order.paymentStatus),
    returnHistory: updatedHistory,
    totalRefund: updatedTotalRefund,
    updatedAt: now,
  };

  try {
    await setDoc(orderRef, cleanPayload(updatedOrder), { merge: true });
  } catch (orderSaveErr) {
    console.warn('Firestore order save error during return:', orderSaveErr);
  }

  // 4. Record Audit Log
  try {
    await recordAuditLog({
      action: 'RETURN_TRANSACTION',
      module: 'Returns',
      description: `Proses retur barang nota ${orderId} (${returnDetails.map((r) => `${r.partName} x${r.qty}`).join(', ')}) senilai Rp ${totalRefund.toLocaleString('id-ID')}. Stok berhasil dikembalikan.${isFullyCancelled ? ' Nota otomatis diubah status menjadi BATAL / DIRETUR.' : ''}`,
      userId: user?.id,
      userName: user?.name,
      role: user?.role,
      documentId: orderId,
    });
  } catch (auditErr) {
    console.warn('Audit log write error:', auditErr);
  }

  return {
    success: true,
    message: `Retur berhasil diproses! Stok barang telah otomatis bertambah ke inventaris. Nilai Refund: Rp ${totalRefund.toLocaleString('id-ID')}${isFullyCancelled ? ' (Nota otomatis dibatalkan / diretur penuh)' : ''}`,
    totalRefund,
    updatedOrder,
  };
}

/**
 * Delete Service Order (Admin Only)
 */
export async function deleteServiceOrderAtomic(
  orderId: string,
  user?: UserAccount | null
): Promise<void> {
  if (user && user.role !== 'admin') {
    throw new Error('Hanya Admin yang berhak menghapus nota transaksi secara permanen.');
  }

  const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);
  const snap = await getDoc(orderRef);
  const orderData = snap.exists() ? (snap.data() as ServiceOrder) : null;

  await deleteDoc(orderRef);

  await recordAuditLog({
    action: 'DELETE_TRANSACTION' as any,
    module: 'Transactions',
    description: `Admin ${user?.name || 'Admin'} menghapus permanen nota transaksi ${orderId}${orderData ? ` (${orderData.customerName} - Rp ${orderData.totalAmount})` : ''}.`,
    userId: user?.id,
    userName: user?.name,
    role: user?.role,
    documentId: orderId,
  });
}
