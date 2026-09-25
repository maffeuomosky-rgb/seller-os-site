const $ = s => document.querySelector(s);
const form = $('#checkout-form');
const button = $('#continue-btn');
const errorBox = $('#checkout-error');
const paymentArea = $('#payment-area');
let config = null;
let currentOrder = null;

function money(cents, currency='EUR'){return new Intl.NumberFormat('it-IT',{style:'currency',currency}).format((Number(cents)||0)/100)}
function showError(msg){errorBox.textContent=msg;errorBox.classList.add('show')}
function clearError(){errorBox.textContent='';errorBox.classList.remove('show')}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function api(url, options={}){const r=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||'Operazione non riuscita');return d}
function validateForm(){const method=form.paymentMethod.value;button.disabled=!(form.firstName.value.trim().length>1 && form.lastName.value.trim().length>1 && form.email.value.includes('@') && form.email.value.trim().toLowerCase()===form.emailConfirm.value.trim().toLowerCase() && method && $('#consentTerms').checked && $('#consentImmediate').checked)}
form.addEventListener('input',validateForm);form.addEventListener('change',validateForm);

async function loadConfig(){
  try{config=await api('/api/config',{method:'GET',headers:{}});if(!config.paypalEnabled){$('#pay-paypal').disabled=true;$('#pay-paypal').nextElementSibling.style.opacity='.48'}if(!config.bankEnabled){$('#pay-bank').disabled=true;$('#pay-bank').nextElementSibling.style.opacity='.48'}if(!config.paypalEnabled&&!config.bankEnabled)showError('Il checkout non è ancora configurato. Riprova più tardi.')}catch(e){showError('Impossibile caricare la configurazione del checkout.')}
}

form.addEventListener('submit',async e=>{
  e.preventDefault();clearError();validateForm();if(button.disabled)return;
  button.disabled=true;button.textContent='Creo il tuo ordine…';
  const payload={name:`${form.firstName.value.trim()} ${form.lastName.value.trim()}`.trim(),email:form.email.value,emailConfirm:form.emailConfirm.value,paymentMethod:form.paymentMethod.value,consentTerms:$('#consentTerms').checked,consentImmediateDelivery:$('#consentImmediate').checked,marketingConsent:$('#marketing').checked,website:form.website.value};
  try{document.querySelector('[data-step="2"]')?.classList.add('active');currentOrder=await api('/api/orders',{method:'POST',body:JSON.stringify(payload)});form.querySelectorAll('input').forEach(x=>x.disabled=true);button.style.display='none';paymentArea.classList.add('show');if(currentOrder.paymentMethod==='bank')renderBank(currentOrder);else await renderPayPal(currentOrder)}catch(err){showError(mapError(err.message));button.disabled=false;button.textContent='Continua al pagamento'}
});

function mapError(code){const m={EMAIL_MISMATCH:'Le due e-mail non coincidono.',EMAIL_INVALID:'Inserisci un indirizzo e-mail valido.',CONSENT_REQUIRED:'Per continuare devi accettare le condizioni obbligatorie.',PAYPAL_NOT_CONFIGURED:'PayPal non è ancora configurato.',BANK_NOT_CONFIGURED:'Il bonifico non è ancora configurato.',DATABASE_URL:'Il checkout non è ancora pronto.'};return m[code]||code||'Operazione non riuscita.'}

function renderBank(order){
  const b=order.bank;paymentArea.innerHTML=`<div class="co-bank"><span class="co-kicker">ORDINE ${esc(order.orderId)}</span><h3>Effettua il bonifico di ${money(order.amountCents,order.currency)}</h3><p class="co-note">Usa esattamente la causale indicata. Seller OS verrà reso disponibile via e-mail e nella pagina ordine dopo la verifica dell’accredito, normalmente entro 24 ore.</p><div class="co-bank-row"><span>Beneficiario</span><code>${esc(b.accountName)}</code><button class="co-copy" data-copy="${esc(b.accountName)}">Copia</button></div><div class="co-bank-row"><span>IBAN</span><code>${esc(b.iban)}</code><button class="co-copy" data-copy="${esc(b.iban)}">Copia</button></div><div class="co-bank-row"><span>Causale</span><code>${esc(b.reference)}</code><button class="co-copy" data-copy="${esc(b.reference)}">Copia</button></div><button id="bank-done" class="co-primary" style="margin-top:16px">Ho effettuato il bonifico</button><div class="co-order-meta"><span class="co-pill warn">In attesa di verifica</span></div></div>`;
  paymentArea.querySelectorAll('[data-copy]').forEach(btn=>btn.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(btn.dataset.copy);btn.textContent='Copiato'}catch{btn.textContent='Seleziona e copia'}}));
  $('#bank-done').addEventListener('click',async()=>{const btn=$('#bank-done');btn.disabled=true;btn.textContent='Invio conferma…';try{await api('/api/bank-notify',{method:'POST',body:JSON.stringify({orderId:order.orderId,customerToken:order.customerToken})});location.href=`ordine.html?id=${encodeURIComponent(order.orderId)}&token=${encodeURIComponent(order.customerToken)}`}catch(e){showError(e.message);btn.disabled=false;btn.textContent='Ho effettuato il bonifico'}})
}

