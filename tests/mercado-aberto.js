/* Cenário "mercado aberto": segunda 23/11/2026, 14h (Brasília), com o Worker de cotações de verdade
 * (worker/worker.js do repositório de dados) falando com um Yahoo de mentira. Sem chave brapi, Finnhub
 * ou GitHub: tudo tem que vir pelo servidor próprio. Uso: node tests/mercado-aberto.js [caminho/worker.js]
 * (padrão: ../minha-carteira-dados/worker/worker.js) */
const path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
const { chromium } = require('playwright');
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
const WK = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'minha-carteira-dados', 'worker', 'worker.js'));
let falhas = 0, ok = 0;
const conf = (n, got, exp) => { const a = JSON.stringify(got), e = JSON.stringify(exp); if (a === e) { ok++; console.log('  ✓ ' + n); } else { falhas++; console.log('  ✗ ' + n + ': veio ' + a + ', esperado ' + e); } };
const NOW = Date.parse('2026-11-23T14:00:00-03:00') / 1000;

/* Yahoo de mentira: 5 min, ontem 10h-17h55 e hoje 10h até 13h55 (Brasília) */
function yahoo(sym, range) {
  const us = /^VT$/.test(sym), off = us ? -18000 : -10800, base = us ? 100 : 30, ts = [], c = [];
  const dia = (d0, h0, h1) => { for (let t = d0 + h0 * 3600; t < d0 + h1 * 3600; t += 300) ts.push(t); };
  const hoje = Date.parse('2026-11-23T00:00:00-03:00') / 1000, ontem = hoje - 86400 * 3; // sexta (feriado de 20/11 só vale pra B3; serve de dia anterior)
  if (us) { dia(Date.parse('2026-11-20T00:00:00Z') / 1000, 14.5, 21); dia(Date.parse('2026-11-23T00:00:00Z') / 1000, 14.5, 17); }
  else { dia(ontem, 10, 18); dia(hoje, 10, 14); }
  ts.forEach((t, i) => c.push(base + Math.sin(i / 7) + i * 0.01));
  const last = ts.filter(t => t <= NOW), n = last.length, prevIdx = ts.findIndex(t => t >= (us ? Date.parse('2026-11-23T00:00:00Z') / 1000 : hoje)) - 1;
  const o = { meta: { currency: 'BRL', gmtoffset: off, chartPreviousClose: c[prevIdx], regularMarketPrice: c[n - 1], regularMarketTime: last[n - 1] }, timestamp: last, indicators: { quote: [{ open: c.slice(0, n), high: c.slice(0, n).map(x => x + .05), low: c.slice(0, n).map(x => x - .05), close: c.slice(0, n) }] } };
  if (us) o.meta.currency = 'USD';
  if (range === '1d') { const k = last.findIndex(t => t >= (us ? Date.parse('2026-11-23T00:00:00Z') / 1000 : hoje)); o.timestamp = last.slice(k); o.indicators.quote[0] = { open: c.slice(k, n), high: c.slice(k, n).map(x => x + .05), low: c.slice(k, n).map(x => x - .05), close: c.slice(k, n) }; o.meta.chartPreviousClose = c[k - 1]; }
  return o;
}

