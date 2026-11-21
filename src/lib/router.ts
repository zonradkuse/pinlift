import { useEffect, useState } from 'preact/hooks';

export interface Route { path: string[]; query: URLSearchParams }

const parse = (): Route => {
  const [p, q] = location.hash.replace(/^#\/?/, '').split('?');
  return { path: p ? p.split('/').map(decodeURIComponent) : [], query: new URLSearchParams(q) };
};

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(to: string, replace = false) {
  const url = '#' + to;
  if (replace) { history.replaceState(null, '', url); dispatchEvent(new HashChangeEvent('hashchange')); }
  else location.hash = to;
}
