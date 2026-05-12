import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { SaleItem, Product, Customer } from '../types';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  ShoppingCart,
  Calculator,
  Receipt,
  Download,
  FileText,
  DollarSign,
  TrendingUp,
  Package,
  Laptop,
  Monitor,
  Keyboard,
  Mouse,
  Printer,
  Camera,
  Headphones,
  ShoppingBag,
  Edit,
  X,
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Dialog } from '@headlessui/react';
import Invoice from '../components/Invoice/Invoice';
import { useNavigate } from 'react-router-dom';

export default function PointOfSale() {
  const { state, generateInvoiceNumber, createSale, updateSale } = useApp();
  const WHOLESALE_THRESHOLD = 6;
  const [searchTerm, setSearchTerm] = useState('');
  const [scanCode, setScanCode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [includeTax, setIncludeTax] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');
  const [isEditingSale, setIsEditingSale] = useState(false);
  const [originalSaleId, setOriginalSaleId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSale, setPendingSale] = useState<any>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'cheque'>('efectivo');
  const navigate = useNavigate();

  // Cargar venta a editar si existe
  useEffect(() => {
    const editingSaleData = localStorage.getItem('editingSale');
    if (editingSaleData) {
      try {
        const sale = JSON.parse(editingSaleData);
        loadSaleForEdit(sale);
        localStorage.removeItem('editingSale'); // Limpiar después de cargar
      } catch (error) {
        console.error('Error al cargar venta para editar:', error);
      }
    }
  }, []);

  const loadSaleForEdit = (sale: any) => {
    setIsEditingSale(true);
    setOriginalSaleId(sale.id);
    
    // Cargar cliente si existe
    if (sale.customerId) {
      const customer = state.customers.find(c => String(c.id) === String(sale.customerId));
      if (customer) {
        setSelectedCustomer(customer);
      }
    }
    
    // Cargar productos al carrito
    const cartItems: SaleItem[] = (sale.items || []).map((item: any) => ({
      productId: item.productId || item.product_id,
      productName: item.productName || item.product_name,
      quantity: item.quantity,
      price: item.price || item.unit_price,
      subtotal: item.subtotal || item.total,
      useWholesale: false // Se calculará automáticamente
    }));
    
    setCart(cartItems);
    
    // Cargar método de pago y descuento
    setPaymentMethod(sale.paymentMethod || 'efectivo');
    setDiscount(sale.discount || 0);
  };

  const categories = [...new Set(state.products.map(p => p.category))];

  const filteredProducts = state.products.filter(product => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(q) ||
                         product.code.toLowerCase().includes(q);
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory && product.active && product.stock > 0;
  });

  const handleCodeScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = scanCode.trim();
      if (!code) return;
      
      // Buscar producto por código (case insensitive)
      const product = state.products.find(
        p => p.active && p.stock > 0 && p.code.toLowerCase() === code.toLowerCase()
      );
      
      if (product) {
        // Verificar si hay stock disponible
        if (product.stock <= 0) {
          setCancelMessage('Producto sin stock disponible');
          setTimeout(() => setCancelMessage(''), 3000);
          setScanCode('');
          return;
        }
        
        // Agregar al carrito
        addToCart(product);
        setScanCode('');
        
        // Mostrar mensaje de éxito
        setSuccessMessage(`${product.name} agregado al carrito`);
        setTimeout(() => setSuccessMessage(''), 2000);
        
        // Reproducir sonido de éxito (si está disponible)
        playSuccessSound();
        
        // Enfocar nuevamente el input para continuar escaneando
        setTimeout(() => {
          const scanInput = document.getElementById('barcode-scanner');
          if (scanInput) {
            scanInput.focus();
          }
        }, 100);
      } else {
        // Producto no encontrado
        setCancelMessage(`Producto con código "${code}" no encontrado`);
        setTimeout(() => setCancelMessage(''), 3000);
        setScanCode('');
        
        // Reproducir sonido de error (si está disponible)
        playErrorSound();
        
        // Enfocar nuevamente el input
        setTimeout(() => {
          const scanInput = document.getElementById('barcode-scanner');
          if (scanInput) {
            scanInput.focus();
          }
        }, 100);
      }
    }
  };

  // Función para reproducir sonido de éxito
  const playSuccessSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Silenciar errores si no se puede reproducir
    } catch (error) {
      // Ignorar errores de audio
    }
  };

  // Función para reproducir sonido de error
  const playErrorSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
      audio.volume = 0.3;
      audio.playbackRate = 0.8; // Más lento para error
      audio.play().catch(() => {}); // Silenciar errores si no se puede reproducir
    } catch (error) {
      // Ignorar errores de audio
    }
  };

  // Función para manejar el cambio en el input de escaneo
  const handleScanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setScanCode(value);
    
    // Si el código parece ser un código de barras (generalmente 8-13 dígitos)
    // y el input pierde el foco, intentamos procesarlo automáticamente
    if (value.length >= 8 && value.length <= 13) {
      const timer = setTimeout(() => {
        if (scanCode === value) { // Solo procesar si el valor no ha cambiado
          handleCodeScanKeyDown({ key: 'Enter' } as React.KeyboardEvent<HTMLInputElement>);
        }
      }, 500);
      
      // Limpiar el timer anterior si existe
      return () => clearTimeout(timer);
    }
  };

  // Efecto para enfocar automáticamente el input del escáner
  useEffect(() => {
    const timer = setTimeout(() => {
      const scanInput = document.getElementById('barcode-scanner') as HTMLInputElement;
      if (scanInput) {
        scanInput.focus();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Función para iniciar cámara
  const startCamera = async () => {
    try {
      setIsScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setCameraStream(stream);
      setShowScannerModal(true);
      setSuccessMessage('Cámara activada para escaneo');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
      setIsScanning(false);
      setCancelMessage('No se pudo acceder a la cámara. Verifica los permisos.');
      setTimeout(() => setCancelMessage(''), 3000);
    }
  };

  // Función para detener cámara
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsScanning(false);
    setShowScannerModal(false);
  };

  // Función para procesar código escaneado desde cámara
  const processScannedCode = (code: string) => {
    const product = state.products.find(
      p => p.active && p.stock > 0 && p.code.toLowerCase() === code.toLowerCase()
    );
    
    if (product) {
      if (product.stock <= 0) {
        setCancelMessage('Producto sin stock disponible');
        setTimeout(() => setCancelMessage(''), 3000);
        return;
      }
      
      addToCart(product);
      setSuccessMessage(`${product.name} agregado al carrito`);
      setTimeout(() => setSuccessMessage(''), 2000);
      playSuccessSound();
    } else {
      setCancelMessage(`Producto con código "${code}" no encontrado`);
      setTimeout(() => setCancelMessage(''), 3000);
      playErrorSound();
    }
  };

  // Limpiar cámara al desmontar
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        const newQuantity = existingItem.quantity + 1;
        const autoWholesale =
          product.wholesalePrice !== undefined && newQuantity >= WHOLESALE_THRESHOLD;
        const useWholesale =
          existingItem.useWholesale !== undefined
            ? existingItem.useWholesale
            : autoWholesale;
        const unitPrice =
          useWholesale && product.wholesalePrice !== undefined
            ? product.wholesalePrice
            : product.price;

        setCart(
          cart.map(item =>
            item.productId === product.id
              ? {
                  ...item,
                  quantity: newQuantity,
                  price: unitPrice,
                  useWholesale,
                  subtotal: newQuantity * unitPrice,
                  profit: newQuantity * (unitPrice - item.cost),
                }
              : item
          )
        );
      }
    } else {
      const useWholesale =
        product.wholesalePrice !== undefined && 1 >= WHOLESALE_THRESHOLD ? true : false;
      const unitPrice =
        useWholesale && product.wholesalePrice !== undefined
          ? product.wholesalePrice
          : product.price;

      const newItem: SaleItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: unitPrice,
        cost: product.cost,
        subtotal: unitPrice,
        profit: unitPrice - product.cost,
        useWholesale: product.wholesalePrice !== undefined ? useWholesale : undefined,
      };
      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    if (quantity <= 0) {
      setCart(cart.filter(item => item.productId !== productId));
    } else if (quantity <= product.stock) {
      setCart(
        cart.map(item => {
          if (item.productId !== productId) return item;

          const autoWholesale =
            product.wholesalePrice !== undefined && quantity >= WHOLESALE_THRESHOLD;
          const useWholesale =
            item.useWholesale !== undefined ? item.useWholesale : autoWholesale;
          const unitPrice =
            useWholesale && product.wholesalePrice !== undefined
              ? product.wholesalePrice
              : product.price;

          return {
            ...item,
            quantity,
            price: unitPrice,
            useWholesale: product.wholesalePrice !== undefined ? useWholesale : undefined,
            subtotal: quantity * unitPrice,
            profit: quantity * (unitPrice - item.cost),
          };
        })
      );
    }
  };

  const toggleWholesalePrice = (productId: string) => {
    const product = state.products.find(p => p.id === productId);
    if (!product || product.wholesalePrice === undefined) return;

    setCart(
      cart.map(item => {
        if (item.productId !== productId) return item;

        const newUseWholesale = !item.useWholesale;
        const unitPrice = newUseWholesale ? product.wholesalePrice! : product.price;
        const quantity = item.quantity;

        return {
          ...item,
          price: unitPrice,
          useWholesale: newUseWholesale,
          subtotal: quantity * unitPrice,
          profit: quantity * (unitPrice - item.cost),
        };
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    if (isEditingSale) {
      cancelEdit();
    } else {
      setCart([]);
      setSelectedCustomer(null);
      setPaymentMethod('efectivo');
      setDiscount(0);
      setShowPayment(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = includeTax ? subtotal * (state.config.taxRate / 100) : 0;
  const discountAmount = subtotal * (discount / 100);
  const total = subtotal + tax - discountAmount;
  const totalProfit = cart.reduce((sum, item) => sum + item.profit, 0);

  const generateInvoicePDF = (sale: any, autoDownload = true) => {
    // Create PDF with better resolution for printing
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    // Set higher DPI for better quality
    doc.setProperties({
      title: `Factura ${sale.invoiceNumber}`,
      subject: 'Factura de Venta',
      author: state.config.name,
      keywords: 'factura, venta',
      creator: 'FactusSoft'
    });

    // Define page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;

    // Logo (si existe en la config) - with better quality handling
    if (state.config.logo) {
      try {
        // Add logo with proper dimensions
        const logoWidth = 30;
        const logoHeight = 30;
        doc.addImage(state.config.logo, 'PNG', 20, y, logoWidth, logoHeight, undefined, 'FAST');
        y += logoHeight + 5;
      } catch (e) {
        // Si el logo no es válido, continuar sin él
        y += 5;
      }
    }

    // Header with better typography
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text(state.config.name, 60, y);
    y += 8;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    if (state.config.address) {
      doc.text(`${state.config.address}`, 60, y);
      y += 5;
    }
    if (state.config.phone) {
      doc.text(`Tel: ${state.config.phone}`, 60, y);
      y += 5;
    }
    if (state.config.email) {
      doc.text(`Email: ${state.config.email}`, 60, y);
      y += 5;
    }

    // Invoice details with better layout
    y += 10;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text('FACTURA', pageWidth - 60, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Número: ${sale.invoiceNumber}`, pageWidth - 60, y);
    y += 5;
    doc.text(`Fecha: ${sale.date.toLocaleDateString('es-DO')}`, pageWidth - 60, y);
    y += 5;
    doc.text(`Vendedor: ${sale.userName}`, pageWidth - 60, y);
    y += 8;

    // Add a line separator
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    // Customer info
    if (sale.customerName) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text('CLIENTE:', 20, y);
      y += 6;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(sale.customerName, 20, y);
      y += 5;
      
      const customer = state.customers.find(c => c.id === sale.customerId);
      if (customer) {
        if (customer.phone) {
          doc.text(`Tel: ${customer.phone}`, 20, y);
          y += 5;
        }
        if (customer.email) {
          doc.text(`Email: ${customer.email}`, 20, y);
          y += 5;
        }
        if (customer.address) {
          doc.text(`Dir: ${customer.address}`, 20, y);
          y += 5;
        }
      }
      y += 5;
    }

    // Items table with better formatting
    const tableData = sale.items.map((item: any) => [
      item.productName,
      item.quantity.toString(),
      formatCurrency(item.price),
      formatCurrency(item.subtotal)
    ]);

    (doc as any).autoTable({
      head: [['Producto', 'Cant.', 'Precio', 'Subtotal']],
      body: tableData,
      startY: y,
      theme: 'striped',
      styles: { 
        fontSize: 10, 
        cellPadding: 3,
        font: 'helvetica',
        lineColor: [220, 220, 220],
        fillColor: [255, 255, 255]
      },
      headStyles: { 
        fillColor: [59, 130, 246], 
        textColor: 255, 
        fontStyle: 'bold',
        fontSize: 11,
        font: 'helvetica'
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252] 
      },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.3,
      margin: { left: 20, right: 20 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' }
      }
    });

    // Totals with better positioning
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    // Add another line separator
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, finalY - 10, pageWidth - 20, finalY - 10);
    
    // Position totals on the right side
    const totalsX = pageWidth - 80;
    let currentY = finalY;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Subtotal:`, totalsX, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatCurrency(sale.subtotal)}`, pageWidth - 20, currentY, { align: 'right' });
    
    if (sale.discount > 0) {
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(220, 38, 38);
      doc.text(`Descuento (${discount}%):`, totalsX, currentY);
      doc.text(`-${formatCurrency(sale.discount)}`, pageWidth - 20, currentY, { align: 'right' });
    }
    
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`IVA (${state.config.taxRate}%):`, totalsX, currentY);
    doc.text(`${formatCurrency(sale.tax)}`, pageWidth - 20, currentY, { align: 'right' });
    
    currentY += 8;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text(`TOTAL:`, totalsX, currentY);
    doc.text(`${formatCurrency(sale.total)}`, pageWidth - 20, currentY, { align: 'right' });

    // Payment method
    currentY += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const paymentMethods = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
      cheque: 'Cheque'
    };
    doc.text(`Método de pago: ${paymentMethods[sale.payment_method as keyof typeof paymentMethods] || sale.payment_method}`, 20, currentY);

    // Add footer with message if exists
    if (state.config.message) {
      currentY += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      const lines = doc.splitTextToSize(state.config.message, pageWidth - 40);
      lines.forEach((line: string) => {
        doc.text(line, 20, currentY);
        currentY += 5;
      });
    }

    // Add page numbers if multiple pages
    const totalPages = (doc as any).internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    if (autoDownload) {
      doc.save(`Factura-${sale.invoiceNumber}.pdf`);
    }
    return doc;
  };

  const processPayment = async () => {
    if (cart.length === 0) return;

    const validItems = cart.filter(item => {
      const product = state.products.find(p => p.id === item.productId);
      return product && typeof product.stock === 'number';
    });
    if (validItems.length !== cart.length) {
      alert('Hay productos en el carrito que no existen o no tienen stock definido.');
      return;
    }

    const sale = {
      id: isEditingSale && originalSaleId ? originalSaleId : Date.now().toString(),
      customer_id: selectedCustomer?.id || null,
      customer_name: selectedCustomer?.name || '',
      items: validItems.map(item => ({
        product_id: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unit_price: item.price,
        price: item.price,
        discount: 0,
        total: item.subtotal,
        subtotal: item.subtotal
      })),
      subtotal,
      tax,
      discount: discountAmount,
      total,
      totalProfit,
      payment_method: paymentMethod,
      user_id: state.user?.id || null,
      user_name: state.user?.name || '',
      userName: state.user?.name || '',
      date: new Date(),
      invoiceNumber: isEditingSale && originalSaleId ? 
        state.sales.find(s => s.id === originalSaleId)?.invoiceNumber || generateInvoiceNumber() 
        : generateInvoiceNumber(),
    };

    setPendingSale(sale);
    
    // Mostrar modal de confirmación
    if (isEditingSale) {
      setShowConfirmModal(true);
    } else {
      setShowInvoiceModal(true);
    }
  };

  const confirmSaleUpdate = async () => {
    if (!pendingSale || !originalSaleId) return;
    
    try {
      await updateSale(originalSaleId, pendingSale);
      setShowConfirmModal(false);
      setShowInvoiceModal(true);
      setSuccessMessage('¡Venta actualizada correctamente!');
      
      // Limpiar estado de edición
      setTimeout(() => {
        setIsEditingSale(false);
        setOriginalSaleId(null);
        setCart([]);
        setSelectedCustomer(null);
        setPaymentMethod('efectivo');
        setDiscount(0);
        navigate('/sales');
      }, 2000);
    } catch (error) {
      console.error('Error updating sale:', error);
    }
  };

  const cancelEdit = () => {
    if (isEditingSale) {
      // Limpiar estado de edición
      setIsEditingSale(false);
      setOriginalSaleId(null);
      setCart([]);
      setSelectedCustomer(null);
      setPaymentMethod('efectivo');
      setDiscount(0);
      navigate('/sales');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(amount);
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Laptop': return Laptop;
      case 'Smartphone': return Smartphone;
      case 'Monitor': return Monitor;
      case 'Keyboard': return Keyboard;
      case 'Mouse': return Mouse;
      case 'Printer': return Printer;
      case 'Camera': return Camera;
      case 'Headphones': return Headphones;
      default: return ShoppingBag;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Notificación de éxito */}
      {successMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {successMessage}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Punto de Venta</h1>
            {isEditingSale && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                <Edit className="h-3 w-3 mr-1" />
                Editando Venta
              </span>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {isEditingSale ? 'Modifica la venta existente' : 'Registra ventas de forma rápida y sencilla'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {isEditingSale && (
            <button
              onClick={cancelEdit}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Cancelar Edición</span>
              <span className="sm:hidden">Cancelar</span>
            </button>
          )}
          {lastSale && (
            <button
              onClick={() => generateInvoicePDF(lastSale)}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Última Factura</span>
              <span className="sm:hidden">Factura</span>
            </button>
          )}
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {cart.length} artículos
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Products Section */}
        <div className="flex-1 space-y-6">
          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
            <div className="flex flex-col space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-400" />
                <input
                  type="text"
                  placeholder="Buscar productos por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base transition-all duration-200"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-base transition-all duration-200"
              >
                <option value="">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            {/* Barra de escaneo directo al carrito */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Escáner de código de barras activo
                  </div>
                  <button
                    onClick={startCamera}
                    className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full hover:bg-emerald-200 transition-colors flex items-center gap-1"
                  >
                    📷 Escanear con cámara
                  </button>
                </div>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                <input
                  id="barcode-scanner"
                  type="text"
                  placeholder="Escanea código de barras o ingresa manualmente..."
                  value={scanCode}
                  onChange={handleScanChange}
                  onKeyDown={handleCodeScanKeyDown}
                  className="w-full pl-10 pr-4 py-4 text-lg border-2 border-emerald-300 dark:border-emerald-600 rounded-xl focus:ring-4 focus:ring-emerald-200 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-all duration-200 shadow-sm hover:shadow-md"
                  autoFocus
                />
                {scanCode && (
                  <button
                    onClick={() => setScanCode('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>💡 Tip: Presiona Enter después de escanear</span>
                <span>📱 Compatible con escáner manual y cámara</span>
              </div>
            </div>
            
            {/* Product count */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {filteredProducts.length} productos disponibles
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <ShoppingBag className="h-4 w-4" />
                <span>Productos para vender</span>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
            {filteredProducts.map((product) => {
              const IconComponent = getIconComponent(product.icon);
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 lg:p-5 hover:shadow-lg hover:scale-105 transition-all duration-300 text-left relative overflow-hidden"
                >
                  {/* Stock indicator */}
                  {product.stock <= 5 && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      Stock bajo
                    </div>
                  )}
                  
                  {/* Icon */}
                  <div className="flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-2 lg:mb-4 mx-auto group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-300 shadow-lg">
                    <IconComponent className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                  </div>
                  
                  {/* Product info */}
                  <div className="space-y-1 lg:space-y-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-xs lg:text-sm leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {product.name}
                    </h3>
                    
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between text-xs text-gray-500 dark:text-gray-400 gap-1">
                      <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md font-mono text-xs">
                        {product.code}
                      </span>
                      <span className={`px-2 py-1 rounded-md font-medium text-xs ${
                        product.stock > 10 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : product.stock > 5
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {product.stock} u
                      </span>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-lg font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                        {formatCurrency(product.price)}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                        +{formatCurrency(product.price - product.cost)} ganancia
                      </p>
                    </div>
                  </div>
                  
                  {/* Hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                </button>
              );
            })}
          </div>
          
          {/* Empty state */}
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No se encontraron productos
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'No hay productos disponibles para vender'}
              </p>
            </div>
          )}
        </div>

        {/* Cart Section - Side Panel */}
        <div className="w-full lg:w-96 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6 sticky top-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Carrito de Compras
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 text-sm"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Customer Selection */}
            <div className="mb-4">
              <button
                onClick={() => setShowCustomerModal(true)}
                className="w-full flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {selectedCustomer ? selectedCustomer.name : 'Seleccionar cliente'}
                  </span>
                </div>
                <Plus className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="space-y-3 mb-4 max-h-48 lg:max-h-64 overflow-y-auto">
              {cart.map((item) => {
                const product = state.products.find(p => p.id === item.productId);
                const wholesalePrice = product?.wholesalePrice;

                return (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {item.productName}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Precio actual: {formatCurrency(item.price)} c/u
                      </p>
                      {wholesalePrice !== undefined && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-300">
                          Mayorista: {formatCurrency(wholesalePrice)} c/u
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {wholesalePrice !== undefined && (
                        <button
                          onClick={() => toggleWholesalePrice(item.productId)}
                          className={`px-2 py-1 text-[10px] rounded-full border ${
                            item.useWholesale
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-400'
                              : 'bg-white text-gray-600 border-gray-300'
                          }`}
                        >
                          {item.useWholesale ? 'Mayorista' : 'Normal'}
                        </button>
                      )}
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      
                      <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-center">
                        {item.quantity}
                      </span>
                      
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1 text-red-500 hover:text-red-700 ml-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {cart.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
                  Agrega productos al carrito
                </p>
              )}
            </div>

            {/* Discount */}
            {cart.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descuento (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}

            {/* Totals */}
            {cart.length > 0 && (
              <div className="space-y-2 mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="includeTax"
                    checked={includeTax}
                    onChange={() => setIncludeTax(v => !v)}
                    className="mr-2"
                  />
                  <label htmlFor="includeTax" className="text-sm text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                    Incluir IVA ({state.config.taxRate}%)
                  </label>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Descuento ({discount}%):</span>
                    <span className="text-red-600">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {includeTax && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">IVA ({state.config.taxRate}%):</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-900 dark:text-white">Total:</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(total)}</span>
                </div>
              </div>
            )}

            {/* Payment Methods */}
            {cart.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('efectivo')}
                    className={`flex flex-col items-center p-3 rounded-lg border transition-colors ${
                      paymentMethod === 'efectivo'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Banknote className="h-5 w-5 mb-1" />
                    <span className="text-xs">Efectivo</span>
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('tarjeta')}
                    className={`flex flex-col items-center p-3 rounded-lg border transition-colors ${
                      paymentMethod === 'tarjeta'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <CreditCard className="h-5 w-5 mb-1" />
                    <span className="text-xs">Tarjeta</span>
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('transferencia')}
                    className={`flex flex-col items-center p-3 rounded-lg border transition-colors ${
                      paymentMethod === 'transferencia'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Smartphone className="h-5 w-5 mb-1" />
                    <span className="text-xs">Transfer.</span>
                  </button>
                </div>
              </div>
            )}

            {/* Process Payment Button */}
            <button
              onClick={processPayment}
              disabled={cart.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Receipt className="h-4 w-4" />
              <span>Procesar Venta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Seleccionar Cliente
              </h2>
              
              <div className="space-y-2 mb-4">
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setShowCustomerModal(false);
                  }}
                  className="w-full p-3 text-left border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="text-gray-700 dark:text-gray-300">Cliente General</span>
                </button>
                
                {state.customers.filter(c => c.active).map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerModal(false);
                    }}
                    className="w-full p-3 text-left border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {customer.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {customer.phone}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setShowCustomerModal(false)}
                className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal flotante para la factura */}
      {showInvoiceModal && pendingSale && (() => {
        // Usar los datos de la venta realizada (lastSale) para la factura visual
        const client = state.customers.find(c => String(c.id) === String(pendingSale.customer_id));
        const company = {
          name: state.config.name,
          email: state.config.email || '',
          phone: state.config.phone || '',
          address: state.config.address || '',
          logo: state.config.logo || '',
          socials: state.config.socials || {},
          message: state.config.message || ''
        };
        // Mapear los items recibidos del backend a los campos esperados por la factura visual
        const items = (pendingSale.items || []).map((item: any) => ({
          name: item.productName || '',
          qty: item.quantity,
          price: item.price,
          total: item.total || item.subtotal
        }));
        const ivaPercent = state.config.taxRate || 0;
        const ivaAmount = pendingSale.tax;
        const total = pendingSale.total;
        const payment = {
          bank: 'Banco Borcelle',
          name: company.name
        };
        const invoiceData = {
          number: pendingSale.invoiceNumber,
          client: {
            name: client?.name || '',
            email: client?.email || '',
            phone: client?.phone || '',
            address: client?.address || ''
          },
          company,
          items,
          ivaPercent,
          ivaAmount,
          total,
          payment,
          date: pendingSale.date instanceof Date 
            ? pendingSale.date.toLocaleString('es-DO', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })
            : new Date().toLocaleString('es-DO', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })
        };

        // Funciones para los botones
        const handleGuardarSalir = async () => {
          await createSale(pendingSale);
          setShowInvoiceModal(false);
          setLastSale(pendingSale);
          setPendingSale(null);
          clearCart();
          setSuccessMessage('¡Venta guardada exitosamente!');
          setTimeout(() => setSuccessMessage(''), 3000);
          navigate('/sales');
        };

        const handleGuardarEImprimir = async () => {
          await createSale(pendingSale);
          setLastSale(pendingSale);
          setPendingSale(null);
          clearCart();
          setSuccessMessage('¡Venta guardada y factura impresa!');
          setTimeout(() => setSuccessMessage(''), 3000);
          window.print();
        };

        const handleCancelar = () => {
          setShowInvoiceModal(false);
          setPendingSale(null);
          setCancelMessage('Venta cancelada');
          setTimeout(() => setCancelMessage(''), 2500);
        };

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden p-0 relative">
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl z-10"
                onClick={handleCancelar}
              >
                ×
              </button>
              <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
                <div className="w-full">
                  <Invoice invoiceData={invoiceData} />
                </div>
              </div>
              <div className="border-t flex flex-col sm:flex-row gap-2 justify-end items-center bg-gray-50 px-6 py-4">
                <button
                  onClick={handleGuardarSalir}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Guardar y salir
                </button>
                <button
                  onClick={handleCancelar}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarEImprimir}
                  className="w-full sm:w-auto bg-gray-700 hover:bg-gray-900 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Mensaje flotante de cancelación */}
      {cancelMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in font-semibold text-lg">
          <span className="mr-2">❌</span>{cancelMessage}
        </div>
      )}

      {/* Modal de confirmación para editar venta */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-4">
              <Edit className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
              ¿Estás seguro que quieres modificar esta venta?
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Los cambios se guardarán y sobrescribirán la venta original. Esta acción no se puede deshacer.
            </p>
            
            {pendingSale && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total:</span>
                    <span className="font-semibold">{formatCurrency(pendingSale.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Artículos:</span>
                    <span className="font-semibold">{pendingSale.items?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Método:</span>
                    <span className="font-semibold capitalize">{pendingSale.payment_method}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmSaleUpdate}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-semibold"
              >
                Sí, modificar venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para escaneo con cámara */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Escáner de Cámara</h3>
              <button
                onClick={stopCamera}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Contenido de la cámara */}
            <div className="p-4">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                {cameraStream ? (
                  <video
                    ref={(video) => {
                      if (video && cameraStream) {
                        video.srcObject = cameraStream;
                        video.play();
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                      <p>Activando cámara...</p>
                    </div>
                  </div>
                )}
                
                {/* Overlay de escaneo */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-x-4 top-1/2 transform -translate-y-1/2 h-32 border-2 border-emerald-400 rounded-lg"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-0.5 bg-emerald-400"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-full bg-emerald-400"></div>
                </div>
              </div>

              {/* Instrucciones */}
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 mb-2">
                  📱 Apunta el código de barras al cuadro verde
                </p>
                <p className="text-xs text-gray-500">
                  Asegúrate de que el código esté bien iluminado y enfocado
                </p>
              </div>

              {/* Input manual como respaldo */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  O ingresa el código manualmente:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Código del producto"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const code = (e.target as HTMLInputElement).value.trim();
                        if (code) {
                          processScannedCode(code);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="Código del producto"]') as HTMLInputElement;
                      if (input && input.value.trim()) {
                        processScannedCode(input.value.trim());
                        input.value = '';
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}