(async () => {
  const worker = (await import(pathToFileURL(WK).href)).default;
  let chamadas = [];
  globalThis.fetch = async (u) => { const m = String(u).match(/chart\/([^?]+)\?range=(\w+)/); chamadas.push(u); if (!m) return { ok: false, status: 404, json: async () => ({}) }; return { ok: true, status: 200, json: async () => ({ chart: { result: [yahoo(decodeURIComponent(m[1]), m[2])] } }) }; };
  const b = await chromium.launch(), pg = await b.newPage(), erros = [];
  pg.on('pageerror', e => erros.push(String(e)));
  await pg.clock.setFixedTime(new Date(NOW * 1000));
  const vistos = [];
  await pg.route('**/*', async r => {
    const u = r.request().url();
    if (u.startsWith('file:')) return r.continue();
    if (/workers\.dev/.test(u)) {
      vistos.push(u); const p = new URL(u), resp = await worker.fetch(new Request('https://x.workers.dev' + p.pathname + p.search, { headers: { Origin: 'https://thiagoataide2003.github.io' } }));
      return r.fulfill({ status: resp.status, body: await resp.text(), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
    }
    return r.abort();
  });
  const ls = { 'minha-carteira-v1': JSON.stringify({ trades: [
    { id: 'a', date: '2025-01-10', ticker: 'ITUB4', market: 'BR', side: 'buy', qty: 100, price: 30, fx: 1 },
    { id: 'b', date: '2025-01-20', ticker: 'VT', market: 'US', side: 'buy', qty: 10, price: 100, fx: 5 }], fx: { rate: 5.5, src: 'manual' }, quotes: {}, keys: { proxy: 'https://aporte-teste.workers.dev' }, pend: [] }), 'minha-carteira-v1-tema': 'atual' };
  await pg.addInitScript(o => { window.__APORTE_TESTE__ = true; if (!sessionStorage.getItem('ok')) { localStorage.clear(); for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('ok', '1'); } }, ls);
  await pg.goto(APP); await pg.waitForFunction(() => window.__aporte, null, { timeout: 15000 });
  await pg.evaluate(() => { S.keys.brapi = ''; S.keys.finnhub = ''; S.keys.gh = ''; S.keys.proxy = 'https://aporte-teste.workers.dev'; save(); RF.last = 0; RF.busy = false; doRefresh(false); });
  await pg.waitForFunction(() => !RF.busy && RF.last > 0, null, { timeout: 15000 });
  const q = await pg.evaluate(() => ({ b3: mktOpen(), itub: S.quotes.ITUB4 && { p: +S.quotes.ITUB4.price.toFixed(2), prev: +S.quotes.ITUB4.prev.toFixed(2), min: Math.round((Date.now() - S.quotes.ITUB4.at) / 60000) }, vt: !!S.quotes.VT && S.quotes.VT.price > 0, err: RF.err || '' }));
  conf('B3 aberta às 14h', q.b3, true);
  conf('ITUB4 e VT vieram só pelo servidor (sem chave brapi/Finnhub)', [!!q.itub, q.vt, q.err.replace(/^Sem atualização para: dólar$/, '')], [true, true, '']);
  conf('cotação com horário real (5 min atrás, não "agora")', q.itub.min >= 4 && q.itub.min <= 6, true);
  /* página da ação: 1D com pontos de 5 min vindos do servidor, números do dia e horário */
  const e = await pg.evaluate(async () => {
    var d = [], t0 = Math.floor(Date.now() / 864e5) - 300, p = 30; for (var i = 0; i < 300; i++) { p += Math.sin(i / 9) * .6 + .02; d.push([t0 + i, +p.toFixed(2)]); } MD.d = { hist: { ITUB4: { d: d, w: d, last: d[299][1], name: 'Itaú', cur: 'BRL' } }, idx: {}, at: Date.now() };
    stkOpen('ITUB4'); for (var j = 0; j < 40 && !document.querySelector('[data-rng="1d"]'); j++) await new Promise(r => setTimeout(r, 100)); var b1 = document.querySelector('[data-rng="1d"]'); if (!b1) return { dbg: document.getElementById('stk-b').textContent.slice(0, 300) + '|' + document.getElementById('stk').className }; b1.click();
    for (var i = 0; i < 40 && !document.querySelector('#stk-b .gch svg'); i++) await new Promise(r => setTimeout(r, 100));
    var t = document.getElementById('stk-b').textContent;
    return { svg: document.querySelectorAll('#stk-b .gch svg').length, abre: /Abertura/.test(t), alta: /Alta/.test(t), fecha: /Fech\. ant\./.test(t), atras: /atrasado/.test(t), min: (t.match(/atualizado há (\d+|menos de 1) min/) || [])[0] || '' };
  });
  conf('1D carrega pelo servidor, com Abertura/Alta/Baixa/Fech. ant.', [e.svg, e.abre, e.alta, e.fecha], [1, true, true, true]);
  conf('preço de 5 min atrás NÃO aparece como atrasado', e.atras, false);
  /* 40 min depois, sem preço novo: tem que marcar atrasado; preço 10x o fechamento: tem que avisar */
  await pg.clock.setFixedTime(new Date((NOW + 40 * 60) * 1000));
  const a = await pg.evaluate(() => { stkClose(); stkOpen('ITUB4'); return /atrasado/.test(document.getElementById('stk-b').textContent); });
  conf('40 min sem cotação nova: marca "atrasado"', a, true);
  await pg.clock.setFixedTime(new Date(NOW * 1000));
  const s = await pg.evaluate(() => { stkClose(); S.quotes.ITUB4 = { price: 330, prev: 33, at: Date.now(), src: 'auto' }; MKT.q.ITUB4 = { price: 330, pct: 0, cur: 'BRL', at: Date.now() }; return !!livePx('ITUB4').sus; });
  conf('preço 10x o último fechamento é sinalizado como suspeito', s, true);
  /* painel de status e botão de tentar de novo */
  const t = await pg.evaluate(() => { showTab('mais'); try { document.querySelector('[data-sub="ajustes"]').click() } catch (x) {} var btn = document.querySelector('[data-retry]'); return { btn: !!btn, rot: /Usando o salvo|Funcionando|Aguardando|Com problema/.test(document.body.textContent) }; });
  conf('painel de status com botão "Tentar de novo agora"', t.btn, true);
  conf('chamadas ao Yahoo feitas só pelo Worker', [vistos.length > 0, chamadas.every(u => /query1\.finance\.yahoo\.com/.test(u))], [true, true]);
  if (erros.length) { falhas += erros.length; erros.forEach(x => console.log('  ✗ erro na página: ' + x)); }
  console.log(falhas ? '\n✗ ' + falhas + ' problema(s), ' + ok + ' certas' : '\n✓ Cenário de mercado aberto OK: ' + ok + ' conferências');
  await b.close(); process.exit(falhas ? 1 : 0);
})();
