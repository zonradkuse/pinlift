import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { icons, type IconName } from '../data/icons.ts';
import { useStore } from '../lib/store.ts';
import { currentToast, dismissToast, isUpdateReady } from '../lib/ui-state.ts';
import { applyUpdate } from '../lib/pwa.ts';
import type { Device } from '../lib/types.ts';
import { parseDecimal } from '../lib/format.ts';

export const Icon = ({ name, size = 24 }: { name: IconName; size?: number }) => (
  <svg class="icon" width={size} height={size} viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
    <path d={icons[name]} />
  </svg>
);

export function TopBar({ title, up, children }: { title: ComponentChildren; up?: string; children?: ComponentChildren }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(scrollY > 4);
    addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  }, []);
  return (
    <header class={'topbar' + (scrolled ? ' scrolled' : '')}>
      {up !== undefined && <a class="icon-btn interactive" href={'#' + up} aria-label="Back"><Icon name="arrow_back" /></a>}
      <h1>{title}</h1>
      {children}
    </header>
  );
}

export const NAV: [string, string, IconName][] = [
  ['', 'Train', 'fitness_center'], ['history', 'History', 'history'], ['stats', 'Analytics', 'monitoring'],
  ['awards', 'Awards', 'emoji_events'], ['settings', 'Settings', 'settings'],
];

/** Bottom navigation on phones (top-level screens only); a side navigation rail on every screen on desktop. */
export const NavBar = ({ active, detail }: { active: string; detail?: boolean }) => (
  <nav class={'navbar' + (detail ? ' detail' : '')} aria-label="Main">
    {NAV.map(([path, label, icon]) => (
      <a href={'#/' + path} aria-current={active === path ? 'page' : undefined}>
        <span class="indicator interactive"><Icon name={icon} /></span>{label}
      </a>
    ))}
  </nav>
);

export function Snackbar() {
  useStore();
  const toast = currentToast(), updateReady = isUpdateReady();
  return (
    <>
      {toast && (
        <div class={'snackbar' + (toast.action ? ' with-action' : '') + (updateReady ? ' stacked' : '')} role="status" key={toast.key}>
          <span class="spacer">{toast.text}</span>
          {toast.action && <button class="btn text action interactive" onClick={() => { toast.action!.run(); dismissToast(); }}>{toast.action.label}</button>}
        </div>
      )}
      {updateReady && (
        <div class="snackbar with-action" role="status">
          <span class="spacer">A new version is available. Your data stays as it is.</span>
          <button class="btn text action interactive" onClick={applyUpdate}>Reload</button>
        </div>
      )}
    </>
  );
}

/** Material list item; renders its own <li>. Interactive when given href or onClick. */
export function ListItem({ href, onClick, leading, title, supporting, trailing, actions, label, selected }: {
  href?: string; onClick?: () => void; leading?: ComponentChildren; title: ComponentChildren; supporting?: ComponentChildren;
  trailing?: ComponentChildren; label?: string; selected?: boolean;
  /** Buttons next to (not inside) the interactive row. */
  actions?: ComponentChildren;
}) {
  const cls = 'list-item' + (supporting ? ' two-line' : '') + (href || onClick ? ' interactive' : '') + (selected ? ' selected' : '');
  const body = (
    <>
      {leading}
      <span class="content"><span class="headline">{title}</span>{supporting && <span class="supporting">{supporting}</span>}</span>
      {trailing}
    </>
  );
  return (
    <li class={actions ? 'list-row' : undefined}>
      {href ? <a class={cls} href={href} aria-label={label}>{body}</a>
        : onClick ? <button class={cls} onClick={onClick} aria-label={label}>{body}</button>
        : <div class={cls}>{body}</div>}
      {actions}
    </li>
  );
}

