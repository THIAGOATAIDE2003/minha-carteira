/* Service worker: sobe uma cópia do app num servidor local que imita o GitHub Pages (cache HTTP de 10 min) e confere:
   1ª abertura instala e guarda tudo; 2ª abertura vem 100% do cache (sem rede); abre offline; versão nova é detectada, baixada inteira e trocada,
   sem ficar misturado e sem repetir recarga. Uso: node tests/sw-teste.js */
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
let falhas = 0; const ok = (c, m) => { if (!c) { falhas++; console.log('✗', m); } else console.log('✓', m); };
const raiz = path.resolve(__dirname, '..'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aporte-sw-'));
const copia = d => { for (const f of fs.readdirSync(raiz)) { if (/^(node_modules|\.git|tests|\.github)$/.test(f)) continue; const s = path.join(raiz, f), t = path.join(d, f); if (fs.statSync(s).isDirectory()) { fs.mkdirSync(t, { recursive: true }); copia2(s, t); } else fs.copyFileSync(s, t); } };
const copia2 = (s, t) => { for (const f of fs.readdirSync(s)) fs.copyFileSync(path.join(s, f), path.join(t, f)); };
copia(tmp);
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
let pedidos = [];
const srv = http.createServer((q, r) => { const u = new URL(q.url, 'http://x'); let p = u.pathname === '/' ? '/index.html' : u.pathname; pedidos.push(p + (u.search || ''));
  const f = path.join(tmp, p); if (!f.startsWith(tmp) || !fs.existsSync(f)) { r.writeHead(404); return r.end('x'); }
  r.writeHead(200, { 'Content-Type': (tipos[path.extname(f)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'public, max-age=600' }); r.end(fs.readFileSync(f)); });
(async () => {
  await new Promise(r => srv.listen(0, r)); const URL0 = 'http://localhost:' + srv.address().port + '/';
  const b = await chromium.launch({ args: ['--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE localhost'] }); const ctx = await b.newContext({ viewport: { width: 400, height: 860 } }); const er = [];
  const abre = async () => { const p = await ctx.newPage(); p.on('pageerror', e => er.push(e.message)); await p.goto(URL0); await p.waitForFunction(() => window.BOOT === true || typeof BOOT !== 'undefined' && BOOT, null, { timeout: 15000 }); return p; };
  const ver = p => p.evaluate(() => VERSAO);
  const v0 = fs.readFileSync(path.join(tmp, 'js/nucleo.js'), 'utf8').match(/VERSAO='([0-9.]+)'/)[1];
  // 1) primeira abertura: instala e guarda tudo
  let p = await abre(); await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForFunction(() => navigator.serviceWorker.controller || true);
  await p.waitForFunction(async () => (await caches.keys()).length > 0, null, { timeout: 15000 });
  const n1 = await p.evaluate(async () => { const k = await caches.keys(); const c = await caches.open(k[0]); return { k, n: (await c.keys()).length } });
  const lista = (fs.readFileSync(path.join(tmp, 'sw.js'), 'utf8').match(/var ARQ=\[(.*?)\]/s)[1].match(/'[^']+'/g) || []).length;
  ok(n1.k.length === 1 && n1.k[0] === 'aporte-v' + v0, '1ª abertura: um cache com o nome da versão (' + n1.k.join(',') + ')');
  ok(n1.n >= lista, '1ª abertura: guardou os ' + lista + ' arquivos do app (' + n1.n + ')');
  await p.close();
  // 2) segunda abertura: tudo do cache, nada pedido ao servidor para os arquivos do app
  await new Promise(r => setTimeout(r, 500)); pedidos = []; const t0 = Date.now(); p = await abre(); const t1 = Date.now() - t0;
  await p.waitForTimeout(500);
  const arq = pedidos.filter(x => /\.(js|css|html|svg|webmanifest)(\?|$)|^\/$/.test(x) && !/_v=/.test(x));
  ok(arq.length === 0, '2ª abertura: nenhum arquivo do app pedido ao servidor (pedidos: ' + JSON.stringify(arq.slice(0, 4)) + ')');
  ok(await p.evaluate(() => !!navigator.serviceWorker.controller), '2ª abertura: página controlada pelo service worker (abriu em ' + t1 + ' ms)');
  ok((await ver(p)) === v0, 'versão em uso = ' + v0);
  await p.close();
  // 3) offline
  await ctx.setOffline(true); p = await abre(); ok((await ver(p)) === v0 && await p.evaluate(() => document.getElementById('metasbox') !== null || document.body.innerText.length > 100), 'abre sem internet'); await p.close(); await ctx.setOffline(false);
  // 4) versão nova no servidor: abre ainda na antiga (rápido), detecta, baixa tudo junto e troca sozinho; cache antigo apagado; sem laço
  const novaV = '9.9.9'; fs.writeFileSync(path.join(tmp, 'js/nucleo.js'), fs.readFileSync(path.join(tmp, 'js/nucleo.js'), 'utf8').replace("VERSAO='" + v0 + "'", "VERSAO='" + novaV + "'"));
  fs.writeFileSync(path.join(tmp, 'js/tese.js'), fs.readFileSync(path.join(tmp, 'js/tese.js'), 'utf8') + '\n/* mudou */\nwindow.__TESE_NOVA=1;\n');
  pedidos = []; p = await ctx.newPage(); p.on('pageerror', e => er.push(e.message)); await p.goto(URL0); await p.waitForFunction(() => typeof BOOT !== 'undefined' && BOOT, null, { timeout: 15000 });
  ok((await ver(p)) === v0, 'versão nova no servidor: a abertura ainda usa a salva (' + v0 + ') e não espera a rede');
  let vf = ''; for (let i = 0; i < 40 && vf !== novaV; i++) { await new Promise(r => setTimeout(r, 500)); vf = await p.evaluate(() => typeof VERSAO !== 'undefined' ? VERSAO : '').catch(() => ''); }
  await p.waitForTimeout(800);
  ok((await ver(p)) === novaV, 'depois de ~4 s detectou e atualizou sozinha para ' + novaV);
  ok(await p.evaluate(() => window.__TESE_NOVA === 1), 'o arquivo alterado (tese.js) veio na versão nova, sem mistura');
  await p.waitForFunction(async () => (await caches.keys()).join() === 'aporte-v9.9.9', null, { timeout: 15000 }).catch(() => {});
  ok(await p.evaluate(async () => (await caches.keys()).join()) === 'aporte-v' + novaV, 'cache antigo apagado, só o da versão nova');
  const recargas = pedidos.filter(x => x === '/index.html' || x === '/').length;
  ok(recargas <= 3, 'sem laço de recarga (index pedido ' + recargas + ' vez(es))');
  await p.close();
  p = await abre(); ok((await ver(p)) === novaV, 'abertura seguinte já na versão nova, do cache'); await p.close();
  ok(er.length === 0, 'nenhum erro de página' + (er.length ? ': ' + er.join(' | ') : ''));
  await b.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true });
  if (falhas) { console.log('✗ Service worker:', falhas, 'falha(s)'); process.exit(1); } console.log('✓ Service worker: tudo certo');
})();
