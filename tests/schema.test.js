import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('schema garantisce idempotenza webhook',()=>{
  const sql=fs.readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8');
  assert.match(sql,/seller_webhook_events/i);
  assert.match(sql,/event_id\s+TEXT\s+PRIMARY KEY/i);
});

test('schema contiene limiti download e consensi',()=>{
  const sql=fs.readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8');
  assert.match(sql,/download_count/i);assert.match(sql,/max_downloads/i);assert.match(sql,/consent_immediate_delivery/i);
});
