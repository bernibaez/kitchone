import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useNotification } from '../contexts/NotificationContext';
import { Plus, Minus, Trash2, ShoppingCart, Search, X, CreditCard, DollarSign, Smartphone, Eye } from 'lucide-react';
import { generateInvoicePDF, type InvoiceItem } from '../lib/invoice';

interface Dish {
  id: string;
  name: string;
  price: number;
  percentage: number;
  category_id?: string;
  categories?: { name: string };
}

interface CartItem extends Dish {
  quantity: number;
  sourceOrderId?: string | null;
  sourceComponents?: Array<{
    dish_id: string;
    name: string;
    price: number;
    percentage: number;
    quantity: number;
  }>;
}

interface SalesProps {
  onNavigate?: (page: string) => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transaction: 'Transferencia',
};

function parseMoneyInput(raw: string): number {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function buildInvoiceLineItems(cart: CartItem[]): InvoiceItem[] {
  const out: InvoiceItem[] = [];
  for (const item of cart) {
    if (item.sourceOrderId && item.sourceComponents?.length) {
      for (const c of item.sourceComponents) {
        const lineTotal = c.price * c.quantity;
        out.push({
          name: c.name,
          quantity: c.quantity,
          price: c.price,
          lineTotal,
        });
      }
    } else {
      out.push({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        lineTotal: item.price * item.quantity,
      });
    }
  }
  return out;
}

export default function Sales({ onNavigate }: SalesProps) {
  void onNavigate;
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { formatMoney, config } = useConfig();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [dishesLoading, setDishesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [moneyReceived, setMoneyReceived] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [editSaleId, setEditSaleId] = useState<string | null>(null);
  const [editingSaleNumber, setEditingSaleNumber] = useState<string | null>(null);
  const [finishedOrders, setFinishedOrders] = useState<Array<{
    id: string;
    order_number: string;
    table_number: string;
    items: Array<{ name: string; price: number; percentage: number; quantity: number; dish_id: string }>;
  }>>([]);

  const [showOrderPreview, setShowOrderPreview] = useState(false);
  const [previewOrder, setPreviewOrder] = useState<{
    id: string;
    order_number: string;
    table_number: string;
    items: Array<{ name: string; price: number; percentage: number; quantity: number; dish_id: string }>;
  } | null>(null);


  useEffect(() => {
    loadDishes();
  }, []);

  const loadDishes = async () => {
    try {
      const { data, error } = await supabase
        .from('dishes')
        .select('*, categories(name)')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setDishes(data || []);
    } catch (error) {
      console.error('Error loading dishes:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los platillos',
      });
    } finally {
      setDishesLoading(false);
    }
  };

  const loadFinishedOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          tables(table_number),
          order_items(
            quantity,
            dishes(
              id,
              name,
              price,
              percentage,
              categories(name)
            )
          )
        `)
        .in('status', ['terminado', 'entregado'])
        .order('created_at', { ascending: true });
      if (error) throw error;
      const mapped = (data || []).map((o: any) => ({
        id: o.id,
        order_number: o.order_number,
        table_number: o.tables?.table_number || '',
        items: (o.order_items || []).map((it: any) => ({
          name: it.dishes?.name,
          price: it.dishes?.price,
          percentage: it.dishes?.percentage ?? 0,
          quantity: it.quantity,
          dish_id: it.dishes?.id,
          category: it.dishes?.categories?.name || null,
        })),
      }));
      setFinishedOrders(mapped);
    } catch (error) {
      console.error('Error loading finished orders:', error);
    }
  };

  useEffect(() => {
    loadFinishedOrders();

    const channel = supabase
      .channel('sales-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadFinishedOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const id = sessionStorage.getItem('edit_sale_id');
    if (id) {
      loadSaleForEdit(id);
    }
  }, []);

  const loadSaleForEdit = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          sale_number,
          subtotal,
          tax_amount,
          total,
          payment_method,
          money_received,
          change,
          customer_name,
          sale_items(
            dish_id,
            dish_name,
            quantity,
            price,
            percentage
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        const sale = data as any;
        setEditSaleId(sale.id);
        setEditingSaleNumber(sale.sale_number);
        setPaymentMethod(sale.payment_method || 'cash');
        setMoneyReceived(
          typeof sale.money_received === 'number' ? String(sale.money_received) : ''
        );
        setCustomerName(sale.customer_name || '');
        const items: CartItem[] = (sale.sale_items || []).map((i: any) => ({
          id: i.dish_id,
          name: i.dish_name,
          price: i.price,
          percentage: i.percentage ?? 0,
          quantity: i.quantity,
        }));
        setCart(items);
      }
    } catch (error) {
      console.error('Error loading sale for edit:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cargar la venta para edición',
      });
    } finally {
      sessionStorage.removeItem('edit_sale_id');
    }
  };

  const filteredDishes = dishes.filter(dish =>
    dish.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = finishedOrders.filter((o) => {
    const term = searchTerm.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(term) ||
      o.table_number.toLowerCase().includes(term)
    );
  });

  const addOrderToCart = (order: {
    id: string;
    order_number: string;
    items: Array<{ name: string; price: number; percentage: number; quantity: number; dish_id: string }>;
  }) => {
    const exists = cart.find((i) => i.sourceOrderId === order.id);
    if (exists) return;
    const total = order.items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
    const components = order.items.map((it) => ({
      dish_id: it.dish_id,
      name: it.name,
      price: it.price,
      percentage: it.percentage,
      quantity: it.quantity,
      category: (it as any).category || null,
    }));
    setCart([...cart, {
      id: `order:${order.id}`,
      name: `Orden ${order.order_number}`,
      price: total,
      percentage: 0,
      quantity: 1,
      sourceOrderId: order.id,
      sourceComponents: components,
    }]);
  };

  const previewOrderDetails = (order: {
    id: string;
    order_number: string;
    table_number: string;
    items: Array<{ name: string; price: number; percentage: number; quantity: number; dish_id: string }>;
  }) => {
    setPreviewOrder(order);
    setShowOrderPreview(true);
  };

  const addToCart = (dish: Dish) => {
    const existingItem = cart.find(item => item.id === dish.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === dish.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...dish, quantity: 1 }]);
    }
  };

  const updateQuantity = (dishId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.id !== dishId));
      return;
    }
    setCart(cart.map(item =>
      item.id === dishId ? { ...item, quantity } : item
    ));
  };

  const removeFromCart = (dishId: string) => {
    setCart(cart.filter(item => item.id !== dishId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    const sub = calculateSubtotal();
    const pct = config?.tax_percentage;
    if (pct == null || pct <= 0) return 0;
    return Math.round(sub * (pct / 100) * 100) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      showNotification({
        type: 'error',
        title: 'Carrito vacío',
        message: 'Agrega platillos al carrito antes de continuar',
      });
      return;
    }

    try {
      const subtotal = calculateSubtotal();
      const taxAmount = calculateTax();
      const total = calculateTotal();
      const moneyReceivedNum =
        paymentMethod === 'cash' ? parseMoneyInput(moneyReceived) : total;
      const change = paymentMethod === 'cash' ? Math.max(0, moneyReceivedNum - total) : 0;

      let saleId = editSaleId;
      let saleNumber = editingSaleNumber;
      if (!saleNumber) {
        // Get next sale number from database
        const { data: saleNumData, error: saleNumError } = await supabase
          .rpc('get_next_sale_number');

        if (saleNumError) throw saleNumError;
        saleNumber = saleNumData;
      }

      if (editSaleId) {
        const { error: updateError } = await supabase
          .from('sales')
          .update({
            subtotal,
            tax_amount: taxAmount,
            total,
            payment_method: paymentMethod,
            money_received: moneyReceivedNum,
            change: change,
            customer_name: customerName || null,
          } as any)
          .eq('id', editSaleId);
        if (updateError) throw updateError;

        const { error: delError } = await supabase
          .from('sale_items')
          .delete()
          .eq('sale_id', editSaleId);
        if (delError) throw delError;
      } else {
        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .insert({
            sale_number: saleNumber,
            subtotal,
            tax_amount: taxAmount,
            total,
            payment_method: paymentMethod,
            money_received: moneyReceivedNum,
            change: change,
            customer_name: customerName || null,
            created_by: user?.id,
          } as any)
          .select()
          .single();
        if (saleError) throw saleError;
        saleId = (sale as any).id;
        saleNumber = (sale as any).sale_number;
      }

      const saleItems: Array<{
        sale_id: string | null;
        dish_id: string;
        dish_name: string;
        quantity: number;
        price: number;
        percentage: number;
        subtotal: number;
        category: string | null;
      }> = [];

      cart.forEach((item) => {
        if (item.sourceOrderId && item.sourceComponents && item.sourceComponents.length > 0) {
          item.sourceComponents.forEach((c) => {
            saleItems.push({
              sale_id: saleId,
              dish_id: c.dish_id,
              dish_name: c.name,
              quantity: c.quantity,
              price: c.price,
              percentage: c.percentage,
              subtotal: c.price * c.quantity,
              category: (c as any).category || null,
            });
          });
        } else {
          saleItems.push({
            sale_id: saleId,
            dish_id: item.id,
            dish_name: item.name,
            quantity: item.quantity,
            price: item.price,
            percentage: item.percentage,
            subtotal: item.price * item.quantity,
            category: item.categories?.name || null,
          });
        }
      });

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems as any);
      if (itemsError) throw itemsError;

      const billedOrderIds = cart
        .filter((i) => i.sourceOrderId)
        .map((i) => i.sourceOrderId!) as string[];
      if (billedOrderIds.length > 0) {
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({ status: 'facturada' } as any)
          .in('id', billedOrderIds);
        if (orderUpdateError) throw orderUpdateError;
      }

      const invoiceData = {
        saleNumber: saleNumber || '',
        customerName: customerName.trim() || 'Cliente general',
        subtotal,
        tax: taxAmount,
        taxRatePercent: config?.tax_percentage ?? 0,
        total,
        items: buildInvoiceLineItems(cart),
        date: new Date(),
        paymentMethod,
        paymentMethodLabel: PAYMENT_LABELS[paymentMethod] ?? paymentMethod,
        moneyReceived: moneyReceivedNum,
        change,
        restaurantName: config?.restaurant_name,
        address: config?.address,
        phone: config?.phone,
        currency: config?.currency || 'DOP',
        invoiceFooter: config?.invoice_footer,
        purchaseMessage: config?.purchase_message,
        socialInstagram: config?.social_instagram,
        socialFacebook: config?.social_facebook,
        socialTwitter: config?.social_twitter,
        paperSize: config?.invoice_paper_size,
        fontSize: config?.invoice_font_size,
        fontFamily: config?.invoice_font_family,
        primaryColor: config?.invoice_primary_color,
        showSocial: config?.invoice_show_social,
        showCustomer: config?.invoice_show_customer,
        businessId: config?.business_id,
        template: config?.invoice_template,
        showQr: config?.invoice_show_qr,
      };

      // Generate PDF
      const pdfBlob = await generateInvoicePDF(invoiceData);

      // Print PDF automatically
      if (pdfBlob && typeof pdfBlob === 'object' && 'size' in pdfBlob) {
        const pdfUrl = URL.createObjectURL(pdfBlob);

        // Create hidden iframe for printing
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = pdfUrl;
        document.body.appendChild(iframe);

        // Wait for iframe to load, then print
        iframe.onload = () => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (error) {
            console.error('Print failed:', error);
            showNotification({
              type: 'error',
              title: 'Error de impresión',
              message: 'No se pudo abrir el diálogo de impresión',
            });
          } finally {
            // Give plenty of time for the print dialog to stay open
            // Some browsers cancel printing if the iframe is removed too soon
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
                URL.revokeObjectURL(pdfUrl);
              }
            }, 60000); // 1 minute is usually enough
          }
        };

        showNotification({
          type: 'success',
          title: 'Venta completada',
          message: `Factura ${saleNumber} enviada a impresión.`,
        });
      } else {
        console.error('PDF generation failed: Invalid blob returned', pdfBlob);
        showNotification({
          type: 'error',
          title: 'Error',
          message: 'No se pudo generar el PDF correctamente',
        });
      }

      // Clear cart
      setCart([]);
      setMoneyReceived('');
      setCustomerName('');
      setPaymentMethod('cash');
      setShowCheckoutModal(false);
      setEditSaleId(null);
      setEditingSaleNumber(null);
      loadFinishedOrders();



    } catch (error: any) {
      console.error('Error processing sale:', error);
      const errorMessage = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      showNotification({
        type: 'error',
        title: 'Error',
        message: `Error al procesar la venta: ${errorMessage}`,
      });
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Punto de Venta</h1>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar platillo..."
              className="bg-transparent outline-none text-gray-700 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Left Panel: Products */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          {editSaleId && editingSaleNumber && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-4 py-3">
              Editando factura {editingSaleNumber}
            </div>
          )}
          {/* Categories & Search */}
          <div className="bg-white rounded-xl border border-gray-200 p-2 flex gap-2 items-center shrink-0">
            <div className="p-2 text-gray-400">
              <Plus className="w-5 h-5 rotate-90" /> {/* Search Icon replacement since I don't want to add import */}
            </div>
            <input
              type="text"
              placeholder="Buscar platillo..."
              className="flex-1 outline-none text-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="h-6 w-px bg-gray-200 mx-2"></div>
            <div className="flex gap-2 overflow-x-auto max-w-[50%] hide-scrollbar">
              <button
                onClick={() => setSearchTerm('')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  searchTerm === '' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
              {filteredOrders.length > 0 && (
                <div className="col-span-full flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-3 py-2">
                  <span className="text-sm font-bold">Órdenes</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{filteredOrders.length}</span>
                </div>
              )}
              {filteredOrders.map((o) => {
                const total = o.items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
                return (
                  <div
                    key={`order-${o.id}`}
                    className="group bg-white rounded-xl border border-gray-200 p-3 lg:p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-300 text-left flex flex-col h-full relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          previewOrderDetails(o);
                        }}
                        className="bg-gray-500 text-white rounded-full p-1 shadow-sm hover:bg-gray-600"
                        title="Vista previa"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addOrderToCart(o);
                        }}
                        className="bg-blue-500 text-white rounded-full p-1 shadow-sm hover:bg-blue-600"
                        title="Agregar al carrito"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                      <span className="text-lg font-bold">O</span>
                    </div>

                    <h3 className="font-bold text-gray-800 leading-tight mb-1">Orden {o.order_number}</h3>
                    <p className="text-xs text-gray-500">Mesa {o.table_number} · {o.items.length} items</p>
                    <div className="mt-auto pt-2 flex items-baseline justify-between w-full">
                      <span className="text-sm lg:text-lg font-bold text-blue-600">{formatMoney(total)}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">Orden</span>
                    </div>
                  </div>
                );
              })}
              {filteredDishes.length > 0 && (
                <div className="col-span-full flex items-center justify-between bg-orange-50 border border-orange-200 text-orange-700 rounded-lg px-3 py-2">
                  <span className="text-sm font-bold">Platillos</span>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{filteredDishes.length}</span>
                </div>
              )}
              {dishesLoading ? (
                <div className="col-span-full flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                filteredDishes.map((dish) => (
                  <button
                    key={dish.id}
                    onClick={() => addToCart(dish)}
                    className="group bg-white rounded-xl border border-gray-200 p-3 lg:p-4 shadow-sm hover:shadow-md transition-all hover:border-orange-300 text-left flex flex-col h-full relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-orange-500 text-white rounded-full p-1 shadow-sm">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
  
                    <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-3">
                      <span className="text-lg font-bold">{dish.name.charAt(0)}</span>
                    </div>
  
                    <h3 className="font-bold text-gray-800 leading-tight mb-1">{dish.name}</h3>
                    <div className="mt-auto pt-2 flex items-baseline justify-between w-full">
                      <span className="text-sm lg:text-lg font-bold text-orange-600">{formatMoney(dish.price)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Cart */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-auto lg:h-[calc(100vh-12rem)]">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Carrito</h2>
            <button
              onClick={() => setCart([])}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Vaciar
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Carrito vacío</p>
                <p className="text-sm">Agrega platillos para comenzar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{item.name}</h4>
                      <p className="text-sm text-gray-500">{formatMoney(item.price)} c/u</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatMoney(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Impuestos:</span>
                <span className="font-medium">{formatMoney(calculateTax())}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-orange-600">{formatMoney(calculateTotal())}</span>
              </div>
              {config && config.tax_percentage > 0 && (
                <p className="text-xs text-gray-500">
                  ITBIS/impuesto incluido según configuración ({config.tax_percentage}%)
                </p>
              )}
            </div>
            {cart.length > 0 && (
              <div className="mb-4 pt-3 border-t border-gray-200 space-y-2">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Efectivo — dinero recibido
                </p>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  placeholder="Ej. 500"
                  value={moneyReceived}
                  onChange={(e) => setMoneyReceived(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                />
                {moneyReceived.trim() !== '' && (
                  <div className="flex justify-between items-center rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                    <span className="text-sm font-semibold text-emerald-900">Cambio a devolver</span>
                    <span className="text-xl font-bold tabular-nums text-emerald-700">
                      {formatMoney(Math.max(0, parseMoneyInput(moneyReceived) - calculateTotal()))}
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-gray-400 leading-snug">
                  El método de pago definitivo lo confirmas al pulsar «Procesar venta».
                </p>
              </div>
            )}
            <button
              onClick={() => setShowCheckoutModal(true)}
              disabled={cart.length === 0}
              className="w-full bg-orange-500 text-white rounded-lg py-3 font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Procesar Venta
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Procesar Venta</h2>
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Order Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-3">Resumen de Pedido</h3>
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-medium">{formatMoney(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 pt-2 mt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatMoney(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Impuestos:</span>
                    <span className="font-medium">{formatMoney(calculateTax())}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-orange-600">{formatMoney(calculateTotal())}</span>
                  </div>
                </div>
              </div>

              {/* Customer Name */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-800 mb-3">Nombre del Cliente</h3>
                <input
                  type="text"
                  placeholder="Opcional: Nombre del cliente"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-800 mb-3">Método de Pago</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'cash', name: 'Efectivo', icon: <DollarSign className="w-5 h-5" /> },
                    { id: 'card', name: 'Tarjeta', icon: <CreditCard className="w-5 h-5" /> },
                    { id: 'transaction', name: 'Transferencia', icon: <Smartphone className="w-5 h-5" /> },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                        paymentMethod === method.id
                          ? 'border-orange-500 bg-orange-50 text-orange-600'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      {method.icon}
                      <span className="text-sm font-medium">{method.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Money Received */}
              {paymentMethod === 'cash' && (
                <div className="mb-4">
                  <h3 className="font-medium text-gray-800 mb-2">Dinero recibido</h3>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={moneyReceived}
                    onChange={(e) => setMoneyReceived(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg font-medium"
                  />
                </div>
              )}

              {/* Change */}
              {paymentMethod === 'cash' && moneyReceived.trim() !== '' && (
                <div className="mb-6 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-emerald-900">Total a pagar</span>
                    <span className="font-bold text-gray-900">{formatMoney(calculateTotal())}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-emerald-900">Recibido</span>
                    <span className="font-semibold text-gray-800">{formatMoney(parseMoneyInput(moneyReceived))}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
                    <span className="text-lg font-bold text-emerald-800">Cambio a devolver</span>
                    <span className="text-2xl font-bold tabular-nums text-emerald-700">
                      {formatMoney(Math.max(0, parseMoneyInput(moneyReceived) - calculateTotal()))}
                    </span>
                  </div>
                  {parseMoneyInput(moneyReceived) < calculateTotal() && (
                    <p className="mt-2 text-sm text-red-600 font-medium">
                      Faltan {formatMoney(calculateTotal() - parseMoneyInput(moneyReceived))} para completar el pago.
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={
                    paymentMethod === 'cash' &&
                    (!moneyReceived.trim() || parseMoneyInput(moneyReceived) < calculateTotal())
                  }
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Completar Venta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Preview Modal */}
      {showOrderPreview && previewOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Vista Previa - Orden {previewOrder.order_number}</h2>
                <button
                  onClick={() => {
                    setShowOrderPreview(false);
                    setPreviewOrder(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Order Details */}
              <div className="mb-6">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Número de Orden:</span>
                    <span className="font-medium">{previewOrder.order_number}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Mesa:</span>
                    <span className="font-medium">{previewOrder.table_number}</span>
                  </div>
                </div>

                <h3 className="font-medium text-gray-800 mb-3">Platillos</h3>
                <div className="space-y-3">
                  {previewOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">{item.name}</h4>
                        <p className="text-sm text-gray-500">
                          {item.quantity}x {formatMoney(item.price)} = {formatMoney(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-blue-600">
                      {formatMoney(previewOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowOrderPreview(false);
                    setPreviewOrder(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    addOrderToCart(previewOrder);
                    setShowOrderPreview(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Agregar al Carrito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}


