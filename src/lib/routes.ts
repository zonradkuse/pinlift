// Hash routes in one place, so links are built (and encoded) consistently.
const q = (params: Record<string, string | undefined>) => {
  const s = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString();
  return s ? `?${s}` : '';
};
const seg = encodeURIComponent;

export const to = {
  home: () => '/',
  session: () => '/session',
  device: (id: string) => `/device/${seg(id)}`,
  devices: (opts: { assign?: string; addTo?: string } = {}) => `/devices${q({ assign: opts.assign, addto: opts.addTo })}`,
  newDevice: (assign?: string) => `/new-device${q({ assign })}`,
  choose: (code: string) => `/choose${q({ code })}`,
  scan: (link?: string) => `/scan${q({ link })}`,
  /** Receive data from another device, then return to `back`. */
  receive: (back: string) => `/scan${q({ back })}`,
  summary: (id: string, fresh = false) => `/summary/${seg(id)}${fresh ? '?fresh=1' : ''}`,
  workout: (id: string) => `/workout/${seg(id)}`,
  plan: (id: string) => `/plan/${seg(id)}`,
  history: () => '/history',
  awards: () => '/awards',
  stats: () => '/stats',
  body: () => '/body',
  settings: () => '/settings',
  send: () => '/send',
  stravaCode: (code: string) => `/strava-code${q({ code })}`,
};

/** For <a href>. */
export const href = (path: string) => '#' + path;
