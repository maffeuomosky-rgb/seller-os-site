import { requireAdmin } from '../lib/admin-auth.js';
import { json, requireGet } from '../lib/http.js';

export default async function handler(req, res) {
  if (!requireGet(req, res)) return;
  const auth = requireAdmin(req);
  if (!auth) return json(res, 401, { authenticated: false });
  json(res, 200, { authenticated: true, csrf: auth.csrf });
}
