export type ServiceStatus = 'MENUNGGU' | 'PROSES' | 'SELESAI' | 'LUNAS' | 'BATAL';

export type PaymentMethod = 'TUNAI' | 'QRIS' | 'TRANSFER' | 'DEBIT';

export type SparepartCategory =
  | 'Oli & Pelumas'
  | 'Ban & Ban Dalam'
  | 'Rem & Kopling'
  | 'Kelistrikan & Busi'
  | 'Rantai & Gir'
  | 'Mesin & Injeksi'
  | 'Aksesoris & CVT'
  | 'Lainnya';

export interface ServiceLaborItem {
  id: string;
  name: string;
  price: number;
}

export interface ServiceSparepartItem {
  partId: string;
  code: string;
  name: string;
  qty: number;
  sellPrice: number;
  wholesalePrice?: number;
  priceType?: 'ECER' | 'GROSIR';
  buyPrice: number; // HPP
  imageUrl?: string;
  returnedQty?: number; // Jumlah unit yang telah diretur
  returnReason?: string;
  returnDate?: string;
}

export interface ReturnItemDetail {
  partId: string;
  partCode: string;
  partName: string;
  qty: number;
  sellPrice: number;
  refundSubtotal: number;
  reason: string;
}

export interface ReturnRecord {
  id: string; // e.g. "RET-20260817-001"
  returnDate: string; // ISO string
  items: ReturnItemDetail[];
  totalRefund: number;
  refundPaymentMethod?: PaymentMethod;
  refundNotes?: string;
  processedBy?: string;
}

export interface ServiceOrder {
  id: string; // e.g. "SRV-20260723-001"
  customerName: string;
  customerPhone: string;
  plateNumber: string; // e.g. "K 4821 YW"
  motorModel: string; // e.g. "Honda Vario 150 Keyless 2021"
  complaint: string;
  mechanicId: string;
  mechanicName: string;
  status: ServiceStatus;
  createdAt: string; // ISO string
  updatedAt: string;
  completedAt?: string;
  labors: ServiceLaborItem[];
  parts: ServiceSparepartItem[];
  subtotalLabor: number;
  subtotalParts: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: 'BELUM' | 'LUNAS';
  mechanicCommissionPercent: number; // e.g. 25 (%)
  mechanicCommissionAmount: number;
  dueDate?: string; // YYYY-MM-DD for Grosir Tempo / Piutang
  notes?: string;
  returnHistory?: ReturnRecord[];
  totalRefund?: number;
}

export interface Sparepart {
  id: string;
  code: string; // e.g. "OLI-MPX2-800"
  name: string;
  category: SparepartCategory;
  buyPrice: number; // HPP
  sellPrice: number; // Harga Jual Eceran
  wholesalePrice: number; // Harga Jual Grosir
  stock: number;
  minStock: number;
  rackLocation: string; // e.g. "Rak A-02"
  unit: string; // e.g. "Botol", "Pcs", "Set", "Bungkus"
  supplier?: string;
  imageUrl?: string;
  lastUpdated: string;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  role: 'Mekanik Senior' | 'Mekanik Junior' | 'Kasir' | 'Kepala Bengkel';
  dailyBaseSalary: number; // Gaji Pokok Harian
  commissionRateLabor: number; // % komisi dari jasa servis (misal 25%)
  joinDate: string;
  status: 'Aktif' | 'Non-Aktif';
  bankInfo?: string;
}

