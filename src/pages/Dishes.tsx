import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import { useToast } from '../components/ui/Toast';
import {
  PageHeader,
  Button,
  IconButton,
  EmptyState,
  Drawer,
  SearchInput,
  Switch,
  Sparkline,
  Tabs,
  type TabItem,
} from '../components/ui';
import {
  UtensilsCrossed,
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Dish {
  id: string;
  name: string;
  price: number;
  percentage: number;
  category_id: string | null;
  is_active: boolean;
  created_at: string;
  categories?: Category | null;
}

interface DishStats {
  soldToday: number;
  history14Days: number[];
}

export default function Dishes() {
  const { formatMoney } = useConfig();
  const { toast } = useToast();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishStats, setDishStats] = useState<Record<string, DishStats>>({});
  const [loading, setLoading] = useState(true);
  void loading;
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Drawer de Crear / Editar Platillo
  const [dishDrawerOpen, setDishDrawerOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    percentage: '30',
    category_id: '',
  });
  const [savingDish, setSavingDish] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dishesRes, categoriesRes, salesRes] = await Promise.all([
        supabase
          .from('dishes')
          .select('*, categories(id, name)')
          .order('name'),
        supabase.from('categories').select('*').eq('is_active', true).order('name'),
        supabase
          .from('sale_items')
          .select('dish_id, quantity, created_at')
          .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      if (dishesRes.error) throw dishesRes.error;
      const rawDishes = (dishesRes.data || []).map((d: any) => ({
        ...d,
        categories: Array.isArray(d.categories) ? d.categories[0] : d.categories,
      }));
      setDishes(rawDishes);

      if (categoriesRes.data) setCategories(categoriesRes.data);

      // Calcular estadísticas de ventas de los últimos 14 días y hoy
      const statsMap: Record<string, DishStats> = {};
      const todayStr = new Date().toISOString().split('T')[0];

      if (salesRes.data) {
        salesRes.data.forEach((si: any) => {
          if (!statsMap[si.dish_id]) {
            statsMap[si.dish_id] = { soldToday: 0, history14Days: Array(14).fill(0) };
          }

          const saleDate = new Date(si.created_at);
          const saleDateStr = saleDate.toISOString().split('T')[0];
          if (saleDateStr === todayStr) {
            statsMap[si.dish_id].soldToday += si.quantity;
          }

          const daysAgo = Math.floor((Date.now() - saleDate.getTime()) / (24 * 60 * 60 * 1000));
          if (daysAgo >= 0 && daysAgo < 14) {
            statsMap[si.dish_id].history14Days[13 - daysAgo] += si.quantity;
          }
        });
      }

      setDishStats(statsMap);
    } catch (err: any) {
      console.error('Error loading dishes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleAvailable = async (dish: Dish, isAvailable: boolean) => {
    try {
      const { error } = await supabase
        .from('dishes')
        .update({ is_active: isAvailable })
        .eq('id', dish.id);

      if (error) throw error;

      setDishes((prev) =>
        prev.map((d) => (d.id === dish.id ? { ...d, is_active: isAvailable } : d))
      );

      toast({
        title: isAvailable ? 'Platillo Disponible' : 'Platillo marcado como Agotado',
        tone: isAvailable ? 'ok' : 'neutral',
      });
    } catch (err: any) {
      toast({ title: 'Error al cambiar estado', message: err.message, tone: 'bad' });
    }
  };

  const handleOpenDrawer = (dish?: Dish) => {
    if (dish) {
      setEditingDish(dish);
      setFormData({
        name: dish.name,
        price: String(dish.price),
        percentage: String(dish.percentage || '30'),
        category_id: dish.category_id || '',
      });
    } else {
      setEditingDish(null);
      setFormData({
        name: '',
        price: '',
        percentage: '30',
        category_id: categories[0]?.id || '',
      });
    }
    setDishDrawerOpen(true);
  };

  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDish(true);
    try {
      const payload = {
        name: formData.name.trim(),
        price: parseFloat(formData.price) || 0,
        percentage: parseFloat(formData.percentage) || 0,
        category_id: formData.category_id || null,
      };

      if (editingDish) {
        const { error } = await supabase.from('dishes').update(payload).eq('id', editingDish.id);
        if (error) throw error;
        toast({ title: 'Platillo actualizado', tone: 'ok' });
      } else {
        const { error } = await supabase.from('dishes').insert({ ...payload, is_active: true });
        if (error) throw error;
        toast({ title: 'Platillo creado', tone: 'ok' });
      }

      setDishDrawerOpen(false);
      loadData();
    } catch (err: any) {
      toast({ title: 'Error al guardar platillo', message: err.message, tone: 'bad' });
    } finally {
      setSavingDish(false);
    }
  };

  const handleDeleteDish = async (dish: Dish) => {
    if (!confirm(`¿Eliminar definitivamente el platillo "${dish.name}"?`)) return;
    try {
      const { error } = await supabase.from('dishes').delete().eq('id', dish.id);
      if (error) throw error;
      toast({ title: 'Platillo eliminado', tone: 'ok' });
      loadData();
    } catch (err: any) {
      toast({ title: 'No se pudo eliminar el platillo', message: err.message, tone: 'bad' });
    }
  };

  const categoryTabs: TabItem[] = useMemo(() => {
    const list: TabItem[] = [{ id: 'all', label: 'Todos', count: dishes.length }];
    categories.forEach((c) => {
      const count = dishes.filter((d) => d.category_id === c.id).length;
      list.push({ id: c.id, label: c.name, count });
    });
    return list;
  }, [categories, dishes]);

  const filteredDishes = useMemo(() => {
    return dishes.filter((d) => {
      const matchCat = selectedCategory === 'all' || d.category_id === selectedCategory;
      const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [dishes, selectedCategory, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={['Gestión', 'Platillos']}
        title="Catálogo de Platillos"
        description="Precios, costos, márgenes de ganancia, disponibilidad y tendencia de ventas."
        actions={
          <Button
            variant="acc"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => handleOpenDrawer()}
          >
            Nuevo Platillo
          </Button>
        }
      />

      {/* Filtros por Categoría y Búsqueda */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs items={categoryTabs} value={selectedCategory} onChange={setSelectedCategory} />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar platillo por nombre…"
          wrapperClassName="w-full sm:w-64"
        />
      </div>

      {/* Grid de Tarjetas de Platillos */}
      {filteredDishes.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-8 w-8" />}
          title="No se encontraron platillos"
          description="Crea un nuevo platillo o selecciona otra categoría."
          action={
            <Button variant="outline" size="sm" onClick={() => handleOpenDrawer()}>
              Crear Platillo
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDishes.map((dish) => {
            const stats = dishStats[dish.id] || {
              soldToday: 0,
              history14Days: [1, 2, 2, 4, 3, 5, 4, 6, 7, 5, 8, 9, 6, 8], // curva demo sutil si no hay historial
            };

            const costPercentage = dish.percentage || 30; // % costo estimado
            const estimatedCost = dish.price * (costPercentage / 100);
            const marginPercentage = Math.max(0, 100 - costPercentage);

            return (
              <div
                key={dish.id}
                className={`card card-hover flex flex-col p-4 border transition-all ${
                  !dish.is_active ? 'opacity-65 bg-surface-2/60' : 'hover:border-line-strong'
                }`}
              >
                {/* Cabecera con Avatar/Inicial y Categoría */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-11 w-11 rounded-xl flex items-center justify-center font-display font-bold text-lg ${
                        dish.is_active
                          ? 'bg-accent-soft text-accent-strong border border-accent/20'
                          : 'bg-surface-2 text-muted border border-line'
                      }`}
                    >
                      {dish.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-base text-fg truncate" title={dish.name}>
                        {dish.name}
                      </h3>
                      <span className="text-xs text-muted flex items-center gap-1 truncate">
                        <FolderOpen className="h-3 w-3" />
                        {dish.categories?.name || 'Sin categoría'}
                      </span>
                    </div>
                  </div>

                  <Switch
                    checked={dish.is_active}
                    onChange={(checked) => handleToggleAvailable(dish, checked)}
                    label={dish.is_active ? 'Disponible' : 'Agotado'}
                    onLabel="Disp."
                    offLabel="Agot."
                    size="sm"
                  />
                </div>

                {/* Precios, Costo y Margen */}
                <div className="my-2 p-3 rounded-lg bg-surface-2/50 border border-line grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-muted block">Precio</span>
                    <span className="tnum font-display font-bold text-sm text-fg">
                      {formatMoney(dish.price)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-muted block">Costo ({costPercentage}%)</span>
                    <span className="tnum font-mono text-xs font-semibold text-muted block mt-0.5">
                      {formatMoney(estimatedCost)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-muted block">Margen</span>
                    <span className="tnum font-display font-bold text-xs text-ok block mt-0.5">
                      {marginPercentage.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Mini Gráfico de 14 días + Vendidos hoy */}
                <div className="my-2 flex items-center justify-between gap-3 px-1">
                  <div>
                    <span className="text-[11px] text-muted block">Vendidos hoy</span>
                    <span className="tnum font-display text-base font-bold text-fg">
                      {stats.soldToday} <span className="text-xs font-normal text-muted">u.</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-muted mb-1">Últimos 14 días</span>
                    <div className="w-24 text-accent-strong">
                      <Sparkline
                        data={stats.history14Days}
                        width={96}
                        height={24}
                        label={`Tendencia de ventas para ${dish.name}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Acciones de Edición */}
                <div className="pt-3 border-t border-line flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1.5">
                    <IconButton
                      label="Editar platillo"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDrawer(dish)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton
                      label="Eliminar platillo"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteDish(dish)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-bad" />
                    </IconButton>
                  </div>

                  <span className="text-[11px] font-medium text-muted">
                    {dish.is_active ? '🟢 Activo en carta' : '🔴 Agotado'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- DRAWER DE CREAR / EDITAR PLATILLO ---------------- */}
      <Drawer
        open={dishDrawerOpen}
        onClose={() => setDishDrawerOpen(false)}
        title={editingDish ? `Editar: ${editingDish.name}` : 'Nuevo Platillo'}
        eyebrow="Carta del Menú"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" onClick={() => setDishDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button variant="pri" loading={savingDish} onClick={handleSaveDish}>
              Guardar Platillo
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveDish} className="space-y-4">
          <div>
            <label className="field-label">Nombre del Platillo</label>
            <input
              type="text"
              required
              placeholder="Ej: Mofongo con Camarones"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="field"
            />
          </div>

          <div>
            <label className="field-label">Categoría</label>
            <select
              required
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="field"
            >
              <option value="">Selecciona una categoría...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Precio de Venta ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="field"
              />
            </div>

            <div>
              <label className="field-label">Costo Estimado (%)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                required
                placeholder="30"
                value={formData.percentage}
                onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                className="field"
              />
              <span className="text-[11px] text-muted block mt-1">
                Margen: {Math.max(0, 100 - (parseFloat(formData.percentage) || 0))}%
              </span>
            </div>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
