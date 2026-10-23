import type { ComponentType } from 'react';
import {
  Utensils,
  Coffee,
  Pizza,
  Sandwich,
  Soup,
  IceCream,
  Fish,
  Wine,
  Salad,
  Flame,
  CakeSlice,
  Beer,
} from 'lucide-react';

export function getDishIcon(name?: string, category?: string): ComponentType<{ className?: string }> {
  const text = `${name || ''} ${category || ''}`.toLowerCase();
  if (text.includes('pizza')) return Pizza;
  if (
    text.includes('burger') ||
    text.includes('hamburguesa') ||
    text.includes('sandwich') ||
    text.includes('sándwich') ||
    text.includes('bocadillo') ||
    text.includes('torta')
  ) {
    return Sandwich;
  }
  if (
    text.includes('sopa') ||
    text.includes('soup') ||
    text.includes('caldo') ||
    text.includes('crema') ||
    text.includes('ramen')
  ) {
    return Soup;
  }
  if (
    text.includes('café') ||
    text.includes('cafe') ||
    text.includes('espresso') ||
    text.includes('cappuccino') ||
    text.includes('té') ||
    text.includes('tea')
  ) {
    return Coffee;
  }
  if (text.includes('cerveza') || text.includes('beer')) return Beer;
  if (
    text.includes('vino') ||
    text.includes('wine') ||
    text.includes('cocktail') ||
    text.includes('trago') ||
    text.includes('bebida') ||
    text.includes('jugo')
  ) {
    return Wine;
  }
  if (
    text.includes('postre') ||
    text.includes('helado') ||
    text.includes('ice cream') ||
    text.includes('dulce')
  ) {
    return IceCream;
  }
  if (
    text.includes('tarta') ||
    text.includes('pastel') ||
    text.includes('cake') ||
    text.includes('bizcocho')
  ) {
    return CakeSlice;
  }
  if (
    text.includes('ensalada') ||
    text.includes('salad') ||
    text.includes('vegano') ||
    text.includes('vegetal')
  ) {
    return Salad;
  }
  if (
    text.includes('pescado') ||
    text.includes('fish') ||
    text.includes('marisco') ||
    text.includes('camarón') ||
    text.includes('salmon')
  ) {
    return Fish;
  }
  if (
    text.includes('parrilla') ||
    text.includes('carne') ||
    text.includes('asado') ||
    text.includes('steak') ||
    text.includes('grill') ||
    text.includes('bbq')
  ) {
    return Flame;
  }
  return Utensils;
}
