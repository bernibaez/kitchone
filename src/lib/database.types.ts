export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'mesero' | 'cocinero';
export type OrderStatus = 'pendiente' | 'en_preparacion' | 'terminado' | 'entregado' | 'facturada';
export type OrderItemStatus = 'pendiente' | 'en_preparacion' | 'terminado';

export interface Database {
  public: {
    Tables: {
      users_profile: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role: UserRole;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: UserRole;
          is_active?: boolean;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      dishes: {
        Row: {
          id: string;
          name: string;
          price: number;
          percentage: number;
          category_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          percentage?: number;
          category_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          percentage?: number;
          category_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      tables: {
        Row: {
          id: string;
          table_number: string;
          capacity: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          table_number: string;
          capacity?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          table_number?: string;
          capacity?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          concept: string;
          amount: number;
          date: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          concept: string;
          amount: number;
          date?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          concept?: string;
          amount?: number;
          date?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          table_id: string | null;
          waiter_id: string | null;
          status: OrderStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          table_id?: string | null;
          waiter_id?: string | null;
          status?: OrderStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          table_id?: string | null;
          waiter_id?: string | null;
          status?: OrderStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          dish_id: string;
          quantity: number;
          notes: string | null;
          status: OrderItemStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          dish_id: string;
          quantity: number;
          notes?: string | null;
          status?: OrderItemStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          dish_id?: string;
          quantity?: number;
          notes?: string | null;
          status?: OrderItemStatus;
          created_at?: string;
        };
      };
      sales: {
        Row: {
          id: string;
          sale_number: string;
          subtotal: number;
          tax_amount: number;
          total: number;
          payment_method: 'cash' | 'card' | 'transaction';
          money_received: number;
          change: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sale_number: string;
          subtotal: number;
          tax_amount?: number;
          total: number;
          payment_method?: 'cash' | 'card' | 'transaction';
          money_received?: number;
          change?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sale_number?: string;
          subtotal?: number;
          tax_amount?: number;
          total?: number;
          payment_method?: 'cash' | 'card' | 'transaction';
          money_received?: number;
          change?: number;
          created_by?: string | null;
          created_at?: string;
        };
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          dish_id: string;
          dish_name: string;
          quantity: number;
          price: number;
          percentage: number;
          subtotal: number;
        };
        Insert: {
          id?: string;
          sale_id: string;
          dish_id: string;
          dish_name: string;
          quantity: number;
          price: number;
          percentage?: number;
          subtotal: number;
        };
        Update: {
          id?: string;
          sale_id?: string;
          dish_id?: string;
          dish_name?: string;
          quantity?: number;
          price?: number;
          percentage?: number;
          subtotal?: number;
        };
      };
      restaurant_config: {
        Row: {
          id: string;
          restaurant_name: string;
          tax_percentage: number;
          address: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_name?: string;
          tax_percentage?: number;
          address?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_name?: string;
          tax_percentage?: number;
          address?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}
