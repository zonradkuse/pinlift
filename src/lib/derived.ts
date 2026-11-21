import { useMemo } from 'preact/hooks';
import type { AppData } from './types.ts';
import { computePRs } from './stats.ts';
import { computeBadges } from './badges.ts';
import { deviceLookup } from './selectors.ts';

/** PRs and badges are derived from history (never stored), so merges can't make them inconsistent. */
export function useDerived(d: AppData) {
  return useMemo(() => {
    const sessions = Object.values(d.sessions);
    const lookup = deviceLookup(d);
    return { prs: computePRs(sessions, lookup), badges: computeBadges(sessions, lookup) };
  }, [d.sessions, d.customDevices]);
}
