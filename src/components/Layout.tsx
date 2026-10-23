import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UtensilsCrossed,
  FolderOpen,
  Wallet,
  Receipt,
  ChefHat,
  ClipboardList,
  History,
  BarChart3,
  Settings,
  LogOut,
  Armchair,
  Search,
  Moon,
  Sun,
  Plus,
  LockKeyhole,
  CircleDot,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';
import { initials, ROLE_LABEL, UI_EVENTS, PENDING_NEW_ORDER_KEY, formatClock } from '../lib/format';
import { cn } from './ui/cn';
import { Button, IconButton } from './ui/Button';
import CommandPalette, { type CommandItem } from './CommandPalette';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: (cls: string) => ReactNode;
  roles: string[];
  badge?: 'open' | 'kitchen';
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const GROUPS: MenuGroup[] = [
  {
    label: 'Operación',
    items: [
      { id: 'dashboard', label: 'Panel', icon: (c) => <LayoutDashboard className={c} />, roles: ['admin', 'mesero', 'cocinero'] },
      { id: 'orders', label: 'Órdenes', icon: (c) => <ClipboardList className={c} />, roles: ['admin', 'mesero'], badge: 'open' },
      { id: 'kitchen', label: 'Cocina', icon: (c) => <ChefHat className={c} />, roles: ['admin', 'cocinero'], badge: 'kitchen' },
      { id: 'sales', label: 'Facturación', icon: (c) => <Receipt className={c} />, roles: ['admin', 'mesero'] },
      { id: 'tables', label: 'Mesas', icon: (c) => <Armchair className={c} />, roles: ['admin'] },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { id: 'dishes', label: 'Platillos', icon: (c) => <UtensilsCrossed className={c} />, roles: ['admin'] },
      { id: 'categories', label: 'Categorías', icon: (c) => <FolderOpen className={c} />, roles: ['admin'] },
      { id: 'expenses', label: 'Gastos', icon: (c) => <Wallet className={c} />, roles: ['admin'] },
      { id: 'customers', label: 'Clientes', icon: (c) => <UserCheck className={c} />, roles: ['admin', 'mesero'] },
      { id: 'reports', label: 'Reportes', icon: (c) => <BarChart3 className={c} />, roles: ['admin'] },
      { id: 'history', label: 'Historial', icon: (c) => <History className={c} />, roles: ['admin'] },
      { id: 'users', label: 'Usuarios', icon: (c) => <Users className={c} />, roles: ['admin'] },
    ],
  },
  {
    label: 'Cuenta',
    items: [{ id: 'config', label: 'Configuración', icon: (c) => <Settings className={c} />, roles: ['admin'] }],
  },
];

interface CashState {
  open: boolean;
  since?: string;
}

