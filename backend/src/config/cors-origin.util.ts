const TAILSCALE_CGNAT = /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/;

type CorsCallback = (err: Error | null, allow?: boolean) => void;

export function buildCorsOriginValidator(extraOrigins: string): (origin: string | undefined, callback: CorsCallback) => void {
  const allowList = extraOrigins
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowList.includes(origin)) {
      callback(null, true);
      return;
    }

    try {
      const { hostname } = new URL(origin);
      if (hostname === 'localhost' || hostname === '127.0.0.1' || TAILSCALE_CGNAT.test(hostname)) {
        callback(null, true);
        return;
      }
    } catch {
      // malformed origin header — fall through to rejection
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  };
}
