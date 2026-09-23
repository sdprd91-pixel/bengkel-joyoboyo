import {
  collection,
  doc,
  runTransaction,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  ServiceSparepartItem,
  Sparepart,
  StockMovement,
  StockMovementType,
  UserAccount,
} from '../types';
import { getJayapuraISOString } from '../lib/timezone';
import { recordAuditLog } from './auditService';

export const SPAREPARTS_COLLECTION = 'spareparts';
export const STOCK_MOVEMENTS_COLLECTION = 'stock_movements';

export interface StockAdjustmentInput {
  partId: string;
  newStock: number;
  reason: string;
  user?: UserAccount | null;
}

export interface StockPurchaseInput {
  partId: string;
  addedQty: number;
  newBuyPrice?: number;
  newSellPrice?: number;
  newWholesalePrice?: number;
  supplier?: string;
  invoiceNo?: string;
  user?: UserAccount | null;
}

/**
 * Record a stock movement ledger entry
 */
export async function createStockMovementRecord(movement: Omit<StockMovement, 'id' | 'timestamp'>): Promise<StockMovement> {
  const timestamp = getJayapuraISOString();
  const id = `SM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const fullMovement: StockMovement = {
    ...movement,
    id,
    timestamp,
  };

  const docRef = doc(db, STOCK_MOVEMENTS_COLLECTION, id);
  await setDoc(docRef, fullMovement);
  return fullMovement;
}

/**
 * Atomic stock adjustment (Opname / Koreksi Stok)
 */
export async function adjustStockAtomic(input: StockAdjustmentInput): Promise<{
  success: boolean;
  message: string;
  previousStock: number;
  newStock: number;
}> {
  if (input.newStock < 0) {
    throw new Error('Jumlah stok tidak boleh bernilai negatif.');
  }

  const partRef = doc(db, SPAREPARTS_COLLECTION, input.partId);

  let prevStock = 0;
  let partName = '';
  let partCode = '';

  await runTransaction(db, async (transaction) => {
    const partSnap = await transaction.get(partRef);
    if (!partSnap.exists()) {
      throw new Error(`Sparepart dengan ID ${input.partId} tidak ditemukan.`);
    }

    const partData = partSnap.data() as Sparepart;
    prevStock = partData.stock || 0;
    partName = partData.name;
    partCode = partData.code;

    const delta = input.newStock - prevStock;
    const now = getJayapuraISOString();

    transaction.update(partRef, {
      stock: input.newStock,
      lastUpdated: now,
    });
  });

  const delta = input.newStock - prevStock;
  const movementType: StockMovementType = 'ADJUSTMENT';

  // Record Stock Movement Ledger
  await createStockMovementRecord({
    userId: input.user?.id || 'system',
    userName: input.user?.name || 'Admin',
    partId: input.partId,
    partCode,
    partName,
    type: movementType,
    quantity: delta,
    previousStock: prevStock,
    newStock: input.newStock,
    notes: `Koreksi stok: ${input.reason}`,
  });

  // Record Audit Log
  await recordAuditLog({
    action: 'STOCK_ADJUSTMENT',
    module: 'Inventory',
    description: `Koreksi stok ${partName} (${partCode}) dari ${prevStock} menjadi ${input.newStock} unit. Alasan: ${input.reason}`,
    userId: input.user?.id,
    userName: input.user?.name,
    role: input.user?.role,
    documentId: input.partId,
  });

  return {
    success: true,
    message: `Stok ${partName} berhasil disesuaikan menjadi ${input.newStock} unit.`,
    previousStock: prevStock,
    newStock: input.newStock,
  };
}

/**
 * Atomic stock purchase / Kulakan barang masuk
 */
export async function purchaseStockAtomic(input: StockPurchaseInput): Promise<{
  success: boolean;
  message: string;
  previousStock: number;
  newStock: number;
}> {
  if (input.addedQty <= 0) {
    throw new Error('Jumlah barang masuk harus lebih dari 0.');
  }

  const partRef = doc(db, SPAREPARTS_COLLECTION, input.partId);

  let prevStock = 0;
  let partName = '';
  let partCode = '';
  let finalStock = 0;

  await runTransaction(db, async (transaction) => {
    const partSnap = await transaction.get(partRef);
    if (!partSnap.exists()) {
      throw new Error(`Sparepart dengan ID ${input.partId} tidak ditemukan.`);
    }

    const partData = partSnap.data() as Sparepart;
    prevStock = partData.stock || 0;
    partName = partData.name;
    partCode = partData.code;
    finalStock = prevStock + input.addedQty;

    const updates: Partial<Sparepart> = {
      stock: finalStock,
      lastUpdated: getJayapuraISOString(),
    };

    if (input.newBuyPrice !== undefined && input.newBuyPrice > 0) {
      updates.buyPrice = input.newBuyPrice;
    }
    if (input.newSellPrice !== undefined && input.newSellPrice > 0) {
      updates.sellPrice = input.newSellPrice;
    }
    if (input.newWholesalePrice !== undefined && input.newWholesalePrice > 0) {
      updates.wholesalePrice = input.newWholesalePrice;
    }
    if (input.supplier) {
      updates.supplier = input.supplier;
    }

    transaction.update(partRef, updates);
  });

  // Record Stock Movement Ledger
  await createStockMovementRecord({
    userId: input.user?.id || 'system',
    userName: input.user?.name || 'Admin',
    partId: input.partId,
    partCode,
    partName,
    type: 'PURCHASE',
    quantity: input.addedQty,
    previousStock: prevStock,
    newStock: finalStock,
    referenceId: input.invoiceNo || undefined,
    notes: `Barang Masuk / Pembelian${input.supplier ? ` dari ${input.supplier}` : ''}${input.invoiceNo ? ` (Faktur: ${input.invoiceNo})` : ''}`,
  });

  // Record Audit Log
  await recordAuditLog({
    action: 'STOCK_PURCHASE',
    module: 'Inventory',
    description: `Pembelian stok masuk ${partName} (${partCode}) sebanyak +${input.addedQty} unit. Stok akhir: ${finalStock}.`,
    userId: input.user?.id,
    userName: input.user?.name,
    role: input.user?.role,
    documentId: input.partId,
  });

  return {
    success: true,
    message: `Berhasil menambahkan +${input.addedQty} stok untuk ${partName}.`,
    previousStock: prevStock,
    newStock: finalStock,
  };
}

/**
 * Atomic stock deduction for order items (Sales or Services)
 */
export async function deductStockForOrderAtomic(
  parts: ServiceSparepartItem[],
  orderId: string,
  user?: UserAccount | null,
  isDirectSale: boolean = false
): Promise<void> {
  if (!parts || parts.length === 0) return;

  const now = getJayapuraISOString();

  // Run atomic verification and update in Firestore transaction
  await runTransaction(db, async (transaction) => {
    // 1. Read all current spareparts first
    const partReads = [];
    for (const item of parts) {
      const partRef = doc(db, SPAREPARTS_COLLECTION, item.partId);
      partReads.push({ item, ref: partRef, snapPromise: transaction.get(partRef) });
    }

    const resolved = [];
    for (const p of partReads) {
      const snap = await p.snapPromise;
      if (!snap.exists()) {
        throw new Error(`Sparepart "${p.item.name}" (ID: ${p.item.partId}) tidak ditemukan di inventaris.`);
      }
      const data = snap.data() as Sparepart;
      const currentStock = data.stock || 0;
      const requiredQty = p.item.qty;

      if (currentStock < requiredQty) {
        throw new Error(
          `Stok tidak mencukupi untuk "${p.item.name}". Tersedia: ${currentStock} ${data.unit || 'unit'}, dibutuhkan: ${requiredQty}.`
        );
      }

      resolved.push({
        item: p.item,
        ref: p.ref,
        currentStock,
        newStock: currentStock - requiredQty,
        data,
      });
    }

    // 2. Perform all updates
    for (const r of resolved) {
      transaction.update(r.ref, {
        stock: r.newStock,
        lastUpdated: now,
      });
    }
  });

  // 3. Record movements and audit logs after successful transaction
  for (const item of parts) {
    const movementType: StockMovementType = isDirectSale ? 'SALE' : 'SERVICE_USAGE';
    await createStockMovementRecord({
      userId: user?.id || 'system',
      userName: user?.name || 'Kasir',
      partId: item.partId,
      partCode: item.code,
      partName: item.name,
      type: movementType,
      quantity: -item.qty,
      previousStock: 0, // Recorded by transaction
      newStock: 0,
      referenceId: orderId,
      notes: isDirectSale ? `Penjualan langsung nota ${orderId}` : `Penggunaan servis nota ${orderId}`,
    });
  }
}

/**
 * Atomic stock restoration for returned items
 */
export async function restoreStockForReturnAtomic(
  items: { partId: string; qty: number; reason: string; code: string; name: string }[],
  orderId: string,
  returnId: string,
  user?: UserAccount | null
): Promise<void> {
  if (!items || items.length === 0) return;

  const now = getJayapuraISOString();

  await runTransaction(db, async (transaction) => {
    const partReads = [];
    for (const item of items) {
      const partRef = doc(db, SPAREPARTS_COLLECTION, item.partId);
      partReads.push({ item, ref: partRef, snapPromise: transaction.get(partRef) });
    }

    const resolved = [];
    for (const p of partReads) {
      const snap = await p.snapPromise;
      if (snap.exists()) {
        const data = snap.data() as Sparepart;
        const currentStock = data.stock || 0;
        const newStock = currentStock + p.item.qty;
        resolved.push({ item: p.item, ref: p.ref, currentStock, newStock, data });
      }
    }

    for (const r of resolved) {
      transaction.update(r.ref, {
        stock: r.newStock,
        lastUpdated: now,
      });
    }
  });

  // Record Stock Movements
  for (const item of items) {
    await createStockMovementRecord({
      userId: user?.id || 'system',
      userName: user?.name || 'Kasir',
      partId: item.partId,
      partCode: item.code,
      partName: item.name,
      type: 'RETURN',
      quantity: item.qty,
      previousStock: 0,
      newStock: 0,
      referenceId: `${orderId}/${returnId}`,
      notes: `Retur penjualan: ${item.reason} (Nota: ${orderId})`,
    });
  }
}

/**
 * Subscribe to stock movements
 */
export function subscribeStockMovements(
  onData: (movements: StockMovement[]) => void,
  partIdFilter?: string,
  maxItems: number = 100
) {
  try {
    const colRef = collection(db, STOCK_MOVEMENTS_COLLECTION);
    let q = query(colRef, orderBy('timestamp', 'desc'), firestoreLimit(maxItems));
    if (partIdFilter) {
      q = query(colRef, where('partId', '==', partIdFilter), orderBy('timestamp', 'desc'), firestoreLimit(maxItems));
    }

    return onSnapshot(
      q,
      (snapshot) => {
        const movements: StockMovement[] = [];
        snapshot.forEach((d) => {
          movements.push({ ...(d.data() as StockMovement), id: d.id });
        });
        onData(movements);
      },
      (err) => {
        console.warn('Stock movements subscription note:', err.message);
      }
    );
  } catch (err) {
    console.warn('Could not subscribe to stock movements:', err);
    return () => {};
  }
}

/**
 * Fetch all stock movements for report / export
 */
export async function fetchAllStockMovements(maxItems: number = 1000): Promise<StockMovement[]> {
  try {
    const colRef = collection(db, STOCK_MOVEMENTS_COLLECTION);
    const q = query(colRef, orderBy('timestamp', 'desc'), firestoreLimit(maxItems));
    const snap = await getDocs(q);
    const movements: StockMovement[] = [];
    snap.forEach((d) => {
      movements.push({ ...(d.data() as StockMovement), id: d.id });
    });
    return movements;
  } catch (err) {
    console.warn('Error fetching all stock movements:', err);
    return [];
  }
}
