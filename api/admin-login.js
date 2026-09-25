import { adminCookieHeader, checkAdminPassword, makeAdminSession } from '../lib/admin-auth.js';
import { clientIp, json, readJson, requirePost } from '../lib/http.js';
import { allowRequest } from '../lib/rate-limit.js';

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;
  if (!allowRequest(`admin-login:${clientIp(req)}`, { limit: 6, windowMs: 10 * 60_000 })) return json(res, 429, { error: 'TOO_MANY_REQUESTS' });
  try {
    const body = await readJson(req);
    if (!checkAdminPassword(body.password)) return json(res, 401, { error: 'INVALID_CREDENTIALS' });
    const session = makeAdminSession();
    res.setHeader('Set-Cookie', adminCookieHeader(session.token));
    json(res, 200, { ok: true, csrf: session.csrf });
  } catch (error) {
    console.error('admin-login', error);
    json(res, 500, { error: 'LOGIN_FAILED' });
  }
}
