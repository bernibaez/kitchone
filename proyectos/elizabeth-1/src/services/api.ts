// Servicio de API en memoria para prototipo (sin backend ni SQLite)
// Mantiene datos en memoria y en localStorage para simular un backend básico.

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  [key: string]: any;
}

type UserRole = 'admin' | 'vendedor' | 'cajero';

interface UserRecord {
  id: number;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  password: string;
  active: boolean;
}

interface ProductRecord {
  id: number;
  name: string;
  description?: string;
  sku: string;
  price: number;
  wholesale_price?: number;
  cost: number;
  stock: number;
  min_stock: number;
  category_id?: number | null;
  provider_id?: number | null;
  category_name?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface CustomerRecord {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  rnc?: string;
  credit_limit?: number;
  total_purchases: number;
  last_purchase?: string;
  active: boolean;
  created_at: string;
}

interface ProviderRecord {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  rnc?: string;
  contact_name?: string;
  active: boolean;
  created_at: string;
}

interface SaleItemRecord {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost: number;
  total: number;
  profit: number;
}

interface SaleRecord {
  id: number;
  customer_id?: number;
  customer_name?: string;
  items: SaleItemRecord[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  total_profit: number;
  payment_method: 'efectivo' | 'tarjeta' | 'transferencia' | 'cheque';
  user_id: number;
  seller_name: string;
  created_at: string;
  invoice_number: string;
  notes?: string;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignorar errores de almacenamiento
  }
}

class MockApiService {
  private users: UserRecord[] = [];
  private products: ProductRecord[] = [];
  private customers: CustomerRecord[] = [];
  private sales: SaleRecord[] = [];
  private categories: { id: number; name: string }[] = [];
  private providers: ProviderRecord[] = [];

