import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

// Dependency-free local HTTP + Chrome CDP gate. Never reads .env or exports secrets.
// Starts its own dev server; does not migrate, reset, delete fixtures, or deploy.
const out = `docs/reviews/2026-10-23/gate71-${Date.now()}`;
const base = 'http://127.0.0.1:3241';
const results = [];
const browserTrace = [];
const password = randomBytes(24).toString('hex');
const secret = randomBytes(32).toString('hex');
const slug = `gate71-${Date.now()}`;
const distDir = `.local/${slug}-next`;
const email = `${slug}@example.test`;
let db, server, chrome, socket, cookie, fixture;
const originals = new Map();
let stage = 'local-database-preflight';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function pass(name, detail) { results.push({ name, status: 'PASS', detail }); console.log(`PASS ${name}`); }
async function request(path, body, expected = 200, authenticated = true, origin = base) {
  const r = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { origin, 'content-type': 'application/json', ...(authenticated && cookie ? { cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(120000),
  });
  assert.equal(r.status, expected, `${path}: expected ${expected}, got ${r.status}`);
  return { response: r, data: await r.json() };
}
async function balance(expected) {
  const { data } = await request('/api/ops/counts', { action: 'preview', productId: fixture.productId, locationId: fixture.locationId });
  assert.equal(data.quantity, expected, 'persisted inventory balance');
  return data;
}
async function ready(url, attempts = 120) {
  for (let n = 0; n < attempts; n++) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1500) })).ok) return; } catch { /* bounded readiness poll */ }
    await delay(500);
  }
  throw Error('LOCAL_SERVICE_NOT_READY');
}

