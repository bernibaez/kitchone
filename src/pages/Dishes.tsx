import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import { useNotification } from '../contexts/NotificationContext';
import { Plus, Pencil, Search, X, Trash2, Utensils, Tag, DollarSign, Percent } from 'lucide-react';

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
  categories?: Category;
}

export default function Dishes() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    percentage: '',
    category_id: '',
  });
  const { showNotification } = useNotification();
  const { formatMoney } = useConfig();

  useEffect(() => {
    loadDishes();
    loadCategories();
  }, []);

  const loadDishes = async () => {
    try {
      const { data } = await supabase
        .from('dishes')
        .select('*, categories(id, name)')
        .order('created_at', { ascending: false });

      if (data) setDishes(data);
    } catch (error) {
      console.error('Error loading dishes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (data) setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dishData = {
        name: formData.name,
        price: parseFloat(formData.price),
        percentage: parseFloat(formData.percentage || '0'),
        category_id: formData.category_id || null,
      };

      if (editingDish) {
        await supabase
          .from('dishes')
          .update(dishData)
          .eq('id', editingDish.id);
      } else {
        await supabase.from('dishes').insert(dishData);
      }

      showNotification({
        type: 'success',
        title: editingDish ? 'Platillo actualizado' : 'Platillo creado',
        message: editingDish
          ? 'El platillo se actualizó correctamente.'
          : 'El platillo se creó correctamente.',
      });
      setShowModal(false);
      setEditingDish(null);
      setFormData({ name: '', price: '', percentage: '', category_id: '' });
      loadDishes();
    } catch (error) {
      console.error('Error saving dish:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Error al guardar platillo',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (dish: Dish) => {
    setEditingDish(dish);
    setFormData({
      name: dish.name,
      price: dish.price.toString(),
      percentage: dish.percentage.toString(),
      category_id: dish.category_id || '',
    });
    setShowModal(true);
  };

  const handleToggleActive = async (dish: Dish) => {
    try {
      await supabase
        .from('dishes')
        .update({ is_active: !dish.is_active })
        .eq('id', dish.id);
      loadDishes();
    } catch (error) {
      console.error('Error toggling dish status:', error);
    }
  };

  const handleDelete = async (dish: Dish) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el platillo "${dish.name}"?`)) {
      return;
    }

    try {
      await supabase
        .from('dishes')
        .delete()
        .eq('id', dish.id);
      loadDishes();
    } catch (error) {
      console.error('Error deleting dish:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Error al eliminar platillo',
      });
    }
  };

  const filteredDishes = dishes.filter(dish => {
    const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || dish.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (categoryName: string | undefined) => {
    if (!categoryName) return { bg: 'bg-gray-100', text: 'text-gray-600' };

    const name = categoryName.toLowerCase();
    if (name.includes('entrada') || name.includes('appetizer')) {
      return { bg: 'bg-orange-100', text: 'text-orange-700' };
    } else if (name.includes('plato') || name.includes('fuerte') || name.includes('main')) {
      return { bg: 'bg-pink-100', text: 'text-pink-700' };
    } else if (name.includes('postre') || name.includes('dessert')) {
      return { bg: 'bg-purple-100', text: 'text-purple-700' };
    }
    return { bg: 'bg-gray-100', text: 'text-gray-600' };
  };

  if (loading && dishes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventario de Platillos</h1>
          <p className="text-gray-500">Gestiona el catálogo de platillos del restaurante</p>
        </div>
        <button
          onClick={() => {
            setEditingDish(null);
            setFormData({ name: '', price: '', percentage: '', category_id: '' });
            setShowModal(true);
          }}
          className="bg-orange-500 text-white px-5 py-2.5 rounded-lg hover:bg-orange-600 flex items-center space-x-2 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Platillo</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar items-center">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${selectedCategory === ''
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${selectedCategory === cat.id
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Dishes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDishes.map((dish) => {
          const categoryColors = getCategoryColor(dish.categories?.name);
          return (
            <div
              key={dish.id}
              className={`group bg-white rounded-2xl shadow-sm border transition-all hover:shadow-lg relative overflow-hidden flex flex-col ${dish.is_active ? 'border-gray-100' : 'border-gray-100 bg-gray-50/50 grayscale-[0.5]'
                }`}
            >
              {/* Image Placeholder / Icon */}
              <div className={`h-32 w-full flex items-center justify-center relative ${categoryColors.bg}`}>
                <div className={`w-16 h-16 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center shadow-sm ${categoryColors.text}`}>
                  <Utensils className="w-8 h-8" />
                </div>

                {/* Category Tag */}
                <span className="absolute top-3 right-3 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/90 shadow-sm text-gray-700 backdrop-blur-sm">
                  {dish.categories?.name || 'General'}
                </span>
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors">
                    {dish.name}
                  </h3>
                  {/* Toggle Small */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleActive(dish); }}
                    className={`w-8 h-5 rounded-full p-0.5 transition-colors shrink-0 ${dish.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${dish.is_active ? 'translate-x-3' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="mt-auto pt-4 flex items-end justify-between border-t border-gray-50">
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-0.5">Precio</p>
                    <div className="mb-4">
                      <p className="text-xl font-bold text-gray-900">
                        {formatMoney(dish.price)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(dish)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors border border-transparent hover:border-orange-100"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(dish)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingDish ? 'Editar Platillo' : 'Nuevo Platillo'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Platillo
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-400" />
                  Categoría
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category_id: cat.id })}
                      className={`px-3 py-2 rounded-lg text-sm border text-left transition-colors flex items-center justify-between ${formData.category_id === cat.id
                        ? 'bg-orange-50 border-orange-500 text-orange-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      {cat.name}
                      {formData.category_id === cat.id && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent pl-8"
                      required
                    />
                    <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Impuesto
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.percentage}
                      onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent pl-8"
                    />
                    <Percent className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
