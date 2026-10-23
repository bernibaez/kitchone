import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useToast } from '../components/ui/Toast';
import {
  PageHeader,
  Button,
  IconButton,
  Tag,
  Drawer,
  DetailRow,
  DrawerSection,
  SearchInput,
  Tabs,
  type TabItem,
  EmptyState,
} from '../components/ui';
import { formatClock, shortOrder, UI_EVENTS } from '../lib/format';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Receipt,
  CreditCard,
  DollarSign,
  Smartphone,
  Eye,
  Lock,
  Unlock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
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
  const { toast } = useToast();
  const { formatMoney, config } = useConfig();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [dishesLoading, setDishesLoading] = useState(true);
  void dishesLoading;
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCatalogTab, setActiveCatalogTab] = useState<'dishes' | 'orders'>('dishes');

  // Drawers
  const [showCheckoutDrawer, setShowCheckoutDrawer] = useState(false);
  const [showOpenCashDrawer, setShowOpenCashDrawer] = useState(false);
  const [showCloseCashDrawer, setShowCloseCashDrawer] = useState(false);
  const [showOrderPreviewDrawer, setShowOrderPreviewDrawer] = useState(false);

  // Estados de cobro
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [moneyReceived, setMoneyReceived] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [editSaleId, setEditSaleId] = useState<string | null>(null);
  const [editingSaleNumber, setEditingSaleNumber] = useState<string | null>(null);

  // Órdenes terminadas
  const [finishedOrders, setFinishedOrders] = useState<Array<{
    id: string;
    order_number: string;
    table_number: string;
    items: Array<{ name: string; price: number; percentage: number; quantity: number; dish_id: string }>;
  }>>([]);

  const [previewOrder, setPreviewOrder] = useState<{
    id: string;
    order_number: string;
    table_number: string;
    items: Array<{ name: string; price: number; percentage: number; quantity: number; dish_id: string }>;
  } | null>(null);

  // Control de Caja
  const [isCashOpen, setIsCashOpen] = useState(false);
  const [currentCashOpening, setCurrentCashOpening] = useState<any>(null);
  const [openingAmount, setOpeningAmount] = useState<string>('');
  const [openingNotes, setOpeningNotes] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [processingCheckout, setProcessingCheckout] = useState(false);

  const checkCashStatus = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('cash_openings')
        .select('*')
        .gte('opened_at', today)
        .order('opened_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const opening = data[0];
        const { data: closingData, error: closingError } = await supabase
          .from('cash_closings')
          .select('*')
          .eq('opening_id', opening.id)
          .single();

        if (closingError && closingError.code !== 'PGRST116') {
          throw closingError;
        }

        if (!closingData) {
          setIsCashOpen(true);
          setCurrentCashOpening(opening);
        } else {
          setIsCashOpen(false);
          setCurrentCashOpening(null);
        }
      } else {
        setIsCashOpen(false);
        setCurrentCashOpening(null);
      }
    } catch (error) {
      console.error('Error checking cash status:', error);
    }
  }, []);

  const loadDishes = useCallback(async () => {
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
    } finally {
      setDishesLoading(false);
    }
  }, []);

  const loadFinishedOrders = useCallback(async () => {
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
  }, []);

  const loadSaleForEdit = useCallback(async (id: string) => {
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
        setMoneyReceived(typeof sale.money_received === 'number' ? String(sale.money_received) : '');
        setCustomerName(sale.customer_name || '');
        const items: CartItem[] = (sale.sale_items || []).map((i: any) => ({
          id: i.dish_id,
          name: i.dish_name,
          price: i.price,
          percentage: i.percentage ?? 0,
          quantity: i.quantity,
        }));
        setCart(items);
        toast({ title: `Factura ${sale.sale_number} cargada para edición`, tone: 'info' });
      }
    } catch (error) {
      console.error('Error loading sale for edit:', error);
      toast({ title: 'Error al cargar venta para edición', tone: 'bad' });
    } finally {
      sessionStorage.removeItem('edit_sale_id');
    }
  }, [toast]);

  useEffect(() => {
    loadDishes();
    checkCashStatus();
    loadFinishedOrders();

    const channel = supabase
      .channel('sales-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadFinishedOrders();
      })
      .subscribe();

    const id = sessionStorage.getItem('edit_sale_id');
    if (id) {
      loadSaleForEdit(id);
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDishes, checkCashStatus, loadFinishedOrders, loadSaleForEdit]);

  // Manejo de apertura de caja
  const handleOpenCash = async () => {
    try {
      const amount = parseMoneyInput(openingAmount);
      const { data: openingNumData, error: openingNumError } = await supabase.rpc('get_next_cash_opening_number');
      if (openingNumError) throw openingNumError;

      const { data, error } = await supabase
        .from('cash_openings')
        .insert({
          opening_number: openingNumData,
          opening_amount: amount,
          notes: openingNotes || null,
          opened_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      setIsCashOpen(true);
      setCurrentCashOpening(data);
      setShowOpenCashDrawer(false);
      setOpeningAmount('');
      setOpeningNotes('');
      window.dispatchEvent(new CustomEvent(UI_EVENTS.cashChanged));

      toast({ title: `Caja abierta con ${formatMoney(amount)}`, tone: 'ok' });
    } catch (error: any) {
      toast({ title: 'No se pudo abrir la caja', message: error.message, tone: 'bad' });
    }
  };

  // Manejo de cierre de caja
  const handleCloseCash = async () => {
    try {
      if (!currentCashOpening) {
        toast({ title: 'No hay una caja abierta', tone: 'warn' });
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('total, payment_method')
        .gte('created_at', today);

      if (salesError) throw salesError;

      const totalSales = (salesData || []).reduce((sum: number, sale: any) => sum + (sale.total || 0), 0);
      const cashAmount = (salesData || []).filter((s: any) => s.payment_method === 'cash').reduce((sum: number, s: any) => sum + (s.total || 0), 0);
      const transactionAmount = (salesData || []).filter((s: any) => s.payment_method === 'transaction').reduce((sum: number, s: any) => sum + (s.total || 0), 0);
      const cardAmount = (salesData || []).filter((s: any) => s.payment_method === 'card').reduce((sum: number, s: any) => sum + (s.total || 0), 0);

      const expectedCash = currentCashOpening.opening_amount + cashAmount;
      const difference = 0;

      const { data: closingNumData, error: closingNumError } = await supabase.rpc('get_next_cash_closing_number');
      if (closingNumError) throw closingNumError;

      const { error } = await supabase.from('cash_closings').insert({
        closing_number: closingNumData,
        opening_id: currentCashOpening.id,
        total_sales: totalSales,
        cash_amount: cashAmount,
        transaction_amount: transactionAmount,
        card_amount: cardAmount,
        expected_cash: expectedCash,
        difference: difference,
        notes: closingNotes || null,
        closed_by: user?.id,
      } as any);

      if (error) throw error;

      setIsCashOpen(false);
      setCurrentCashOpening(null);
      setShowCloseCashDrawer(false);
      setClosingNotes('');
      window.dispatchEvent(new CustomEvent(UI_EVENTS.cashChanged));

      toast({ title: `Cierre de caja ${closingNumData} registrado`, tone: 'ok' });
    } catch (error: any) {
      toast({ title: 'No se pudo cerrar la caja', message: error.message, tone: 'bad' });
    }
  };

  // Carrito y Cálculos
  const addToCart = (dish: Dish) => {
    const existing = cart.find((i) => i.id === dish.id && !i.sourceOrderId);
    if (existing) {
      setCart(cart.map((i) => (i.id === dish.id && !i.sourceOrderId ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setCart([...cart, { ...dish, quantity: 1 }]);
    }
  };

  const addOrderToCart = (order: {
    id: string;
    order_number: string;
    items: Array<{ name: string; price: number; percentage: number; quantity: number; dish_id: string }>;
  }) => {
    const exists = cart.find((i) => i.sourceOrderId === order.id);
    if (exists) return;
    const total = order.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const components = order.items.map((it) => ({
      dish_id: it.dish_id,
      name: it.name,
      price: it.price,
      percentage: it.percentage,
      quantity: it.quantity,
    }));
    setCart([
      ...cart,
      {
        id: `order:${order.id}`,
        name: `Orden #${shortOrder(order.order_number)}`,
        price: total,
        percentage: 0,
        quantity: 1,
        sourceOrderId: order.id,
        sourceComponents: components,
      },
    ]);
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((i) => i.id !== id));
    } else {
      setCart(cart.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));
    }
  };

  const calculateSubtotal = () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const calculateTax = () => {
    const sub = calculateSubtotal();
    const pct = config?.tax_percentage ?? 18;
    return Math.round(sub * (pct / 100) * 100) / 100;
  };
  const calculateTotal = () => calculateSubtotal() + calculateTax();

  // Finalizar Cobro y Factura
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ title: 'Carrito vacío', message: 'Agrega platillos u órdenes antes de cobrar.', tone: 'warn' });
      return;
    }

    setProcessingCheckout(true);
    try {
      const subtotal = calculateSubtotal();
      const taxAmount = calculateTax();
      const total = calculateTotal();
      const moneyReceivedNum = paymentMethod === 'cash' ? parseMoneyInput(moneyReceived) : total;
      const change = paymentMethod === 'cash' ? Math.max(0, moneyReceivedNum - total) : 0;

      let saleId = editSaleId;
      let saleNumber = editingSaleNumber;
      if (!saleNumber) {
        const { data: saleNumData, error: saleNumError } = await supabase.rpc('get_next_sale_number');
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
            change,
            customer_name: customerName || null,
          } as any)
          .eq('id', editSaleId);
        if (updateError) throw updateError;

        await supabase.from('sale_items').delete().eq('sale_id', editSaleId);
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
            change,
            customer_name: customerName || null,
            created_by: user?.id,
          } as any)
          .select()
          .single();
        if (saleError) throw saleError;
        saleId = (sale as any).id;
        saleNumber = (sale as any).sale_number;
      }

      const saleItems: any[] = [];
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
            });
          });
        } else {
          saleItems.push({
            sale_id: saleId,
            dish_id: item.id,
            dish_name: item.name,
            quantity: item.quantity,
            price: item.price,
            percentage: item.percentage || 0,
            subtotal: item.price * item.quantity,
          });
        }
      });

      const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
      if (itemsError) throw itemsError;

      // Actualizar órdenes de cocina a status 'facturada'
      const sourceOrderIds = Array.from(new Set(cart.map((i) => i.sourceOrderId).filter(Boolean) as string[]));
      for (const orderId of sourceOrderIds) {
        await supabase.from('orders').update({ status: 'facturada' } as any).eq('id', orderId);
      }

      // Generar ticket PDF
      try {
        const lineItems = buildInvoiceLineItems(cart);
        const blob = await generateInvoicePDF({
          saleNumber: String(saleNumber || ''),
          customerName: customerName || undefined,
          subtotal,
          tax: taxAmount,
          taxRatePercent: config?.tax_percentage ?? 18,
          total,
          items: lineItems,
          date: new Date(),
          paymentMethod,
          paymentMethodLabel: PAYMENT_LABELS[paymentMethod] || paymentMethod,
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
        });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (pdfErr) {
        console.warn('Error al generar PDF de factura:', pdfErr);
      }

      toast({
        title: `Factura #${saleNumber} registrada`,
        message: `Total: ${formatMoney(total)} — Método: ${PAYMENT_LABELS[paymentMethod] || paymentMethod}`,
        tone: 'ok',
      });

      // Limpiar estado
      setCart([]);
      setCustomerName('');
      setMoneyReceived('');
      setPaymentMethod('cash');
      setShowCheckoutDrawer(false);
      setEditSaleId(null);
      setEditingSaleNumber(null);
      loadFinishedOrders();
      window.dispatchEvent(new CustomEvent(UI_EVENTS.ordersChanged));
    } catch (error: any) {
      toast({ title: 'Error al procesar la venta', message: error.message, tone: 'bad' });
    } finally {
      setProcessingCheckout(false);
    }
  };

  const filteredDishes = useMemo(() => {
    return dishes.filter((d) => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [dishes, searchTerm]);

  const filteredFinishedOrders = useMemo(() => {
    return finishedOrders.filter(
      (o) =>
        o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.table_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [finishedOrders, searchTerm]);

  const catalogTabs: TabItem[] = [
    { id: 'dishes', label: 'Platillos de Carta', count: dishes.length },
    { id: 'orders', label: 'Comandas Listas', count: finishedOrders.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={['Operación', 'Facturación']}
        title="Punto de Venta (POS)"
        description="Facturación tipo ticket, control de caja y cobro de comandas."
        actions={
          <div className="flex items-center gap-2">
            {isCashOpen ? (
              <Button
                variant="outline"
                size="md"
                leftIcon={<Unlock className="h-4 w-4 text-ok" />}
                onClick={() => setShowCloseCashDrawer(true)}
              >
                Cerrar Caja
              </Button>
            ) : (
              <Button
                variant="acc"
                size="md"
                leftIcon={<Lock className="h-4 w-4" />}
                onClick={() => setShowOpenCashDrawer(true)}
              >
                Abrir Caja
              </Button>
            )}
          </div>
        }
      />

      {editSaleId && editingSaleNumber && (
        <div className="rounded-card border border-info/40 bg-info-soft/30 px-4 py-3 text-sm text-info font-medium flex items-center justify-between">
          <span>Editando factura registrada: #{editingSaleNumber}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditSaleId(null);
              setEditingSaleNumber(null);
              setCart([]);
            }}
          >
            Cancelar Edición
          </Button>
        </div>
      )}

      {/* Grid Principal: Menú / Comandas (Izquierda) + Ticket Carrito (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Catálogo y Comandas */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Tabs items={catalogTabs} value={activeCatalogTab} onChange={setActiveCatalogTab as any} />
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar plato o #orden…"
              wrapperClassName="w-full sm:w-64"
            />
          </div>

          {activeCatalogTab === 'dishes' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredDishes.map((dish) => (
                <button
                  key={dish.id}
                  type="button"
                  onClick={() => addToCart(dish)}
                  className="card card-hover flex flex-col p-3.5 text-left transition-all hover:border-accent"
                >
                  <div className="flex items-start justify-between gap-1 w-full">
                    <span className="font-semibold text-sm text-fg leading-tight line-clamp-2">{dish.name}</span>
                    <Plus className="h-4 w-4 text-accent-strong shrink-0 mt-0.5" />
                  </div>
                  <span className="text-xs text-muted mt-1">{dish.categories?.name}</span>
                  <div className="mt-3 pt-2 border-t border-line/60 flex items-baseline justify-between w-full">
                    <span className="tnum font-display font-bold text-base text-accent-strong">
                      {formatMoney(dish.price)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* Comandas de cocina terminadas listas para facturar */
            <div className="space-y-3">
              {filteredFinishedOrders.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-8 w-8 text-ok" />}
                  title="No hay comandas terminadas pendientes de cobro"
                  description="Las órdenes que cocina marque como listas aparecerán aquí."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredFinishedOrders.map((order) => {
                    const total = order.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
                    return (
                      <div
                        key={order.id}
                        className="card card-hover p-4 flex flex-col justify-between border-line hover:border-accent"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-sm font-bold text-fg">#{shortOrder(order.order_number)}</span>
                            <Tag tone={order.table_number ? 'accent' : 'warn'}>
                              {order.table_number ? `Mesa ${order.table_number}` : 'Llevar'}
                            </Tag>
                          </div>
                          <div className="text-xs text-muted space-y-1 mb-3">
                            {order.items.slice(0, 3).map((it, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span className="truncate">{it.quantity}× {it.name}</span>
                                <span className="tnum font-medium text-fg">{formatMoney(it.price * it.quantity)}</span>
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <div className="text-[11px] text-muted italic">+{order.items.length - 3} más</div>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-line flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-muted uppercase block font-semibold">Total comanda</span>
                            <span className="tnum font-display text-base font-bold text-fg">{formatMoney(total)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <IconButton
                              label="Vista previa"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setPreviewOrder(order);
                                setShowOrderPreviewDrawer(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </IconButton>
                            <Button
                              size="sm"
                              variant="pri"
                              rightIcon={<Plus className="h-3.5 w-3.5" />}
                              onClick={() => addOrderToCart(order)}
                            >
                              Cobrar
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Carrito / Ticket POS (Derecha) */}
        <div className="lg:col-span-5 xl:col-span-4 card p-5 shadow-sm space-y-5 sticky top-24">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-accent-strong" />
              <h2 className="font-display font-bold text-base text-fg">Ticket de Facturación</h2>
            </div>
            <span className="tnum text-xs font-semibold text-muted bg-surface-2 px-2 py-0.5 rounded-full border border-line">
              {cart.reduce((s, i) => s + i.quantity, 0)} ítems
            </span>
          </div>

          {/* Lista de ítems en carrito */}
          <div className="custom-scrollbar max-h-[380px] overflow-y-auto divide-y divide-line/60">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Ticket en blanco. Selecciona platillos o comandas para facturar.
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg leading-tight truncate">{item.name}</p>
                    <p className="text-xs text-muted">{formatMoney(item.price)} c/u</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <IconButton
                      label="Disminuir"
                      size="sm"
                      variant="ghost"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </IconButton>
                    <span className="tnum font-bold text-xs w-6 text-center">{item.quantity}</span>
                    <IconButton
                      label="Aumentar"
                      size="sm"
                      variant="ghost"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </IconButton>
                  </div>

                  <div className="tnum font-bold text-sm text-fg text-right min-w-[60px]">
                    {formatMoney(item.price * item.quantity)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desglose Financiero */}
          <div className="rounded-card border border-line bg-surface-2/40 p-4 space-y-2 text-sm">
            <DetailRow label="Subtotal">{formatMoney(calculateSubtotal())}</DetailRow>
            <DetailRow label={`ITBIS (${config?.tax_percentage ?? 18}%)`}>{formatMoney(calculateTax())}</DetailRow>
            <div className="border-t border-line pt-2 mt-2">
              <DetailRow label={<span className="font-bold text-base text-fg">Total a Pagar</span>}>
                <span className="font-display font-extrabold text-2xl text-accent-strong">
                  {formatMoney(calculateTotal())}
                </span>
              </DetailRow>
            </div>
          </div>

          {/* Botones de acción del carrito */}
          <div className="space-y-2 pt-2">
            <Button
              variant="acc"
              size="lg"
              block
              disabled={cart.length === 0}
              rightIcon={<ArrowRight className="h-5 w-5" />}
              onClick={() => setShowCheckoutDrawer(true)}
            >
              Cobrar Factura ({formatMoney(calculateTotal())})
            </Button>

            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                block
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => setCart([])}
              >
                Vaciar Ticket
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- DRAWER DE COBRO / CHECKOUT ---------------- */}
      <Drawer
        open={showCheckoutDrawer}
        onClose={() => setShowCheckoutDrawer(false)}
        title="Procesar Pago y Factura"
        eyebrow="Cobro en Caja"
        description="Selecciona el método de pago y emite el comprobante fiscal/ticket."
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              <span className="text-xs text-muted block">Monto total</span>
              <span className="font-display text-xl font-extrabold text-accent-strong">
                {formatMoney(calculateTotal())}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setShowCheckoutDrawer(false)}>
                Cancelar
              </Button>
              <Button
                variant="acc"
                size="lg"
                loading={processingCheckout}
                disabled={
                  paymentMethod === 'cash' &&
                  (!moneyReceived.trim() || parseMoneyInput(moneyReceived) < calculateTotal())
                }
                onClick={handleCheckout}
              >
                Completar y Generar Factura
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Nombre del cliente */}
          <DrawerSection title="Datos del Comprobante">
            <div>
              <label className="field-label">Nombre del Cliente / RNC (Opcional)</label>
              <input
                type="text"
                placeholder="Consumidor Final"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="field"
              />
            </div>
          </DrawerSection>

          {/* Selección de Método de Pago */}
          <DrawerSection title="Método de Pago">
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'cash', label: 'Efectivo', icon: <DollarSign className="h-5 w-5" /> },
                { id: 'card', label: 'Tarjeta', icon: <CreditCard className="h-5 w-5" /> },
                { id: 'transaction', label: 'Transferencia', icon: <Smartphone className="h-5 w-5" /> },
              ].map((m) => {
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-card border transition-all text-xs font-semibold ${
                      isSelected
                        ? 'bg-ink text-ink-on border-ink shadow-sm'
                        : 'bg-surface border-line text-fg hover:border-line-strong'
                    }`}
                  >
                    <span className="mb-1">{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </DrawerSection>

          {/* Efectivo recibido y cambio */}
          {paymentMethod === 'cash' && (
            <DrawerSection title="Detalle de Efectivo">
              <div className="space-y-3 rounded-card border border-line bg-surface-2/40 p-4">
                <div>
                  <label className="field-label">Monto Recibido ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={calculateTotal()}
                    placeholder={calculateTotal().toFixed(2)}
                    value={moneyReceived}
                    onChange={(e) => setMoneyReceived(e.target.value)}
                    className="field text-lg font-bold"
                  />
                </div>

                {moneyReceived && (
                  <div className="pt-2 border-t border-line flex justify-between items-center text-sm font-medium">
                    <span className="text-muted">Cambio a devolver:</span>
                    <span className="tnum font-display font-extrabold text-lg text-ok">
                      {formatMoney(Math.max(0, parseMoneyInput(moneyReceived) - calculateTotal()))}
                    </span>
                  </div>
                )}
              </div>
            </DrawerSection>
          )}

          {/* Resumen del ticket */}
          <DrawerSection title="Resumen de la Venta">
            <div className="rounded-card border border-line bg-surface divide-y divide-line/60">
              {buildInvoiceLineItems(cart).map((item, idx) => (
                <div key={idx} className="p-2.5 flex justify-between text-xs">
                  <span className="text-fg">{item.quantity}× {item.name}</span>
                  <span className="tnum font-semibold text-fg">{formatMoney(item.lineTotal)}</span>
                </div>
              ))}
            </div>
          </DrawerSection>
        </div>
      </Drawer>

      {/* ---------------- DRAWER DE APERTURA DE CAJA ---------------- */}
      <Drawer
        open={showOpenCashDrawer}
        onClose={() => setShowOpenCashDrawer(false)}
        title="Apertura de Caja"
        eyebrow="Control de Turno"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" onClick={() => setShowOpenCashDrawer(false)}>
              Cancelar
            </Button>
            <Button variant="acc" onClick={handleOpenCash}>
              Confirmar Apertura
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="field-label">Monto Inicial en Efectivo (Fondo de Caja)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              className="field text-lg font-bold"
              required
            />
          </div>

          <div>
            <label className="field-label">Notas de Apertura (Opcional)</label>
            <textarea
              className="field"
              rows={3}
              placeholder="Detalles sobre el fondo, billetes o turno..."
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
            />
          </div>
        </div>
      </Drawer>

      {/* ---------------- DRAWER DE CIERRE DE CAJA ---------------- */}
      <Drawer
        open={showCloseCashDrawer}
        onClose={() => setShowCloseCashDrawer(false)}
        title="Cierre de Caja y Arqueo"
        eyebrow="Fin de Turno"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" onClick={() => setShowCloseCashDrawer(false)}>
              Cancelar
            </Button>
            <Button variant="acc" onClick={handleCloseCash}>
              Confirmar Cierre de Caja
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="rounded-card border border-line bg-surface-2/40 p-4 space-y-2 text-sm">
            <DetailRow label="Número de apertura">
              <span className="font-mono font-bold">{currentCashOpening?.opening_number || '---'}</span>
            </DetailRow>
            <DetailRow label="Monto inicial de apertura">
              {formatMoney(currentCashOpening?.opening_amount || 0)}
            </DetailRow>
            <DetailRow label="Hora de apertura">
              {currentCashOpening?.opened_at ? formatClock(currentCashOpening.opened_at) : '---'}
            </DetailRow>
          </div>

          <div>
            <label className="field-label">Observaciones del Cierre</label>
            <textarea
              className="field"
              rows={3}
              placeholder="Novedades del turno, diferencias o conteo físico de efectivo..."
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
            />
          </div>

          <div className="rounded-card border border-warn/40 bg-warn-soft/40 p-3 text-xs text-warn font-medium flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Al cerrar la caja se calculará automáticamente el desglose de ventas por método de pago y quedará asentado en el historial.
            </span>
          </div>
        </div>
      </Drawer>

      {/* ---------------- DRAWER DE VISTA PREVIA DE ORDEN ---------------- */}
      <Drawer
        open={showOrderPreviewDrawer && Boolean(previewOrder)}
        onClose={() => setShowOrderPreviewDrawer(false)}
        title={previewOrder ? `Orden #${shortOrder(previewOrder.order_number)}` : ''}
        eyebrow={previewOrder?.table_number ? `Mesa ${previewOrder.table_number}` : 'Llevar'}
        footer={
          previewOrder && (
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" onClick={() => setShowOrderPreviewDrawer(false)}>
                Cerrar
              </Button>
              <Button
                variant="acc"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  addOrderToCart(previewOrder);
                  setShowOrderPreviewDrawer(false);
                }}
              >
                Agregar al Ticket
              </Button>
            </div>
          )
        }
      >
        {previewOrder && (
          <div className="space-y-4">
            <div className="divide-y divide-line rounded-card border border-line bg-surface">
              {previewOrder.items.map((it, idx) => (
                <div key={idx} className="p-3 flex justify-between text-sm">
                  <div>
                    <span className="font-bold text-fg mr-2">{it.quantity}×</span>
                    <span className="font-medium text-fg">{it.name}</span>
                  </div>
                  <span className="tnum font-bold text-fg">{formatMoney(it.price * it.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="rounded-card border border-line bg-surface-2/40 p-4 flex justify-between items-center">
              <span className="font-bold text-fg">Total de la Comanda</span>
              <span className="font-display text-xl font-bold text-accent-strong">
                {formatMoney(previewOrder.items.reduce((s, it) => s + it.price * it.quantity, 0))}
              </span>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
