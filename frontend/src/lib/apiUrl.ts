const BACKEND_PORT = 3000;

export function getApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured;

  // Dev server (vite dev, e.g. `npm run dev`): backend runs on its own port, not behind a
  // reverse proxy, so derive it from whatever host loaded the page (works from other devices
  // on the LAN/Tailscale too, not just localhost).
  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`;
  }

  // Production build (Docker): served behind nginx on the same origin, which proxies each
  // backend route prefix directly — see docker/nginx.conf. Same-origin relative paths, no host.
  return '';
}
