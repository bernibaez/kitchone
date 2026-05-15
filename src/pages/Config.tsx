import { useEffect, useState } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { useNotification } from '../contexts/NotificationContext';
import { Save, Store, Phone, MapPin, Receipt, Percent, Building2, Coins, Instagram, Facebook, Twitter, MessageSquare, FileText, Type, Maximize, Palette, Eye } from 'lucide-react';
import { generateInvoicePDF } from '../lib/invoice';

export default function Config() {
  const { config, updateConfig, loading } = useConfig();
  const { showNotification } = useNotification();
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Local state for form management
  const [formData, setFormData] = useState({
    restaurant_name: '',
    tax_percentage: '',
    address: '',
    phone: '',
    currency: 'DOP',
    social_instagram: '',
    social_facebook: '',
    social_twitter: '',
    purchase_message: '',
    invoice_footer: '',
    invoice_paper_size: 'a4',
    invoice_font_size: '10',
    invoice_font_family: 'helvetica',
    invoice_primary_color: '#dc5519',
    invoice_show_social: true,
    invoice_show_customer: true,
    business_id: '',
    invoice_template: 'modern',
    invoice_show_qr: true,
  });

  // Sync state with context when config loads
  useEffect(() => {
    if (config) {
      setFormData({
        restaurant_name: config.restaurant_name || '',
        tax_percentage: config.tax_percentage?.toString() || '',
        address: config.address || '',
        phone: config.phone || '',
        currency: config.currency || 'DOP',
        social_instagram: config.social_instagram || '',
        social_facebook: config.social_facebook || '',
        social_twitter: config.social_twitter || '',
        purchase_message: config.purchase_message || '',
        invoice_footer: config.invoice_footer || '',
        invoice_paper_size: config.invoice_paper_size || 'a4',
        invoice_font_size: config.invoice_font_size?.toString() || '10',
        invoice_font_family: config.invoice_font_family || 'helvetica',
        invoice_primary_color: config.invoice_primary_color || '#dc5519',
        invoice_show_social: config.invoice_show_social ?? true,
        invoice_show_customer: config.invoice_show_customer ?? true,
        business_id: config.business_id || '',
        invoice_template: config.invoice_template || 'modern',
        invoice_show_qr: config.invoice_show_qr ?? true,
      });
    }
  }, [config]);

  useEffect(() => {
    if (previewUrl) {
      handlePreview();
    }
  }, [formData]);

  const handlePreview = async () => {
    const previewData = {
      saleNumber: 'FAC-000001',
      customerName: 'Cliente de Prueba',
      subtotal: 1000,
      tax: 180,
      taxRatePercent: 18,
      total: 1180,
      items: [
        { name: 'Producto de Ejemplo 1', quantity: 2, price: 350, lineTotal: 700 },
        { name: 'Producto de Ejemplo 2', quantity: 1, price: 300, lineTotal: 300 },
      ],
      date: new Date(),
      paymentMethod: 'cash',
      paymentMethodLabel: 'Efectivo',
      moneyReceived: 2000,
      change: 820,
      restaurantName: formData.restaurant_name,
      address: formData.address,
      phone: formData.phone,
      currency: formData.currency,
      invoiceFooter: formData.invoice_footer,
      purchaseMessage: formData.purchase_message,
      socialInstagram: formData.social_instagram,
      socialFacebook: formData.social_facebook,
      socialTwitter: formData.social_twitter,
      paperSize: formData.invoice_paper_size,
      fontSize: parseInt(formData.invoice_font_size),
      fontFamily: formData.invoice_font_family,
      primaryColor: formData.invoice_primary_color,
      showSocial: formData.invoice_show_social,
      showCustomer: formData.invoice_show_customer,
      businessId: formData.business_id,
      template: formData.invoice_template,
      showQr: formData.invoice_show_qr,
    };

    const blob = await generateInvoicePDF(previewData);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateConfig({
        restaurant_name: formData.restaurant_name,
        tax_percentage: parseFloat(formData.tax_percentage),
        address: formData.address || null,
        phone: formData.phone || null,
        currency: formData.currency,
        social_instagram: formData.social_instagram || null,
        social_facebook: formData.social_facebook || null,
        social_twitter: formData.social_twitter || null,
        purchase_message: formData.purchase_message || null,
        invoice_footer: formData.invoice_footer || null,
        invoice_paper_size: formData.invoice_paper_size,
        invoice_font_size: parseInt(formData.invoice_font_size),
        invoice_font_family: formData.invoice_font_family,
        invoice_primary_color: formData.invoice_primary_color,
        invoice_show_social: formData.invoice_show_social,
        invoice_show_customer: formData.invoice_show_customer,
        business_id: formData.business_id || null,
        invoice_template: formData.invoice_template,
        invoice_show_qr: formData.invoice_show_qr,
      });

      showNotification({
        type: 'success',
        title: 'Configuración guardada',
        message: 'Los cambios se han aplicado correctamente en todo el sistema.',
      });
    } catch (error) {
      console.error('Error saving config:', error instanceof Error ? error.message : JSON.stringify(error));
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron guardar los cambios.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-500 mt-1">Administra los datos generales de tu restaurante y facturación.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Column - General Info */}
        <div className="space-y-6">
          {/* Card: Identity */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                <Store className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Identidad del Negocio</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Restaurante</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.restaurant_name}
                      onChange={(e) => setFormData({ ...formData, restaurant_name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder="Ej. Kitch One"
                      required
                    />
                    <Building2 className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">RNC / Identificación Fiscal</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.business_id}
                      onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder="Ej. 1-31-12345-6"
                    />
                    <FileText className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1.5 ml-1">Esta información aparecerá en la cabecera de todas tus facturas.</p>
            </div>
          </div>

          {/* Card: Contact Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <MapPin className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Información de Contacto</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Calle Principal #123"
                  />
                  <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="+52 555 123 4567"
                  />
                  <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Social Media */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Instagram className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Redes Sociales</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.social_instagram}
                    onChange={(e) => setFormData({ ...formData, social_instagram: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="@tu_restaurante"
                  />
                  <Instagram className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Facebook</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.social_facebook}
                    onChange={(e) => setFormData({ ...formData, social_facebook: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="facebook.com/tu_restaurante"
                  />
                  <Facebook className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Twitter/X</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.social_twitter}
                    onChange={(e) => setFormData({ ...formData, social_twitter: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="@tu_restaurante"
                  />
                  <Twitter className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Invoice Messages */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Mensajes de Factura</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mensaje de Compra</label>
                <div className="relative">
                  <textarea
                    value={formData.purchase_message}
                    onChange={(e) => setFormData({ ...formData, purchase_message: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="¡Gracias por su compra! Esperamos verle pronto."
                    rows={3}
                  />
                  <MessageSquare className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Este mensaje aparecerá en las facturas de venta.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pie de Factura</label>
                <div className="relative">
                  <textarea
                    value={formData.invoice_footer}
                    onChange={(e) => setFormData({ ...formData, invoice_footer: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="No se aceptan devoluciones en alimentos preparados."
                    rows={3}
                  />
                  <FileText className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Texto adicional que aparecerá al final de las facturas.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Financials & Invoice Design */}
        <div className="space-y-6">
          {/* Card: Financials */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
              <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                <Receipt className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Facturación y Moneda</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Moneda del Sistema</label>
                <div className="relative">
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all appearance-none bg-white"
                  >
                    <option value="DOP">Peso Dominicano (DOP)</option>
                    <option value="USD">Dólar Estadounidense (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                  <Coins className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Impuesto por defecto (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tax_percentage}
                    onChange={(e) => setFormData({ ...formData, tax_percentage: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="16"
                    required
                  />
                  <Percent className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Invoice Design */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                <Palette className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Diseño de Factura</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plantilla de Diseño</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['modern', 'classic', 'minimalist'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, invoice_template: t })}
                      className={`py-2 px-3 rounded-xl border-2 transition-all text-xs font-bold capitalize ${
                        formData.invoice_template === t
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      {t === 'modern' ? 'Moderna' : t === 'classic' ? 'Clásica' : 'Minimalista'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tamaño de Papel</label>
                  <div className="relative">
                    <select
                      value={formData.invoice_paper_size}
                      onChange={(e) => setFormData({ ...formData, invoice_paper_size: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all appearance-none bg-white"
                    >
                      <option value="a4">A4 (Estándar)</option>
                      <option value="letter">Carta (Letter)</option>
                      <option value="legal">Legal</option>
                      <option value="ticket-80">Ticket 80mm</option>
                      <option value="ticket-58">Ticket 58mm</option>
                    </select>
                    <Maximize className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fuente</label>
                  <div className="relative">
                    <select
                      value={formData.invoice_font_family}
                      onChange={(e) => setFormData({ ...formData, invoice_font_family: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all appearance-none bg-white"
                    >
                      <option value="helvetica">Helvetica (Moderna)</option>
                      <option value="courier">Courier (Ticket/Retro)</option>
                      <option value="times">Times New Roman</option>
                    </select>
                    <Type className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tamaño de Letra</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="8"
                      max="14"
                      value={formData.invoice_font_size}
                      onChange={(e) => setFormData({ ...formData, invoice_font_size: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                    <Type className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color Principal</label>
                  <div className="relative">
                    <input
                      type="color"
                      value={formData.invoice_primary_color}
                      onChange={(e) => setFormData({ ...formData, invoice_primary_color: e.target.value })}
                      className="w-full h-[42px] p-1 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all cursor-pointer"
                    />
                    <Palette className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group p-3 bg-gray-50 rounded-xl border border-transparent hover:border-orange-200 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.invoice_show_social}
                    onChange={(e) => setFormData({ ...formData, invoice_show_social: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-xs font-bold text-gray-700 group-hover:text-gray-900 transition-colors">Redes Sociales</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group p-3 bg-gray-50 rounded-xl border border-transparent hover:border-orange-200 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.invoice_show_customer}
                    onChange={(e) => setFormData({ ...formData, invoice_show_customer: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-xs font-bold text-gray-700 group-hover:text-gray-900 transition-colors">Datos Cliente</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group p-3 bg-gray-50 rounded-xl border border-transparent hover:border-orange-200 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.invoice_show_qr}
                    onChange={(e) => setFormData({ ...formData, invoice_show_qr: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-xs font-bold text-gray-700 group-hover:text-gray-900 transition-colors">Código QR</span>
                </label>
              </div>

              <button
                type="button"
                onClick={handlePreview}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg"
              >
                <Eye className="w-5 h-5" />
                Generar Vista Previa Profesional
              </button>
            </div>
          </div>

          {/* Preview Area */}
          {previewUrl && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-orange-500" />
                  Vista Previa
                </h3>
                <button 
                  type="button"
                  onClick={() => setPreviewUrl(null)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cerrar
                </button>
              </div>
              <iframe 
                src={previewUrl} 
                className="w-full h-[400px] border border-gray-100 rounded-lg shadow-inner"
                title="Invoice Preview"
              />
              <p className="text-[10px] text-gray-400 mt-2 text-center italic">
                Nota: Esta es una representación visual aproximada.
              </p>
            </div>
          )}

          {/* Save Button Area */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:scale-100 flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/20"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Guardando Cambios...' : 'Guardar Configuración'}</span>
            </button>
            <p className="text-[10px] text-center text-gray-500 mt-3 uppercase tracking-widest font-medium">
              Asegúrate de guardar antes de salir
            </p>
          </div>
        </div>

      </form>
    </div>
  );
}
