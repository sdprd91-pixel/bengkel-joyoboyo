import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit as firestoreLimit,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AuditLog, AuditLogAction, UserRole } from '../types';
import { getJayapuraISOString } from '../lib/timezone';

export const AUDIT_LOGS_COLLECTION = 'audit_logs';

export interface RecordAuditInput {
  action: AuditLogAction;
  module: string;
  description: string;
  userId?: string;
  userName?: string;
  role?: UserRole;
  documentId?: string;
  metadata?: Record<string, any>;
}

/**
 * Record a single audit log entry in Firestore.
 */
export async function recordAuditLog(input: RecordAuditInput): Promise<void> {
  try {
    const timestamp = getJayapuraISOString();
    const id = `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const logDoc: AuditLog = {
      id,
      timestamp,
      userId: input.userId || 'system',
      userName: input.userName || 'System',
      role: input.role || 'admin',
      action: input.action,
      module: input.module,
      documentId: input.documentId,
      description: input.description,
      metadata: input.metadata || {},
    };

    const docRef = doc(db, AUDIT_LOGS_COLLECTION, id);
    await setDoc(docRef, logDoc);
  } catch (error) {
    // Audit logging should never crash the primary business operation
    console.warn('Audit log write error (non-fatal):', error);
  }
}

/**
 * Subscribe to recent audit logs in real-time.
 */
export function subscribeAuditLogs(
  onData: (logs: AuditLog[]) => void,
  maxLogs: number = 100
) {
  try {
    const colRef = collection(db, AUDIT_LOGS_COLLECTION);
    const q = query(colRef, orderBy('timestamp', 'desc'), firestoreLimit(maxLogs));

    return onSnapshot(
      q,
      (snapshot) => {
        const logs: AuditLog[] = [];
        snapshot.forEach((d) => {
          logs.push({ ...(d.data() as AuditLog), id: d.id });
        });
        onData(logs);
      },
      (error) => {
        console.warn('Audit logs subscription notice:', error.message);
      }
    );
  } catch (err) {
    console.warn('Could not subscribe to audit logs:', err);
    return () => {};
  }
}

/**
 * Fetch all audit logs (for export/backup).
 */
export async function fetchAllAuditLogs(maxLogs: number = 500): Promise<AuditLog[]> {
  try {
    const colRef = collection(db, AUDIT_LOGS_COLLECTION);
    const q = query(colRef, orderBy('timestamp', 'desc'), firestoreLimit(maxLogs));
    const snap = await getDocs(q);
    const logs: AuditLog[] = [];
    snap.forEach((d) => {
      logs.push({ ...(d.data() as AuditLog), id: d.id });
    });
    return logs;
  } catch (err) {
    console.warn('Error fetching audit logs:', err);
    return [];
  }
}
