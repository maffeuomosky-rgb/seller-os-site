# Seller OS 1.1 — Production Checkout

Seller OS usa l'architettura commerciale congelata di HOST OS 1.2, mantenendo separati branding, prodotto, Customer Pack e dati operativi.

## Flusso commerciale

Landing → Carrello → Checkout → Ordine → PayPal link oppure Bonifico → `PAGAMENTO_DA_VERIFICARE` → verifica manuale admin → `PAGATO` / `CONSEGNATO` → e-mail → download protetto

## Prezzo

- €49 una tantum
- €79 prezzo precedente barrato
- nessun abbonamento

## Stati ordine

- IN_ATTESA_PAGAMENTO
- PAGAMENTO_DA_VERIFICARE
- PAGATO
- CONSEGNATO
- ANNULLATO
- RIMBORSATO

## Infrastruttura

- Vercel
- PostgreSQL / Neon
- PayPal link con verifica manuale
- bonifico con verifica manuale
- admin protetto
- Resend
- Vercel Blob privato
- download tokenizzato valido 7 giorni
- massimo 5 download

## Tabelle

- seller_orders
- seller_webhook_events

## Sicurezza

Il Customer Pack, il link Google Sheets /copy e i segreti di produzione non devono essere pubblicati nel repository

## Stato

Codice checkout derivato dalla Production Master HOST OS 1.2. La release Seller OS diventa Production Master solo dopo configurazione environment, Blob, Neon e test E2E completi
