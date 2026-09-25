# Seller OS Checkout — checklist pre-live

- [ ] `/api/health` tutto true
- [ ] database crea ordine
- [ ] PayPal Sandbox crea ordine da 49,00 EUR
- [ ] capture PayPal non accetta 48,99 / valuta diversa
- [ ] webhook con firma non valida respinto
- [ ] webhook duplicato elaborato una sola volta
- [ ] ordine PayPal consegnato solo dopo capture COMPLETED
- [ ] bonifico non consegnato al click "Ho effettuato il bonifico"
- [ ] admin conferma bonifico e invia email
- [ ] email contiene Order ID corretto
- [ ] link download valido
- [ ] sesto download respinto se max=5
- [ ] link scaduto respinto
- [ ] annullamento/rimborso revoca token
- [ ] Customer Pack non raggiungibile da URL pubblico statico
- [ ] Termini / Privacy / Rimborsi raggiungibili dal checkout
- [ ] mobile checkout testato
- [ ] switch Sandbox → Live eseguito solo dopo test completi


## PayPal link manuale — test 1.2.7
- Configura `PAYPAL_MODE=link` e `PAYPAL_PAYMENT_URL`.
- Crea ordine PayPal dal checkout.
- Verifica che il pulsante apra il link PayPal senza esporre segreti.
- Clicca `Ho effettuato il pagamento PayPal`: deve diventare `PAGAMENTO_DA_VERIFICARE`, senza consegna.
- In admin clicca `Conferma pagamento`: solo allora deve partire consegna e download protetto.
- Verifica che un refresh/retry non generi consegne multiple indesiderate.