  constructor() {
    this.users = loadFromStorage<UserRecord[]>('mock_users', []);
    this.products = loadFromStorage<ProductRecord[]>('mock_products', []);
    this.customers = loadFromStorage<CustomerRecord[]>('mock_customers', []);
    this.sales = loadFromStorage<SaleRecord[]>('mock_sales', []);
    this.categories = loadFromStorage<{ id: number; name: string }[]>('mock_categories', []);
    this.providers = loadFromStorage<ProviderRecord[]>('mock_providers', []);

    // Crear un admin por defecto si no existe
    if (this.users.length === 0) {
      const admin: UserRecord = {
        id: 1,
        username: 'admin',
        name: 'Administrador',
        email: 'admin@empresa.com',
        role: 'admin',
        password: '123456',
        active: true,
      };
      this.users.push(admin);
      saveToStorage('mock_users', this.users);
    }

    // Categorías de ejemplo
    if (this.categories.length === 0) {
      this.categories = [
        { id: 1, name: 'Tecnología' },
        { id: 2, name: 'Accesorios' },
        { id: 3, name: 'Oficina' },
      ];
      saveToStorage('mock_categories', this.categories);
    }

    // Datos de ejemplo para productos
    if (this.products.length === 0) {
      const now = new Date().toISOString();
      this.products = [
        {
          id: 1,
          name: 'Laptop Profesional 15"',
          description: 'Laptop para oficina con 16GB RAM y SSD 512GB',
          sku: 'PROD-001',
          price: 45000,
          wholesale_price: 43000,
          cost: 32000,
          stock: 8,
          min_stock: 3,
          category_id: 1,
          category_name: 'Tecnología',
          active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: 2,
          name: 'Mouse Inalámbrico',
          description: 'Mouse ergonómico 2.4GHz',
          sku: 'PROD-002',
          price: 800,
          wholesale_price: 700,
          cost: 400,
          stock: 25,
          min_stock: 5,
          category_id: 2,
          category_name: 'Accesorios',
          active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: 3,
          name: 'Monitor 24" LED',
          description: 'Monitor Full HD 1080p',
          sku: 'PROD-003',
          price: 9500,
          wholesale_price: 9000,
          cost: 7000,
          stock: 4,
          min_stock: 2,
          category_id: 1,
          category_name: 'Tecnología',
          active: true,
          created_at: now,
          updated_at: now,
        },
      ];
      saveToStorage('mock_products', this.products);
    }

    // Datos de ejemplo para clientes
    if (this.customers.length === 0) {
      const now = new Date().toISOString();
      this.customers = [
        {
          id: 1,
          name: 'Juan Pérez',
          phone: '809-555-0101',
          email: 'juan.perez@example.com',
          address: 'Calle 1 #10, Santo Domingo',
          rnc: '001234567',
          credit_limit: 50000,
          total_purchases: 75000,
          last_purchase: now,
          active: true,
          created_at: now,
        },
        {
          id: 2,
          name: 'Ferretería El Martillo',
          phone: '809-555-0202',
          email: 'ventas@elmartillo.com',
          address: 'Av. Industrial 200',
          rnc: '009876543',
          credit_limit: 150000,
          total_purchases: 120000,
          last_purchase: now,
          active: true,
          created_at: now,
        },
        {
          id: 3,
          name: 'María Gómez',
          phone: '809-555-0303',
          email: 'maria.gomez@example.com',
          address: 'Calle Sol #5',
          rnc: undefined,
          credit_limit: 20000,
          total_purchases: 18000,
          last_purchase: now,
          active: true,
          created_at: now,
        },
      ];
      saveToStorage('mock_customers', this.customers);
    }

    // Proveedores de ejemplo
    if (this.providers.length === 0) {
      const now = new Date().toISOString();
      this.providers = [
        {
          id: 1,
          name: 'Distribuidora Tech Dominicana',
          phone: '809-555-0404',
          email: 'contacto@techdo.com',
          address: 'Av. Tecnológica 45, Santo Domingo',
          rnc: '131415161',
          contact_name: 'Luis Rodríguez',
          active: true,
          created_at: now,
        },
        {
          id: 2,
          name: 'Importadora La Comercial',
          phone: '809-555-0505',
          email: 'ventas@lacomercial.com',
          address: 'Calle Comercio 200, Santiago',
          rnc: '171819202',
          contact_name: 'Ana Martínez',
          active: true,
          created_at: now,
        },
      ];
      saveToStorage('mock_providers', this.providers);
    }

    // Venta de ejemplo para que el dashboard tenga datos
    if (this.sales.length === 0 && this.products.length > 0) {
      const now = new Date().toISOString();
      const sale: SaleRecord = {
        id: 1,
        customer_id: 1,
        customer_name: 'Juan Pérez',
        items: [
          {
            product_id: 1,
            product_name: 'Laptop Profesional 15"',
            quantity: 1,
            unit_price: 45000,
            cost: 32000,
            total: 45000,
            profit: 13000,
          },
          {
            product_id: 2,
            product_name: 'Mouse Inalámbrico',
            quantity: 2,
            unit_price: 800,
            cost: 400,
            total: 1600,
            profit: 800,
          },
        ],
        subtotal: 46600,
        tax: 0,
        discount: 0,
        total: 46600,
        total_profit: 13800,
        payment_method: 'efectivo',
        user_id: 1,
        seller_name: 'Administrador',
        created_at: now,
        invoice_number: `FAC${new Date().getFullYear()}000001`,
        notes: 'Venta de demostración',
      };

      this.sales = [sale];
      saveToStorage('mock_sales', this.sales);
    }
  }

  // --- AUTENTICACIÓN ---
  async login(username: string, password: string): Promise<ApiResponse> {
    const user = this.users.find(
      u =>
        u.active &&
        (u.username === username || u.email === username) &&
        u.password === password
    );

    if (!user) {
      return { success: false, message: 'Credenciales inválidas' };
    }

    const safeUser = {
      id: String(user.id),
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      active: user.active,
    };

    return { success: true, user: safeUser };
  }

  // --- USUARIOS ---
  async getUsers(): Promise<ApiResponse> {
    return {
      success: true,
      users: this.users.map(u => ({
        id: String(u.id),
        username: u.username,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
      })),
    };
  }

  async createUser(userData: any): Promise<ApiResponse> {
    const id = this.users.length ? this.users[this.users.length - 1].id + 1 : 1;
    const user: UserRecord = {
      id,
      username: userData.username,
      name: userData.name,
      email: userData.email,
      role: (userData.role as UserRole) || 'vendedor',
      password: userData.password || '123456',
      active: userData.active ?? true,
    };
    this.users.push(user);
    saveToStorage('mock_users', this.users);
    return { success: true, user };
  }

