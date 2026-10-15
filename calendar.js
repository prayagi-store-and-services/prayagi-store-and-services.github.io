(function () {
  'use strict';
  var BACKEND = 'https://script.google.com/macros/s/AKfycbyAJG3ci-kniagsih7BXHpAPTk5h0-zKujN3Bu2VDyz5yh5fYNRor8GuVGedH1HdPmw/exec';
  var EXTRA_CLOSED = ['2026-10-15', '2026-10-16', '2026-10-17'];
  var closureText = 'तबीयत ठीक न होने की वजह से 15 से 17 अक्टूबर 2026 तक appointment booking बंद रहेगी।';
  var form = document.getElementById('booking-form');
  var todayForClosure = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  if (EXTRA_CLOSED.indexOf(todayForClosure) >= 0 && form) {
    var notice = document.createElement('p');
    notice.id = 'temporary-booking-closure'; notice.setAttribute('role', 'status');
    notice.textContent = closureText;
    notice.style.cssText = 'padding:16px;border:2px solid #8b3227;border-radius:10px;background:#fff1e8;color:#562015;font-weight:700;line-height:1.7';
    form.parentNode.insertBefore(notice, form);
    var fields = form.querySelectorAll('input,select,textarea,button');
    for (var c = 0; c < fields.length; c++) fields[c].disabled = true;
    form.addEventListener('submit', function (event) { event.preventDefault(); event.stopImmediatePropagation(); }, true);
    form.hidden = true;
    var done = document.getElementById('booking-done'); if (done) done.hidden = true;
  }
  var box = document.getElementById('availability-days'), note = document.getElementById('availability-note');
  if (!box) return;
  var DAYS = 21, WD = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function istToday() { return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10); }
  function addDays(iso, n) { return new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10); }
  function render(d) {
    box.textContent = '';
    var today = istToday();
    for (var i = 0; i < DAYS; i++) {
      var iso = addDays(today, i), wd = new Date(iso + 'T00:00:00Z').getUTCDay();
      var closed = wd === 0 || d.closedDays.indexOf(iso) >= 0 || EXTRA_CLOSED.indexOf(iso) >= 0;
      var booked = d.blocks.filter(function (b) { return b.date === iso && b.kind === 'booked'; });
      var card = el('div', 'avail-day' + (closed ? ' is-closed' : booked.length ? ' has-booked' : ''));
      card.appendChild(el('strong', null, iso.slice(8) + '/' + iso.slice(5, 7) + ' ' + WD[wd]));
      if (closed) card.appendChild(el('span', null, 'बंद / Closed'));
      else if (booked.length) booked.forEach(function (b) { card.appendChild(el('span', null, b.start + '-' + b.end + ' Booked')); });
      else card.appendChild(el('span', null, 'Open'));
      box.appendChild(card);
    }
    var t = new Date(d.updated + 330 * 60000).toISOString();
    note.textContent = 'Last updated ' + t.slice(8, 10) + '/' + t.slice(5, 7) + ' ' + t.slice(11, 16) + ' IST. यह हर 5-10 मिनट में अपडेट होता है। Booked समय दूसरी requests के लिए उपलब्ध नहीं हैं; अंतिम पुष्टि email से होगी।';
  }
  function load() {
    fetch(BACKEND + '?action=availability', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok || !Array.isArray(d.closedDays) || !Array.isArray(d.blocks)) throw new Error('bad');
      render(d); document.getElementById('availability').hidden = false;
    }).catch(function () {
      document.getElementById('availability').hidden = true;   // no data: the whole block stays hidden (owner rule)
    });
  }
  load(); setInterval(load, 5 * 60 * 1000);
})();
