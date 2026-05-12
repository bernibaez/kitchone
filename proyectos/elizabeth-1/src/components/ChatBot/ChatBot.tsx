import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'product' | 'chart';
  data?: any;
}

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatBot({ isOpen, onClose }: ChatBotProps) {
  const { state } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mensaje de bienvenida
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: `¡Hola! Soy el asistente virtual de ${state.config.name || 'FactusSoft'}. Puedo ayudarte con:\n\n📦 Consultas de inventario\n💰 Información de ventas\n📊 Reportes y estadísticas\n🔍 Búsqueda de productos\n\n¿En qué puedo ayudarte hoy?`,
        sender: 'bot',
        timestamp: new Date(),
        type: 'text' as const
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen]);

  // Auto-scroll al final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Enfocar input al abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Función principal para procesar mensajes
  const processMessage = async (userMessage: string) => {
    setIsTyping(true);
    
    // Simular procesamiento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = generateBotResponse(userMessage);
    
    const botMessage: Message = {
      id: Date.now().toString(),
      text: response.text,
      sender: 'bot',
      timestamp: new Date(),
      type: response.type as 'text' | 'product' | 'chart' | undefined,
      data: response.data
    };
    
    setMessages(prev => [...prev, botMessage]);
    setIsTyping(false);
  };

  // Generar respuesta del bot basada en el mensaje del usuario
  const generateBotResponse = (userMessage: string): { text: string; type?: string; data?: any } => {
    const message = userMessage.toLowerCase();
    
    // Consultas de inventario
    if (message.includes('inventario') || message.includes('stock') || message.includes('productos disponibles')) {
      const totalProducts = state.products.length;
      const activeProducts = state.products.filter(p => p.active).length;
      const lowStockProducts = state.products.filter(p => p.stock <= p.minStock).length;
      const totalStock = state.products.reduce((sum, p) => sum + p.stock, 0);
      
      return {
        text: `📦 **Estado del Inventario**\n\n• **Total productos:** ${totalProducts}\n• **Productos activos:** ${activeProducts}\n• **Productos con stock bajo:** ${lowStockProducts}\n• **Unidades totales en stock:** ${totalStock}\n\n¿Quieres ver detalles de algún producto específico?`,
        type: 'chart',
        data: {
          type: 'inventory',
          stats: { totalProducts, activeProducts, lowStockProducts, totalStock }
        }
      };
    }
    
    // Búsqueda de productos específicos
    if (message.includes('buscar') || message.includes('producto') || message.includes('precio')) {
      const searchTerm = message.split(' ').find(word => 
        state.products.some(p => 
          p.name.toLowerCase().includes(word.toLowerCase()) || 
          p.code.toLowerCase().includes(word.toLowerCase())
        )
      );
      
      if (searchTerm) {
        const products = state.products.filter(p => 
          p.active && (
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.code.toLowerCase().includes(searchTerm.toLowerCase())
          )
        ).slice(0, 5);
        
        if (products.length > 0) {
          const productList = products.map(p => 
            `• **${p.name}** - $${p.price.toFixed(2)} (Stock: ${p.stock})`
          ).join('\n');
          
          return {
            text: `🔍 **Productos encontrados:**\n\n${productList}\n\n¿Necesitas más información de algún producto?`,
            type: 'product',
            data: { products }
          };
        }
      }
      
      return {
        text: `🔍 No encontré productos con ese término. Intenta con:\n\n• El nombre del producto\n• El código del producto\n• La categoría del producto\n\n¿Puedo ayudarte con otra cosa?`
      };
    }
    
    // Consultas de ventas
    if (message.includes('ventas') || message.includes('venta') || message.includes('ganancias')) {
      const today = new Date();
      const todaySales = state.sales.filter(sale => 
        new Date(sale.date).toDateString() === today.toDateString()
      ).length;
      
      const totalSales = state.sales.length;
      const totalRevenue = state.sales.reduce((sum, sale) => sum + sale.total, 0);
      const totalProfit = state.sales.reduce((sum, sale) => sum + sale.totalProfit, 0);
      
      return {
        text: `💰 **Resumen de Ventas**\n\n• **Ventas hoy:** ${todaySales}\n• **Total ventas:** ${totalSales}\n• **Ingresos totales:** $${totalRevenue.toFixed(2)}\n• **Ganancias totales:** $${totalProfit.toFixed(2)}\n\n¿Quieres ver reportes más detallados?`,
        type: 'chart',
        data: {
          type: 'sales',
          stats: { todaySales, totalSales, totalRevenue, totalProfit }
        }
      };
    }
    
    // Consultas de clientes
    if (message.includes('clientes') || message.includes('customer')) {
      const totalCustomers = state.customers.length;
      const activeCustomers = state.customers.filter(c => c.active).length;
      const topCustomers = state.customers
        .sort((a, b) => b.totalPurchases - a.totalPurchases)
        .slice(0, 3);
      
      const customerList = topCustomers.map((c, i) => 
        `${i + 1}. **${c.name}** - $${c.totalPurchases.toFixed(2)}`
      ).join('\n');
      
      return {
        text: `👥 **Información de Clientes**\n\n• **Total clientes:** ${totalCustomers}\n• **Clientes activos:** ${activeCustomers}\n\n**Top 3 clientes:**\n${customerList}\n\n¿Necesitas información de algún cliente específico?`,
        type: 'chart',
        data: {
          type: 'customers',
          stats: { totalCustomers, activeCustomers },
          topCustomers
        }
      };
    }
    
    // Consultas de categorías
    if (message.includes('categoría') || message.includes('categorias') || message.includes('category')) {
      const categories = [...new Set(state.products.map(p => p.category))];
      const categoryStats = categories.map(category => {
        const count = state.products.filter(p => p.category === category && p.active).length;
        return `• **${category}:** ${count} productos`;
      }).join('\n');
      
      return {
        text: `📂 **Categorías de Productos**\n\n${categoryStats}\n\n¿Quieres ver productos de alguna categoría específica?`,
        type: 'chart',
        data: {
          type: 'categories',
          categories,
          stats: categories.map(cat => ({
            name: cat,
            count: state.products.filter(p => p.category === cat && p.active).length
          }))
        }
      };
    }
    
    // Ayuda y comandos
    if (message.includes('ayuda') || message.includes('help') || message.includes('comandos')) {
      return {
        text: `🤖 **Comandos Disponibles**\n\n**Inventario:**\n• "inventario" - Estado general del stock\n• "stock bajo" - Productos con poco stock\n• "buscar [producto]" - Buscar producto específico\n\n**Ventas:**\n• "ventas hoy" - Ventas del día\n• "ventas totales" - Resumen completo\n• "ganancias" - Ganancias totales\n\n**Clientes:**\n• "clientes" - Lista de clientes\n• "mejores clientes" - Top compradores\n\n**Productos:**\n• "categorías" - Ver todas las categorías\n• "precio [producto]" - Ver precio de producto\n\n**Ejemplos:**\n• "buscar laptop"\n• "stock de iPhone"\n• "ventas hoy"\n• "mejores clientes"\n\n¿Qué necesitas saber?`
      };
    }
    
    // Respuesta por defecto
    return {
      text: `🤔 No entendí esa consulta. Prueba con:\n\n• "inventario" - para ver stock\n• "buscar [producto]" - para buscar\n• "ventas" - para ver ventas\n• "clientes" - para ver clientes\n• "ayuda" - para ver todos los comandos\n\n¿O dime específicamente qué necesitas?`
    };
  };

  // Enviar mensaje
  const handleSend = () => {
    if (inputText.trim() === '') return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      type: 'text' as const
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    
    // Procesar respuesta
    processMessage(inputText);
  };

  // Manejo de teclado
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Formatear hora
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-DO', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 pointer-events-auto"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div 
          className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-semibold">Asistente Virtual</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === 'user'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.type === 'chart' && message.data && (
                    <div className="mb-2 p-2 bg-white rounded border border-gray-200">
                      {message.data.type === 'inventory' && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Total productos:</span>
                            <span className="text-emerald-600 font-bold">{message.data.stats.totalProducts}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Activos:</span>
                            <span className="text-blue-600 font-bold">{message.data.stats.activeProducts}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Stock bajo:</span>
                            <span className="text-red-600 font-bold">{message.data.stats.lowStockProducts}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Unidades totales:</span>
                            <span className="text-purple-600 font-bold">{message.data.stats.totalStock}</span>
                          </div>
                        </div>
                      )}
                      {message.data.type === 'sales' && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Ventas hoy:</span>
                            <span className="text-emerald-600 font-bold">{message.data.stats.todaySales}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Total ventas:</span>
                            <span className="text-blue-600 font-bold">{message.data.stats.totalSales}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Ingresos:</span>
                            <span className="text-green-600 font-bold">${message.data.stats.totalRevenue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Ganancias:</span>
                            <span className="text-purple-600 font-bold">${message.data.stats.totalProfit.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                      {message.data.type === 'customers' && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Total clientes:</span>
                            <span className="text-emerald-600 font-bold">{message.data.stats.totalCustomers}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Activos:</span>
                            <span className="text-blue-600 font-bold">{message.data.stats.activeCustomers}</span>
                          </div>
                        </div>
                      )}
                      {message.data.type === 'categories' && (
                        <div className="space-y-1">
                          {message.data.stats.map((cat: any, i: number) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="font-medium">{cat.name}:</span>
                              <span className="text-emerald-600 font-bold">{cat.count} productos</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-line">{message.text}</div>
                  <div className={`text-xs mt-1 ${message.sender === 'user' ? 'text-emerald-100' : 'text-gray-500'}`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Indicador de escritura */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu pregunta aquí..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                disabled={isTyping}
              />
              <button
                onClick={handleSend}
                disabled={isTyping || inputText.trim() === ''}
                className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              💡 Tip: Prueba "inventario", "buscar laptop", "ventas hoy" o "ayuda"
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