export interface EmployeeLoan {
  id: string; // e.g. "LOAN-172345678"
  employeeId: string;
  employeeName: string;
  type: 'PINJAMAN' | 'CICILAN' | 'PELUNASAN' | 'POTONG_GAJI';
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string; // ISO timestamp
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  periodStart: string;
  periodEnd: string;
  paidAt: string;
  daysWorked: number;
  totalBaseSalary: number;
  totalCommission: number; // dari total jasa servis periode tsb
  bonus: number;
  deductions: number; // kasbon / potongan
  loanDeduction?: number; // potongan spesifik pinjaman/kasbon
  netTotal: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface ShopSettings {
  shopName: string;
  ownerName: string;
  logoUrl?: string;
  shopTagline: string;
  address: string;
  city: string;
  phone: string;
  headerMessage: string;
  footerMessage: string;
  paperWidth: '58mm' | '80mm';
  printWidthPreset?: '28mm' | '30mm' | '32mm' | '35mm' | '38mm' | '48mm' | '72mm';
  printFontSize?: string;
  printAlign?: 'left' | 'center';
  fontFamily?: 'sans' | 'mono';
  leftMarginMm?: string;
  printScale?: string;
  defaultLaborCommission: number;
  autoPrintReceipt: boolean;
  printerMode?: 'BROWSER' | 'BLUETOOTH' | 'RAWBT';
  feedLines?: number;
}

export interface PresetLabor {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface CustomerVehicle {
  plateNumber: string; // e.g. "K 4821 YW"
  motorModel: string;  // e.g. "Honda Vario 150 Esp (2020)"
  lastServiceDate?: string;
  nextServiceDueDate?: string;
  notes?: string;
}

export interface Customer {
  id: string; // e.g. "CUST-001"
  name: string;
  phone: string;
  email?: string;
  address?: string;
  vehicles: CustomerVehicle[];
  totalVisits: number;
  totalSpent: number;
  createdAt: string;
  notes?: string;
  lastReminderSent?: string;
  isWholesale?: boolean;
}

export interface WholesaleCustomer {
  id: string; // e.g. "GSR-001"
  name: string; // Nama Toko / Bengkel / Langganan Grosir
  contactPerson?: string; // Nama Penanggung Jawab
  phone: string;
  address?: string;
  discountPercent?: number; // e.g. 0% or 5%
  notes?: string;
  createdAt: string;
}

export type NotificationType =
  | 'LOW_STOCK'
  | 'NEW_SERVICE'
  | 'SERVICE_COMPLETED'
  | 'CUSTOMER_REMINDER'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  relatedId?: string;
  actionTab?: string;
  customerPhone?: string;
}

export type UserRole = 'kasir' | 'admin';

export interface UserAccount {
  id: string; // Firebase Auth UID
  email: string;
  name: string;
  username?: string;
  password?: string;
  role: UserRole;
  allowedTabs: string[];
  status?: 'Aktif' | 'Non-Aktif';
  createdAt?: string;
  lastLogin?: string;
}

export type StockMovementType =
  | 'STOCK_IN'
  | 'SALE'
  | 'SERVICE_USAGE'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'CANCEL'
  | 'PURCHASE';

export interface StockMovement {
  id: string; // e.g. "SM-20260824-001"
  timestamp: string; // Jayapura ISO string
  userId: string;
  userName: string;
  partId: string;
  partCode: string;
  partName: string;
  type: StockMovementType;
  quantity: number; // positive for addition, negative for reduction
  previousStock: number;
  newStock: number;
  referenceId?: string; // Order ID / Purchase ID
  notes?: string;
}

export type AuditLogAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE_CUSTOMER'
  | 'EDIT_CUSTOMER'
  | 'DELETE_CUSTOMER'
  | 'CREATE_TRANSACTION'
  | 'EDIT_TRANSACTION'
  | 'CANCEL_TRANSACTION'
  | 'RETURN_TRANSACTION'
  | 'STOCK_ADJUSTMENT'
  | 'STOCK_PURCHASE'
  | 'PRICE_CHANGE'
  | 'CREATE_USER'
  | 'EDIT_USER'
  | 'DELETE_USER'
  | 'ROLE_CHANGE'
  | 'PAYROLL_PROCESSED'
  | 'LOAN_CHANGE'
  | 'SETTINGS_CHANGE'
  | 'BACKUP_CREATED'
  | 'RESTORE_DATA';

export interface AuditLog {
  id: string;
  timestamp: string; // Jayapura ISO string
  userId: string;
  userName: string;
  role: UserRole;
  action: AuditLogAction;
  module: string;
  documentId?: string;
  description: string;
  metadata?: Record<string, any>;
}

export type SyncStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNCED' | 'ERROR';



