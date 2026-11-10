import { supabase } from './supabase';

export type QuotationStatus = 'borrador' | 'enviada' | 'aprobada' | 'rechazada' | 'facturada';

export interface QuotationItem {
  id: string;
  dish_id?: string | null;
  name: string;
  description?: string | null;
  quantity: number;
  price: number;
  discount_percent?: number;
  subtotal: number;
}

export interface Quotation {
  id: string;
  quote_number: string;
  customer_id?: string | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  date: string; // YYYY-MM-DD
  valid_until?: string | null;
  event_date?: string | null;
  status: QuotationStatus;
  items: QuotationItem[];
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  notes?: string | null;
  converted_sale_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

const LOCAL_STORAGE_KEY = 'kitchone:quotations';

export const QUOTATION_STATUS_META: Record<
  QuotationStatus,
  { label: string; tone: 'neutral' | 'info' | 'ok' | 'bad' | 'accent' }
> = {
  borrador: { label: 'Borrador', tone: 'neutral' },
  enviada: { label: 'Enviada', tone: 'info' },
  aprobada: { label: 'Aprobada', tone: 'ok' },
  facturada: { label: 'Facturada', tone: 'accent' },
  rechazada: { label: 'Rechazada', tone: 'bad' },
};

function getLocalQuotations(): Quotation[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return (parsed || []).map((q: any) => ({
      ...q,
      items: Array.isArray(q.items) ? q.items : [],
      subtotal: Number(q.subtotal || 0),
      total: Number(q.total || 0),
      tax_amount: Number(q.tax_amount || 0),
      tax_percentage: Number(q.tax_percentage || 0),
      discount_amount: Number(q.discount_amount || 0),
    }));
  } catch (err) {
    console.error('Error reading quotations from localStorage:', err);
    return [];
  }
}

function saveLocalQuotations(list: Quotation[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error saving quotations to localStorage:', err);
  }
}

let cachedSupabaseAvailable: boolean | null = null;

export async function checkSupabaseQuotationsAvailable(): Promise<boolean> {
  if (cachedSupabaseAvailable !== null) return cachedSupabaseAvailable;
  try {
    const { error } = await supabase.from('quotations').select('id').limit(1);
    if (error) {
      cachedSupabaseAvailable = false;
      return false;
    }
    cachedSupabaseAvailable = true;
    return true;
  } catch {
    cachedSupabaseAvailable = false;
    return false;
  }
}

