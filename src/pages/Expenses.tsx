import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useToast } from '../components/ui/Toast';
import {
  PageHeader,
  Button,
  StatCard,
  Panel,
  Tag,
  Drawer,
  SearchInput,
  DataTable,
  type Column,
  EmptyState,
} from '../components/ui';
import {
  Plus,
  DollarSign,
  TrendingDown,
  Receipt,
  PieChart,
  Calendar,
} from 'lucide-react';

interface Expense {
  id: string;
  concept: string;
  amount: number;
  date: string;
  category: string | null;
  notes: string | null;
  created_at: string;
}

const CATEGORIES = [
  'Alimentos',
  'Bebidas',
  'Insumos',
  'Mantenimiento',
  'Personal',
  'Servicios',
  'Otros',
];

export default function Expenses() {
  const { user } = useAuth();
  const { formatMoney } = useConfig();
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [formData, setFormData] = useState({
    concept: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    notes: '',
  });

  const loadExpenses = async () => {
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (dateFilter) {
        query = query.eq('date', dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data) setExpenses(data);
    } catch (error: any) {
      toast({ title: 'Error al cargar gastos', message: error.message, tone: 'bad' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [dateFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Monto inválido', message: 'Ingresa un monto numérico positivo', tone: 'warn' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('expenses').insert({
        concept: formData.concept.trim(),
        amount: amountNum,
        date: formData.date,
        category: formData.category || null,
        notes: formData.notes?.trim() || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: 'Gasto registrado',
        message: `${formData.concept} — ${formatMoney(amountNum)}`,
        tone: 'ok',
      });

      setShowDrawer(false);
      setFormData({
        concept: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: '',
        notes: '',
      });
      loadExpenses();
    } catch (error: any) {
      toast({ title: 'Error al guardar gasto', message: error.message, tone: 'bad' });
    } finally {
      setSaving(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return expenses;
    return expenses.filter(
      (exp) =>
        exp.concept.toLowerCase().includes(term) ||
        (exp.category && exp.category.toLowerCase().includes(term)) ||
        (exp.notes && exp.notes.toLowerCase().includes(term))
    );
  }, [expenses, searchTerm]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }, [filteredExpenses]);

  const averageAmount = useMemo(() => {
    if (filteredExpenses.length === 0) return 0;
    return totalAmount / filteredExpenses.length;
  }, [totalAmount, filteredExpenses.length]);

  const topCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const exp of filteredExpenses) {
      const cat = exp.category || 'Otros';
      map[cat] = (map[cat] || 0) + exp.amount;
    }
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return entries[0] ? `${entries[0][0]} (${formatMoney(entries[0][1])})` : 'Ninguna';
  }, [filteredExpenses, formatMoney]);

  const columns: Column<Expense>[] = [
    {
      key: 'date',
      header: 'Fecha',
      sortValue: (r: Expense) => r.date,
      cell: (r: Expense) => (
        <span className="text-xs font-mono tabular-nums text-fg">
          {new Date(r.date + 'T00:00:00').toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'concept',
      header: 'Concepto',
      sortValue: (r: Expense) => r.concept,
      cell: (r: Expense) => (
        <div className="flex flex-col">
          <span className="font-semibold text-ink dark:text-line">{r.concept}</span>
          {r.notes && (
            <span className="text-xs text-muted truncate max-w-sm">{r.notes}</span>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoría',
      cell: (r: Expense) => (
        <Tag tone={r.category === 'Alimentos' ? 'accent' : 'neutral'}>
          {r.category || 'Sin categoría'}
        </Tag>
      ),
    },
    {
      key: 'amount',
      header: 'Monto',
      align: 'right',
      sortValue: (r: Expense) => r.amount,
      cell: (r: Expense) => (
        <span className="font-bold tabular-nums text-bad">
          -{formatMoney(r.amount)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gastos y Egresos"
        description="Control de salidas de dinero, compras de insumos y costos operativos"
        actions={
          <Button
            variant="pri"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowDrawer(true)}
          >
            Nuevo Gasto
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de Gastos"
          value={formatMoney(totalAmount)}
          icon={<TrendingDown className="h-5 w-5 text-bad" />}
          tone="bad"
        />
        <StatCard
          label="Transacciones"
          value={filteredExpenses.length}
          icon={<Receipt className="h-5 w-5 text-muted" />}
        />
        <StatCard
          label="Gasto Promedio"
          value={formatMoney(averageAmount)}
          icon={<DollarSign className="h-5 w-5 text-muted" />}
        />
        <StatCard
          label="Mayor Categoría"
          value={topCategory}
          icon={<PieChart className="h-5 w-5 text-accent" />}
          tone="accent"
        />
      </div>

      {/* Panel con Filtros y Tabla */}
      <Panel
        title="Historial de Gastos"
        description={`${filteredExpenses.length} egresos encontrados`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-64">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar por concepto o notas..."
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-4 w-4 text-muted" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="field py-1.5 text-xs w-36"
                title="Filtrar por fecha específica"
              />
              {dateFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateFilter('')}
                >
                  Limpiar fecha
                </Button>
              )}
            </div>
          </div>
        }
      >
        <DataTable<Expense>
          columns={columns}
          rows={filteredExpenses}
          rowKey={(r) => r.id}
          loading={loading}
          pageSize={10}
          empty={
            <EmptyState
              icon={<Receipt className="h-10 w-10 text-muted" />}
              title={searchTerm || dateFilter ? 'Sin gastos coincidentes' : 'No hay gastos registrados'}
              description={
                searchTerm || dateFilter
                  ? 'Intenta modificando los filtros de búsqueda o fecha.'
                  : 'Registra los gastos diarios del restaurante para mantener el control contable.'
              }
              action={
                searchTerm || dateFilter ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setDateFilter('');
                    }}
                  >
                    Restablecer filtros
                  </Button>
                ) : (
                  <Button
                    variant="pri"
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => setShowDrawer(true)}
                  >
                    Registrar primer gasto
                  </Button>
                )
              }
            />
          }
        />
      </Panel>

      {/* Drawer: Nuevo Gasto */}
      <Drawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        title="Nuevo Gasto"
        description="Registra un egreso de caja o pago a proveedores"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => setShowDrawer(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="pri"
              loading={saving}
              onClick={(e) => handleSubmit(e)}
            >
              Guardar Gasto
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Concepto del Gasto *
            </label>
            <input
              type="text"
              required
              value={formData.concept}
              onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
              placeholder="Ej. Compra de vegetales, Pago de gas, etc."
              className="field"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Monto *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Fecha *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="field"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Categoría
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="field"
            >
              <option value="">Sin categoría</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Observaciones / Comprobante
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Detalles adicionales, proveedor o número de factura de compra..."
              className="field resize-none"
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