// Real Chromium rendering and keyboard events, reusing the existing owner-journey CDP approach.
async function browserJourney() {
  stage = 'authenticated-browser-journey';
  const cdpPort = 9371;
  let occupied = false;
  try { await fetch(`http://127.0.0.1:${cdpPort}/json/version`); occupied = true; } catch { /* free */ }
  assert.equal(occupied, false, 'dedicated CDP port must be free');
  chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${process.cwd()}/.local/${slug}-chrome`, 'about:blank',
  ], { stdio: 'ignore', windowsHide: true });
  chrome.on('error', () => {});
  await ready(`http://127.0.0.1:${cdpPort}/json/version`, 30);
  const target = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = () => reject(Error('CDP_CONNECT_FAILED')); });
  let id = 0;
  const pending = new Map(), exceptions = [];
  socket.onmessage = event => {
    const m = JSON.parse(event.data);
    if (m.id) {
      const p = pending.get(m.id); if (!p) return;
      clearTimeout(p.timer); pending.delete(m.id);
      if (m.error) p.reject(Error('CDP_COMMAND_FAILED')); else p.resolve(m.result);
    } else if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.method);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    // Record protocol names and timing only: evaluate/input parameters contain credentials.
    const entry = { method, stage, startedAt: Date.now(), status: 'PENDING' };
    browserTrace.push(entry);
    const key = ++id, timer = setTimeout(() => { pending.delete(key); entry.status = 'TIMEOUT'; reject(Error('CDP_TIMEOUT')); }, method === 'Page.navigate' ? 120000 : 30000);
    pending.set(key, {
      resolve: value => { entry.status = 'OK'; entry.elapsedMs = Date.now() - entry.startedAt; resolve(value); },
      reject: error => { entry.status = 'FAILED'; reject(error); }, timer,
    }); socket.send(JSON.stringify({ id: key, method, params }));
  });
  const ev = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!r.exceptionDetails, 'browser expression must execute'); return r.result?.value;
  };
  async function until(expression, attempts = 150) {
    for (let n = 0; n < attempts; n++) { if (await ev(expression)) return; await delay(200); }
    const diagnostic = await ev(`(()=>({path:location.pathname,ready:document.readyState,labels:document.querySelector('[data-testid=label-product]')?.options.length,selected:document.querySelector('[data-testid=label-product]')?.value,scan:document.querySelector('[data-testid=label-scan]')?.value,alert:document.querySelector('.barcode-label-panel [role=alert]')?.textContent,articles:document.querySelectorAll('#barcode-label-print-root article').length}))()`);
    browserTrace.push({ method: 'Gate.condition', stage, status: 'TIMEOUT', expression, diagnostic });
    throw Error('BROWSER_CONDITION_TIMEOUT');
  }
  async function nav(path) {
    await ev('window.__gateOldDocument=true');
    const navigation = await send('Page.navigate', { url: base + path });
    assert.ok(!navigation.errorText, 'CDP navigation must succeed');
    // Next streaming may leave readyState='loading' after the route and UI have mounted.
    // Each subsequent journey stage waits for its own hydrated controls and catalog data.
    await until(`!window.__gateOldDocument && location.pathname===${JSON.stringify(path)} && !!document.body`, 600);
  }
  async function set(selector, value) {
    await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing field');const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(String(value))});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  }
  async function click(expression) { await ev(`(()=>{const e=${expression};if(!e||e.disabled)throw Error('Button unavailable');e.click();return true;})()`); }
  async function scan(selector, code) {
    await ev(`document.querySelector(${JSON.stringify(selector)}).focus();true`);
    await send('Input.insertText', { text: code });
    await until(`document.querySelector(${JSON.stringify(selector)})?.value===${JSON.stringify(code)}`);
    await delay(150);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await until(`document.querySelector(${JSON.stringify(selector)}).value===''`);
  }
  const section = heading => `[...document.querySelectorAll('section')].find(s=>s.querySelector('h2')?.textContent===${JSON.stringify(heading)})`;
  const button = (scope, text) => `[...(${scope}).querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(text)})`;
  async function shot(name) {
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await writeFile(`${out}/${name}.png`, Buffer.from(r.data, 'base64'));
  }
  for (const method of ['Page.enable', 'Runtime.enable', 'Network.enable']) await send(method);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await nav('/en/login');
  // Login is server-rendered before React activates its submit handler.
  await until('document.readyState==="complete"', 600);
  await until('!!document.querySelector("form button.primary:not(:disabled)")');
  for (const [name, value] of Object.entries({ tenant: slug, email, password })) await set(`input[name="${name}"]`, value);
  await click('document.querySelector("form button.primary")');
  await until(`location.pathname==='/en/admin'||location.pathname==='/en'`);
  assert.equal(await ev(`fetch('/api/auth/session').then(r=>r.status)`), 200);
  const cookies = await send('Network.getCookies', { urls: [base] });
  assert.ok(cookies.cookies.some(c => c.httpOnly && c.name === 'a1-mobi-session'));
  pass('browser-real-form-login', 'Server session 200 and HttpOnly cookie; no authentication mocks');

  await nav('/en/inventory');
  const receipt = 'section[aria-label="Purchase scan receiving"]';
  await until(`document.querySelector(${JSON.stringify(receipt + ' select')})?.options.length>1`);
  await set(receipt + ' input[type=number]', 1);
  await set(receipt + ' select', fixture.locationId);
  for (let n = 0; n < 2; n++) await scan(receipt + ' input:not([type])', '5901234123457');
  await click(button(`document.querySelector(${JSON.stringify(receipt)})`, 'Post receipt to inventory'));
  await until(`document.querySelector(${JSON.stringify(receipt)})?.textContent.includes('Purchase receipt saved.')`);
  await balance(6);
  pass('browser-purchase-receipt', 'Two EAN+Enter scans persisted: 4 → 6');

  await nav('/en/pos');
  const pos = 'section[aria-label="Barcode checkout"]';
  await until(`document.querySelector(${JSON.stringify(pos + ' select')})?.options.length>1`);
  await set(pos + ' select', fixture.locationId);
  for (let n = 0; n < 2; n++) await scan(pos + ' input:not([type])', '5901234123457');
  assert.equal(await ev(`Number(document.querySelector(${JSON.stringify(pos + ' input[type=number]')}).value)`), 2);
  await click(button(`document.querySelector(${JSON.stringify(pos)})`, 'Confirm cash sale / retry'));
  await until(`document.querySelector(${JSON.stringify(pos)})?.textContent.includes('Invoice saved:')`);
  const invoice = await ev(`document.querySelector(${JSON.stringify(pos + ' [role=status]')}).textContent.split('Invoice saved: ')[1]`);
  await balance(4);
  pass('browser-scanned-quantity-sale', 'Two scans create quantity 2 and a persisted invoice: 6 → 4');
  const ret = section('Return nonserialized items');
  await ev(`(${ret}).id='gate-return';true`);
  await set('#gate-return input:not([type])', invoice);
  await click(button(ret, 'Load invoice'));
  await until('!!document.querySelector("#gate-return textarea")');
  await set('#gate-return select', fixture.locationId);
  await set('#gate-return input[type=number]', 1);
  await set('#gate-return textarea', 'Gate 7/1 browser return');
  // Accept only the app's explicit return/count confirmation dialogs.
  socket.addEventListener('message', event => {
    const m = JSON.parse(event.data);
    if (m.method === 'Page.javascriptDialogOpening' && m.params.type === 'confirm') {
      send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    }
  });
  await click(button(ret, 'Confirm / retry'));
  await until('document.querySelector("#gate-return [role=status]")?.textContent.includes("Return saved:")');
  await balance(5);
  pass('browser-sale-return', 'Invoice lookup and reasoned quantity 1 return: 4 → 5; cash payout not tested');

  await nav('/en/inventory');
  const count = section('Count one item');
  await until(`(${count})?.querySelector('select')?.options.length>1`);
  await ev(`(${count}).id='gate-count';true`);
  await set('#gate-count select:nth-of-type(1)', fixture.productId);
  // Selects are nested in separate labels, so address the location by its label.
  await ev(`document.querySelectorAll('#gate-count select')[1].id='gate-count-location';true`);
  await set('#gate-count-location', fixture.locationId);
  await click(button(count, 'Start / restart count'));
  await until('!!document.querySelector("#gate-count textarea")');
  await set('#gate-count input[type=number]', 4);
  await set('#gate-count textarea', 'Gate 7/1 browser shelf count');
  await click(button(count, 'Confirm / retry'));
  await until('document.querySelector("#gate-count [role=status]")?.textContent.includes("Count saved;")');
  await balance(4);
  pass('browser-stock-count', 'Recorded 5, counted 4; persisted variance −1');
  await shot('authenticated-inventory-count');

  for (const locale of ['en', 'ar']) {
    stage = `browser-label-load-${locale}`;
    await nav(`/${locale}/inventory`);
    await until('document.querySelector("[data-testid=label-product]")?.options.length>1', 450);
    stage = `browser-label-enter-${locale}`;
    // Native input setter + bubbling input event reliably updates React's controlled label field.
    await set('[data-testid=label-scan]', '5901234123457');
    await until('document.querySelector("[data-testid=label-scan]")?.value==="5901234123457"');
    await delay(200);
    await click('document.querySelector(".barcode-label-panel button[type=submit]")');
    await until(`document.querySelector('[data-testid=label-product]')?.value===${JSON.stringify(fixture.productId)}`);
    stage = `browser-label-quantity-${locale}`;
    await set('[data-testid=label-quantity]', 3);
    await until('document.querySelector("[data-testid=label-quantity]")?.value==="3"');
    await until('document.querySelectorAll("#barcode-label-print-root article").length===3');
    stage = `browser-label-print-${locale}`;
    assert.equal(await ev('document.querySelector("[data-testid=label-print]").disabled'), false);
    await ev('document.fonts.ready.then(()=>true)');
    await shot(`labels-${locale}-screen`);
    await send('Emulation.setEmulatedMedia', { media: 'print' });
    // Focused scan fields can retain the old screen scroll position after print isolation.
    await ev(`new Promise(resolve=>{document.activeElement?.blur();window.scrollTo(0,0);requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true)));})`);
    assert.equal(await ev(`(()=>{const r=document.querySelector('#barcode-label-print-root article').getBoundingClientRect();return r.top>=0&&r.top<innerHeight&&r.bottom>0&&r.left>=0&&r.right<=innerWidth;})()`), true, 'print screenshot must contain a label');
    await ev(`(async()=>{window.scrollTo({top:0,left:0,behavior:'instant'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true;})()`);
    const layout = await ev(`(()=>{const root=document.querySelector('#barcode-label-print-root');return {isolated:[...document.body.children].filter(e=>e!==root).every(e=>getComputedStyle(e).display==='none'),labels:[...root.querySelectorAll('article')].map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,overflow:e.scrollHeight>e.clientHeight,code:e.querySelector('.barcode-label-value').textContent}))};})()`);
    assert.equal(layout.isolated, true);
    for (const label of layout.labels) { assert.ok(Math.abs(label.w - 80 * 96 / 25.4) < 1); assert.ok(Math.abs(label.h - 40 * 96 / 25.4) < 1); assert.equal(label.overflow, false); assert.equal(label.code, '5901234123457'); }
    await shot(`labels-${locale}-print-media`);
    const pdf = await send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
    const bytes = Buffer.from(pdf.data, 'base64');
    assert.equal((bytes.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length, 3, 'three label PDF pages');
    await writeFile(`${out}/labels-${locale}.pdf`, bytes);
    await send('Emulation.setEmulatedMedia', { media: '' });
    pass(`browser-print-render-${locale}`, 'Three isolated 80×40mm PDF pages; CSS dimensions and overflow checked. No physical hardware claim.');
  }
  stage = 'browser-completion';
  assert.equal(exceptions.length, 0, 'uncaught browser exceptions');
  pass(stage, 'No uncaught JavaScript exceptions; browser is terminated by owned-process teardown, without waiting for a reply from a closed CDP endpoint');
}

try {
  await mkdir(out, { recursive: true });
  assert.notEqual(process.env.NODE_ENV, 'production', 'production refused');
  const compose = await readFile('docker-compose.yml', 'utf8');
  const value = key => { const m = compose.match(new RegExp(key + ': ([^\\r\\n]+)')); assert.ok(m, 'compose setting required'); return m[1].trim(); };
  const url = new URL('postgresql://127.0.0.1:5437/' + value('POSTGRES_DB'));
  url.username = value('POSTGRES_USER'); url.password = value('POSTGRES_PASSWORD');
  url.searchParams.set('connect_timeout', '5'); url.searchParams.set('socket_timeout', '5');
  db = new PrismaClient({ datasourceUrl: url.toString(), log: [], errorFormat: 'minimal' });
  await db.$queryRaw`SELECT 1`;
  pass(stage, 'Literal loopback PostgreSQL port 5437; SELECT 1');
  stage = 'local-dev-server';
  for (const path of ['AGENTS.md', 'tsconfig.json']) originals.set(path, await readFile(path, 'utf8'));
  let occupied = false;
  try { await fetch(base + '/en/login', { signal: AbortSignal.timeout(1000) }); occupied = true; } catch { /* free */ }
  assert.equal(occupied, false, 'dedicated local app port must be free');
  // Use the supported CLI startup path; terminate its owned worker tree at teardown.
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3241'], {
    env: { ...process.env, NODE_ENV: 'development', DATABASE_URL: url.toString(), APP_ORIGIN: base,
      A1_MOBI_C_LIVE_01_ENABLED: '1', A1_MOBI_BOOTSTRAP_SECRET: secret, A1_MOBI_DIST_DIR: distDir },
    stdio: 'ignore', windowsHide: true,
  });
  server.on('error', () => {});
  await ready(base + '/en/login');
  pass(stage, 'Dedicated loopback app, explicit local DB and pilot flag');
  stage = 'isolated-fixture-and-authentication';
  const boot = await fetch(base + '/api/bootstrap', { method: 'POST', headers: { 'content-type': 'application/json', 'x-a1-bootstrap-secret': secret },
    body: JSON.stringify({ tenantSlug: slug, tenantName: 'Gate 7/1 synthetic local store', branchCode: 'MAIN', branchName: 'Gate branch', ownerEmail: email, ownerDisplayName: 'Gate QA', ownerPassword: password, locale: 'en' }), signal: AbortSignal.timeout(120000) });
  assert.equal(boot.status, 201, 'bootstrap isolated local tenant');
  fixture = (await boot.json()).bootstrap;
  const category = await db.category.create({ data: { tenantId: fixture.tenantId, code: 'QA', nameAr: 'اختبار', nameEn: 'QA' } });
  const product = await db.product.create({ data: { tenantId: fixture.tenantId, categoryId: category.id, sku: 'GATE71-CASE', nameAr: 'غطاء اختبار', nameEn: 'Gate test case', type: 'ACCESSORY', isSerialized: false, costAmount: 1, basePrice: 3, minimumPrice: 2, barcodes: { create: { tenantId: fixture.tenantId, value: '5901234123457' } } } });
  const location = await db.stockLocation.create({ data: { tenantId: fixture.tenantId, branchId: fixture.branchId, code: 'QA', name: 'Gate shelf' } });
  fixture.productId = product.id; fixture.locationId = location.id;
  await request('/api/ops/live-01', undefined, 401, false);
  const login = await request('/api/auth/login', { tenant: slug, email, password }, 200, false);
  const header = login.response.headers.get('set-cookie');
  assert.match(header, /HttpOnly/i); cookie = header.split(';')[0];
  const session = await request('/api/auth/session');
  assert.ok(session.data.permissions.includes('inventory.read') && session.data.permissions.includes('sell.return'));
  const catalog = await request('/api/ops/live-01');
  assert.deepEqual(catalog.data.products.map(p => p.id), [product.id]);
  assert.equal(catalog.response.headers.get('cache-control'), 'no-store');
  pass(stage, 'Real login, HttpOnly cookie, permissions, isolated tenant catalog and anonymous rejection');
  stage = 'http-purchase-sale-return-count';
  const receive = { action: 'receiveBulk', locationId: location.id, lines: [{ productId: product.id, quantity: 5, unitCost: 1 }], idempotencyKey: randomUUID() };
  await request('/api/ops/live-01', receive, 201); await request('/api/ops/live-01', receive);
  await balance(5);
  const sell = { action: 'sellBulk', locationId: location.id, lines: [{ productId: product.id, quantity: 3 }], idempotencyKey: randomUUID() };
  const { data: sale } = await request('/api/ops/live-01', sell, 201);
  assert.equal((await request('/api/ops/live-01', sell, 201)).data.id, sale.id);
  await balance(2);
  const lookup = (await request('/api/ops/returns?invoice=' + encodeURIComponent(sale.invoiceNumber))).data;
  const ret = { saleId: sale.id, invoiceNumber: sale.invoiceNumber, reason: 'Gate 7/1 HTTP return', idempotencyKey: randomUUID(), lines: [{ originalSaleLineId: lookup.lines[0].id, stockLocationId: location.id, quantity: 1 }] };
  const returned = (await request('/api/ops/returns', ret)).data;
  assert.equal(returned.refundBase, 3); assert.equal((await request('/api/ops/returns', ret)).data.id, returned.id);
  const before = await balance(3);
  const count = { action: 'post', productId: product.id, locationId: location.id, version: before.version, countedQty: 4, reason: 'Gate 7/1 HTTP count', idempotencyKey: randomUUID() };
  await request('/api/ops/counts', count); await request('/api/ops/counts', count); await balance(4);
  await request('/api/ops/counts', { ...count, idempotencyKey: randomUUID() }, 409);
  await request('/api/ops/live-01', receive, 403, true, 'https://invalid.example');
  for (const [action, entityId] of [['sale.checkout', sale.id], ['sale.return.posted', returned.id], ['inventory.count.posted', count.idempotencyKey]]) {
    const audits = await db.auditEvent.findMany({ where: { tenantId: fixture.tenantId, action, entityId } });
    assert.equal(audits.length, 1); assert.ok(audits[0].before); assert.ok(audits[0].after);
  }
  assert.equal(await db.stockMovement.count({ where: { tenantId: fixture.tenantId, type: 'PURCHASE_RECEIPT' } }), 1);
  assert.equal(await db.stockMovement.count({ where: { tenantId: fixture.tenantId, type: 'SALE' } }), 1);
  assert.equal(await db.stockMovement.count({ where: { tenantId: fixture.tenantId, type: 'RETURN' } }), 1);
  assert.equal(await db.stockMovement.count({ where: { tenantId: fixture.tenantId, type: 'COUNT_VARIANCE' } }), 1);
  pass(stage, 'Balances 0 → 5 → 2 → 3 → 4; exact replays do not duplicate; stale count and foreign origin rejected; before/after audits verified');
  await browserJourney();
} catch (error) {
  // Error messages may contain credentials, query arguments or environment values. Do not serialize them.
  results.push({ name: stage, status: 'BLOCKED_OR_FAILED', errorClass: error.name,
    reason: ['LOCAL_SERVICE_NOT_READY', 'CDP_CONNECT_FAILED', 'CDP_COMMAND_FAILED', 'CDP_TIMEOUT', 'BROWSER_CONDITION_TIMEOUT'].includes(error.message) ? error.message : undefined,
    assertion: error.code === 'ERR_ASSERTION' ? String(error.message).split('\n')[0] : undefined });
  console.log(`BLOCKED_OR_FAILED ${stage} (${error.name})`);
  process.exitCode = 1;
} finally {
  socket?.close();
  for (const child of [chrome, server]) {
    if (!child) continue;
    if (process.platform === 'win32' && child.pid) {
      const stopped = spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      if (stopped.status !== 0) child.kill();
    }
    else child.kill();
  }
  if (server && server.exitCode === null) await Promise.race([new Promise(resolve => server.once('exit', resolve)), delay(2000)]);
  // Remove only this dev run's generated additions; retain original and concurrent edits.
  for (const [path, original] of originals) {
    const current = await readFile(path, 'utf8');
    if (path === 'AGENTS.md' && !original.includes('<!-- BEGIN:nextjs-agent-rules -->')) {
      const cleaned = current.replace(/\s*<!-- BEGIN:nextjs-agent-rules -->[\s\S]*?<!-- END:nextjs-agent-rules -->\s*/g, '');
      if (cleaned !== current) await writeFile(path, cleaned.trimEnd() === original.trimEnd() ? original : cleaned);
    } else if (path === 'tsconfig.json') {
      const parsed = JSON.parse(current), prior = JSON.parse(original);
      parsed.include = parsed.include.filter(entry => prior.include.includes(entry) || !entry.startsWith(distDir + '/'));
      if (JSON.stringify(parsed) === JSON.stringify(prior)) await writeFile(path, original);
      else if (JSON.stringify(parsed) !== JSON.stringify(JSON.parse(current))) await writeFile(path, JSON.stringify(parsed, null, 2) + '\n');
    }
  }
  if (db && fixture) {
    // Keep business records for review; revoke every session generated for this isolated owner.
    try { await db.session.updateMany({ where: { userId: fixture.ownerId }, data: { revokedAt: new Date() } }); }
    catch { results.push({ name: 'fixture-session-revocation', status: 'FAILED' }); process.exitCode = 1; }
  }
  await db?.$disconnect();
  await writeFile(`${out}/browser-trace.json`, JSON.stringify(browserTrace, null, 2));
  await writeFile(`${out}/results.json`, JSON.stringify({ scope: 'Thaghr local 5437 only', status: process.exitCode ? 'INCOMPLETE' : 'PASS', generatedAt: new Date().toISOString(), fixtureTenantId: fixture?.tenantId, results,
    limits: ['No physical scanner or printer validation', 'No release approval', 'Synthetic business records retained; fixture sessions revoked when reachable'] }, null, 2));
}