  async updateUser(id: string, userData: any): Promise<ApiResponse> {
    const numericId = Number(id);
    const index = this.users.findIndex(u => u.id === numericId);
    if (index === -1) return { success: false, message: 'Usuario no encontrado' };

    this.users[index] = {
      ...this.users[index],
      ...userData,
    };
    saveToStorage('mock_users', this.users);
    return { success: true, user: this.users[index] };
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    const numericId = Number(id);
    this.users = this.users.filter(u => u.id !== numericId);
    saveToStorage('mock_users', this.users);
    return { success: true };
  }

  // --- PRODUCTOS ---
  async getProducts(): Promise<ApiResponse> {
    return { success: true, products: this.products };
  }

  async getCategories(): Promise<ApiResponse> {
    return { success: true, data: this.categories };
  }

  async createProduct(productData: any): Promise<ApiResponse> {
    const id = this.products.length ? this.products[this.products.length - 1].id + 1 : 1;
    const now = new Date().toISOString();
    const categoryId = productData.category_id !== undefined && productData.category_id !== null
      ? Number(productData.category_id)
      : null;
    const derivedCategoryName =
      productData.category_name ||
      (categoryId ? this.categories.find(c => c.id === categoryId)?.name : undefined) ||
      'Sin categoría';
    const product: ProductRecord = {
      id,
      name: productData.name || '',
      description: productData.description || null,
      sku: productData.sku || productData.code || `PROD-${id}`,
      price: Number(productData.price) || 0,
      wholesale_price: productData.wholesale_price !== undefined ? Number(productData.wholesale_price) : undefined,
      cost: Number(productData.cost) || 0,
      stock: Number(productData.stock) || 0,
      min_stock: Number(productData.min_stock ?? productData.minStock ?? 5),
      category_id: categoryId,
      provider_id: productData.provider_id !== undefined && productData.provider_id !== null ? Number(productData.provider_id) : null,
      category_name: derivedCategoryName,
      active: productData.active ?? true,
      created_at: now,
      updated_at: now,
    };
    this.products.push(product);
    saveToStorage('mock_products', this.products);
    return { success: true, product };
  }

  async updateProduct(id: string, productData: any): Promise<ApiResponse> {
    const numericId = Number(id);
    const index = this.products.findIndex(p => p.id === numericId);
    if (index === -1) return { success: false, message: 'Producto no encontrado' };

    const nextCategoryId = productData.category_id !== undefined
      ? (productData.category_id === null ? null : Number(productData.category_id))
      : (this.products[index].category_id ?? null);
    const nextCategoryName =
      productData.category_name ||
      (nextCategoryId ? this.categories.find(c => c.id === nextCategoryId)?.name : undefined) ||
      this.products[index].category_name ||
      'Sin categoría';

    this.products[index] = {
      ...this.products[index],
      ...productData,
      wholesale_price: productData.wholesale_price !== undefined
        ? Number(productData.wholesale_price)
        : this.products[index].wholesale_price,
      category_id: nextCategoryId,
      category_name: nextCategoryName,
      provider_id: productData.provider_id !== undefined
        ? (productData.provider_id === null ? null : Number(productData.provider_id))
        : this.products[index].provider_id,
      updated_at: new Date().toISOString(),
    };
    saveToStorage('mock_products', this.products);
    return { success: true, product: this.products[index] };
  }

  async deleteProduct(id: string): Promise<ApiResponse> {
    const numericId = Number(id);
    this.products = this.products.filter(p => p.id !== numericId);
    saveToStorage('mock_products', this.products);
    return { success: true };
  }

  // --- CLIENTES ---
  async getCustomers(): Promise<ApiResponse> {
    return { success: true, customers: this.customers };
  }

  // --- PROVEEDORES ---
  async getProviders(): Promise<ApiResponse> {
    return { success: true, providers: this.providers };
  }

  async createCustomer(customerData: any): Promise<ApiResponse> {
    const id = this.customers.length ? this.customers[this.customers.length - 1].id + 1 : 1;
    const now = new Date().toISOString();
    const customer: CustomerRecord = {
      id,
      name: customerData.name || '',
      phone: customerData.phone || '',
      email: customerData.email,
      address: customerData.address,
      rnc: customerData.rnc,
      credit_limit: customerData.credit_limit,
      total_purchases: 0,
      last_purchase: undefined,
      active: customerData.active ?? true,
      created_at: now,
    };
    this.customers.push(customer);
    saveToStorage('mock_customers', this.customers);
    return { success: true, customer };
  }

