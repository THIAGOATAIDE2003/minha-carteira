/* Testes da E2 (1.83.0): índices com hora própria e foto diária das Ideias sem preço velho.
   Uso: node tests/e2.js            (roda os testes; na 1.82.2 os casos C e da foto FALHAM)
        node tests/e2.js --mutantes (insere defeitos de propósito: cada um tem de fazer algum teste falhar)
   Tudo sintético: números e siglas inventados (UXAB3...), nenhum dado real. */
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { chromium } = require('playwright');
const RAIZ = process.env.APORTE_APP_DIR || path.resolve(__dirname, '..'), APP = 'file://' + path.join(RAIZ, 'index.html');
const arg = process.argv, val = k => arg.includes(k) ? arg[arg.indexOf(k) + 1] : null;
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra).slice(0, 500)); } };
const T = (hhmm, dia) => Date.parse((dia || '2026-11-26') + 'T' + hhmm + ':00-03:00');
const DN = dia => Math.floor(Date.parse(dia + 'T00:00:00Z') / 864e5);
const MUT = val('--mut');
const MUTANTES = {
  'indice-guardado-sem-hora-vence': ['js/precos.js', 'if(ok&&(!tv||pi.t>tv.at))return {v:mi.v,p:mi.p,at:pi.t,ap:1};', 'if(mi&&mi.v>0&&mi.p!=null&&(!tv||MKT.at>=tv.at))return {v:mi.v,p:mi.p,at:MKT.at,ap:1};'],
  'faixa-usa-indice-pela-hora-da-busca': ['js/atualizacao.js', 'pk=ik&&pxIdxPick(ik,l);if(pk&&pk.ap&&pk.p!=null&&pk.at>tat)', 'pk=ik&&MKT.idx[ik];if(pk&&pk.v>0&&pk.p!=null&&MKT.at>tat)'],
  'busca-do-ibov-sem-hora': ['js/mercado.js', 'if(it.k)pxIdxPut(it.k,q.price,q.pct,q.at);else', 'if(it.k)MKT.idx[it.k]={v:q.price,p:q.pct};else'],
  'hora-do-indice-no-futuro': ['js/precos.js', 'PXI[k]={v:v,t:t>0&&t<=Date.now()?t:Date.now()}', 'PXI[k]={v:v,t:t>0?t:Date.now()}'],
  'foto-sem-portao': ['js/foto.js', 'function fotoGate(){return !!(AV.md&&MD.d&&!MD.err)}', 'function fotoGate(){return true}'],
  'foto-portao-ignora-erro-do-robo': ['js/foto.js', 'return !!(AV.md&&MD.d&&!MD.err)', 'return !!(AV.md&&MD.d)'],
  'foto-preco-do-motor': ['js/foto.js', 'preco:fotoN(px.p)', 'preco:fotoN(o.d.price)'],
  'foto-preco-velho-vale': ['js/foto.js', "(lv.fase==='ao-vivo'||lv.fase==='fechamento'||(lv.fase==='atrasado'&&ld>=today()))", 'lv.fase'],
  'foto-atrasado-de-ontem-vale': ['js/foto.js', "(lv.fase==='atrasado'&&ld>=today())", "lv.fase==='atrasado'"],
  'foto-sem-limite-de-dias': ['js/foto.js', '/864e5<=5)', '/864e5<=99999)'],
  'foto-sem-dia-do-preco': ['js/foto.js', 'pd:px.pd,', ''],
  'foto-sem-hora-do-ibov': ['js/foto.js', "ibovAt:ib&&ib.at?new Date(ib.at).toISOString():null,", ''],
  'foto-sem-hora-da-faixa': ['js/foto.js', "tapeTs:MD.d&&MD.d.tape&&MD.d.tape.ts?new Date(MD.d.tape.ts*1000).toISOString():null,", ''],
  'registro-sem-portao': ['js/resultados.js', '!D.length||!fotoGate())return', '!D.length)return'],
  'registro-preco-do-motor': ['js/resultados.js', 'var px=fotoPx(o.tk);if(px)l.push([o.tk,Math.round(px.p*100)/100', 'var px={p:o.d.price};if(px)l.push([o.tk,Math.round(px.p*100)/100'],
  'registro-grava-vazio': ['js/resultados.js', 'if(!l.length)return;g.r[td]', 'g.r[td]'],
  'formato-do-registro-muda': ['js/resultados.js', 'l.push([o.tk,Math.round(px.p*100)/100,o.score,o.V?Math.round(o.V.med*100)/100:null])', 'l.push([o.tk,Math.round(px.p*100)/100,o.score,o.V?Math.round(o.V.med*100)/100:null,px.pd])'],
  'arquivo-novo-sem-cache': ['sw.js', "'js/precos.js',", '']
};
const ideia = (tk, price) => ({ tk: tk, d: { cur: 'BRL', price: price }, fx: { ok: true, cons: 12, cen: 18, oti: 26, esp: 18.6, ms: 0.12, est: 'abaixo', trap: null }, score: 7, cf: { n: 'Alta', w: [], f: 1 }, sd: { mot: [] }, V: { med: 18 } });

