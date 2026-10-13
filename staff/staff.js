(function () {
  'use strict';
  // Set to the deployed Apps Script web app URL (ends with /exec) after the owner deploys it. Empty = Unavailable.
  var BACKEND = 'https://script.google.com/macros/s/AKfycbyAJG3ci-kniagsih7BXHpAPTk5h0-zKujN3Bu2VDyz5yh5fYNRor8GuVGedH1HdPmw/exec';
  var $ = function (id) { return document.getElementById(id); };
  var origin = location.origin;
  var qs = new URLSearchParams(location.search).get('next');
  var next = safeNext(qs, origin) || (document.referrer ? safeNext(document.referrer, origin) : '');
  if (next) sessionStorage.setItem('pnext', next);
  function goBack() { var n = sessionStorage.getItem('pnext'); sessionStorage.removeItem('pnext'); if (n) { location.assign(n); return true; } return false; }
  var token = sessionStorage.getItem('pt') || '';   // session only: closing the tab logs out

  function el(tag, text, cls) { var e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; }

  function call(body) {
    if (!BACKEND) return Promise.resolve({ ok: false, error: 'Unavailable: staff login is not connected yet.' });
    body.token = token;
    return fetch(BACKEND, { method: 'POST', body: JSON.stringify(body), redirect: 'follow', credentials: 'omit' })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, error: 'Network problem. Try again.' }; });
  }

  function showApp(role, email) {
    $('login').hidden = true; $('app').hidden = false;
    $('who').textContent = email + ' (' + role + ')';
    $('admin').hidden = role !== 'admin';
    refresh();
  }
  function showLogin() { token = ''; sessionStorage.removeItem('pt'); $('app').hidden = true; $('login').hidden = false; }

  function masterStatus() {
    if ($('admin').hidden) return;
    call({ action: 'masterStatus' }).then(function (r) { $('m_status').textContent = r.ok ? (r.set ? 'Master password is set and saved. Use the box below only to change it.' : 'Master password is not set yet.') : 'Unavailable'; $('m_set').textContent = r.ok && r.set ? 'Change master password' : 'Save master password'; });
  }
  function refresh() {
    masterStatus();
    call({ action: 'listAppointments' }).then(function (r) {
      if (r.relogin) return showLogin();
      var box = $('list'); box.textContent = '';
      if (!r.ok) { box.appendChild(el('p', r.error)); return; }
      if (!r.appointments.length) box.appendChild(el('p', 'No appointments yet.'));
      r.appointments.forEach(function (a) {
        var c = el('div', '', 'card');
        c.appendChild(el('b', a.date + ' ' + a.time + (a.emergency ? ' (emergency)' : '') + ' - ' + a.status));
        c.appendChild(el('span', a.name + ', ' + a.mobile + ' - ' + a.service + (a.note ? ' - ' + a.note : '')));
        if (a.status !== 'Cancelled') {
          var x = el('button', 'Cancel', 'sec');
          x.onclick = function () { call({ action: 'setStatus', id: a.id, status: 'Cancelled' }).then(refresh); };
          c.appendChild(x);
        }
        box.appendChild(c);
      });
    });
    if (!$('admin').hidden) {
      call({ action: 'listStaff' }).then(function (r) {
        var box = $('stafflist'); box.textContent = '';
        (r.staff || []).forEach(function (s) {
          var c = el('div', '', 'card');
          c.appendChild(el('span', s.email + ' - ' + s.status));
          var t = el('button', s.status === 'active' ? 'Disable' : 'Enable', 'sec');
          t.onclick = function () { call({ action: 'setStaffActive', email: s.email, active: s.status !== 'active' }).then(refresh); };
          var iv = el('button', 'Invite', 'sec');
          iv.onclick = function () { call({ action: 'createInvite', email: s.email }).then(function (r) { $('invmsg').textContent = r.ok ? 'Invite for ' + s.email + ': ' + r.invite + ' (' + r.note + ')' : r.error; }); };
          c.appendChild(t); c.appendChild(iv); box.appendChild(c);
        });
      });
      call({ action: 'listLocks' }).then(function (r) {
        var box = $('locklist'); box.textContent = '';
        if (!r.ok) return;
        if (!r.locked.length && !r.requests.length) box.appendChild(el('p', 'No locked accounts.'));
        r.locked.forEach(function (x) {
          var c = el('div', '', 'card');
          c.appendChild(el('span', x.email + ' locked until ' + new Date(x.until).toLocaleString()));
          var u = el('button', 'Unlock now', 'sec');
          u.onclick = function () { call({ action: 'unlock', email: x.email }).then(refresh); };
          c.appendChild(u); box.appendChild(c);
        });
        r.requests.forEach(function (x) { box.appendChild(el('p', 'Request: ' + x.by + ' asks to unlock ' + x.target)); });
      });
      call({ action: 'listClosures' }).then(function (r) {
        var box = $('closelist'); box.textContent = '';
        (r.closures || []).forEach(function (x) { box.appendChild(el('p', x.date + (x.reason ? ' - ' + x.reason : ''))); });
      });
    }
  }

  if (!BACKEND) $('unavail').hidden = false;

  $('send').onclick = function () {
    $('loginmsg').textContent = 'Sending...';
    call({ action: 'requestOtp', email: $('email').value }).then(function (r) {
      $('loginmsg').textContent = r.ok ? r.message : r.error;
      if (r.ok) { $('codebox').hidden = false; setTimeout(function () { $('nocode').hidden = false; }, 120000); }
    });
  };
  $('verify').onclick = function () {
    call({ action: 'verifyOtp', email: $('email').value, code: $('code').value }).then(function (r) {
      if (!r.ok) { $('loginmsg').textContent = r.error; if (r.masterAvailable) $('masterbox').hidden = false; return; }
      token = r.token; sessionStorage.setItem('pt', token); $('code').value = '';
      if (!goBack()) showApp(r.role, r.email);
    });
  };
  $('pwlogin').onclick = function () {
    call({ action: 'loginPassword', email: $('p_email').value, password: $('p_pw').value }).then(function (r) {
      if (!r.ok) { $('pwmsg').textContent = r.error; return; }
      if (r.verify) { fl_email = $('p_email').value; $('p_pw').value = ''; $('fl_verify').hidden = false; $('pwmsg').textContent = r.message; return; }
      token = r.token; sessionStorage.setItem('pt', token); $('p_pw').value = '';
      if (!goBack()) showApp(r.role, r.email);
    });
  };
  var fl_email = '';
  $('fl_go').onclick = function () {
    call({ action: 'verifyFirstLogin', email: fl_email, code: $('fl_code').value }).then(function (r) {
      if (!r.ok) { $('pwmsg').textContent = r.error; return; }
      token = r.token; sessionStorage.setItem('pt', token); $('fl_code').value = '';
      $('fl_verify').hidden = true; $('fl_change').hidden = false; $('pwmsg').textContent = 'Email verified. Set your new password.';
    });
  };
  $('fl_save').onclick = function () {
    call({ action: 'changePassword', password: $('fl_pw').value }).then(function (r) {
      if (!r.ok) { $('pwmsg').textContent = r.error; return; }
      $('fl_pw').value = ''; $('fl_change').hidden = true; token = ''; sessionStorage.removeItem('pt');
      $('pwmsg').textContent = 'Password saved. Log in with your email and the new password.';
    });
  };
  $('setpw').onclick = function () {
    call({ action: 'setPassword', email: $('i_email').value, invite: $('i_code').value, password: $('i_pw').value }).then(function (r) {
      $('pwmsg').textContent = r.ok ? 'Password set. You can log in now.' : r.error; if (r.ok) { $('i_pw').value = ''; $('i_code').value = ''; }
    });
  };
  $('u_req').onclick = function () { call({ action: 'requestUnlock', email: $('u_email').value }).then(function (r) { $('u_msg').textContent = r.ok ? r.message : r.error; }); };
  $('nocode_btn').onclick = function () { call({ action: 'masterOption' }).then(function (r) { if (r.masterAvailable) $('masterbox').hidden = false; else $('loginmsg').textContent = 'Wait a little longer for the email, then try again.'; }); };
  $('m_login').onclick = function () {
    call({ action: 'loginMaster', password: $('m_pw').value }).then(function (r) {
      $('m_pw').value = '';
      if (!r.ok) { $('loginmsg').textContent = r.error; return; }
      token = r.token; sessionStorage.setItem('pt', token); if (!goBack()) showApp(r.role, r.email);
    });
  };
  $('m_set').onclick = function () {
    call({ action: 'setMaster', password: $('m_new').value }).then(function (r) { $('m_new').value = ''; $('m_msg').textContent = r.ok ? 'Master password has been saved. / मास्टर पासवर्ड सहेज लिया गया है।' : r.error; masterStatus(); });
  };
  $('custform').onsubmit = function (e) {
    e.preventDefault();
    call({ action: 'createCustomer', mobile: $('cu_mobile').value, name: $('cu_name').value }).then(function (r) { $('cu_msg').textContent = r.ok ? 'Customer saved.' : r.error; if (r.ok) $('custform').reset(); });
  };
  $('logout').onclick = function () { call({ action: 'logout' }).then(showLogin); };
  $('bookform').onsubmit = function (e) {
    e.preventDefault();
    call({ action: 'addAppointment', name: $('b_name').value, mobile: $('b_mobile').value, service: $('b_service').value, date: $('b_date').value, time: $('b_time').value, emergency: $('b_emerg').checked, note: $('b_note').value }).then(function (r) {
      $('bookmsg').textContent = r.ok ? 'Booked. ID ' + r.id + (r.fee ? ' (Rs ' + r.fee + ' emergency fee)' : '') : r.error;
      if (r.ok) { $('bookform').reset(); refresh(); }
    });
  };
  $('staffform').onsubmit = function (e) { e.preventDefault(); call({ action: 'addStaff', email: $('s_email').value, name: $('s_name').value, mobile: $('s_mobile').value, tempPassword: $('s_temp').value }).then(function (r) { if (r.ok) { $('staffform').reset(); $('invmsg').textContent = r.note || 'Staff already exists and is active.'; refresh(); } else alert(r.error); }); };
  $('closeform').onsubmit = function (e) { e.preventDefault(); call({ action: 'addClosure', date: $('c_date').value, reason: $('c_reason').value }).then(function (r) { if (r.ok) { $('closeform').reset(); refresh(); } else alert(r.error); }); };

  if (token) call({ action: 'me' }).then(function (r) { if (r.ok && !r.mustChange) showApp(r.role, r.email); else showLogin(); });
})();

;(function () { function o() { var d = document.getElementById('firsttime'); if (d && location.hash === '#first-time') { d.open = true; d.scrollIntoView(); } } o(); window.addEventListener('hashchange', o); })();
