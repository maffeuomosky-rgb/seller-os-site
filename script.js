(() => {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const features = [
    {
      title: 'Ogni prodotto al posto giusto',
      copy: 'Organizza prodotti, lotti e disponibilità. Ritrova costi di acquisto e stock senza passare da un file all’altro.',
      detail: 'Prodotti, lotti e stock',
      label: 'Inventario'
    },
    {
      title: 'Ogni vendita tracciata',
      copy: 'Registra vendite, canali, incassi, commissioni e rimborsi mantenendo lo storico sempre leggibile.',
      detail: 'Vendite, incassi e rimborsi',
      label: 'Vendite'
    },
    {
      title: 'Costi e spese sotto controllo',
      copy: 'Tieni insieme costi operativi e spese per capire quanto incidono davvero sui risultati della tua attività.',
      detail: 'Costi, spese e storico',
      label: 'Spese'
    },
    {
      title: 'Dal ricavo al profitto reale',
      copy: 'Leggi margini, profitti e performance senza ricostruire i numeri ogni volta su fogli separati.',
      detail: 'Margini, profitto e performance',
      label: 'Margini & Profitto'
    }
  ];

  const featureTabs = $$('.feature-tabs [data-feature]');
  const screens = $$('.scroll-screen');
  const story = $('.story-copy-space');
  const screenLabel = $('.screen-bottom > span');
  const featurePanel = $('#feature-panel');
  const progress = $('.chapter-progress span');
  let activeFeature = 0;

  function renderFeature(index, focus = false) {
    index = clamp(Number(index) || 0, 0, features.length - 1);
    activeFeature = index;
    featureTabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      const marker = $('.active-feature', tab);
      if (active && !marker) {
        const span = document.createElement('span');
        span.className = 'active-feature';
        tab.prepend(span);
      } else if (!active && marker) {
        marker.remove();
      }
    });
    screens.forEach((screen, i) => {
      const active = i === index;
      screen.setAttribute('aria-hidden', String(!active));
      screen.style.opacity = active ? '1' : '0';
      screen.style.transform = active ? 'none' : 'translateY(12px) scale(.985)';
    });
    const f = features[index];
    if (story) story.innerHTML = '<div><h3>' + f.title + '</h3><p>' + f.copy + '</p><span class="feature-detail">' + f.detail + '</span></div>';
    if (screenLabel) screenLabel.textContent = f.label;
    if (featurePanel && featureTabs[index]) featurePanel.setAttribute('aria-labelledby', featureTabs[index].id);
    if (progress) progress.style.transform = 'scaleX(' + ((index + 1) / features.length) + ')';
    if (focus && featureTabs[index]) featureTabs[index].focus();
  }

  featureTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => renderFeature(index));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      let next = activeFeature;
      if (event.key === 'ArrowLeft') next = (activeFeature - 1 + features.length) % features.length;
      if (event.key === 'ArrowRight') next = (activeFeature + 1) % features.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = features.length - 1;
      renderFeature(next, true);
    });
  });
  renderFeature(0);

  const explorer = $('.explorer-section');
  function updateExplorerFromScroll() {
    if (!explorer || window.innerWidth < 768) return;
    const rect = explorer.getBoundingClientRect();
    const range = Math.max(1, rect.height - window.innerHeight);
    const p = clamp((-rect.top + window.innerHeight * .16) / range);
    const index = Math.min(features.length - 1, Math.floor(p * features.length));
    if (index !== activeFeature) renderFeature(index);
  }

  /* =========================================================
     SELLER OS — Pinned LED workflow
     ========================================================= */

  const flowSection = $('#come-funziona');

  function buildLedRail(section) {
    const track = $('.flow-track', section);
    const steps = $$('.flow-line li', section);

    if (!track || steps.length !== 6) return null;

    let rail = $('.flow-led-segments', track);

    if (!rail) {
      rail = document.createElement('div');
      rail.className = 'flow-led-segments';
      rail.setAttribute('aria-hidden', 'true');

      for (let i = 0; i < 5; i++) {
        const segment = document.createElement('span');
        segment.className = 'flow-led-segment';

        const fill = document.createElement('span');
        fill.className = 'flow-led-fill';

        const head = document.createElement('span');
        head.className = 'flow-led-head';

        segment.appendChild(fill);
        segment.appendChild(head);
        rail.appendChild(segment);
      }

      track.insertBefore(rail, $('.flow-line', track));
    }

    return {
      track,
      steps,
      rail,
      segments: $$('.flow-led-segment', rail)
    };
  }

  const flowState = flowSection ? buildLedRail(flowSection) : null;

  function positionFlowRail() {
    if (!flowState) return;

    const { track, steps, rail } = flowState;
    const nodes = steps.map(step => $('.flow-node', step));

    if (nodes.some(node => !node)) return;

    const trackRect = track.getBoundingClientRect();
    const first = nodes[0].getBoundingClientRect();
    const last = nodes[nodes.length - 1].getBoundingClientRect();
    const mobile = window.matchMedia('(max-width:767px)').matches;

    const startX = first.left + first.width / 2 - trackRect.left;
    const startY = first.top + first.height / 2 - trackRect.top;
    const endX = last.left + last.width / 2 - trackRect.left;
    const endY = last.top + last.height / 2 - trackRect.top;

    if (mobile) {
      rail.style.left = `${startX - 1.5}px`;
      rail.style.top = `${startY}px`;
      rail.style.width = '3px';
      rail.style.height = `${Math.max(0, endY - startY)}px`;
      rail.style.gridTemplateRows = 'repeat(5,minmax(0,1fr))';
      rail.style.gridTemplateColumns = '1fr';
    } else {
      rail.style.left = `${startX}px`;
      rail.style.top = `${startY - 1.5}px`;
      rail.style.width = `${Math.max(0, endX - startX)}px`;
      rail.style.height = '3px';
      rail.style.gridTemplateColumns = 'repeat(5,minmax(0,1fr))';
      rail.style.gridTemplateRows = '1fr';
    }
  }

  function updateFlow() {
    if (!flowSection || !flowState) return;

    positionFlowRail();

    const rect = flowSection.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const mobile = window.matchMedia('(max-width:767px)').matches;
    const stickyTop = mobile ? 62 : 68;
    const stickyViewport = Math.max(1, vh - stickyTop);
    const scrollDistance = Math.max(1, rect.height - stickyViewport);

    const raw = clamp(
      (stickyTop - rect.top) / scrollDistance,
      0,
      1
    );

    const START = 0.05;
    const END = 0.86;

    const story = clamp(
      (raw - START) / (END - START),
      0,
      1
    );

    const segmentValue = story * 5;

    flowState.segments.forEach((segment, index) => {
      const local = clamp(segmentValue - index, 0, 1);
      const fill = $('.flow-led-fill', segment);
      const head = $('.flow-led-head', segment);

      if (fill) {
        fill.style.transform = mobile
          ? `scaleY(${local.toFixed(4)})`
          : `scaleX(${local.toFixed(4)})`;
      }

      if (head) {
        if (mobile) {
          head.style.top = `${(local * 100).toFixed(2)}%`;
          head.style.left = '50%';
        } else {
          head.style.left = `${(local * 100).toFixed(2)}%`;
          head.style.top = '50%';
        }
      }

      segment.classList.toggle('is-complete', local >= 0.999);
      segment.classList.toggle(
        'is-current-segment',
        local > 0.015 && local < 0.999
      );
    });

    let currentNode = Math.min(
      5,
      Math.floor(segmentValue + 0.0001)
    );

    if (story >= 0.999) currentNode = 5;

    flowState.steps.forEach((step, index) => {
      const reached =
        story > 0
          ? index <= currentNode
          : index === 0 && raw >= START;

      step.classList.toggle('is-reached', reached);
      step.classList.toggle(
        'is-current',
        reached && index === currentNode
      );
    });

    flowSection.classList.toggle(
      'flow-complete',
      story >= 0.999
    );
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateExplorerFromScroll();
      updateFlow();
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  onScroll();

  // Mobile navigation is generated from the desktop navigation to keep one source of truth.
  const headerSpace = $('.header-space');
  const menuToggle = $('.menu-toggle');
  if (headerSpace && menuToggle && !$('#mobile-nav')) {
    const nav = document.createElement('div');
    nav.className = 'mobile-nav';
    nav.id = 'mobile-nav';
    nav.hidden = true;
    nav.innerHTML = '<div><a href="#prodotto">Prodotto <span>→</span></a><a href="#come-funziona">Come funziona <span>→</span></a><a href="#supporto">Supporto <span>→</span></a></div>';
    headerSpace.append(nav);
    menuToggle.addEventListener('click', () => {
      const open = nav.hidden;
      nav.hidden = !open;
      menuToggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('mobile-open', open);
    });
    $$('a', nav).forEach(a => a.addEventListener('click', () => {
      nav.hidden = true;
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('mobile-open');
    }));
  }

  // FAQ
  $$('.faq-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const id = trigger.getAttribute('aria-controls');
      const answer = id ? document.getElementById(id) : null;
      if (!answer) return;
      const open = trigger.getAttribute('aria-expanded') === 'true';
      $$('.faq-trigger[aria-expanded="true"]').forEach(other => {
        if (other === trigger) return;
        other.setAttribute('aria-expanded', 'false');
        const otherAnswer = document.getElementById(other.getAttribute('aria-controls'));
        if (otherAnswer) otherAnswer.hidden = true;
      });
      trigger.setAttribute('aria-expanded', String(!open));
      answer.hidden = open;
    });
  });

  // Unified image viewer.
  const viewer = $('#seller-media-viewer');
  const viewerImg = $('.seller-media-viewer__image');
  const viewerClose = $('.seller-media-viewer__close');
  function openViewer(img) {
    if (!viewer || !viewerImg || !img) return;
    viewerImg.src = img.currentSrc || img.src;
    viewerImg.alt = img.alt ? img.alt + ' — ingrandita' : 'Seller OS — schermata ingrandita';
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('media-open');
    viewerClose?.focus();
  }
  function closeViewer() {
    if (!viewer) return;
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('media-open');
  }
  $('.dashboard-frame')?.addEventListener('click', () => openViewer($('.dashboard-frame img')));
  $('.hero-product .image-open')?.addEventListener('click', () => openViewer($('.dashboard-frame img')));
  $('#explorer-zoom')?.addEventListener('click', () => openViewer(screens[activeFeature]));
  $('#analytics-visual')?.addEventListener('click', () => openViewer($('#analytics-visual img')));
  $('.analytics-open-caption')?.addEventListener('click', () => openViewer($('#analytics-visual img')));
  viewerClose?.addEventListener('click', closeViewer);
  viewer?.addEventListener('click', e => { if (e.target === viewer) closeViewer(); });

  // Production cart + checkout.
  const cartDialog = $('#cart-dialog');
  const cartContent = $('#cart-content');
  const cartToast = $('#cart-toast');
  const cartCount = $('.cart-trigger span');
  let inCart = false;

  function updateCart() {
    if (cartCount) cartCount.textContent = '(' + (inCart ? 1 : 0) + ')';
    if (!cartContent) return;
    cartContent.innerHTML = inCart
      ? '<div class="cart-product"><img src="assets/landing-inline-09.webp" alt="Seller OS 1.1"><div><h3>Seller OS 1.1</h3><p>Licenza personale · una tantum</p><button class="remove-product" type="button">Rimuovi</button></div><strong>€49</strong></div><div class="cart-total"><span>Totale</span><strong>€49</strong></div><button class="cart-checkout-live" type="button"><span>Vai al checkout</span><span>→</span></button><p class="cart-notice">PayPal o bonifico · consegna digitale protetta dopo la verifica del pagamento</p>'
      : '<div class="cart-empty"><p>Il carrello è vuoto</p><button class="empty-add" type="button"><span>Aggiungi Seller OS</span><span>→</span></button></div>';
    $('.remove-product', cartContent)?.addEventListener('click', () => { inCart = false; updateCart(); });
    $('.empty-add', cartContent)?.addEventListener('click', () => { inCart = true; updateCart(); });
    $('.cart-checkout-live', cartContent)?.addEventListener('click', () => { location.href = '/checkout'; });
  }

  function openCart() {
    updateCart();
    document.body.classList.add('cart-open');
    if (cartDialog?.showModal) cartDialog.showModal();
    else if (cartDialog) cartDialog.setAttribute('open', '');
  }
  function closeCart() {
    if (!cartDialog) return;
    document.body.classList.remove('cart-open');
    if (cartDialog.close) cartDialog.close();
    else cartDialog.removeAttribute('open');
  }
  function addToCart() {
    inCart = true;
    updateCart();
    if (cartToast) {
      cartToast.hidden = false;
      setTimeout(() => { if (cartToast) cartToast.hidden = true; }, 2600);
    }
  }

  $('.cart-trigger')?.addEventListener('click', openCart);
  $('.cart-close')?.addEventListener('click', closeCart);
  cartDialog?.addEventListener('close', () => document.body.classList.remove('cart-open'));
  cartDialog?.addEventListener('click', e => { if (e.target === cartDialog) closeCart(); });
  $$('.nav-buy,.hero-buy,.price-buy').forEach(btn => btn.addEventListener('click', addToCart));
  $('#cart-toast-open')?.addEventListener('click', () => { cartToast.hidden = true; openCart(); });
  $('#cart-toast-close')?.addEventListener('click', () => { cartToast.hidden = true; });
  updateCart();

  // Escape closes overlays.
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeViewer();
    if (cartDialog?.open) closeCart();
  });

  // Static-first reveal: never hide critical content when JS is late or disabled.
  if (!reduceMotion) {
    requestAnimationFrame(() => document.documentElement.classList.add('seller-ready'));
  }
})();
