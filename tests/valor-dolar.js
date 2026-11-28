/* Testes da 1.87.1: valor em US$ na lista Ativos (2ª linha do ativo dos EUA) e "Nos EUA: US$ X" no cabeçalho. Só exibição.
   Uso: node tests/valor-dolar.js | --mutantes | --gravar [--real-saida arq] (SÓ na árvore 1.87.0) | --real-antes arq (retrato real da 1.87.0, FORA do repositório) | --dados <pasta privada>
   Sintética: tickers inventados. Nada da carteira real vai para este repositório. */
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { chromium } = require('playwright');
const RAIZ = process.env.APORTE_APP_DIR || path.resolve(__dirname, '..'), APP = 'file://' + path.join(RAIZ, 'index.html'), arg = process.argv, val = k => arg.includes(k) ? arg[arg.indexOf(k) + 1] : null;
const DADOS = val('--dados') || (fs.existsSync('/home/claude/minha-carteira-dados/carteira.json') ? '/home/claude/minha-carteira-dados' : null), ESP = path.join(__dirname, 'esperado-valor-dolar.json');
const NOW = '2026-06-15T12:00:00-03:00', B = (id, tk, q, p, o) => Object.assign({ id, date: '2025-01-10', ticker: tk, market: 'BR', side: 'buy', qty: q, price: p, fx: 1 }, o || {});
const TR = [B('1', 'ABCD3', 100, 10), B('2', 'EFGH3', 50, 20), B('3', 'VTX', 10, 100, { market: 'US', fx: 5 }), B('4', 'BIGX', 1000, 900, { market: 'US', fx: 5 }), B('5', 'MILX', 1000, 1000, { market: 'US', fx: 5 }), B('6', 'SMLX', 2, 100, { market: 'US', fx: 5 })];
const QU = { ABCD3: 12, EFGH3: 18, VTX: 120, BIGX: 500, MILX: 1230, SMLX: 123.45 };
async function abrir(b, o) { o = o || {}; const pg = await b.newPage({ viewport: { width: 360, height: 780 } }); pg.__erros = []; pg.on('pageerror', e => pg.__erros.push(e.message));
  await pg.clock.setFixedTime(new Date(NOW)); await pg.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  const q = {}; Object.keys(QU).forEach(k => q[k] = { price: QU[k], src: 'manual' }); const ls = { 'minha-carteira-v1': JSON.stringify({ keys: { finnhub: '', brapi: '', gh: '', repo: '' }, pend: [], fx: { rate: 5.8, src: 'manual' }, quotes: q, trades: o.tr || TR }) };
  if (o.tema) ls['minha-carteira-v1-tema'] = o.tema;
  await pg.addInitScript(x => { window.__APORTE_TESTE__ = true; if (!sessionStorage.getItem('ok')) { localStorage.clear(); for (const k in x) localStorage.setItem(k, x[k]); sessionStorage.setItem('ok', '1'); } }, ls);
  await pg.goto(APP); await pg.waitForFunction(() => window.__aporte, null, { timeout: 15000 }); await pg.waitForTimeout(500);
  if (o.zoom) await pg.evaluate(z => { document.documentElement.style.zoom = z; }, o.zoom); if (o.larga) await pg.addStyleTag({ content: ".atv *{font-family:'DejaVu Sans',Verdana,sans-serif!important}" }); if (o.fonte) await pg.evaluate(f => { document.documentElement.style.fontSize = f; }, o.fonte); return pg; }
