import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Quotation } from './quotations';

interface QuotationPdfConfig {
  restaurantName?: string;
  businessId?: string | null;
  phone?: string | null;
  address?: string | null;
  currency?: string;
  logoUrl?: string | null;
  primaryColor?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [240, 122, 46]; // Brand accent default
}

function formatMoney(amount: number, currency = 'DOP'): string {
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

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    return d.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const STATUS_LABELS: Record<string, string> = {
  borrador: 'BORRADOR',
  enviada: 'ENVIADA',
  aprobada: 'APROBADA',
  rechazada: 'RECHAZADA',
  facturada: 'FACTURADA',
};

export async function generateQuotationPDF(
  quote: Quotation,
  config: QuotationPdfConfig = {}
): Promise<Blob> {
  return new Promise((resolve) => {
    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 16;
    const contentW = pageW - margin * 2;

    const brandColor = hexToRgb(config.primaryColor || '#F07A2E');
    const darkColor: [number, number, number] = [28, 25, 23];
    const mutedColor: [number, number, number] = [100, 116, 139];
    const lineGray: [number, number, number] = [226, 232, 240];

    const restaurant = config.restaurantName?.trim() || 'Kitch One';
    const currency = config.currency || 'DOP';

    let y = margin;

    // Header top decorative bar
    doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.rect(0, 0, pageW, 5, 'F');

    y += 4;

    // Left: Restaurant Info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(restaurant, margin, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);

    let restY = y + 11;
    if (config.businessId) {
      doc.text(`RNC / ID: ${config.businessId}`, margin, restY);
      restY += 4.5;
    }
    if (config.phone) {
      doc.text(`Teléfono: ${config.phone}`, margin, restY);
      restY += 4.5;
    }
    if (config.address) {
      doc.text(config.address, margin, restY, { maxWidth: 90 });
      restY += 4.5;
    }

    // Right: Quotation Badge & Folio
    const rightX = pageW - margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text('COTIZACIÓN', rightX, y + 6, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(quote.quote_number, rightX, y + 12, { align: 'right' });

    // Status chip
    const statusText = STATUS_LABELS[quote.status] || quote.status.toUpperCase();
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(rightX - 30, y + 15, 30, 6, 1.5, 1.5, 'FD');
    doc.setTextColor(71, 85, 105);
    doc.text(statusText, rightX - 15, y + 19.3, { align: 'center' });

    y = Math.max(restY + 6, y + 26);

    // Separator line
    doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageW - margin, y);

    y += 6;

    // Two-column metadata cards: Client Info & Quote Details
    const boxW = (contentW - 6) / 2;
    const boxH = 28;

    // Card 1: Cliente
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
    doc.roundedRect(margin, y, boxW, boxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text('INFORMACIÓN DEL CLIENTE', margin + 4, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(quote.customer_name, margin + 4, y + 11.5, { maxWidth: boxW - 8 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    let cy = y + 16.5;
    if (quote.customer_phone) {
      doc.text(`Tel: ${quote.customer_phone}`, margin + 4, cy);
      cy += 4;
    }
    if (quote.customer_email) {
      doc.text(`Email: ${quote.customer_email}`, margin + 4, cy, { maxWidth: boxW - 8 });
    }

    // Card 2: Condiciones y Fechas
    const card2X = margin + boxW + 6;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
    doc.roundedRect(card2X, y, boxW, boxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text('DETALLES DE LA COTIZACIÓN', card2X + 4, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);

    doc.text(`Fecha de Emisión:`, card2X + 4, y + 11);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDate(quote.date), card2X + 38, y + 11);

    doc.setFont('helvetica', 'normal');
    doc.text(`Válida hasta:`, card2X + 4, y + 16);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDate(quote.valid_until), card2X + 38, y + 16);

    if (quote.event_date) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha de Evento:`, card2X + 4, y + 21);
      doc.setFont('helvetica', 'bold');
      doc.text(formatDate(quote.event_date), card2X + 38, y + 21);
    }

    y += boxH + 7;

    // Items Table using autoTable
    const safeItems = Array.isArray(quote.items) ? quote.items : [];
    const tableBody = safeItems.map((it: { description: any; name: any; discount_percent: any; quantity: any; price: number; subtotal: number; }, idx: number) => {
      const desc = it.description ? `${it.name}\n${it.description}` : it.name;
      const discount = it.discount_percent ? `${it.discount_percent}%` : '—';
      return [
        String(idx + 1),
        String(it.quantity),
        desc,
        formatMoney(it.price, currency),
        discount,
        formatMoney(it.subtotal, currency),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['#', 'Cant.', 'Descripción / Platillo', 'Precio Unit.', 'Desc.', 'Total']],
      body: tableBody,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: brandColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left',
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 16, halign: 'center' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 30, halign: 'right' },
      },
      styles: {
        fontSize: 8.5,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || y + 50;
    let totY = finalY + 6;

    // Totals Box (Right aligned)
    const totBoxW = 75;
    const totBoxX = pageW - margin - totBoxW;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
    doc.roundedRect(totBoxX, totY, totBoxW, 36, 2, 2, 'FD');

    let rowY = totY + 7;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text('Subtotal:', totBoxX + 5, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(formatMoney(quote.subtotal, currency), pageW - margin - 5, rowY, { align: 'right' });

    if (quote.discount_amount > 0) {
      rowY += 5.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.text('Descuento General:', totBoxX + 5, rowY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28);
      doc.text(`-${formatMoney(quote.discount_amount, currency)}`, pageW - margin - 5, rowY, { align: 'right' });
    }

    if (quote.tax_amount > 0) {
      rowY += 5.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.text(`Impuestos (${quote.tax_percentage}%):`, totBoxX + 5, rowY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(formatMoney(quote.tax_amount, currency), pageW - margin - 5, rowY, { align: 'right' });
    }

    rowY += 7;
    doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
    doc.line(totBoxX + 4, rowY - 2, pageW - margin - 4, rowY - 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text('TOTAL:', totBoxX + 5, rowY + 3);
    doc.text(formatMoney(quote.total, currency), pageW - margin - 5, rowY + 3, { align: 'right' });

    // Notes & Terms (Left side)
    const notesW = contentW - totBoxW - 8;
    if (quote.notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.text('TÉRMINOS Y CONDICIONES:', margin, totY + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.text(quote.notes, margin, totY + 10, { maxWidth: notesW });
    }

    // Signature Acceptance Block at bottom
    const sigY = pageH - 30;
    doc.setDrawColor(lineGray[0], lineGray[1], lineGray[2]);
    doc.line(margin, sigY, margin + 70, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text('Firma de aceptación del cliente', margin, sigY + 4);
    doc.text('Fecha: ______ / ______ / ________', margin, sigY + 8);

    doc.line(pageW - margin - 70, sigY, pageW - margin, sigY);
    doc.text(`Autorizado por: ${restaurant}`, pageW - margin - 70, sigY + 4);

    // Footer
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Este documento es una cotización estimada y no representa una factura fiscal definitiva.',
      pageW / 2,
      pageH - 8,
      { align: 'center' }
    );

    resolve(doc.output('blob'));
  });
}

export async function downloadQuotationPDF(quote: Quotation, config: QuotationPdfConfig = {}) {
  const blob = await generateQuotationPDF(quote, config);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Cotizacion_${quote.quote_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function printQuotationPDF(quote: Quotation, config: QuotationPdfConfig = {}) {
  const blob = await generateQuotationPDF(quote, config);
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = url;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 2000);
  };
}

export function generateWhatsAppMessage(quote: Quotation, restaurantName = 'Kitch One', currency = 'DOP'): string {
  const lines: string[] = [
    `📋 *COTIZACIÓN ${quote.quote_number}*`,
    `🏢 *${restaurantName}*`,
    `👤 *Cliente:* ${quote.customer_name}`,
    `📅 *Fecha:* ${formatDate(quote.date)}`,
  ];

  if (quote.valid_until) {
    lines.push(`⏳ *Válida hasta:* ${formatDate(quote.valid_until)}`);
  }
  if (quote.event_date) {
    lines.push(`🎉 *Fecha de Evento:* ${formatDate(quote.event_date)}`);
  }

  lines.push('');
  lines.push('*DETALLE DE PLATILLOS / SERVICIOS:*');

  const safeItems = Array.isArray(quote.items) ? quote.items : [];
  safeItems.forEach((it: { subtotal: number; quantity: any; name: any; description: any; }) => {
    const itemTotal = formatMoney(it.subtotal, currency);
    lines.push(`• ${it.quantity}x ${it.name} - ${itemTotal}`);
    if (it.description) {
      lines.push(`   _${it.description}_`);
    }
  });

  lines.push('');
  lines.push(`*Subtotal:* ${formatMoney(quote.subtotal, currency)}`);
  if (quote.discount_amount > 0) {
    lines.push(`*Descuento:* -${formatMoney(quote.discount_amount, currency)}`);
  }
  if (quote.tax_amount > 0) {
    lines.push(`*Impuestos (${quote.tax_percentage}%):* ${formatMoney(quote.tax_amount, currency)}`);
  }
  lines.push(`*TOTAL:* ${formatMoney(quote.total, currency)}`);

  if (quote.notes) {
    lines.push('');
    lines.push(`📌 *Condiciones:* ${quote.notes}`);
  }

  lines.push('');
  lines.push(`¡Muchas gracias por su preferencia! Quedamos a su disposición.`);

  return lines.join('\n');
}
