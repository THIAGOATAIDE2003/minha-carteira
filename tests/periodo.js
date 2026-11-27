/* Testes do "gráfico abre sempre no 1D" (G1, 1.83.4, js/periodo.js): ações e índices abrem no 1D, sem lembrar a escolha; sem pontos do dia abre no 1M com uma linha
   (nunca gráfico vazio); fora do pregão o rótulo é "último pregão, DD/MM"; CDI, Selic, IPCA e minério sem botões 1D e 5D. Na 1.83.3 os casos P1 a P7 FALHAM.
   Uso: node tests/periodo.js            node tests/periodo.js --mutantes       node tests/periodo.js --gravar (SÓ na árvore ANTERIOR, 1.83.3: fixa o que não pode mudar)
   Tudo sintético (ações inventadas ALFA3, BETA3, USAX; índices com números inventados); nenhum dado real. */
const path = require('path'), fs = require('fs'), cp = require('child_process'), crypto = require('crypto');
const { chromium } = require('playwright');
const RAIZ = process.env.APORTE_APP_DIR || path.resolve(__dirname, '..'), APP = 'file://' + path.join(RAIZ, 'index.html');
const arg = process.argv, val = k => arg.includes(k) ? arg[arg.indexOf(k) + 1] : null;
const MUT = val('--mut'), GRAVAR = arg.includes('--gravar'), ESP = path.join(__dirname, 'esperado-periodo.json');
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra).slice(0, 700)); } };
const T = (hhmm, dia) => Date.parse((dia || '2026-11-27') + 'T' + hhmm + ':00-03:00');
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const PRE = () => {
  window.__R = function (ts) { MD.d = { at: Date.now(), tape: { ts: ts / 1000, it: [] }, hist: {}, idx: {} }; S.quotes = {}; S.trades = []; S.watch = []; MKT.q = {}; MKT.idx = {}; TPTS = 0; if (typeof PXM !== 'undefined') PXM = {}; if (typeof PXI !== 'undefined') PXI = {}; STKC = {}; FIN = {}; };
  window.__pts = function (dia, hh, n, v0, v1) { var t0 = Date.parse(dia + 'T' + hh + ':00Z') / 1000, o = []; for (var i = 0; i < n; i++) o.push([t0 + i * 300, v0 + (v1 - v0) * i / (n - 1)]); return o; };
  window.__intra = function (sym, p, prev, off, ext) { FIN['intra/' + sym] = { d: { p: p, prev: prev, off: off == null ? -10800 : off, ext: ext ? 1 : 0, at: p[p.length - 1][0], o: p[0][1], h: Math.max.apply(null, p.map(function (q) { return q[1]; })), l: Math.min.apply(null, p.map(function (q) { return q[1]; })) }, at: Date.now() }; };
  window.__abrirIdx = function (k, rg) { STK = { tk: '', idx: k, rng: rg || '1d', d: null }; $('stk').hidden = false; idxRender(); };
  window.__dacao = function (tk, price) { return { cur: tk === 'USAX' ? 'USD' : 'BRL', name: 'Empresa ' + tk, price: price, pct: 1, hist: [{ t: Date.parse('2026-10-20T15:00:00Z'), c: price * 0.9 }, { t: Date.parse('2026-11-20T15:00:00Z'), c: price * 0.95 }, { t: Date.parse('2026-11-26T15:00:00Z'), c: price }], k: {}, at: Date.now() }; };
  window.__abrirAcao = function (tk, price, rg) { STK = { tk: tk, rng: rg || '1d', d: __dacao(tk, price), busy: false, err: '' }; $('stk').hidden = false; stkRender(); };
  /* abertura de verdade (stkOpen/idxOpen), com a rede de cotações desligada: só o dado do dia é posto à mão */
  window.__stkOpen = function (tk, price) { window.stkLoad = function () { }; FIN['dia/' + (tk === 'USAX' ? tk : tk + '.SA')] = { d: { d: [[20780, 16.3, 16.8, 16.2, 16.54, 1], [20783, 16.3, 16.8, 16.2, 16.54, 1]] }, at: Date.now() }; stkOpen(tk); STK.d = __dacao(tk, price); stkRender(); };
  window.__idxOpen = function (k, rows, sym) { window.loadMD = function () { }; window.futLoad = function () { }; MD.d.idx[k] = { d: rows, w: rows, name: k, cur: 'BRL', last: rows[rows.length - 1][1], sym: sym }; idxOpen(k); };
  window.__lsKeys = function () { return Object.keys(localStorage).sort().join('|'); };
  window.__gdl = function () { var g = document.querySelector('#stk-b .gdl'); return g ? g.textContent.replace(/\s+/g, ' ').trim() : null; };
  window.__txt = function () { var b = $('stk-b'); return b ? b.textContent.replace(/\s+/g, ' ') : ''; };
  window.__on = function () { var o = []; document.querySelectorAll('#stk-b .rng [data-rng]').forEach(function (b) { if (b.getAttribute('aria-pressed') === 'true') o.push(b.getAttribute('data-rng')); }); return o.join(','); };
  window.__btns = function () { var o = []; document.querySelectorAll('#stk-b .rng [data-rng]').forEach(function (b) { o.push(b.getAttribute('data-rng')); }); return o.join(','); };
  window.__svg = function () { return document.querySelectorAll('#stk-b .gch svg').length; };
};
async function novo(b, quando, dia) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' }), p = await ctx.newPage(), erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await ctx.route(u => !/^(file|data):/.test(u.toString()), r => r.abort());
  await p.addInitScript(() => { window.__APORTE_TESTE__ = true; });
  await p.clock.setFixedTime(new Date(T(quando || '11:30', dia)));
  await p.goto(APP); await p.waitForFunction(() => window.__aporte); await p.waitForTimeout(900); await p.evaluate(PRE);
  p.__erros = erros; p.__ctx = ctx; return p;
}
const sec = async (n, f) => { try { await f(); } catch (e) { ok('Bloco "' + n + '" não rodou: ' + String(e.message).split('\n')[0].slice(0, 160), false); } };
const T1130 = T('11:30'), DIAS = (a, b) => { var o = []; for (var d = a; d <= b; d++) o.push([d, 100 + (d % 7)]); return o; };
const FIXOS = ['finView', 'finStat', 'finBase', 'finLast', 'finTail', 'finGet', 'compute', 'livePx', 'idxVal', 'vdAtivo', 'vdIdx', 'vdFo', 'rgEff', 'rngBar', 'lineChart', 'gStats'];