async function novo(b, quando) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' }), p = await ctx.newPage(), erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await ctx.route(u => !/^(file|data):/.test(u.toString()), r => r.abort());
  await p.addInitScript(() => { window.__APORTE_TESTE__ = true; });
  await p.clock.setFixedTime(new Date(T(quando || '14:30')));
  await p.goto(APP); await p.waitForFunction(() => window.__aporte); await p.waitForTimeout(900);
  p.__erros = erros; return p;
}

async function indices(b) {
  const p = await novo(b, '14:30');
  const PRE = (ts) => {
    MD.d = { at: Date.now(), tape: { ts: ts / 1000, it: [['IBOV', 176799.84, 166690, 'BRL', 'i', 'ibov'], ['EURO', 6.2, 6.1, 'BRL', 'f', 'eur']] }, hist: {} };
    S.quotes = {}; S.trades = []; S.watch = []; MKT.q = {}; MKT.idx = {}; if (typeof PXI !== 'undefined') PXI = {}; TPTS = 0; try { tapeMerge(); } catch (e) { }
  };
  /* ---- T2.1 caso C: o Ibovespa guardado no celular (sem hora própria, de outro dia) não pode vencer o do robô ---- */
  let r = await p.evaluate(([f, ts, tsAnt]) => {
    new Function('return ' + f)()(ts);
    MKT.idx.ibov = { v: 170000, p: -1.5 }; MKT.at = Date.now();   /* como volta do localStorage: valor guardado, hora da busca = agora, hora de mercado desconhecida */
    var x = idxDef('ibov'), v = idxVal0(x), t = tapeItems().filter(function (i) { return i.l === 'IBOV'; })[0];
    return { v: v && v.v, p: v && Math.round(v.p * 100) / 100, tape: t && Math.round(t.v * 100) / 100 };
  }, [PRE.toString(), T('10:10'), T('10:10', '2026-11-25')]);
  ok('T2.1 caso C: Ibovespa guardado sem hora de mercado NÃO vence o do robô (card/detalhe)', r.v === 176799.84, r);
  ok('T2.1 caso C: na faixa de cima também vale o do robô', r.tape === 176799.84, r);
  ok('T2.5 +6,07% do dia 26/11 é aceito (176.799,84 sobre 166.690), sem rejeição por tamanho', r.p === 6.06 || r.p === 6.07, r);

  /* ---- T2.1b: busca nova do app com hora de mercado MAIS ANTIGA que a faixa do robô: a faixa vence ---- */
  r = await p.evaluate(([f, ts, antiga]) => {
    new Function('return ' + f)()(ts);
    var put = typeof pxIdxPut === 'function' ? function (k, v, pc, t) { pxIdxPut(k, v, pc, t); } : function (k, v, pc) { MKT.idx[k] = { v: v, p: pc }; };
    put('ibov', 170000, -1.5, antiga); MKT.at = Date.now();
    var v = idxVal0(idxDef('ibov')); return { v: v && v.v };
  }, [PRE.toString(), T('10:10'), T('17:55', '2026-11-25')]);
  ok('T2.1b valor buscado com hora de mercado de ontem 17:55 perde para a faixa das 10:10', r.v === 176799.84, r);

  /* ---- T2.1c: busca nova com hora de mercado MAIS NOVA que a faixa: o app vence (comportamento útil preservado) ---- */
  r = await p.evaluate(([f, ts, nova]) => {
    new Function('return ' + f)()(ts);
    var put = typeof pxIdxPut === 'function' ? function (k, v, pc, t) { pxIdxPut(k, v, pc, t); } : function (k, v, pc) { MKT.idx[k] = { v: v, p: pc }; };
    put('ibov', 177500, 6.5, nova); MKT.at = Date.now();
    var v = idxVal0(idxDef('ibov')), t = tapeItems().filter(function (i) { return i.l === 'IBOV'; })[0]; return { v: v && v.v, tape: t && t.v, at: v && v.at };
  }, [PRE.toString(), T('10:10'), T('14:25')]);
  ok('T2.1c valor buscado com hora de mercado 14:25 (mais nova que a faixa das 10:10) vence, na tela e na faixa', r.v === 177500 && Math.round(r.tape) === 177500, r);
  ok('T2.1c o detalhe do índice passa a ter a hora de mercado do índice (14:25)', r.at === T('14:25') || r.at === undefined && !MUT, r);

  /* ---- T2.1d: o caminho real de busca (loadMkt → brapi) respeita a hora de mercado ---- */
  r = await p.evaluate(async ([f, ts, antiga]) => {
    new Function('return ' + f)()(ts);
    S.keys.brapi = 'k'; MKT.busy = false; MKT.at = 0; var velho = getJSON;
    getJSON = function (u) { if (/brapi/.test(u)) return Promise.resolve({ results: [{ regularMarketPrice: 170000, regularMarketChangePercent: -1.5, regularMarketTime: new Date(antiga).toISOString(), longName: 'Ibov' }] }); return Promise.reject(new Error('sem rede')); };
    loadMkt(true); for (var i = 0; i < 60 && MKT.busy; i++) await new Promise(function (r) { setTimeout(r, 100); });
    getJSON = velho; var v = idxVal0(idxDef('ibov')); return { v: v && v.v, busy: MKT.busy, gravou: MKT.idx.ibov && MKT.idx.ibov.v };
  }, [PRE.toString(), T('10:10'), T('17:55', '2026-11-25')]);
  ok('T2.1d busca real (brapi com hora de ontem) é gravada, mas a faixa mais nova continua valendo', r.gravou === 170000 && r.v === 176799.84, r);

  /* ---- T2.1e: busca real (brapi) com hora de mercado MAIS NOVA que a faixa: o valor buscado vence ---- */
  r = await p.evaluate(async ([f, ts, nova]) => {
    new Function('return ' + f)()(ts);
    S.keys.brapi = 'k'; MKT.busy = false; MKT.at = 0; var velho = getJSON;
    getJSON = function (u) { if (/brapi/.test(u)) return Promise.resolve({ results: [{ regularMarketPrice: 177500, regularMarketChangePercent: 6.5, regularMarketTime: new Date(nova).toISOString(), longName: 'Ibov' }] }); return Promise.reject(new Error('sem rede')); };
    loadMkt(true); for (var i = 0; i < 60 && MKT.busy; i++) await new Promise(function (r) { setTimeout(r, 100); });
    getJSON = velho; var v = idxVal0(idxDef('ibov')); return { v: v && v.v };
  }, [PRE.toString(), T('10:10'), T('14:25')]);
  ok('T2.1e busca real (brapi com hora 14:25, mais nova que a faixa das 10:10) vence a faixa', r.v === 177500, r);

  /* ---- T2.1f: hora de mercado no futuro é limitada ao "agora": uma hora errada não trava o valor guardado para sempre ---- */
  r = await p.evaluate(([f, ts, futura]) => {
    new Function('return ' + f)()(ts);
    if (typeof pxIdxPut === 'function') pxIdxPut('ibov', 170000, -1.5, futura); else MKT.idx.ibov = { v: 170000, p: -1.5 }; MKT.at = Date.now();
    return { v: idxVal0(idxDef('ibov')).v };
  }, [PRE.toString(), T('14:30'), T('14:30', '2027-01-10')]);
  ok('T2.1f hora do índice no futuro (2027) vale só "agora" (14:30): a faixa do robô de 14:30 não perde para uma hora errada', r.v === 176799.84, r);

  ok('T2.x nenhum erro de JavaScript (índices)', p.__erros.length === 0, p.__erros.slice(0, 3));
  await p.context().close();
}

