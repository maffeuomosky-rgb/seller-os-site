import fs from 'node:fs/promises';
import path from 'node:path';
import { get } from '@vercel/blob';

export async function loadProductFile() {
  const blobPath = process.env.PRODUCT_BLOB_PATHNAME;
  if (blobPath && process.env.BLOB_READ_WRITE_TOKEN) {
    const result = await get(blobPath, { access: 'private', token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!result || result.statusCode !== 200) throw new Error('Customer Pack non trovato nello storage privato');
    return {
      body: result.stream,
      contentType: result.blob.contentType || 'application/zip',
      filename: path.basename(result.blob.pathname || 'SELLER_OS_1.1_CUSTOMER_PACK_DEFINITIVO.zip')
    };
  }
  const filePath = process.env.PRODUCT_FILE_PATH;
  if (filePath) {
    const data = await fs.readFile(filePath);
    return { body: data, contentType: 'application/zip', filename: path.basename(filePath) };
  }
  throw new Error('File prodotto non configurato: usa PRODUCT_BLOB_PATHNAME o PRODUCT_FILE_PATH');
}
