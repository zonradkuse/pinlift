// Transient UI state shared across screens (never persisted).
import { notify } from './store.ts';
import { isStale } from './stats.ts';
import type { Session } from './types.ts';

export interface ToastAction { label: string; run: () => void }
export interface Toast { text: string; key: number; action?: ToastAction }

const TOAST_MS = 4000, TOAST_WITH_ACTION_MS = 6000;
let toastState: Toast | null = null;
let updateReady = false;
// Workouts the user chose to continue although they looked forgotten (this app run only).
const keptOpen = new Set<string>();

export const currentToast = () => toastState;

export function toast(text: string, action?: ToastAction) {
  const key = Date.now() + Math.random();
  toastState = { text, key, action };
  notify();
  setTimeout(() => { if (toastState?.key === key) dismissToast(); }, action ? TOAST_WITH_ACTION_MS : TOAST_MS);
}

export const dismissToast = () => { toastState = null; notify(); };

let introOpen = false;
export const isIntroOpen = () => introOpen;
export const openIntro = () => { introOpen = true; notify(); };
export const closeIntro = () => { introOpen = false; notify(); };

export const isUpdateReady = () => updateReady;
export const setUpdateReady = () => { updateReady = true; notify(); };

export const keepWorkoutOpen = (id: string) => { keptOpen.add(id); notify(); };
export const isForgotten = (s: Session, now = Date.now()) => isStale(s, now) && !keptOpen.has(s.id);