export const SwitchRow = ({ title, supporting, checked, onChange }: { title: string; supporting?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label class="list-item switch-row">
    <span class="content"><span class="headline">{title}</span>{supporting && <span class="supporting">{supporting}</span>}</span>
    <input type="checkbox" class="switch" checked={checked} onChange={(e) => onChange((e.target as HTMLInputElement).checked)} />
  </label>
);

export const Tile = ({ value, label }: { value: ComponentChildren; label: ComponentChildren }) => (
  <div class="tile"><div class="value">{value}</div><div class="label">{label}</div></div>
);

export const deviceIcon = (dev?: Device): IconName =>
  dev?.kind !== 'cardio' ? 'fitness_center' : dev.cardio === 'row' ? 'rowing' : dev.cardio === 'bike' ? 'directions_bike' : 'directions_run';

// ---- promise-based dialogs ----
interface DialogReq { title: string; body?: ComponentChildren; confirm: string; cancel?: string; danger?: boolean; resolve: (ok: boolean) => void }
let current: DialogReq | null = null;
let setDialog: (d: DialogReq | null) => void = () => {};

export function confirmDialog(opts: Omit<DialogReq, 'resolve'>): Promise<boolean> {
  current?.resolve(false);
  return new Promise((resolve) => setDialog(current = { ...opts, resolve }));
}

export function DialogHost() {
  const [d, set] = useState<DialogReq | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  setDialog = set;
  useEffect(() => { if (d && !ref.current?.open) ref.current?.showModal(); }, [d]);
  if (!d) return null;
  const close = (ok: boolean) => { ref.current?.close(); current = null; set(null); d.resolve(ok); };
  return (
    <dialog class="dlg" ref={ref} onCancel={(e) => { e.preventDefault(); close(false); }}>
      <h2>{d.title}</h2>
      {d.body && <div class="body-m muted">{d.body}</div>}
      <div class="actions">
        {d.cancel !== '' && <button class="btn text interactive" onClick={() => close(false)}>{d.cancel ?? 'Cancel'}</button>}
        <button class={'btn interactive' + (d.danger ? ' danger' : '')} onClick={() => close(true)}>{d.confirm}</button>
      </div>
    </dialog>
  );
}

export function Stepper({ label, value, step, min = 0, unit, onChange, decimals = true }: {
  label: string; value: number; step: number; min?: number; unit?: string; onChange: (v: number) => void; decimals?: boolean;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => { if (parseDecimal(text) !== value) setText(String(value)); }, [value]);
  const bump = (dir: number) => onChange(Math.max(min, Math.round((value + dir * step) * 100) / 100));
  return (
    <div>
      <div class="stepper-label label-l muted"><span>{label}</span>{unit && <span>{unit}</span>}</div>
      <div class="stepper">
        <button class="icon-btn big tonal interactive" aria-label={`Decrease ${label}`} onClick={() => bump(-1)}><Icon name="remove" /></button>
        <input aria-label={label} inputMode={decimals ? 'decimal' : 'numeric'} value={text}
          onFocus={(e) => (e.target as HTMLInputElement).select()}
          onInput={(e) => {
            const t = (e.target as HTMLInputElement).value;
            setText(t);
            const n = parseDecimal(t);
            if (n !== undefined && n >= min) onChange(n);
          }} />
        <button class="icon-btn big tonal interactive" aria-label={`Increase ${label}`} onClick={() => bump(1)}><Icon name="add" /></button>
      </div>
    </div>
  );
}

export const Empty = ({ icon, children }: { icon: IconName; children: ComponentChildren }) => (
  <div class="empty"><Icon name={icon} size={48} /><div class="body-m">{children}</div></div>
);

/** Keep the screen on while `on`; re-acquired whenever the page becomes visible again (the lock is lost when hidden). */
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !navigator.wakeLock) return;
    let lock: WakeLockSentinel | undefined, stopped = false;
    const acquire = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock.request('screen').then((l) => { if (stopped) l.release(); else lock = l; }).catch(() => {});
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => { stopped = true; document.removeEventListener('visibilitychange', acquire); lock?.release(); };
  }, [on]);
}

/** Desktop layout (Material "expanded" window class, ≥ 840 px). */
export const WIDE_QUERY = '(min-width: 840px)';

export function useWide() {
  const [wide, setWide] = useState(() => matchMedia(WIDE_QUERY).matches);
  useEffect(() => {
    const q = matchMedia(WIDE_QUERY), on = () => setWide(q.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return wide;
}

/** Re-render every `ms` (for running timers). */
export function useTick(ms = 1000) {
  const [, set] = useState(0);
  useEffect(() => { const t = setInterval(() => set((n) => n + 1), ms); return () => clearInterval(t); }, [ms]);
}
