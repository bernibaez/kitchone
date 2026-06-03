import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  lineTotal: number;
}

export interface InvoiceData {
  saleNumber: string;
  customerName?: string;
  subtotal: number;
  tax: number;
  taxRatePercent?: number;
  total: number;
  items: Array<Pick<InvoiceItem, 'name' | 'quantity' | 'price'> & { lineTotal?: number }>;
  date: Date;
  paymentMethod?: string;
  paymentMethodLabel?: string;
  moneyReceived?: number;
  change?: number;
  restaurantName?: string;
  address?: string | null;
  phone?: string | null;
  currency?: string;
  invoiceFooter?: string | null;
  purchaseMessage?: string | null;
  socialInstagram?: string | null;
  socialFacebook?: string | null;
  socialTwitter?: string | null;
  // Customization fields
  paperSize?: string;
  fontSize?: number;
  fontFamily?: string;
  primaryColor?: string;
  showSocial?: boolean;
  showCustomer?: boolean;
  businessId?: string | null;
  template?: string;
  logoUrl?: string | null;
  showQr?: boolean;
}

function formatCurrency(amount: number, currency = 'DOP'): string {
  try {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transaction: 'Transferencia',
};

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ]
    : [220, 85, 25]; // Default primary
}

export const generateInvoicePDF = (data: InvoiceData): Promise<Blob> => {
  return new Promise((resolve) => {
    const paperSize = data.paperSize || 'a4';
    const isTicket = paperSize.startsWith('ticket');
    const ticketWidth = paperSize === 'ticket-58' ? 58 : 80;
    const template = data.template || 'modern';
    
    const doc = new jsPDF({
      unit: 'mm',
      format: isTicket ? [ticketWidth, 300] : paperSize,
      compress: true
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = isTicket ? 5 : 16;
    const contentW = pageW - margin * 2;

    const primaryColorHex = data.primaryColor || '#dc5519';
    const primary = hexToRgb(primaryColorHex);
    const dark: [number, number, number] = [30, 41, 59];
    const muted: [number, number, number] = [100, 116, 139];
    const light: [number, number, number] = [248, 250, 252];
    const ticketFont = 'courier';
    const baseFontSize = data.fontSize || 10;
    const fontFamily = data.fontFamily || 'helvetica';

    const restaurant = data.restaurantName?.trim() || 'Kitch One';
    const currency = data.currency || 'DOP';
    const paymentLabel =
      data.paymentMethodLabel ||
      PAYMENT_LABELS[data.paymentMethod || ''] ||
      data.paymentMethod ||
      '—';

    const rows = data.items.map((item) => {
      const qty = item.quantity;
      const unit = item.price;
      const line = item.lineTotal ?? unit * qty;
      return [
        String(qty),
        item.name,
        formatCurrency(unit, currency),
        formatCurrency(line, currency),
      ];
    });

    const taxRate = data.taxRatePercent ?? (data.subtotal > 0 ? (data.tax / data.subtotal) * 100 : 0);
    const taxLabel =
      data.tax > 0 && taxRate > 0
        ? `Impuestos (${taxRate.toFixed(1)}%)`
        : 'Impuestos';

    if (isTicket) {
      // Professional Ticket Design - Receipt Style
      const drawDashedLine = (y: number) => {
        doc.setLineDashPattern([1, 1], 0);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageW - margin, y);
        doc.setLineDashPattern([], 0);
      };

      // Force Courier for Ticket for that authentic POS look
      doc.setFont(ticketFont, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(baseFontSize + 2);
      
      // Header: Company Info
      doc.text(restaurant.toUpperCase(), pageW / 2, 10, { align: 'center' });
      
      let ty = 15;
      doc.setFont(ticketFont, 'normal');
      doc.setFontSize(baseFontSize - 1);
      if (data.address) {
        doc.text(data.address, pageW / 2, ty, { align: 'center', maxWidth: contentW });
        ty += 5;
      }
      if (data.phone) {
        doc.text(`Tel: ${data.phone}`, pageW / 2, ty, { align: 'center' });
        ty += 5;
      }

      ty += 2;
      drawDashedLine(ty);
      ty += 6;

      // Title: FACTURA DE VENTA
      doc.setFont(ticketFont, 'bold');
      doc.setFontSize(baseFontSize + 2);
      doc.text('FACTURA DE VENTA', pageW / 2, ty, { align: 'center' });
      ty += 4;
      drawDashedLine(ty);
      ty += 8;

      // Details: Factura, Fecha, Vendedor, Método
      doc.setFont(ticketFont, 'normal');
      doc.setFontSize(baseFontSize - 1);
      
      const detailsX1 = margin;
      const detailsX2 = pageW - margin;

      doc.text('Factura:', detailsX1, ty);
      doc.setFont(ticketFont, 'bold');
      doc.text(data.saleNumber, detailsX2, ty, { align: 'right' });
      ty += 5;

      doc.setFont(ticketFont, 'normal');
      doc.text('Fecha:', detailsX1, ty);
      const dateStr = data.date.toLocaleDateString('es-DO', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      }) + ' a las ' + data.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      doc.text(dateStr, detailsX2, ty, { align: 'right' });
      ty += 5;

      doc.text('Vendedor:', detailsX1, ty);
      doc.text(restaurant.toUpperCase(), detailsX2, ty, { align: 'right' });
      ty += 5;

      doc.text('Método:', detailsX1, ty);
      doc.text(paymentLabel, detailsX2, ty, { align: 'right' });
      ty += 5;

      ty += 2;
      drawDashedLine(ty);
      ty += 6;

      // Cliente Section
      doc.setFont(ticketFont, 'bold');
      doc.text('CLIENTE:', margin, ty);
      ty += 5;
      doc.setFont(ticketFont, 'normal');
      doc.text(data.customerName?.toUpperCase() || 'CLIENTE GENERAL', margin, ty);
      ty += 6;

      drawDashedLine(ty);
      ty += 6;

      // Table Headers
      doc.setFont(ticketFont, 'bold');
      doc.text('DESCRIPCIÓN', margin, ty);
      doc.text('CT', pageW - margin - 25, ty, { align: 'center' });
      doc.text('TOTAL', pageW - margin, ty, { align: 'right' });
      ty += 4;
      drawDashedLine(ty);
      ty += 6;

      // Items
      data.items.forEach((item) => {
        const qty = item.quantity;
        const unit = item.price;
        const line = item.lineTotal ?? unit * qty;

        doc.setFont(ticketFont, 'bold');
        doc.text(item.name.toLowerCase(), margin, ty);
        
        doc.setFont(ticketFont, 'normal');
        doc.text(String(qty), pageW - margin - 25, ty, { align: 'center' });
        doc.text(formatCurrency(line, currency), pageW - margin, ty, { align: 'right' });
        ty += 4;
        
        doc.setFontSize(baseFontSize - 2);
        doc.text(`${qty} x ${formatCurrency(unit, currency)}`, margin, ty);
        ty += 6;
        doc.setFontSize(baseFontSize - 1);
      });

      drawDashedLine(ty);
      ty += 6;

      // Totals
      doc.text('Subtotal:', margin, ty);
      doc.text(formatCurrency(data.subtotal, currency), pageW - margin, ty, { align: 'right' });
      ty += 5;

      const currentTaxRate = data.taxRatePercent ?? (data.subtotal > 0 ? (data.tax / data.subtotal) * 100 : 18);
      doc.text(`ITBIS (${currentTaxRate.toFixed(0)}%):`, margin, ty);
      doc.text(formatCurrency(data.tax, currency), pageW - margin, ty, { align: 'right' });
      ty += 5;

      drawDashedLine(ty);
      ty += 6;

      // GRAND TOTAL
      doc.setFontSize(baseFontSize + 2);
      doc.setFont(ticketFont, 'bold');
      doc.text('TOTAL:', margin, ty);
      doc.text(formatCurrency(data.total, currency), pageW - margin, ty, { align: 'right' });
      ty += 8;

      drawDashedLine(ty);
      ty += 8;

      // Footer
      doc.setFontSize(baseFontSize);
      doc.setFont(ticketFont, 'bold');
      const thanks = data.purchaseMessage?.toUpperCase() || '¡GRACIAS POR SU COMPRA!';
      doc.text(thanks, pageW / 2, ty, { align: 'center' });
      ty += 8;
      
      doc.setFont(ticketFont, 'normal');
      doc.setFontSize(baseFontSize - 4);
      doc.setTextColor(150, 150, 150);
      const footerMsg = (data.invoiceFooter || 'SISTEMA DE VENTAS POS - BNX').toUpperCase();
      doc.text(footerMsg, pageW / 2, ty, { align: 'center' });
      ty += 5;

    } else {
      // Professional A4/Letter Design with Templates
      if (template === 'modern') {
        // Modern Template: Bold colors, sidebar or header accent
        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(0, 0, pageW, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont(fontFamily, 'bold');
        doc.setFontSize(baseFontSize + 12);
        doc.text(restaurant, margin, 20);
        
        doc.setFontSize(baseFontSize - 1);
        doc.setFont(fontFamily, 'normal');
        if (data.businessId) doc.text(`RNC/ID: ${data.businessId}`, margin, 28);
        
        doc.setFontSize(baseFontSize + 18);
        doc.setFont(fontFamily, 'bold');
        doc.text('FACTURA', pageW - margin, 25, { align: 'right' });
        
        let y = 55;
        // Business info
        doc.setTextColor(dark[0], dark[1], dark[2]);
        doc.setFontSize(baseFontSize);
        doc.text('EMISOR', margin, y);
        y += 6;
        doc.setFont(fontFamily, 'normal');
        doc.setFontSize(baseFontSize - 1);
        doc.setTextColor(muted[0], muted[1], muted[2]);
        if (data.address) { doc.text(data.address, margin, y, { maxWidth: 80 }); y += 5; }
        if (data.phone) { doc.text(`Tel: ${data.phone}`, margin, y); y += 5; }
        
        // Invoice info (Right)
        let ry = 55;
        doc.setTextColor(dark[0], dark[1], dark[2]);
        doc.setFont(fontFamily, 'bold');
        doc.text(`Nº DE FACTURA`, pageW - margin, ry, { align: 'right' });
        ry += 6;
        doc.setFont(fontFamily, 'normal');
        doc.setTextColor(primary[0], primary[1], primary[2]);
        doc.text(data.saleNumber, pageW - margin, ry, { align: 'right' });
        ry += 8;
        doc.setTextColor(dark[0], dark[1], dark[2]);
        doc.setFont(fontFamily, 'bold');
        doc.text(`FECHA DE EMISIÓN`, pageW - margin, ry, { align: 'right' });
        ry += 6;
        doc.setFont(fontFamily, 'normal');
        doc.setTextColor(muted[0], muted[1], muted[2]);
        doc.text(data.date.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' }), pageW - margin, ry, { align: 'right' });

        y = Math.max(y, ry) + 10;
        
        // Customer info
        if (data.showCustomer !== false) {
          doc.setFillColor(light[0], light[1], light[2]);
          doc.rect(margin, y, contentW, 20, 'F');
          doc.setTextColor(dark[0], dark[1], dark[2]);
          doc.setFont(fontFamily, 'bold');
          doc.text('FACTURAR A:', margin + 5, y + 7);
          doc.setFont(fontFamily, 'normal');
          doc.text(data.customerName?.trim() || 'Consumidor Final', margin + 5, y + 14);
          y += 30;
        }

        autoTable(doc, {
          head: [['Cant.', 'Descripción', 'Precio Unit.', 'Total']],
          body: rows,
          startY: y,
          theme: 'grid',
          headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: baseFontSize - 1 },
          columnStyles: {
            0: { halign: 'center', cellWidth: 20 },
            1: { halign: 'left' },
            2: { halign: 'right', cellWidth: 35 },
            3: { halign: 'right', cellWidth: 35 }
          }
        });

      } else if (template === 'minimalist') {
        // Minimalist Template: Clean, whitespace, thin lines
        let y = 25;
        doc.setTextColor(dark[0], dark[1], dark[2]);
        doc.setFont(fontFamily, 'bold');
        doc.setFontSize(baseFontSize + 16);
        doc.text(restaurant, margin, y);
        
        doc.setFontSize(baseFontSize - 2);
        doc.setFont(fontFamily, 'normal');
        doc.setTextColor(muted[0], muted[1], muted[2]);
        y += 7;
        if (data.businessId) { doc.text(`RNC: ${data.businessId}`, margin, y); y += 4; }
        if (data.address) { doc.text(data.address, margin, y); y += 4; }
        
        y = 25;
        doc.setFont(fontFamily, 'bold');
        doc.setFontSize(baseFontSize + 10);
        doc.text('FACTURA', pageW - margin, y, { align: 'right' });
        doc.setFontSize(baseFontSize);
        y += 8;
        doc.text(data.saleNumber, pageW - margin, y, { align: 'right' });
        doc.setFont(fontFamily, 'normal');
        doc.setFontSize(baseFontSize - 2);
        y += 5;
        doc.text(data.date.toLocaleDateString(), pageW - margin, y, { align: 'right' });

        y = 50;
        doc.setDrawColor(primary[0], primary[1], primary[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageW - margin, y);
        
        y += 10;
        if (data.showCustomer !== false) {
          doc.setFontSize(baseFontSize - 2);
          doc.text('CLIENTE', margin, y);
          doc.setFontSize(baseFontSize);
          doc.setFont(fontFamily, 'bold');
          doc.text(data.customerName?.trim() || 'Consumidor Final', margin, y + 6);
          y += 15;
        }

        autoTable(doc, {
          head: [['CANT.', 'DESCRIPCIÓN', 'UNITARIO', 'TOTAL']],
          body: rows,
          startY: y,
          theme: 'plain',
          headStyles: { textColor: primary, fontStyle: 'bold', lineColor: primary, lineWidth: { bottom: 0.2 } },
          styles: { fontSize: baseFontSize - 1 },
          columnStyles: {
            0: { halign: 'center', cellWidth: 20 },
            2: { halign: 'right', cellWidth: 35 },
            3: { halign: 'right', cellWidth: 35 }
          }
        });

      } else {
        // Classic Template: Traditional layout, double lines, serif-like feel
        let y = 20;
        doc.setFont(fontFamily, 'bold');
        doc.setFontSize(baseFontSize + 14);
        doc.text(restaurant, pageW / 2, y, { align: 'center' });
        y += 7;
        doc.setFontSize(baseFontSize - 1);
        doc.setFont(fontFamily, 'normal');
        if (data.businessId) { doc.text(`RNC/ID: ${data.businessId}`, pageW / 2, y, { align: 'center' }); y += 5; }
        if (data.address) { doc.text(data.address, pageW / 2, y, { align: 'center' }); y += 5; }
        if (data.phone) { doc.text(`Tel: ${data.phone}`, pageW / 2, y, { align: 'center' }); y += 5; }
        
        y += 5;
        doc.setLineWidth(0.8);
        doc.line(margin, y, pageW - margin, y);
        doc.setLineWidth(0.2);
        doc.line(margin, y + 1, pageW - margin, y + 1);
        
        y += 10;
        doc.setFontSize(baseFontSize);
        doc.text(`FACTURA Nº: ${data.saleNumber}`, margin, y);
        doc.text(`FECHA: ${data.date.toLocaleDateString()}`, pageW - margin, y, { align: 'right' });
        
        y += 10;
        if (data.showCustomer !== false) {
          doc.rect(margin, y, contentW, 15);
          doc.text(`CLIENTE: ${data.customerName?.trim() || 'Consumidor Final'}`, margin + 5, y + 9);
          y += 20;
        }

        autoTable(doc, {
          head: [['CANT.', 'DESCRIPCIÓN', 'PRECIO', 'IMPORTE']],
          body: rows,
          startY: y,
          theme: 'striped',
          headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
          styles: { fontSize: baseFontSize - 1 },
          columnStyles: {
            0: { halign: 'center', cellWidth: 20 },
            2: { halign: 'right', cellWidth: 35 },
            3: { halign: 'right', cellWidth: 35 }
          }
        });
      }

      // Shared Totals for A4/Letter
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      const totalsW = 70;
      const totalsX = pageW - margin - totalsW;
      let ty = finalY;

      doc.setFontSize(baseFontSize);
      doc.setFont(fontFamily, 'normal');
      doc.setTextColor(muted[0], muted[1], muted[2]);
      doc.text('SUBTOTAL:', totalsX, ty);
      doc.setTextColor(dark[0], dark[1], dark[2]);
      doc.text(formatCurrency(data.subtotal, currency), pageW - margin, ty, { align: 'right' });
      ty += 6;
      
      doc.setTextColor(muted[0], muted[1], muted[2]);
      doc.text(taxLabel + ':', totalsX, ty);
      doc.setTextColor(dark[0], dark[1], dark[2]);
      doc.text(formatCurrency(data.tax, currency), pageW - margin, ty, { align: 'right' });
      ty += 8;

      doc.setFillColor(primary[0], primary[1], primary[2]);
      doc.rect(totalsX - 2, ty - 5, totalsW + 2, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(fontFamily, 'bold');
      doc.text('TOTAL:', totalsX, ty + 1.5);
      doc.text(formatCurrency(data.total, currency), pageW - margin, ty + 1.5, { align: 'right' });
      
      // Payment info (Left of totals)
      let py = finalY;
      doc.setTextColor(dark[0], dark[1], dark[2]);
      doc.setFont(fontFamily, 'bold');
      doc.text('MÉTODO DE PAGO', margin, py);
      py += 6;
      doc.setFont(fontFamily, 'normal');
      doc.setTextColor(muted[0], muted[1], muted[2]);
      doc.text(paymentLabel, margin, py);
      py += 5;
      if (data.paymentMethod === 'cash' && data.moneyReceived) {
        doc.text(`Efectivo: ${formatCurrency(data.moneyReceived, currency)}`, margin, py);
        py += 5;
        doc.text(`Cambio: ${formatCurrency(data.change || 0, currency)}`, margin, py);
      }

      // Footer
      const footerY = pageH - 30;
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, footerY, pageW - margin, footerY);
      
      let fy = footerY + 8;
      doc.setFontSize(baseFontSize - 2);
      doc.setTextColor(muted[0], muted[1], muted[2]);
      doc.text(data.purchaseMessage || '¡Gracias por su preferencia!', pageW / 2, fy, { align: 'center' });
      fy += 5;
      if (data.invoiceFooter) {
        doc.text(data.invoiceFooter, pageW / 2, fy, { align: 'center', maxWidth: contentW });
        fy += 5;
      }

      if (data.showSocial !== false) {
        const social = [];
        if (data.socialInstagram) social.push(`IG: ${data.socialInstagram}`);
        if (data.socialFacebook) social.push(`FB: ${data.socialFacebook}`);
        if (social.length > 0) {
          doc.text(social.join('  |  '), pageW / 2, fy, { align: 'center' });
        }
      }
    }

    const blob = doc.output('blob');
    resolve(blob);
  });
};
