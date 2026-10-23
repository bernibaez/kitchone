import { useEffect, useState } from 'react';
import type { Tone } from '../components/ui/cn';

/** Metadatos visuales para los estados de orden (los valores de BD no cambian). */
export const ORDER_STATUS: Record<string, { label: string; tone: Tone; next?: string; nextLabel?: string }> = {
  pendiente: { label: 'Pendiente', tone: 'warn', next: 'en_preparacion', nextLabel: 'Marchar' },
  en_preparacion: { label: 'En preparación', tone: 'info', next: 'terminado', nextLabel: 'Marcar listo' },
  terminado: { label: 'Terminado', tone: 'ok', next: 'entregado', nextLabel: 'Entregar' },
  entregado: { label: 'Entregado', tone: 'neutral' },
  facturada: { label: 'Facturada', tone: 'neutral' },
};

export function statusMeta(status: string) {
  return ORDER_STATUS[status] ?? { label: status, tone: 'neutral' as Tone };
}

/** Minutos transcurridos desde una fecha ISO. */
export function minutesSince(iso: string, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

export function formatElapsed(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} h ${m.toString().padStart(2, '0')} min`;
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) {
  return new Date(iso).toLocaleDateString('es-DO', opts);
}

/** Tono según demora: verde < 10, ámbar < 15, rojo ≥ 15 minutos. */
export function delayTone(mins: number): Tone {
  if (mins >= 15) return 'bad';
  if (mins >= 10) return 'warn';
  return 'ok';
}

/** Reloj que re-renderiza cada `intervalMs` para temporizadores en vivo. */
export function useNow(intervalMs = 30000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function initials(name?: string | null): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  mesero: 'Mesero',
  cocinero: 'Cocinero',
};

/** Número corto de orden: "ORD-0042" → "0042". */
export function shortOrder(orderNumber: string): string {
  const parts = orderNumber.split('-');
  return parts.length > 1 ? parts[parts.length - 1] : orderNumber;
}

/** Bus de eventos de UI entre Layout y páginas (sin contextos nuevos). */
export const UI_EVENTS = {
  newOrder: 'kitchone:new-order',
  cashChanged: 'kitchone:cash-changed',
  ordersChanged: 'kitchone:orders-changed',
} as const;

export const PENDING_NEW_ORDER_KEY = 'kitchone:pending-new-order';
export const BILL_ORDER_KEY = 'kitchone:bill-order-id';
