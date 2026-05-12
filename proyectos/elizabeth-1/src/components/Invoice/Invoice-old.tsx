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

// Estilos para impresión solo de la factura
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
    padding: 15mm !important;
    margin: 0 !important;
    overflow: visible !important;
    font-size: 14px !important;
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
    font-size: 32px !important;
  }
  .print-area .text-3xl {
    font-size: 28px !important;
  }
  .print-area .text-2xl {
    font-size: 24px !important;
  }
  .print-area .text-xl {
    font-size: 20px !important;
  }
  .print-area .text-lg {
    font-size: 14px !important;
  }
  .print-area .text-base {
    font-size: 14px !important;
  }
  .print-area .text-sm {
    font-size: 18px !important;
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
    padding: 8px !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-area .rounded-lg {
    border-radius: 8px !important;
  }
  @page {
    margin: 10mm;
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

export default function Invoice({ invoiceData }: { invoiceData: InvoiceData }) {
  const sizeConfig = getInvoiceSizeConfig(
    invoiceData.invoiceSize || 'medium', 
    (invoiceData.fontSize || 100) / 100
  );
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
      <div className="bg-white w-full max-w-[210mm] mx-auto print-area shadow-lg">
        {/* Header con logo y número de factura */}
        <div className="border-b border-gray-300 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-6">
              {/* Logo */}
              {invoiceData.company.logo ? (
                <img 
                  src={invoiceData.company.logo} 
                  alt="Logo" 
                  className="w-20 h-20 rounded-lg object-cover border" 
                  style={{imageRendering: 'crisp-edges', WebkitImageRendering: 'optimize-contrast'} as React.CSSProperties}
                />
              ) : (
                <div className="w-20 h-20 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">
                    {invoiceData.company.name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-800">{invoiceData.company.name}</h1>
                {invoiceData.company.address && (
                  <p className="text-base text-gray-600 mt-1">{invoiceData.company.address}</p>
                )}
                {invoiceData.company.phone && (
                  <p className="text-base text-gray-600">{invoiceData.company.phone}</p>
                )}
                {invoiceData.company.email && (
                  <p className="text-base text-gray-600">{invoiceData.company.email}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-base text-gray-500">Factura</div>
              <div className="text-4xl font-bold text-gray-800">#{invoiceData.number}</div>
              <div className="text-base text-gray-500 mt-2">{formatDate(invoiceData.date)}</div>
            </div>
          </div>
        </div>

        {/* Información del cliente */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Información del Cliente</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-base text-gray-500">Nombre</p>
                <p className="font-semibold text-lg">{invoiceData.client.name || 'Cliente General'}</p>
              </div>
              {invoiceData.client.phone && (
                <div>
                  <p className="text-base text-gray-500">Teléfono</p>
                  <p className="font-semibold text-lg">{invoiceData.client.phone}</p>
                </div>
              )}
              {invoiceData.client.email && (
                <div>
                  <p className="text-base text-gray-500">Email</p>
                  <p className="font-semibold text-lg">{invoiceData.client.email}</p>
                </div>
              )}
              {invoiceData.client.address && (
                <div>
                  <p className="text-base text-gray-500">Dirección</p>
                  <p className="font-semibold text-lg">{invoiceData.client.address}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Detalles de la Compra</h2>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3 font-semibold text-gray-700">Producto</th>
                  <th className="text-center p-3 font-semibold text-gray-700">Cantidad</th>
                  <th className="text-center p-3 font-semibold text-gray-700">Precio Unit.</th>
                  <th className="text-center p-3 font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200 last:border-b-0">
                    <td className="p-3 text-base">{item.name}</td>
                    <td className="text-center p-3 text-base">{item.qty}</td>
                    <td className="text-center p-3 text-base">{formatCurrency(item.price)}</td>
                    <td className="text-center p-3 font-semibold text-base">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumen del pago */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Resumen del Pago</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-base">Subtotal</span>
                <span className="font-semibold text-base">{formatCurrency(invoiceData.total - invoiceData.ivaAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-base">IVA ({invoiceData.ivaPercent}%)</span>
                <span className="font-semibold text-base">{formatCurrency(invoiceData.ivaAmount)}</span>
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-800">Total</span>
                  <span className="text-xl font-bold text-blue-600">{formatCurrency(invoiceData.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información de pago */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Información de Pago</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-base text-gray-500">Método de Pago</p>
                <p className="font-semibold text-lg">{getPaymentMethod()}</p>
              </div>
              <div>
                <p className="text-base text-gray-500">Titular</p>
                <p className="font-semibold text-lg">{invoiceData.payment.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 pt-6">
          <div className="text-center">
            <p className="text-xl font-semibold text-gray-800 mb-3">
              {invoiceData.company.message || '¡Gracias por su compra!'}
            </p>
            <p className="text-base text-gray-600">
              Esperamos que disfrute de sus productos. Para cualquier consulta, no dude en contactarnos.
            </p>
            <div className="mt-6 flex justify-center gap-6">
              {invoiceData.company.phone && (
                <span className="text-base text-gray-500">📞 {invoiceData.company.phone}</span>
              )}
              {invoiceData.company.email && (
                <span className="text-base text-gray-500">✉️ {invoiceData.company.email}</span>
              )}
              {invoiceData.company.address && (
                <span className="text-base text-gray-500">🌐 {invoiceData.company.address}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}