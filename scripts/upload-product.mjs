import fs from 'node:fs/promises';
import path from 'node:path';
import { put } from '@vercel/blob';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Uso: node scripts/upload-product.mjs /percorso/SELLER_OS_1.1_CUSTOMER_PACK_DEFINITIVO.zip');
  process.exit(1);
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN non configurato. Crea/collega prima uno store Vercel Blob PRIVATO.');
  process.exit(1);
}
const data = await fs.readFile(filePath);
const pathname = `products/${path.basename(filePath)}`;
const blob = await put(pathname, data, {
  access: 'private',
  token: process.env.BLOB_READ_WRITE_TOKEN,
  contentType: 'application/zip',
  allowOverwrite: true,
  addRandomSuffix: false
});
console.log('Upload completato.');
console.log('PRODUCT_BLOB_PATHNAME=' + blob.pathname);
console.log('URL privato:', blob.url);
