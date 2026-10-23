// CSP hashes must match the inline scripts, and booking wording must not claim the request arrived.
const fs = require('node:fs'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const s = fs.readFileSync('index.html', 'utf8');
const m = s.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
assert(m, 'CSP meta missing');
assert(/default-src 'none'/.test(m[1]) && !/unsafe-eval/.test(m[1]) && !/script-src[^;]*'unsafe-inline'/.test(m[1]));
assert(/<meta name="referrer" content="[^"]+">/.test(s), 'referrer meta missing');
for (const x of s.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
  const h = "'sha256-" + crypto.createHash('sha256').update(x[1], 'utf8').digest('base64') + "'";
  assert(m[1].includes(h), 'inline script hash missing from CSP (update the CSP after editing inline scripts)');
}
assert(!/पहुँच गई है|भेज दी गई ✅/.test(s), 'booking text must not claim the request arrived');
console.log('csp-booking ok');
