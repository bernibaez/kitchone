// Servicio de API con Supabase
import { supabase } from '../lib/supabase'

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

class SupabaseApiService {
  // --- AUTENTICACIÓN ---
  async login(username: string, password: string): Promise<ApiResponse> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .or(`username.eq.${username},email.eq.${username}`)
        .eq('password', password)
        .eq('active', true)
        .single()

      if (error || !user) {
        return { success: false, message: 'Credenciales inválidas' }
      }

      const safeUser = {
        id: String(user.id),
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        active: user.active,
      }

      return { success: true, user: safeUser }
    } catch (error) {
      console.error('Error en login:', error)
      return { success: false, message: 'Error al iniciar sesión' }
    }
  }

  // --- USUARIOS ---
  async getUsers(): Promise<ApiResponse> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, username, name, email, role, active')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error al obtener usuarios:', error)
        return { success: false, message: 'Error al obtener usuarios' }
      }

      return { success: true, users: users || [] }
    } catch (error) {
      console.error('Error en getUsers:', error)
      return { success: false, message: 'Error al obtener usuarios' }
    }
  }

  async createUser(userData: any): Promise<ApiResponse> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          username: userData.username,
          name: userData.name,
          email: userData.email,
          role: userData.role || 'vendedor',
          password: userData.password || '123456',
          active: userData.active ?? true,
        })
        .select()
        .single()

      if (error) {
        console.error('Error al crear usuario:', error)
        return { success: false, message: 'Error al crear usuario' }
      }

      return { success: true, user }
    } catch (error) {
      console.error('Error en createUser:', error)
      return { success: false, message: 'Error al crear usuario' }
    }
  }

  async updateUser(id: string, userData: any): Promise<ApiResponse> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .update({
          ...userData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', Number(id))
        .select()
        .single()

      if (error) {
        console.error('Error al actualizar usuario:', error)
        return { success: false, message: 'Error al actualizar usuario' }
      }

      return { success: true, user }
    } catch (error) {
      console.error('Error en updateUser:', error)
      return { success: false, message: 'Error al actualizar usuario' }
    }
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', Number(id))

      if (error) {
        console.error('Error al eliminar usuario:', error)
        return { success: false, message: 'Error al eliminar usuario' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error en deleteUser:', error)
      return { success: false, message: 'Error al eliminar usuario' }
    }
  }

  // --- PRODUCTOS ---
  async getProducts(): Promise<ApiResponse> {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          categories(name)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error al obtener productos:', error)
        return { success: false, message: 'Error al obtener productos' }
      }

      const productsWithCategory = products?.map(product => ({
        ...product,
        category_name: product.categories?.name
      })) || []

      return { success: true, products: productsWithCategory }
    } catch (error) {
      console.error('Error en getProducts:', error)
      return { success: false, message: 'Error al obtener productos' }
    }
  }

  async getCategories(): Promise<ApiResponse> {
    try {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error al obtener categorías:', error)
        return { success: false, message: 'Error al obtener categorías' }
      }

      return { success: true, data: categories || [] }
    } catch (error) {
      console.error('Error en getCategories:', error)
      return { success: false, message: 'Error al obtener categorías' }
    }
  }

  async createCategory(categoryData: any): Promise<ApiResponse> {
    try {
      const { data: category, error } = await supabase
        .from('categories')
        .insert({
          name: categoryData.name,
        })
        .select()
        .single()

      if (error) {
        console.error('Error al crear categoría:', error)
        return { success: false, message: 'Error al crear categoría' }
      }

      return { success: true, data: category }
    } catch (error) {
      console.error('Error en createCategory:', error)
      return { success: false, message: 'Error al crear categoría' }
    }
  }

  async updateCategory(id: string, categoryData: any): Promise<ApiResponse> {
    try {
      const { data: category, error } = await supabase
        .from('categories')
        .update({
          ...categoryData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', Number(id))
        .select()
        .single()

      if (error) {
        console.error('Error al actualizar categoría:', error)
        return { success: false, message: 'Error al actualizar categoría' }
      }

      return { success: true, data: category }
    } catch (error) {
      console.error('Error en updateCategory:', error)
      return { success: false, message: 'Error al actualizar categoría' }
    }
  }

  async deleteCategory(id: string): Promise<ApiResponse> {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', Number(id))

      if (error) {
        console.error('Error al eliminar categoría:', error)
        return { success: false, message: 'Error al eliminar categoría' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error en deleteCategory:', error)
      return { success: false, message: 'Error al eliminar categoría' }
    }
  }

  async createProduct(productData: any): Promise<ApiResponse> {
    try {
      const categoryId = productData.category_id !== undefined && productData.category_id !== null
        ? Number(productData.category_id)
        : null

      const { data: category } = await supabase
        .from('categories')
        .select('name')
        .eq('id', categoryId)
        .single()

      const { data: product, error } = await supabase
        .from('products')
        .insert({
          name: productData.name || '',
          description: productData.description || null,
          sku: productData.sku || productData.code || `PROD-${Date.now()}`,
          price: Number(productData.price) || 0,
          wholesale_price: productData.wholesale_price !== undefined ? Number(productData.wholesale_price) : null,
          cost: Number(productData.cost) || 0,
          stock: Number(productData.stock) || 0,
          min_stock: Number(productData.min_stock ?? productData.minStock ?? 5),
          category_id: categoryId,
          provider_id: productData.provider_id !== undefined && productData.provider_id !== null ? Number(productData.provider_id) : null,
          category_name: category?.name || 'Sin categoría',
          active: productData.active ?? true,
        })
        .select()
        .single()

      if (error) {
        console.error('Error al crear producto:', error)
        return { success: false, message: 'Error al crear producto' }
      }

      return { success: true, product }
    } catch (error) {
      console.error('Error en createProduct:', error)
      return { success: false, message: 'Error al crear producto' }
    }
  }

  async updateProduct(id: string, productData: any): Promise<ApiResponse> {
    try {
      const categoryId = productData.category_id !== undefined
        ? (productData.category_id === null ? null : Number(productData.category_id))
        : undefined

      let categoryName = undefined
      if (categoryId !== undefined) {
        const { data: category } = await supabase
          .from('categories')
          .select('name')
          .eq('id', categoryId)
          .single()
        categoryName = category?.name || 'Sin categoría'
      }

      const { data: product, error } = await supabase
        .from('products')
        .update({
          name: productData.name,
          description: productData.description,
          sku: productData.sku,
          price: Number(productData.price),
          wholesale_price: productData.wholesale_price !== undefined
            ? Number(productData.wholesale_price)
            : null,
          cost: Number(productData.cost),
          stock: Number(productData.stock),
          min_stock: Number(productData.min_stock),
          category_id: categoryId,
          category_name: categoryName,
          provider_id: productData.provider_id !== undefined
            ? (productData.provider_id === null ? null : Number(productData.provider_id))
            : undefined,
          active: productData.active !== undefined ? Boolean(productData.active) : true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', Number(id))
        .select()
        .single()

      if (error) {
        console.error('Error al actualizar producto:', error)
        return { success: false, message: 'Error al actualizar producto' }
      }

      return { success: true, product }
    } catch (error) {
      console.error('Error en updateProduct:', error)
      return { success: false, message: 'Error al actualizar producto' }
    }
  }

  async deleteProduct(id: string): Promise<ApiResponse> {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', Number(id))

      if (error) {
        console.error('Error al eliminar producto:', error)
        return { success: false, message: 'Error al eliminar producto' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error en deleteProduct:', error)
      return { success: false, message: 'Error al eliminar producto' }
    }
  }

  // --- CLIENTES ---
  async getCustomers(): Promise<ApiResponse> {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error al obtener clientes:', error)
        return { success: false, message: 'Error al obtener clientes' }
      }

      return { success: true, customers: customers || [] }
    } catch (error) {
      console.error('Error en getCustomers:', error)
      return { success: false, message: 'Error al obtener clientes' }
    }
  }

  async createCustomer(customerData: any): Promise<ApiResponse> {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          name: customerData.name || '',
          phone: customerData.phone || '',
          email: customerData.email,
          address: customerData.address,
          rnc: customerData.rnc,
          credit_limit: customerData.credit_limit,
          total_purchases: 0,
          last_purchase: null,
          active: customerData.active ?? true,
        })
        .select()
        .single()

      if (error) {
        console.error('Error al crear cliente:', error)
        return { success: false, message: 'Error al crear cliente' }
      }

      return { success: true, customer }
    } catch (error) {
      console.error('Error en createCustomer:', error)
      return { success: false, message: 'Error al crear cliente' }
    }
  }

  async updateCustomer(id: string, customerData: any): Promise<ApiResponse> {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .update({
          ...customerData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', Number(id))
        .select()
        .single()

      if (error) {
        console.error('Error al actualizar cliente:', error)
        return { success: false, message: 'Error al actualizar cliente' }
      }

      return { success: true, customer }
    } catch (error) {
      console.error('Error en updateCustomer:', error)
      return { success: false, message: 'Error al actualizar cliente' }
    }
  }

  async deleteCustomer(id: string): Promise<ApiResponse> {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', Number(id))

      if (error) {
        console.error('Error al eliminar cliente:', error)
        return { success: false, message: 'Error al eliminar cliente' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error en deleteCustomer:', error)
      return { success: false, message: 'Error al eliminar cliente' }
    }
  }

  // --- PROVEEDORES ---
  async getProviders(): Promise<ApiResponse> {
    try {
      const { data: providers, error } = await supabase
        .from('providers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error al obtener proveedores:', error)
        return { success: false, message: 'Error al obtener proveedores' }
      }

      return { success: true, providers: providers || [] }
    } catch (error) {
      console.error('Error en getProviders:', error)
      return { success: false, message: 'Error al obtener proveedores' }
    }
  }

  async createProvider(providerData: any): Promise<ApiResponse> {
    try {
      const { data: provider, error } = await supabase
        .from('providers')
        .insert({
          name: providerData.name || '',
          phone: providerData.phone || '',
          email: providerData.email,
          address: providerData.address,
          rnc: providerData.rnc,
          contact_name: providerData.contactName,
          active: providerData.active ?? true,
        })
        .select()
        .single()

      if (error) {
        console.error('Error al crear proveedor:', error)
        return { success: false, message: 'Error al crear proveedor' }
      }

      return { success: true, provider }
    } catch (error) {
      console.error('Error en createProvider:', error)
      return { success: false, message: 'Error al crear proveedor' }
    }
  }

  async updateProvider(id: string, providerData: any): Promise<ApiResponse> {
    try {
      const { data: provider, error } = await supabase
        .from('providers')
        .update({
          ...providerData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', Number(id))
        .select()
        .single()

      if (error) {
        console.error('Error al actualizar proveedor:', error)
        return { success: false, message: 'Error al actualizar proveedor' }
      }

      return { success: true, provider }
    } catch (error) {
      console.error('Error en updateProvider:', error)
      return { success: false, message: 'Error al actualizar proveedor' }
    }
  }

  async deleteProvider(id: string): Promise<ApiResponse> {
    try {
      console.log('🗑️ API: Eliminando proveedor con ID:', id);
      
      const { error } = await supabase
        .from('providers')
        .delete()
        .eq('id', Number(id))

      if (error) {
        console.error('❌ Error de Supabase al eliminar proveedor:', error);
        console.error('Código:', error.code);
        console.error('Mensaje:', error.message);
        console.error('Detalles:', error.details);
        
        // Check for foreign key constraint violation
        if (error.code === '23503') {
          return { 
            success: false, 
            message: 'No se puede eliminar el proveedor porque tiene productos asociados. Elimine primero los productos asociados.' 
          };
        }
        
        return { success: false, message: `Error al eliminar proveedor: ${error.message}` }
      }

      console.log('✅ Proveedor eliminado exitosamente de la base de datos');
      return { success: true }
    } catch (error) {
      console.error('🔥 Error en deleteProvider:', error)
      return { success: false, message: 'Error al eliminar proveedor' }
    }
  }

  // --- VENTAS ---
  async getSales(): Promise<ApiResponse> {
    try {
      const { data: sales, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error al obtener ventas:', error)
        return { success: false, message: 'Error al obtener ventas' }
      }

      return { success: true, sales: sales || [] }
    } catch (error) {
      console.error('Error en getSales:', error)
      return { success: false, message: 'Error al obtener ventas' }
    }
  }

  async createSale(saleData: any): Promise<ApiResponse> {
    try {
      const { data: sale, error } = await supabase
        .from('sales')
        .insert({
          customer_id: saleData.customer_id || null,
          customer_name: saleData.customer_name || 'Cliente genérico',
          items: saleData.items || [],
          subtotal: Number(saleData.subtotal) || 0,
          tax: Number(saleData.tax) || 0,
          discount: Number(saleData.discount) || 0,
          total: Number(saleData.total) || 0,
          total_profit: Number(saleData.total_profit ?? saleData.totalProfit ?? 0),
          payment_method: saleData.payment_method || 'efectivo',
          user_id: Number(saleData.user_id) || 1,
          seller_name: saleData.seller_name || 'Admin',
          invoice_number: saleData.invoice_number || `FAC${new Date().getFullYear()}${String(Date.now()).slice(-6)}`,
          notes: saleData.notes,
        })
        .select()
        .single()

      if (error) {
        console.error('Error al crear venta:', error)
        return { success: false, message: 'Error al crear venta' }
      }

      // Actualizar stock de productos
      if (saleData.items && saleData.items.length > 0) {
        for (const item of saleData.items) {
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', Number(item.product_id))
            .single()

          if (product) {
            await supabase
              .from('products')
              .update({
                stock: Math.max(0, product.stock - Number(item.quantity)),
                updated_at: new Date().toISOString(),
              })
              .eq('id', Number(item.product_id))
          }
        }
      }

      return { success: true, sale }
    } catch (error) {
      console.error('Error en createSale:', error)
      return { success: false, message: 'Error al crear venta' }
    }
  }

  async deleteSale(id: string): Promise<ApiResponse> {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error al eliminar venta:', error)
        return { success: false, message: 'Error al eliminar venta' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error en deleteSale:', error)
      return { success: false, message: 'Error al eliminar venta' }
    }
  }

  async updateSale(id: string, saleData: any): Promise<ApiResponse> {
    try {
      const { data: sale, error } = await supabase
        .from('sales')
        .update({
          customer_id: saleData.customer_id,
          customer_name: saleData.customer_name,
          items: saleData.items,
          subtotal: saleData.subtotal,
          tax: saleData.tax,
          discount: saleData.discount,
          total: saleData.total,
          total_profit: saleData.total_profit,
          payment_method: saleData.payment_method,
          user_id: saleData.user_id,
          seller_name: saleData.seller_name,
          invoice_number: saleData.invoice_number,
          notes: saleData.notes
        })
        .eq('id', Number(id))
        .select()
        .single()

      if (error) {
        console.error('Error al actualizar venta:', error)
        return { success: false, message: 'Error al actualizar venta' }
      }

      return { success: true, sale }
    } catch (error) {
      console.error('Error en updateSale:', error)
      return { success: false, message: 'Error al actualizar venta' }
    }
  }
}

export default new SupabaseApiService()
