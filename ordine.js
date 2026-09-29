const $=s=>document.querySelector(s),params=new URLSearchParams(location.search),id=params.get('id'),token=params.get('token');let timer;
function money(c,curr='EUR'){return new Intl.NumberFormat('it-IT',{style:'currency',currency:curr}).format((Number(c)||0)/100)}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function api(url,options={}){const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},cache:'no-store',...options});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Operazione non riuscita');return d}
async function fetchStatus(){if(!id||!token)throw new Error('Link ordine non valido');return api(`/api/order-status?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`,{method:'GET',headers:{}})}
function badge(s){const good=['PAGATO','CONSEGNATO'].includes(s),bad=['ANNULLATO','RIMBORSATO'].includes(s);return `<span class="co-pill ${good?'good':bad?'bad':'warn'}">${esc(s.replaceAll('_',' '))}</span>`}
function copyButtons(){document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);b.textContent='Copiato'}catch{b.textContent='Copia manualmente'}}))}

function paymentMethodLabel(method){return method==='bank'?'Bonifico bancario':method==='paypal'?'PayPal':String(method||'')}

function paymentConfirmationBox(o){
  if(!o.paidAt)return '';
  const when=new Date(o.paidAt).toLocaleString('it-IT');
  const current=o.paymentStatus==='REFUNDED'?' · successivamente rimborsato':'';
  return `<div class="co-bank" style="margin-top:20px"><span class="co-kicker">CONFERMA PAGAMENTO</span><h3>Pagamento ricevuto</h3><div class="co-bank-row"><span>Ordine</span><code>${esc(o.id)}</code><span></span></div><div class="co-bank-row"><span>Importo</span><code>${money(o.amountCents,o.currency)}</code><span></span></div><div class="co-bank-row"><span>Metodo</span><code>${esc(paymentMethodLabel(o.paymentMethod))}</code><span></span></div><div class="co-bank-row"><span>Verificato</span><code>${esc(when)}${esc(current)}</code><span></span></div><p class="co-note">Questa conferma documenta la ricezione del pagamento relativo all’ordine indicato. Non costituisce fattura e non sostituisce eventuali documenti fiscali dovuti.</p><button id="print-payment-confirmation" class="co-secondary" type="button" style="width:100%">Stampa o salva la conferma</button></div>`;
}

