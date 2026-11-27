/* Testes do preço único com a hora do mercado (js/precos.js, 1.82.0, E1).
   Uso: node tests/precos.js [--dados ../minha-carteira-dados]   (sem a pasta de dados roda só a parte sintética)
        node tests/precos.js --mutantes                           (insere defeitos de propósito: cada um tem de fazer algum teste falhar)
   Parte sintética: papéis e números inventados (nada real). Parte real: lê a pasta privada só localmente.
   Os casos A, A' e B reproduzem o "topo × ação": a faixa preta e a página da ação mostrando preços diferentes. Na 1.81.0 eles FALHAM. */
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { chromium } = require('playwright');
const { abrirReal } = require('./lib-real');
const RAIZ = process.env.APORTE_APP_DIR || path.resolve(__dirname, '..'), APP = 'file://' + path.join(RAIZ, 'index.html');
const arg = process.argv, val = k => arg.includes(k) ? arg[arg.indexOf(k) + 1] : null;
const DADOS = path.resolve(val('--dados') || path.join(RAIZ, '..', 'minha-carteira-dados'));
const TEM_DADOS = fs.existsSync(path.join(DADOS, 'mercado.json')) && !arg.includes('--sem-dados');
const MUT = val('--mut') || process.env.APORTE_MUT || null;
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra).slice(0, 500)); } };
const T = (hhmm, dia) => Date.parse((dia || '2026-11-26') + 'T' + hhmm + ':00-03:00');
/* defeitos de propósito: [arquivo, trecho certo, trecho com defeito] */
const MUTANTES = {
  'pagina-carimba-hora-da-busca': ['js/acao-valor.js', 'd.at=d.t>0&&d.t<=Date.now()?d.t:Date.now()', 'd.at=Date.now()'],
  'sem-desconto-da-hora-estimada': ['js/precos.js', 'var PXEST=15*60000', 'var PXEST=0'],
  'sem-fechamento-anterior-emprestado': ['js/precos.js', 'if(r.pct==null||!isFinite(r.pct)){var pv=0;', 'if(0){var pv=0;'],
  'preco-velho-vence': ['js/precos.js', "(a.fase==='velho'?b:a)", "(a.fase==='velho'?a:b)"],
  'sem-limite-de-20-min': ['js/precos.js', 'var PXAGE=20*60000', 'var PXAGE=99*60000'],
  'pagina-nao-grava-o-que-buscou': ['js/acao-valor.js', "if(d.price>0&&!/^\\^/.test(tk)){var m0=MKT.q[tk];pxPut(", "if(d.price>0&&!/^\\^/.test(tk)){var m0=MKT.q[tk];if(0)pxPut("],
  'hora-no-futuro-aceita': ['js/precos.js', 'function pxT(i){var n=Date.now();return i.t>n+120000?n:i.t}', 'function pxT(i){return i.t}'],
  'variacao-do-dia-sem-dzero': ['js/precos.js', "tk.charAt(0)!=='^'&&dzero(!isBR(tk),r.at))", "tk.charAt(0)!=='^'&&0)"],
  'faixa-sem-situacao-do-preco': ['js/atualizacao.js', "fs=lv&&lv.fase||'';", "fs='';"],
  'lote-brapi-hora-da-busca': ['js/atualizacao.js', 'tb>0&&tb<=Date.now()?tb:Date.now(),!(tb>0))', 'Date.now(),false)'],
  'mais-velho-sobrescreve-no-mercado': ['js/precos.js', 'if(cur&&cur.price>0&&pxEff(pxInfo(tk,cur.price,cur.at))>pxEff(ni))return false;', ''],
  'carteira-nao-acompanha': ['js/precos.js', "var s=S.quotes[tk];if(s&&s.src==='auto'", "var s=S.quotes[tk];if(0&&s&&s.src==='auto'"],
  'robo-compara-hora-da-busca': ['js/mercado-setores.js', "if(pxEff(pxInfo(l,q.price,q.at))<=at-PXEST){pxPut", "if((q.at||0)<at){pxPut"],
  'pagina-sem-fonte-e-hora': ['js/precos.js', "return (v?' · '+v:'')+(f==='fechamento'", "return (f==='fechamento'"],
  'pagina-sem-icone-de-explicacao': ['js/acao-pagina.js', "(lv1&&lv1.at?'<p class=\"small\" style=\"margin:-4px 0 6px\">'+bal(", "(0?'<p class=\"small\" style=\"margin:-4px 0 6px\">'+bal("],
  'formato-guardado-muda': ['js/precos.js', "MKT.q[tk]={price:pr,pct:q.pct,cur:q.cur,name:q.name||'',at:q.at||t||Date.now()};", "MKT.q[tk]={price:pr,pct:q.pct,cur:q.cur,name:q.name||'',at:q.at||t||Date.now(),via:via};"],
  'arquivo-fora-do-cache': ['sw.js', "'js/precos.js',", ''],
  'finnhub-fora-da-carteira-grava-direto': ['js/atualizacao.js', "pxPut(o.tk,'M',{price:d.c,pct:pc,cur:'USD',name:m0&&m0.name||'',at:now},'finnhub',d.t>0&&d.t*1000<=now?d.t*1000:now,!(d.t>0))}", "MKT.q[o.tk]={price:d.c,pct:pc,cur:'USD',name:m0&&m0.name||'',at:now}}"],
  'sem-aviso-duas-fontes': ['js/precos.js', "Math.abs(a.p/b.p-1)>.05&&Math.abs(a.at-b.at)<30*60000", 'false']
};
const PRE = () => {
  window.IT = function (l, v, p) { return [l, v, p, 'BRL', 's', '']; };
  window.__R = function (it, ts) { MD.d = { at: Date.now(), tape: { ts: ts / 1000, it: it }, hist: {} }; S.quotes = {}; S.trades = []; S.watch = []; MKT.q = {}; MKT.idx = {}; TPTS = 0; if (typeof PXM !== 'undefined') PXM = {}; STKC = {}; STK = { tk: '', rng: '1y', d: null, busy: false, err: '' }; };
  window.__B = function (map) { window.__net = { map: map, log: [] }; getJSON = function (u) { __net.log.push(u); for (var k in __net.map) if (u.indexOf(k) >= 0) return Promise.resolve(JSON.parse(JSON.stringify(__net.map[k]))); return Promise.reject(new Error('sem rede')); }; };
  window.__brapi = function (price, prev, iso, pct) { return { results: [{ regularMarketPrice: price, regularMarketPreviousClose: prev, regularMarketChangePercent: pct == null ? 0.5 : pct, regularMarketTime: iso, longName: 'Empresa', historicalDataPrice: [{ date: 1730000000, close: prev }, { date: 1732000000, close: price }] }] }; };
  window.__faixa = function (tk) { var x = tapeItems().filter(function (i) { return i.l === tk; })[0]; return x ? { v: Math.round(x.v * 100) / 100, p: Math.round(x.p * 100) / 100, fs: x.fs } : null; };
  window.__pag = async function (tk) { stkOpen(tk); for (var i = 0; i < 60 && (STK.busy || !STK.d); i++) await new Promise(function (r) { setTimeout(r, 50); }); var tx = $('stk-b') ? $('stk-b').textContent : ''; return { preco: STK.d && Math.round(STK.d.price * 100) / 100, pct: STK.d && STK.d.pct != null ? Math.round(STK.d.pct * 100) / 100 : null, txt: tx, err: STK.err }; };
};

