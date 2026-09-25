import { generateOpaqueToken, hashToken } from './core.js';
import { claimDelivery, issueDownload, markDelivered, markDeliveryError } from './db.js';
import { deliveryEmailHtml, sendEmail } from './email.js';

export async function createDownloadLink(order, baseUrl) {
  const days = Math.max(1, Number(process.env.PRODUCT_DOWNLOAD_DAYS || 7));
  const maxDownloads = Math.max(1, Number(process.env.PRODUCT_MAX_DOWNLOADS || 5));
  const rawToken = generateOpaqueToken(36);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + days * 86400_000);
  await issueDownload(order.id, tokenHash, expiresAt, maxDownloads);
  return {
    downloadUrl: `${baseUrl.replace(/\/$/, '')}/api/download?token=${encodeURIComponent(rawToken)}`,
    expiresAt,
    days,
    maxDownloads
  };
}

export async function deliverOrder(order, baseUrl, { force = false } = {}) {
  const claimed = await claimDelivery(order.id, force);
  if (!claimed) return { ok: true, alreadyDelivered: true, order };
  order = claimed;
  const download = await createDownloadLink(order, baseUrl);
  try {
    await sendEmail({
      to: order.email,
      subject: 'Il tuo Seller OS 1.1 è pronto',
      html: deliveryEmailHtml({ customerName: order.customer_name, orderId: order.id, downloadUrl: download.downloadUrl, expiresDays: download.days, maxDownloads: download.maxDownloads })
    });
    const delivered = await markDelivered(order.id);
    return { ok: true, order: delivered, downloadUrl: download.downloadUrl };
  } catch (error) {
    await markDeliveryError(order.id, error.message);
    return { ok: false, error: error.message, downloadUrl: download.downloadUrl };
  }
}