const SNAP = () => { const R = compute(), t = {}; Object.keys(R.tot).forEach(k => { if (typeof R.tot[k] === 'number' || R.tot[k] == null) t[k] = R.tot[k]; });
  showTab('ativos'); ATF = 'all'; render(); const sec = document.getElementById('positions'), rows = [...sec.querySelectorAll('.atr:not(.ahd)')];
  return { tot: t, held: R.held.map(x => x.p.ticker + ':' + x.p.qty + ':' + x.p.cN + ':' + x.v).sort(), closed: R.closed.map(x => (x.p || x).ticker).sort(), ls: Object.keys(localStorage).sort().join('|'),
    brRows: rows.filter(r => !/US\$/.test(r.textContent) && !r.querySelector('.avu')).map(r => r.outerHTML), aria: [...sec.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')), nhd: sec.querySelectorAll('.ahd').length, cols: [...sec.querySelectorAll('.ahd .ath')].map(e => e.textContent.trim()) }; };
const LER = () => { const sec = document.getElementById('positions'), R = compute(), us = R.held.filter(x => x.p.market === 'US').map(x => ({ tk: x.p.ticker, qty: x.p.qty, P1: x.P1, pm: x.p.cN / x.p.qty, v: x.v }));
  const rows = {}; [...sec.querySelectorAll('.atr:not(.ahd)')].forEach(r => { const a = r.querySelector('.a1'); rows[a.getAttribute('data-stk')] = { sm: [...a.querySelectorAll('.an small')].map(s => s.textContent.replace(/\s/g, ' ').trim()), ok: [...a.querySelectorAll('.an small')].slice(1).every(s => s.scrollWidth <= s.clientWidth), h: Math.round(r.getBoundingClientRect().height), vr: r.querySelector('.av:last-child').textContent }; });
  const dets = [...sec.querySelectorAll('.atv .grp .det')].map(e => e.textContent.trim()), perf = document.getElementById('perftab'), bal = [...perf.querySelectorAll('[data-bal]')].map(e => e.getAttribute('data-bal')).find(t => /você tem US\$/.test(t)) || '';
  var Wf = function () { var e = document.querySelector('.atv'); return e ? e.scrollWidth - e.clientWidth : 0; }, w1 = Wf(), du = [...document.querySelectorAll('.an small.du')]; du.forEach(function (e) { e.style.display = 'none'; }); var w0 = Wf(); du.forEach(function (e) { e.style.display = ''; });
  return { w1: w1, w0: w0, us: us, rows: rows, dets: dets, bal: bal, fx: R.tot.fxNow, txt: sec.textContent, w: w1 }; };
const mostrar = async (pg, f) => pg.evaluate(f => { showTab('ativos'); ATF = f; render(); return null; }, f || 'all');
const lerCom = async (pg, f) => { await mostrar(pg, f); await pg.evaluate(() => { showTab('ativos'); render(); }); return pg.evaluate(LER); };
const norm = s => String(s).replace(/\s/g, ' ').trim(), U = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' });
const fmt = v => norm(v < 1e3 ? U.format(v) : v < 1e5 ? 'US$ ' + (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : v < 999500 ? 'US$ ' + (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' mil' : 'US$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi');
const brN = s => { const m = String(s).replace(/\s/g, ' ').match(/([\d.]+,\d\d)/); return m ? parseFloat(m[1].replace(/\./g, '').replace(',', '.')) : NaN; };
const ig = (a, b, e) => Math.abs(a - b) <= (e == null ? 0.005 : e);
module.exports = { TR, QU, abrir, SNAP, LER, lerCom, mostrar, fmt, norm, brN, ig, RAIZ, DADOS, ESP, arg, val };
if (require.main === module) (async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  if (arg.includes('--gravar')) { const pg = await abrir(b); fs.writeFileSync(ESP, JSON.stringify({ sint: await pg.evaluate(SNAP) }, null, 1) + '\n'); console.log('gravado (só sintética):', ESP);
    if (val('--real-saida') && DADOS) { const { abrirReal } = require('./lib-real.js'), pr = await abrirReal(b, DADOS, { width: 400, height: 900 }); fs.writeFileSync(val('--real-saida'), JSON.stringify(await pr.evaluate(SNAP), null, 1)); console.log('real gravado FORA do repositório'); } await b.close(); return; }
  let falhas = 0, total = 0; const ok = (n, c, x) => { total++; if (!c) { falhas++; console.log('✗', n, x === undefined ? '' : JSON.stringify(x).slice(0, 600)); } };
  await require('./valor-dolar-checks.js')(b, ok, module.exports, __filename);
  console.log(falhas ? '✗ valor-dolar: ' + falhas + ' falha(s) de ' + total : '✓ Tudo certo: ' + total + ' conferências'); await b.close(); process.exit(falhas ? 1 : 0);
})();