async function sintetico(b) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' }), p = await ctx.newPage(), erros = [], rede = [];
  p.on('pageerror', e => erros.push(e.message)); p.on('request', r => { if (!/^(file|data):/.test(r.url()) && /brapi|finnhub|workers\.dev|yahoo/.test(r.url())) rede.push(r.url()); });
  await ctx.route(u => !/^(file|data):/.test(u.toString()), r => r.abort());
  await p.addInitScript(() => { window.__APORTE_TESTE__ = true; });
  await p.clock.setFixedTime(new Date(T('14:30')));
  await p.goto(APP); await p.waitForFunction(() => window.__aporte); await p.waitForTimeout(900); await p.evaluate(PRE);
  const E = (fn, a) => p.evaluate(fn, a);
  const sec = async (n, f) => { try { await f(); } catch (e) { ok('Bloco "' + n + '" não rodou: ' + String(e.message).split('\n')[0].slice(0, 110), false); } };
  const hora = async hhmm => p.clock.setFixedTime(new Date(T(hhmm)));
  /* ---------- T1.1 caso A: ação sem histórico no robô; a página busca na brapi (hora real 14:03) e a faixa tem o robô (rodada 14:22) ---------- */
  await sec('T1.1 caso A: ação sem histórico no robô; a página busca na b', async () => {
  await hora('14:30');
  await E(([ts]) => { __R([['IBOV', 176000, 170000, 'BRL', 'i', 'ibov'], IT('ALFA3', 58.73, 57.5)], ts); __B({ 'brapi.dev': __brapi(58.2, 57.5, '2026-11-26T14:03:00-03:00', 1.2) }); S.keys.brapi = 'k'; tapeMerge(); }, [T('14:22')]);
  const A = await E(async () => { const f = __faixa('ALFA3'), pg = await __pag('ALFA3'); return { f, pg, mq: MKT.q.ALFA3 && MKT.q.ALFA3.price, pick: livePx('ALFA3') }; });
  ok('T1.1 caso A: faixa e página mostram o MESMO preço (robô 58,73 das 14:22 × brapi 58,20 das 14:03)', A.f && A.pg && A.f.v === A.pg.preco, A);
  ok('T1.1 caso A: o preço único é o mais novo pela hora do mercado (robô 58,73)', A.f && A.f.v === 58.73 && A.pg.preco === 58.73 && /58,73/.test(A.pg.txt) && !/58,20/.test(A.pg.txt), A);
  });
  /* ---------- T1.2 caso A': a página buscou às 14:50 um preço da brapi das 14:03; o robô trouxe 59,10 às 14:45 ---------- */
  await sec('T1.2 caso A: a página buscou às 14:50 um preço da brapi das', async () => {
  await hora('14:50');
  await E(([ts]) => { __R([['IBOV', 176000, 170000, 'BRL', 'i', 'ibov'], IT('ALFA3', 59.1, 57.5)], ts); __B({ 'brapi.dev': __brapi(58.2, 57.5, '2026-11-26T14:03:00-03:00', 1.2) }); S.keys.brapi = 'k'; tapeMerge(); }, [T('14:45')]);
  const A2 = await E(async () => { const pg = await __pag('ALFA3'); return { f: __faixa('ALFA3'), pg }; });
  ok("T1.2 caso A': a página buscada às 14:50 (dado das 14:03) não ganha do robô das 14:45: os dois mostram 59,10", A2.f && A2.f.v === 59.1 && A2.pg.preco === 59.1, A2);
  });
  /* ---------- T1.3 caso B: preço do app sem fechamento anterior (prev nulo) ---------- */
  await sec('T1.3 caso B: preço do app sem fechamento anterior (prev nulo', async () => {
  await hora('14:30');
  const B = await E(async ([ts, ta]) => { __R([['IBOV', 176000, 170000, 'BRL', 'i', 'ibov'], IT('BETA3', 43.19, 42)], ts); __B({ 'brapi.dev': __brapi(43.0, 42, '2026-11-26T14:25:00-03:00', 2.38) }); S.keys.brapi = 'k';
      S.quotes.BETA3 = { price: 43.0, prev: null, at: ta, src: 'auto' }; tapeMerge(); const f0 = __faixa('BETA3'), pg = await __pag('BETA3'), f = __faixa('BETA3'), pk = livePx('BETA3'); return { f0, f, pg, pk }; }, [T('14:22'), T('14:25')]);
  ok('T1.3 caso B: sem fechamento anterior no app, a faixa (antes e depois de abrir a página) e a página mostram o mesmo preço', B.f && B.f0 && B.f0.v === B.pg.preco && B.f.v === B.pg.preco, B);
  ok('T1.3 caso B: a variação do dia vem do fechamento anterior (43,00 sobre 42,00 = +2,38%) na faixa, antes e depois, e na página', B.pk && Math.abs(B.f0.p - 2.38) < 0.01 && Math.abs(B.f.p - 2.38) < 0.01 && Math.abs(B.pg.pct - 2.38) < 0.01, B);
  });
  /* ---------- T1.4 / T1.5 hora do mercado nas atualizações em lote (carteira) ---------- */
  await sec('T1.4 T1.5 hora do mercado nas atualizações em lote (carteira', async () => {
  await hora('14:30');
  const L = await E(async ([ts1, ts2]) => {
    __R([['IBOV', 176000, 170000, 'BRL', 'i', 'ibov'], IT('DELT3', 20.0, 19.8), IT('EPSI3', 41.9, 41.9)], ts1);
    S.trades = [{ id: 'a', side: 'buy', market: 'BR', ticker: 'DELT3', date: '2026-06-01', qty: 10, price: 18, fx: 1, taxa: 0 }, { id: 'b', side: 'buy', market: 'BR', ticker: 'EPSI3', date: '2026-06-01', qty: 10, price: 40, fx: 1, taxa: 0 }];
    S.keys.brapi = 'k'; __B({ 'economia.awesomeapi': { USDBRL: { bid: '5.40', pctChange: '0.1' } }, 'quote/DELT3': __brapi(20.1, 19.8, '2026-11-26T14:03:00-03:00', 1.5), 'quote/EPSI3': __brapi(42.1, 41.9, '2026-11-26T13:40:00-03:00', 0.5) });
    doRefresh(false); for (let i = 0; i < 80 && RF.busy; i++) await new Promise(r => setTimeout(r, 50));
    const a1 = { d: livePx('DELT3'), e: livePx('EPSI3'), qd: S.quotes.DELT3 && S.quotes.DELT3.at, ks: Object.keys(S.quotes.DELT3).sort().join() };
    MD.d.tape = { ts: ts2 / 1000, it: [['IBOV', 176000, 170000, 'BRL', 'i', 'ibov'], IT('DELT3', 20.4, 19.8), IT('EPSI3', 42.5, 41.9)] }; tapeMerge();
    return { antes: { dp: a1.d && a1.d.p, dat: a1.d && a1.d.at, via: a1.d && a1.d.via, ep: a1.e && a1.e.p, eat: a1.e && a1.e.at, qat: a1.qd, ks: a1.ks }, dep: { dp: livePx('DELT3').p, ep: livePx('EPSI3').p }, cart: { d: getQuote('DELT3').price, e: getQuote('EPSI3').price }, faixa: { d: __faixa('DELT3').v, e: __faixa('EPSI3').v }, okc: RF.okc };
  }, [T('13:50'), T('14:22')]);
  ok('T1.4 atualização em lote (brapi): a hora que vale é a do negócio (14:03), não a da busca (14:30)', L.antes.dat === T('14:03') && L.antes.via === 'brapi', L);
  ok('T1.4 a cotação guardada mantém o formato e o ritmo de sempre (hora da busca em at; só price, prev, at, src)', L.antes.qat === T('14:30') && L.antes.ks === 'at,prev,price,src', L);
  ok('T1.5 fonte atrasada carimbada "agora" (brapi das 13:40 buscada às 14:30): vale pela hora do negócio, e o robô das 14:22 passa por cima dela', L.antes.ep === 42.1 && L.antes.eat === T('13:40') && L.dep.ep === 42.5 && L.cart.e === 42.5 && L.faixa.e === 42.5, L);
  ok('T1.5 robô das 14:22 passa a brapi das 14:03 (20,40 em vez de 20,10), e a carteira acompanha', L.dep.dp === 20.4 && L.cart.d === 20.4 && L.faixa.d === 20.4, L);
  });
  /* ---------- T1.7 carteira = faixa = página (papel da carteira, página busca algo mais novo) ---------- */
  await sec('T1.7 carteira = faixa = página (papel da carteira, página bu', async () => {
  await hora('14:31');
  const C = await E(async () => { __B({ 'brapi.dev': __brapi(20.55, 19.8, '2026-11-26T14:29:00-03:00', 3.8) }); const pg = await __pag('DELT3'); return { pg: pg.preco, cart: getQuote('DELT3').price, faixa: __faixa('DELT3').v, pick: livePx('DELT3').p }; });
  ok('T1.7 papel da carteira: página, faixa, carteira e preço único são o mesmo número (20,55)', C.pg === 20.55 && C.cart === 20.55 && C.faixa === 20.55 && C.pick === 20.55, C);
  });
  /* ---------- T1.6 fase do preço ---------- */
  await sec('T1.6 fase do preço', async () => {
  const F = async (hhmm, dia, fn) => { await hora(hhmm); p.clock.setFixedTime(new Date(T(hhmm, dia))); return E(fn); };
  await p.clock.setFixedTime(new Date(T('14:30')));
  const f1 = await E(([a, b]) => ({ vivo: pxFase('ALFA3', a), atras: pxFase('ALFA3', b) }), [T('14:20'), T('14:05')]);
  ok('T1.6 pregão aberto: 10 min = ao-vivo; 25 min = atrasado', f1.vivo === 'ao-vivo' && f1.atras === 'atrasado', f1);
  await p.clock.setFixedTime(new Date(T('08:55')));
  const f2 = await E(([a, b, c]) => ({ fech: pxFase('ALFA3', a), velho: pxFase('ALFA3', b), fech2: pxFase('ALFA3', c) }), [T('17:58', '2026-11-25'), T('15:35', '2026-11-24'), T('06:17')]);
  ok('T1.6 antes do pregão: fechamento de ontem e rodada da manhã = fechamento; meio de pregão de anteontem = velho', f2.fech === 'fechamento' && f2.velho === 'velho' && f2.fech2 === 'fechamento', f2);
  await p.clock.setFixedTime(new Date(T('11:30', '2026-11-24')));
  const f3 = await E(() => ({ us: pxFase('VT', Date.now() - 5 * 60000), usv: pxFase('VT', Date.now() - 3 * 864e5) }));
  ok('T1.6 EUA: cotação de 5 min em pregão aberto = ao-vivo (11h30 em Brasília é 9h30 em Nova York); de 3 dias atrás = atrasado', f3.us === 'ao-vivo' && f3.usv === 'atrasado', f3);
  await p.clock.setFixedTime(new Date(T('08:55')));
  const f4 = await E(() => ({ ontem: pxFase('VT', Date.parse('2026-11-25T18:55:00-03:00')), meio: pxFase('VT', Date.parse('2026-11-24T15:35:00-03:00')) }));
  ok('T1.6 EUA fechado: fechamento da véspera = fechamento; meio de pregão de anteontem = velho', f4.ontem === 'fechamento' && f4.meio === 'velho', f4);
  });
  await sec('T1.6b preço velho não vence o fechamento', async () => {
    await p.clock.setFixedTime(new Date(T('08:55')));
    const W = await E(([ts, tv, tf]) => { __R([IT('NEWO3', 10, 9)], ts); PXM = {}; S.quotes.NEWO3 = { price: 10.5, prev: 10, at: tv, src: 'auto' }; PXM.NEWO3 = { p: 10.5, t: tv, via: 'brapi', est: false };
      MKT.q.NEWO3 = { price: 10.2, pct: 2, cur: 'BRL', name: '', at: tf }; PXM.NEWO3m = 0; PXM.NEWO3 = { p: 10.5, t: tv, via: 'brapi', est: false }; var r = livePx('NEWO3'); return { p: r && r.p, fa: r && r.fase, fv: pxFase('NEWO3', tv), ff: pxFase('NEWO3', tf) }; }, [T('17:55', '2026-11-25'), T('17:44', '2026-11-25'), T('17:55', '2026-11-25')]);
    ok('T1.6b meio de pregão de ontem (velho) não vence o fechamento, mesmo com hora de mercado maior', W.fv === 'velho' && W.ff === 'fechamento' && W.p === 10.2, W);
  });
  await sec('T1.15 Finnhub das ações dos EUA fora da carteira', async () => {
    await hora('14:30');
    const F = await E(async ([ts, t1, t2]) => { __R([['IBOV', 176000, 170000, 'BRL', 'i', 'ibov'], ['VT', 100.5, 99, 'USD', 's', '']], ts); S.watch = ['VT']; S.keys.finnhub = 'k'; tapeMerge();
      __B({ 'finnhub.io': { c: 101.2, dp: 2.2, pc: 99, t: t1 / 1000 } }); await usRefresh(compute()); const a = livePx('VT'), fa = __faixa('VT');
      __B({ 'finnhub.io': { c: 101.9, dp: 2.9, pc: 99, t: t2 / 1000 } }); await usRefresh(compute()); const b = livePx('VT');
      return { a: a && a.p, fa: fa && fa.v, b: b && b.p, via: b && b.via, ks: Object.keys(MKT.q.VT).sort().join() }; }, [T('14:22'), T('14:03'), T('14:28')]);
    ok('T1.15 Finnhub com negócio das 14:03 buscado às 14:30 NÃO passa por cima do robô das 14:22 (ficam 100,50 na página e na faixa)', F.a === 100.5 && F.fa === 100.5, F);
    ok('T1.15 Finnhub com negócio das 14:28 passa o robô (101,90, fonte finnhub) e o formato guardado não muda', F.b === 101.9 && F.via === 'finnhub' && F.ks === 'at,cur,name,pct,price', F);
  });
  /* ---------- hora no futuro, variação do dia zerada, preço velho, fonte etiquetada ---------- */
  await sec('hora no futuro, variação do dia zerada, preço velho, fonte e', async () => {
  await p.clock.setFixedTime(new Date(T('14:30')));
  const G = await E(([ts]) => { __R([IT('ZETA3', 10, 9.8)], ts); S.quotes.ZETA3 = { price: 10.5, prev: 10, at: Date.now() + 36e5, src: 'auto' }; const r = livePx('ZETA3'); return { dif: r.at - Date.now(), est: r.est }; }, [T('14:22')]);
  ok('T1.8 hora no futuro vira "agora" (não vence todo mundo para sempre)', G.dif <= 0 && G.dif > -5000, G);
  await p.clock.setFixedTime(new Date(T('09:00')));
  const Z = await E(([a]) => { __R([IT('ETA3', 50, 49)], T0X(a)); S.quotes.ETA3 = { price: 50.4, prev: 50, at: a, src: 'auto' }; const r = livePx('ETA3'); return { pct: r.pct, pr: r.pr, fase: r.fase }; function T0X(x) { return x; } }, [T('17:58', '2026-11-25')]);
  ok('T1.9 antes do pregão a variação do dia continua zerada (cinza, sem sinal) e o preço é o fechamento', Z.pct === 0 && Math.abs(Z.pr - 0.8) < 0.01 && Z.fase === 'fechamento', Z);
  await p.clock.setFixedTime(new Date(T('14:30')));
  const V = await E(([ts, a]) => { __R([IT('TETA3', 30, 29)], ts); S.quotes.TETA3 = { price: 28.5, prev: 28, at: a, src: 'auto' }; S.quotes.OMEG3 = { price: 11, prev: 10, at: a, src: 'manual' }; PXM = {}; return { tk: livePx('TETA3'), man: livePx('OMEG3'), tag: pxTag(livePx('TETA3')) }; }, [T('14:22'), T('14:00')]);
  ok('T1.10 cotação digitada à mão (src manual) continua sem entrar no preço único', V.man === null, V.man);
  ok('T1.10 duas fontes: a fonte do preço único aparece na etiqueta da página (robô, "a cada 15 min")', typeof V.tag === 'string', V.tag);
  const S2 = await E(([ts, a]) => { __R([IT('IOTA3', 30, 29)], ts); S.quotes.IOTA3 = { price: 40, prev: 39, at: a, src: 'auto' }; MKT.q.IOTA3 = { price: 30, pct: 3.4, cur: 'BRL', name: '', at: a - 60000 }; return livePx('IOTA3').sus; }, [T('14:22'), T('14:20')]);
  ok('T1.11 aviso de duas fontes diferentes (mais de 5% em menos de 30 min) continua igual', /^duas fontes de preço diferem 33/.test(S2), S2);
  });
  /* ---------- tela: hora, fonte, ⓘ e item apagado na faixa ---------- */
  await sec('tela: hora, fonte, ⓘ e item apagado na faixa', async () => {
  await hora('14:30');
  const U = await E(async ([ts, tq]) => { __R([['IBOV', 176000, 170000, 'BRL', 'i', 'ibov'], IT('KAPA3', 12, 11.5), IT('LAMB3', 8, 7.9), IT('MIKR3', 5, 4.9)], ts); S.quotes.LAMB3 = { price: 8.3, prev: 7.9, at: tq, src: 'auto' }; PXM = {}; PXM.LAMB3 = { p: 8.3, t: tq, via: 'brapi', est: false };
      TPK = ''; renderTape(); const dim = [].map.call(document.querySelectorAll('#tape .tptr > .tpi.old'), n => n.getAttribute('data-tp')).filter((v, i, a) => a.indexOf(v) === i);
      __B({ 'brapi.dev': __brapi(12.02, 11.5, '2026-11-26T14:25:00-03:00', 4.5) }); S.keys.brapi = 'k'; const pg = await __pag('KAPA3'); const gc = document.querySelector('#stk-b .gcard'), when = gc && gc.querySelector('.gwh'), bal = gc && gc.querySelector('.bal');
      return { dim, when: when && when.textContent, bal: bal && bal.getAttribute('data-bal'), pg: pg.preco }; }, [T('14:22'), T('14:00')]);
  ok('T1.12 faixa: papel atrasado (30 min com o pregão aberto) fica apagado; os demais não', U.dim.length === 1 && U.dim[0] === 'LAMB3', U);
  ok('T1.12 página: a linha de hora mostra a hora do mercado e a fonte', U.when && /14:2[0-9]/.test(U.when) && /robô|brapi|Yahoo/.test(U.when), U);
  ok('T1.12 página: o ⓘ explica a hora e a fonte do preço', U.bal && /hora do mercado/.test(U.bal) && /fonte:/.test(U.bal), U);
  });
  /* ---------- formato guardado ---------- */
  await sec('formato guardado', async () => {
  const K = await E(() => { const antes = Object.keys(localStorage).sort(); save(); mktSave(); const dep = Object.keys(localStorage).sort(), ls = JSON.parse(localStorage.getItem(LS)), mk = JSON.parse(localStorage.getItem(LS + '-mkt')), kq = {}, km = {};
      Object.keys(ls.quotes || {}).forEach(t => Object.keys(ls.quotes[t]).forEach(k => kq[k] = 1)); Object.keys(mk.q || {}).forEach(t => Object.keys(mk.q[t]).forEach(k => km[k] = 1)); return { kq: Object.keys(kq).sort(), km: Object.keys(km).sort(), nova: dep.filter(k => antes.indexOf(k) < 0 && k !== LS && k !== LS + '-mkt') }; });
  ok('T1.13 localStorage: cotações da carteira só com price, prev, at e src', K.kq.every(k => ['price', 'prev', 'at', 'src'].indexOf(k) >= 0), K);
  ok('T1.13 localStorage: cotações do mercado só com price, pct, cur, name e at; nenhuma chave nova', K.km.every(k => ['price', 'pct', 'cur', 'name', 'at'].indexOf(k) >= 0) && K.nova.length === 0, K);
  });
  /* ---------- arquivos e rede ---------- */
  await sec('arquivos e rede', async () => {
  const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8'), ix = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8'), pj = fs.existsSync(path.join(RAIZ, 'js', 'precos.js')) ? fs.readFileSync(path.join(RAIZ, 'js', 'precos.js'), 'utf8') : '';
  ok("T1.14 js/precos.js está no cache offline (sw.js) e no index.html, depois de atualizacao.js", /'js\/precos\.js'/.test(sw) && ix.indexOf('js/atualizacao.js') < ix.indexOf('js/precos.js') && ix.indexOf('js/precos.js') > 0);
  ok('T1.14 js/precos.js tem menos de 25 KB, não faz rede e não escreve HTML', pj.length < 25000 && !/fetch\(|XMLHttpRequest|sendBeacon|innerHTML|insertAdjacentHTML/.test(pj), pj.length);
  { const ls = fs.readdirSync(path.join(RAIZ, 'js')).filter(f => f !== 'precos.js').map(f => fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8')).join('\n'), dir = ls.match(/(MKT\.q|S\.quotes)\[[^\]]*\]\s*=[^=]/g) || []; ok('T1.14 só sobra 1 gravação direta fora da porta única (a cotação digitada à mão, src manual); nenhuma automática', dir.length <= 1 && dir.every(d => /S\.quotes/.test(d)), dir); }
  ok('T1.14 nenhuma chamada de rede fora do app (o teste não deixou nada sair)', rede.length === 0, rede.slice(0, 3));
  ok('Nenhum erro de JavaScript na página', erros.length === 0, erros.slice(0, 3));
  });
  await ctx.close();
}

async function real(b) {
  const pg = await abrirReal(b, DADOS, { width: 360, height: 740 });
  const R = await pg.evaluate(async () => {
    TPTS = 0; try { tapeMerge(); } catch (e) { }
    const tape = (MD.d.tape.it || []).filter(tpStk).map(x => x[0]), ws = (S.watch || []).concat(compute().held.map(x => x.p.ticker)), tks = tape.concat(ws).filter((v, i, a) => a.indexOf(v) === i);
    const dif = [], nao = [];
    tks.forEach(tk => { const f = tapeItems().filter(i => i.l === tk)[0], lv = livePx(tk); if (f && lv && Math.abs(f.v - lv.p) > 1e-9) dif.push(tk); if (!lv) nao.push(tk); });
    const held = compute().held.map(x => x.p.ticker).filter(tk => S.quotes[tk] && S.quotes[tk].src === 'auto'), cart = held.filter(tk => livePx(tk) && Math.abs(getQuote(tk).price - livePx(tk).p) > 1e-9);
    return { n: tks.length, dif, nao: nao.length, cart, held: held.length, versao: VERSAO };
  });
  ok('Dados reais: para todo papel da faixa, da lista e da carteira, a faixa e o preço único são o mesmo número', R.dif.length === 0, R);
  ok('Dados reais: papéis da carteira com cotação automática: carteira = preço único', R.cart.length === 0, R);
  ok('Dados reais: nenhum erro de JavaScript', pg.__erros.length === 0, pg.__erros.slice(0, 3));
  await pg.context().close();
}

(async () => {
  if (arg.includes('--mutantes')) {
    let fraco = 0; const nomes = Object.keys(MUTANTES);
    nomes.forEach(n => { const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mutp-')), [f, a, b2] = MUTANTES[n]; cp.execSync('tar --exclude=node_modules --exclude=.git -cf - . | tar -xf - -C ' + tmp, { cwd: RAIZ });
      const tx = fs.readFileSync(path.join(tmp, f), 'utf8'); if (!tx.includes(a)) { console.log('✗ trecho do defeito não achado:', n); fraco++; return; } fs.writeFileSync(path.join(tmp, f), tx.replace(a, () => b2));
      const r = cp.spawnSync('node', [__filename, '--mut', n].concat(TEM_DADOS ? ['--dados', DADOS] : ['--sem-dados']), { encoding: 'utf8', cwd: RAIZ, timeout: 300000, env: Object.assign({}, process.env, { APORTE_APP_DIR: tmp, NODE_PATH: path.join(RAIZ, 'node_modules') }) }); cp.execSync('rm -rf ' + tmp);
      const saida = (r.stdout || '') + (r.stderr || ''), quebrou = r.status !== 0, qual = (saida.match(/^✗ .{0,80}/gm) || []).slice(0, 2).join(' | ');
      console.log((quebrou ? '✓ pego   ' : '✗ ESCAPOU') + ' ' + n + (quebrou ? '  → ' + qual : '')); if (!quebrou) fraco++; });
    console.log(fraco ? '✗ ' + fraco + ' defeito(s) escaparam dos testes' : '✓ Todos os ' + nomes.length + ' defeitos inseridos foram pegos pelos testes'); process.exit(fraco ? 1 : 0);
  }
  const b = await chromium.launch();
  try { await sintetico(b); if (TEM_DADOS) await real(b); else console.log('(sem a pasta de dados: parte real pulada)'); } catch (e) { falhas++; console.log('✗ erro no teste:', e.message); }
  await b.close();
  console.log(falhas ? '✗ Preços: ' + falhas + ' falha(s) de ' + total : '✓ Preços: ' + total + ' conferências ok'); process.exit(falhas ? 1 : 0);
})();
