/* Testes da 1.87.0 "Resultado das vendas" (js/vendas-resultado.js + 4 campos aditivos em computeRaw: sN, sQ, sP, sC).
   Uso: node tests/vendas-resultado.js | --mutantes | --gravar (SÓ na árvore ANTERIOR, 1.86.1) | --dados <pasta privada>
   Só a carteira sintética (ações inventadas) vai para este repositório. A carteira real congelada NUNCA é gravada aqui:
   --gravar --real-saida /tmp/x.json guarda o retrato real FORA do repositório, para comparar antes × depois. */
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { chromium } = require('playwright');
const RAIZ = process.env.APORTE_APP_DIR || path.resolve(__dirname, '..'), APP = 'file://' + path.join(RAIZ, 'index.html');
const arg = process.argv, val = k => arg.includes(k) ? arg[arg.indexOf(k) + 1] : null;
const REALOUT = val('--real-saida'), DADOS = val('--dados') || (fs.existsSync('/home/claude/minha-carteira-dados/carteira.json') ? '/home/claude/minha-carteira-dados' : null), GRAVAR = arg.includes('--gravar'), ESP = path.join(__dirname, 'esperado-encerradas.json');
const NOW = '2026-06-15T12:00:00-03:00';
const T = (id, date, tk, side, qty, price, o) => Object.assign({ id, date, ticker: tk, market: 'BR', side, qty, price, fx: 1 }, o || {});
const SINT = [
  T('a1', '2025-01-10', 'ENCG3', 'buy', 100, 10), T('a2', '2025-02-10', 'ENCG3', 'sell', 100, 15, { taxa: 5 }), T('a3', '2025-02-11', 'ENCG3', 'div', 1, 30),
  T('b1', '2025-01-10', 'ENCP3', 'buy', 100, 20), T('b2', '2025-02-10', 'ENCP3', 'sell', 100, 15), T('b3', '2025-02-12', 'ENCP3', 'div', 1, 40),
  T('c1', '2025-01-10', 'MULT3', 'buy', 100, 30), T('c2', '2025-02-10', 'MULT3', 'sell', 50, 40), T('c3', '2025-03-10', 'MULT3', 'sell', 30, 20), T('c4', '2025-03-11', 'MULT3', 'div', 1, 100),
  T('d1', '2025-01-10', 'PARC3', 'buy', 100, 10), T('d2', '2025-01-20', 'PARC3', 'buy', 100, 20), T('d3', '2025-02-10', 'PARC3', 'sell', 80, 18),
  T('e1', '2025-01-10', 'PARP3', 'buy', 100, 10), T('e2', '2025-02-10', 'PARP3', 'sell', 20, 8),
  T('f1', '2025-01-10', 'USAX', 'buy', 10, 100, { market: 'US', fx: 5.0 }), T('f2', '2025-02-10', 'USAX', 'sell', 4, 120, { market: 'US', fx: 5.5 }),
  T('g1', '2025-01-10', 'CORT3', 'buy', 10, 10), T('g2', '2025-02-10', 'CORT3', 'sell', 15, 12),
  T('h1', '2025-01-10', 'SODV3', 'div', 1, 77),
  T('k1', '2025-01-10', 'KEEP3', 'buy', 50, 20, { taxa: 3 }), T('k2', '2025-01-12', 'KEEP3', 'div', 1, 12),
  { id: 'r1', date: '2025-03-01', ticker: 'CDB Banco X', market: 'RF', side: 'rf', qty: 1, price: 1000, pct: 100, isento: false, venc: '2027-03-01' }, { id: 'r2', date: '2025-05-01', ticker: 'CDB Banco X', market: 'RF', side: 'rfout', qty: 1, price: 1040, ref: 'r1' },
  { id: 'r3', date: '2025-03-01', ticker: 'LCI Y', market: 'RF', side: 'rf', qty: 1, price: 500, pct: 90, isento: true, venc: '2027-03-01' }];
const SEMV = SINT.filter(t => !['sell', 'rfout'].includes(t.side));
const QUOT = { MULT3: 25, PARC3: 22, PARP3: 7, USAX: 130, KEEP3: 21 };
async function abrir(b, trades, tema, vp, zoom) {
  const pg = await b.newPage({ viewport: vp || { width: 360, height: 780 } }); pg.__erros = []; pg.on('pageerror', e => pg.__erros.push(e.message));
  await pg.clock.setFixedTime(new Date(NOW)); await pg.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  const q = {}; Object.keys(QUOT).forEach(k => q[k] = { price: QUOT[k], src: 'manual' });
  const ls = { 'minha-carteira-v1': JSON.stringify({ keys: { finnhub: '', brapi: '', gh: '', repo: '' }, pend: [], fx: { rate: 5.8, src: 'manual' }, quotes: q, trades }) };
  if (tema) ls['minha-carteira-v1-tema'] = tema;
  await pg.addInitScript(o => { window.__APORTE_TESTE__ = true; if (!sessionStorage.getItem('ok')) { localStorage.clear(); for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('ok', '1'); } }, ls);
  await pg.goto(APP); await pg.waitForFunction(() => window.__aporte, null, { timeout: 15000 }); await pg.waitForTimeout(600);
  if (zoom) await pg.evaluate(z => { document.documentElement.style.zoom = z; }, zoom); return pg;
}
const SNAP = () => { const R = compute(), t = {}; Object.keys(R.tot).forEach(k => { if (typeof R.tot[k] === 'number' || R.tot[k] == null) t[k] = R.tot[k]; });
  const pos = {}; R.held.concat(R.closed).forEach(x => { const p = x.p || x; pos[p.ticker] = { qty: p.qty, cN: p.cN, cB: p.cB, rA: p.rA, rF: p.rF, div: p.div || 0 }; });
  return { tot: t, pos: pos, held: R.held.map(x => (x.p || x).ticker).sort(), closed: R.closed.map(x => (x.p || x).ticker).sort(), ls: Object.keys(localStorage).sort().join('|') }; };
async function abrirRealPg(b) { const { abrirReal } = require('./lib-real.js'); return abrirReal(b, DADOS, { width: 400, height: 900 }); }
module.exports = { SINT, SEMV, abrir, SNAP, abrirRealPg, DADOS, ESP, RAIZ, arg, NOW };
if (require.main === module) (async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  if (GRAVAR) {
    const pg = await abrir(b, SINT); fs.writeFileSync(ESP, JSON.stringify({ sint: await pg.evaluate(SNAP) }, null, 1) + '\n'); console.log('gravado (só sintética):', ESP);
    if (REALOUT && DADOS) { const pr = await abrirRealPg(b); fs.writeFileSync(REALOUT, JSON.stringify(await pr.evaluate(SNAP), null, 1)); console.log('real gravado FORA do repositório:', REALOUT); }
    await b.close(); return;
  }
  let falhas = 0, total = 0; const ok = (n, c, x) => { total++; if (!c) { falhas++; console.log('✗', n, x === undefined ? '' : JSON.stringify(x).slice(0, 700)); } };
  await require('./vendas-resultado-checks.js')(b, ok, module.exports, __filename);
  console.log(falhas ? '✗ vendas-resultado: ' + falhas + ' falha(s) de ' + total : '✓ Tudo certo: ' + total + ' conferências'); await b.close(); process.exit(falhas ? 1 : 0);
})();
