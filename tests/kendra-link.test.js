// Run: node tests/kendra-link.test.js  (no dependencies)
// Guards the optional Kendra preview: files exist, the booking link gets a real href,
// and the page loads only same-site files. Static check; it does not run a browser.
var assert = require('assert');
var fs = require('fs');
var html = fs.readFileSync('kendra.html', 'utf8');
var js = fs.readFileSync('kendra-3d.js', 'utf8');

assert(fs.existsSync('kendra.css'), 'kendra.css missing');
assert(fs.existsSync('THREE-LICENSE.txt'), 'THREE-LICENSE.txt missing');
assert(/<script src="kendra-3d\.js"><\/script>/.test(html), 'kendra.html must load kendra-3d.js');
assert(/href="kendra\.css"/.test(html), 'kendra.html must load kendra.css');
assert(/Content-Security-Policy/.test(html) && /script-src 'self'/.test(html), 'CSP meta with script-src self missing');
assert(!/https?:\/\/(?!prayagi-store-and-services\.github\.io)/.test(html.replace(/<meta[^>]*>/g, '')), 'kendra.html must not load third-party URLs');
// The desk-card booking anchor must have its href assigned (an earlier build forgot it).
assert(/createElement\("a"\);(\w+)\.className="opt primary",\1\.href=\w+,\1\.textContent="Appointment request/.test(js),
  'Appointment request anchor must get an href');
assert(/\|\|"index\.html#booking"/.test(js), 'default booking target must be index.html#booking');
console.log('kendra-link tests passed');
