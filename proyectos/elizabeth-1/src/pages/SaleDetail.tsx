import React from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import Invoice from '../components/Invoice/Invoice';

export default function SaleDetail() {
  const { id } = useParams(); // El id de la venta desde la URL
  const { state } = useApp();

  // Buscar la venta por ID
  const sale = state.sales.find(s => String(s.id) === String(id));
  if (!sale) return <div>Venta no encontrada</div>;

  // Buscar el cliente
  const client = state.customers.find(c => String(c.id) === String(sale.customerId));

  // Buscar la empresa (puedes obtenerla de state.config)
  const company = {
    name: state.config.name,
    email: state.config.email || '',
    phone: state.config.phone || '',
    address: state.config.address || ''
  };

  // Mapear los items de la venta
  const items = sale.items.map(item => ({
    name: item.productName,
    qty: item.quantity,
    price: item.price,
    total: item.subtotal
  }));

  // Calcular IVA y total
  const ivaPercent = state.config.taxRate || 0;
  const ivaAmount = sale.tax;
  const total = sale.total;

  // Información de pago (puedes personalizarlo)
  const payment = {
    bank: 'Banco Borcelle',
    name: company.name
  };

  // Preparar los datos para el componente Invoice
  const invoiceData = {
    number: sale.invoiceNumber,
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
    date: (() => {
      const d = sale.date instanceof Date ? sale.date : new Date(sale.date);
      return d.toLocaleString(); // Muestra fecha y hora local
    })()
  };

  return <Invoice invoiceData={invoiceData} />;
}
