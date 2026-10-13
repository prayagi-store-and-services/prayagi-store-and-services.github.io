/* Return-to-origin after staff login: only same-origin paths, never /staff/ itself, never another site. */
function safeNext(raw, origin) {
  try {
    if (!raw || typeof raw !== 'string' || raw.length > 300 || /[\\\u0000-\u001f]/.test(raw)) return '';
    var u = new URL(raw, origin + '/staff/');
    if (u.origin !== origin) return '';
    if (/^\/staff(\/|$)/.test(u.pathname)) return '';
    return u.pathname + u.search + u.hash;
  } catch (e) { return ''; }
}
if (typeof module !== 'undefined') module.exports = { safeNext: safeNext };
