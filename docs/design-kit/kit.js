/* Serbizyu 2.0 — Design Kit interactions (deterministic, no backend) */
(function () {
  'use strict';

  /* ---------- 3 · State variants (dossier §11) ---------- */
  var variants = [
    ['Loading', 'What is loading; old data labeled stale', 'Wait / cancel — never act on unknown state'],
    ['Empty', 'Why there is no data + what to do next', 'Browse, create request, retry, help'],
    ['Normal', 'Current truth, goal, one primary action', 'Complete next step'],
    ['Validation error', 'Field, problem, correction example', 'Fix — draft preserved'],
    ['Permission denied', 'Which permission is missing, who can act', 'Request approval/help — no blind retry'],
    ['Offline / low-data', 'Freshness + unsent-draft status', 'Save draft, retry when connected'],
    ['Retryable failure', 'What failed; may it have happened?', 'Idempotent retry or support'],
    ['Expired / stale', 'Which term/slot/evidence is no longer current', 'Refresh, request again, clarify'],
    ['Submitted / pending', 'Actor, timestamp, next responsible actor', 'Wait, view timeline, cancel if allowed'],
    ['Confirmed', 'Exactly what changed and what did not', 'Proceed to next responsible task'],
    ['Mismatch', 'Affected object and the disagreement', 'Clarify, add evidence, dispute/support'],
    ['On hold', 'Hold scope, reason class, blocked action', 'Supply evidence/support — no bypass'],
    ['Corrected / superseded', 'Original ↔ replacement relationship', 'Review new terms; history remains'],
    ['Conditional / deferred', 'Why unavailable + activation boundary', 'Return, save, request support'],
    ['Sandbox-only', 'Persistent simulation/test context', 'Explore guarded demo; no real expectation']
  ];
  var vHost = document.getElementById('dk-variants');
  if (vHost) {
    vHost.innerHTML = variants.map(function (v) {
      return '<div class="dk-spec"><div class="dk-spec-label">' + v[0] + '</div>' +
        '<p style="margin:4px 0"><strong>User sees:</strong> ' + v[1] + '</p>' +
        '<p style="margin:4px 0" class="dk-note"><strong>Safe action:</strong> ' + v[2] + '</p></div>';
    }).join('');
  }

  /* ---------- 4.3 · Lane cards ---------- */
  var lanes = [
    { name: 'External Cash', badge: ['dk-b-info', 'PILOT'],
      rows: [['Money moves', 'Buyer → Provider directly'], ['Serbizyu holds', 'Nothing'], ['Commission', '0% (capstone/initial pilot)'],
             ['Confirmation', 'Two-sided reports → mutually_acknowledged'], ['Refund promise', 'None automatic']] },
    { name: 'External Digital Proof', badge: ['dk-b-info', 'PILOT'],
      rows: [['Money moves', 'Outside Serbizyu (party-chosen provider)'], ['Serbizyu holds', 'Nothing'], ['Commission', '0% (capstone/initial pilot)'],
             ['Evidence', 'Screenshot/reference = user evidence, not verified'], ['Tiwala', 'Not included']] },
    { name: 'Direct Digital', badge: ['dk-b-sandbox', 'SANDBOX ONLY'],
      rows: [['Money moves', 'TEST_PROVIDER simulation'], ['Settlement', 'Direct — no completion-based hold'], ['Events', 'Simulated + reconciled, idempotent'],
             ['Metrics', 'Not counted as genuine pilot'], ['Live checkout', 'Never shown']] },
    { name: 'Tiwala Protected Digital', badge: ['dk-b-sandbox', 'SANDBOX ONLY'],
      rows: [['Behavior', 'Protected-release simulation only'], ['Clock', 'Starts at completion/sign-off eligibility — never at Order creation'],
             ['Release', 'All guards must pass; idempotent'], ['Legal claim', 'None — not live escrow']] }
  ];
  var lHost = document.getElementById('dk-lanes');
  if (lHost) {
    lHost.innerHTML = lanes.map(function (l) {
      return '<div class="dk-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center">' +
        '<strong>' + l.name + '</strong><span class="dk-badge ' + l.badge[0] + '">' + l.badge[1] + '</span></div>' +
        '<dl class="dk-kv" style="margin-top:8px">' + l.rows.map(function (r) {
          return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>';
        }).join('') + '</dl></div>';
    }).join('');
  }

  /* ---------- 5.1 · Evidence lifecycle ---------- */
  var evStates = [
    ['created', 'dk-b-neutral', 'Registered; not yet uploaded'],
    ['uploaded', 'dk-b-info', 'File received; awaiting processing'],
    ['processing', 'dk-b-info', 'Validation/scan in progress'],
    ['accepted', 'dk-b-ok', 'Accepted as evidence — does not complete Work or prove payment'],
    ['rejected', 'dk-b-bad', 'Reason shown; safe resubmission path'],
    ['superseded', 'dk-b-warn', 'Replaced by newer version; original kept'],
    ['retained_under_hold', 'dk-b-bad', 'Deletion paused by dispute/legal hold'],
    ['deleted', 'dk-b-neutral', 'Deleted per retention policy; audit event kept']
  ];
  var eHost = document.getElementById('dk-evidence');
  if (eHost) {
    eHost.innerHTML = evStates.map(function (s) {
      return '<div class="dk-card dk-evi"><div class="dk-thumb">📎</div>' +
        '<div><span class="dk-badge ' + s[1] + '">' + s[0] + '</span>' +
        '<p class="dk-note" style="margin:6px 0 0">' + s[2] + '</p></div></div>';
    }).join('');
  }

  /* ---------- 5.2 · Consent grant states ---------- */
  var grants = [
    ['proposed', 'dk-b-neutral', 'Invitation created; Owner has not seen scope yet'],
    ['pending_owner_confirmation', 'dk-b-warn', 'Awaiting attributable Owner approval'],
    ['active', 'dk-b-ok', 'Agent may act within scope; banner visible'],
    ['suspended', 'dk-b-warn', 'Paused with reason; reactivation guard applies'],
    ['revoked', 'dk-b-bad', 'Future actions blocked; history preserved'],
    ['expired', 'dk-b-neutral', 'Grant lapsed; new scoped grant required']
  ];
  var cHost = document.getElementById('dk-consent');
  if (cHost) {
    cHost.innerHTML = grants.map(function (g) {
      return '<div class="dk-card"><span class="dk-badge ' + g[1] + '">' + g[0] + '</span>' +
        '<p class="dk-note" style="margin:6px 0 8px">' + g[2] + '</p>' +
        '<div class="dk-banner dk-bn-agent" style="font-size:12px"><span class="dk-banner-ico">🤝</span>' +
        '<span><strong>AGENT-06 → OWNER-06</strong> · Scope: listing draft · No cash/goods custody · No ownership change</span></div></div>';
    }).join('');
  }

  /* ---------- 6.1 · QR air-gapped live feed ---------- */
  var FRAMES = 6, frame = 0, paused = false, expiry = 45, timer = null;
  function qrSVG(seed) {
    // Deterministic placeholder pattern (NOT a real QR encoding)
    var cell = 9, n = 21, rects = '';
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        var finder = (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
        var v = finder ? ((x % 2 === 0 && y % 2 === 0) ? 1 : 0)
                       : (((x * 31 + y * 17 + seed * 13) % 7) < 3 ? 1 : 0);
        if (v) rects += '<rect x="' + (x * cell) + '" y="' + (y * cell) + '" width="' + cell + '" height="' + cell + '"/>';
      }
    }
    var size = n * cell;
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR frame ' + (seed + 1) + ' placeholder">' +
      '<rect width="' + size + '" height="' + size + '" fill="#fff"/><g fill="#1a1a1a">' + rects + '</g></svg>';
  }
  function renderQR() {
    var fHost = document.getElementById('dk-qrframe');
    if (!fHost) return;
    fHost.innerHTML = qrSVG(frame);
    document.getElementById('dk-qrcount').textContent = 'Frame ' + (frame + 1) + ' / ' + FRAMES;
    document.getElementById('dk-qrhash').textContent = 'qdeal:' + ('a3f9' + (frame * 7 % 16).toString(16)) + '…';
    var expEl = document.getElementById('dk-qrexpiry');
    expEl.textContent = expiry > 0 ? ('00:' + String(expiry).padStart(2, '0')) : 'EXPIRED';
    expEl.classList.toggle('dk-expired', expiry <= 0);
  }
  function tick() {
    if (paused) return;
    if (expiry > 0) { expiry--; }
    if (expiry > 0) { frame = (frame + 1) % FRAMES; }
    renderQR();
  }
  var qrPause = document.getElementById('dk-qrpause');
  var qrReissue = document.getElementById('dk-qrreissue');
  if (qrPause) {
    renderQR();
    timer = setInterval(tick, 1000);
    qrPause.addEventListener('click', function () {
      paused = !paused;
      qrPause.textContent = paused ? 'Resume' : 'Pause';
    });
    qrReissue.addEventListener('click', function () {
      expiry = 45; frame = 0; paused = false;
      qrPause.textContent = 'Pause';
      renderQR();
    });
  }

  /* ---------- 6.2 · Archetype formulation ---------- */
  var arch = {
    type: { label: 'Listing / Request type', opts: [
      ['service-listing', 'Service Listing', 'A service you offer'],
      ['product-listing', 'Product Listing', 'A product you offer'],
      ['service-request', 'Service Request', 'Work you need done'],
      ['product-request', 'Product Request', 'An item you need']
    ]},
    mechanism: { label: 'Order-formation mechanism', opts: [
      ['direct', 'Direct Booking', 'Buyer commits to listed terms'],
      ['quote', 'Quote Request', 'PILOT-CONDITIONAL · expiry + snapshot', true],
      ['quickdeal', 'Quick Deal', 'PILOT-CONDITIONAL · counterparty confirm · offline = intent only', true]
    ]},
    shape: { label: 'Work shape', opts: [
      ['A1', 'A1 Linear Project', 'Stepped scope + evidence'],
      ['A3', 'A3 Appointment', 'Slot, attendance, no-show'],
      ['A4', 'A4 Handoff', 'Prep, handoff, receipt'],
      ['A9', 'A9 Digital Delivery', 'Versioned artifact']
    ]},
    lane: { label: 'Payment lane', opts: [
      ['cash', 'External Cash', 'PILOT · 0% commission · no custody'],
      ['edp', 'External Digital Proof', 'PILOT · 0% commission · evidence only'],
      ['direct-digital', 'Direct Digital', 'SANDBOX ONLY', false, 'sandbox'],
      ['tiwala', 'Tiwala Protected Digital', 'SANDBOX ONLY', false, 'sandbox']
    ]}
  };
  // validity matrix: mechanism -> allowed shapes; type -> allowed lanes guard demo
  var shapeRules = {
    direct: ['A1', 'A3', 'A4', 'A9'],
    quote: ['A1', 'A3', 'A4', 'A9'],
    quickdeal: ['A4', 'A3'] // conditional surface: simple handoff/appointment only
  };
  var sel = { type: 'service-listing', mechanism: 'direct', shape: 'A1', lane: 'cash' };
  var aHost = document.getElementById('dk-arch');
  function renderArch() {
    if (!aHost) return;
    var html = '';
    Object.keys(arch).forEach(function (key) {
      var group = arch[key];
      html += '<div class="dk-arch-row"><div class="dk-arch-title">' + group.label + '</div><div class="dk-arch-opts">';
      group.opts.forEach(function (o) {
        var id = o[0], label = o[1], sub = o[2], cond = o[3], flag = o[4];
        var disabled = false, reason = '';
        if (key === 'shape' && shapeRules[sel.mechanism].indexOf(id) === -1) {
          disabled = true; reason = 'Not valid with ' + sel.mechanism;
        }
        if (key === 'lane' && sel.mechanism === 'quickdeal' && flag === 'sandbox') {
          disabled = true; reason = 'Quick Deal offline cannot authorize digital payment';
        }
        html += '<button class="dk-opt' + (sel[key] === id ? ' dk-on' : '') + '" data-group="' + key + '" data-id="' + id + '"' +
          (disabled ? ' disabled title="' + reason + '"' : '') + '>' +
          (cond === true ? '<span class="dk-flag">PILOT-CONDITIONAL</span><br>' : '') +
          (flag === 'sandbox' ? '<span class="dk-flag">SANDBOX ONLY</span><br>' : '') +
          label + '<small>' + (disabled ? reason : sub) + '</small></button>';
      });
      html += '</div></div>';
    });
    html += '<div class="dk-arch-out"><div class="dk-spec-label">Order snapshot preview (read-only)</div><pre>' +
      JSON.stringify({
        order: { type: sel.type, mechanism: sel.mechanism, status: sel.mechanism === 'quickdeal' ? 'awaiting_counterparty_confirmation' : 'draft' },
        work: { shape: sel.shape, status: 'not_started' },
        payment_obligation: { lane: sel.lane, status: 'created', custody: sel.lane === 'cash' || sel.lane === 'edp' ? 'none' : 'sandbox-simulated' },
        boundaries: sel.mechanism === 'quickdeal'
          ? ['offline=intent only', 'no payment/payout/release/inventory/irreversible consent offline']
          : ['payment ≠ work completion']
      }, null, 2) + '</pre></div>';
    aHost.innerHTML = html;
    Array.prototype.forEach.call(aHost.querySelectorAll('.dk-opt:not([disabled])'), function (btn) {
      btn.addEventListener('click', function () {
        sel[btn.getAttribute('data-group')] = btn.getAttribute('data-id');
        // reset shape if invalidated by mechanism change
        if (shapeRules[sel.mechanism].indexOf(sel.shape) === -1) sel.shape = shapeRules[sel.mechanism][0];
        renderArch();
      });
    });
  }
  renderArch();

  /* ---------- modal + toast demos ---------- */
  var veil = document.getElementById('dk-modal-veil');
  Array.prototype.forEach.call(document.querySelectorAll('[data-modal-open]'), function (b) {
    b.addEventListener('click', function () { veil.classList.add('dk-open'); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-modal-close]'), function (b) {
    b.addEventListener('click', function () { veil.classList.remove('dk-open'); });
  });
  if (veil) veil.addEventListener('click', function (e) { if (e.target === veil) veil.classList.remove('dk-open'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && veil) veil.classList.remove('dk-open'); });

  Array.prototype.forEach.call(document.querySelectorAll('[data-toast]'), function (b) {
    b.addEventListener('click', function () {
      var stack = document.getElementById('dk-toasts');
      var t = document.createElement('div');
      t.className = 'dk-toast';
      t.textContent = 'Saved as draft — not yet submitted (also shown on screen).';
      stack.appendChild(t);
      setTimeout(function () { t.remove(); }, 3500);
    });
  });

  /* ---------- nav active state ---------- */
  var links = document.querySelectorAll('#dk-nav a');
  Array.prototype.forEach.call(links, function (a) {
    a.addEventListener('click', function () {
      Array.prototype.forEach.call(links, function (x) { x.classList.remove('dk-active'); });
      a.classList.add('dk-active');
    });
  });
})();
