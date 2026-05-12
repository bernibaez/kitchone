import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../../index.css';
import { getInvoiceSizeConfig } from '../../lib/invoice-config';

interface InvoiceItem {
  name: string;
  qty: string | number;
  price: number;
  total: number;
}

interface InvoiceData {
  number: string;
  client: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  company: {
    name: string;
    email: string;
    phone: string;
    address: string;
    logo?: string;
    socials?: Record<string, string>;
    message?: string;
  };
  items: InvoiceItem[];
  ivaPercent: number;
  ivaAmount: number;
  total: number;
  payment: {
    bank: string;
    name: string;
  };
  date: string;
  invoiceSize?: 'small' | 'medium' | 'large' | 'extra-large';
  fontSize?: number;
}

// Estilos para impresión solo de la factura - will be generated dynamically

export default function Invoice({ invoiceData }: { invoiceData: InvoiceData }) {
  const sizeConfig = getInvoiceSizeConfig(
    invoiceData.invoiceSize || 'medium', 
    (invoiceData.fontSize || 100) / 100
  );

  // Estilos dinámicos para impresión
  const printStyles = `
@media print {
  body * {
    visibility: hidden !important;
  }
  .print-area, .print-area * {
    visibility: visible !important;
  }
  .print-area {
    position: relative !important;
    left: 0 !important;
    top: 0 !important;
    transform: none !important;
    width: 100% !important;
    height: auto !important;
    background: white !important;
    z-index: 9999;
    box-shadow: none !important;
    padding: 10mm !important;
    margin: 0 !important;
    overflow: visible !important;
    font-size: ${sizeConfig.baseFontSize} !important;
    line-height: 1.5 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    -webkit-font-smoothing: antialiased !important;
    -moz-osx-font-smoothing: grayscale !important;
    text-rendering: optimizeLegibility !important;
    image-rendering: -webkit-optimize-contrast !important;
    image-rendering: crisp-edges !important;
  }
  .print-area .text-4xl {
    font-size: ${sizeConfig.text4xl} !important;
  }
  .print-area .text-3xl {
    font-size: ${sizeConfig.text3xl} !important;
  }
  .print-area .text-2xl {
    font-size: ${sizeConfig.text2xl} !important;
  }
  .print-area .text-xl {
    font-size: ${sizeConfig.textXl} !important;
  }
  .print-area .text-lg {
    font-size: ${sizeConfig.textLg} !important;
  }
  .print-area .text-base {
    font-size: ${sizeConfig.textBase} !important;
  }
  .print-area .text-sm {
    font-size: ${sizeConfig.textSm} !important;
  }
  .print-area .bg-gray-50 {
    background: #f9fafb !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-area .bg-gray-100 {
    background: #f3f4f6 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-area .bg-blue-600 {
    background: #2563eb !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-area .border {
    border: 1px solid #e5e7eb !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-area .border-b {
    border-bottom: 1px solid #e5e7eb !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-area .border-t {
    border-top: 1px solid #e5e7eb !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-area .text-blue-600 {
    color: #2563eb !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-area .text-gray-800 {
    color: #1f2937 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-area .text-gray-700 {
    color: #374151 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-area .text-gray-600 {
    color: #4b5563 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-area .text-gray-500 {
    color: #6b7280 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-area .text-white {
    color: white !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-area table {
    border-collapse: collapse !important;
    width: 100% !important;
  }
  .print-area table td,
  .print-area table th {
    border: 1px solid #e5e7eb !important;
    padding: ${sizeConfig.tablePadding} !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-area .rounded-lg {
    border-radius: 8px !important;
  }
  @page {
    margin: 5mm;
    size: A4;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    print-resolution: 300dpi;
  }
  @media print {
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      text-rendering: optimizeLegibility !important;
    }
  }
}
`;

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.text('FACTURA', 14, 18);
    doc.setFontSize(12);
    doc.text(`Nº: ${invoiceData.number}`, 14, 28);

    doc.text('DATOS DEL CLIENTE', 14, 40);
    doc.text([
      invoiceData.client.name,
      invoiceData.client.email,
      invoiceData.client.phone,
      invoiceData.client.address
    ], 14, 46);

    doc.text('DATOS DE LA EMPRESA', 110, 40);
    doc.text([
      invoiceData.company.name,
      invoiceData.company.email,
      invoiceData.company.phone,
      invoiceData.company.address
    ], 110, 46);

    autoTable(doc, {
      startY: 70,
      head: [['Producto', 'Cantidad', 'Precio', 'Total']],
      body: invoiceData.items.map(item => [
        item.name, item.qty, `${item.price} €`, `${item.total} €`
      ]),
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 90;

    doc.text(`IVA: ${invoiceData.ivaPercent}%   ${invoiceData.ivaAmount} €`, 14, finalY + 10);
    doc.setFontSize(14);
    doc.text(`TOTAL: ${invoiceData.total} €`, 14, finalY + 20);

    doc.save(`Factura_${invoiceData.number}.pdf`);
  };

  // Formateo de moneda
  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount);

  // Fecha formateada
  const formatDate = (dateStr: string) => {
    try {
      // Si ya es una fecha formateada (viene del punto de venta), la devolvemos tal como está
      if (dateStr.includes(',') && dateStr.includes(':')) {
        return dateStr;
      }
      
      // Si es una fecha ISO o string, la parseamos
      const date = new Date(dateStr);
      
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        return 'Fecha no disponible';
      }
      
      return date.toLocaleString('es-DO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return 'Fecha no disponible';
    }
  };

  // Obtener método de pago formateado
  const getPaymentMethod = () => {
    const paymentMethods = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta de Crédito/Débito',
      transferencia: 'Transferencia Bancaria',
      cheque: 'Cheque'
    };
    return paymentMethods[invoiceData.payment.bank as keyof typeof paymentMethods] || invoiceData.payment.bank;
  };

  return (
    <>
      <style>{printStyles}</style>
      <div className="bg-white w-full max-w-[180mm] mx-auto print-area shadow-lg">
        {/* Header - Logo and Company Info */}
        <div className="mb-4">
          <div className="flex items-start gap-4">
            {/* Logo Geométrico Simple */}
            {invoiceData.company.logo ? (
              <img 
                src={invoiceData.company.logo} 
                alt="Logo" 
                className="w-12 h-12 object-contain"
                style={{filter: 'brightness(0)'}}
              />
            ) : (
              <div className="w-12 h-12 bg-black flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {invoiceData.company.name.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-4xl font-bold uppercase tracking-wide text-black">
                {invoiceData.company.name}
              </h1>
              <p className="text-xl text-gray-800 mt-1">
                {invoiceData.company.address}
              </p>
            </div>
          </div>
        </div>

        {/* Divider Line */}
        <div className="border-b border-gray-900 mb-4"></div>

        {/* Invoice Info and Recipient */}
        <div className="grid grid-cols-2 gap-6 mb-4">
          {/* Left Side - Invoice Info */}
          <div>
            <h2 className="text-5xl font-bold uppercase text-black mb-2">FACTURA</h2>
            <div className="space-y-1">
              <p className="text-xl text-black">N° {invoiceData.number}</p>
              <p className="text-xl text-black">{formatDate(invoiceData.date)}</p>
            </div>
          </div>

          {/* Right Side - Recipient */}
          <div>
            <h3 className="text-xl font-bold uppercase text-black mb-2">DESTINATARIO</h3>
            <div className="space-y-1">
              <p className="text-xl text-black">{invoiceData.client.name || 'Cliente General'}</p>
              {invoiceData.client.phone && <p className="text-xl text-black">{invoiceData.client.phone}</p>}
              {invoiceData.client.address && <p className="text-xl text-black">{invoiceData.client.address}</p>}
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="mb-4">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xl font-bold uppercase text-black pb-2">ARTÍCULO</th>
                <th className="text-center text-xl font-bold uppercase text-black pb-2">CANTIDAD</th>
                <th className="text-right text-xl font-bold uppercase text-black pb-2">PRECIO UNITARIO</th>
                <th className="text-right text-xl font-bold uppercase text-black pb-2">TOTAL</th>
              </tr>
            </thead>
            <thead>
              <tr>
                <td colSpan={4} className="border-b border-gray-900 pb-2"></td>
              </tr>
            </thead>
            <tbody>
              {invoiceData.items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-3">
                    <p className="text-xl font-bold text-black">{item.name}</p>
                  </td>
                  <td className="py-3 text-center text-xl text-black">{item.qty}</td>
                  <td className="py-3 text-right text-xl text-black">{formatCurrency(item.price)}</td>
                  <td className="py-3 text-right text-xl font-bold text-black">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment Method and Totals */}
        <div className="grid grid-cols-2 gap-6 mb-4">
          {/* Left Side - Payment Method */}
          <div>
            <h3 className="text-xl font-bold uppercase text-black mb-2">MÉTODO DE PAGO</h3>
            <p className="text-xl text-black">{getPaymentMethod()}</p>
          </div>

          {/* Right Side - Totals */}
          <div className="text-right space-y-2">
            <div className="flex justify-between text-xl text-black">
              <span>Subtotal</span>
              <span>{formatCurrency(invoiceData.total - invoiceData.ivaAmount)}</span>
            </div>
            <div className="flex justify-between text-xl text-black">
              <span>IVA (16%)</span>
              <span>{formatCurrency(invoiceData.ivaAmount)}</span>
            </div>
            <div className="flex justify-between text-3xl font-bold text-black pt-2">
              <span>TOTAL</span>
              <span>{formatCurrency(invoiceData.total)}</span>
            </div>
          </div>
        </div>

        {/* Footer - Thank You Message */}
        <div className="text-center pt-4 border-t border-gray-900">
          <p className="text-3xl font-bold uppercase text-black mb-2">¡MUCHAS GRACIAS!</p>
          <div className="text-lg text-black space-y-1">
            {invoiceData.company.email && <p>{invoiceData.company.email}</p>}
            {invoiceData.company.phone && <p>{invoiceData.company.phone}</p>}
          </div>
        </div>
      </div>
    </>
  );
}
