import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Provider } from '../../types';
import { X } from 'lucide-react';

export interface ProductFormData {
  name: string;
  category_id: number | '';
  providerId: string | '';
  icon: string;
  code: string;
  price: string;
  wholesalePrice: string;
  cost: string;
  stock: string;
  minStock: string;
  description: string;
  image?: string;
  imageUrl: string;
}

interface FormErrors {
  [key: string]: string;
}

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => Promise<void>;
  product?: Product | null;
  loading: boolean;
  categories: { id: number, name: string }[];
  providers: Provider[];
}

export default function ProductForm({
  isOpen,
  onClose,
  onSubmit,
  product,
  loading,
  categories,
  providers
}: ProductFormProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    category_id: '',
    providerId: '',
    icon: 'Package',
    code: '',
    price: '',
    wholesalePrice: '',
    cost: '',
    stock: '',
    minStock: '',
    description: '',
    image: '',
    imageUrl: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        category_id: product.category_id || '',
        providerId: product.providerId || '',
        icon: product.icon || 'Package',
        code: product.code || '',
        price: (product.price || 0).toString(),
        wholesalePrice: (product.wholesalePrice || 0).toString(),
        cost: (product.cost || 0).toString(),
        stock: (product.stock || 0).toString(),
        minStock: (product.minStock || 5).toString(),
        description: product.description || '',
        image: String(product.image || ''),
        imageUrl: product.imageUrl || '',
      });
    } else {
      setFormData({
        name: '',
        category_id: '',
        providerId: '',
        icon: 'Package',
        code: '',
        price: '',
        wholesalePrice: '',
        cost: '',
        stock: '',
        minStock: '',
        description: '',
        image: '',
        imageUrl: '',
      });
    }
    setErrors({});
    setTouched(new Set());
  }, [product, isOpen]);

  const validateField = (name: string, value: unknown): string => {
    switch (name) {
      case 'name':
        if (!String(value ?? '').trim()) return 'El nombre es requerido';
        if (String(value).trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
        if (String(value).trim().length > 100) return 'El nombre no puede exceder 100 caracteres';
        break;
      case 'category_id':
        if (!value) return 'La categoría es requerida';
        break;
      case 'price':
        if (!value) return 'El precio es requerido';
        if (parseFloat(String(value)) <= 0) return 'El precio debe ser mayor a 0';
        if (parseFloat(String(value)) > 999999) return 'El precio no puede exceder 999,999';
        break;
      case 'wholesalePrice':
        if (!value) return ''; // opcional
        if (parseFloat(String(value)) <= 0) return 'El precio mayorista debe ser mayor a 0';
        if (parseFloat(String(value)) > 999999) return 'El precio mayorista no puede exceder 999,999';
        if (formData.price && parseFloat(String(value)) > parseFloat(formData.price)) return 'El mayorista no puede ser mayor que el precio normal';
        break;
      case 'cost':
        if (!value) return 'El costo es requerido';
        if (parseFloat(String(value)) < 0) return 'El costo no puede ser negativo';
        if (parseFloat(String(value)) > 999999) return 'El costo no puede exceder 999,999';
        break;
      case 'stock':
        if (!value) return 'El stock es requerido';
        if (parseInt(String(value)) < 0) return 'El stock no puede ser negativo';
        if (parseInt(String(value)) > 99999) return 'El stock no puede exceder 99,999';
        break;
      case 'minStock':
        if (value === '' || value === null || value === undefined) return 'El stock mínimo es requerido';
        if (parseInt(String(value)) < 0) return 'El stock mínimo no puede ser negativo';
        if (parseInt(String(value)) > 99999) return 'El stock mínimo no puede exceder 99,999';
        break;
      case 'code':
        if (!String(value ?? '').trim()) return 'El código es requerido (puede ser el código de barras)';
        if (String(value).trim().length > 100) return 'El código no puede exceder 100 caracteres';
        break;
    }
    return '';
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key as keyof ProductFormData] ?? "");
      if (error) {
        newErrors[key] = error;
        isValid = false;
      }
    });

    // Validación cruzada
    if (formData.price && formData.cost) {
      if (parseFloat(formData.price) < parseFloat(formData.cost)) {
        newErrors.price = 'El precio no puede ser menor al costo';
        isValid = false;
      }
    }
    if (formData.wholesalePrice && formData.price) {
      if (parseFloat(formData.wholesalePrice) > parseFloat(formData.price)) {
        newErrors.wholesalePrice = 'El mayorista no puede ser mayor que el precio normal';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleFieldChange = (name: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validar campo en tiempo real si ya ha sido tocado
    if (touched.has(name)) {
      const error = validateField(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  const handleFieldBlur = (name: string) => {
    setTouched(prev => new Set(prev).add(name));
    const error = validateField(name, formData[name as keyof ProductFormData] ?? "");
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Marcar todos los campos como tocados
    const allFields = Object.keys(formData);
    setTouched(new Set(allFields));
    
    if (!validateForm()) {
      return;
    }
    
    await onSubmit(formData);
  };

  const getFieldClassName = (fieldName: string) => {
    const baseClasses = "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white";
    return `${baseClasses} ${
      errors[fieldName] 
        ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
        : 'border-gray-300 dark:border-gray-600'
    }`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {product ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                onBlur={() => handleFieldBlur('name')}
                className={getFieldClassName('name')}
                placeholder="Nombre del producto"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Código / Código de barras *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => handleFieldChange('code', e.target.value)}
                onBlur={() => handleFieldBlur('code')}
                className={getFieldClassName('code')}
                placeholder="Ej: SKU o código de barras que escanearás"
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.code}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Proveedor
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.providerId}
                  onChange={e => handleFieldChange('providerId', e.target.value)}
                  className={getFieldClassName('providerId')}
                >
                  <option value="">Sin proveedor</option>
                  {providers
                    .filter(p => p.active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/providers');
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
                  title="Ir a Proveedores"
                >
                  Gestionar
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                Categoría *
              </label>
              <select
                required
                value={formData.category_id === '' ? '' : String(formData.category_id)}
                onChange={e => handleFieldChange('category_id', Number(e.target.value))}
                className={getFieldClassName('category_id')}
              >
                <option value="">Selecciona una categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {errors.category_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category_id}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Precio *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => handleFieldChange('price', e.target.value)}
                  onBlur={() => handleFieldBlur('price')}
                  className={getFieldClassName('price')}
                  placeholder="0.00"
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price}</p>
                )}
              </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Precio al por mayor
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.wholesalePrice}
                onChange={(e) => handleFieldChange('wholesalePrice', e.target.value)}
                onBlur={() => handleFieldBlur('wholesalePrice')}
                className={getFieldClassName('wholesalePrice')}
                placeholder="0.00"
              />
              {errors.wholesalePrice && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.wholesalePrice}</p>
              )}
            </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Costo *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.cost}
                  onChange={(e) => handleFieldChange('cost', e.target.value)}
                  onBlur={() => handleFieldBlur('cost')}
                  className={getFieldClassName('cost')}
                  placeholder="0.00"
                />
                {errors.cost && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.cost}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stock *
                </label>
                <input
                  type="number"
                  required
                  value={formData.stock}
                  onChange={(e) => handleFieldChange('stock', e.target.value)}
                  onBlur={() => handleFieldBlur('stock')}
                  className={getFieldClassName('stock')}
                  placeholder="0"
                />
                {errors.stock && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.stock}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stock Mínimo *
                </label>
                <input
                  type="number"
                  required
                  value={formData.minStock}
                  onChange={(e) => handleFieldChange('minStock', e.target.value)}
                  onBlur={() => handleFieldBlur('minStock')}
                  className={getFieldClassName('minStock')}
                  placeholder="5"
                />
                {errors.minStock && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Costo *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.cost}
                onChange={(e) => handleFieldChange('cost', e.target.value)}
                onBlur={() => handleFieldBlur('cost')}
                className={getFieldClassName('cost')}
                placeholder="0.00"
              />
              {errors.cost && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.cost}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stock *
              </label>
              <input
                type="number"
                required
                value={formData.stock}
                onChange={(e) => handleFieldChange('stock', e.target.value)}
                onBlur={() => handleFieldBlur('stock')}
                className={getFieldClassName('stock')}
                placeholder="0"
              />
              {errors.stock && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.stock}</p>
              )}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Guardando...' : (product ? 'Actualizar' : 'Crear') + ' Producto'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}