async function foto(b) {
  /* 26/11/2026 10:30 (quinta, pregão aberto na B3). UXAB3: fechamento de 25/11 = 41,36; o app guardava 40,88 de 24/11 (preço velho) */
  const p = await novo(b, '09:30');
  const SET = ([dn25, dn24, dn20, ts24, ts25]) => {
    var hist = function (ult) { return { cur: 'BRL', last: ult[ult.length - 1][1], d: ult }; };
    MD.err = ''; AV.md = 1;
    MD.d = { ts: Date.now() / 1000, at: Date.now(), tape: { ts: Date.now() / 1000 - 600, it: [['IBOV', 176799.84, 166690, 'BRL', 'i', 'ibov']] },
      hist: { UXAB3: hist([[dn24, 40.88], [dn25, 41.36]]), UXBB3: hist([[dn20, 12.1]]), UXCB3: hist([[dn25, 9.5]]) } };
    S.quotes = { UXAB3: { price: 40.88, prev: 40.1, at: ts24, src: 'auto' } }; S.trades = []; S.watch = []; MKT.q = {}; MKT.idx = {}; if (typeof PXM !== 'undefined') PXM = {}; if (typeof PXI !== 'undefined') PXI = {}; TPTS = 0;
    try { tapeMerge(); } catch (e) { }
    FOTOQ = false; FOTOE = 0; try { localStorage.removeItem(fotoKey()); localStorage.removeItem(fotoKey() + '-st'); } catch (e) { }
    var g = garLoad(); delete g.r[today()]; metGrava('gar', g);
  };
  const dias = [DN('2026-11-25'), DN('2026-11-24'), DN('2026-11-20'), T('14:00', '2026-11-24'), T('15:00', '2026-11-25')];
  await p.evaluate(([i, ix]) => { window.__i = new Function('return ' + i)(); }, [ideia.toString(), 0]);
  const rodar = (extra) => p.evaluate(async ([set, d, quais]) => {
    new Function('return ' + set)()(d);
    var D = quais.map(function (q) { return window.__i(q[0], q[1]); });
    var calls = []; var f0 = window.fetch; window.fetch = function (u, o) { calls.push({ u: u, m: o.method, body: JSON.parse(o.body) }); return Promise.resolve({ ok: true, status: 201 }); };
    S.keys.gh = 'tok'; var doc = fotoMontar({ D: D, X: [] }, today());
    garRec(D); var g = garLoad().r[today()];
    fotoSalvar({ D: D, X: [] }); await new Promise(function (r) { setTimeout(r, 80); });
    window.fetch = f0; var cont = calls.length ? JSON.parse(decodeURIComponent(escape(atob(calls[0].body.content)))) : null;
    return { doc: doc, g: g, n: calls.length, arq: cont, raw: String(metRaw('gar')) };
  }, [SET.toString(), dias, extra]);

  /* T2.2 preço velho (24/11) com pregão ainda fechado (9:30 de 26/11): a foto usa o fechamento de 25/11, com a data dele */
  let r = await rodar([['UXAB3', 40.88]]);
  const L = r.doc && r.doc.ideias && r.doc.ideias[0];
  ok('T2.2 foto de 26/11 antes da abertura: preço 41,36 (fechamento de 25/11), nunca 40,88 (de 24/11)', L && L.preco === 41.36, L);
  ok('T2.2 a linha diz o dia do preço (pd = 2026-11-25)', L && L.pd === '2026-11-25', L);
  ok('T2.2 o registro do dia (histórico do app) também usa 41,36', r.g && r.g.l[0][1] === 41.36, r.g);
  ok('T2.2 o arquivo enviado ao GitHub traz o mesmo preço e o dia do preço', r.arq && r.arq.ideias[0].preco === 41.36 && r.arq.ideias[0].pd === '2026-11-25', r.arq);
  ok('T2.6 a foto traz o Ibovespa com a hora dele e a hora da faixa do robô', r.doc && r.doc.ibov === 176799.84 && /^2026-11-26T/.test(r.doc.ibovAt || '') && /^2026-11-26T/.test(r.doc.tapeTs || ''), r.doc && { ibov: r.doc.ibov, a: r.doc.ibovAt, t: r.doc.tapeTs });
  ok('T2.6 registro do histórico mantém o formato de sempre: {i, l:[[sigla, preço, nota, faixa]]}', r.g && Object.keys(r.g).sort().join() === 'i,l' && r.g.l[0].length === 4 && r.g.l[0][0] === 'UXAB3', r.g);
  ok('T2.6 o texto guardado no celular tem a linha no formato de sempre, 4 itens, sem campo novo', /\["UXAB3",41\.36,7,18\]/.test(r.raw), r.raw.slice(0, 200));
  /* T2.2b o caso de 24/11 e 26/11: ação sem nenhum preço de agora e fechamento antigo demais → fora da foto */
  r = await rodar([['UXAB3', 40.88], ['UXBB3', 12.1]]);
  const tks = r.doc ? r.doc.ideias.map(x => x.tk).join() : '';
  ok('T2.2b ação cujo último fechamento tem mais de 5 dias (UXBB3 de 20/11) fica de fora da foto e do registro', tks === 'UXAB3' && r.g && r.g.l.length === 1, { tks, g: r.g });
  /* T2.4 sem nenhum preço novo: nada gravado */
  r = await rodar([['UXBB3', 12.1]]);
  ok('T2.4 sem preço novo para nenhuma ideia: sem foto, sem envio e sem registro do dia', r.doc === null && r.n === 0 && !r.g, { doc: !!r.doc, n: r.n, g: r.g });
  /* T2.3 portão: robô ainda não lido / com erro */
  const semPortao = (ajuste) => p.evaluate(async ([set, d, aj]) => {
    new Function('return ' + set)()(d); new Function(aj)();
    var D = [window.__i('UXAB3', 40.88)]; var calls = []; var f0 = window.fetch; window.fetch = function (u, o) { calls.push(o && o.body ? JSON.parse(o.body).message + ' ' + u.slice(-30) : String(u).slice(0, 60)); return Promise.resolve({ ok: true, status: 201 }); };
    S.keys.gh = 'tok'; garRec(D); fotoSalvar({ D: D, X: [] }); await new Promise(function (r) { setTimeout(r, 80); }); window.fetch = f0;
    return { n: calls.length, g: !!garLoad().r[today()], calls: calls };
  }, [SET.toString(), dias, ajuste]);
  r = await semPortao('AV.md=0');
  ok('T2.3 antes de ler o robô (AV.md=0): não envia foto e não grava o registro do dia', r.n === 0 && !r.g, r);
  r = await semPortao("MD.err='Não consegui ler os dados do robô agora.'");
  ok('T2.3 com erro na leitura do robô: não envia foto e não grava o registro do dia', r.n === 0 && !r.g, r);
  r = await semPortao('MD.d=null');
  ok('T2.3 sem dados do robô: não envia foto e não grava o registro', r.n === 0 && !r.g, r);
  r = await semPortao('');
  ok('T2.3 com o robô lido e sem erro: envia uma foto e grava o registro (o portão abre)', r.n >= 1 && r.g && r.calls.filter(function (c) { return /Foto das ideias/.test(c); }).length === 1, r);
  await p.context().close();

  /* T2.2c pregão aberto: preço de AGORA (ao vivo) é usado; preço atrasado de ontem não */
  const q = await novo(b, '11:00');
  await q.evaluate(([i]) => { window.__i = new Function('return ' + i)(); }, [ideia.toString()]);
  const rr = await q.evaluate(async ([set, d, agora, ontem]) => {
    new Function('return ' + set)()(d);
    S.quotes = { UXAB3: { price: 41.9, prev: 41.36, at: agora, src: 'auto' }, UXCB3: { price: 9.1, prev: 9.5, at: ontem, src: 'auto' } };
    return { vivo: fotoMontar({ D: [window.__i('UXAB3', 41.9), window.__i('UXCB3', 9.1)], X: [] }, today()) };
  }, [SET.toString(), dias, T('10:55', '2026-11-26'), T('14:00', '2026-11-25')]).catch(e => ({ erro: String(e) }));
  ok('T2.2c pregão aberto: preço ao vivo de 10:55 entra com o dia de hoje; atrasado de ontem sai pelo fechamento de 25/11 (9,50)', rr.vivo && rr.vivo.ideias[0].preco === 41.9 && rr.vivo.ideias[0].pd === '2026-11-26' && rr.vivo.ideias[1].preco === 9.5 && rr.vivo.ideias[1].pd === '2026-11-25', rr.vivo ? rr.vivo.ideias.map(x => [x.tk, x.preco, x.pd]) : rr);
  ok('T2.x nenhum erro de JavaScript (foto)', q.__erros.length === 0, q.__erros.slice(0, 3));
  await q.context().close();
}

