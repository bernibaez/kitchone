/** Une clases condicionales sin dependencias externas. */
export function cn(...parts: Array<string | false | null | undefined | 0>): string {
  return parts.filter(Boolean).join(' ');
}

export type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'bad' | 'info';

/** Fondo suave + texto con contraste AA para cada tono semántico. */
export const toneSoft: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-fg',
  accent: 'bg-accent-soft text-accent-strong',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  info: 'bg-info-soft text-info',
};

export const toneDot: Record<Tone, string> = {
  neutral: 'bg-muted',
  accent: 'bg-accent',
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  info: 'bg-info',
};

export const toneText: Record<Tone, string> = {
  neutral: 'text-muted',
  accent: 'text-accent-strong',
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-bad',
  info: 'text-info',
};
