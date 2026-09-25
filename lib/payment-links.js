export function buildPayPalPaymentUrl(baseUrl, amountCents, currency = 'EUR') {
  const raw = String(baseUrl || '').trim();
  if (!raw) return '';

  let url;
  try { url = new URL(raw); }
  catch { return raw; }

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== 'paypal.me') return raw;

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length !== 1) return raw;

  const cents = Math.max(0, Number(amountCents) || 0);
  if (!cents) return raw;
  const amount = (cents / 100).toFixed(2).replace(/\.00$/, '');
  const code = String(currency || 'EUR').toUpperCase().replace(/[^A-Z]/g, '') || 'EUR';

  url.pathname = `/${parts[0]}/${amount}${code}`;
  return url.toString().replace(/\/$/, '');
}
