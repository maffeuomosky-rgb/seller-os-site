# Seller OS 1.1 — Production

Repository ufficiale del sito commerciale Seller OS 1.1.

## Stato prodotto
- Customer Master Seller OS 1.1 congelato e validato
- Customer Pack definitivo completato
- prezzo commerciale: €49 una tantum
- prezzo precedente/promozionale mostrato: €79 barrato
- nessun abbonamento per la Sheet Edition
- storico pluriennale, Analytics annuale, Monitor DAC7 storico e Report pluriennale inclusi

## Sito
- design master preservato
- SEO e Open Graph configurati
- pagine: /contatti, /termini, /privacy, /rimborsi
- supporto: seller.os001@gmail.com
- responsive desktop/mobile
- Vercel production collegato al branch main

## Checkout
Il checkout viene implementato replicando l'architettura HOST OS 1.2:
Landing → Carrello → Checkout → Ordine → PayPal o Bonifico → PAGAMENTO_DA_VERIFICARE → verifica manuale admin → PAGATO → CONSEGNATO → download protetto.

Il prezzo deve essere sempre determinato lato server con PRODUCT_PRICE_CENTS=4900.

## Sicurezza
Non pubblicare nel repository:
- Customer Pack
- link diretto al Customer Master Google Sheets
- token o credenziali
- DATABASE_URL
- BLOB_READ_WRITE_TOKEN
- segreti admin/sessione
- dati bancari non destinati alla visualizzazione checkout

## Dominio
Finché non viene configurato il dominio OS SUITE definitivo, la produzione resta disponibile sul dominio Vercel del progetto.
