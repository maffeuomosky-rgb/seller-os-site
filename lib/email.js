export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function deliveryEmailHtml({ customerName, orderId, downloadUrl, expiresDays, maxDownloads }) {
  const support = process.env.SUPPORT_EMAIL || '';
  return `<!doctype html><html><body style="margin:0;background:#f4f7f9;font-family:Arial,sans-serif;color:#10232d">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #dce6eb;border-radius:22px;overflow:hidden">
      <tr><td style="padding:34px 36px 16px"><div style="font-size:13px;letter-spacing:.14em;color:#0aa8b8;font-weight:700">Seller OS 1.1</div><h1 style="font-size:28px;line-height:1.15;margin:10px 0 12px">Il tuo Seller OS è pronto</h1><p style="font-size:16px;line-height:1.6;color:#536a76;margin:0">Ciao ${esc(customerName)}, il pagamento dell’ordine <strong>${esc(orderId)}</strong> è stato verificato.</p></td></tr>
      <tr><td style="padding:16px 36px"><a href="${esc(downloadUrl)}" style="display:inline-block;background:#24d9d4;color:#08232c;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:12px">Scarica Seller OS 1.1</a></td></tr>
      <tr><td style="padding:8px 36px 34px"><p style="font-size:14px;line-height:1.65;color:#536a76">Il link resta valido per ${esc(expiresDays)} giorni e consente fino a ${esc(maxDownloads)} download. Dopo l’estrazione del pacchetto, inizia da <strong>00_APRI_SELLER_OS.html</strong> e consulta Quick Start.</p>${support ? `<p style="font-size:14px;color:#536a76">Supporto: <a href="mailto:${esc(support)}">${esc(support)}</a></p>` : ''}<p style="font-size:12px;color:#8a9aa3">Prodotto digitale Seller OS · Ordine ${esc(orderId)}</p></td></tr>
    </table>
  </td></tr></table></body></html>`;
}


export function orderReceivedEmailHtml({ customerName, orderId, orderUrl, paymentMethod, bank, paypal }) {
  const support = process.env.SUPPORT_EMAIL || '';
  const payment = paymentMethod === 'bank'
    ? `<p style="font-size:14px;line-height:1.65;color:#536a76"><strong>Bonifico bancario</strong><br>Beneficiario: ${esc(bank?.accountName || '')}<br>IBAN: ${esc(bank?.iban || '')}<br>Causale: <strong>${esc(bank?.reference || '')}</strong></p>`
    : `<p style="font-size:14px;line-height:1.65;color:#536a76"><strong>PayPal</strong><br>Riferimento: <strong>${esc(paypal?.reference || '')}</strong>${paypal?.paymentUrl ? `<br><a href="${esc(paypal.paymentUrl)}">Apri PayPal</a>` : ''}</p>`;
  return `<!doctype html><html><body style="margin:0;background:#f4f7f9;font-family:Arial,sans-serif;color:#10232d"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border:1px solid #dce6eb;border-radius:22px;overflow:hidden"><tr><td style="padding:34px 36px"><div style="font-size:13px;letter-spacing:.14em;color:#0aa8b8;font-weight:700">Seller OS 1.1</div><h1 style="font-size:28px;line-height:1.15;margin:10px 0 12px">Ordine ricevuto</h1><p style="font-size:16px;line-height:1.6;color:#536a76">Ciao ${esc(customerName)}, abbiamo registrato l’ordine <strong>${esc(orderId)}</strong>. Dopo la verifica del pagamento Seller OS sarà disponibile via e-mail e nella pagina ordine. La verifica viene normalmente effettuata entro 24 ore.</p>${payment}<p><a href="${esc(orderUrl)}" style="display:inline-block;background:#24d9d4;color:#08232c;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:12px">Segui il tuo ordine</a></p>${support ? `<p style="font-size:13px;color:#536a76">Supporto: <a href="mailto:${esc(support)}">${esc(support)}</a></p>` : ''}</td></tr></table></td></tr></table></body></html>`;
}

export async function sendEmail({ to, subject, html }) {
  if (!emailConfigured()) throw new Error('Provider email non configurato: imposta RESEND_API_KEY ed EMAIL_FROM');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html })
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(data?.message || `Invio email fallito (${response.status})`);
  return data;
}
