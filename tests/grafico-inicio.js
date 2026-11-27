/* Testes do "Início e Patrimônio abrem no 1D com a base certa" (G2, 1.83.5, js/inicio.js + vdCart em js/variacao.js).
   Patrimônio, Lucro, Valorização, Valor investido e Variação de hoje abrem no 1D (câmbio continua no 1A); o gráfico de hoje usa a MESMA base do cartão "Variação de hoje" (fechamento diário anterior), não o último ponto de 5 min de ontem;
   sem dado diário: nunca gráfico vazio nem dado inventado. Na 1.83.4 os casos G1 a G5 FALHAM. Tudo sintético (ALFA3, BETA3, GAMA3, USAX).
   Uso: node tests/grafico-inicio.js    --mutantes    --gravar (SÓ na árvore ANTERIOR, 1.83.4: fixa o que não pode mudar) */
const path = require('path'), fs = require('fs'), cp = require('child_process'), crypto = require('crypto');
const { chromium } = require('playwright');
const RAIZ = process.env.APORTE_APP_DIR || path.resolve(__dirname, '..'), APP = 'file://' + path.join(RAIZ, 'index.html');
const arg = process.argv, val = k => arg.includes(k) ? arg[arg.indexOf(k) + 1] : null;
const MUT = val('--mut'), GRAVAR = arg.includes('--gravar'), ESP = path.join(__dirname, 'esperado-grafico-inicio.json');
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra).slice(0, 700)); } };
const T = (hhmm, dia) => Date.parse((dia || '2026-11-27') + 'T' + hhmm + ':00-03:00');
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const MUTANTES = {
  'base-de-5-min-de-ontem': ['js/inicio.js', 'prev:ci?ci.c/(x.p.qty*f):(v.o&&v.o.prev)||v.hist[0].c', 'prev:(v.o&&v.o.prev)||v.hist[0].c'],
  'heroOpen-esquecido': ['js/inicio.js', "rng:k==='cam'?'1y':'1d'", "rng:k==='dia'?'1d':'1y'"],
  'cambio-abre-no-1d': ['js/inicio.js', "rng:k==='cam'?'1y':'1d'", "rng:'1d'"],
  'grava-o-periodo': ['js/inicio.js', "function heroOpen(k){", "function heroOpen(k){try{localStorage.setItem('aporte-periodo','1d')}catch(e){}"],
  'percentual-sobre-outra-base': ['js/inicio.js', 'ref>0?d/ref*100:null', 'ref>0?d/vl*100:null'],
  'ultimo-ponto-nao-e-o-preco': ['js/inicio.js', 'if(C){var te', 'if(false){var te'],
  'papel-sem-base-entra': ['js/inicio.js', 'else if(C&&!ci)nb++;', 'else if(false)nb++;'],
  'sem-aviso-de-papel-sem-base': ['js/inicio.js', "(nb?' Ações sem fechamento de ontem: '+nb+'.':'')", "''"],
  'sem-troca-para-1m': ['js/periodo.js', 'function pdAutoH(k){if(', 'function pdAutoH(k){if(true)return false;if('],
  'fora-do-pregao-nao-zera': ['js/variacao.js', 'c:dzero(us,q.at)?a:', 'c:'],
  'aceita-preco-nao-automatico': ['js/variacao.js', "||q.src!=='auto'", ''],
  'sinal-trocado': ['js/inicio.js', 'd=vl-ref,', 'd=ref-vl,'],
  'valor-investido-sem-troca': ['js/inicio.js', "if(v&&v.st==='none'&&pdAutoH('inv'))return heroRender();", ''],
};
const PRE = () => {
  window.__cfg = function (ts, trades, quotes, intra) { MD.d = { at: Date.now(), tape: { ts: ts / 1000, it: [] }, hist: {}, idx: {} }; S.quotes = quotes; S.trades = trades; S.watch = []; MKT.q = {}; MKT.idx = {}; TPTS = 0; if (typeof PXM !== 'undefined') PXM = {}; if (typeof PXI !== 'undefined') PXI = {}; STKC = {}; FIN = {}; Object.keys(intra || {}).forEach(function (s) { var a = intra[s], p = a.p; FIN['intra/' + s] = { d: p ? { p: p, prev: a.prev, off: -10800, ext: 0, at: p[p.length - 1][0], o: p[0][1], h: Math.max.apply(null, p.map(function (q) { return q[1]; })), l: Math.min.apply(null, p.map(function (q) { return q[1]; })) } : null, at: Date.now() }; }); render(); };
  window.__pts = function (dia, hh, n, v0, v1) { var t0 = Date.parse(dia + 'T' + hh + ':00Z') / 1000, o = []; for (var i = 0; i < n; i++) o.push([t0 + i * 300, v0 + (v1 - v0) * i / (n - 1)]); return o; };
  window.__txt = function () { var b = $('stk-b'); return b ? b.textContent.replace(/\s+/g, ' ') : ''; };
  window.__on = function () { var o = []; document.querySelectorAll('#stk-b .rng [data-rng]').forEach(function (b) { if (b.getAttribute('aria-pressed') === 'true') o.push(b.getAttribute('data-rng')); }); return o.join(','); };
  window.__svg = function () { return document.querySelectorAll('#stk-b .gch svg').length; };
  window.__cartao = function () { var e = document.querySelector('[data-hero="dia"]'); return e ? e.textContent.replace(/\s+/g, ' ') : ''; };
  window.__lsKeys = function () { return Object.keys(localStorage).sort().join('|'); };
  window.__fecha = function () { try { stkClose(); } catch (e) { } };
};
async function novo(b, quando, dia) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' }), p = await ctx.newPage(), erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await ctx.route(u => !/^(file|data):/.test(u.toString()), r => r.abort());
  await p.addInitScript(() => { window.__APORTE_TESTE__ = true; });
  await p.clock.setFixedTime(new Date(T(quando || '13:30', dia)));
  await p.goto(APP); await p.waitForFunction(() => window.__aporte); await p.waitForTimeout(900); await p.evaluate(PRE);
  p.__erros = erros; return p;
}
const sec = async (n, f) => { try { await f(); } catch (e) { ok('Bloco "' + n + '" não rodou: ' + String(e.message).split('\n')[0].slice(0, 160), false); } };
const TR = [{ id: 'a', side: 'buy', market: 'BR', ticker: 'ALFA3', date: '2026-06-01', qty: 100, price: 15, fx: 1, taxa: 0 }, { id: 'b', side: 'buy', market: 'BR', ticker: 'BETA3', date: '2026-06-01', qty: 50, price: 9, fx: 1, taxa: 0 }];
const NOW = () => Date.now();
async function principal(b) {
  const p = await novo(b, '13:30');
  const cfg = (extra) => p.evaluate(([ts, tr, ex]) => { var n = Date.now(), q = { ALFA3: { price: 17.82, prev: 16.54, at: n, src: 'auto' }, BETA3: { price: 10.5, prev: 10, at: n, src: 'auto' } };
    if (ex.sem) delete q.BETA3.prev; if (ex.man) q.BETA3.src = 'manual'; var i = { 'ALFA3.SA': { p: __pts('2026-11-27', '13:00', 18, 17, 17.7), prev: 16.30 }, 'BETA3.SA': { p: __pts('2026-11-27', '13:00', 18, 10.1, 10.4), prev: 9.9 }, 'BRL=X': { p: __pts('2026-11-27', '13:00', 18, 5.3, 5.4), prev: 5.3 } };
    if (ex.nopts) i = {}; if (ex.semBeta) { i['BETA3.SA'] = { p: null }; } __cfg(ts, tr, q, i); }, [T('13:30'), TR, extra || {}]);
  /* G1: os cinco abrem no 1D; câmbio continua no 1A */
  await sec('G1 abertura', async () => {
    await cfg(); const r = await p.evaluate(() => { var o = {}; ['pat', 'luc', 'val', 'inv', 'dia', 'cam'].forEach(function (k) { heroOpen(k); o[k] = STK.rng; __fecha(); }); return { o: o, ls: __lsKeys() }; });
    for (const k of ['pat', 'luc', 'val', 'inv', 'dia']) ok('G1 ' + k + ' abre no 1D', r.o[k] === '1d', r.o);
    ok('G1 câmbio continua abrindo no 1A', r.o.cam === '1y', r.o);
  });
  /* G2: a base é o fechamento diário do cartão (16,54 e 10), não o último ponto de 5 min de ontem (16,30 e 9,9): +R$ 153,00 sobre R$ 2.154,00 = +7,10% */
  await sec('G2 base', async () => {
    await cfg(); const r = await p.evaluate(() => { var c = __cartao(); heroOpen('dia'); var t = __txt(), on = __on(), sv = __svg(); __fecha(); heroOpen('pat'); var tp = __txt(); __fecha(); return { c: c, t: t, on: on, sv: sv, tp: tp, v: brl.format(153), pc: (7.10).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }; });
    ok('G2 variação de hoje do gráfico = R$ 153,00 (base do fechamento diário)', r.t.replace(/ /g, ' ').includes(r.v.replace(/ /g, ' ')), r);
    ok('G2 percentual do gráfico = 7,10%', r.t.includes(r.pc), r);
    ok('G2 abre no 1D com gráfico', /1d/.test(r.on) && r.sv === 1, r);
    ok('G2 Patrimônio no 1D mostra a mesma variação de hoje', r.tp.includes('153,00') && r.tp.includes(r.pc), r.tp);
    /* G3: igual ao cartão */
    ok('G3 valor e % do gráfico iguais aos do cartão "Variação de hoje"', r.c.replace(/ /g, ' ').includes(r.v.replace(/ /g, ' ')) && r.c.includes(r.pc), r.c);
  });
  /* G4: papel sem fechamento de ontem fica de fora e o aviso conta; papel sem pontos também; carteira vazia sem NaN */
  await sec('G4 sem base', async () => {
    await cfg({ sem: 1 }); const r = await p.evaluate(() => { heroOpen('dia'); var t = __txt(), c = __cartao(); __fecha(); return { t: t, c: c, v: brl.format(128) }; });
    ok('G4 papel sem fechamento de ontem: fora da soma (R$ 128,00) e aviso com a contagem', r.t.replace(/ /g, ' ').includes(r.v.replace(/ /g, ' ')) && /Ações sem fechamento de ontem: 1/.test(r.t) && !/NaN|undefined/.test(r.t), r);
    await cfg({ man: 1 }); const rm = await p.evaluate(() => { heroOpen('dia'); var t = __txt(); __fecha(); return t; });
    ok('G4 preço que não é automático fica fora, como no cartão (+R$ 128,00, aviso 1)', rm.includes('+128,00') && /Ações sem fechamento de ontem: 1/.test(rm), rm);
    await cfg({ semBeta: 1 }); const r2 = await p.evaluate(() => { heroOpen('dia'); var t = __txt(); __fecha(); return t; });
    ok('G4 papel sem pontos do dia: aviso "Ações sem pontos hoje: 1", sem NaN', /Ações sem pontos hoje: 1/.test(r2) && !/NaN|undefined/.test(r2), r2);
    await p.evaluate(([ts]) => { __cfg(ts, [], {}, {}); }, [T('13:30')]);
    const r3 = await p.evaluate(() => { var o = {}; ['pat', 'luc', 'val', 'inv', 'dia'].forEach(function (k) { try { heroOpen(k); o[k] = !/NaN|undefined/.test(__txt()); } catch (e) { o[k] = String(e); } __fecha(); }); return o; });
    ok('G4 carteira vazia: nenhum erro nem NaN', Object.values(r3).every(v => v === true), r3);
  });
  /* G5: sem pontos do dia nunca fica vazio: Patrimônio/Lucro/Valorização/Valor investido caem no 1M uma vez, com a linha; o cartão do dia mostra a mensagem do 1D */
  await sec('G5 sem pontos', async () => {
    await cfg({ nopts: 1 }); const r = await p.evaluate(() => { var o = {}; ['pat', 'luc', 'val'].forEach(function (k) { heroOpen(k); o[k] = { rng: STK.rng, sv: __svg(), nota: /Ainda sem negociações hoje; mostrando o último mês\./.test(__txt()), auto: STK.auto }; __fecha(); }); heroOpen('dia'); o.dia = { rng: STK.rng, t: __txt() }; __fecha();
      FIN['intra/BRL=X'] = { d: null, at: Date.now() }; heroOpen('inv'); o.inv = { rng: STK.rng, sv: __svg(), nota: /mostrando o último mês/.test(__txt()) }; __fecha(); return o; });
    for (const k of ['pat', 'luc', 'val']) ok('G5 ' + k + ' sem pontos do dia: abre no 1M com a linha e gráfico', r[k].rng === '1mo' && r[k].sv === 1 && r[k].nota && r[k].auto === 1, r[k]);
    ok('G5 Valor investido sem pontos do dólar: 1M com a linha e gráfico', r.inv.rng === '1mo' && r.inv.sv === 1 && r.inv.nota, r.inv);
    ok('G5 Variação de hoje sem pontos: fica no 1D com a mensagem (não inventa gráfico)', r.dia.rng === '1d' && /Ainda não há pontos/.test(r.dia.t), r.dia);
  });
  /* G6: fora do pregão (sábado) o resultado é o do cartão (zero) e o gráfico não quebra */
  await sec('G6 sábado', async () => {
    await p.clock.setFixedTime(new Date(T('10:00', '2026-11-28')));
    const r = await p.evaluate(([ts, tr]) => { var n = Date.parse('2026-11-27T17:00:00-03:00'), q = { ALFA3: { price: 17.82, prev: 16.54, at: n, src: 'auto' }, BETA3: { price: 10.5, prev: 10, at: n, src: 'auto' } };
      __cfg(ts, tr, q, { 'ALFA3.SA': { p: __pts('2026-11-27', '13:00', 18, 17, 17.82), prev: 16.30 }, 'BETA3.SA': { p: __pts('2026-11-27', '13:00', 18, 10.1, 10.5), prev: 9.9 } }); var c = __cartao(); heroOpen('dia'); var t = __txt(); __fecha(); return { c: c, t: t, z: brl.format(0) }; }, [T('10:00', '2026-11-28'), TR]);
    ok('G6 sábado: cartão e gráfico mostram a mesma variação (zero), sem NaN', r.c.replace(/ /g, ' ').includes(r.z.replace(/ /g, ' ')) && r.t.replace(/ /g, ' ').includes(r.z.replace(/ /g, ' ')) && !/NaN/.test(r.t), r);
    await p.clock.setFixedTime(new Date(T('13:30')));
  });
  /* G7: nada mais mudou: compute, cartões do Início, localStorage e S.quotes iguais antes e depois de abrir os gráficos; e iguais à 1.83.4 (snapshot) */
  await sec('G7 nada mais mudou', async () => {
    await cfg(); const r = await p.evaluate(() => { var a = { c: JSON.stringify(compute()), q: JSON.stringify(S.quotes), ls: __lsKeys(), ini: document.querySelector('[data-tab="resumo"]').innerHTML.replace(/skg\d+/g, 'skg') };
      var ch = [], sv = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { ch.push(k); return sv.apply(this, arguments); }; ['pat', 'luc', 'val', 'inv', 'dia', 'cam'].forEach(function (k) { heroOpen(k); __fecha(); }); Storage.prototype.setItem = sv; a.gravou = ch.join(','); render();
      var d = { c: JSON.stringify(compute()), q: JSON.stringify(S.quotes), ls: __lsKeys(), ini: document.querySelector('[data-tab="resumo"]').innerHTML.replace(/skg\d+/g, 'skg') }; return { a: a, d: d }; });
    ok('G7 compute() igual antes e depois de abrir os gráficos', r.a.c === r.d.c, 1); ok('G7 S.quotes igual', r.a.q === r.d.q, 1); ok('G7 abrir os gráficos não grava nada no localStorage (não lembra o período)', r.a.ls === r.d.ls && r.a.gravou === '', [r.a.ls, r.d.ls, r.a.gravou]);
    const res = { compute: sha(r.d.c), quotes: sha(r.d.q), inicio: sha(r.d.ini) };
    if (GRAVAR) { fs.writeFileSync(ESP, JSON.stringify(res, null, 1) + '\n'); console.log('gravado', ESP); }
    else if (fs.existsSync(ESP)) { const e = JSON.parse(fs.readFileSync(ESP, 'utf8')); ok('G7 compute() idêntico à 1.83.4', res.compute === e.compute, [res, e]); ok('G7 S.quotes idêntico à 1.83.4', res.quotes === e.quotes, 1); ok('G7 tela do Início (cartões) idêntica à 1.83.4', res.inicio === e.inicio, 1); }
    else ok('snapshot tests/esperado-grafico-inicio.json existe', false);
  });
  ok('sem erro de JavaScript na página', p.__erros.length === 0, p.__erros);
  await p.context().close();
}
(async () => {
  if (arg.includes('--mutantes')) {
    let fraco = 0; const nomes = Object.keys(MUTANTES);
    nomes.forEach(n => {
      const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mutg-')), [f, a, b2] = MUTANTES[n];
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
  console.log(falhas ? '✗ Gráfico do Início: ' + falhas + ' falha(s) de ' + total : '✓ Gráfico do Início: ' + total + ' conferências ok'); process.exit(falhas ? 1 : 0);
})();
