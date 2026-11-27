/* Testes da "variação do câmbio com uma base só" (entrega A, 1.83.6, js/cambio.js): dólar e euro mostram o MESMO valor na faixa, no cartão do Mercado, na página (1D, "Fech. ant.") e no gráfico do Início;
   base = último ponto de 5 min até 17:00 (Brasília) do último dia útil anterior. Na 1.83.5 K1, K2, K3, K4, K5 e K9 FALHAM. Dados sintéticos com os números de 26→27/11 (dólar 5,7413 → 5,5445; euro 6,3014 → 6,0675).
   Uso: node tests/cambio.js    --mutantes    --gravar (SÓ na árvore ANTERIOR, 1.83.5: fixa o que não pode mudar) */
const path = require('path'), fs = require('fs'), cp = require('child_process'), crypto = require('crypto');
const { chromium } = require('playwright');
const RAIZ = process.env.APORTE_APP_DIR || path.resolve(__dirname, '..'), APP = 'file://' + path.join(RAIZ, 'index.html');
const arg = process.argv, val = k => arg.includes(k) ? arg[arg.indexOf(k) + 1] : null;
const MUT = val('--mut'), GRAVAR = arg.includes('--gravar'), ESP = path.join(__dirname, 'esperado-cambio.json');
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra).slice(0, 700)); } };
const T = (dia, hhmm) => Date.parse(dia + 'T' + hhmm + ':00-03:00');
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const MUTANTES = {
  'faixa-volta-ao-S.fx.prev': ['js/atualizacao.js', 'if(cxK(l))p=cxTape(l,v);', ''],
  'base-e-o-prev-do-arquivo': ['js/cambio.js', 'return bm>=960&&isFinite(b)?b:null}', 'return c.d.prev>0?c.d.prev:null}'],
  'ponto-depois-das-17h': ['js/cambio.js', 'm<=1020', 'm<=1110'],
  'ignora-feriado': ['js/cambio.js', '!bDay(new Date(d))', 'new Date(d).getUTCDay()%6===0'],
  'fuso-errado': ['js/cambio.js', 'l=p[i][0]-10800;', 'l=p[i][0];'],
  'aceita-ponto-velho': ['js/cambio.js', 'bm>=960', 'bm>=0'],
  'esquece-o-euro': ['js/cambio.js', "s==='EURBRL=X'||s==='eur'||s==='EURO'?'EURBRL=X':''", "''"],
  'inclui-a-libra': ['js/cambio.js', "?'EURBRL=X':''}", "?'EURBRL=X':s==='LIBRA'?'GBPBRL=X':''}"],
  'mexe-no-S.fx': ['js/cambio.js', 'if(!s||!(pr>0))return null;', 'if(!s||!(pr>0))return null;if(S.fx)S.fx.prev=1;'],
  'grafico-do-inicio-esquecido': ['js/inicio.js', "var prev=rg==='1d'?cxBase('BRL=X'):v.hist[0].c;", "var prev=rg==='1d'&&v.o&&v.o.prev?v.o.prev:v.hist[0].c;"],
  'fech-ant-da-pagina-antigo': ['js/cambio.js', 'ant:v.base}', 'ant:fo.prev}'],
  'cartao-com-outro-preco': ['js/mercado.js', "cxVar('usd',f0.rate)", "cxVar('usd',f0.rate*1.01)"],
  'sem-base-cai-no-pctChange': ['js/cambio.js', ':{pct:null,abs:null,base:null}}', ':{pct:S.fx&&S.fx.prev?(pr/S.fx.prev-1)*100:null,abs:null,base:null}}'],
  'parado-nao-zera': ['js/cambio.js', 'if(fxParado())return {pct:0', 'if(false)return {pct:0'],
  'prefetch-sem-limite': ['js/cambio.js', '<240000)return', '<0)return'],
  'euro-do-cartao-esquecido': ['js/mercado.js', "if(ce)pk={v:pk.v,p:ce.pct,at:pk.at};", ''],
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
async function principal(b) {
  const p = await novo(b, '2026-11-27', '11:33');
  const base = (arqs) => p.evaluate(([ts, U, E, hh]) => { __cfg(ts, 5.5445, 6.0675, 5.8219, 6.3816); __arq('BRL=X', U, 5.6513); __arq('EURBRL=X', E, 6.2008); return null; }, [T('2026-11-27', '11:33'), USD, EUR]);
  /* K1/K5: faixa = cartão = página; "Fech. ant." */
  await sec('K1', async () => {
    await base(); const r = await p.evaluate(() => { var o = __nums(); o.pagU = __pag('usd', 'BRL=X'); __fecha(); o.pagE = __pag('eur', 'EURBRL=X'); __fecha(); return o; });
    const eu = pct(5.5445, 5.7413), ee = pct(6.0675, 6.3014), pg = t => { var m = t.match(/\((\d+,\d+)%\)\s*([↑↓])/); return m ? (m[2] === '↓' ? -1 : 1) * parseFloat(m[1].replace(',', '.')) : null; };
    ok('K1 dólar: faixa = cartão = página = −3,43%', perto(r.faixaDÓLAR, eu) && perto(r.cartaoUsd, eu) && perto(pg(r.pagU), eu), [r.faixaDÓLAR, r.cartaoUsd, pg(r.pagU), eu]);
    ok('K1 euro: faixa = cartão = página = −3,71%', perto(r.faixaEURO, ee) && perto(r.cartaoEur, ee) && perto(pg(r.pagE), ee), [r.faixaEURO, r.cartaoEur, pg(r.pagE), ee]);
    ok('K5 "Fech. ant." e a linha pontilhada do dólar 5,7413 e do euro 6,3014', /fechamento anterior: R\$ 5,7413/.test(r.pagU) && /Fech\. ant\.5,74/.test(r.pagU) && /fechamento anterior: R\$ 6,3014/.test(r.pagE) && /Fech\. ant\.6,30/.test(r.pagE), [r.pagU.slice(0, 300), r.pagE.slice(0, 300)]);
    /* K3/K4: barra diária atrasada, S.fx.prev e pctChange não mudam o resultado */
    const r2 = await p.evaluate(() => { __cfg(Date.parse('2026-11-27T11:33:00-03:00') / 1000, 5.5445, 6.0675, 2.0, 9.0); S.fx.prev = 1.234; MKT.idx.eur = { v: 6.0675, p: 55 }; MD.d.hist.usd = { d: [[20782, 1], [20783, 2]] }; return __nums(); });
    ok('K3/K4 base antiga (barra diária, S.fx.prev, pctChange) não muda o número', perto(r2.faixaDÓLAR, eu) && perto(r2.cartaoUsd, eu) && perto(r2.faixaEURO, ee) && perto(r2.cartaoEur, ee), r2);
  });
  /* K2: segunda-feira usa a sexta às 17h; depois de feriado, o último dia útil */
  await sec('K2', async () => {
    await p.clock.setFixedTime(new Date(T('2026-11-30', '10:00')));
    const r = await p.evaluate(() => { __cfg(Date.parse('2026-11-30T10:00:00-03:00') / 1000, 5.60, 6.0, 5.5, 6.0); __arq('BRL=X', [['2026-11-26', '17:00', 5.9], ['2026-11-27', '16:30', 5.69], ['2026-11-27', '17:00', 5.70], ['2026-11-27', '17:30', 5.50], ['2026-11-30', '10:00', 5.60]]); __arq('EURBRL=X', [['2026-11-27', '17:00', 6.5], ['2026-11-30', '10:00', 6.0]]); return __nums(); });
    ok('K2 segunda-feira: base = sexta 17:00 (5,70) → −1,75% (não 17:30 nem quinta)', perto(r.faixaDÓLAR, pct(5.60, 5.70)) && perto(r.cartaoUsd, pct(5.60, 5.70)), r);
    await p.clock.setFixedTime(new Date(T('2026-06-05', '10:00')));
    const f = await p.evaluate(() => { __cfg(Date.parse('2026-06-05T10:00:00-03:00') / 1000, 5.40, 6.0, 5.5, 6.0); __arq('BRL=X', [['2026-06-02', '17:00', 5.80], ['2026-06-03', '17:00', 5.60], ['2026-06-04', '17:00', 5.99], ['2026-06-05', '10:00', 5.40]]); return __nums(); });
    ok('K2 depois de feriado (Corpus Christi, quinta 04/06): base = quarta 17:00 (5,60) → −3,57%', perto(f.faixaDÓLAR, pct(5.40, 5.60)) && perto(f.cartaoUsd, pct(5.40, 5.60)), f);
  });
  /* K6: sem base → só o preço, sem NaN, sem recorrer às bases antigas */
  await sec('K6', async () => {
    await p.clock.setFixedTime(new Date(T('2026-11-27', '11:33')));
    const sem = async (cena) => p.evaluate(([c, U]) => { __cfg(Date.parse('2026-11-27T11:33:00-03:00') / 1000, 5.5445, 6.0675, 5.8219, 6.3816);
      if (c === 'nada') { FIN['intra/BRL=X'] = { d: null, at: Date.now() }; FIN['intra/EURBRL=X'] = { d: null, at: Date.now() }; }
      if (c === 'velho') { __arq('BRL=X', [['2026-11-26', '14:00', 5.80], ['2026-11-26', '15:30', 5.78], ['2026-11-27', '10:00', 5.58], ['2026-11-27', '11:00', 5.56], ['2026-11-27', '11:30', 5.5445]]); __arq('EURBRL=X', [['2026-11-26', '12:00', 6.3], ['2026-11-27', '11:30', 6.0675]]); }
      var o = __nums(); var t = tapeItems().filter(function (x) { return x.l === 'DÓLAR'; })[0]; o.item = t ? tapeIn(t) : null; if (c === 'velho') { o.pag = __pag('usd', 'BRL=X'); __fecha(); }
      STK = { tk: '', hero: 'cam', rng: '1d', d: null, cv: 'usd' }; $('stk').hidden = false; var er = null; try { heroRender(); } catch (e) { er = String(e); } o.hero = er || 'ok'; __fecha(); return o; }, [cena]);
    for (const c of ['nada', 'velho']) { const r = await sem(c);
      ok('K6 sem base (' + c + '): faixa e cartão sem percentual (null), só o preço', r.faixaDÓLAR === null && r.faixaEURO === null && r.cartaoUsd == null && r.cartaoEur == null && r.hasD, r);
      ok('K6 sem base (' + c + '): texto da faixa com o preço e sem % nem NaN', r.item && /5,5445/.test(r.item[0]) && r.item[2] === '' && !/NaN|undefined/.test(JSON.stringify(r.item)), r.item);
      ok('K6 sem base (' + c + '): gráfico do câmbio abre sem erro', r.hero === 'ok', r.hero);
      if (c === 'velho') ok('K6 página: "Variação de hoje indisponível", sem NaN', /Variação de hoje indisponível/.test(r.pag) && !/NaN|undefined/.test(r.pag), r.pag.slice(0, 200)); }
  });
  /* K7: mercado de câmbio parado (sábado) → 0,00% */
  await sec('K7', async () => {
    await p.clock.setFixedTime(new Date(T('2026-11-28', '10:00')));
    const r = await p.evaluate(() => { __cfg(Date.parse('2026-11-28T10:00:00-03:00') / 1000, 5.5445, 6.0675, 5.8219, 6.3816); __arq('BRL=X', [['2026-11-27', '17:00', 5.70], ['2026-11-27', '23:00', 5.5445]]); __arq('EURBRL=X', [['2026-11-27', '17:00', 6.3], ['2026-11-27', '23:00', 6.0675]]); return __nums(); });
    ok('K7 sábado: dólar e euro 0,00% na faixa e no cartão (como antes)', r.faixaDÓLAR === 0 && r.faixaEURO === 0 && r.cartaoUsd === 0 && r.cartaoEur === 0, r);
    await p.clock.setFixedTime(new Date(T('2026-11-27', '11:33')));
  });
  /* K8: heroCam 1D usa a mesma base */
  await sec('K8 gráfico do Início', async () => {
    await base(); const r = await p.evaluate(() => { var o = {}; ['usd', 'luc'].forEach(function (cv) { STK = { tk: '', hero: 'cam', rng: '1d', d: null, cv: cv }; $('stk').hidden = false; heroRender(); o[cv] = __txt(); __fecha(); }); return o; });
    ok('K8 gráfico do dólar no Início: −3,43% (mesma base) e linha em 5,7413', /\(3,43%\)\s*↓/.test(r.usd) && /R\$ 5,7413/.test(r.usd), r.usd.slice(0, 220));
  });
  /* K10: o arquivo é pedido uma vez só (sem laço) */
  await sec('K10 prefetch', async () => {
    const n = await p.evaluate(async () => { var c = 0, g = window.finGet; window.finGet = function (k, s) { c++; return Promise.resolve(null); }; CXT = {}; for (var i = 0; i < 5; i++) renderTape(); await new Promise(function (r) { setTimeout(r, 300) }); window.finGet = g; return c; });
    ok('K10 5 desenhos da faixa pedem os 2 arquivos uma vez só (sem laço)', n === 2, n);
  });
  /* K9: nada mais mudou: fora do escopo, compute, S.fx e localStorage; igual à 1.83.5 */
  await sec('K9', async () => {
    await base(); const r = await p.evaluate(() => { render(); var it = tapeItems().filter(function (x) { return x.l !== 'DÓLAR' && x.l !== 'EURO'; }).map(function (x) { return [x.l, x.v, x.p]; });
      return { fora: JSON.stringify(it), fx: JSON.stringify(S.fx), ibov: JSON.stringify(idxVal(idxDef('ibov'))), gbp: JSON.stringify(idxVal(idxDef('gbp'))), compute: JSON.stringify(compute()), ls: Object.keys(localStorage).sort().join('|') }; });
    const res = { fora: sha(r.fora), fx: sha(r.fx), ibov: sha(r.ibov), gbp: sha(r.gbp), compute: sha(r.compute), ls: sha(r.ls) };
    if (GRAVAR) { fs.writeFileSync(ESP, JSON.stringify(res, null, 1) + '\n'); console.log('gravado', ESP); }
    else if (fs.existsSync(ESP)) { const e = JSON.parse(fs.readFileSync(ESP, 'utf8')); Object.keys(e).forEach(k => ok('K9 ' + k + ' idêntico à 1.83.5', res[k] === e[k], [k, res[k], e[k]])); }
    else ok('snapshot tests/esperado-cambio.json existe', false);
  });
  ok('sem erro de JavaScript na página', p.__erros.length === 0, p.__erros);
  await p.context().close();
}
(async () => {
  if (arg.includes('--mutantes')) {
    let fraco = 0; const nomes = Object.keys(MUTANTES);
    nomes.forEach(n => {
      const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mutc-')), [f, a, b2] = MUTANTES[n];
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
