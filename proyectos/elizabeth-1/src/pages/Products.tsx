import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { useApp } from '../contexts/AppContext';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  Grid3X3,
  List,
} from 'lucide-react';
import ProductsTable from '../components/Products/ProductsTable';
import Pagination from '../components/Products/Pagination';
import DeleteConfirmModal from '../components/Products/DeleteConfirmModal';
import ProductForm, { ProductFormData } from '../components/Products/ProductForm';
import api from '../services/supabase-api';

type SortField = 'name' | 'category' | 'price' | 'stock' | 'code';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'grid' | 'table';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export default function Products() {
  const { state, createProduct, updateProduct, deleteProduct } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: number, name: string }[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Usar productos del contexto global
  const products = state.products;

  // Paleta de colores para los círculos
  const COLORS = [
    '#10b981', '#6366f1', '#f59e42', '#ef4444', '#3b82f6', '#a21caf', '#eab308', '#0ea5e9', '#f43f5e', '#14b8a6', '#f97316', '#84cc16', '#8b5cf6', '#facc15', '#22d3ee', '#e11d48', '#7c3aed', '#65a30d', '#f472b6', '#0d9488'
  ];

  // Función de ordenamiento
  const sortProducts = (products: Product[], config: SortConfig) => {
    return [...products].sort((a, b) => {
      let aValue = a[config.field];
      let bValue = b[config.field];
      
      if (config.field === 'price' || config.field === 'stock') {
        const aNum = Number(aValue) || 0;
        const bNum = Number(bValue) || 0;
        if (aNum < bNum) return config.direction === 'asc' ? -1 : 1;
        if (aNum > bNum) return config.direction === 'asc' ? 1 : -1;
        return 0;
      } else {
        const aStr = String(aValue || '').toLowerCase();
        const bStr = String(bValue || '').toLowerCase();
        if (aStr < bStr) return config.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return config.direction === 'asc' ? 1 : -1;
        return 0;
      }
    });
  };

  // Función para cambiar ordenamiento
  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filtrar y ordenar productos
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (categories.find(c => c.id === product.category_id)?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (product.code?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
      return matchesSearch && matchesCategory && product.active;
    });
  }, [products, searchTerm, selectedCategory, categories]);

  const sortedProducts = useMemo(() => {
    return sortProducts(filteredProducts, sortConfig);
  }, [filteredProducts, sortConfig]);

  // Paginación
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = sortedProducts.slice(startIndex, endIndex);

  // Resetear página cuando cambian los filtros
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  React.useEffect(() => {
    // Obtener categorías del backend
    api.getCategories().then(res => {
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    });
  }, []);

  const handleFormSubmit = async (formData: ProductFormData) => {
    setLoading(true);
    try {
      const productData = {
        name: formData.name.trim(),
        category_id: Number(formData.category_id),
        providerId: formData.providerId ? String(formData.providerId) : undefined,
        icon: formData.icon,
        code: formData.code.trim(),
        price: parseFloat(formData.price),
        wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : undefined,
        cost: parseFloat(formData.cost),
        stock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock),
        description: formData.description.trim(),
        active: true,
        ...(editingProduct && { code: editingProduct.code }),
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        showSuccessMessage('Producto actualizado correctamente');
      } else {
        await createProduct(productData);
        showSuccessMessage('Producto agregado al inventario');
      }
      
      setShowForm(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error al guardar producto:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar producto. Intenta de nuevo.';
      showErrorMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setShowDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;
    
    try {
      await deleteProduct(showDeleteConfirm);
      setShowDeleteConfirm(null);
      showSuccessMessage('Producto eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      showErrorMessage('Error al eliminar producto. Intenta de nuevo.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(amount);
  };

  // Función para mostrar mensaje de éxito
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Función para mostrar mensaje de error
  const showErrorMessage = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Productos</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona tu inventario de productos ({filteredProducts.length} productos)
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-l-lg transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-r-lg transition-colors ${
                viewMode === 'table' 
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {errorMessage}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-6 w-6 text-blue-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, categoría o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-2xl shadow focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all placeholder-blue-300 text-base"
          />
        </div>
        <select
          value={selectedCategory === '' ? '' : String(selectedCategory)}
          onChange={(e) => setSelectedCategory(e.target.value === '' ? '' : Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Products Display */}
      {viewMode === 'grid' ? (
        // Grid View
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-3xl">
                    <span
                      className="inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-white text-xl shadow"
                      style={{ background: COLORS[product.name.charCodeAt(0) % COLORS.length] }}
                      title={product.name}
                    >
                      {product.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEdit(product)}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900 dark:hover:bg-yellow-800 text-yellow-600 dark:text-yellow-300"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-600 dark:text-red-300"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {categories.find(c => c.id === product.category_id)?.name || 'Sin categoría'}
                </p>
                
                <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <Package className="h-3 w-3" />
                  <span>{product.code}</span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Precio:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Ganancia:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(product.price - product.cost)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className={`flex items-center space-x-1 text-sm ${
                    product.stock <= 5 
                      ? 'text-red-600' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {product.stock <= 5 && (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <span>Stock: {product.stock}</span>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    product.stock > 5
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {product.stock > 5 ? 'En Stock' : 'Stock Bajo'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        // Table View
        <ProductsTable
          products={currentProducts}
          sortConfig={sortConfig}
          onSort={handleSort}
          onEdit={handleEdit}
          onDelete={handleDelete}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedProducts.length}
        itemsPerPage={itemsPerPage}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={setCurrentPage}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(null)}
        productName={showDeleteConfirm ? products.find(p => p.id === showDeleteConfirm)?.name : undefined}
      />

      {/* Product Form Modal */}
      <ProductForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingProduct(null);
        }}
        onSubmit={handleFormSubmit}
        product={editingProduct}
        loading={loading}
        categories={categories}
        providers={state.providers}
      />
    </div>
  );
}