const MUTANTES = {
  'acao-abre-em-1A-de-novo': ['js/mercado-setores.js', "STK={tk:tk,rng:'1d',d:null,busy:false", "STK={tk:tk,rng:STK.rng||'1y',d:null,busy:false"],
  'grava-a-escolha-no-localStorage': ['js/mercado-setores.js', "STK={tk:tk,rng:'1d',d:null,busy:false", "STK={tk:tk,rng:(localStorage.setItem('minha-carteira-rng','1d'),'1d'),d:null,busy:false"],
  'indice-esquecido-abre-em-1A': ['js/mercado-setores.js', 'rng:pdPadrao(x),d:null}', "rng:STK.rng&&STK.rng!=='2y'?STK.rng:'1y',d:null}"],
  'inicio-muda-de-padrao': ['js/inicio.js', "rng:k==='dia'?'1d':'1y'", "rng:'1d'"],
  'troca-para-1M-sem-a-marca': ['js/periodo.js', '&&!STK.auto){STK.auto=1;', '){STK.auto=1;'],
  'marca-1D-mas-desenha-1M': ['js/periodo.js', "STK.auto=1;STK.rng='1mo';return true", 'STK.auto=1;return true'],
  'hoje-no-fim-de-semana': ['js/periodo.js', "if(d===Math.floor((Date.now()/1000+off)/86400))return per;", 'return per;'],
  'rotulo-pregao-nao-chega-ao-cabecalho': ['js/grafico.js', "RGL[rg]||(/^último pregão, \\d\\d\\/\\d\\d$/.test(rg)?rg:'')", "RGL[rg]||''"],
  'esconde-o-1D-onde-ha-arquivo': ['js/periodo.js', 'function pdSemIntra(x){return !!x&&(', 'function pdSemIntra(x){return !!x||('],
  'mostra-o-1D-no-CDI': ['js/periodo.js', ".concat(pdSemIntra(x)?['nointra']:[])", '.concat([])'],
  'ipca-abre-no-1M': ['js/periodo.js', "(x.src==='ipca'?'1y':'1mo')", "'1mo'"],
  'mexe-no-finView': ['js/grafico.js', "msg:'Carregando o histórico...'", "msg:'Carregando o histórico…'"],
  'mexe-no-rgEff': ['js/periodo.js', "STK.rng==='1d'||STK.rng==='5d'?'1mo':STK.rng}", "STK.rng==='1d'||STK.rng==='5d'?'3mo':STK.rng}"],
  'tentar-de-novo-volta-ao-1A': ['js/acao-pagina.js', "data-rng=\"'+STK.rng+'\">Tentar de novo", "data-rng=\"1y\">Tentar de novo"],
  'sem-a-linha-de-aviso': ['js/periodo.js', "return STK.auto&&STK.rng==='1mo'?", "return ''&&STK.auto&&STK.rng==='1mo'?"],
  'sem-reserva-de-espaco': ['js/periodo.js', "return fv&&fv.st==='load'?';min-height:190px':''", "return ''"],
  'carga-da-acao-no-1D-fica-presa': ['js/acao-valor.js', 'if(STK.tk!==tk||rgEff()!==rg)return;', 'if(STK.tk!==tk||STK.rng!==rg)return;'],
  'arquivo-fora-do-sw': ['sw.js', "'js/periodo.js',", ''],
  'arquivo-fora-do-index': ['index.html', '<script src="js/periodo.js"></script>\n', '']
};

