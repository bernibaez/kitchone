import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  PackageOpen,
  Search,
  AlertTriangle,
  Plus,
  Minus,
  Save,
  X,
  Package,
  TrendingUp,
  ShoppingCart,
  Trash2,
  Check,
} from 'lucide-react';

interface CartItem {
  product: any;
  quantity: number;
}

export default function StockManagement() {
  const { state, updateProduct } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Filtrar productos por búsqueda
  const filteredProducts = state.products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular estadísticas
  const totalProducts = state.products.length;
  const lowStockProducts = state.products.filter(p => p.stock <= 5).length;
  const cartItems = cart.length;
  const totalUnitsToAdd = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(amount);
  };

  // Mostrar mensaje de éxito
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Mostrar mensaje de error
  const showErrorMessage = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  // Agregar producto al carrito
  const addToCart = (product: any) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  // Actualizar cantidad en el carrito
  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  // Eliminar del carrito
  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  // Limpiar carrito
  const clearCart = () => {
    setCart([]);
  };

  // Actualizar todos los stocks
  const handleUpdateAllStocks = async () => {
    if (cart.length === 0) {
      showErrorMessage('El carrito está vacío');
      return;
    }

    // Show confirmation modal instead of updating directly
    setShowConfirmModal(true);
  };

  // Confirm and execute stock updates
  const confirmUpdateStocks = async () => {
    try {
      setLoading(true);
      for (const item of cart) {
        const newStock = item.product.stock + item.quantity;
        await updateProduct(item.product.id, { stock: newStock });
      }
      showSuccessMessage(`Stock actualizado para ${cart.length} productos`);
      setCart([]);
      setShowConfirmModal(false);
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      showErrorMessage('Error al actualizar el stock');
    } finally {
      setLoading(false);
    }
  };

  // Resetear todos los valores
  const handleReset = () => {
    setCart([]);
    setSearchTerm('');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-green-600" />
            Gestión de Stock
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Agrega productos al carrito para actualizar su stock
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            <X className="h-4 w-4" />
            <span>Limpiar</span>
          </button>
          <button
            onClick={handleUpdateAllStocks}
            disabled={loading || cart.length === 0}
            className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Actualizando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Realizar Actualización</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Productos</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalProducts}</p>
            </div>
            <Package className="h-6 w-6 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Stock Bajo</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{lowStockProducts}</p>
            </div>
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">En Carrito</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{cartItems}</p>
            </div>
            <ShoppingCart className="h-6 w-6 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Unidades a Añadir</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{totalUnitsToAdd}</p>
            </div>
            <TrendingUp className="h-6 w-6 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Main Content: Products Left, Cart Right */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Products Panel - Left */}
        <div className="flex-1">
          {/* Search Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar productos por nombre, código o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const cartItem = cart.find(item => item.product.id === product.id);
              const quantityInCart = cartItem?.quantity || 0;
              
              return (
                <div key={product.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-all duration-200 overflow-hidden">
                  {/* Product Header */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 p-3 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">
                          {product.name}
                        </h3>
                        <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                          <span className="bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-xs font-medium">
                            {product.code}
                          </span>
                          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 py-0.5 rounded text-xs font-medium">
                            {product.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        {product.stock <= 5 && (
                          <div className="flex items-center space-x-1 text-red-500">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-xs font-medium">Bajo</span>
                          </div>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          product.stock > 5
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {product.stock > 5 ? 'OK' : 'Crítico'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Product Info and Add to Cart */}
                  <div className="p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 text-center">
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Stock</p>
                        <p className={`text-base font-bold ${
                          product.stock <= 5 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {product.stock}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 text-center">
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Precio</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      onClick={() => addToCart(product)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Añadir al Carrito</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <PackageOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No se encontraron productos
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Intenta con otra búsqueda' : 'No hay productos en el inventario'}
              </p>
            </div>
          )}
        </div>

        {/* Shopping Cart Panel - Right */}
        <div className="w-full lg:w-96">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg sticky top-4">
            {/* Cart Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <h3 className="text-lg font-bold">Carrito de Compras</h3>
                </div>
                <span className="bg-white/20 px-2 py-1 rounded-full text-sm font-bold">
                  {cartItems}
                </span>
              </div>
            </div>

            {/* Cart Content */}
            <div className="p-4">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    El carrito está vacío
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    Agrega productos para actualizar stock
                  </p>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                    {cart.map((item) => (
                      <div key={item.product.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                              {item.product.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {item.product.code}
                            </p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                            className="p-1 bg-red-100 hover:bg-red-200 text-red-600 rounded transition-colors"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateCartQuantity(item.product.id, parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center text-sm font-bold dark:bg-gray-600 dark:text-white"
                          />
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                            className="p-1 bg-green-100 hover:bg-green-200 text-green-600 rounded transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400">Stock actual:</span>
                            <span className="font-medium">{item.product.stock}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-blue-600 dark:text-blue-400">A añadir:</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">+{item.quantity}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-green-600 dark:text-green-400">Nuevo stock:</span>
                            <span className="font-bold text-green-600 dark:text-green-400">{item.product.stock + item.quantity}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cart Summary */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          Total productos:
                        </span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {cart.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          Total unidades:
                        </span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {totalUnitsToAdd}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="bg-green-600 text-white p-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <h3 className="text-lg font-bold">Confirmar Actualización</h3>
                </div>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Está a punto de actualizar el stock de los siguientes productos:
              </p>
              
              <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                {cart.map((item) => (
                  <div key={item.product.id} className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.product.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.product.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.product.stock} → <span className="font-bold text-green-600">{item.product.stock + item.quantity}</span>
                        </p>
                        <p className="text-xs text-blue-600 font-medium">+{item.quantity}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Total de productos a actualizar:
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {cart.length}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Total de unidades a añadir:
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {totalUnitsToAdd}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 rounded-b-xl">
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmUpdateStocks}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block mr-2"></div>
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 inline-block mr-2" />
                      Confirmar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
