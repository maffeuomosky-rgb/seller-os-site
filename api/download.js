import { consumeDownload, getOrderByDownloadToken } from '../lib/db.js';
import { downloadEligibility, hashToken } from '../lib/core.js';
import { json, query, requireGet } from '../lib/http.js';
import { loadProductFile } from '../lib/product.js';

export default async function handler(req, res) {
  if (!requireGet(req, res)) return;
  try {
    const token = query(req).get('token') || '';
    if (!token || token.length < 20) return json(res, 400, { error: 'INVALID_TOKEN' });
    const order = await getOrderByDownloadToken(hashToken(token));
    const eligible = downloadEligibility(order);
    if (!eligible.ok) return json(res, eligible.reason === 'NOT_FOUND' ? 404 : 410, { error: eligible.reason });

    const consumed = await consumeDownload(order.id);
    if (!consumed) return json(res, 410, { error: 'LIMIT_REACHED' });
    const product = await loadProductFile();
    res.statusCode = 200;
    res.setHeader('Content-Type', product.contentType || 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${String(product.filename || 'HOST_OS_1.2.zip').replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (Buffer.isBuffer(product.body)) return res.end(product.body);
    const reader = product.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (error) {
    console.error('download', error);
    if (!res.headersSent) json(res, 500, { error: 'DOWNLOAD_FAILED' });
    else res.end();
  }
}
