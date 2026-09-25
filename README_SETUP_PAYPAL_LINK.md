# Seller OS 1.1 — Checkout PayPal Link + Bonifico

Questa versione usa un link PayPal pubblico con verifica manuale dell'incasso. Non richiede PayPal REST API, Client ID, Client Secret o webhook.

## Flusso PayPal
1. Il cliente compila checkout.html e seleziona PayPal.
2. Seller OS crea un ordine univoco SEL-... nel database.
3. Il cliente apre il link PayPal configurato in `PAYPAL_PAYMENT_URL` e paga 49 EUR.
4. Il cliente clicca `Ho effettuato il pagamento PayPal`.
5. L'ordine passa a `PAGAMENTO_DA_VERIFICARE`.
6. L'amministratore controlla l'incasso direttamente su PayPal.
7. In `/admin.html` preme `Conferma pagamento`.
8. Seller OS marca l'ordine PAGATO, genera il link protetto, invia l'e-mail e porta l'ordine a CONSEGNATO se l'invio riesce.

## Variabili minime

```env
PUBLIC_BASE_URL=https://tuo-dominio.example
PRODUCT_NAME=Seller OS 1.1
PRODUCT_PRICE_CENTS=4900
PRODUCT_CURRENCY=EUR
DATABASE_URL=...

PAYPAL_MODE=link
PAYPAL_PAYMENT_URL=https://...

BANK_ACCOUNT_NAME=...
BANK_IBAN=...

RESEND_API_KEY=...
EMAIL_FROM=Seller OS <...>
SUPPORT_EMAIL=...

BLOB_READ_WRITE_TOKEN=...
PRODUCT_BLOB_PATHNAME=products/SELLER_OS_1.1_CUSTOMER_PACK_DEFINITIVO.zip

ADMIN_SECRET=...
SESSION_SECRET=...
```

`PAYPAL_PAYMENT_URL` deve contenere il link pubblico che vuoi mostrare al cliente. Può essere un PayPal.Me o altro link PayPal utilizzabile per ricevere il pagamento. Se il link non imposta automaticamente l'importo, il checkout mostra comunque chiaramente che il pagamento richiesto è 49,00 EUR.

## Cosa NON mettere nel sito o in GitHub
- password PayPal
- credenziali PayPal
- ADMIN_SECRET
- SESSION_SECRET
- DATABASE_URL
- RESEND_API_KEY
- BLOB_READ_WRITE_TOKEN
- IBAN se non vuoi versionarlo nel repository (va inserito su Vercel come env)

## Verifica manuale
Il bottone `Ho effettuato il pagamento PayPal` NON consegna il prodotto. Segnala soltanto l'ordine come `PAGAMENTO_DA_VERIFICARE`. La consegna parte esclusivamente dopo `Conferma pagamento` dal pannello admin.

## Futuro passaggio alle API PayPal
Il progetto conserva gli endpoint API PayPal già presenti. In futuro puoi impostare `PAYPAL_MODE=api` e configurare Client ID / Secret / Webhook senza rifare il checkout.


## Stato configurazione pagamenti 1.3.1
Il link PayPal pubblico, il beneficiario del bonifico e l’IBAN sono stati ricevuti e predisposti nella configurazione ambiente. Prima del deploy di produzione copiare i valori di `.env.example` nelle Environment Variables del progetto Vercel.