async function principal(b) {
  const p = await novo(b, '11:30'), pts = await p.evaluate(() => __pts('2026-11-27', '13:00', 18, 17, 17.8));
  const D = DIAS(20744, 20784);
  /* P1 a P2: ações abrem no 1D, sem lembrar a escolha */
  await sec('P1 P2 ação', async () => {
    const r = await p.evaluate(([ts, pts]) => {
      __R(ts); var k0 = __lsKeys(), ini = STK.rng; __intra('ALFA3.SA', pts, 16.54); __intra('BETA3.SA', pts, 16.54);
      __stkOpen('ALFA3', 17.8); var a = { rng: STK.rng, on: __on(), svg: __svg(), gdl: __gdl() };
      document.querySelector('#stk-b [data-rng="6mo"]').click(); var b3 = STK.rng;
      __stkOpen('BETA3', 17.8); var c = { rng: STK.rng, on: __on() };
      __intra('^BVSP', pts, 17); __idxOpen('ibov', [[20783, 176800], [20784, 181000]], '^BVSP'); var i = { rng: STK.rng, on: __on() };
      return { ini: ini, a: a, b3: b3, c: c, i: i, ls: __lsKeys() === k0 };
    }, [T1130, pts]);
    ok('P1 STK inicial abre no 1D (sem ação aberta ainda)', r.ini === '1d', r);
    ok('P1 ação abre no 1D: STK.rng, botão 1D marcado e gráfico de pontos desenhado, rótulo "hoje"', r.a.rng === '1d' && r.a.on === '1d' && r.a.svg === 1 && /hoje/.test(r.a.gdl || ''), r.a);
    ok('P2 depois de escolher 6M numa ação, OUTRA ação abre no 1D (a escolha não vaza)', r.b3 === '6mo' && r.c.rng === '1d' && r.c.on === '1d', r);
    ok('P2 depois de 6M, o índice também abre no 1D', r.i.rng === '1d' && r.i.on === '1d', r.i);
    ok('P2 nada novo no localStorage (não lembra a escolha)', r.ls, r);
  });
  /* P3: índices com arquivo de 5 min abrem no 1D (inclui S&P 500, cujo gráfico usa o ^GSPC) */
  await sec('P3 índices', async () => {
    const lista = [['ibov', '^BVSP'], ['SPY', '^GSPC'], ['QQQ', '^IXIC'], ['DIA', '^DJI'], ['ACWI', 'ACWI'], ['EEM', 'EEM'], ['GLD', 'GC=F'], ['usd', 'BRL=X'], ['eur', 'EURBRL=X'], ['btc', 'BTC-USD'], ['brent', 'BZ=F'], ['tnx', '^TNX'], ['ifix', 'XFIX11.SA']];
    const r = await p.evaluate(([ts, pts, lista, D]) => {
      __R(ts); var o = {}; lista.forEach(function (c) { __intra(c[1], pts, 17); if (/=X$/.test(c[1])) FIN['intra/' + c[1]].d.p.unshift([Date.parse('2026-11-26T17:00:00-03:00') / 1000, 17.5]); __idxOpen(c[0], D, c[1]); o[c[0]] = { rng: STK.rng, on: __on(), svg: __svg(), btns: __btns().split(',').slice(0, 2).join(','), hoje: /hoje/.test(__gdl() || '') }; });
      return o;
    }, [T1130, pts, lista, D]);
    lista.forEach(c => { const x = r[c[0]]; ok('P3 ' + c[0] + ' (' + c[1] + ') abre no 1D, com os botões 1D/5D e os pontos do dia desenhados', x.rng === '1d' && x.on === '1d' && x.svg === 1 && x.btns === '1d,5d' && x.hoje, x); });
  });
  /* P4: sem arquivo de 5 min: sem botões 1D e 5D e abre no menor período diário com dado */
  await sec('P4 sem 5 min', async () => {
    const r = await p.evaluate(([ts, D]) => {
      __R(ts); var o = {}, ipca = []; for (var i = 0; i < 13; i++) ipca.push([20784 - 30 * (12 - i), 4 + i / 10]);
      [['cdi', D], ['selic', D], ['iron', D], ['ipca', ipca]].forEach(function (c) { __idxOpen(c[0], c[1], c[0] === 'iron' ? 'TIO=F' : ''); o[c[0]] = { rng: STK.rng, on: __on(), btns: __btns(), svg: __svg(), txt: __txt().slice(0, 200) }; });
      return o;
    }, [T1130, D]);
    for (const k of ['cdi', 'selic', 'iron']) ok('P4 ' + k + ' abre no 1M, sem os botões 1D e 5D, com gráfico', r[k].rng === '1mo' && r[k].on === '1mo' && !/(^|,)(1d|5d)(,|$)/.test(r[k].btns) && r[k].svg === 1, r[k]);
    ok('P4 IPCA abre no 1A (dado mensal), sem os botões 1D e 5D, com gráfico', r.ipca.rng === '1y' && r.ipca.on === '1y' && !/(^|,)(1d|5d)(,|$)/.test(r.ipca.btns) && r.ipca.svg === 1, r.ipca);
  });
  /* P5: sem pontos do dia → 1M com a linha de aviso, uma vez só, sem gravar nada */
  await sec('P5 sem pontos', async () => {
    const r = await p.evaluate(([ts, D]) => {
      __R(ts); var k0 = __lsKeys(); FIN['intra/ALFA3.SA'] = { d: null, at: Date.now() };
      __stkOpen('ALFA3', 17.8); var a = { rng: STK.rng, on: __on(), svg: __svg(), txt: __txt(), auto: STK.auto };
      document.querySelector('#stk-b [data-rng="1d"]').click(); stkRender(); var a2 = { rng: STK.rng, txt: __txt(), nota: /mostrando 1 mês/.test(__txt()) };
      FIN['intra/^GSPC'] = { d: null, at: Date.now() }; __idxOpen('SPY', D, '^GSPC'); var i = { rng: STK.rng, on: __on(), svg: __svg(), txt: __txt() };
      document.querySelector('#stk-b [data-rng="1d"]').click(); idxRender(); var i2 = { rng: STK.rng };
      return { a: a, a2: a2, i: i, i2: i2, ls: __lsKeys() === k0 };
    }, [T1130, D]);
    ok('P5 ação sem pontos do dia: abre no 1M com a linha "Ainda sem negociações hoje; mostrando o último mês." e gráfico (nunca vazio)', r.a.rng === '1mo' && r.a.on === '1mo' && r.a.svg === 1 && /Ainda sem negociações hoje; mostrando o último mês\./.test(r.a.txt), r.a);
    ok('P5 tocar no 1D mostra a mensagem do 1D e NÃO volta sozinho para o 1M', r.a2.rng === '1d' && /Ainda não há pontos/.test(r.a2.txt) && !r.a2.nota, r.a2);
    ok('P5 índice com símbolo sem pontos: mesma regra (1M, linha, gráfico); tocar no 1D não volta sozinho', r.i.rng === '1mo' && r.i.on === '1mo' && r.i.svg === 1 && /Ainda sem negociações hoje; mostrando o último mês\./.test(r.i.txt) && r.i2.rng === '1d', r);
    ok('P5 nenhuma chave nova no localStorage', r.ls, r);
  });
  /* P6: fora do pregão o rótulo é "último pregão, DD/MM" */
  await sec('P6 pregão', async () => {
    const f = async (dia, hh, off, pontosDia) => await p.evaluate(([ts, a]) => { __R(ts); __intra(a.sym, __pts(a.dia, a.hh, 18, 17, 17.8), 16.54, a.off); __stkOpen(a.tk, 17.8); return __gdl(); }, [T1130, { sym: off === -18000 ? 'USAX' : 'ALFA3.SA', tk: off === -18000 ? 'USAX' : 'ALFA3', dia: pontosDia, hh: hh, off: off }]);
    ok('P6 durante o pregão o rótulo continua "hoje"', /hoje/.test(await f('', '13:00', -10800, '2026-11-27') || ''), 1);
    await p.clock.setFixedTime(new Date(T('10:00', '2026-11-28')));
    const sab = await f('', '13:00', -10800, '2026-11-27'), us = await f('', '15:00', -18000, '2026-11-27');
    ok('P6 sábado: último pregão BR com o rótulo "último pregão, 27/11" (e não "hoje")', /último pregão, 27\/11/.test(sab || '') && !/hoje/.test(sab || ''), sab);
    ok('P6 sábado: último pregão EUA (Nova York) com "último pregão, 27/11"', /último pregão, 27\/11/.test(us || '') && !/hoje/.test(us || ''), us);
    await p.clock.setFixedTime(new Date(T('11:30')));
    const velho = await f('', '13:00', -10800, '2026-11-24');
    ok('P6 arquivo velho (cache de 3 dias atrás): "último pregão, 24/11", nunca "hoje"', /último pregão, 24\/11/.test(velho || '') && !/hoje/.test(velho || ''), velho);
    const idx = await p.evaluate(([ts, pts, D]) => { __R(ts); __intra('^BVSP', __pts('2026-11-26', '13:00', 18, 17, 17.8), 16.5); __idxOpen('ibov', D, '^BVSP'); return __gdl(); }, [T1130, pts, D]);
    ok('P6 índice com último ponto de ontem: "último pregão, 26/11"', /último pregão, 26\/11/.test(idx || ''), idx);
  });
  /* P7: "Tentar de novo" volta ao 1D */
  await sec('P7 tentar de novo', async () => {
    const r = await p.evaluate(ts => { __R(ts); window.stkLoad = function () { }; stkOpen('ALFA3'); STK.err = 'Sem conexão.'; stkRender(); var b = document.querySelector('#stk-b [data-rng]'); return b && b.getAttribute('data-rng'); }, T1130);
    ok('P7 "Tentar de novo" repete o 1D (não o 1A)', r === '1d', r);
  });
  /* P9: o espaço do gráfico é reservado enquanto o arquivo do dia carrega; o cabeçalho (nome, preço) já está na tela */
  await sec('P9 espaço', async () => {
    const r = await p.evaluate(([ts, pts]) => {
      __R(ts); FIN['intra/ALFA3.SA'] = { p: new Promise(function () { }), d: undefined, at: 0 }; window.stkLoad = function () { }; stkOpen('ALFA3'); STK.d = __dacao('ALFA3', 17.8); stkRender();
      var m = document.querySelector('#stk-b p.muted.small[style*="margin:12px"]'), hd = __txt(), hm = m ? m.getBoundingClientRect().height : 0;
      __intra('ALFA3.SA', pts, 16.54); stkRender(); var g = document.querySelector('#stk-b .gch'), hg = g ? g.getBoundingClientRect().height : 0;
      return { hd: /Empresa ALFA3/.test(hd) && /17,80/.test(hd) && /Carregando/.test(hd), hm: hm, hg: hg };
    }, [T1130, pts]);
    ok('P9 carregando: o cabeçalho (nome e preço) já aparece e o espaço reservado tem a altura do gráfico (±30 px)', r.hd && r.hm > 150 && Math.abs(r.hm - r.hg) <= 30, r);
  });
  /* P13: ação que o robô não tem (carga pelo brapi) abre no 1D e mostra os dados (o 1D pede "1mo" ao brapi; a resposta não pode ser descartada por "o período mudou") */
  await sec('P13 carga pelo brapi', async () => {
    const p2 = await novo(b, '11:30');
    const r = await p2.evaluate(async ts => {
      __R(ts); S.keys.brapi = 'k'; var antes = window.getJSON; window.getJSON = function () { return Promise.resolve({ results: [{ regularMarketPrice: 21.5, regularMarketPreviousClose: 20, regularMarketChangePercent: 7.5, regularMarketTime: '2026-11-27T11:20:00-03:00', longName: 'Empresa NOVA3', historicalDataPrice: [{ date: 1730000000, close: 20 }, { date: 1732000000, close: 21.5 }] }] }); };
      FIN['intra/NOVA3.SA'] = { d: null, at: Date.now() }; stkOpen('NOVA3'); for (var i = 0; i < 40 && !STK.d; i++) await new Promise(function (r) { setTimeout(r, 25); });
      var o = { rng: STK.rng, d: !!STK.d, preco: STK.d && STK.d.price, txt: __txt().slice(0, 80) }; window.getJSON = antes; return o;
    }, T1130); await p2.context().close();
    ok('P13 ação sem histórico do robô abre no 1D e mostra os dados vindos do brapi (não fica em "Carregando")', r.d && r.preco === 21.5 && !/Carregando NOVA3/.test(r.txt), r);
  });
  /* P8/P10/P11: o que não pode mudar (outros períodos, texto das funções, compute() e Início) comparado com o retrato da 1.83.3 */
  const col = await p.evaluate(([FIX, ts, pts]) => {
    var o = { fn: {}, per: {} };
    FIX.forEach(function (n) { try { o.fn[n] = eval(n).toString(); } catch (e) { o.fn[n] = 'ausente'; } });
    __R(ts); MD.d.idx.ibov = { d: [[20781, 164090], [20782, 166685], [20783, 176800], [20784, 181000]], w: [[20783, 176800]], name: 'IBOVESPA', cur: 'BRL', last: 176800, sym: '^BVSP' };
    MD.d.tape.it = [['IBOV', 181443.75, 176800, 'BRL', 'i', 'ibov'], ['ALFA3', 17.82, 16.54, 'BRL', 's', '']]; tapeMerge();
    __intra('^BVSP', __pts('2026-11-27', '13:00', 18, 177500, 181443.75), 173816.06); __intra('ALFA3.SA', pts, 15.77);
    ['1d', '5d', '1mo', '3mo', '6mo', 'ytd', '1y', '5y', 'max', 'yr'].forEach(function (rg) {
      __abrirIdx('ibov', rg); o.per['ibov ' + rg] = $('stk-b').innerHTML.replace(/skg\d+/g, 'skg'); __abrirAcao('ALFA3', 17.82, rg); o.per['alfa ' + rg] = $('stk-b').innerHTML.replace(/skg\d+/g, 'skg'); });
    S.trades = [{ id: 'a', side: 'buy', market: 'BR', ticker: 'ALFA3', date: '2026-06-01', qty: 10, price: 15, fx: 1, taxa: 0 }]; tapeMerge();
    o.compute = JSON.stringify(compute()); $('stk').hidden = true; render(); o.inicio = document.querySelector('[data-tab="resumo"]').innerHTML;
    return o;
  }, [FIXOS, T1130, pts]);
  const res = { fn: {}, per: {}, compute: sha(col.compute), inicio: sha(col.inicio) };
  Object.keys(col.fn).forEach(k => res.fn[k] = sha(col.fn[k])); Object.keys(col.per).forEach(k => res.per[k] = sha(col.per[k]));
  if (GRAVAR) { fs.writeFileSync(ESP, JSON.stringify(res, null, 1) + '\n'); console.log('gravado', ESP); }
  else if (fs.existsSync(ESP)) {
    const esp = JSON.parse(fs.readFileSync(ESP, 'utf8'));
    Object.keys(res.fn).forEach(k => ok('P10 texto idêntico à 1.83.3: ' + k, res.fn[k] === esp.fn[k], [k, res.fn[k], esp.fn[k]]));
    Object.keys(esp.per).forEach(k => ok('P8 página (' + k + ') idêntica à 1.83.3', res.per[k] === esp.per[k], [k, res.per[k], esp.per[k]]));
    ok('P11 compute() da carteira idêntico à 1.83.3', res.compute === esp.compute, 1); ok('P11 tela do Início idêntica à 1.83.3', res.inicio === esp.inicio, 1);
  } else ok('snapshot tests/esperado-periodo.json existe', false);
  ok('sem erro de JavaScript na página', p.__erros.length === 0, p.__erros);
  await p.context().close();
}

