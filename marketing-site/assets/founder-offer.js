/* Founder offer pop-up.
 *
 * First-visit lead capture: "earn Founder status, merch and free-for-life access".
 * Email required, phone optional. Submits to Netlify Forms (form name "founder-offer";
 * the matching static form lives in index.html so Netlify registers it at deploy time).
 *
 * Show rules (per browser, via localStorage):
 *   - never after a successful submit
 *   - 30 days after an explicit dismiss (×, Esc, backdrop, "No thanks")
 *   - 2 days after it was merely shown (visitor navigated away without answering)
 *   - opens ~7s after load, or once the visitor has scrolled 30% of the page
 *   - waits while a form field is focused or the mobile nav drawer is open
 *   - on the homepage, waits for the intro splash to finish, then starts the delay
 *   - ?offer=founder on any page skips the cooldowns and the delay (for testing and
 *     for links) but still waits for the splash
 *   - a successful submit is terminal: later opens/dismissals never downgrade it
 */
(function () {
  var KEY = 'mu_founder_offer_v1';
  var FORM_NAME = 'founder-offer';
  var DELAY_MS = 7000;
  var SCROLL_FRACTION = 0.3;
  var DAY = 864e5;
  var DISMISS_COOLDOWN = 30 * DAY;
  var SHOWN_COOLDOWN = 2 * DAY;
  var APP_STORE = 'https://apps.apple.com/us/app/muster-up-find-your-team/id6764738732';
  var WEB_APP = 'https://app.joinmuster.com';

  function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private mode: show again next time, acceptable */ } }
  var submittedNow = false;
  function isSubmitted() { if (submittedNow) return true; var s = read(); return !!(s && s.state === 'submitted'); }

  var forced = /[?&]offer=founder(?:&|$)/.test(location.search);
  var state = read();
  if (!forced && state) {
    var age = Date.now() - (state.at || 0);
    if (state.state === 'submitted') return;
    if (state.state === 'dismissed' && age < DISMISS_COOLDOWN) return;
    if (state.state === 'shown' && age < SHOWN_COOLDOWN) return;
  }

  /* Analytics: the page's module script already initialised the HeyCatch singleton,
     so importing the same module URL gives us the same instance. Never let this block. */
  function track(name, props) {
    try {
      import('https://esm.sh/@heycatch/sdk@0.7.0')
        .then(function (m) { m.analytics.trackEvent(name, props || {}); })
        .catch(function () {});
    } catch (e) { /* older browsers without dynamic import */ }
  }

  var MARK = '<svg class="fo-mark" viewBox="0 0 100 100" role="img" aria-label="Muster Up"><g transform="translate(-0.35,2.25)"><circle cx="49" cy="64" r="10" fill="none" stroke="#ECE6D6" stroke-width="1.2" opacity="0.32"/><path d="M17 76 L32 34 L49 64 L67 20 L84 74" fill="none" stroke="#ECE6D6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="17" cy="76" r="2.9" fill="#ECE6D6"/><circle cx="84" cy="74" r="2.6" fill="#ECE6D6"/><circle cx="32" cy="34" r="3.3" fill="#D2913C"/><circle cx="67" cy="20" r="3.4" fill="#D2913C"/><line x1="67" y1="18" x2="67" y2="2.8" stroke="#ECE6D6" stroke-width="2" stroke-linecap="round"/><path d="M67.6 4.4 L79.5 8.6 L67.6 12.8 Z" fill="#D2913C"/><circle cx="67" cy="2.6" r="2" fill="#ECE6D6"/><circle cx="49" cy="64" r="6.5" fill="#181B14" stroke="#ECE6D6" stroke-width="2.2"/><circle cx="49" cy="64" r="3.3" fill="#6E93A6"/></g></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var STAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z"/></svg>';
  var SHIRT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.4 7.3 16 3.8a4.6 4.6 0 0 1-8 0L3.6 7.3 5 10.5l2.3-.8V21h9.4V9.7l2.3.8 1.4-3.2z"/></svg>';
  var INFINITY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z"/></svg>';

  function build() {
    var root = document.createElement('div');
    root.className = 'fo-root';
    root.setAttribute('hidden', '');
    root.innerHTML =
      '<div class="fo-backdrop" data-fo-close></div>' +
      '<div class="fo-card" role="dialog" aria-modal="true" aria-labelledby="fo-title" aria-describedby="fo-desc">' +
        '<span class="fo-stripe" aria-hidden="true"></span>' +
        '<button type="button" class="fo-close" data-fo-close aria-label="Close">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
        '</button>' +
        '<div class="fo-ask">' +
          '<span class="fo-eyebrow"><span class="fo-dot" aria-hidden="true"></span> Founding Musters · First 50 only</span>' +
          '<div class="fo-head">' + MARK +
            '<h2 id="fo-title">Congratulations — you got here <span class="fo-accent">early.</span></h2>' +
          '</div>' +
          '<p id="fo-desc">You have the opportunity to earn Muster Up <strong>Founder status</strong>, Muster Up <strong>merch</strong> and <strong>free-for-life access</strong>. Founder spots go to the first 50 Musters. Leave your email and we’ll send you how to claim yours.</p>' +
          '<ul class="fo-perks" aria-label="What Founders get">' +
            '<li>' + STAR + 'Permanent Founder badge on your profile</li>' +
            '<li>' + SHIRT + 'Muster Up merch</li>' +
            '<li>' + INFINITY + 'Free for life — whatever Muster Up costs later</li>' +
          '</ul>' +
          '<form class="fo-form" method="POST" action="/" name="' + FORM_NAME + '" novalidate>' +
            '<input type="hidden" name="form-name" value="' + FORM_NAME + '">' +
            '<input type="hidden" name="page" value="">' +
            '<input type="hidden" name="source" value="founder-offer-popup">' +
            '<p hidden><label>Don’t fill this out: <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>' +
            '<div class="fo-field">' +
              '<label for="fo-email">Email</label>' +
              '<input id="fo-email" name="email" type="email" required autocomplete="email" inputmode="email" placeholder="you@example.com" aria-describedby="fo-email-err">' +
              '<div class="fo-err" id="fo-email-err" role="alert">Enter a valid email so we know where to send it.</div>' +
            '</div>' +
            '<div class="fo-field">' +
              '<label for="fo-phone">Phone <span class="fo-opt">(optional — for a text when your first competition starts)</span></label>' +
              '<input id="fo-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="(555) 555-0123" aria-describedby="fo-phone-err">' +
              '<div class="fo-err" id="fo-phone-err" role="alert">That doesn’t look like a phone number — or leave it blank.</div>' +
            '</div>' +
            '<button type="submit" class="fo-btn">Claim my spot →</button>' +
            '<div class="fo-status" role="alert"></div>' +
            '<p class="fo-fine">One email with the steps, then only competition updates. No spam, unsubscribe anytime. <a href="/founder">How Founder status works</a></p>' +
          '</form>' +
          '<button type="button" class="fo-skip" data-fo-close>No thanks, I’ll pass on Founder status</button>' +
        '</div>' +
        '<div class="fo-done" aria-live="polite">' +
          '<div class="fo-check">' + CHECK + '</div>' +
          '<h2>You’re on the list.</h2>' +
          '<p>Watch your inbox for the steps. The fastest way to lock in Founder status is to create your account now — Founder badges land automatically.</p>' +
          '<div class="fo-ctas">' +
            '<a class="fo-btn" href="' + APP_STORE + '" target="_blank" rel="noopener">Download for iOS →</a>' +
            '<a class="fo-btn fo-ghost" href="' + WEB_APP + '">Use the web version (Android)</a>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);
    root.querySelector('input[name="page"]').value = location.pathname;
    return root;
  }

  var root = null, lastFocus = null, opened = false;

  function focusables() {
    return Array.prototype.filter.call(
      root.querySelectorAll('a[href], button:not([disabled]), input:not([type="hidden"]):not([tabindex="-1"])'),
      function (el) { return el.offsetParent !== null; }
    );
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close('dismissed'); return; }
    if (e.key !== 'Tab') return;
    var f = focusables(); if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function open() {
    if (opened) return;
    opened = true;
    if (!root) root = build();
    lastFocus = document.activeElement;
    root.removeAttribute('hidden');
    root.classList.add('fo-in');
    document.documentElement.classList.add('fo-lock');
    document.addEventListener('keydown', onKey);
    if (!isSubmitted()) write({ state: 'shown', at: Date.now() });
    track('founder_offer_shown', { page: location.pathname });
    setTimeout(function () { var el = root.querySelector('#fo-email'); if (el) el.focus({ preventScroll: true }); }, 60);
  }

  function close(reason) {
    if (!root || root.hasAttribute('hidden')) return;
    root.setAttribute('hidden', '');
    document.documentElement.classList.remove('fo-lock');
    document.removeEventListener('keydown', onKey);
    if (reason === 'dismissed' && !isSubmitted()) { write({ state: 'dismissed', at: Date.now() }); track('founder_offer_dismissed', { page: location.pathname }); }
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  }

  function valid(form) {
    var ok = true;
    var email = form.querySelector('#fo-email'), phone = form.querySelector('#fo-phone');
    var emailErr = form.querySelector('#fo-email-err'), phoneErr = form.querySelector('#fo-phone-err');
    var emailOk = email.value.trim() !== '' && email.checkValidity();
    email.setAttribute('aria-invalid', emailOk ? 'false' : 'true');
    emailErr.classList.toggle('show', !emailOk);
    if (!emailOk) { ok = false; email.focus(); }
    var digits = phone.value.replace(/\D/g, '');
    var phoneOk = phone.value.trim() === '' || (digits.length >= 7 && digits.length <= 15);
    phone.setAttribute('aria-invalid', phoneOk ? 'false' : 'true');
    phoneErr.classList.toggle('show', !phoneOk);
    if (!phoneOk && ok) { ok = false; phone.focus(); }
    return ok;
  }

  document.addEventListener('click', function (e) {
    if (!root) return;
    var t = e.target.closest ? e.target.closest('[data-fo-close]') : null;
    if (t && root.contains(t)) { e.preventDefault(); close('dismissed'); }
  });

  document.addEventListener('submit', function (e) {
    if (!root) return;
    var form = e.target;
    if (!form.classList || !form.classList.contains('fo-form')) return;
    e.preventDefault();
    if (!valid(form)) return;
    var btn = form.querySelector('.fo-btn'), status = form.querySelector('.fo-status');
    btn.disabled = true; btn.textContent = 'Sending…'; status.classList.remove('show');
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      submittedNow = true;
      write({ state: 'submitted', at: Date.now() });
      track('founder_offer_submitted', { page: location.pathname, phone: form.querySelector('#fo-phone').value.trim() !== '' });
      root.querySelector('.fo-ask').hidden = true;
      var done = root.querySelector('.fo-done');
      done.classList.add('show');
      var first = done.querySelector('a'); if (first) first.focus({ preventScroll: true });
    }).catch(function () {
      btn.disabled = false; btn.textContent = 'Claim my spot →';
      status.textContent = 'Couldn’t send that — check your connection and try again.';
      status.classList.add('show');
    });
  });

  /* ——— Triggers ——— */
  /* The homepage intro splash (#site-splash) gets class "on" while it plays and is removed
     from the DOM when it finishes; never open — or focus — the dialog underneath it. */
  function splashUp() {
    var sp = document.getElementById('site-splash');
    return !!sp && sp.classList.contains('on');
  }
  function busy() {
    if (document.hidden) return true;
    var a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return true;
    if (document.querySelector('.nav-drawer.open')) return true;
    return false;
  }
  var retryTimer = null, waitedForSplash = false;
  function tryOpen(force) {
    if (opened) return;
    clearTimeout(retryTimer);
    var later = function (ms) { retryTimer = setTimeout(function () { tryOpen(force); }, ms); };
    if (splashUp()) { waitedForSplash = true; later(500); return; }
    if (waitedForSplash && !force) { waitedForSplash = false; later(DELAY_MS); return; } // give the page a moment after the splash
    if (!force && busy()) { later(2500); return; }
    open();
  }
  function onScroll() {
    if (opened) { window.removeEventListener('scroll', onScroll); return; }
    var doc = document.documentElement;
    var max = Math.max(1, doc.scrollHeight - window.innerHeight);
    if (window.scrollY / max >= SCROLL_FRACTION || window.scrollY > window.innerHeight * 1.5) {
      window.removeEventListener('scroll', onScroll);
      tryOpen();
    }
  }
  function arm() {
    if (forced) { tryOpen(true); return; }
    setTimeout(function () { tryOpen(false); }, DELAY_MS);
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm); else arm();
})();
