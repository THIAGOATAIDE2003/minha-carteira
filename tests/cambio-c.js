/* Testes da entrega C do câmbio (1.83.7): o cartão "Câmbio" do Início (efeito do dólar de hoje no VT) usa a MESMA base da faixa (17h do dia útil anterior, js/cambio.js) e não mais S.fx.prev.
   Mais os reforços B2 da auditoria da A: feriado longo, 21h–24h, 5D, preço zero, refazer a faixa. Na 1.83.6 os casos C1 a C4 FALHAM. Dados sintéticos (dólar 5,7413 → 5,5445).
   Uso: node tests/cambio-c.js    --mutantes    --gravar (SÓ na árvore ANTERIOR, 1.83.6) */
const path = require('path'), fs = require('fs'), cp = require('child_process'), crypto = require('crypto');
const { chromium } = require('playwright');
const RAIZ = process.env.APORTE_APP_DIR || path.resolve(__dirname, '..'), APP = 'file://' + path.join(RAIZ, 'index.html');
const arg = process.argv, val = k => arg.includes(k) ? arg[arg.indexOf(k) + 1] : null;
const MUT = val('--mut'), GRAVAR = arg.includes('--gravar'), ESP = path.join(__dirname, 'esperado-cambio-c.json');
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra).slice(0, 700)); } };
const T = (dia, hhmm) => Date.parse(dia + 'T' + hhmm + ':00-03:00');
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const MUTANTES = {
  'cartao-volta-ao-S.fx.prev': ['js/inicio.js', 'cc.pct==null?0:cc.base', 'cc.pct==null?0:S.fx.prev'],
  'cartao-sem-base-cai-no-prev': ['js/inicio.js', 'cc.pct==null?0:', 'cc.pct==null?S.fx.prev:'],
  'cartao-parado-nao-zera': ['js/inicio.js', 'cc.pct===0?fxr:', 'cc.pct===0?cc.base:'],
  'cartao-aceita-dolar-manual': ['js/inicio.js', "cc&&S.fx&&S.fx.src==='auto'?", 'cc&&S.fx?'],
  'cartao-mexe-no-S.fx': ['js/inicio.js', "cc=fxr&&cxVar('usd',fxr),", "cc=fxr&&cxVar('usd',fxr),zz=(S.fx.prev=1),"],
  'cartao-sinal-trocado': ['js/inicio.js', 'dc=fp&&fxr?vUh*(fxr-fp)', 'dc=fp&&fxr?vUh*(fp-fxr)'],
  'cartao-pct-sobre-outra-base': ['js/inicio.js', 'pct(fxr/fp-1)', 'pct(fxr/S.fx.prev-1)'],
  'faixa-nao-se-refaz': ['js/cambio.js', 'then(function(){render()})', 'then(function(){})'],
  'feriado-longo-corta-a-busca': ['js/cambio.js', 'i<10&&', 'i<3&&'],
  'data-em-utc-ate-meia-noite': ['js/cambio.js', 'n=(now||Date.now())-10800000', 'n=(now||Date.now())'],
  'cinco-dias-usa-a-base-do-1d': ['js/cambio.js', "if(rg!=='1d'||rate", 'if(rate'],
  'preco-zero-vira-menos-100': ['js/cambio.js', 'if(!s||!(pr>0))return null;', 'if(!s)return null;'],
};
const PRE = () => {
  /* pts: [[ 'AAAA-MM-DD', 'HH:MM', preço ], ...] em Brasília */
  window.__arq = function (sym, pts, prev) { var p = pts.map(function (q) { return [Date.parse(q[0] + 'T' + q[1] + ':00-03:00') / 1000, q[2]]; }); FIN['intra/' + sym] = { d: { p: p, prev: prev || p[0][1], off: 0, ext: 0, at: p[p.length - 1][0], o: p[0][1], h: 9, l: 1, cur: 'BRL' }, at: Date.now() }; };
  window.__cfg = function (ts, dolar, euro, d0, e0) { MD.d = { at: Date.now(), tape: { ts: ts / 1000, it: [['DÓLAR', dolar, d0, 'BRL', 'i', 'usd'], ['EURO', euro, e0, 'BRL', 'i', 'eur'], ['LIBRA', 7.0, 7.1, 'BRL', 'i', 'gbp'], ['IBOV', 181443.75, 176800, 'BRL', 'i', 'ibov'], ['OURO', 4100, 4050, 'USD', 'c', '']] }, hist: {}, idx: {} };
    S.trades = []; S.watch = []; S.quotes = {}; MKT.q = {}; MKT.idx = {}; TPTS = 0; if (typeof PXM !== 'undefined') PXM = {}; if (typeof PXI !== 'undefined') PXI = {}; STKC = {}; S.fx = { rate: dolar, prev: d0 * 1.1, src: 'auto', at: Date.now() }; MKT.idx.eur = { v: euro, p: -9.99 }; };
  window.__nums = function () { var o = {}, it = tapeItems(); it.forEach(function (x) { if (x.l === 'DÓLAR' || x.l === 'EURO') o['faixa' + x.l] = x.p; }); o.cartaoUsd = idxVal(idxDef('usd')).p; o.cartaoEur = idxVal(idxDef('eur')).p; o.hasD = it.some(function (x) { return x.l === 'DÓLAR'; }); return o; };
  window.__pag = function (k, sym) { var r = [[20780, 5.9], [20783, 5.8]]; MD.d.idx[k] = { d: r, w: r, name: k, cur: 'BRL', last: 5.8, sym: sym }; window.loadMD = function () { }; idxOpen(k); STK.rng = '1d'; idxRender(); var t = document.getElementById('stk-b').textContent.replace(/\s+/g, ' '); return t; };
  window.__fecha = function () { try { stkClose(); } catch (e) { } };
  window.__txt = function () { var b = document.getElementById('stk-b'); return b ? b.textContent.replace(/\s+/g, ' ') : ''; };
};
async function novo(b, dia, hhmm) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' }), p = await ctx.newPage(), erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await ctx.route(u => !/^(file|data):/.test(u.toString()), r => r.abort());
  await p.addInitScript(() => { window.__APORTE_TESTE__ = true; });
  await p.clock.setFixedTime(new Date(T(dia, hhmm)));
  await p.goto(APP); await p.waitForFunction(() => window.__aporte); await p.waitForTimeout(900); await p.evaluate(PRE);
  p.__erros = erros; return p;
}
const sec = async (n, f) => { try { await f(); } catch (e) { ok('Bloco "' + n + '" não rodou: ' + String(e.message).split('\n')[0].slice(0, 160), false); } };
/* 26/11 (dólar 5,7413 às 17:00; depois da notícia 5,6925 às 17:30 e 5,6513 às 18:30) e 27/11 até 11:30 */
const USD = [['2026-11-25', '17:00', 5.8163], ['2026-11-26', '09:00', 5.80], ['2026-11-26', '16:00', 5.7550], ['2026-11-26', '17:00', 5.7413], ['2026-11-26', '17:30', 5.6925], ['2026-11-26', '18:30', 5.6513], ['2026-11-27', '09:00', 5.60], ['2026-11-27', '11:30', 5.5445]];
const EUR = [['2026-11-25', '17:00', 6.3838], ['2026-11-26', '16:00', 6.3200], ['2026-11-26', '17:00', 6.3014], ['2026-11-26', '17:30', 6.2500], ['2026-11-26', '18:30', 6.1981], ['2026-11-27', '09:00', 6.12], ['2026-11-27', '11:30', 6.0675]];
const pct = (a, b) => (a / b - 1) * 100, perto = (a, b) => a != null && Math.abs(a - b) < 0.01;
const PRE2 = () => {
  window.__vt = function (ts, dolar) { MD.d = { at: Date.now(), tape: { ts: ts / 1000, it: [['DÓLAR', dolar, 5.8219, 'BRL', 'i', 'usd'], ['EURO', 6.0675, 6.3816, 'BRL', 'i', 'eur'], ['LIBRA', 7.0, 7.1, 'BRL', 'i', 'gbp'], ['IBOV', 181443.75, 176800, 'BRL', 'i', 'ibov'], ['OURO', 4100, 4050, 'USD', 'c', '']] }, hist: {}, idx: {} };
    S.trades = [{ id: 'v', side: 'buy', market: 'US', ticker: 'VT', date: '2026-06-01', qty: 10, price: 100, fx: 5, taxa: 0 }]; S.watch = []; S.quotes = { VT: { price: 110, prev: 109, at: Date.now(), src: 'auto' } }; MKT.q = {}; MKT.idx = {}; TPTS = 0; if (typeof PXM !== 'undefined') PXM = {}; if (typeof PXI !== 'undefined') PXI = {}; STKC = {};
    S.fx = { rate: dolar, prev: 5.9, src: 'auto', at: Date.now() }; render(); };
  window.__cartaoCam = function () { var e = document.querySelector('[data-hero="cam"]'), c = e && e.closest('.hc'); return c ? c.textContent.replace(/\s+/g, ' ') : ''; };
};
async function principal(b) {
  const p = await novo(b, '2026-11-27', '11:33'); await p.evaluate(PRE2);
  const arq = () => p.evaluate(([U, E]) => { __arq('BRL=X', U, 5.6513); __arq('EURBRL=X', E, 6.2008); }, [USD, EUR]);
  await sec('C1', async () => {
    await p.evaluate(([ts]) => __vt(ts, 5.5445), [T('2026-11-27', '11:33')]); await arq(); await p.evaluate(() => render());
    const r = await p.evaluate(() => ({ c: __cartaoCam(), f: __nums().faixaDÓLAR }));
    ok('C1 cartão Câmbio do Início: −3,43% (igual à faixa)', /3,43%/.test(r.c) && /▼/.test(r.c) && perto(r.f, pct(5.5445, 5.7413)), r);
    ok('C2 efeito em reais = US$ 1.100 × (5,5445 − 5,7413) = −R$ 216,48', /216,48/.test(r.c), r.c);
    const r2 = await p.evaluate(() => { S.fx.prev = 1.234; render(); return __cartaoCam(); });
    ok('C3 S.fx.prev (AwesomeAPI) arbitrário não muda o cartão', /3,43%/.test(r2) && /216,48/.test(r2), r2);
    const r3 = await p.evaluate(() => { FIN['intra/BRL=X'] = { d: null, at: Date.now() }; S.fx.prev = 5.9; render(); return __cartaoCam(); });
    ok('C4 sem base: cartão Câmbio mostra "—" (sem valor, sem %, sem NaN, sem a conta antiga)', /—/.test(r3) && !/3,43|NaN|undefined|\d,\d\d%/.test(r3.split('Dólar agora')[0]), r3);
    const r4 = await p.evaluate(() => { __arq('BRL=X', [['2026-11-26', '17:00', 5.7413], ['2026-11-27', '11:30', 5.5445]]); S.fx.src = 'manual'; render(); return __cartaoCam(); });
    ok('C4 dólar digitado à mão (não automático): "—", como antes', /—/.test(r4.split('Dólar agora')[0]), r4);
    await p.evaluate(() => { S.fx.src = 'auto'; });
  });
  await sec('C5 parado', async () => {
    await p.clock.setFixedTime(new Date(T('2026-11-28', '10:00')));
    await p.evaluate(([ts]) => __vt(ts, 5.5445), [T('2026-11-28', '10:00')]); await p.evaluate(() => { __arq('BRL=X', [['2026-11-27', '17:00', 5.70], ['2026-11-27', '23:00', 5.5445]]); render(); });
    const r = await p.evaluate(() => __cartaoCam()), a = r.split('Dólar agora')[0];
    ok('C5 sábado: cartão Câmbio com 0,00%, sem seta', /0,00%/.test(a) && !/[▼▲]/.test(a), r);
    await p.clock.setFixedTime(new Date(T('2026-11-27', '11:33')));
  });
  await sec('B2 feriado longo', async () => {
    await p.clock.setFixedTime(new Date(T('2026-02-18', '10:00')));
    const r = await p.evaluate(() => { __cfg(Date.parse('2026-02-18T10:00:00-03:00') / 1000, 5.10, 6.0, 5.0, 6.0); __arq('BRL=X', [['2026-02-12', '17:00', 5.30], ['2026-02-13', '16:50', 5.19], ['2026-02-13', '17:00', 5.20], ['2026-02-13', '18:00', 5.15], ['2026-02-16', '12:00', 5.18], ['2026-02-17', '17:00', 5.17], ['2026-02-18', '10:00', 5.10]]); return __nums(); });
    ok('B2 Carnaval (seg e ter sem pregão): quarta usa a sexta 13/02 às 17:00 (5,20) → −1,92%', perto(r.faixaDÓLAR, pct(5.10, 5.20)) && perto(r.cartaoUsd, pct(5.10, 5.20)), r);
  });
  await sec('B2 21h–24h', async () => {
    for (const hh of ['21:10', '22:30', '23:55']) {
      await p.clock.setFixedTime(new Date(T('2026-11-26', hh)));
      const r = await p.evaluate((h) => { __cfg(Date.parse('2026-11-26T' + h + ':00-03:00') / 1000, 5.60, 6.0, 5.5, 6.0); __arq('BRL=X', [['2026-11-25', '17:00', 5.80], ['2026-11-25', '18:00', 5.70], ['2026-11-26', '17:00', 5.74], ['2026-11-26', h, 5.60]]); return __nums(); }, hh);
      ok('B2 ' + hh + ' de quinta: base = quarta 25/11 17:00 (5,80) → −3,45%', perto(r.faixaDÓLAR, pct(5.60, 5.80)) && perto(r.cartaoUsd, pct(5.60, 5.80)), [hh, r]);
    }
    await p.clock.setFixedTime(new Date(T('2026-11-27', '11:33')));
  });
  await sec('B2 5D', async () => {
    await p.evaluate(([ts]) => { __cfg(ts, 5.5445, 6.0675, 5.8219, 6.3816); }, [T('2026-11-27', '11:33')]); await arq();
    const r = await p.evaluate(() => { var r = [[20780, 5.9], [20783, 5.8]]; MD.d.idx.usd = { d: r, w: r, name: 'usd', cur: 'BRL', last: 5.8, sym: 'BRL=X' }; window.loadMD = function () { }; idxOpen('usd'); STK.rng = '5d'; idxRender(); var t = __txt(), s = document.querySelectorAll('#stk-b .gch svg').length; __fecha(); return { t: t, s: s }; });
    ok('B2 página do dólar em 5D: desenha, sem NaN e sem a linha "fechamento anterior" do 1D', r.s === 1 && !/NaN|undefined/.test(r.t) && !/fechamento anterior: R\$ 5,7413/.test(r.t), [r.s, r.t.slice(0, 200)]);
  });
  await sec('B2 preço zero', async () => {
    const r = await p.evaluate(([ts]) => { __vt(ts, 0); __arq('BRL=X', [['2026-11-26', '17:00', 5.7413], ['2026-11-27', '11:30', 5.5445]]); S.fx.rate = 0; var o = { er: null }; try { render(); o.t = tapeItems().filter(function (x) { return x.l === 'DÓLAR'; }).length; o.card = idxVal(idxDef('usd')); o.z = [cxVar('usd', 0), cxVar('eur', -1)]; o.c = __cartaoCam(); } catch (e) { o.er = String(e); } return o; }, [T('2026-11-27', '11:33')]);
    ok('B2 preço zero: sem erro, sem NaN, sem −100%', r.er === null && r.z[0] === null && r.z[1] === null && !/NaN|-100|−100/.test(JSON.stringify(r)) && (r.card == null || r.card.p == null), r);
  });
  await sec('B2 refazer a faixa', async () => {
    const r = await p.evaluate(async ([ts, U, E]) => { __cfg(ts, 5.5445, 6.0675, 5.8219, 6.3816); FIN = {}; var g = window.finGet; window.finGet = function (k, s) { return new Promise(function (res) { setTimeout(function () { __arq(s, s === 'BRL=X' ? U : E, 5.6); res(FIN[k + '/' + s].d); }, 80); }); }; CXT = {}; renderTape(); var antes = document.getElementById('tape').textContent; await new Promise(function (r) { setTimeout(r, 400); }); var depois = document.getElementById('tape').textContent; window.finGet = g; return { antes: antes.slice(0, 160), depois: depois.slice(0, 200) }; }, [T('2026-11-27', '11:33'), USD, EUR]);
    ok('B2 faixa: antes só o preço do dólar; depois que os arquivos chegam aparece −3,43%', !/DÓLAR\s*R\$ 5,5445\s*▼/.test(r.antes) && /DÓLAR\s*R\$ 5,5445\s*▼\s*3,43%/.test(r.depois), r);
  });
  await sec('C6', async () => {
    await p.evaluate(([ts]) => __vt(ts, 5.5445), [T('2026-11-27', '11:33')]); await arq();
    const r = await p.evaluate(() => { render(); var h = document.querySelector('[data-tab="resumo"]').innerHTML.replace(/skg\d+/g, 'skg'), e = document.querySelector('[data-hero="cam"]'), c = e && e.closest('.hc'), ch = c ? c.innerHTML.replace(/skg\d+/g, 'skg') : ''; var sem = ch ? h.replace(ch, '') : h;
      return { compute: JSON.stringify(compute()), fx: JSON.stringify(S.fx), quotes: JSON.stringify(S.quotes), semCam: sem, ls: Object.keys(localStorage).sort().join('|'), fora: JSON.stringify(tapeItems().map(function (x) { return [x.l, x.v, x.p]; })) }; });
    const res = { compute: sha(r.compute), fx: sha(r.fx), quotes: sha(r.quotes), inicioSemCartaoCambio: sha(r.semCam), ls: sha(r.ls), faixa: sha(r.fora) };
    if (GRAVAR) { fs.writeFileSync(ESP, JSON.stringify(res, null, 1) + '\n'); console.log('gravado', ESP); }
    else if (fs.existsSync(ESP)) { const e = JSON.parse(fs.readFileSync(ESP, 'utf8')); Object.keys(e).forEach(k => ok('C6 ' + k + ' idêntico à 1.83.6', res[k] === e[k], [k, res[k], e[k]])); }
    else ok('snapshot tests/esperado-cambio-c.json existe', false);
  });
  ok('sem erro de JavaScript na página', p.__erros.length === 0, p.__erros);
  await p.context().close();
}
(async () => {
  if (arg.includes('--mutantes')) {
    let fraco = 0; const nomes = Object.keys(MUTANTES);
    nomes.forEach(n => {
      const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mutcc-')), [f, a, b2] = MUTANTES[n];
      cp.execSync('tar --exclude=node_modules --exclude=.git -cf - . | tar -xf - -C ' + tmp, { cwd: RAIZ, shell: '/bin/bash' }); try { fs.symlinkSync(path.join(RAIZ, 'node_modules'), path.join(tmp, 'node_modules')); } catch (e) { }
      const tx = fs.readFileSync(path.join(tmp, f), 'utf8'); if (!tx.includes(a)) { console.log('✗ trecho do defeito não achado:', n); fraco++; return; } fs.writeFileSync(path.join(tmp, f), tx.replace(a, () => b2));
      const r = cp.spawnSync('node', [__filename], { encoding: 'utf8', cwd: RAIZ, timeout: 300000, env: Object.assign({}, process.env, { APORTE_APP_DIR: tmp }) });
      const saida = (r.stdout || '') + (r.stderr || ''), quebrou = r.status !== 0, qual = (saida.match(/^✗ .{0,80}/gm) || []).slice(0, 2).join(' | ');
      console.log((quebrou ? '✓ pego   ' : '✗ ESCAPOU') + ' ' + n + (quebrou ? '  → ' + qual : '')); if (!quebrou) fraco++;
    });
    console.log(fraco ? '✗ ' + fraco + ' defeito(s) escaparam dos testes' : '✓ Todos os ' + nomes.length + ' defeitos inseridos foram pegos pelos testes'); process.exit(fraco ? 1 : 0);
  }
  const b = await chromium.launch();
  try { await principal(b); } catch (e) { falhas++; console.log('✗ erro no teste:', e.message); }
  await b.close();
  console.log(falhas ? '✗ Câmbio: ' + falhas + ' falha(s) de ' + total : '✓ Câmbio: ' + total + ' conferências ok'); process.exit(falhas ? 1 : 0);
})();