/* P12: a abertura não espera o arquivo de 5 min: com 300 ms e 1 s de atraso simulados no Worker, o cabeçalho está na tela no mesmo instante e o gráfico chega junto com o arquivo */
async function latencia(b) {
  const out = {};
  for (const ms of [300, 1000]) {
    const p = await novo(b, '11:30'); await p.__ctx.route('https://latencia.workers.dev/**', async r => { await new Promise(s => setTimeout(s, ms)); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ p: Array.from({ length: 18 }, (_, i) => [Date.parse('2026-11-27T13:00:00Z') / 1000 + i * 300, 17 + i * 0.05]), prev: 16.54, off: -10800, at: Date.parse('2026-11-27T14:25:00Z') / 1000 }) }); });
    await p.evaluate(() => { S.keys.proxy = 'https://latencia.workers.dev'; window.stkLoad = function () { }; stkOpen('ALFA3'); STK.d = __dacao('ALFA3', 17.8); stkRender(); });
    const t0 = Date.now(), cab = await p.evaluate(() => /Empresa ALFA3/.test(__txt()) && /17,80/.test(__txt()));
    await p.waitForSelector('#stk-b .gch svg', { timeout: 8000 }); out[ms] = { cab: cab, grafico: Date.now() - t0 };
    await p.context().close();
  }
  console.log('  latência do arquivo de 5 min (simulada): ' + JSON.stringify(out));
  ok('P12 com atraso de 300 ms e de 1 s o cabeçalho já aparece na hora e o gráfico chega logo depois do arquivo (±600 ms)', out[300].cab && out[1000].cab && out[300].grafico >= 250 && out[300].grafico < 300 + 600 && out[1000].grafico >= 950 && out[1000].grafico < 1000 + 600, out);
}

