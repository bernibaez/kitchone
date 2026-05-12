import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para las tablas de la base de datos
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number
          username: string
          name: string
          email?: string
          role: 'admin' | 'vendedor' | 'cajero'
          password: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          username: string
          name: string
          email?: string
          role?: 'admin' | 'vendedor' | 'cajero'
          password: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          username?: string
          name?: string
          email?: string
          role?: 'admin' | 'vendedor' | 'cajero'
          password?: string
          active?: boolean
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: number
          name: string
          description?: string
          sku: string
          price: number
          wholesale_price?: number
          cost: number
          stock: number
          min_stock: number
          category_id?: number | null
          provider_id?: number | null
          category_name?: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string
          sku?: string
          price: number
          wholesale_price?: number
          cost: number
          stock: number
          min_stock?: number
          category_id?: number | null
          provider_id?: number | null
          category_name?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string
          sku?: string
          price?: number
          wholesale_price?: number
          cost?: number
          stock?: number
          min_stock?: number
          category_id?: number | null
          provider_id?: number | null
          category_name?: string
          active?: boolean
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: number
          name: string
          phone: string
          email?: string
          address?: string
          rnc?: string
          credit_limit?: number
          total_purchases: number
          last_purchase?: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          phone: string
          email?: string
          address?: string
          rnc?: string
          credit_limit?: number
          total_purchases?: number
          last_purchase?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          phone?: string
          email?: string
          address?: string
          rnc?: string
          credit_limit?: number
          total_purchases?: number
          last_purchase?: string
          active?: boolean
          updated_at?: string
        }
      }
      providers: {
        Row: {
          id: number
          name: string
          phone: string
          email?: string
          address?: string
          rnc?: string
          contact_name?: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          phone: string
          email?: string
          address?: string
          rnc?: string
          contact_name?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          phone?: string
          email?: string
          address?: string
          rnc?: string
          contact_name?: string
          active?: boolean
          updated_at?: string
        }
      }
      sales: {
        Row: {
          id: number
          customer_id?: number
          customer_name?: string
          items: any[]
          subtotal: number
          tax: number
          discount: number
          total: number
          total_profit: number
          payment_method: 'efectivo' | 'tarjeta' | 'transferencia' | 'cheque'
          user_id: number
          seller_name: string
          created_at: string
          invoice_number: string
          notes?: string
        }
        Insert: {
          id?: number
          customer_id?: number
          customer_name?: string
          items: any[]
          subtotal: number
          tax: number
          discount: number
          total: number
          total_profit: number
          payment_method?: 'efectivo' | 'tarjeta' | 'transferencia' | 'cheque'
          user_id: number
          seller_name: string
          created_at?: string
          invoice_number?: string
          notes?: string
        }
        Update: {
          id?: number
          customer_id?: number
          customer_name?: string
          items?: any[]
          subtotal?: number
          tax?: number
          discount?: number
          total?: number
          total_profit?: number
          payment_method?: 'efectivo' | 'tarjeta' | 'transferencia' | 'cheque'
          user_id?: number
          seller_name?: string
          notes?: string
        }
      }
      categories: {
        Row: {
          id: number
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          updated_at?: string
        }
      }
    }
  }
}
