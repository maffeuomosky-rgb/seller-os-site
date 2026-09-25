# Seller OS 1.1 — Configurazione checkout Production Master

Questa è la configurazione della release commerciale congelata.

## Flusso attivo

Landing → Carrello → Checkout → Ordine → PayPal link oppure Bonifico → `PAGAMENTO_DA_VERIFICARE` → verifica manuale admin → `Conferma pagamento` → e-mail automatica → download protetto

La verifica del denaro rimane manuale. Tutto ciò che viene dopo la conferma è automatizzato.

## 1. Variabili ambiente

Configura in Vercel → Project → Settings → Environment Variables

```env
PUBLIC_BASE_URL=https://seller-os-site-eight.vercel.app
SUPPORT_EMAIL=...

PRODUCT_NAME=Seller OS 1.1
PRODUCT_PRICE_CENTS=4900
PRODUCT_CURRENCY=EUR
PRODUCT_DOWNLOAD_DAYS=7
PRODUCT_MAX_DOWNLOADS=5

DATABASE_URL=postgresql://...

PAYPAL_MODE=link
PAYPAL_PAYMENT_URL=https://...

BANK_ACCOUNT_NAME=...
BANK_IBAN=...

RESEND_API_KEY=...
EMAIL_FROM=Seller OS <sender@dominio-verificato.it>

BLOB_READ_WRITE_TOKEN=...
PRODUCT_BLOB_PATHNAME=SELLER_OS_1.1_CUSTOMER_PACK_DEFINITIVO.zip

ADMIN_SECRET=...
SESSION_SECRET=...
ADMIN_SESSION_HOURS=8
```

Non inserire segreti direttamente nei file del repository.

## 2. Database

Usa PostgreSQL compatibile con `DATABASE_URL`, attualmente Neon.

Tabelle principali:

- `seller_orders`
- `seller_webhook_events`

## 3. PayPal

La modalità corrente è:

`PAYPAL_MODE=link`

Il cliente apre PayPal dal checkout, paga e poi preme `Ho effettuato il pagamento PayPal`.

Questa azione non consegna il prodotto. L'ordine passa a `PAGAMENTO_DA_VERIFICARE`.

Dopo aver verificato realmente l'incasso, l'admin usa `Conferma pagamento`.

## 4. Bonifico

Configura:

- `BANK_ACCOUNT_NAME`
- `BANK_IBAN`

Seller OS crea automaticamente una causale univoca collegata all'ordine.

Il cliente segnala il bonifico ma la consegna parte solo dopo la conferma manuale nell'admin.

## 5. Customer Pack privato

File ufficiale:

`SELLER_OS_1.1_CUSTOMER_PACK_DEFINITIVO.zip`

Storage:

- Vercel Blob privato
- store `host-os-products`
- pathname `SELLER_OS_1.1_CUSTOMER_PACK_DEFINITIVO.zip`

Non inserire il Customer Pack negli asset pubblici o nel repository.

Il link Google Sheets `/copy` è incorporato nel Customer Pack e non deve essere pubblicato nel repository.

## 6. E-mail

Configura Resend con:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `SUPPORT_EMAIL`

Il sistema invia:

1. conferma ordine, quando prevista dal flusso
2. consegna finale con link protetto dopo la conferma del pagamento

La configurazione tecnica è testata. Per inviare a clienti arbitrari in produzione serve un dominio mittente verificato in Resend. Il sender `onboarding@resend.dev` è solo per test.

Se l'e-mail finale fallisce, l'ordine resta pagato e il cliente può comunque scaricare Seller OS dalla pagina ordine se il download è stato generato.

## 7. Download protetto

- token casuale
- pagina ordine autenticata da customer token
- scadenza predefinita 7 giorni
- massimo 5 download
- rigenerazione link disponibile dall'admin
- reinvio e-mail disponibile dall'admin

## 8. Admin

Apri:

`/admin.html`

Azioni validate:

- Conferma pagamento
- Reinvia e-mail
- Rigenera link
- Annulla
- Segna rimborsato

`Segna rimborsato` aggiorna lo stato e revoca il download. L'eventuale movimento finanziario di rimborso va eseguito separatamente nel metodo di pagamento.

## 9. Health check

Apri:

`/api/health`

Al freeze Seller OS 1.1 risultano configurati:

- database
- PayPal
- bonifico
- e-mail
- prodotto
- admin

## 10. Test end-to-end validati

### PayPal

Checkout → PayPal → Ho effettuato il pagamento → Admin → Conferma → E-mail → Pagina ordine → Download

### Bonifico

Checkout → dati bonifico → Ho effettuato il bonifico → Admin → Conferma → E-mail → Pagina ordine → Download

### Azioni amministrative

- Reinvia e-mail: OK
- Rigenera link: OK
- Annulla: OK
- Segna rimborsato + revoca download: OK

## 11. Endpoint principali

- `GET /api/config`
- `POST /api/orders`
- `GET /api/order-status`
- `POST /api/paypal-link-notify`
- `POST /api/bank-notify`
- `GET /api/download`
- `GET /api/order-download`
- `POST /api/admin-login`
- `GET /api/admin-session`
- `GET /api/admin-orders`
- `POST /api/admin-action`
- `GET /api/health`

## 12. Sicurezza

- Customer Pack fuori dagli asset pubblici
- token download memorizzato solo come hash
- scadenza e limite download
- pagina ordine protetta da customer token
- cookie admin HttpOnly/Secure/SameSite
- CSRF sulle azioni admin
- query SQL parametrizzate
- rate limit best-effort su creazione ordine/login
- controllo Origin sul checkout

## 13. Upgrade futuri

Non modificare Seller OS 1.1 durante la replica su Seller OS.

Eventuali correzioni future vanno versionate come `1.2.x` o release successiva.

L'automazione della verifica PayPal tramite API/webhook resta un upgrade futuro opzionale.
