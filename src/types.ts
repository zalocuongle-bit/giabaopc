export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  imageUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPrice?: number; // per unit discount if any
}

export interface OrderItem {
  productId: string;
  barcode: string;
  name: string;
  category: string;
  costPrice: number;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export type PaymentMethod = 'cash' | 'transfer' | 'card';

export interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  discount: number; // in VND
  discountPercent?: number;
  total: number;
  costTotal: number;
  profit: number;
  customerName?: string;
  customerPhone?: string;
  paymentMethod: PaymentMethod;
  cashGiven?: number;
  changeDue?: number;
  notes?: string;
  cashierName: string;
  cashierId?: string;
  status: 'completed' | 'cancelled';
  createdAt: string; // ISO date string
}

export interface StoreSettings {
  storeName: string;
  storePhone: string;
  storeAddress: string;
  receiptFooter: string;
  printerFormat: 'K80' | 'K57' | 'A4';
  autoPrintReceipt: boolean;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'admin' | 'staff';
  isBackdoorAdmin?: boolean;
}

export type ActiveTab = 'pos' | 'products' | 'orders' | 'reports' | 'settings';
