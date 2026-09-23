import {
  collection,
  doc,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserAccount } from '../types';
import { getJayapuraISOString } from '../lib/timezone';
import { recordAuditLog } from './auditService';

export interface BackupData {
  version: string;
  exportedAt: string;
  exportedBy: string;
  collections: {
    settings?: any[];
    customers?: any[];
    wholesale_customers?: any[];
    spareparts?: any[];
    service_orders?: any[];
    archived_orders?: any[];
    employees?: any[];
    employee_loans?: any[];
    payroll_records?: any[];
    preset_labors?: any[];
    stock_movements?: any[];
  };
}

/**
 * Export all collections to a JSON string
 */
export async function exportFullDatabaseJSON(user?: UserAccount | null): Promise<string> {
  const collectionNames = [
    'settings',
    'customers',
    'wholesale_customers',
    'spareparts',
    'service_orders',
    'archived_orders',
    'employees',
    'employee_loans',
    'payroll_records',
    'preset_labors',
    'stock_movements',
  ];

  const backupObj: BackupData = {
    version: '1.0.0',
    exportedAt: getJayapuraISOString(),
    exportedBy: user?.name || 'Admin',
    collections: {},
  };

  for (const colName of collectionNames) {
    try {
      const snap = await getDocs(collection(db, colName));
      const docs: any[] = [];
      snap.forEach((d) => {
        docs.push({ ...d.data(), id: d.id });
      });
      (backupObj.collections as any)[colName] = docs;
    } catch (e) {
      console.warn(`Could not export collection ${colName}:`, e);
      (backupObj.collections as any)[colName] = [];
    }
  }

  await recordAuditLog({
    action: 'BACKUP_CREATED',
    module: 'System Backup',
    description: `Export backup data lengkap database oleh ${user?.name || 'Admin'}.`,
    userId: user?.id,
    userName: user?.name,
    role: user?.role,
  });

  return JSON.stringify(backupObj, null, 2);
}

/**
 * Download JSON string as a local file in browser
 */
export function downloadBackupFile(jsonString: string, filename?: string): void {
  const now = getJayapuraISOString().substring(0, 10).replace(/-/g, '');
  const finalFilename = filename || `backup-joyoboyo-yuwanain-${now}.json`;
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Restore database from validated JSON content (Admin Only)
 */
export async function restoreDatabaseFromJSON(
  jsonContent: string,
  user: UserAccount
): Promise<{ success: boolean; message: string; restoredCount: number }> {
  if (user.role !== 'admin') {
    throw new Error('Hanya Admin yang berhak memulihkan (restore) database.');
  }

  let parsed: BackupData;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (e) {
    throw new Error('Format file tidak valid. Pastikan file berupa file JSON backup yang benar.');
  }

  if (!parsed.collections || typeof parsed.collections !== 'object') {
    throw new Error('Struktur data backup tidak valid atau tidak memiliki koleksi data.');
  }

  let totalRestored = 0;

  for (const [colName, docs] of Object.entries(parsed.collections)) {
    if (!Array.isArray(docs) || docs.length === 0) continue;

    // Firestore batch limit is 500 operations
    const chunks = [];
    for (let i = 0; i < docs.length; i += 400) {
      chunks.push(docs.slice(i, i + 400));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const item of chunk) {
        if (!item.id) continue;
        const docRef = doc(db, colName, item.id);
        batch.set(docRef, item, { merge: true });
        totalRestored++;
      }
      await batch.commit();
    }
  }

  await recordAuditLog({
    action: 'RESTORE_DATA',
    module: 'System Backup',
    description: `Admin ${user.name} memulihkan data sistem dari file backup (${totalRestored} dokumen berhasil dipulihkan).`,
    userId: user.id,
    userName: user.name,
    role: user.role,
  });

  return {
    success: true,
    message: `Pemulihan data berhasil. ${totalRestored} dokumen telah disinkronkan ke Firestore.`,
    restoredCount: totalRestored,
  };
}
