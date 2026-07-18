const BACKEND_PORT = 3000;

export function getApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured;
  return `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`;
}