export async function fetchQuotations(): Promise<{ data: Quotation[]; isLocal: boolean }> {
  const isAvailable = await checkSupabaseQuotationsAvailable();

  if (!isAvailable) {
    return { data: getLocalQuotations(), isLocal: true };
  }

  try {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        quotation_items (
          id,
          dish_id,
          name,
          description,
          quantity,
          price,
          discount_percent,
          subtotal
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped: Quotation[] = (data || []).map((q: any) => ({
      id: q.id,
      quote_number: q.quote_number,
      customer_id: q.customer_id,
      customer_name: q.customer_name,
      customer_email: q.customer_email,
      customer_phone: q.customer_phone,
      customer_address: q.customer_address,
      date: q.date,
      valid_until: q.valid_until,
      event_date: q.event_date,
      status: q.status as QuotationStatus,
      subtotal: Number(q.subtotal || 0),
      tax_percentage: Number(q.tax_percentage || 0),
      tax_amount: Number(q.tax_amount || 0),
      discount_amount: Number(q.discount_amount || 0),
      total: Number(q.total || 0),
      notes: q.notes,
      converted_sale_id: q.converted_sale_id,
      created_by: q.created_by,
      created_at: q.created_at,
      updated_at: q.updated_at,
      items: (q.quotation_items || []).map((it: any) => ({
        id: it.id,
        dish_id: it.dish_id,
        name: it.name,
        description: it.description,
        quantity: Number(it.quantity || 1),
        price: Number(it.price || 0),
        discount_percent: Number(it.discount_percent || 0),
        subtotal: Number(it.subtotal || 0),
      })),
    }));

    return { data: mapped, isLocal: false };
  } catch (err) {
    console.warn('Falling back to local quotations due to error:', err);
    return { data: getLocalQuotations(), isLocal: true };
  }
}

export async function getNextQuoteNumber(existingLocal: Quotation[] = []): Promise<string> {
  const isAvailable = await checkSupabaseQuotationsAvailable();
  if (isAvailable) {
    try {
      const { data, error } = await supabase.rpc('get_next_quotation_number');
      if (!error && data) return data as string;
    } catch {
      // Fallback below
    }
  }

  // Local fallback: COT-0001 based on length/highest number
  const list = existingLocal.length ? existingLocal : getLocalQuotations();
  const maxNumber = list.reduce((max, q) => {
    const match = q.quote_number.match(/COT-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      return Math.max(max, isNaN(num) ? 0 : num);
    }
    return max;
  }, 0);

  const next = maxNumber + 1;
  return `COT-${String(next).padStart(4, '0')}`;
}

export async function saveQuotation(
  quotation: Quotation,
  userId?: string | null
): Promise<{ data: Quotation; isLocal: boolean }> {
  const isAvailable = await checkSupabaseQuotationsAvailable();
  const now = new Date().toISOString();

  if (!isAvailable) {
    const localList = getLocalQuotations();
    const idx = localList.findIndex((q) => q.id === quotation.id);
    const updatedQuote: Quotation = {
      ...quotation,
      updated_at: now,
      created_at: quotation.created_at || now,
    };

    if (idx >= 0) {
      localList[idx] = updatedQuote;
    } else {
      localList.unshift(updatedQuote);
    }
    saveLocalQuotations(localList);
    return { data: updatedQuote, isLocal: true };
  }

  // Supabase upsert
  try {
    const quotePayload: any = {
      quote_number: quotation.quote_number,
      customer_id: quotation.customer_id || null,
      customer_name: quotation.customer_name,
      customer_email: quotation.customer_email || null,
      customer_phone: quotation.customer_phone || null,
      customer_address: quotation.customer_address || null,
      date: quotation.date,
      valid_until: quotation.valid_until || null,
      event_date: quotation.event_date || null,
      status: quotation.status,
      subtotal: quotation.subtotal,
      tax_percentage: quotation.tax_percentage,
      tax_amount: quotation.tax_amount,
      discount_amount: quotation.discount_amount,
      total: quotation.total,
      notes: quotation.notes || null,
      converted_sale_id: quotation.converted_sale_id || null,
      updated_at: now,
    };

    let quoteId = quotation.id;
    const isNew = !quoteId || quoteId.startsWith('temp-');

    if (isNew) {
      quotePayload.created_by = userId || null;
      const { data, error } = await supabase
        .from('quotations')
        .insert(quotePayload)
        .select()
        .single();
      if (error) throw error;
      quoteId = (data as any).id;
    } else {
      const { error } = await supabase
        .from('quotations')
        .update(quotePayload)
        .eq('id', quoteId);
      if (error) throw error;

      // Delete existing items to replace with updated ones
      await supabase.from('quotation_items').delete().eq('quotation_id', quoteId);
    }

    // Insert items
    if (quotation.items && quotation.items.length > 0) {
      const itemsToInsert = quotation.items.map((it) => ({
        quotation_id: quoteId,
        dish_id: it.dish_id || null,
        name: it.name,
        description: it.description || null,
        quantity: it.quantity,
        price: it.price,
        discount_percent: it.discount_percent || 0,
        subtotal: it.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(itemsToInsert);
      if (itemsError) throw itemsError;
    }

    const saved: Quotation = {
      ...quotation,
      id: quoteId,
      updated_at: now,
    };

    return { data: saved, isLocal: false };
  } catch (err) {
    console.warn('Supabase save error, falling back to local:', err);
    const localList = getLocalQuotations();
    const idx = localList.findIndex((q) => q.id === quotation.id);
    if (idx >= 0) localList[idx] = quotation;
    else localList.unshift(quotation);
    saveLocalQuotations(localList);
    return { data: quotation, isLocal: true };
  }
}

export async function deleteQuotation(id: string): Promise<{ success: boolean; isLocal: boolean }> {
  const isAvailable = await checkSupabaseQuotationsAvailable();

  // Always remove from local
  const localList = getLocalQuotations().filter((q) => q.id !== id);
  saveLocalQuotations(localList);

  if (isAvailable) {
    try {
      const { error } = await supabase.from('quotations').delete().eq('id', id);
      if (error) throw error;
      return { success: true, isLocal: false };
    } catch (err) {
      console.warn('Error deleting quotation from Supabase:', err);
      return { success: true, isLocal: true };
    }
  }

  return { success: true, isLocal: true };
}

export async function updateQuotationStatus(
  id: string,
  status: QuotationStatus,
  convertedSaleId?: string
): Promise<void> {
  const isAvailable = await checkSupabaseQuotationsAvailable();

  // Local update
  const localList = getLocalQuotations();
  const idx = localList.findIndex((q) => q.id === id);
  if (idx >= 0) {
    localList[idx].status = status;
    if (convertedSaleId) localList[idx].converted_sale_id = convertedSaleId;
    localList[idx].updated_at = new Date().toISOString();
    saveLocalQuotations(localList);
  }

  if (isAvailable) {
    try {
      const payload: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (convertedSaleId) payload.converted_sale_id = convertedSaleId;

      await supabase.from('quotations').update(payload).eq('id', id);
    } catch (err) {
      console.warn('Error updating status in Supabase:', err);
    }
  }
}