async function bolinha(b) {
  /* T2.7 trava de regressão (passa também na 1.82.2): o ⓘ nunca cai sozinho numa linha, em 3 textos de hora e larguras de 230 a 360 px */
  const p = await novo(b, '14:30');
  const R = await p.evaluate(() => {
    var textos = ['26/11, 14:27 · atualizado há 3 min · servidor de cotações', 'Atrasado: preço de 27/11, 17:50 · servidor de cotações', 'Último preço de 25/11, 15:10 · robô (não é de agora)'], sozinho = [], n = 0;
    textos.forEach(function (t, i) {
      for (var w = 230; w <= 360; w += 1) {
        var d = document.createElement('div'); d.style.cssText = 'width:' + w + 'px;position:fixed;top:10px;left:0;background:#fff'; setHtml(d, gHead('Teste', '', 'R$ 1,00', 0, 0, '1d', '', t, bal('texto', null, 'De onde vem'))); document.body.appendChild(d);
        var pp = d.querySelector('.gwh'), bl = d.querySelector('.bal'), rb = bl.getBoundingClientRect(), tw = document.createTreeWalker(pp, NodeFilter.SHOW_TEXT), nd, last = null;
        while ((nd = tw.nextNode())) last = nd; var rg = document.createRange(); rg.selectNodeContents(last); var rs = rg.getClientRects(), lr = rs[rs.length - 1], lh = parseFloat(getComputedStyle(pp).lineHeight) || 20;
        n++; if (Math.abs((rb.top + rb.height / 2) - (lr.top + lr.height / 2)) > lh * .9) sozinho.push([i, w]); d.remove();
      }
    }); return { n: n, sozinho: sozinho.slice(0, 6), total: sozinho.length };
  });
  ok('T2.7 o ⓘ da linha da hora nunca fica sozinho numa linha (3 textos × 130 larguras de 230 a 360 px)', R.total === 0 && R.n === 393, R);
  await p.context().close();
}