function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* El degradado de marca se reserva solo para el logo */}
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#F07A2E] to-[#C9420A] text-white">
        <ChefHat className="h-5 w-5" aria-hidden />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-[17px] font-bold text-fg">Kitch One</span>
          <span className="block text-[11px] font-medium text-muted">Gestión de restaurante</span>
        </span>
      )}
    </div>
  );
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [counts, setCounts] = useState({ open: 0, kitchen: 0 });
  const [cash, setCash] = useState<CashState | null>(null);

  const canSee = useCallback(
    (item: MenuItem) => {
      if (!profile) return false;
      // Si el usuario tiene módulos personalizados se respetan; si no, se usa el rol.
      if (profile.allowed_modules && profile.allowed_modules.length > 0) {
        return profile.allowed_modules.includes(item.id);
      }
      return item.roles.includes(profile.role);
    },
    [profile]
  );

  const groups = useMemo(
    () => GROUPS.map((g) => ({ ...g, items: g.items.filter(canSee) })).filter((g) => g.items.length > 0),
    [canSee]
  );
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const canOrder = flatItems.some((i) => i.id === 'orders');
  const canBill = flatItems.some((i) => i.id === 'sales');

  /* ---------- Conteo de órdenes abiertas para badges (solo lectura) ---------- */
  useEffect(() => {
    if (!profile) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase.from('orders').select('id, status').in('status', ['pendiente', 'en_preparacion', 'terminado']);
      if (!alive || !data) return;
      const rows = data as Array<{ status: string }>;
      setCounts({
        open: rows.length,
        kitchen: rows.filter((r) => r.status === 'pendiente' || r.status === 'en_preparacion').length,
      });
    };
    load();
    const channel = supabase
      .channel('layout-order-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => load())
      .subscribe();
    const onLocal = () => load();
    window.addEventListener(UI_EVENTS.ordersChanged, onLocal);
    return () => {
      alive = false;
      supabase.removeChannel(channel);
      window.removeEventListener(UI_EVENTS.ordersChanged, onLocal);
    };
  }, [profile]);

  /* ---------------- Estado de caja (misma consulta que Facturación) ---------------- */
  useEffect(() => {
    if (!canBill) return;
    let alive = true;
    const load = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('cash_openings')
          .select('*')
          .gte('opened_at', today)
          .order('opened_at', { ascending: false })
          .limit(1);
        if (error) throw error;
        if (!alive) return;
        if (data && data.length > 0) {
          const opening = data[0] as { id: string; opened_at: string };
          const { data: closing } = await supabase.from('cash_closings').select('id').eq('opening_id', opening.id).maybeSingle();
          if (!alive) return;
          setCash(closing ? { open: false } : { open: true, since: opening.opened_at });
        } else {
          setCash({ open: false });
        }
      } catch {
        if (alive) setCash(null);
      }
    };
    load();
    window.addEventListener(UI_EVENTS.cashChanged, load);
    return () => {
      alive = false;
      window.removeEventListener(UI_EVENTS.cashChanged, load);
    };
  }, [canBill]);

  /* --------------------------------- ⌘K --------------------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const startNewOrder = useCallback(() => {
    sessionStorage.setItem(PENDING_NEW_ORDER_KEY, '1');
    if (currentPage === 'orders') window.dispatchEvent(new CustomEvent(UI_EVENTS.newOrder));
    else onNavigate('orders');
  }, [currentPage, onNavigate]);

  const commands: CommandItem[] = useMemo(() => {
    const nav = groups.flatMap((g) =>
      g.items.map<CommandItem>((i) => ({
        id: `nav-${i.id}`,
        label: i.label,
        group: g.label,
        icon: i.icon('h-4 w-4'),
        hint: 'Ir a',
        run: () => onNavigate(i.id),
      }))
    );
    const actions: CommandItem[] = [
      ...(canOrder ? [{ id: 'act-new-order', label: 'Nueva orden', group: 'Acciones', icon: <Plus className="h-4 w-4" />, keywords: 'crear pedido mesa', run: startNewOrder }] : []),
      { id: 'act-theme', label: theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro', group: 'Acciones', icon: theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />, keywords: 'modo oscuro claro tema', run: toggle },
      { id: 'act-logout', label: 'Cerrar sesión', group: 'Acciones', icon: <LogOut className="h-4 w-4" />, keywords: 'salir', run: signOut },
    ];
    return [...actions, ...nav];
  }, [groups, onNavigate, canOrder, startNewOrder, theme, toggle, signOut]);

  const badgeFor = (item: MenuItem) => (item.badge === 'open' ? counts.open : item.badge === 'kitchen' ? counts.kitchen : 0);

  const NavButton = ({ item, mobile }: { item: MenuItem; mobile?: boolean }) => {
    const active = currentPage === item.id;
    const badge = badgeFor(item);
    return (
      <button
        type="button"
        onClick={() => onNavigate(item.id)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative flex items-center gap-3 font-medium transition-colors',
          mobile
            ? 'h-9 shrink-0 rounded-full px-3.5 text-[13px]'
            : 'h-10 w-full rounded-[10px] px-3 text-sm',
          active ? 'bg-accent-soft text-accent-strong' : 'text-muted hover:bg-surface-2 hover:text-fg'
        )}
      >
        {!mobile && active && (
          <motion.span layoutId="nav-active-bar" className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-accent" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
        )}
        {item.icon(cn('h-[18px] w-[18px] shrink-0', mobile && 'h-4 w-4'))}
        <span className={cn(!mobile && 'flex-1 text-left')}>{item.label}</span>
        {badge > 0 && (
          <span
            className={cn(
              'tnum inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
              active ? 'bg-accent-strong text-accent-on' : 'bg-surface-2 text-fg ring-1 ring-line'
            )}
            aria-label={`${badge} abiertas`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  const CashChip = ({ compact }: { compact?: boolean }) => {
    if (!canBill || !cash) return null;
    return (
      <button
        type="button"
        onClick={() => onNavigate('sales')}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors',
          cash.open ? 'border-ok/30 bg-ok-soft text-ok hover:border-ok/60' : 'border-line bg-surface text-muted hover:text-fg'
        )}
        title={cash.open ? 'Ir a Facturación' : 'Abrir caja en Facturación'}
      >
        {cash.open ? <CircleDot className="h-3.5 w-3.5" aria-hidden /> : <LockKeyhole className="h-3.5 w-3.5" aria-hidden />}
        {cash.open ? (
          <span className="tnum">
            Caja abierta{!compact && cash.since ? ` · desde ${formatClock(cash.since)}` : ''}
          </span>
        ) : (
          <span>Caja cerrada</span>
        )}
      </button>
    );
  };

  const ThemeToggle = () => (
    <IconButton label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'} onClick={toggle} variant="outline" size="md">
      {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </IconButton>
  );

  return (
    <div className="min-h-screen bg-bg">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-semibold">
        Saltar al contenido
      </a>

      {/* ------------------------------ Sidebar desktop ------------------------------ */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-surface lg:flex" aria-label="Navegación principal">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <nav className="custom-scrollbar flex-1 overflow-y-auto px-3 pb-4 pt-2">
          {groups.map((g) => (
            <div key={g.label} className="mb-5 last:mb-0">
              <p className="eyebrow mb-1.5 px-3">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map((item) => (
                  <li key={item.id}>
                    <NavButton item={item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-[12px] px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-ink-on" aria-hidden>
              {initials(profile?.full_name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-fg">{profile?.full_name || 'Usuario'}</p>
              <p className="text-xs text-muted">{ROLE_LABEL[profile?.role ?? ''] ?? profile?.role}</p>
            </div>
            <IconButton label="Cerrar sesión" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        {/* ------------------------------ Barra superior ------------------------------ */}
        <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur-sm">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <div className="lg:hidden">
              <Logo compact />
            </div>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden h-10 w-full max-w-md items-center gap-2.5 rounded-[10px] border border-line bg-surface px-3 text-sm text-muted transition-colors hover:border-line-strong sm:flex"
              aria-label="Abrir búsqueda global"
            >
              <Search className="h-4 w-4" aria-hidden />
              <span className="flex-1 text-left">Buscar páginas y acciones…</span>
              <span className="kbd">⌘K</span>
            </button>

            <div className="ml-auto flex items-center gap-2">
              <IconButton label="Buscar" className="sm:hidden" onClick={() => setPaletteOpen(true)}>
                <Search className="h-5 w-5" />
              </IconButton>
              <div className="hidden md:block">
                <CashChip />
              </div>
              <ThemeToggle />
              {canOrder && (
                <>
                  <Button variant="acc" leftIcon={<Plus className="h-4 w-4" />} onClick={startNewOrder} className="hidden sm:inline-flex">
                    Nueva orden
                  </Button>
                  <IconButton label="Nueva orden" variant="pri" className="sm:hidden" onClick={startNewOrder}>
                    <Plus className="h-5 w-5" />
                  </IconButton>
                </>
              )}
              <IconButton label="Cerrar sesión" className="lg:hidden" onClick={signOut}>
                <LogOut className="h-[18px] w-[18px]" />
              </IconButton>
            </div>
          </div>

          {/* Navegación móvil: barra horizontal con scroll */}
          <nav className="hide-scrollbar flex gap-1.5 overflow-x-auto border-t border-line px-4 py-2 lg:hidden" aria-label="Navegación principal">
            {flatItems.map((item) => (
              <NavButton key={item.id} item={item} mobile />
            ))}
          </nav>
          {canBill && cash && (
            <div className="border-t border-line px-4 py-2 md:hidden">
              <CashChip compact />
            </div>
          )}
        </header>

        <main id="main" className="mx-auto w-full max-w-[1600px] px-4 pb-16 pt-6 sm:px-6 lg:pt-8">
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={commands} />
    </div>
  );
}
