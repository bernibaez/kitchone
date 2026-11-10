import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useToast } from '../components/ui/Toast';
import {
  PageHeader,
  Button,
  IconButton,
  StatCard,
  Panel,
  Pill,
  Drawer,
  DrawerSection,
  SearchInput,
  DataTable,
  type Column,
  EmptyState,
  Tabs,
  type TabItem,
} from '../components/ui';
import {
  Plus,
  Eye,
  FileText,
  Printer,
  Download,
  Share2,
  Trash2,
  Edit2,
  Copy,
  Receipt,
  CheckCircle2,
  Clock,
  DollarSign,
  Phone,
  UtensilsCrossed,
  Database,
  Code2,
  Check,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import {
  type Quotation,
  type QuotationItem,
  type QuotationStatus,
  QUOTATION_STATUS_META,
  fetchQuotations,
  saveQuotation,
  deleteQuotation,
  updateQuotationStatus,
  getNextQuoteNumber,
} from '../lib/quotations';
import {
  downloadQuotationPDF,
  printQuotationPDF,
  generateWhatsAppMessage,
} from '../lib/quotationPdf';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface Dish {
  id: string;
  name: string;
  price: number;
  categories?: { name: string } | null;
}

interface QuotationsProps {
  onNavigate?: (page: string) => void;
}

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    return d.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function Quotations({ onNavigate }: QuotationsProps) {
  const { user } = useAuth();
  const { config, formatMoney } = useConfig();
  const { toast } = useToast();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(false);

  // Filters & Navigation
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  // Drawers & Modals
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Form State
  const [quoteNumber, setQuoteNumber] = useState('');
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [eventDate, setEventDate] = useState('');
  const [quoteStatus, setQuoteStatus] = useState<QuotationStatus>('borrador');
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [applyTax, setApplyTax] = useState(true);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState(
    '1. Precios válidos durante el periodo de vigencia indicado.\n2. Se requiere el 50% de anticipo para confirmar el servicio.\n3. El saldo restante se cancela contra entrega.'
  );

  // Dish picker inside form drawer
  const [dishSearch, setDishSearch] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [showCustomAdder, setShowCustomAdder] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load Initial Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, isLocal } = await fetchQuotations();
      setQuotations(data);
      setIsLocalMode(isLocal);

      // Keep selected quote in sync if open
      if (selectedQuotation) {
        const found = data.find((q) => q.id === selectedQuotation.id);
        if (found) setSelectedQuotation(found);
      }

      // Load Customers & Dishes from Supabase
      const [custRes, dishRes] = await Promise.all([
        supabase.from('customers').select('id, name, email, phone, address').eq('is_active', true).order('name'),
        supabase.from('dishes').select('id, name, price, categories(name)').eq('is_active', true).order('name'),
      ]);

      if (custRes.data) setCustomers(custRes.data as Customer[]);
      if (dishRes.data) setDishes(dishRes.data as any[]);
    } catch (err: any) {
      console.error('Error loading quotations data:', err);
      toast({ title: 'Error al cargar cotizaciones', message: err.message, tone: 'bad' });
    } finally {
      setLoading(false);
    }
  }, [toast, selectedQuotation]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculations for Current Editing Form
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  }, [items]);

  const taxPercentage = useMemo(() => {
    if (!applyTax) return 0;
    return config?.tax_percentage ?? 18;
  }, [applyTax, config]);

  const taxAmount = useMemo(() => {
    if (!applyTax || subtotal <= 0) return 0;
    const taxable = Math.max(0, subtotal - discountAmount);
    return Math.round(taxable * (taxPercentage / 100) * 100) / 100;
  }, [applyTax, subtotal, discountAmount, taxPercentage]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + taxAmount);
  }, [subtotal, discountAmount, taxAmount]);

  // Overall Metrics
  const stats = useMemo(() => {
    const totalCount = quotations.length;
    const totalAmount = quotations.reduce((acc, q) => acc + (q.total || 0), 0);
    const approvedCount = quotations.filter((q) => q.status === 'aprobada' || q.status === 'facturada').length;
    const pendingCount = quotations.filter((q) => q.status === 'borrador' || q.status === 'enviada').length;
    const conversionRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

    return { totalCount, totalAmount, approvedCount, pendingCount, conversionRate };
  }, [quotations]);

  // Open Drawer for New Quotation
  const handleOpenNew = async () => {
    const nextNumber = await getNextQuoteNumber(quotations);
    setEditingQuotation(null);
    setQuoteNumber(nextNumber);
    setCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() + 15);
    setValidUntil(d.toISOString().split('T')[0]);
    setEventDate('');
    setQuoteStatus('borrador');
    setItems([]);
    setApplyTax(true);
    setDiscountAmount(0);
    setNotes(
      '1. Precios válidos durante el periodo de vigencia indicado.\n2. Se requiere el 50% de anticipo para confirmar el servicio.\n3. El saldo restante se cancela contra entrega.'
    );
    setShowDrawer(true);
  };

  // Open Drawer for Editing Quotation
  const handleOpenEdit = (q: Quotation) => {
    setEditingQuotation(q);
    setQuoteNumber(q.quote_number);
    setCustomerId(q.customer_id || '');
    setCustomerName(q.customer_name);
    setCustomerPhone(q.customer_phone || '');
    setCustomerEmail(q.customer_email || '');
    setCustomerAddress(q.customer_address || '');
    setDate(q.date);
    setValidUntil(q.valid_until || '');
    setEventDate(q.event_date || '');
    setQuoteStatus(q.status);
    setItems(Array.isArray(q.items) ? [...q.items] : []);
    setApplyTax(q.tax_percentage > 0);
    setDiscountAmount(q.discount_amount || 0);
    setNotes(q.notes || '');
    setShowDrawer(true);
  };

  // Selecting a Registered Customer
  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    const found = customers.find((c) => c.id === id);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone || '');
      setCustomerEmail(found.email || '');
      setCustomerAddress(found.address || '');
    }
  };

  // Adding item to quote
  const handleAddDish = (dish: Dish) => {
    const existing = items.find((it) => it.dish_id === dish.id);
    if (existing) {
      setItems(
        items.map((it) =>
          it.dish_id === dish.id
            ? { ...it, quantity: it.quantity + 1, subtotal: (it.quantity + 1) * it.price }
            : it
        )
      );
    } else {
      const newItem: QuotationItem = {
        id: `item-${Date.now()}-${Math.random()}`,
        dish_id: dish.id,
        name: dish.name,
        quantity: 1,
        price: dish.price,
        discount_percent: 0,
        subtotal: dish.price,
      };
      setItems([...items, newItem]);
    }
    toast({ title: `"${dish.name}" agregado`, tone: 'info' });
  };

  // Adding custom item / service
  const handleAddCustomItem = () => {
    const priceNum = parseFloat(customItemPrice);
    if (!customItemName.trim()) {
      toast({ title: 'Ingresa el nombre del concepto', tone: 'warn' });
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      toast({ title: 'Ingresa un precio válido', tone: 'warn' });
      return;
    }

    const newItem: QuotationItem = {
      id: `custom-${Date.now()}`,
      dish_id: null,
      name: customItemName.trim(),
      quantity: 1,
      price: priceNum,
      discount_percent: 0,
      subtotal: priceNum,
    };
    setItems([...items, newItem]);
    setCustomItemName('');
    setCustomItemPrice('');
    setShowCustomAdder(false);
    toast({ title: 'Concepto personalizado agregado', tone: 'ok' });
  };

  // Modify item quantity
  const handleUpdateItemQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.id !== id) return it;
          const nextQty = Math.max(1, it.quantity + delta);
          return {
            ...it,
            quantity: nextQty,
            subtotal: nextQty * it.price * (1 - (it.discount_percent || 0) / 100),
          };
        })
        .filter((it) => it.quantity > 0)
    );
  };

  // Modify item price
  const handleUpdateItemPrice = (id: string, newPrice: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        return {
          ...it,
          price: newPrice,
          subtotal: it.quantity * newPrice * (1 - (it.discount_percent || 0) / 100),
        };
      })
    );
  };

  // Remove item
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Save Quotation
  const handleSave = async (statusOverride?: QuotationStatus) => {
    if (!customerName.trim()) {
      toast({ title: 'Ingresa el nombre del cliente', tone: 'warn' });
      return;
    }
    if (items.length === 0) {
      toast({ title: 'Agrega al menos un platillo o concepto a la cotización', tone: 'warn' });
      return;
    }

    setSaving(true);
    try {
      const quotePayload: Quotation = {
        id: editingQuotation ? editingQuotation.id : `temp-${Date.now()}`,
        quote_number: quoteNumber,
        customer_id: customerId || null,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || null,
        customer_phone: customerPhone.trim() || null,
        customer_address: customerAddress.trim() || null,
        date,
        valid_until: validUntil || null,
        event_date: eventDate || null,
        status: statusOverride || quoteStatus,
        subtotal,
        tax_percentage: taxPercentage,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total,
        notes: notes.trim() || null,
        created_at: editingQuotation ? editingQuotation.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items,
      };

      const result = await saveQuotation(quotePayload, user?.id);
      setIsLocalMode(result.isLocal);

      toast({
        title: editingQuotation ? 'Cotización actualizada' : 'Cotización guardada exitosamente',
        message: `${quoteNumber} para ${customerName}`,
        tone: 'ok',
      });

      setShowDrawer(false);
      if (selectedQuotation && selectedQuotation.id === quotePayload.id) {
        setSelectedQuotation(result.data);
      }
      await loadData();
    } catch (err: any) {
      console.error('Error saving quotation:', err);
      toast({ title: 'Error al guardar cotización', message: err.message, tone: 'bad' });
    } finally {
      setSaving(false);
    }
  };

  // Delete Quotation
  const handleDelete = async (quote: Quotation) => {
    if (!confirm(`¿Estás seguro de eliminar la cotización ${quote.quote_number}?`)) return;

    try {
      await deleteQuotation(quote.id);
      toast({ title: `Cotización ${quote.quote_number} eliminada`, tone: 'ok' });
      if (selectedQuotation && selectedQuotation.id === quote.id) {
        setSelectedQuotation(null);
      }
      await loadData();
    } catch (err: any) {
      toast({ title: 'Error al eliminar', message: err.message, tone: 'bad' });
    }
  };

  // Change Status
  const handleStatusChange = async (quote: Quotation, nextStatus: QuotationStatus) => {
    try {
      await updateQuotationStatus(quote.id, nextStatus);
      toast({
        title: `Estado cambiado a ${QUOTATION_STATUS_META[nextStatus].label}`,
        tone: 'info',
      });
      if (selectedQuotation && selectedQuotation.id === quote.id) {
        setSelectedQuotation({ ...selectedQuotation, status: nextStatus });
      }
      await loadData();
    } catch (err: any) {
      toast({ title: 'Error al actualizar estado', message: err.message, tone: 'bad' });
    }
  };

  // Convert Quotation into Sale (Facturación)
  const handleConvertToSale = async (quote: Quotation) => {
    try {
      const safeItems = Array.isArray(quote.items) ? quote.items : [];
      const payload = {
        quotationId: quote.id,
        quoteNumber: quote.quote_number,
        customerName: quote.customer_name,
        customerId: quote.customer_id,
        items: safeItems.map((it) => ({
          dish_id: it.dish_id,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          discount_percent: it.discount_percent || 0,
        })),
        notes: quote.notes,
      };

      sessionStorage.setItem('quote_to_sale', JSON.stringify(payload));

      if (quote.status === 'borrador' || quote.status === 'enviada') {
        await updateQuotationStatus(quote.id, 'aprobada');
      }

      toast({
        title: `Cotización ${quote.quote_number} enviada a Facturación`,
        message: 'Redirigiendo a caja...',
        tone: 'ok',
      });

      if (onNavigate) {
        onNavigate('sales');
      }
    } catch (err: any) {
      toast({ title: 'Error al convertir a venta', message: err.message, tone: 'bad' });
    }
  };

  // WhatsApp share
  const handleShareWhatsApp = (quote: Quotation) => {
    const text = generateWhatsAppMessage(quote, config?.restaurant_name, config?.currency);
    const cleanPhone = (quote.customer_phone || '').replace(/\D/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // PDF Download & Print
  const handlePdfDownload = (quote: Quotation) => {
    downloadQuotationPDF(quote, {
      restaurantName: config?.restaurant_name,
      businessId: config?.business_id,
      phone: config?.phone,
      address: config?.address,
      currency: config?.currency,
      primaryColor: config?.invoice_primary_color || '#F07A2E',
    });
  };

  const handlePdfPrint = (quote: Quotation) => {
    printQuotationPDF(quote, {
      restaurantName: config?.restaurant_name,
      businessId: config?.business_id,
      phone: config?.phone,
      address: config?.address,
      currency: config?.currency,
      primaryColor: config?.invoice_primary_color || '#F07A2E',
    });
  };

  // Copy SQL Migration
  const copyMigrationSql = () => {
    const sql = `-- Ejecuta este script en el Editor SQL de Supabase
CREATE SEQUENCE IF NOT EXISTS quotation_number_seq START 1;

CREATE OR REPLACE FUNCTION get_next_quotation_number()
RETURNS text AS $$
DECLARE
  next_val integer;
BEGIN
  SELECT nextval('quotation_number_seq') INTO next_val;
  RETURN 'COT-' || LPAD(next_val::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_address text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  event_date date,
  status text NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador', 'enviada', 'aprobada', 'rechazada', 'facturada')),
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax_percentage numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) NOT NULL DEFAULT 0,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  converted_sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  dish_id uuid REFERENCES dishes(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL DEFAULT 0,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated items" ON quotation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
`;
    navigator.clipboard.writeText(sql);
    setSqlCopied(true);
    toast({ title: 'SQL copiado al portapapeles', tone: 'ok' });
    setTimeout(() => setSqlCopied(false), 3000);
  };

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const matchStatus = statusFilter === 'all' || q.status === statusFilter;
      const term = searchTerm.toLowerCase().trim();
      const safeItems = Array.isArray(q.items) ? q.items : [];
      const matchSearch =
        !term ||
        (q.quote_number && q.quote_number.toLowerCase().includes(term)) ||
        (q.customer_name && q.customer_name.toLowerCase().includes(term)) ||
        (q.customer_phone && q.customer_phone.includes(term)) ||
        safeItems.some((it) => it.name && it.name.toLowerCase().includes(term));

      return matchStatus && matchSearch;
    });
  }, [quotations, statusFilter, searchTerm]);

  // Dishes filtered by search inside drawer
  const filteredDishes = useMemo(() => {
    const t = dishSearch.toLowerCase().trim();
    if (!t) return dishes.slice(0, 8);
    return dishes
      .filter((d) => d.name.toLowerCase().includes(t) || d.categories?.name?.toLowerCase().includes(t))
      .slice(0, 12);
  }, [dishes, dishSearch]);

  // Tab definitions
  const tabs: TabItem<string>[] = useMemo(
    () => [
      { id: 'all', label: 'Todas', count: quotations.length },
      { id: 'borrador', label: 'Borrador', count: quotations.filter((q) => q.status === 'borrador').length },
      { id: 'enviada', label: 'Enviadas', count: quotations.filter((q) => q.status === 'enviada').length },
      { id: 'aprobada', label: 'Aprobadas', count: quotations.filter((q) => q.status === 'aprobada').length },
      { id: 'facturada', label: 'Facturadas', count: quotations.filter((q) => q.status === 'facturada').length },
      { id: 'rechazada', label: 'Rechazadas', count: quotations.filter((q) => q.status === 'rechazada').length },
    ],
    [quotations]
  );

  // Table Columns
  const columns: Column<Quotation>[] = useMemo(
    () => [
      {
        key: 'quote_number',
        header: 'Folio',
        sortValue: (r) => r.quote_number,
        cell: (r) => (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-accent">{r.quote_number}</span>
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Cliente',
        sortValue: (r) => r.customer_name,
        cell: (r) => (
          <div>
            <span className="block font-semibold text-fg">{r.customer_name}</span>
            {r.customer_phone && (
              <span className="block text-xs text-muted flex items-center gap-1">
                <Phone className="h-3 w-3" /> {r.customer_phone}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'date',
        header: 'Fecha / Vencimiento',
        sortValue: (r) => r.date,
        cell: (r) => {
          const isExpired = r.valid_until && new Date(r.valid_until) < new Date() && r.status !== 'facturada';
          return (
            <div className="text-xs">
              <span className="text-fg font-medium">{formatDateDisplay(r.date)}</span>
              {r.valid_until && (
                <span className={`block ${isExpired ? 'text-red-500 font-semibold' : 'text-muted'}`}>
                  Vence: {formatDateDisplay(r.valid_until)} {isExpired ? '(Vencida)' : ''}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'items',
        header: 'Ítems',
        cell: (r) => {
          const count = Array.isArray(r.items) ? r.items.length : 0;
          return (
            <span className="text-xs text-muted">
              {count} {count === 1 ? 'concepto' : 'conceptos'}
            </span>
          );
        },
      },
      {
        key: 'total',
        header: 'Total',
        align: 'right',
        sortValue: (r) => r.total,
        cell: (r) => <span className="font-bold text-fg tnum">{formatMoney(r.total || 0)}</span>,
      },
      {
        key: 'status',
        header: 'Estado',
        sortValue: (r) => r.status,
        cell: (r) => {
          const meta = QUOTATION_STATUS_META[r.status] || { label: r.status, tone: 'neutral' };
          return (
            <Pill tone={meta.tone} dot size="sm">
              {meta.label}
            </Pill>
          );
        },
      },
      {
        key: 'actions',
        header: 'Acciones',
        align: 'right',
        cell: (r) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <IconButton
              label="Ver detalle"
              onClick={() => setSelectedQuotation(r)}
            >
              <Eye className="h-4 w-4" />
            </IconButton>
            <IconButton
              label="Descargar PDF"
              onClick={() => handlePdfDownload(r)}
            >
              <Download className="h-4 w-4" />
            </IconButton>
            <IconButton
              label="Enviar por WhatsApp"
              onClick={() => handleShareWhatsApp(r)}
            >
              <Share2 className="h-4 w-4" />
            </IconButton>
            {r.status !== 'facturada' && (
              <IconButton
                label="Facturar / Enviar a Caja"
                onClick={() => handleConvertToSale(r)}
              >
                <Receipt className="h-4 w-4 text-accent" />
              </IconButton>
            )}
            <IconButton
              label="Editar"
              onClick={() => handleOpenEdit(r)}
            >
              <Edit2 className="h-4 w-4" />
            </IconButton>
            <IconButton
              label="Eliminar"
              onClick={() => handleDelete(r)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </IconButton>
          </div>
        ),
      },
    ],
    [formatMoney]
  );

  /* =========================================================================
     SI HAY UNA COTIZACIÓN SELECCIONADA, MOSTRAMOS LA VISTA INVOICE ELEGANTE
     (EXACTO DISEÑO DE LA CAPTURA: HOJA INVOICE A LA IZQ + SIDEBAR ACCIONES A LA DERECHA)
  ========================================================================= */
  if (selectedQuotation) {
    const q = selectedQuotation;
    const safeItems = Array.isArray(q.items) ? q.items : [];
    const statusMeta = QUOTATION_STATUS_META[q.status] || { label: q.status, tone: 'neutral' };
    const restaurantInitials = (config?.restaurant_name || 'Kitch One')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => setSelectedQuotation(null)}
          >
            Volver a la lista
          </Button>
          <div className="flex items-center gap-2">
            <Pill tone={statusMeta.tone} dot size="md">
              {statusMeta.label.toUpperCase()}
            </Pill>
          </div>
        </div>

        {/* 2-Column Layout matching Screenshot */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: THE INVOICE / QUOTATION PAPER CARD (8 cols) */}
          <div className="lg:col-span-8 relative overflow-hidden rounded-2xl border border-line bg-surface p-8 sm:p-10 shadow-sm space-y-8">
            {/* Top Right Diagonal Ribbon */}
            <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden pointer-events-none">
              <div
                className={`absolute transform rotate-45 text-[10px] font-bold tracking-widest py-1.5 right-[-38px] top-[26px] w-[150px] text-center uppercase shadow-xs ${
                  q.status === 'aprobada'
                    ? 'bg-ok/20 text-ok border-b border-ok/30'
                    : q.status === 'facturada'
                    ? 'bg-accent/20 text-accent border-b border-accent/30'
                    : q.status === 'rechazada'
                    ? 'bg-red-500/20 text-red-500 border-b border-red-500/30'
                    : 'bg-surface-2 text-muted border-b border-line'
                }`}
              >
                {statusMeta.label}
              </div>
            </div>

            {/* Header: Company & Invoice Label */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pr-12">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-ink text-ink-on font-display font-bold text-lg flex items-center justify-center shrink-0 shadow-sm">
                  {restaurantInitials}
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg text-fg">
                    {config?.restaurant_name || 'Kitch One'}
                  </h2>
                  {config?.address && <p className="text-xs text-muted leading-relaxed mt-0.5">{config.address}</p>}
                  {config?.phone && <p className="text-xs text-muted">Tel: {config.phone}</p>}
                  {config?.business_id && <p className="text-xs text-muted font-mono">Tax / RNC: {config.business_id}</p>}
                </div>
              </div>

              <div className="sm:text-right">
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
                  Cotización
                </h1>
                <p className="font-mono text-sm font-semibold text-muted mt-1">{q.quote_number}</p>
              </div>
            </div>

            {/* Metadata 4-Column Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-line text-xs">
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Cotizado A
                </span>
                <strong className="block text-sm font-bold text-fg">{q.customer_name}</strong>
                {q.customer_phone && <span className="block text-muted mt-0.5">{q.customer_phone}</span>}
                {q.customer_email && <span className="block text-muted">{q.customer_email}</span>}
                {q.customer_address && <span className="block text-muted">{q.customer_address}</span>}
              </div>

              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Emisión
                </span>
                <strong className="block text-sm font-semibold text-fg">
                  {formatDateDisplay(q.date)}
                </strong>
                {q.event_date && (
                  <span className="block text-xs text-accent mt-1">
                    Evento: {formatDateDisplay(q.event_date)}
                  </span>
                )}
              </div>

              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Vence
                </span>
                <strong className="block text-sm font-semibold text-fg">
                  {formatDateDisplay(q.valid_until)}
                </strong>
              </div>

              <div className="sm:text-right">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Monto Total
                </span>
                <strong className="block text-lg font-display font-extrabold text-fg tnum">
                  {formatMoney(q.total || 0)}
                </strong>
              </div>
            </div>

            {/* Clean Minimalist Table */}
            <div className="pt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[11px] font-bold uppercase tracking-wider text-muted">
                    <th className="py-3 font-bold">Descripción</th>
                    <th className="py-3 text-center font-bold w-16">Cant.</th>
                    <th className="py-3 text-right font-bold w-28">Precio</th>
                    <th className="py-3 text-right font-bold w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {safeItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted">
                        No hay conceptos agregados en esta cotización.
                      </td>
                    </tr>
                  ) : (
                    safeItems.map((it) => (
                      <tr key={it.id} className="hover:bg-hover/50 transition-colors">
                        <td className="py-4 pr-3">
                          <span className="font-semibold text-sm text-fg block">{it.name}</span>
                          {it.description ? (
                            <span className="text-xs text-muted block mt-0.5">{it.description}</span>
                          ) : (
                            <span className="text-[11px] text-muted/70 block mt-0.5">
                              ITBIS {q.tax_percentage > 0 ? `${q.tax_percentage}%` : 'Exento'}
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-center font-medium text-sm text-fg tnum">
                          {it.quantity}
                        </td>
                        <td className="py-4 text-right font-medium text-sm text-fg tnum">
                          {formatMoney(it.price)}
                        </td>
                        <td className="py-4 text-right font-bold text-sm text-fg tnum">
                          {formatMoney(it.subtotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Summary: Notes on Left, Totals on Right */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 border-t border-line items-start text-xs">
              <div className="space-y-2">
                {q.notes ? (
                  <>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">
                      Condiciones & Términos
                    </span>
                    <p className="text-muted whitespace-pre-line leading-relaxed text-xs">
                      {q.notes}
                    </p>
                  </>
                ) : (
                  <p className="text-muted italic">Gracias por su preferencia.</p>
                )}
              </div>

              <div className="space-y-2.5 sm:text-right">
                <div className="flex justify-between sm:justify-end gap-8 text-xs text-muted">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-fg tnum">{formatMoney(q.subtotal || 0)}</span>
                </div>

                {q.discount_amount > 0 && (
                  <div className="flex justify-between sm:justify-end gap-8 text-xs text-red-500">
                    <span>Descuento:</span>
                    <span className="font-semibold tnum">-{formatMoney(q.discount_amount)}</span>
                  </div>
                )}

                {q.tax_amount > 0 && (
                  <div className="flex justify-between sm:justify-end gap-8 text-xs text-muted">
                    <span>Impuestos ({q.tax_percentage}%):</span>
                    <span className="font-semibold text-fg tnum">{formatMoney(q.tax_amount)}</span>
                  </div>
                )}

                <div className="flex justify-between sm:justify-end gap-8 pt-3 border-t border-line text-base font-bold text-fg">
                  <span className="font-display">Total:</span>
                  <span className="text-xl sm:text-2xl font-display font-extrabold text-accent tnum">
                    {formatMoney(q.total || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Subtle Footer */}
            <div className="pt-6 border-t border-line/60 text-[11px] text-muted flex flex-col sm:flex-row justify-between gap-2">
              <span>Métodos aceptados: Efectivo, Tarjetas de Crédito / Débito, Transferencia Bancaria.</span>
              <span>{config?.restaurant_name || 'Kitch One'} &copy; {new Date().getFullYear()}</span>
            </div>
          </div>

          {/* RIGHT SIDEBAR: ACTION CARD & HISTORY (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card 1: Total & Actions */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-5">
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-muted">Total</span>
                <div className="text-3xl sm:text-4xl font-display font-extrabold text-fg mt-1 tnum">
                  {formatMoney(q.total || 0)}
                </div>
                <p className="text-xs text-muted mt-1">
                  {q.status === 'borrador'
                    ? 'Borrador · No enviada aún al cliente'
                    : q.status === 'enviada'
                    ? 'Enviada al cliente · Pendiente de aprobación'
                    : q.status === 'aprobada'
                    ? 'Aprobada · Lista para facturar en caja'
                    : q.status === 'facturada'
                    ? 'Facturada en caja exitosamente'
                    : 'Rechazada por el cliente'}
                </p>
              </div>

              {/* Primary Action Button */}
              {q.status !== 'facturada' ? (
                <Button
                  variant="acc"
                  size="lg"
                  block
                  leftIcon={<Receipt className="h-5 w-5" />}
                  onClick={() => handleConvertToSale(q)}
                >
                  Facturar en Caja
                </Button>
              ) : (
                <div className="rounded-xl bg-ok/10 border border-ok/20 p-3 text-center text-xs text-ok font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Facturada en Caja
                </div>
              )}

              {/* Secondary Buttons Row */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  leftIcon={<Edit2 className="h-4 w-4" />}
                  onClick={() => handleOpenEdit(q)}
                >
                  Editar
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<Download className="h-4 w-4" />}
                  onClick={() => handlePdfDownload(q)}
                >
                  Descargar PDF
                </Button>
              </div>

              {/* Share via WhatsApp */}
              <Button
                variant="outline"
                block
                leftIcon={<Share2 className="h-4 w-4 text-emerald-500" />}
                onClick={() => handleShareWhatsApp(q)}
              >
                Enviar por WhatsApp
              </Button>

              <Button
                variant="ghost"
                block
                leftIcon={<Printer className="h-4 w-4" />}
                onClick={() => handlePdfPrint(q)}
              >
                Imprimir Documento
              </Button>

              {/* Delete button */}
              <div className="pt-2 border-t border-line text-center">
                <button
                  type="button"
                  onClick={() => handleDelete(q)}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center justify-center gap-1.5 w-full py-1.5 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar cotización
                </button>
              </div>
            </div>

            {/* Card 2: History & Activity */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-fg">Historial</h3>
                <select
                  value={q.status}
                  onChange={(e) => handleStatusChange(q, e.target.value as QuotationStatus)}
                  className="rounded-lg border border-line bg-bg px-2 py-1 text-xs font-semibold text-fg focus:outline-none"
                >
                  <option value="borrador">Borrador</option>
                  <option value="enviada">Enviada</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="facturada">Facturada</option>
                  <option value="rechazada">Rechazada</option>
                </select>
              </div>

              {/* Timeline Steps */}
              <div className="space-y-4 text-xs pt-1">
                <div className="flex items-start gap-3">
                  <span className="h-2.5 w-2.5 rounded-full border-2 border-accent bg-accent/20 mt-1 shrink-0" />
                  <div>
                    <span className="font-bold text-fg block">Creada</span>
                    <span className="text-muted block text-[11px]">{formatDateDisplay(q.created_at)}</span>
                  </div>
                </div>

                {q.status !== 'borrador' && (
                  <div className="flex items-start gap-3">
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-ok bg-ok/20 mt-1 shrink-0" />
                    <div>
                      <span className="font-bold text-fg block capitalize">{q.status}</span>
                      <span className="text-muted block text-[11px]">{formatDateDisplay(q.updated_at)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* DRAWER FOR EDITING (if user clicks edit from within the detail view) */}
        {renderEditDrawer()}
      </div>
    );
  }

  /* =========================================================================
     LIST VIEW (TABLA PRINCIPAL)
  ========================================================================= */
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <PageHeader
        title="Cotizaciones"
        description="Elabora presupuestos elegantes, compártelos en PDF o WhatsApp y factúralos en un clic."
        actions={
          <div className="flex items-center gap-2">
            {isLocalMode && (
              <Button
                variant="ghost"
                leftIcon={<Database className="h-4 w-4 text-amber-500" />}
                onClick={() => setShowSqlModal(true)}
              >
                Modo Local (SQL)
              </Button>
            )}
            <Button
              variant="acc"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenNew}
            >
              Nueva Cotización
            </Button>
          </div>
        }
      />

      {/* Banner if in local mode */}
      {isLocalMode && (
        <div className="flex items-center justify-between gap-3 rounded-panel border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <strong>Almacenamiento Local Activo:</strong> Las cotizaciones se están guardando localmente en tu navegador.
              Para habilitar sincronización en la nube con Supabase, crea las tablas con el script SQL de migración.
            </span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setShowSqlModal(true)}>
            Ver Script SQL
          </Button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Cotizaciones"
          value={stats.totalCount}
          icon={<FileText className="h-5 w-5 text-accent" />}
        />
        <StatCard
          label="Monto Cotizado"
          value={formatMoney(stats.totalAmount)}
          icon={<DollarSign className="h-5 w-5 text-ok" />}
        />
        <StatCard
          label="Aprobadas / Facturadas"
          value={`${stats.approvedCount} (${stats.conversionRate}%)`}
          icon={<CheckCircle2 className="h-5 w-5 text-accent" />}
        />
        <StatCard
          label="Por Aprobar / Vencer"
          value={stats.pendingCount}
          icon={<Clock className="h-5 w-5 text-warn" />}
        />
      </div>

      {/* Filters & Actions Bar */}
      <Panel className="space-y-4 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Tabs items={tabs} value={statusFilter} onChange={setStatusFilter} />
          <div className="flex items-center gap-2">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por cliente, folio o platillo..."
              className="w-full sm:w-72"
            />
          </div>
        </div>
      </Panel>

      {/* Main Table */}
      <Panel className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={filteredQuotations}
          rowKey={(r) => r.id}
          loading={loading}
          onRowClick={(r) => setSelectedQuotation(r)}
          empty={
            <EmptyState
              icon={<FileText className="h-10 w-10 text-muted" />}
              title="No hay cotizaciones registradas"
              description="Crea tu primera cotización para banquetes, eventos o servicios especiales."
              action={
                <Button variant="acc" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenNew}>
                  Crear Cotización
                </Button>
              }
            />
          }
        />
      </Panel>

      {/* Drawer for creating / editing */}
      {renderEditDrawer()}

      {/* Modal: SQL Migration */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-panel border border-line bg-surface p-6 shadow-pop space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-accent" />
                <h3 className="font-display font-bold text-fg">Script SQL para Supabase</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-fg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted">
              Copia y pega este script en el <strong>SQL Editor</strong> de tu proyecto en Supabase para sincronizar
              todas las cotizaciones en la nube con soporte multi-dispositivo y RLS:
            </p>

            <pre className="max-h-60 overflow-y-auto rounded-lg bg-bg p-3 font-mono text-[11px] text-fg border border-line">
{`CREATE SEQUENCE IF NOT EXISTS quotation_number_seq START 1;

CREATE OR REPLACE FUNCTION get_next_quotation_number()
RETURNS text AS $$
DECLARE
  next_val integer;
BEGIN
  SELECT nextval('quotation_number_seq') INTO next_val;
  RETURN 'COT-' || LPAD(next_val::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_address text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  event_date date,
  status text NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador', 'enviada', 'aprobada', 'rechazada', 'facturada')),
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax_percentage numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) NOT NULL DEFAULT 0,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  converted_sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  dish_id uuid REFERENCES dishes(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL DEFAULT 0,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated items" ON quotation_items FOR ALL TO authenticated USING (true) WITH CHECK (true);`}
            </pre>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowSqlModal(false)}>
                Cerrar
              </Button>
              <Button
                variant="acc"
                leftIcon={sqlCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                onClick={copyMigrationSql}
              >
                {sqlCopied ? '¡Copiado!' : 'Copiar Script SQL'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* Helper function to render drawer */
  function renderEditDrawer() {
    return (
      <Drawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        size="xl"
        title={editingQuotation ? `Editar Cotización ${quoteNumber}` : 'Nueva Cotización'}
        eyebrow="Presupuestos y Servicios"
        description="Configura los detalles del cliente, añade platillos del menú o conceptos personalizados."
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-sm">
              <span className="text-muted">Total a cotizar: </span>
              <strong className="text-base text-accent font-bold">{formatMoney(total)}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setShowDrawer(false)}>
                Cancelar
              </Button>
              <Button
                variant="acc"
                loading={saving}
                leftIcon={<Check className="h-4 w-4" />}
                onClick={() => handleSave()}
              >
                Guardar Cotización
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Section 1: Folio y Fechas */}
          <DrawerSection title="1. Datos Generales & Fechas">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Folio / Número</label>
                <input
                  type="text"
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-mono font-bold text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Fecha de Emisión</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Válida Hasta</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Fecha de Evento (Opcional)</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Quick days validity buttons */}
            <div className="flex items-center gap-2 mt-2 pt-1 text-xs text-muted">
              <span>Vigencia rápida:</span>
              <button
                type="button"
                className="rounded border border-line px-2 py-0.5 hover:bg-hover"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 7);
                  setValidUntil(d.toISOString().split('T')[0]);
                }}
              >
                +7 días
              </button>
              <button
                type="button"
                className="rounded border border-line px-2 py-0.5 hover:bg-hover"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 15);
                  setValidUntil(d.toISOString().split('T')[0]);
                }}
              >
                +15 días
              </button>
              <button
                type="button"
                className="rounded border border-line px-2 py-0.5 hover:bg-hover"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 30);
                  setValidUntil(d.toISOString().split('T')[0]);
                }}
              >
                +30 días
              </button>
            </div>
          </DrawerSection>

          {/* Section 2: Datos del Cliente */}
          <DrawerSection title="2. Información del Cliente">
            <div className="space-y-3">
              {customers.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Seleccionar de Clientes Registrados
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
                  >
                    <option value="">-- Cliente nuevo / Manual --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Nombre o Empresa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez o Corporativo ABC"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ej. (809) 555-1234"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="cliente@ejemplo.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Dirección / Lugar del Evento</label>
                  <input
                    type="text"
                    placeholder="Calle, Número, Sector"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </DrawerSection>

          {/* Section 3: Selección de Platillos e Ítems */}
          <DrawerSection title="3. Ítems y Conceptos Cotizados">
            <div className="space-y-4">
              {/* Dish Quick Selector */}
              <div className="rounded-lg border border-line bg-bg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                    <UtensilsCrossed className="h-4 w-4 text-accent" />
                    <span>Agregar Platillos del Menú:</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowCustomAdder(!showCustomAdder)}
                  >
                    {showCustomAdder ? 'Ocultar Concepto Libre' : '+ Concepto Personalizado'}
                  </Button>
                </div>

                <SearchInput
                  value={dishSearch}
                  onChange={setDishSearch}
                  placeholder="Buscar en el menú para agregar..."
                  className="w-full"
                />

                {/* Quick dish chips */}
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1">
                  {filteredDishes.map((dish) => (
                    <button
                      key={dish.id}
                      type="button"
                      onClick={() => handleAddDish(dish)}
                      className="group inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-fg hover:border-accent hover:bg-accent/5 transition-colors"
                    >
                      <span>{dish.name}</span>
                      <span className="font-bold text-accent tnum">{formatMoney(dish.price)}</span>
                      <Plus className="h-3 w-3 text-muted group-hover:text-accent" />
                    </button>
                  ))}
                </div>

                {/* Custom concept creator */}
                {showCustomAdder && (
                  <div className="mt-3 rounded-lg border border-accent/30 bg-surface p-3 space-y-2">
                    <span className="block text-xs font-bold text-accent">
                      Agregar Concepto o Servicio Fuera de Carta (Flete, Alquiler, etc.)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Descripción del concepto"
                          value={customItemName}
                          onChange={(e) => setCustomItemName(e.target.value)}
                          className="w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-fg focus:outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Precio unitario"
                          value={customItemPrice}
                          onChange={(e) => setCustomItemPrice(e.target.value)}
                          className="w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-xs text-fg focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" variant="acc" onClick={handleAddCustomItem}>
                        Agregar Concepto
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Items Table */}
              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line p-6 text-center text-xs text-muted">
                  No has agregado conceptos aún. Selecciona platillos arriba o añade conceptos personalizados.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bg text-muted border-b border-line">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Cant.</th>
                        <th className="py-2.5 px-3 font-semibold">Descripción</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Precio Unit.</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Subtotal</th>
                        <th className="py-2.5 px-2 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-surface">
                      {items.map((it) => (
                        <tr key={it.id} className="hover:bg-hover">
                          <td className="py-2 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className="h-6 w-6 rounded border border-line flex items-center justify-center hover:bg-hover"
                                onClick={() => handleUpdateItemQty(it.id, -1)}
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-bold tnum">{it.quantity}</span>
                              <button
                                type="button"
                                className="h-6 w-6 rounded border border-line flex items-center justify-center hover:bg-hover"
                                onClick={() => handleUpdateItemQty(it.id, 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-fg block">{it.name}</span>
                            <input
                              type="text"
                              placeholder="Nota o especificación opcional..."
                              value={it.description || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setItems(items.map((x) => (x.id === it.id ? { ...x, description: val } : x)));
                              }}
                              className="mt-0.5 w-full bg-transparent text-[11px] text-muted placeholder:text-muted/50 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              value={it.price}
                              onChange={(e) => handleUpdateItemPrice(it.id, parseFloat(e.target.value) || 0)}
                              className="w-20 text-right rounded border border-line bg-bg px-1.5 py-1 text-xs text-fg focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-fg tnum">
                            {formatMoney(it.subtotal)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </DrawerSection>

          {/* Section 4: Totales y Descuentos */}
          <DrawerSection title="4. Resumen Financiero">
            <div className="rounded-lg border border-line bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Subtotal:</span>
                <span className="font-semibold text-fg tnum">{formatMoney(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Descuento Global:</span>
                <div className="flex items-center gap-1">
                  <span className="text-muted">-</span>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-24 text-right rounded border border-line bg-bg px-2 py-1 text-xs text-fg focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-line">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyTax}
                    onChange={(e) => setApplyTax(e.target.checked)}
                    className="rounded border-line text-accent focus:ring-accent"
                  />
                  <span>Aplicar Impuesto / ITBIS ({taxPercentage}%)</span>
                </label>
                <span className="font-semibold text-fg tnum">{formatMoney(taxAmount)}</span>
              </div>

              <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-line">
                <span className="text-fg">TOTAL NETO:</span>
                <span className="text-xl font-display font-bold text-accent tnum">{formatMoney(total)}</span>
              </div>
            </div>
          </DrawerSection>

          {/* Section 5: Términos y Condiciones */}
          <DrawerSection title="5. Notas & Términos y Condiciones">
            <div className="space-y-2">
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Condiciones de pago, políticas de anticipo, vigencia..."
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg focus:border-accent focus:outline-none"
              />
            </div>
          </DrawerSection>
        </div>
      </Drawer>
    );
  }
}
