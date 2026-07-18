import { lookup } from 'node:dns/promises';
import { isIPv4 } from 'node:net';

// Blocks classic SSRF targets (loopback, link-local incl. cloud metadata, RFC1918 private
// ranges). Deliberately does NOT block the Tailscale CGNAT range (100.64.0.0/10) — unlike a
// multi-tenant SaaS, this app's webhook targets are frequently the admin's own tailnet
// (see cors-origin.util.ts for the same reasoning applied to inbound CORS).
function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  const a = parts[0] ?? -1;
  const b = parts[1] ?? -1;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // RFC1918
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata (169.254.169.254)
  if (a === 0) return true;
  return false;
}

function isBlockedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' || // loopback
    normalized.startsWith('fe80:') || // link-local
    normalized.startsWith('fc') || // unique local (fc00::/7)
    normalized.startsWith('fd')
  );
}

export async function assertNotPrivateTarget(urlString: string): Promise<void> {
  const url = new URL(urlString);

  let address: string;
  try {
    address = (await lookup(url.hostname)).address;
  } catch {
    throw new Error(`Could not resolve webhook host "${url.hostname}"`);
  }

  const blocked = isIPv4(address) ? isBlockedIPv4(address) : isBlockedIPv6(address);
  if (blocked) {
    throw new Error(`Webhook host "${url.hostname}" resolves to a disallowed private/loopback address`);
  }
}
