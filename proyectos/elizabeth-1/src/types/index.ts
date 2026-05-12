export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'vendedor' | 'cajero';
  email?: string;
  lastLogin?: Date;
  active: boolean;
  password: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  category_id: number;
  providerId?: string;
  icon: string;
  price: number;
  wholesalePrice?: number;
  cost: number;
  stock: number;
  minStock: number;
  code: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  image?: string;
  imageUrl?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  rnc?: string;
  credit_limit?: number;
  totalPurchases: number;
  lastPurchase?: Date;
  active: boolean;
  createdAt: Date;
}

export interface Provider {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  rnc?: string;
  contactName?: string;
  active: boolean;
  createdAt: Date;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  cost: number;
  subtotal: number;
  profit: number;
  useWholesale?: boolean;
}

export interface Sale {
  id: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  totalProfit: number;
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia' | 'cheque';
  userId: string;
  userName: string;
  date: Date;
  invoiceNumber: string;
  notes?: string;
}

export interface BusinessConfig {
  socials: {};
  message: string;
  name: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  invoicePrefix: string;
  productPrefix: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
}

export interface DashboardStats {
  todaySales: number;
  todayProfit: number;
  monthSales: number;
  monthProfit: number;
  totalSales: number;
  totalProfit: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
}