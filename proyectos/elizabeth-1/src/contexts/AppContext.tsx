import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { User, Product, Customer, Provider, Sale, BusinessConfig, DashboardStats } from '../types';
import api from '../services/supabase-api';

interface AppState {
  user: User | null;
  users: User[];
  products: Product[];
  customers: Customer[];
  providers: Provider[];
  sales: Sale[];
  config: BusinessConfig;
  darkMode: boolean;
  sidebarCollapsed: boolean;
  sidebarLight: boolean;
  appSettings: {
    supabaseUrl: string;
    supabaseAnonKey: string;
  };
  loading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'DELETE_USER'; payload: string }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'SET_CUSTOMERS'; payload: Customer[] }
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'DELETE_CUSTOMER'; payload: string }
  | { type: 'SET_PROVIDERS'; payload: Provider[] }
  | { type: 'ADD_PROVIDER'; payload: Provider }
  | { type: 'UPDATE_PROVIDER'; payload: Provider }
  | { type: 'DELETE_PROVIDER'; payload: string }
  | { type: 'SET_SALES'; payload: Sale[] }
  | { type: 'ADD_SALE'; payload: Sale }
  | { type: 'UPDATE_SALE'; payload: Sale }
  | { type: 'DELETE_SALE'; payload: string }
  | { type: 'SET_CONFIG'; payload: BusinessConfig }
  | { type: 'SET_APP_SETTINGS'; payload: { supabaseUrl: string; supabaseAnonKey: string } }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_SIDEBAR_LIGHT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: AppState = {
  user: null,
  users: [],
  products: [],
  customers: [],
  providers: [],
  sales: [],
  config: {
    name: 'BNX VENTAS',
    currency: 'RD$',
    currencySymbol: '$',
    taxRate: 18,
    invoicePrefix: 'FAC',
    productPrefix: 'PROD',
    address: 'Calle Principal 123',
    phone: '+1 809 123 4567',
    email: 'info@bnxventas.com',
    socials: {
        twitter: '',
        facebook: '',
        instagram: '',
    },
    message: ''
  },
  darkMode: false,
  sidebarCollapsed: false,
  sidebarLight: false,
  appSettings: {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  loading: false,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.payload] };
    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map(user =>
          user.id === action.payload.id ? action.payload : user
        ),
      };
    case 'DELETE_USER':
      return {
        ...state,
        users: state.users.filter(user => user.id !== action.payload),
      };
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(product =>
          product.id === action.payload.id ? action.payload : product
        ),
      };
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(product => product.id !== action.payload),
      };
    case 'SET_CUSTOMERS':
      return { ...state, customers: action.payload };
    case 'ADD_CUSTOMER':
      return { ...state, customers: [...state.customers, action.payload] };
    case 'UPDATE_CUSTOMER':
      return {
        ...state,
        customers: state.customers.map(customer =>
          customer.id === action.payload.id ? action.payload : customer
        ),
      };
    case 'DELETE_CUSTOMER':
      return {
        ...state,
        customers: state.customers.filter(customer => customer.id !== action.payload),
      };
    case 'SET_PROVIDERS':
      return { ...state, providers: action.payload };
    case 'ADD_PROVIDER':
      return { ...state, providers: [...state.providers, action.payload] };
    case 'UPDATE_PROVIDER':
      return {
        ...state,
        providers: state.providers.map(provider =>
          provider.id === action.payload.id ? action.payload : provider
        ),
      };
    case 'DELETE_PROVIDER':
      return {
        ...state,
        providers: state.providers.filter(provider => provider.id !== action.payload),
      };
    case 'SET_SALES':
      return { ...state, sales: action.payload };
    case 'ADD_SALE':
      return { ...state, sales: [...state.sales, action.payload] };
    case 'UPDATE_SALE':
      return {
        ...state,
        sales: state.sales.map(sale =>
          sale.id === action.payload.id ? action.payload : sale
        ),
      };
    case 'DELETE_SALE':
      return {
        ...state,
        sales: state.sales.filter(sale => sale.id !== action.payload),
      };
    case 'SET_CONFIG':
      return { ...state, config: action.payload };
    case 'SET_APP_SETTINGS':
      return { ...state, appSettings: action.payload };
    case 'TOGGLE_DARK_MODE':
      return { ...state, darkMode: !state.darkMode };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'TOGGLE_SIDEBAR_LIGHT':
      return { ...state, sidebarLight: !state.sidebarLight };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  getDashboardStats: () => DashboardStats;
  getLowStockProducts: () => Product[];
  generateInvoiceNumber: () => string;
  generateProductCode: () => string;
  // Usuarios
  loadUsers: () => Promise<void>;
  createUser: (userData: Partial<User>) => Promise<void>;
  updateUser: (id: string, userData: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  // Productos
  loadProducts: () => Promise<void>;
  createProduct: (productData: Partial<Product>) => Promise<void>;
  updateProduct: (id: string, productData: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  // Clientes
  loadCustomers: () => Promise<void>;
  createCustomer: (customerData: Partial<Customer>) => Promise<void>;
  updateCustomer: (id: string, customerData: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  // Proveedores
  loadProviders: () => Promise<void>;
  createProvider: (providerData: Partial<Provider>) => Promise<void>;
  updateProvider: (id: string, providerData: Partial<Provider>) => Promise<void>;
  deleteProvider: (id: string) => Promise<void>;
  // Ventas
  loadSales: () => Promise<void>;
  createSale: (saleData: any) => Promise<void>;
  updateSale: (id: string, saleData: any) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  // Utilidades
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const configRestaurada = React.useRef(false);

  // Restaurar configuración desde localStorage al iniciar (solo una vez)
  useEffect(() => {
    if (!configRestaurada.current) {
      const savedConfig = localStorage.getItem('config');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          dispatch({ type: 'SET_CONFIG', payload: config });
        } catch (e) {
          localStorage.removeItem('config');
        }
      }

      // Restaurar appSettings también
      const savedAppSettings = localStorage.getItem('appSettings');
      if (savedAppSettings) {
        try {
          const appSettings = JSON.parse(savedAppSettings);
          dispatch({ type: 'SET_APP_SETTINGS', payload: appSettings });
        } catch (e) {
          localStorage.removeItem('appSettings');
        }
      }

      configRestaurada.current = true;
    }
  }, []);

  // Guardar configuración en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem('config', JSON.stringify(state.config));
  }, [state.config]);

  // Guardar appSettings en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(state.appSettings));
  }, [state.appSettings]);

  // Aplicar modo oscuro al elemento HTML
  useEffect(() => {
    const root = document.documentElement;
    if (state.darkMode) {
      root.classList.add('dark');
    } else {
      console.log('?? No hay usuario guardado en localStorage');
    }
  }, [state.darkMode]);

  // Restaurar modo oscuro desde localStorage al iniciar
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      const isDarkMode = JSON.parse(savedDarkMode);
      if (isDarkMode !== state.darkMode) {
        dispatch({ type: 'TOGGLE_DARK_MODE' });
      }
    }
  }, []);

  // Guardar modo oscuro en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(state.darkMode));
  }, [state.darkMode]);

  // Restaurar usuario desde localStorage al iniciar
  useEffect(() => {
    console.log('🔄 Iniciando restauración de usuario...');
    const savedUser = localStorage.getItem('user');
    console.log('💾 Usuario guardado en localStorage:', savedUser);
    
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        console.log('👤 Usuario restaurado:', user);
        dispatch({ type: 'SET_USER', payload: user });
        
        // Cargar datos inmediatamente después de restaurar el usuario
        console.log('📥 Cargando datos después de restaurar usuario...');
        loadInitialData();
      } catch (error) {
        console.error('❌ Error parsing saved user:', error);
        localStorage.removeItem('user');
      }
    } else {
      console.log('?? No hay usuario guardado en localStorage');
    }
  }, [state.darkMode]);

  // Cargar datos iniciales (solo si no hay usuario restaurado)
  useEffect(() => {
    // Solo cargar datos si no hay usuario restaurado
    if (!state.user) {
      console.log('🔄 Iniciando carga de datos sin usuario...');
      // No sobrescribir la configuración, solo cargar usuarios, productos, clientes y ventas
      loadUsers();
      loadProducts();
      loadCustomers();
      loadProviders();
      loadSales();
    }
  }, []);

  const loadInitialData = async () => {
    try {
      console.log('🔄 Iniciando carga de datos...');
      dispatch({ type: 'SET_LOADING', payload: true });
      await Promise.all([
        loadUsers(),
        loadProducts(),
        loadCustomers(),
        loadProviders(),
        loadSales(),
      ]);
      console.log('✅ Datos cargados exitosamente');
    } catch (error) {
      console.error('❌ Error al cargar datos iniciales:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error al cargar datos iniciales' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 Iniciando login...');
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await api.login(username, password);
      console.log('📡 Respuesta del login:', response);
      
      if (response.success) {
        console.log('✅ Login exitoso, guardando usuario...');
        dispatch({ type: 'SET_USER', payload: response.user });
        localStorage.setItem('user', JSON.stringify(response.user));
        console.log('💾 Usuario guardado en localStorage');
        
        // Cargar datos después del login exitoso
        console.log('📥 Cargando datos después del login...');
        await loadInitialData();
        
        return true;
      }
      console.log('❌ Login fallido');
      return false;
    } catch (error) {
      console.error('❌ Error en el login:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error en el login' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = () => {
    dispatch({ type: 'SET_USER', payload: null });
    localStorage.removeItem('user');
  };

  // --- FUNCIONES DE USUARIOS ---
  const loadUsers = async () => {
    try {
      const response = await api.getUsers();
      if (response.success) {
        dispatch({ type: 'SET_USERS', payload: response.users });
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const createUser = async (userData: Partial<User>) => {
    try {
      const response = await api.createUser(userData);
      if (response.success) {
        await loadUsers();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const updateUser = async (id: string, userData: Partial<User>) => {
    try {
      const response = await api.updateUser(id, userData);
      if (response.success) {
        await loadUsers();
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const response = await api.deleteUser(id);
      if (response.success) {
        await loadUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  // --- FUNCIONES DE PRODUCTOS ---
  const loadProducts = async () => {
    try {
      console.log('🔄 Cargando productos...');
      const response = await api.getProducts();
      console.log('📡 Respuesta de la API:', response);
      
      if (response.success) {
        console.log('📦 Productos recibidos del backend:', response.products);
        
        // Mapear los datos del backend al formato del frontend
        const mappedProducts = response.products.map((product: any) => ({
          id: String(product.id),
          name: product.name,
          category: product.category_name || 'Sin categoría',
          category_id: product.category_id ?? 0,
          providerId: product.provider_id !== undefined && product.provider_id !== null ? String(product.provider_id) : undefined,
          icon: 'Package', // Icono por defecto
          price: product.price,
          wholesalePrice: product.wholesale_price,
          cost: product.cost,
          stock: product.stock,
          minStock: product.min_stock || 5, // Asegurar que min_stock se mapee correctamente
          code: product.sku || `PROD-${product.id}`,
          description: product.description,
          active: Boolean(product.active ?? true),
          createdAt: new Date(product.created_at),
          updatedAt: new Date(product.updated_at),
        }));
        
        console.log('🔄 Productos mapeados:', mappedProducts);
        dispatch({ type: 'SET_PRODUCTS', payload: mappedProducts });
        console.log('✅ Productos cargados en el estado');
      } else {
        console.error('❌ Error en la respuesta de la API:', response.message);
      }
    } catch (error) {
      console.error('❌ Error loading products:', error);
    }
  };

  const createProduct = async (productData: Partial<Product>) => {
    try {
      // Mapear los datos del frontend al formato del backend
      const backendProductData = {
        name: productData.name || '',
        description: productData.description || null,
        sku: productData.code || `PROD-${Date.now()}`, // Generar un código único
        category_id: Number(productData.category_id) || null,
        provider_id: productData.providerId ? Number(productData.providerId) : null,
        price: Number(productData.price) || 0,
        cost: Number(productData.cost) || 0,
        stock: Number(productData.stock) || 0,
        wholesale_price: productData.wholesalePrice !== undefined ? Number(productData.wholesalePrice) : undefined,
        min_stock: Number(productData.minStock) || 5, // Asegurar que minStock se envíe como min_stock
      };

      const response = await api.createProduct(backendProductData);
      if (response.success) {
        await loadProducts();
      }
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      console.log('🔄 Actualizando producto:', { id, productData });
      
      // Si solo se está actualizando el stock, enviar solo ese campo
      if (Object.keys(productData).length === 1 && 'stock' in productData) {
        const backendProductData = {
          stock: Number(productData.stock) || 0,
        };
        console.log('📡 Enviando solo stock al backend:', backendProductData);
        const response = await api.updateProduct(id, backendProductData);
        console.log('📡 Respuesta del backend:', response);
        
        if (response.success) {
          await loadProducts();
        } else {
          throw new Error(response.error || 'Error al actualizar el stock del producto');
        }
        return;
      }
      
      // Mapear los datos del frontend al formato del backend para actualizaciones completas
      const backendProductData = {
        name: productData.name || '',
        description: productData.description || null,
        sku: productData.code || `PROD-${id}`, // Usar el código existente o generar uno
        category_id: Number(productData.category_id) || null,
        provider_id: productData.providerId ? Number(productData.providerId) : null,
        price: Number(productData.price) || 0,
        cost: Number(productData.cost) || 0,
        stock: Number(productData.stock) || 0,
        wholesale_price: productData.wholesalePrice !== undefined ? Number(productData.wholesalePrice) : undefined,
        min_stock: Number(productData.minStock) || 5, // Asegurar que minStock se envíe como min_stock
        active: productData.active !== undefined ? Boolean(productData.active) : true,
      };

      console.log(' Enviando datos al backend:', backendProductData);

      const response = await api.updateProduct(id, backendProductData);
      console.log(' Respuesta del backend:', response);
      console.log('📡 Respuesta del backend:', response);
      
      if (response.success) {
        await loadProducts();
      } else {
        throw new Error(response.message || 'Error al actualizar producto');
      }
    } catch (error) {
      console.error('❌ Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const response = await api.deleteProduct(id);
      if (response.success) {
        await loadProducts();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  // --- FUNCIONES DE CLIENTES ---
  const loadCustomers = async () => {
    try {
      const response = await api.getCustomers();
      if (response.success) {
        const mappedCustomers = response.customers.map((customer: any) => ({
          ...customer,
          totalPurchases: typeof customer.totalPurchases === 'number' ? customer.totalPurchases : (typeof customer.total_purchases === 'number' ? customer.total_purchases : 0),
        }));
        dispatch({ type: 'SET_CUSTOMERS', payload: mappedCustomers });
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const createCustomer = async (customerData: Partial<Customer>) => {
    try {
      const response = await api.createCustomer(customerData);
      if (response.success) {
        await loadCustomers();
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  };

  const updateCustomer = async (id: string, customerData: Partial<Customer>) => {
    try {
      const response = await api.updateCustomer(id, customerData);
      if (response.success) {
        await loadCustomers();
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const response = await api.deleteCustomer(id);
      if (response.success) {
        await loadCustomers();
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  };

  // --- FUNCIONES DE PROVEEDORES ---
  const loadProviders = async () => {
    try {
      const response = await api.getProviders();
      if (response.success) {
        const mappedProviders: Provider[] = response.providers.map((p: any) => ({
          id: String(p.id),
          name: p.name,
          phone: p.phone,
          email: p.email,
          address: p.address,
          rnc: p.rnc,
          contactName: p.contact_name,
          active: Boolean(p.active ?? true),
          createdAt: new Date(p.created_at),
        }));
        dispatch({ type: 'SET_PROVIDERS', payload: mappedProviders });
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const createProvider = async (providerData: Partial<Provider>) => {
    try {
      const response = await api.createProvider(providerData);
      if (response.success) {
        await loadProviders();
      }
    } catch (error) {
      console.error('Error creating provider:', error);
      throw error;
    }
  };

  const updateProvider = async (id: string, providerData: Partial<Provider>) => {
    try {
      const response = await api.updateProvider(id, providerData);
      if (response.success) {
        await loadProviders();
      }
    } catch (error) {
      console.error('Error updating provider:', error);
      throw error;
    }
  };

  const deleteProvider = async (id: string) => {
    try {
      console.log('🗑️ Intentando eliminar proveedor:', id);
      const response = await api.deleteProvider(id);
      console.log('📡 Respuesta de la API:', response);
      
      if (response.success) {
        await loadProviders();
        console.log('✅ Proveedor eliminado exitosamente');
      } else {
        console.error('❌ Error en respuesta de API:', response.message);
        throw new Error(response.message || 'Error al eliminar proveedor');
      }
    } catch (error) {
      console.error('🔥 Error al eliminar proveedor:', error);
      throw error;
    }
  };

  // --- FUNCIONES DE VENTAS ---
  const loadSales = async () => {
    try {
      const response = await api.getSales();
      if (response.success) {
        // Mapear seller_name a userName
        const mappedSales = response.sales.map((sale: any) => ({
          ...sale,
          customerId: sale.customer_id || sale.customerId,
          userName: sale.seller_name || sale.userName || '',
          customerName: sale.customer_name || sale.customerName || '',
          date: sale.created_at ? new Date(sale.created_at) : (sale.date ? new Date(sale.date) : new Date()),
          invoiceNumber: sale.invoice_number || sale.invoiceNumber || '',
          totalProfit: sale.total_profit || sale.totalProfit || 0,
          items: Array.isArray(sale.items) ? sale.items.map((item: any) => ({
            ...item,
            productId: item.product_id || item.productId,
            productName: item.product_name || item.productName,
            quantity: item.quantity || 0,
            price: item.unit_price || item.price,
            subtotal: item.total || item.subtotal,
            profit: item.profit || 0
          })) : [],
        }));
        dispatch({ type: 'SET_SALES', payload: mappedSales });
      }
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  };

  const createSale = async (saleData: any) => {
    try {
      const response = await api.createSale(saleData);
      if (response.success) {
        await loadSales();
        await loadProducts(); // Recargar productos para actualizar stock
      }
    } catch (error) {
      console.error('Error creating sale:', error);
      throw error;
    }
  };

  const deleteSale = async (id: string) => {
    try {
      const response = await api.deleteSale(id);
      if (response.success) {
        await loadSales();
      }
    } catch (error) {
      console.error('Error deleting sale:', error);
    }
  };

  const updateSale = async (id: string, saleData: any) => {
    try {
      const response = await api.updateSale(id, saleData);
      if (response.success) {
        await loadSales();
        await loadProducts(); // Recargar productos para actualizar stock
      }
    } catch (error) {
      console.error('Error updating sale:', error);
    }
  };

  const generateInvoiceNumber = (): string => {
    const prefix = state.config.invoicePrefix;
    const year = new Date().getFullYear();
    const count = state.sales.length + 1;
    return `${prefix}${year}${String(count).padStart(6, '0')}`;
  };

  const generateProductCode = (): string => {
    const prefix = state.config.productPrefix;
    const count = state.products.length + 1;
    return `${prefix}-${String(count).padStart(3, '0')}`;
  };

  const getDashboardStats = (): DashboardStats => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const todaySales = state.sales
      .filter(sale => new Date(sale.date) >= todayStart)
      .reduce((sum, sale) => sum + sale.total, 0);
    
    const todayProfit = state.sales
      .filter(sale => new Date(sale.date) >= todayStart)
      .reduce((sum, sale) => sum + (sale.totalProfit || 0), 0);
    
    const monthSales = state.sales
      .filter(sale => new Date(sale.date) >= monthStart)
      .reduce((sum, sale) => sum + sale.total, 0);
    
    const monthProfit = state.sales
      .filter(sale => new Date(sale.date) >= monthStart)
      .reduce((sum, sale) => sum + (sale.totalProfit || 0), 0);
    
    const totalSales = state.sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfit = state.sales.reduce((sum, sale) => sum + (sale.totalProfit || 0), 0);
    const totalCustomers = state.customers.length;
    const totalProducts = state.products.length;
    const lowStockCount = state.products.filter(product => product.stock <= product.minStock).length;
    const outOfStockCount = state.products.filter(product => product.stock === 0).length;
    
    return {
      todaySales,
      todayProfit,
      monthSales,
      monthProfit,
      totalSales,
      totalProfit,
      totalCustomers,
      totalProducts,
      lowStockCount,
      outOfStockCount
    };
  };

  const getLowStockProducts = (): Product[] => {
    return state.products.filter(product => product.stock <= product.minStock);
  };

  return (
    <AppContext.Provider
      value={{
        state,
        login,
        logout,
        getDashboardStats,
        getLowStockProducts,
        generateInvoiceNumber,
        generateProductCode,
        loadUsers,
        createUser,
        updateUser,
        deleteUser,
        loadProducts,
        createProduct,
        updateProduct,
        deleteProduct,
        loadCustomers,
        createCustomer,
        updateCustomer,
        deleteCustomer,
        loadProviders,
        createProvider,
        updateProvider,
        deleteProvider,
        loadSales,
        createSale,
        updateSale,
        deleteSale,
        dispatch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
}
