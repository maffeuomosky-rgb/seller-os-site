import { adminCsrfForSession, createAdminSession, timingSafeEqualText, verifyAdminSession } from './core.js';
import { parseCookies } from './http.js';

const COOKIE = 'hos_admin';

export function checkAdminPassword(input) {
  const configured = process.env.ADMIN_SECRET || '';
  if (!configured || configured.length < 12) return false;
  return timingSafeEqualText(String(input || ''), configured);
}

export function makeAdminSession() {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_SECRET;
  const token = createAdminSession(secret, Number(process.env.ADMIN_SESSION_HOURS || 8));
  return { token, csrf: adminCsrfForSession(token, secret) };
}

export function adminCookieHeader(token) {
  const maxAge = Math.max(1, Number(process.env.ADMIN_SESSION_HOURS || 8)) * 3600;
  const secure = process.env.VERCEL === '1' || /^https:/i.test(process.env.PUBLIC_BASE_URL || '');
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly${secure ? '; Secure' : ''}; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearAdminCookieHeader() {
  const secure = process.env.VERCEL === '1' || /^https:/i.test(process.env.PUBLIC_BASE_URL || '');
  return `${COOKIE}=; Path=/; HttpOnly${secure ? '; Secure' : ''}; SameSite=Strict; Max-Age=0`;
}

export function requireAdmin(req) {
  const token = parseCookies(req)[COOKIE];
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_SECRET;
  const session = verifyAdminSession(token, secret);
  return session ? { session, token, csrf: adminCsrfForSession(token, secret) } : null;
}

export function verifyAdminCsrf(req, auth) {
  return auth && timingSafeEqualText(String(req.headers['x-csrf-token'] || ''), auth.csrf);
}
