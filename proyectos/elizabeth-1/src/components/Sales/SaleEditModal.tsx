import React, { useState, useEffect } from 'react';
import { Sale, SaleItem } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { X, Plus, Trash2, CreditCard, Banknote, Smartphone } from 'lucide-react';

interface SaleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onSave: (updatedSale: Partial<Sale>) => Promise<void>;
}

export default function SaleEditModal({ isOpen, onClose, sale, onSave }: SaleEditModalProps) {
  const { state } = useApp();
  const [formData, setFormData] = useState<{
    customerName: string;
    paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia' | 'cheque';
    items: SaleItem[];
    discount: number;
    subtotal: number;
    tax: number;
    total: number;
    date: Date;
  }>({
    customerName: '',
    paymentMethod: 'efectivo',
    items: [] as SaleItem[],
    discount: 0,
    subtotal: 0,
    tax: 0,
    total: 0,
    date: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (sale && isOpen) {
      setFormData({
        customerName: sale.customerName || '',
        paymentMethod: sale.paymentMethod || 'efectivo',
        items: sale.items?.map(item => ({
          productId: item.productId || '',
          productName: item.productName || '',
          quantity: item.quantity || 0,
          price: item.price || 0,
          cost: item.cost || 0,
          subtotal: item.subtotal || 0,
          profit: item.profit || 0,
        })) || [],
        discount: sale.discount || 0,
        subtotal: sale.subtotal || 0,
        tax: sale.tax || 0,
        total: sale.total || 0,
        date: sale.date instanceof Date ? sale.date : new Date(sale.date),
      });
    }
  }, [sale, isOpen]);

  useEffect(() => {
    calculateTotals();
  }, [formData.items, formData.discount]);

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum: number, item: SaleItem) => sum + item.subtotal, 0);
    const tax = subtotal * (state.config.taxRate / 100);
    const total = subtotal - formData.discount + tax;
    
    setFormData((prev: typeof formData) => ({
      ...prev,
      subtotal,
      tax,
      total,
    }));
  };

  const handleItemChange = (index: number, field: keyof SaleItem, value: string | number) => {
    const updatedItems = [...formData.items];
    const item = updatedItems[index];
    
    if (field === 'quantity') {
      const quantity = Math.max(1, Number(value) || 1);
      item.quantity = quantity;
      item.subtotal = quantity * item.price;
      item.profit = item.subtotal - (item.cost * quantity);
    } else if (field === 'price') {
      const price = Math.max(0, Number(value) || 0);
      item.price = price;
      item.subtotal = item.quantity * price;
      item.profit = item.subtotal - (item.cost * item.quantity);
    } else if (field === 'productName') {
      item.productName = String(value);
    } else if (field === 'cost') {
      const cost = Math.max(0, Number(value) || 0);
      item.cost = cost;
      item.profit = item.subtotal - (cost * item.quantity);
    }
    
    setFormData((prev: typeof formData) => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    const newItem: SaleItem = {
      productId: '',
      productName: '',
      quantity: 1,
      price: 0,
      cost: 0,
      subtotal: 0,
      profit: 0,
    };
    setFormData((prev: typeof formData) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItem = (index: number) => {
    setFormData((prev: typeof formData) => ({
      ...prev,
      items: prev.items.filter((_: SaleItem, i: number) => i !== index),
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (formData.items.length === 0) {
      newErrors.items = 'Debes agregar al menos un producto';
    }
    
    formData.items.forEach((item: SaleItem, index: number) => {
      if (!item.productName.trim()) {
        newErrors[`item_${index}_name`] = 'El nombre del producto es requerido';
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'La cantidad debe ser mayor a 0';
      }
      if (item.price < 0) {
        newErrors[`item_${index}_price`] = 'El precio no puede ser negativo';
      }
    });
    
    if (formData.discount < 0) {
      newErrors.discount = 'El descuento no puede ser negativo';
    }
    
    if (formData.discount > formData.subtotal) {
      newErrors.discount = 'El descuento no puede ser mayor al subtotal';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      await onSave({
        ...formData,
        customerName: formData.customerName || 'Cliente General',
        items: formData.items,
        subtotal: formData.subtotal,
        tax: formData.tax,
        total: formData.total,
        discount: formData.discount,
        paymentMethod: formData.paymentMethod,
        date: formData.date,
      });
      onClose();
    } catch (error) {
      console.error('Error al guardar venta:', error);
      setErrors({ submit: 'Error al guardar la venta. Intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'efectivo': return <Banknote className="h-4 w-4" />;
      case 'tarjeta': return <CreditCard className="h-4 w-4" />;
      case 'transferencia': return <Smartphone className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Editar Venta {sale?.invoiceNumber}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer and Payment Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cliente
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  placeholder="Cliente General"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Método de Pago
                </label>
                <div className="flex items-center space-x-2">
                  {getPaymentMethodIcon(formData.paymentMethod)}
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as 'efectivo' | 'tarjeta' | 'transferencia' | 'cheque' }))}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 bg-gray-100 dark:bg-gray-900"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha
                </label>
                <input
                  type="datetime-local"
                  value={formData.date.toISOString().slice(0, 16)}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: new Date(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Productos</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Agregar Producto</span>
                </button>
              </div>

              {errors.items && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
                  {errors.items}
                </div>
              )}

              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-white dark:placeholder-gray-400"
                        placeholder="Nombre del producto"
                      />
                      {errors[`item_${index}_name`] && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {errors[`item_${index}_name`]}
                        </p>
                      )}
                    </div>
                    
                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-white dark:placeholder-gray-400"
                        placeholder="Cant"
                      />
                      {errors[`item_${index}_quantity`] && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {errors[`item_${index}_quantity`]}
                        </p>
                      )}
                    </div>
                    
                    <div className="w-32">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-white dark:placeholder-gray-400"
                        placeholder="Precio"
                      />
                      {errors[`item_${index}_price`] && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {errors[`item_${index}_price`]}
                        </p>
                      )}
                    </div>
                    
                    <div className="w-32">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.cost}
                        onChange={(e) => handleItemChange(index, 'cost', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-white dark:placeholder-gray-400"
                        placeholder="Costo"
                      />
                      {errors[`item_${index}_cost`] && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {errors[`item_${index}_cost`]}
                        </p>
                      )}
                    </div>
                    
                    <div className="w-32 text-right">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(item.subtotal)}
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descuento
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.discount}
                onChange={(e) => setFormData(prev => ({ ...prev, discount: Number(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                placeholder="0.00"
              />
              {errors.discount && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.discount}</p>
              )}
            </div>

            {/* Totals */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(formData.subtotal)}
                </span>
              </div>
              {formData.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Descuento:</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(formData.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  IVA ({state.config.taxRate}%):
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(formData.tax)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900 dark:text-white">Total:</span>
                <span className="text-blue-600 dark:text-blue-400">
                  {formatCurrency(formData.total)}
                </span>
              </div>
            </div>

            {errors.submit && (
              <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
                {errors.submit}
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
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