  async createProvider(providerData: any): Promise<ApiResponse> {
    const id = this.providers.length ? this.providers[this.providers.length - 1].id + 1 : 1;
    const now = new Date().toISOString();
    const provider: ProviderRecord = {
      id,
      name: providerData.name || '',
      phone: providerData.phone || '',
      email: providerData.email,
      address: providerData.address,
      rnc: providerData.rnc,
      contact_name: providerData.contactName,
      active: providerData.active ?? true,
      created_at: now,
    };
    this.providers.push(provider);
    saveToStorage('mock_providers', this.providers);
    return { success: true, provider };
  }

  async updateCustomer(id: string, customerData: any): Promise<ApiResponse> {
    const numericId = Number(id);
    const index = this.customers.findIndex(c => c.id === numericId);
    if (index === -1) return { success: false, message: 'Cliente no encontrado' };

    this.customers[index] = {
      ...this.customers[index],
      ...customerData,
    };
    saveToStorage('mock_customers', this.customers);
    return { success: true, customer: this.customers[index] };
  }

  async updateProvider(id: string, providerData: any): Promise<ApiResponse> {
    const numericId = Number(id);
    const index = this.providers.findIndex(p => p.id === numericId);
    if (index === -1) return { success: false, message: 'Proveedor no encontrado' };

    this.providers[index] = {
      ...this.providers[index],
      ...providerData,
    };
    saveToStorage('mock_providers', this.providers);
    return { success: true, provider: this.providers[index] };
  }

  async deleteCustomer(id: string): Promise<ApiResponse> {
    const numericId = Number(id);
    this.customers = this.customers.filter(c => c.id !== numericId);
    saveToStorage('mock_customers', this.customers);
    return { success: true };
  }

  async deleteProvider(id: string): Promise<ApiResponse> {
    const numericId = Number(id);
    this.providers = this.providers.filter(p => p.id !== numericId);
    saveToStorage('mock_providers', this.providers);
    return { success: true };
  }

  // --- VENTAS ---
  async getSales(): Promise<ApiResponse> {
    return { success: true, sales: this.sales };
  }

  async createSale(saleData: any): Promise<ApiResponse> {
    const id = this.sales.length ? this.sales[this.sales.length - 1].id + 1 : 1;
    const now = new Date().toISOString();

    const sale: SaleRecord = {
      id,
      customer_id: saleData.customer_id || null,
      customer_name: saleData.customer_name || 'Cliente genérico',
      items: (saleData.items || []).map((item: any) => ({
        product_id: Number(item.product_id) || 0,
        product_name: item.product_name || '',
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.price) || 0,
        cost: Number(item.cost) || 0,
        total: Number(item.subtotal) || 0,
        profit: Number(item.profit) || 0,
      })),
      subtotal: Number(saleData.subtotal) || 0,
      tax: Number(saleData.tax) || 0,
      discount: Number(saleData.discount) || 0,
      total: Number(saleData.total) || 0,
      total_profit: Number(saleData.total_profit ?? saleData.totalProfit ?? 0),
      payment_method: saleData.payment_method || 'efectivo',
      user_id: Number(saleData.user_id) || 1,
      seller_name: saleData.seller_name || 'Admin',
      created_at: now,
      invoice_number: saleData.invoice_number || `FAC${new Date().getFullYear()}${String(id).padStart(6, '0')}`,
      notes: saleData.notes,
    };

    this.sales.push(sale);
    saveToStorage('mock_sales', this.sales);

    // Actualizar stock de productos
    sale.items.forEach(item => {
      const pIndex = this.products.findIndex(p => p.id === item.product_id);
      if (pIndex !== -1) {
        this.products[pIndex].stock = Math.max(
          0,
          this.products[pIndex].stock - item.quantity
        );
        this.products[pIndex].updated_at = now;
      }
    });
    saveToStorage('mock_products', this.products);

    return { success: true, sale };
  }

  async deleteSale(id: string): Promise<ApiResponse> {
    const numericId = Number(id);
    this.sales = this.sales.filter(s => s.id !== numericId);
    saveToStorage('mock_sales', this.sales);
    return { success: true };
  }
}

export default new MockApiService();