function bindPaymentConfirmation(o){
  const btn=$('#print-payment-confirmation');
  if(!btn||!o.paidAt)return;
  btn.addEventListener('click',()=>{
    const when=new Date(o.paidAt).toLocaleString('it-IT');
    const w=window.open('','_blank','noopener,noreferrer,width=760,height=760');
    if(!w)return;
    w.document.write(`<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Conferma pagamento ${esc(o.id)}</title><style>body{font-family:Arial,sans-serif;color:#172832;padding:44px;line-height:1.55}h1{font-size:28px;margin:0 0 8px}.muted{color:#6d7b84}.box{margin-top:26px;border:1px solid #dce5e9;border-radius:14px;padding:20px}.row{display:flex;justify-content:space-between;gap:20px;padding:10px 0;border-bottom:1px solid #edf1f3}.row:last-child{border:0}small{display:block;margin-top:24px;color:#7c8991}@media print{button{display:none}}</style></head><body><div class="muted">SELLER OS 1.1</div><h1>Conferma pagamento ricevuto</h1><p class="muted">Conferma relativa all’ordine ${esc(o.id)}</p><div class="box"><div class="row"><span>Cliente</span><strong>${esc(o.customerName)}</strong></div><div class="row"><span>Ordine</span><strong>${esc(o.id)}</strong></div><div class="row"><span>Importo</span><strong>${money(o.amountCents,o.currency)}</strong></div><div class="row"><span>Metodo</span><strong>${esc(paymentMethodLabel(o.paymentMethod))}</strong></div><div class="row"><span>Pagamento verificato</span><strong>${esc(when)}</strong></div></div><small>Questa conferma documenta la ricezione del pagamento relativo all’ordine indicato. Non costituisce fattura e non sostituisce eventuali documenti fiscali dovuti.</small><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  });
}

function withdrawalBox(o){
  if(o.withdrawalRequestedAt){
    const when=new Date(o.withdrawalRequestedAt).toLocaleString('it-IT');
    return `<div class="co-bank" style="margin-top:20px"><span class="co-kicker">RECESSO ONLINE</span><h3>Recesso registrato</h3><p class="co-note">La dichiarazione di recesso per l’ordine <strong>${esc(o.id)}</strong> è stata ricevuta il ${esc(when)}. La consegna digitale è stata bloccata.</p>${o.paymentStatus==='PAID'?'<p class="co-note">Il pagamento risulta già ricevuto. L’eventuale rimborso verrà gestito secondo il metodo applicabile.</p>':''}</div>`;
  }
  if(!o.canWithdraw)return '';
  const deadline=o.withdrawalPeriodEndsAt?new Date(o.withdrawalPeriodEndsAt).toLocaleString('it-IT'):'';
  return `<div class="co-bank" style="margin-top:20px" id="withdrawal-box"><span class="co-kicker">DIRITTO DI RECESSO</span><h3>Recedere dal contratto qui</h3><p class="co-note">Finché la fornitura digitale non è iniziata e il diritto è esercitabile, puoi inviare online la dichiarazione di recesso. La richiesta blocca la consegna di SELLER OS.</p>${deadline?`<p class="co-note">Termine indicativo: ${esc(deadline)}</p>`:''}<button id="withdraw-open" class="co-secondary" type="button" style="width:100%">Recedere dal contratto qui</button><div id="withdraw-confirm" hidden style="margin-top:14px"><div class="co-bank-row"><span>Nome</span><code>${esc(o.customerName)}</code><span></span></div><div class="co-bank-row"><span>Ordine</span><code>${esc(o.id)}</code><span></span></div><div class="co-bank-row"><span>Conferma a</span><code>${esc(o.email)}</code><span></span></div><p class="co-note">Confermando comunichi la tua decisione di recedere dal contratto per questo ordine.</p><button id="withdraw-confirm-btn" class="co-primary" type="button">Conferma recesso</button><button id="withdraw-cancel-btn" class="co-secondary" type="button" style="width:100%;margin-top:8px">Annulla</button><div id="withdraw-error" class="co-error" role="alert"></div></div></div>`;
}

function bindWithdrawal(){
  const open=$('#withdraw-open'),panel=$('#withdraw-confirm'),confirmBtn=$('#withdraw-confirm-btn'),cancelBtn=$('#withdraw-cancel-btn'),error=$('#withdraw-error');
  if(!open||!panel||!confirmBtn)return;
  open.addEventListener('click',()=>{panel.hidden=false;open.hidden=true});
  cancelBtn?.addEventListener('click',()=>{panel.hidden=true;open.hidden=false});
  confirmBtn.addEventListener('click',async()=>{
    confirmBtn.disabled=true;confirmBtn.textContent='Invio recesso…';if(error)error.classList.remove('show');
    try{
      const d=await api('/api/order-status',{method:'POST',body:JSON.stringify({action:'withdraw',id,token})});
      render(d);
    }catch(e){
      if(error){error.textContent=e.message==='DELIVERY_IN_PROGRESS'?'La consegna è in elaborazione. Riprova tra pochi secondi o contatta il supporto.':e.message==='WITHDRAWAL_PERIOD_EXPIRED'?'Il periodo di recesso risulta scaduto.':e.message==='WITHDRAWAL_NO_LONGER_AVAILABLE'?'Il diritto di recesso non risulta più esercitabile per questo ordine.':e.message;error.classList.add('show')}
      confirmBtn.disabled=false;confirmBtn.textContent='Conferma recesso';
    }
  });
}

function render(o){
  const paid=['PAGATO','CONSEGNATO'].includes(o.orderStatus);
  const withdrawn=Boolean(o.withdrawalRequestedAt);
  $('#order-title').textContent=withdrawn?'Recesso registrato':o.canDownload?'SELLER OS è pronto':o.orderStatus==='CONSEGNATO'?'SELLER OS è stato consegnato':o.orderStatus==='PAGATO'?'Pagamento verificato':o.orderStatus==='PAGAMENTO_DA_VERIFICARE'?'Pagamento da verificare':'Ordine ricevuto';
  let lead;
  if(withdrawn)lead=`La dichiarazione di recesso è stata registrata. La consegna digitale di SELLER OS è stata bloccata.`;
  else if(o.canDownload)lead=`Il pagamento è stato verificato. Puoi scaricare SELLER OS qui oppure utilizzare il link ricevuto a ${o.email}.`;
  else if(o.orderStatus==='CONSEGNATO')lead=`Abbiamo inviato SELLER OS a ${o.email}. Se il link è scaduto contatta il supporto.`;
  else if(o.orderStatus==='PAGATO')lead='Pagamento verificato. Stiamo completando la consegna automatica di SELLER OS.';
  else if(o.paymentMethod==='bank')lead='Riceverai SELLER OS via e-mail e in questa pagina appena l’accredito bancario sarà verificato, normalmente entro 24 ore.';
  else lead='Riceverai SELLER OS via e-mail e in questa pagina appena il pagamento PayPal sarà verificato, normalmente entro 24 ore.';
  $('#order-lead').textContent=lead;

  let details='';
  if(!withdrawn&&o.paymentMethod==='bank'&&o.bank&&!paid){details=`<div class="co-bank" style="margin-top:20px"><h3>Dati per il bonifico</h3><div class="co-bank-row"><span>Beneficiario</span><code>${esc(o.bank.accountName)}</code><button class="co-copy" data-copy="${esc(o.bank.accountName)}">Copia</button></div><div class="co-bank-row"><span>IBAN</span><code>${esc(o.bank.iban)}</code><button class="co-copy" data-copy="${esc(o.bank.iban)}">Copia</button></div><div class="co-bank-row"><span>Causale</span><code>${esc(o.bank.reference)}</code><button class="co-copy" data-copy="${esc(o.bank.reference)}">Copia</button></div></div>`}
  if(!withdrawn&&o.paymentMethod==='paypal'&&o.paypal&&['IN_ATTESA_PAGAMENTO','PAGAMENTO_DA_VERIFICARE'].includes(o.orderStatus)){details=`<div class="co-bank" style="margin-top:20px"><h3>Pagamento PayPal</h3><div class="co-bank-row"><span>Riferimento</span><code>${esc(o.paypal.reference)}</code><button class="co-copy" data-copy="${esc(o.paypal.reference)}">Copia</button></div><a class="co-primary" href="${esc(o.paypal.paymentUrl)}" target="_blank" rel="noopener noreferrer" style="margin-top:14px;text-decoration:none">Apri PayPal</a><p class="co-note" style="margin-top:12px">Se hai già pagato, non effettuare un secondo pagamento. Attendi la verifica.</p></div>`}

  let download='';
  if(o.canDownload){const remaining=Math.max(0,Number(o.maxDownloads||0)-Number(o.downloadCount||0));const expiry=o.downloadExpiresAt?new Date(o.downloadExpiresAt).toLocaleString('it-IT'):'';download=`<div class="co-bank" style="margin-top:20px"><span class="co-kicker">CONSEGNA DIGITALE</span><h3>Il tuo Customer Pack è disponibile</h3><p class="co-note">Scarica il pacchetto completo SELLER OS 1.1. Il link resta protetto e collegato al tuo ordine.</p><a class="co-primary order-download" href="/api/order-download?id=${encodeURIComponent(o.id)}&token=${encodeURIComponent(token)}">Scarica SELLER OS 1.1</a><div class="order-download-meta">${remaining} download disponibili${expiry?` · valido fino al ${esc(expiry)}`:''}</div></div>`}

  $('#order-box').innerHTML=`<div class="co-bank"><div class="co-bank-row"><span>Ordine</span><code>${esc(o.id)}</code><span></span></div><div class="co-bank-row"><span>Importo</span><code>${money(o.amountCents,o.currency)}</code><span></span></div><div class="co-bank-row"><span>Metodo</span><code>${o.paymentMethod==='bank'?'Bonifico bancario':'PayPal'}</code><span></span></div><div class="co-bank-row"><span>E-mail</span><code>${esc(o.email)}</code><span></span></div><div class="co-bank-row"><span>Stato</span><div>${badge(o.orderStatus)}</div><span></span></div></div>${download}${details}${paymentConfirmationBox(o)}${withdrawalBox(o)}<p class="co-note">Questa pagina si aggiorna automaticamente. Conserva il link dell’ordine finché non hai completato il download o la gestione dell’ordine.</p>`;
  copyButtons();bindPaymentConfirmation(o);bindWithdrawal();if(['ANNULLATO','RIMBORSATO'].includes(o.orderStatus)){clearInterval(timer);timer=null}
}
async function refresh(){try{render(await fetchStatus())}catch(e){$('#order-error').textContent=e.message;$('#order-error').classList.add('show');clearInterval(timer)}}
refresh();timer=setInterval(refresh,5000);
