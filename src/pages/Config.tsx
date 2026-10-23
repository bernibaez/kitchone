import { useEffect, useState } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { useToast } from '../components/ui/Toast';
import {
  PageHeader,
  Button,
  Panel,
  Drawer,
} from '../components/ui';
import {
  Save,
  Building2,
  FileText,
  MapPin,
  Phone,
  Instagram,
  Facebook,
  Twitter,
  Coins,
  Percent,
  Eye,
  Maximize,
  Type,
} from 'lucide-react';
import { generateInvoicePDF } from '../lib/invoice';

export default function Config() {
  const { config, updateConfig, loading } = useConfig();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreviewDrawer, setShowPreviewDrawer] = useState(false);

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
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handlePreview = async () => {
    try {
      const previewData = {
        saleNumber: 'FAC-000001',
        customerName: 'Cliente de Prueba',
        subtotal: 1000,
        tax: 180,
        taxRatePercent: parseFloat(formData.tax_percentage) || 18,
        total: 1180,
        items: [
          { name: 'Mofongo Clásico de Chicharrón', quantity: 2, price: 350, lineTotal: 700 },
          { name: 'Jugo Natural de Chinola', quantity: 2, price: 150, lineTotal: 300 },
        ],
        date: new Date(),
        paymentMethod: 'cash',
        paymentMethodLabel: 'Efectivo',
        moneyReceived: 1500,
        change: 320,
        restaurantName: formData.restaurant_name || 'Kitch One',
        address: formData.address,
        phone: formData.phone,
        currency: formData.currency,
        invoiceFooter: formData.invoice_footer,
        purchaseMessage: formData.purchase_message,
        socialInstagram: formData.social_instagram,
        socialFacebook: formData.social_facebook,
        socialTwitter: formData.social_twitter,
        paperSize: formData.invoice_paper_size,
        fontSize: parseInt(formData.invoice_font_size) || 10,
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
      setShowPreviewDrawer(true);
    } catch (err: any) {
      toast({ title: 'Error al generar vista previa', message: err.message, tone: 'bad' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateConfig({
        restaurant_name: formData.restaurant_name.trim(),
        tax_percentage: parseFloat(formData.tax_percentage) || 0,
        address: formData.address?.trim() || null,
        phone: formData.phone?.trim() || null,
        currency: formData.currency,
        social_instagram: formData.social_instagram?.trim() || null,
        social_facebook: formData.social_facebook?.trim() || null,
        social_twitter: formData.social_twitter?.trim() || null,
        purchase_message: formData.purchase_message?.trim() || null,
        invoice_footer: formData.invoice_footer?.trim() || null,
        invoice_paper_size: formData.invoice_paper_size,
        invoice_font_size: parseInt(formData.invoice_font_size) || 10,
        invoice_font_family: formData.invoice_font_family,
        invoice_primary_color: formData.invoice_primary_color,
        invoice_show_social: formData.invoice_show_social,
        invoice_show_customer: formData.invoice_show_customer,
        business_id: formData.business_id?.trim() || null,
        invoice_template: formData.invoice_template,
        invoice_show_qr: formData.invoice_show_qr,
      });

      toast({
        title: 'Configuración actualizada',
        message: 'Los ajustes se aplican inmediatamente a órdenes y facturación.',
        tone: 'ok',
      });
    } catch (error: any) {
      toast({ title: 'Error al guardar', message: error.message, tone: 'bad' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted text-sm">
        Cargando configuración...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración del Negocio"
        description="Ajustes de facturación, identidad del restaurante y diseño de comprobantes"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<Eye className="h-4 w-4" />}
              onClick={handlePreview}
            >
              Vista Previa Ticket
            </Button>
            <Button
              variant="pri"
              leftIcon={<Save className="h-4 w-4" />}
              loading={saving}
              onClick={(e) => handleSubmit(e)}
            >
              Guardar Configuración
            </Button>
          </div>
        }
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda: Identidad y Contacto */}
        <div className="space-y-6">
          {/* Identidad */}
          <Panel
            title="Identidad del Restaurante"
            description="Información que encabezará tickets y reportes fiscales"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Nombre del Establecimiento *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.restaurant_name}
                    onChange={(e) => setFormData({ ...formData, restaurant_name: e.target.value })}
                    placeholder="Ej. Kitch One Restaurant"
                    className="field pl-9"
                  />
                  <Building2 className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  RNC / Registro Fiscal
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.business_id}
                    onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
                    placeholder="Ej. 1-31-12345-6"
                    className="field pl-9"
                  />
                  <FileText className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </Panel>

          {/* Contacto */}
          <Panel
            title="Datos de Contacto"
            description="Ubicación física y teléfono que verán los comensales"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Dirección
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Av. Winston Churchill #105, Santo Domingo"
                    className="field pl-9"
                  />
                  <MapPin className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Teléfono de Contacto
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="809-555-0199"
                    className="field pl-9"
                  />
                  <Phone className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </Panel>

          {/* Redes Sociales */}
          <Panel
            title="Redes Sociales"
            description="Perfiles para imprimir en el pie del comprobante"
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Instagram
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.social_instagram}
                    onChange={(e) => setFormData({ ...formData, social_instagram: e.target.value })}
                    placeholder="@kitchonerest"
                    className="field pl-9"
                  />
                  <Instagram className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Facebook
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.social_facebook}
                    onChange={(e) => setFormData({ ...formData, social_facebook: e.target.value })}
                    placeholder="facebook.com/kitchone"
                    className="field pl-9"
                  />
                  <Facebook className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Twitter / X
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.social_twitter}
                    onChange={(e) => setFormData({ ...formData, social_twitter: e.target.value })}
                    placeholder="@kitchone"
                    className="field pl-9"
                  />
                  <Twitter className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Columna Derecha: Facturación y Diseño de Ticket */}
        <div className="space-y-6">
          {/* Parámetros fiscales */}
          <Panel
            title="Moneda e Impuestos"
            description="Tasa de ITBIS / IVA e importe monetario del sistema"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Moneda Base
                </label>
                <div className="relative">
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="field pl-9"
                  >
                    <option value="DOP">Peso Dominicano (DOP)</option>
                    <option value="USD">Dólar Estadounidense (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                  <Coins className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Impuesto por Defecto (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={formData.tax_percentage}
                    onChange={(e) => setFormData({ ...formData, tax_percentage: e.target.value })}
                    placeholder="18"
                    className="field pl-9"
                  />
                  <Percent className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </Panel>

          {/* Personalización de ticket PDF */}
          <Panel
            title="Diseño de Facturas y Tickets"
            description="Formato, plantilla y elementos visibles en la impresión"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  Plantilla de Diseño
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['modern', 'classic', 'minimalist'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, invoice_template: t })}
                      className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                        formData.invoice_template === t
                          ? 'border-accent bg-accent/10 text-accent font-bold'
                          : 'border-line bg-surface-2 text-muted hover:text-fg'
                      }`}
                    >
                      {t === 'modern' ? 'Moderna' : t === 'classic' ? 'Clásica' : 'Minimalista'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                    Tamaño de Papel
                  </label>
                  <div className="relative">
                    <select
                      value={formData.invoice_paper_size}
                      onChange={(e) => setFormData({ ...formData, invoice_paper_size: e.target.value })}
                      className="field pl-9"
                    >
                      <option value="ticket-80">Ticket Térmico 80mm</option>
                      <option value="ticket-58">Ticket Térmico 58mm</option>
                      <option value="a4">Hoja A4</option>
                      <option value="letter">Carta (Letter)</option>
                    </select>
                    <Maximize className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                    Tipografía
                  </label>
                  <div className="relative">
                    <select
                      value={formData.invoice_font_family}
                      onChange={(e) => setFormData({ ...formData, invoice_font_family: e.target.value })}
                      className="field pl-9"
                    >
                      <option value="helvetica">Helvetica (Limpia)</option>
                      <option value="courier">Courier (Ticket Mono)</option>
                      <option value="times">Times New Roman</option>
                    </select>
                    <Type className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                    Tamaño de Fuente (pt)
                  </label>
                  <input
                    type="number"
                    min="8"
                    max="14"
                    value={formData.invoice_font_size}
                    onChange={(e) => setFormData({ ...formData, invoice_font_size: e.target.value })}
                    className="field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                    Color Acento
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.invoice_primary_color}
                      onChange={(e) => setFormData({ ...formData, invoice_primary_color: e.target.value })}
                      className="h-9 w-12 rounded-lg border border-line bg-surface cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={formData.invoice_primary_color}
                      onChange={(e) => setFormData({ ...formData, invoice_primary_color: e.target.value })}
                      className="field text-xs uppercase font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Casillas de verificación */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-line bg-surface-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={formData.invoice_show_social}
                    onChange={(e) => setFormData({ ...formData, invoice_show_social: e.target.checked })}
                    className="rounded border-line text-accent focus:ring-accent"
                  />
                  <span className="font-medium text-fg">Redes Sociales</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-line bg-surface-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={formData.invoice_show_customer}
                    onChange={(e) => setFormData({ ...formData, invoice_show_customer: e.target.checked })}
                    className="rounded border-line text-accent focus:ring-accent"
                  />
                  <span className="font-medium text-fg">Datos Cliente</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-line bg-surface-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={formData.invoice_show_qr}
                    onChange={(e) => setFormData({ ...formData, invoice_show_qr: e.target.checked })}
                    className="rounded border-line text-accent focus:ring-accent"
                  />
                  <span className="font-medium text-fg">Código QR</span>
                </label>
              </div>

              {/* Textos de cortesía */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Mensaje de Agradecimiento
                </label>
                <textarea
                  value={formData.purchase_message}
                  onChange={(e) => setFormData({ ...formData, purchase_message: e.target.value })}
                  rows={2}
                  placeholder="¡Gracias por su visita! Esperamos verle pronto."
                  className="field resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Pie de Factura
                </label>
                <textarea
                  value={formData.invoice_footer}
                  onChange={(e) => setFormData({ ...formData, invoice_footer: e.target.value })}
                  rows={2}
                  placeholder="No se aceptan devoluciones en platillos ya servidos."
                  className="field resize-none"
                />
              </div>
            </div>
          </Panel>
        </div>
      </form>

      {/* Drawer: Vista Previa del Ticket PDF */}
      <Drawer
        open={showPreviewDrawer}
        onClose={() => setShowPreviewDrawer(false)}
        title="Vista Previa de Factura"
        description="Representación exacta del PDF según la configuración actual"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-muted">
              Plantilla: {formData.invoice_template} · Papel: {formData.invoice_paper_size}
            </span>
            <Button variant="pri" onClick={() => setShowPreviewDrawer(false)}>
              Listo
            </Button>
          </div>
        }
      >
        {previewUrl ? (
          <div className="h-[600px] w-full rounded-xl overflow-hidden border border-line bg-surface-2">
            <iframe
              src={previewUrl}
              className="w-full h-full"
              title="Vista previa de factura"
            />
          </div>
        ) : (
          <div className="py-24 text-center text-muted text-sm">
            Generando vista previa...
          </div>
        )}
      </Drawer>
    </div>
  );
}
