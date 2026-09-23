import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Employee, EmployeeLoan, PayrollRecord, UserAccount } from '../types';
import { getJayapuraISOString } from '../lib/timezone';
import { recordAuditLog } from './auditService';

export const EMPLOYEES_COLLECTION = 'employees';
export const EMPLOYEE_LOANS_COLLECTION = 'employee_loans';
export const PAYROLL_RECORDS_COLLECTION = 'payroll_records';

function cleanPayload<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Save / Update Employee
 */
export async function saveEmployee(
  employee: Employee,
  user?: UserAccount | null
): Promise<Employee> {
  if (user && user.role !== 'admin') {
    throw new Error('Hanya Admin yang berhak mengelola data karyawan.');
  }

  const id = employee.id || `EMP-${Date.now().toString().slice(-6)}`;
  const fullEmployee: Employee = {
    ...employee,
    id,
    dailyBaseSalary: Math.round(Number(employee.dailyBaseSalary) || 0),
    commissionRateLabor: Number(employee.commissionRateLabor) || 0,
  };

  const docRef = doc(db, EMPLOYEES_COLLECTION, id);
  await setDoc(docRef, cleanPayload(fullEmployee), { merge: true });

  await recordAuditLog({
    action: 'PAYROLL_PROCESSED',
    module: 'Employees',
    description: `Menyimpan data karyawan ${fullEmployee.name} (${fullEmployee.role}). Gaji: Rp ${fullEmployee.dailyBaseSalary.toLocaleString('id-ID')}, Komisi: ${fullEmployee.commissionRateLabor}%.`,
    userId: user?.id,
    userName: user?.name,
    role: user?.role,
    documentId: id,
  });

  return fullEmployee;
}

/**
 * Delete Employee
 */
export async function deleteEmployee(
  id: string,
  user?: UserAccount | null
): Promise<void> {
  if (user && user.role !== 'admin') {
    throw new Error('Hanya Admin yang berhak menghapus data karyawan.');
  }

  const docRef = doc(db, EMPLOYEES_COLLECTION, id);
  await deleteDoc(docRef);

  await recordAuditLog({
    action: 'PAYROLL_PROCESSED',
    module: 'Employees',
    description: `Menghapus data karyawan ID: ${id}.`,
    userId: user?.id,
    userName: user?.name,
    role: user?.role,
    documentId: id,
  });
}

/**
 * Save / Update Employee Loan (Kasbon)
 */
export async function saveEmployeeLoan(
  loan: EmployeeLoan,
  user?: UserAccount | null
): Promise<EmployeeLoan> {
  if (user && user.role !== 'admin') {
    throw new Error('Hanya Admin yang berhak mengelola kasbon karyawan.');
  }

  const now = getJayapuraISOString();
  const id = loan.id || `LOAN-${Date.now().toString().slice(-8)}`;
  const fullLoan: EmployeeLoan = {
    ...loan,
    id,
    amount: Math.round(Number(loan.amount) || 0),
    createdAt: loan.createdAt || now,
  };

  const docRef = doc(db, EMPLOYEE_LOANS_COLLECTION, id);
  await setDoc(docRef, cleanPayload(fullLoan), { merge: true });

  await recordAuditLog({
    action: 'LOAN_CHANGE',
    module: 'Loans & Kasbon',
    description: `Mencatat transaksi kasbon ${fullLoan.type} untuk ${fullLoan.employeeName} senilai Rp ${fullLoan.amount.toLocaleString('id-ID')}.`,
    userId: user?.id,
    userName: user?.name,
    role: user?.role,
    documentId: id,
  });

  return fullLoan;
}

/**
 * Delete Employee Loan
 */
export async function deleteEmployeeLoan(
  id: string,
  user?: UserAccount | null
): Promise<void> {
  if (user && user.role !== 'admin') {
    throw new Error('Hanya Admin yang berhak menghapus catatan kasbon.');
  }

  const docRef = doc(db, EMPLOYEE_LOANS_COLLECTION, id);
  await deleteDoc(docRef);

  await recordAuditLog({
    action: 'LOAN_CHANGE',
    module: 'Loans & Kasbon',
    description: `Menghapus catatan kasbon ID: ${id}.`,
    userId: user?.id,
    userName: user?.name,
    role: user?.role,
    documentId: id,
  });
}

/**
 * Process & Save Payroll Record (Slip Gaji)
 */
export async function savePayrollRecord(
  record: PayrollRecord,
  user?: UserAccount | null
): Promise<PayrollRecord> {
  if (user && user.role !== 'admin') {
    throw new Error('Hanya Admin yang berhak memproses dan menyimpan slip gaji.');
  }

  const now = getJayapuraISOString();
  const id = record.id || `PAY-${now.substring(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

  const fullRecord: PayrollRecord = {
    ...record,
    id,
    paidAt: record.paidAt || now,
    totalBaseSalary: Math.round(Number(record.totalBaseSalary) || 0),
    totalCommission: Math.round(Number(record.totalCommission) || 0),
    bonus: Math.round(Number(record.bonus) || 0),
    deductions: Math.round(Number(record.deductions) || 0),
    loanDeduction: Math.round(Number(record.loanDeduction) || 0),
    netTotal: Math.round(Number(record.netTotal) || 0),
  };

  const docRef = doc(db, PAYROLL_RECORDS_COLLECTION, id);
  await setDoc(docRef, cleanPayload(fullRecord), { merge: true });

  // If there is a loan deduction, record it in employee_loans as POTONG_GAJI
  if (fullRecord.loanDeduction && fullRecord.loanDeduction > 0) {
    const loanEntry: EmployeeLoan = {
      id: `LOAN-DED-${id}`,
      employeeId: fullRecord.employeeId,
      employeeName: fullRecord.employeeName,
      type: 'POTONG_GAJI',
      amount: fullRecord.loanDeduction,
      date: now.substring(0, 10),
      notes: `Potong gaji periode ${fullRecord.periodStart} s/d ${fullRecord.periodEnd} (Slip: ${id})`,
      createdAt: now,
    };
    const loanDocRef = doc(db, EMPLOYEE_LOANS_COLLECTION, loanEntry.id);
    await setDoc(loanDocRef, cleanPayload(loanEntry));
  }

  await recordAuditLog({
    action: 'PAYROLL_PROCESSED',
    module: 'Payroll',
    description: `Membayar gaji & komisi ${fullRecord.employeeName} periode ${fullRecord.periodStart} s/d ${fullRecord.periodEnd} sebesar Rp ${fullRecord.netTotal.toLocaleString('id-ID')} via ${fullRecord.paymentMethod}.`,
    userId: user?.id,
    userName: user?.name,
    role: user?.role,
    documentId: id,
  });

  return fullRecord;
}

/**
 * Delete Payroll Record
 */
export async function deletePayrollRecord(
  id: string,
  user?: UserAccount | null
): Promise<void> {
  if (user && user.role !== 'admin') {
    throw new Error('Hanya Admin yang berhak menghapus slip gaji.');
  }

  const docRef = doc(db, PAYROLL_RECORDS_COLLECTION, id);
  await deleteDoc(docRef);

  await recordAuditLog({
    action: 'PAYROLL_PROCESSED',
    module: 'Payroll',
    description: `Menghapus slip gaji ID: ${id}.`,
    userId: user?.id,
    userName: user?.name,
    role: user?.role,
    documentId: id,
  });
}