(async () => {
  if (arg.includes('--mutantes')) {
    let fraco = 0; const nomes = Object.keys(MUTANTES);
    nomes.forEach(n => {
      const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mute2-')), [f, a, b2] = MUTANTES[n];
      cp.execSync('tar --exclude=node_modules --exclude=.git -cf - . | tar -xf - -C ' + tmp, { cwd: RAIZ, shell: '/bin/bash' }); try { fs.symlinkSync(path.join(RAIZ, 'node_modules'), path.join(tmp, 'node_modules')); } catch (e) { }
      const tx = fs.readFileSync(path.join(tmp, f), 'utf8'); if (!tx.includes(a)) { console.log('✗ trecho do defeito não achado:', n); fraco++; return; } fs.writeFileSync(path.join(tmp, f), tx.replace(a, () => b2));
      const r = n === 'arquivo-novo-sem-cache' ? cp.spawnSync('node', ['tests/teste.js'], { encoding: 'utf8', cwd: tmp, timeout: 300000 }) : cp.spawnSync('node', [__filename, '--mut', n], { encoding: 'utf8', cwd: RAIZ, timeout: 300000, env: Object.assign({}, process.env, { APORTE_APP_DIR: tmp }) });
      const saida = (r.stdout || '') + (r.stderr || ''), quebrou = r.status !== 0, qual = (saida.match(/^✗ .{0,80}/gm) || []).slice(0, 2).join(' | ');
      console.log((quebrou ? '✓ pego   ' : '✗ ESCAPOU') + ' ' + n + (quebrou ? '  → ' + qual : '')); if (!quebrou) fraco++;
    });
    console.log(fraco ? '✗ ' + fraco + ' defeito(s) escaparam dos testes' : '✓ Todos os ' + nomes.length + ' defeitos inseridos foram pegos pelos testes'); process.exit(fraco ? 1 : 0);
  }
  const b = await chromium.launch();
  try { await indices(b); await foto(b); await bolinha(b); } catch (e) { falhas++; console.log('✗ erro no teste:', e.message); }
  await b.close();
  console.log(falhas ? '✗ E2: ' + falhas + ' falha(s) de ' + total : '✓ E2: ' + total + ' conferências ok'); process.exit(falhas ? 1 : 0);
})();
