import React from 'react';
import { Product } from '../../types';
import { Edit, Trash2, AlertTriangle, ChevronUp, ChevronDown, Package } from 'lucide-react';

type SortField = 'name' | 'category' | 'price' | 'stock' | 'code';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

interface ProductsTableProps {
  products: Product[];
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  formatCurrency: (amount: number) => string;
}

export default function ProductsTable({
  products,
  sortConfig,
  onSort,
  onEdit,
  onDelete,
  formatCurrency
}: ProductsTableProps) {
  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  // Paleta de colores para los círculos
  const COLORS = [
    '#10b981', '#6366f1', '#f59e42', '#ef4444', '#3b82f6', '#a21caf', '#eab308', '#0ea5e9', '#f43f5e', '#14b8a6', '#f97316', '#84cc16', '#8b5cf6', '#facc15', '#22d3ee', '#e11d48', '#7c3aed', '#65a30d', '#f472b6', '#0d9488'
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Producto
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => onSort('category')}
              >
                <div className="flex items-center space-x-1">
                  <span>Categoría</span>
                  {getSortIcon('category')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => onSort('code')}
              >
                <div className="flex items-center space-x-1">
                  <span>Código</span>
                  {getSortIcon('code')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => onSort('price')}
              >
                <div className="flex items-center space-x-1">
                  <span>Precio</span>
                  {getSortIcon('price')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Precio Mayorista
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => onSort('stock')}
              >
                <div className="flex items-center space-x-1">
                  <span>Stock</span>
                  {getSortIcon('stock')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">
                      <Package className="w-10 h-10 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {product.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Ganancia: {formatCurrency(product.price - product.cost)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {product.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {product.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(product.price)}
                </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {product.wholesalePrice ? formatCurrency(product.wholesalePrice) : '-'}
              </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className={`text-sm ${
                      product.stock <= 5 ? 'text-red-600' : 'text-gray-900 dark:text-white'
                    }`}>
                      {product.stock}
                    </span>
                    {product.stock <= 5 && (
                      <AlertTriangle className="h-4 w-4 text-red-500 ml-1" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    product.stock > 5
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {product.stock > 5 ? 'En Stock' : 'Stock Bajo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onEdit(product)}
                      className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(product.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 