async function loadPayPalSdk(){if(window.paypal)return;if(!config?.paypalClientId)throw new Error('PayPal API non configurato');await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(config.paypalClientId)}&currency=${encodeURIComponent(config.currency)}&intent=capture&components=buttons`;s.onload=resolve;s.onerror=()=>reject(new Error('Impossibile caricare PayPal'));document.head.appendChild(s)})}

function renderPayPalLink(order){
  const p=order.paypal||{};
  const paymentUrl=p.paymentUrl||config?.paypalPaymentUrl;
  if(!paymentUrl)throw new Error('PayPal non configurato');
  paymentArea.innerHTML=`<div class="co-bank"><span class="co-kicker">ORDINE ${esc(order.orderId)}</span><h3>Paga ${money(order.amountCents,order.currency)} con PayPal</h3><p class="co-note">Apri PayPal con il pulsante qui sotto ed effettua il pagamento di <strong>${money(order.amountCents,order.currency)}</strong>. Se PayPal ti permette di aggiungere una nota, usa il riferimento <strong>${esc(p.reference||`Seller OS · ${order.orderId}`)}</strong>.</p><div class="co-bank-row"><span>Riferimento ordine</span><code>${esc(p.reference||`Seller OS · ${order.orderId}`)}</code><button class="co-copy" data-copy="${esc(p.reference||`Seller OS · ${order.orderId}`)}">Copia</button></div><a id="paypal-link-btn" class="co-primary co-paypal-link" href="${esc(paymentUrl)}" target="_blank" rel="noopener noreferrer" style="margin-top:16px;text-decoration:none">Apri PayPal e paga ${money(order.amountCents,order.currency)}</a><button id="paypal-done" class="co-secondary" style="margin-top:10px;width:100%">Ho effettuato il pagamento PayPal</button><p class="co-note" style="margin-top:12px">Il pagamento non viene considerato valido automaticamente: Seller OS sarà reso disponibile solo dopo la verifica dell’incasso, normalmente entro 24 ore.</p><div class="co-order-meta"><span class="co-pill warn">In attesa di verifica</span></div></div>`;
  paymentArea.querySelectorAll('[data-copy]').forEach(btn=>btn.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(btn.dataset.copy);btn.textContent='Copiato'}catch{btn.textContent='Seleziona e copia'}}));
  $('#paypal-done').addEventListener('click',async()=>{const btn=$('#paypal-done');btn.disabled=true;btn.textContent='Invio conferma…';try{await api('/api/paypal-link-notify',{method:'POST',body:JSON.stringify({orderId:order.orderId,customerToken:order.customerToken})});location.href=`ordine.html?id=${encodeURIComponent(order.orderId)}&token=${encodeURIComponent(order.customerToken)}`}catch(e){showError(e.message);btn.disabled=false;btn.textContent='Ho effettuato il pagamento PayPal'}})
}

async function renderPayPalApi(order){
  paymentArea.innerHTML=`<div class="co-bank"><span class="co-kicker">ORDINE ${esc(order.orderId)}</span><h3>Paga ${money(order.amountCents,order.currency)} con PayPal</h3><p class="co-note">Il pagamento viene verificato lato server. Seller OS viene consegnato solo quando PayPal conferma realmente l’incasso.</p><div id="paypal-buttons" class="paypal-wrap"></div><div class="co-order-meta"><span class="co-pill warn">Pagamento da completare</span></div></div>`;
  await loadPayPalSdk();
  await window.paypal.Buttons({
    style:{layout:'vertical',shape:'rect',label:'paypal',height:46},
    createOrder:async()=>{const d=await api('/api/paypal-create-order',{method:'POST',body:JSON.stringify({orderId:order.orderId,customerToken:order.customerToken})});return d.paypalOrderId},
    onApprove:async data=>{paymentArea.querySelector('.co-pill').textContent='Verifica pagamento…';await api('/api/paypal-capture',{method:'POST',body:JSON.stringify({orderId:order.orderId,customerToken:order.customerToken,paypalOrderId:data.orderID})});location.href=`ordine.html?id=${encodeURIComponent(order.orderId)}&token=${encodeURIComponent(order.customerToken)}`},
    onCancel:()=>{paymentArea.querySelector('.co-pill').textContent='Pagamento non completato'},
    onError:()=>showError('PayPal ha restituito un errore. Puoi riprovare senza creare un nuovo ordine.')
  }).render('#paypal-buttons')
}

async function renderPayPal(order){
  if((order.paypal&&order.paypal.mode==='link')||config?.paypalMode==='link')return renderPayPalLink(order);
  return renderPayPalApi(order);
}
loadConfig();

try{localStorage.setItem('selleros_cart_v1',JSON.stringify([{id:'seller-os-1-1',name:'Seller OS 1.1',price:49,oldPrice:79}]))}catch{}
