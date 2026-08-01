/* Serbizyu 2.0 — mockup shared behavior. Deterministic, no backend.
   Role switcher · two-sided cash demo · guard checklist · journey stepper · modal */
(function () {
  'use strict';

  /* ---------- role switcher ---------- */
  var role = 'buyer';
  var allowed = ['buyer', 'provider', 'admin'];

  function applyRole() {
    document.body.dataset.role = role;
    // visibility per role block
    Array.prototype.forEach.call(document.querySelectorAll('[data-role-view]'), function (el) {
      el.hidden = el.getAttribute('data-role') !== role;
    });
    // actor badge
    Array.prototype.forEach.call(document.querySelectorAll('[data-role-badge]'), function (el) {
      el.textContent = role === 'buyer' ? 'Actor: Buyer (BUYER-01)'
        : role === 'provider' ? 'Actor: Provider (PROVIDER-01)'
        : 'Actor: Admin (ADMIN-01)';
    });
    // switcher active state
    Array.prototype.forEach.call(document.querySelectorAll('[data-role-btn]'), function (b) {
      b.classList.toggle('dk-on', b.getAttribute('data-role-btn') === role);
    });
  }

  var sw = document.getElementById('dk-role-switch');
  if (sw) {
    sw.addEventListener('click', function (e) {
      var t = e.target.closest('[data-role-btn]');
      if (!t) return;
      var r = t.getAttribute('data-role-btn');
      if (allowed.indexOf(r) === -1) return;
      role = r;
      applyRole();
      // keep role across screens
      var u = new URL(location.href);
      u.searchParams.set('role', role);
      history.replaceState(null, '', u);
    });
  }
  var qs = new URLSearchParams(location.search);
  if (qs.get('role') && allowed.indexOf(qs.get('role')) !== -1) role = qs.get('role');
  applyRole();

  /* ---------- two-sided cash demo (deterministic, resets on reload) ---------- */
  var cash = { buyer: false, provider: false, mismatch: false };

  function renderCash() {
    var b = document.getElementById('cash-buyer');
    var p = document.getElementById('cash-provider');
    var status = document.getElementById('cash-status');
    if (!b || !p) return;
    b.classList.toggle('dk-done', cash.buyer);
    p.classList.toggle('dk-done', cash.provider);
    var bBadge = b.querySelector('[data-cash-badge]');
    var pBadge = p.querySelector('[data-cash-badge]');
    if (bBadge) {
      bBadge.className = 'dk-badge ' + (cash.buyer ? 'dk-b-ok' : 'dk-b-warn');
      bBadge.textContent = cash.buyer ? '✓ buyer_reported' : (cash.mismatch ? '⚠ disputed' : 'not reported');
    }
    if (pBadge) {
      pBadge.className = 'dk-badge ' + (cash.provider ? 'dk-b-ok' : 'dk-b-warn');
      pBadge.textContent = cash.provider ? '✓ provider_reported' : (cash.mismatch ? '⚠ disputed' : 'report missing');
    }
    if (status) {
      if (cash.mismatch) {
        status.className = 'dk-badge dk-b-bad';
        status.textContent = '⚠ mismatch → disputed → corrected (history preserved)';
      } else if (cash.buyer && cash.provider) {
        status.className = 'dk-badge dk-b-ok';
        status.textContent = '✓ mutually_acknowledged — Work unchanged';
      } else if (cash.buyer) {
        status.className = 'dk-badge dk-b-warn';
        status.textContent = 'buyer_reported — provider report missing';
      } else if (cash.provider) {
        status.className = 'dk-badge dk-b-warn';
        status.textContent = 'provider_reported — buyer report missing';
      } else {
        status.className = 'dk-badge dk-b-neutral';
        status.textContent = 'not_reported — silence is not proof';
      }
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-cash-report]'), function (btn) {
    btn.addEventListener('click', function () {
      var side = btn.getAttribute('data-cash-report');
      if (side === 'buyer') { cash.buyer = true; cash.mismatch = false; }
      if (side === 'provider') { cash.provider = true; cash.mismatch = false; }
      if (side === 'mismatch') { cash.mismatch = true; }
      renderCash();
    });
  });
  renderCash();

  /* ---------- guard checklist (Tiwala sandbox demo) ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-guard]'), function (li) {
    li.addEventListener('click', function () {
      var g = li.querySelector('.dk-g');
      if (!g) return;
      if (g.classList.contains('dk-g-pass')) { g.className = 'dk-g dk-g-fail'; g.textContent = '✗'; }
      else if (g.classList.contains('dk-g-fail')) { g.className = 'dk-g dk-g-pass'; g.textContent = '✓'; }
      renderGuards();
    });
  });
  function renderGuards() {
    var attempt = document.querySelector('[data-guard-attempt]');
    var result = document.getElementById('guard-result');
    if (!attempt) return;
    var fails = document.querySelectorAll('[data-guard] .dk-g.dk-g-fail').length;
    var pass = fails === 0;
    attempt.disabled = !pass;
    if (result) {
      result.textContent = pass
        ? 'Simulated release allowed (sandbox). One auditable event; idempotent.'
        : 'Blocked: ' + fails + ' guard(s) unmet. List the reasons next to the button.';
      result.className = pass ? 'dk-badge dk-b-ok' : 'dk-badge dk-b-bad';
    }
  }
  renderGuards();

  /* ---------- journey stepper (SYS-003) ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-jstep]'), function (el) {
    var current = el.getAttribute('data-jstep');
    Array.prototype.forEach.call(el.querySelectorAll('li'), function (li) {
      if (li.getAttribute('data-step') === current) li.classList.add('dk-ev-warn');
    });
  });

  /* ---------- modal ---------- */
  var veil = document.getElementById('dk-modal-veil');
  Array.prototype.forEach.call(document.querySelectorAll('[data-modal-open]'), function (b) {
    b.addEventListener('click', function () { if (veil) veil.classList.add('dk-open'); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-modal-close]'), function (b) {
    b.addEventListener('click', function () { if (veil) veil.classList.remove('dk-open'); });
  });
  if (veil) veil.addEventListener('click', function (e) { if (e.target === veil) veil.classList.remove('dk-open'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && veil) veil.classList.remove('dk-open'); });
})();
