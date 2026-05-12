import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Package, AlertCircle } from 'lucide-react';
import api from '../services/supabase-api';

interface Category {
  id: number;
  name: string;
  description: string;
  active: number;
  product_count?: number;
}

interface CategoryFormData {
  name: string;
  description: string;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState<Partial<CategoryFormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);

  // Cargar categorías
  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await api.getCategories();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Filtrar categorías
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Validar formulario
  const validateForm = () => {
    const newErrors: Partial<CategoryFormData> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    if (formData.description.trim().length > 200) {
      newErrors.description = 'La descripción no puede exceder 200 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar cambios en el formulario
  const handleInputChange = (field: keyof CategoryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Abrir formulario para crear nueva categoría
  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
    setErrors({});
    setShowForm(true);
  };

  // Abrir formulario para editar categoría
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || ''
    });
    setErrors({});
    setShowForm(true);
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (editingCategory) {
        // Actualizar categoría existente
        const response = await api.updateCategory(String(editingCategory.id), formData);
        if (response.success) {
          setCategories(prev => prev.map(cat => 
            cat.id === editingCategory.id 
              ? { ...cat, ...formData }
              : cat
          ));
          setShowForm(false);
        } else {
          alert(response.message || 'Error al actualizar la categoría');
        }
      } else {
        // Crear nueva categoría
        const response = await api.createCategory(formData);
        if (response.success) {
          setCategories(prev => [...prev, response.data]);
          setShowForm(false);
        } else {
          alert(response.message || 'Error al crear la categoría');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar categoría
  const handleDelete = async (category: Category) => {
    try {
      const response = await api.deleteCategory(String(category.id));
      if (response.success) {
        setCategories(prev => prev.filter(cat => cat.id !== category.id));
        setDeleteConfirm(null);
      } else {
        alert(response.message || 'Error al eliminar la categoría');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar la categoría');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Gestión de Categorías
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Administra las categorías de productos de tu negocio
        </p>
      </div>

      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar categorías..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nueva Categoría
        </button>
      </div>

      {/* Lista de Categorías */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.map((category) => (
          <div
            key={category.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {category.name}
                  </h3>
                  {category.product_count !== undefined && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {category.product_count} productos
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(category)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(category)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {category.description && (
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {category.description}
              </p>
            )}

            <div className="flex items-center justify-between">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                category.active 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {category.active ? 'Activa' : 'Inactiva'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm ? 'No se encontraron categorías' : 'No hay categorías'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm 
              ? 'Intenta con otros términos de búsqueda'
              : 'Comienza creando tu primera categoría'
            }
          </p>
        </div>
      )}

      {/* Modal de Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Nombre de la categoría"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Descripción opcional"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                >
                  {submitting ? 'Guardando...' : (editingCategory ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirmar Eliminación
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              ¿Estás seguro de que quieres eliminar la categoría "{deleteConfirm.name}"? 
              Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 