(async () => {
  if (arg.includes('--mutantes')) {
    let fraco = 0; const nomes = Object.keys(MUTANTES);
    nomes.forEach(n => {
      const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mutp-')), [f, a, b2] = MUTANTES[n];
      cp.execSync('tar --exclude=node_modules --exclude=.git -cf - . | tar -xf - -C ' + tmp, { cwd: RAIZ, shell: '/bin/bash' }); try { fs.symlinkSync(path.join(RAIZ, 'node_modules'), path.join(tmp, 'node_modules')); } catch (e) { }
      const tx = fs.readFileSync(path.join(tmp, f), 'utf8'); if (!tx.includes(a)) { console.log('✗ trecho do defeito não achado:', n); fraco++; return; } fs.writeFileSync(path.join(tmp, f), tx.replace(a, () => b2));
      const r = n === 'arquivo-fora-do-sw' ? cp.spawnSync('node', ['tests/teste.js'], { encoding: 'utf8', cwd: tmp, timeout: 300000 }) : cp.spawnSync('node', [__filename, '--mut', n], { encoding: 'utf8', cwd: RAIZ, timeout: 300000, env: Object.assign({}, process.env, { APORTE_APP_DIR: tmp }) });
      const saida = (r.stdout || '') + (r.stderr || ''), quebrou = r.status !== 0, qual = (saida.match(/^✗ .{0,80}/gm) || []).slice(0, 2).join(' | ');
      console.log((quebrou ? '✓ pego   ' : '✗ ESCAPOU') + ' ' + n + (quebrou ? '  → ' + qual : '')); if (!quebrou) fraco++;
    });
    console.log(fraco ? '✗ ' + fraco + ' defeito(s) escaparam dos testes' : '✓ Todos os ' + nomes.length + ' defeitos inseridos foram pegos pelos testes'); process.exit(fraco ? 1 : 0);
  }
  const b = await chromium.launch();
  try { await principal(b); if (!GRAVAR && !MUT) await latencia(b); } catch (e) { falhas++; console.log('✗ erro no teste:', e.message); }
  await b.close();
  console.log(falhas ? '✗ Período: ' + falhas + ' falha(s) de ' + total : '✓ Período: ' + total + ' conferências ok'); process.exit(falhas ? 1 : 0);
})();
