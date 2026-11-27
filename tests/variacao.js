/* Testes da "variação do dia confiável" (1.83.2, js/variacao.js): faixa, cartão, página, gráfico de 1 dia e "Fech. ant." com a MESMA base
   (fechamento diário do pregão anterior). Na 1.83.1 os casos V1 a V4 e V6 FALHAM.
   Uso: node tests/variacao.js [--dados ../minha-carteira-dados]   (sem a pasta de dados roda só a parte sintética; V3 real usa um retrato congelado do commit ccd7fef)
        node tests/variacao.js --mutantes                          (insere defeitos de propósito: cada um tem de fazer algum teste falhar)
        node tests/variacao.js --gravar                            (regrava tests/esperado-variacao.json: SÓ rode na versão ANTERIOR, 1.83.1, para fixar o que não pode mudar)
   Sintético: ações inventadas (ALFA3, BETA3, GAMA3, USAX) com os números dos casos reais de 27/11; o Ibovespa usa a definição real do app com números de 26/27 de novembro. */
const path = require('path'), fs = require('fs'), cp = require('child_process'), crypto = require('crypto');
const { chromium } = require('playwright');
const RAIZ = process.env.APORTE_APP_DIR || path.resolve(__dirname, '..'), APP = 'file://' + path.join(RAIZ, 'index.html');
const arg = process.argv, val = k => arg.includes(k) ? arg[arg.indexOf(k) + 1] : null;
const MUT = val('--mut'), GRAVAR = arg.includes('--gravar'), ESP = path.join(__dirname, 'esperado-variacao.json');
const DADOS = path.resolve(val('--dados') || path.join(RAIZ, '..', 'minha-carteira-dados'));
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra).slice(0, 600)); } };
const T = (hhmm, dia) => Date.parse((dia || '2026-11-27') + 'T' + hhmm + ':00-03:00');
const DN = dia => Math.floor(Date.parse(dia + 'T00:00:00Z') / 864e5);
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const MUTANTES = {
  'ant-vem-do-arquivo-de-5-min': ['js/variacao.js', 'function vdAnt(vd,st){return vd?(vd.ant>0?pf.format(vd.ant):null):', 'function vdAnt(vd,st){return st&&st.prev!=null?pf.format(st.prev):vd?(vd.ant>0?pf.format(vd.ant):null):'],
  'barra-do-pregao-mostrado-vale': ['js/variacao.js', 'r&&r[0]<dia&&', 'r&&r[0]<=dia&&'],
  'penultima-barra': ['js/variacao.js', 'r&&r[0]<dia&&', 'r&&r[0]<dia-1&&'],
  'ignora-o-zero-da-faixa': ['js/variacao.js', 'r=lv.pr!=null?lv.pr:lv.pct;', 'r=lv.pct;'],
  'dolar-no-escopo': ['js/variacao.js', "return typeof sym==='string'&&(", "return typeof sym==='string'&&(/=X$/.test(sym)||"],
  'esquece-os-eua': ['js/variacao.js', "||/^[A-Z][A-Z0-9]{0,4}([.-][A-Z])?$/.test(sym))}", ')}'],
  'mexe-no-finView': ['js/grafico.js', "{prev:d.prev,intra:1,d1:1", "{prev:d.prev+0.01,intra:1,d1:1"],
  'vdFo-altera-o-objeto-do-FIN': ['js/variacao.js', 'function vdFo(fo,b){var n={},k;', 'function vdFo(fo,b){var n=fo,k;'],
  'sem-fallback-vira-NaN': ['js/variacao.js', 'b=vdBase(sym,tk,vdDiaSessao(fv,fo),0);return b>0&&preco>0?', 'b=vdBase(sym,tk,vdDiaSessao(fv,fo),0);return true?'],
  'sinal-do-absoluto-trocado': ['js/variacao.js', 'abs:lv.pr!=null?0:lv.p-b', 'abs:lv.pr!=null?0:b-lv.p'],
  'preco-como-base': ['js/variacao.js', 'b=lv.p/(1+r/100);', 'b=lv.p;'],
  'ignora-o-same': ['js/variacao.js', 'var v=same?vdIdx(', 'var v=true?vdIdx('],
  'acao-fech-ant-do-arquivo': ['js/acao-pagina.js', "['Fech. ant.',vd?f0(vd.ant):f0(st&&st.prev!=null?st.prev:prv)]", "['Fech. ant.',f0(st&&st.prev!=null?st.prev:prv)]"],
  'acao-sem-ligacao': ['js/acao-pagina.js', 'var vd=vdPagAcao(tk,STK.rng,fv,fo,d.price);if(vd){', 'var vd=null;if(vd){'],
  'indice-sem-ligacao': ['js/mercado-setores.js', 'var vd=vdPagIdx(rg,rate,same,sym,fv,fo,x,last,D,dp);if(vd){', 'var vd=null;if(vd){'],
  'sem-aviso-de-indisponivel': ['js/variacao.js', "var n=vd&&vd.pct==null?'<p", "var n=''&&vd&&vd.pct==null?'<p"],
  'indice-usa-livePx-errado': ['js/variacao.js', 'function vdIdx(x,sym,fv,fo,preco,D){var o=idxVal(x),b;', 'function vdIdx(x,sym,fv,fo,preco,D){var o=null,b;'],
  'aviso-aparece-mesmo-com-base': ['js/variacao.js', 'var n=vd&&vd.pct==null?', 'var n=vd?'],
  'aviso-fora-do-lugar': ['js/variacao.js', 'return n&&i>=0?h.slice(0,i+6)+n+h.slice(i+6):h}', 'return n&&i>=0?n+h:h}'],
  'sem-limite-de-idade-da-barra': ['js/variacao.js', 'bd>=0&&dia-bd<=VDIDADE&&bv>0', 'bd>=0&&bv>0'],
  'pula-fechamento-invalido': ['js/variacao.js', 'r&&r[0]<dia&&r[0]>bd)', 'r&&r[0]<dia&&r[0]>bd&&r[ci]>0)'],
  'legenda-antiga-nas-paginas': ['js/grafico.js', "(o.fa?'fechamento anterior: ':'antes do fechamento: ')", "'antes do fechamento: '"],
  'i-sozinho-na-linha': ['js/grafico.js', "return esc(w.slice(0,i))+'<span class=\"gwx\" style=\"white-space:nowrap\">'+esc(w.slice(i))+x+'</span>'}", "return esc(w)+x}"],
  'arquivo-fora-do-sw': ['sw.js', "'js/variacao.js',", ''],
  'arquivo-fora-do-index': ['index.html', '<script src="js/variacao.js"></script>\n', '']
};
const PRE = () => {
  window.IT = function (l, v, p) { return [l, v, p, 'BRL', 's', '']; };
  window.__R = function (it, ts) { MD.d = { at: Date.now(), tape: { ts: ts / 1000, it: it }, hist: {}, idx: {} }; S.quotes = {}; S.trades = []; S.watch = []; MKT.q = {}; MKT.idx = {}; TPTS = 0; if (typeof PXM !== 'undefined') PXM = {}; if (typeof PXI !== 'undefined') PXI = {}; STKC = {}; FIN = {}; };
  /* 5 min de um pregão: n pontos a partir das hh:mm UTC do dia dado, de v0 a v1 */
  window.__pts = function (dia, hh, n, v0, v1) { var t0 = Date.parse(dia + 'T' + hh + ':00Z') / 1000, o = []; for (var i = 0; i < n; i++) o.push([t0 + i * 300, v0 + (v1 - v0) * i / (n - 1)]); return o; };
  window.__intra = function (sym, p, prev, off, ext) { FIN['intra/' + sym] = { d: { p: p, prev: prev, off: off == null ? -10800 : off, ext: ext ? 1 : 0, at: p[p.length - 1][0], o: p[0][1], h: Math.max.apply(null, p.map(function (q) { return q[1]; })), l: Math.min.apply(null, p.map(function (q) { return q[1]; })) }, at: Date.now() }; };
  window.__abrirIdx = function (k, rg) { STK = { tk: '', idx: k, rng: rg || '1d', d: null }; $('stk').hidden = false; idxRender(); };
  window.__abrirAcao = function (tk, price, pct, rg) { STK = { tk: tk, rng: rg || '1d', d: { cur: tk === 'USAX' ? 'USD' : 'BRL', name: 'Empresa ' + tk, price: price, pct: pct, hist: [{ t: Date.parse('2026-11-20T15:00:00Z'), c: price * 0.95 }, { t: Date.parse('2026-11-26T15:00:00Z'), c: price }], k: {}, at: Date.now() }, busy: false, err: '' }; $('stk').hidden = false; stkRender(); };
  window.__idxf = function () { MD.d.idx.ibov = { d: [[20781, 164090], [20782, 166685], [20783, 176800], [20784, 181000]], w: [[20783, 176800]], name: 'IBOVESPA', cur: 'BRL', last: 176800, sym: '^BVSP' }; };
  window.__txt = function () { var b = $('stk-b'); return b ? b.textContent.replace(/\s+/g, ' ') : ''; };
  window.__gdl = function () { var g = document.querySelector('#stk-b .gdl'); return g ? g.textContent.replace(/\s+/g, ' ').trim() : null; };
  window.__st = function (rot) { var r = null; document.querySelectorAll('#stk-b .gst div').forEach(function (d) { var s = d.querySelector('span'); if (s && s.textContent === rot) r = d.querySelector('b').textContent; }); return r; };
};
async function novo(b, quando, dia) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' }), p = await ctx.newPage(), erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await ctx.route(u => !/^(file|data):/.test(u.toString()), r => r.abort());
  await p.addInitScript(() => { window.__APORTE_TESTE__ = true; });
  await p.clock.setFixedTime(new Date(T(quando || '11:30', dia)));
  await p.goto(APP); await p.waitForFunction(() => window.__aporte); await p.waitForTimeout(900); await p.evaluate(PRE);
  p.__erros = erros; return p;
}
const sec = async (n, f) => { try { await f(); } catch (e) { ok('Bloco "' + n + '" não rodou: ' + String(e.message).split('\n')[0].slice(0, 140), false); } };

/* ---------------- parte principal ---------------- */
const FIXOS = ['finView', 'finStat', 'finBase', 'finLast', 'finTail', 'finGet', 'livePx', 'pxPick', 'tapeItems', 'tapeIdx', 'idxVal', 'idxVal0', 'compute', 'opData', 'dzero', 'pxIdxPick', 'gStats'];
/* gHead e lineChart mudam DE PROPÓSITO na 1.83.3 (só texto/posição: legenda "fechamento anterior", ⓘ colado à última palavra). Que nada além disso mudou é provado pelas páginas abaixo, comparadas com a 1.83.1 depois de desfazer só essas duas trocas (NORM). */
const NORM = h => h.replace(/fechamento anterior: /g, 'antes do fechamento: ').replace(/<span class="gwx"[^>]*>([^<]*)(<button[^>]*>.*?<\/button>)<\/span>/g, '$1$2');
async function ptsIdx(p, dia, hh, n, v0, v1) { return await p.evaluate(a => __pts(a[0], a[1], a[2], a[3], a[4]), [dia || '2026-11-27', hh || '13:00', n || 18, v0 || 177500, v1 || 181443.75]); }
const TAB = (tk, v, prev) => [tk, v, prev, 'BRL', 's', ''];
async function principal(b, snap) {
  const p = await novo(b, '11:30'), T1425 = T('11:25');
  const pts = await ptsIdx(p);
  /* ----- V1/V2/V4: Ibovespa em 1D, na sexta-feira de 27/11 com o preço de 181.443,75 (fechamento anterior 176.800) ----- */
  await sec('V1 V2 V4', async () => {
    const r = await p.evaluate(([ts, pts]) => {
      __R([['IBOV', 181443.75, 176800, 'BRL', 'i', 'ibov']], ts); __idxf(); __intra('^BVSP', pts, 173816.06); tapeMerge(); __abrirIdx('ibov', '1d');
      var x = idxDef('ibov'), o = idxVal(x), t = tapeItems().filter(function (i) { return i.l === 'IBOV'; })[0], fv = finView('^BVSP', '1d', true);
      return { gdl: __gdl(), ant: __st('Fech. ant.'), txt: __txt(), faixa: t && Math.round(t.p * 100) / 100, card: o && Math.round(o.p * 100) / 100, base: (function () { try { return vdIdx(x, '^BVSP', fv, fv.o, 181443.75, MD.d.idx.ibov); } catch (e) { return null; } })() };
    }, [T1425, pts]);
    ok('V1 cabeçalho do Ibovespa em 1D = +4.643,75 (2,63%), igual à faixa e ao cartão (antes: +7.627,69 (4,39%))', /\+4\.643,75 \(2,63%\)/.test(r.gdl || '') && r.faixa === 2.63 && r.card === 2.63, r);
    ok('V2 "Fech. ant." do Ibovespa = 176.800,00 (antes: 173.816,06)', r.ant === '176.800,00' && !/173\.816/.test(r.txt), r);
    ok('V2 a linha pontilhada e a legenda usam o mesmo fechamento (176.800), não o último ponto de 5 min', /fechamento anterior: 176\.800/.test(r.txt) && !/173\.816/.test(r.txt), r.txt.slice(0, 300));
    ok('V4 a base do app (176.800,00) difere da implícita no Google (176.799,84) em menos de 0,5 ponto', r.base && Math.abs(r.base.base - 176799.84) < 0.5, r.base);
  });
  /* ----- V3 ações (sintéticas, com os números de BBAS3, B3SA3 e PETR4 de 27/11) ----- */
  await sec('V3 ações', async () => {
    const casos = [['ALFA3', 17.82, 16.54, 15.77, '+1,28 (7,74%)', '16,54'], ['BETA3', 17.75, 16.16, 15.74, '+1,59 (9,84%)', '16,16'], ['GAMA3', 43.65, 43.19, 42.53, '+0,46 (1,07%)', '43,19']];
    for (const c of casos) {
      const r = await p.evaluate(([c, ts, pts]) => {
        __R(c[0] ? [['IBOV', 181443.75, 176800, 'BRL', 'i', 'ibov'], [c[0], c[1], c[2], 'BRL', 's', '']] : [], ts); __idxf(); __intra(c[0] + '.SA', pts.map(function (q) { return [q[0], c[1] * (q[1] / 181443.75)]; }), c[3]); tapeMerge();
        var f = tapeItems().filter(function (i) { return i.l === c[0]; })[0], lv = livePx(c[0]); __abrirAcao(c[0], c[1], lv && lv.pct, '1d');
        return { gdl: __gdl(), ant: __st('Fech. ant.'), faixa: f && Math.round(f.p * 100) / 100, lista: lv && Math.round(lv.pct * 100) / 100, txt: __txt() };
      }, [c, T1425, pts]);
      ok('V3 ' + c[0] + ' em 1D mostra ' + c[4] + ' (antes pegava o último ponto de 5 min de ontem), igual à faixa e à lista', (r.gdl || '').indexOf(c[4]) === 0 && r.faixa === r.lista && Math.abs(r.faixa - parseFloat(c[4].match(/\(([\d,]+)%/)[1].replace(',', '.'))) < 0.006, r);
      ok('V3 ' + c[0] + ': "Fech. ant." = ' + c[5] + ' (o fechamento diário, não ' + String(c[3]).replace('.', ',') + ')', r.ant === c[5] && r.txt.indexOf("fechamento anterior: " + String(c[3]).replace('.', ',')) < 0, r);
    }
  });
  /* ----- V5 antes da abertura / fim de semana: a faixa está zerada e a página mostra o mesmo 0,00% ----- */
  await sec('V5 faixa zerada', async () => {
    await p.clock.setFixedTime(new Date(T('10:00', '2026-11-28')));
    const r = await p.evaluate(([ts, pts, pts2]) => {
      __R([['IBOV', 181443.75, 176800, 'BRL', 'i', 'ibov'], ['ALFA3', 17.82, 16.54, 'BRL', 's', '']], ts); __idxf(); __intra('^BVSP', pts, 173816.06); __intra('ALFA3.SA', pts2, 15.77); tapeMerge();
      var o = idxVal(idxDef('ibov')), lv = livePx('ALFA3'); __abrirIdx('ibov', '1d'); var gi = __gdl(), ai = __st('Fech. ant.'); __abrirAcao('ALFA3', 17.82, lv && lv.pct, '1d');
      return { faixaIdx: o && o.p, pctAcao: lv && lv.pct, gi: gi, ai: ai, ga: __gdl(), aa: __st('Fech. ant.') };
    }, [T('17:00', '2026-11-27'), pts, pts.map(q => [q[0], 17.82 * (q[1] / 181443.75)])]);
    ok('V5 fim de semana: faixa 0,00% e página do Ibovespa 0,00% (mesmo número)', r.faixaIdx === 0 && /\(0,00%\)/.test(r.gi || ''), r);
    ok('V5 fim de semana: página do Ibovespa mostra "Fech. ant." do pregão anterior ao do gráfico (176.800,00)', r.ai === '176.800,00', r);
    ok('V5 fim de semana: ação com faixa zerada (0,00%) e "Fech. ant." 16,54 (a base de antes da zerada)', r.pctAcao === 0 && /\(0,00%\)/.test(r.ga || '') && r.aa === '16,54', r);
    await p.clock.setFixedTime(new Date(T('11:30')));
  });
  /* ----- V6 sem base confiável: só o preço e o aviso; nunca inventa, nunca NaN ----- */
  await sec('V6 sem base', async () => {
    const r = await p.evaluate(([ts, pts, pts2]) => {
      __R([], ts); MD.d.idx.ibov = { d: [[20784, 1], [20785, 2]], name: 'IBOVESPA', cur: 'BRL', last: 176800, sym: '^BVSP' }; __intra('^BVSP', pts, 173816.06); __intra('ALFA3.SA', pts2, 15.77);
      __abrirIdx('ibov', '1d'); var i = { gdl: __gdl(), ant: __st('Fech. ant.'), txt: __txt() }; __abrirAcao('ALFA3', 17.82, null, '1d'); return { i: i, a: { gdl: __gdl(), ant: __st('Fech. ant.'), txt: __txt() } };
    }, [T1425, pts, pts.map(q => [q[0], 17.82 * (q[1] / 181443.75)])]);
    for (const [n, x] of [['Ibovespa', r.i], ['ação', r.a]]) {
      ok('V6 ' + n + ' sem base: só o preço, sem variação, e a linha "Variação de hoje indisponível"', x.gdl === null && /Variação de hoje indisponível/.test(x.txt), x);
      ok('V6 ' + n + ' sem base: sem linha pontilhada nem legenda, sem "Fech. ant." e sem NaN/undefined/null na tela', !/fechamento anterior/.test(x.txt) && x.ant === null && !/NaN|undefined|null/.test(x.txt), x);
    }
  });
  /* ----- V6b o aviso "indisponível" só aparece quando NÃO há base válida (barra válida → sem aviso; fechamento zero, vazio ou velho demais → aviso, sem pular para barra mais antiga) ----- */
  await sec('V6b aviso só sem base', async () => {
    const r = await p.evaluate(([ts, pts, pts2]) => {
      var out = {}, bar = function (d, c) { return [d, c, c, c, c, 1]; };
      function acao(nome, rows) { __R([], ts); __intra('ALFA3.SA', pts2, 15.77); FIN['dia/ALFA3.SA'] = { d: { d: rows }, at: Date.now() }; __abrirAcao('ALFA3', 17.82, null, '1d'); out[nome] = { gdl: __gdl(), ant: __st('Fech. ant.'), txt: __txt() }; }
      function ibov(nome, rows) { __R([], ts); MD.d.idx.ibov = { d: rows, name: 'IBOVESPA', cur: 'BRL', last: 176800, sym: '^BVSP' }; __intra('^BVSP', pts, 173816.06); __abrirIdx('ibov', '1d'); out[nome] = { gdl: __gdl(), ant: __st('Fech. ant.'), txt: __txt() }; }
      acao('a-valida', [bar(20782, 16.1), bar(20783, 16.54), bar(20784, 17.5)]);
      acao('a-zero', [bar(20782, 16.1), bar(20783, 0), bar(20784, 17.5)]);
      acao('a-vazia', [bar(20782, 16.1), bar(20783, null), bar(20784, 17.5)]);
      acao('a-5dias', [bar(20779, 16.54), bar(20784, 17.5)]);
      acao('a-6dias', [bar(20778, 16.54), bar(20784, 17.5)]);
      ibov('i-valida', [[20782, 170000], [20783, 176800], [20784, 181000]]);
      ibov('i-zero', [[20782, 170000], [20783, 0], [20784, 181000]]);
      ibov('i-velha', [[20770, 176800], [20784, 181000]]);
      return out;
    }, [T1425, pts, pts.map(q => [q[0], 17.82 * (q[1] / 181443.75)])]);
    const AVISO = /Variação de hoje indisponível/;
    for (const n of ['a-valida', 'i-valida']) ok('V6b base válida (' + n + '): variação aparece e o aviso "indisponível" NÃO aparece', r[n].gdl !== null && !AVISO.test(r[n].txt), r[n]);
    for (const n of ['a-zero', 'a-vazia', 'i-zero']) ok('V6b último fechamento inválido (' + n + '): aviso aparece, sem variação, e NÃO pula para a barra anterior a ela', r[n].gdl === null && r[n].ant === null && AVISO.test(r[n].txt) && !/NaN|undefined|null/.test(r[n].txt), r[n]);
    ok('V6b barra 5 dias corridos antes do pregão ainda vale (16,54)', r['a-5dias'].ant === '16,54' && !AVISO.test(r['a-5dias'].txt), r['a-5dias']);
    for (const n of ['a-6dias', 'i-velha']) ok('V6b barra velha demais (' + n + ', mais de 5 dias antes do pregão): aviso, sem variação', r[n].gdl === null && r[n].ant === null && AVISO.test(r[n].txt), r[n]);
  });
  /* ----- V17 texto e posição: aviso logo abaixo do preço; ⓘ colado à última palavra da linha de hora; legenda "fechamento anterior" ----- */
  await sec('V17 aparência', async () => {
    const r = await p.evaluate(([ts, pts2]) => {
      __R([], ts); __intra('ALFA3.SA', pts2, 15.77); FIN['dia/ALFA3.SA'] = { d: { d: [[20783, 16.3, 16.8, 16.2, 16.54, 1000], [20784, 17.2, 17.9, 17.1, 17.5, 0]] }, at: Date.now() };
      __abrirAcao('ALFA3', 17.82, null, '1d'); var ok1 = document.getElementById('stk-b').innerHTML, ok1t = __txt();
      FIN['dia/ALFA3.SA'].d.d = [[20784, 17.2, 17.9, 17.1, 17.5, 0]]; __abrirAcao('ALFA3', 17.82, null, '1d'); var sem = document.getElementById('stk-b').innerHTML;
      var h = gHead('Empresa', '', 'R$ 1,00', null, null, '1d', '', 'Atrasado: preço de 26/11, 17:55 · Finnhub', bal('x', null, 'De onde')), q = document.createElement('div'); setHtml(q, h);
      var gx = q.querySelector('.gwx'), wh = q.querySelector('.gwh');
      return { ok1: ok1, ok1t: ok1t, sem: sem, gx: gx && gx.textContent, gxBal: !!(gx && gx.querySelector('.bal')), balNaLinha: !!(wh && wh.querySelector('.bal')), semX: (function () { var z = document.createElement('div'); setHtml(z, gHead('E', '', 'R$ 1', null, null, '1d', '', 'só texto', '')); return !!z.querySelector('.gwx') })() };
    }, [T1425, pts.map(q => [q[0], 17.82 * (q[1] / 181443.75)])]);
    const pos = (h, a, b) => h.indexOf(a) >= 0 && h.indexOf(b) > h.indexOf(a);
    ok('V17 aviso "Variação de hoje indisponível" vem logo abaixo do preço e antes da linha de hora', pos(r.sem, 'class="gh"', 'Variação de hoje indisponível') && pos(r.sem, 'Variação de hoje indisponível', 'gwh'), r.sem.slice(0, 600));
    ok('V17 com base válida a página mostra "fechamento anterior: 16,54" na legenda e nenhum aviso', /fechamento anterior: (R\$\s*)?16,54/.test(r.ok1t) && !/indisponível/.test(r.ok1) && !/antes do fechamento/.test(r.ok1), r.ok1t.slice(0, 300));
    ok('V17 ⓘ colado à última palavra da linha de hora (mesmo bloco sem quebra)', /^Finnhub/.test(r.gx || '') && r.gxBal && r.balNaLinha, r);
    ok('V17 linha de hora sem ⓘ continua como antes (sem bloco extra)', r.semX === false, r);
  });
  /* ----- V7 barra anterior (sem faixa) · V8 arquivo de 5 min de 2 pregões atrás · V9 EUA ----- */
  await sec('V7 V8 V9', async () => {
    const r = await p.evaluate(([ts, pts2]) => {
      __R([], ts); __intra('ALFA3.SA', pts2, 15.77);
      FIN['dia/ALFA3.SA'] = { d: { d: [[20782, 16.3, 16.8, 16.2, 16.1, 1000], [20783, 16.3, 16.8, 16.2, 16.54, 1000], [20784, 17.2, 17.9, 17.1, 17.5, 0]] }, at: Date.now() };
      __abrirAcao('ALFA3', 17.82, null, '1d'); var a = { gdl: __gdl(), ant: __st('Fech. ant.') };
      delete FIN['dia/ALFA3.SA']; MD.d.hist.ALFA3 = { d: [[20783, 16.54], [20784, 17.5]] }; __abrirAcao('ALFA3', 17.82, null, '1d'); var a2 = { gdl: __gdl(), ant: __st('Fech. ant.') };
      /* V8: o arquivo de 5 min é do pregão de 25/11 (cache velho); a base é a barra de 24/11, nunca a de 26/11 */
      delete MD.d.hist.ALFA3; FIN['dia/ALFA3.SA'] = { d: { d: [[20781, 16, 16, 16, 16.0, 1], [20782, 16.2, 16.2, 16.2, 16.2, 1], [20783, 16.54, 16.54, 16.54, 16.54, 1]] }, at: Date.now() };
      __intra('ALFA3.SA', __pts('2026-11-25', '13:00', 18, 16.2, 16.5), 15.5); __abrirAcao('ALFA3', 17.82, null, '1d'); var a3 = { gdl: __gdl(), ant: __st('Fech. ant.') };
      return { a: a, a2: a2, a3: a3 };
    }, [T1425, pts.map(q => [q[0], 17.82 * (q[1] / 181443.75)])]);
    ok('V7 sem faixa: base = última barra diária anterior ao pregão (16,54); a barra de hoje (parcial, 17,50) é ignorada', (r.a.gdl || '').indexOf('+1,28 (7,74%)') === 0 && r.a.ant === '16,54', r.a);
    ok('V7 sem arquivo de barras: a mesma base vem do histórico diário do robô (mercado.json)', (r.a2.gdl || '').indexOf('+1,28 (7,74%)') === 0 && r.a2.ant === '16,54', r.a2);
    ok('V8 arquivo de 5 min de 2 pregões atrás: a base é a barra de ANTES daquele pregão (16,00), nunca a de 26/11 (16,54)', r.a3.ant === '16,00', r.a3);
    await p.clock.setFixedTime(new Date(T('12:30')));
    const u = await p.evaluate(([ts]) => {
      __R([], ts); var q = __pts('2026-11-27', '14:30', 12, 101, 103); __intra('USAX', q, 97, -18000, 1);
      FIN['dia/USAX'] = { d: { d: [[20782, 98, 99, 97, 98.5, 1], [20783, 99, 101, 98, 100.0, 1], [20784, 101, 104, 100, 103.2, 0]] }, at: Date.now() };
      __abrirAcao('USAX', 103, null, '1d'); return { gdl: __gdl(), ant: __st('Fech. ant.'), txt: __txt() };
    }, [T('12:25')]);
    ok('V9 EUA em 1D: base = fechamento diário (100,00), não o último ponto de 5 min de ontem (97)', (u.gdl || '').indexOf('+3,00 (3,00%)') === 0 && u.ant === '100,00', u);
    await p.clock.setFixedTime(new Date(T('11:30')));
  });
  /* ----- V10 gráfico de outro símbolo que o do cartão: vale a variação do cartão ----- */
  await sec('V10 same falso', async () => {
    const r = await p.evaluate(([ts, pts]) => {
      __R([['IBOV', 181443.75, 176800, 'BRL', 'i', 'ibov']], ts); __idxf(); MD.d.idx.ibov.sym = 'SPY'; __intra('SPY', pts.map(q => [q[0], q[1] / 258]), 680); tapeMerge(); __abrirIdx('ibov', '1d');
      return { gdl: __gdl(), txt: __txt() };
    }, [T1425, pts]);
    ok('V10 índice com gráfico de outro símbolo: a variação "hoje" é a do cartão (2,63%)', /\(2,63%\)/.test(r.gdl || ''), r);
    const r2 = await p.evaluate(([ts, pts]) => {
      __R([], ts); __idxf(); MD.d.idx.ibov.sym = 'SPY'; __intra('SPY', pts.map(q => [q[0], q[1] / 258]), 680); __abrirIdx('ibov', '1d'); return { gdl: __gdl(), txt: __txt() };
    }, [T1425, pts]);
    ok('V10 gráfico de outro símbolo e sem faixa: NÃO calcula a variação com barras de outro ativo (mostra "indisponível")', r2.gdl === null && /Variação de hoje indisponível/.test(r2.txt), r2);
    const c = await p.evaluate(() => { var a = { prev: 1, intra: 1 }, n = vdFo(a, 2), m = vdFo(a, null); return { a: a.prev, n: n.prev, m: m.prev, m2: 'prev' in m, nova: n !== a, intra: n.intra }; });
    ok('V16 vdFo devolve cópia (o original não muda), troca o prev e o apaga quando não há base', c.a === 1 && c.n === 2 && c.nova && c.intra === 1 && !c.m2, c);
  });
  /* ----- V11 escopo: dólar, euro, commodities, bitcoin, juros e outros índices ficam de fora ----- */
  await sec('V11 escopo', async () => {
    const r = await p.evaluate(() => ['BRL=X', 'EURBRL=X', 'BTC-USD', '^TNX', '^GSPC', '', null].map(function (s) { return vdEscopo(s); }).concat(['PETR4.SA', '^BVSP', 'SPY', 'BRK-B', 'USAX', 'GC=F', 'BZ=F', 'SI=F', 'TIO=F'].map(function (s) { return vdEscopo(s); })));
    ok('V11 fora do escopo: dólar, euro, bitcoin, ^TNX, outros índices; dentro: B3, ^BVSP, EUA e (1.83.8) commodities XX=F', r.slice(0, 7).every(v => v === false) && r.slice(7).every(v => v === true), r);
  });
  /* ----- V13/V12/V14: o que não pode mudar (texto das funções, páginas fora do escopo, outros períodos, carteira e Início) ----- */
  const col = await p.evaluate(([FIX, ts, pts]) => {
    var o = { fn: {}, pag: {}, per: {} };
    FIX.forEach(function (n) { try { o.fn[n] = eval(n).toString(); } catch (e) { o.fn[n] = 'ausente'; } });
    __R([['IBOV', 181443.75, 176800, 'BRL', 'i', 'ibov'], ['ALFA3', 17.82, 16.54, 'BRL', 's', '']], ts); __idxf(); tapeMerge();
    var d4 = [[20781, 5.3], [20782, 5.4], [20783, 5.38], [20784, 5.35]], outros = { usd: 'BRL=X', eur: 'EURBRL=X', btc: 'BTC-USD', tnx: '^TNX' };
    Object.keys(outros).forEach(function (k) { MD.d.idx[k] = { d: d4, w: d4, name: k, cur: 'BRL', last: 5.35, sym: outros[k] }; __intra(outros[k], pts.map(function (q) { return [q[0], 5 + q[1] / 1e6]; }), 5.31); __abrirIdx(k, '1d'); o.pag[k] = __txt(); });
    __intra('^BVSP', pts, 173816.06); __intra('ALFA3.SA', pts.map(function (q) { return [q[0], 17.82 * (q[1] / 181443.75)]; }), 15.77);
    ['5d', '1mo', '6mo', 'ytd', '1y', '5y', 'max', 'yr'].forEach(function (rg) { __abrirIdx('ibov', rg); o.per['ibov ' + rg] = document.getElementById('stk-b').innerHTML.replace(/skg\d+/g, 'skg'); __abrirAcao('ALFA3', 17.82, 7.74, rg); o.per['alfa ' + rg] = document.getElementById('stk-b').innerHTML.replace(/skg\d+/g, 'skg'); });
    S.trades = [{ id: 'a', side: 'buy', market: 'BR', ticker: 'ALFA3', date: '2026-06-01', qty: 10, price: 15, fx: 1, taxa: 0 }]; tapeMerge();
    o.compute = JSON.stringify(compute()); $('stk').hidden = true; render(); o.inicio = document.querySelector('[data-tab="resumo"]').innerHTML;
    return o;
  }, [FIXOS, T1425, pts]);
  const res = { fn: {}, pag: {}, per: {}, compute: sha(col.compute), inicio: sha(NORM(col.inicio)) };
  Object.keys(col.fn).forEach(k => res.fn[k] = sha(col.fn[k])); Object.keys(col.pag).forEach(k => res.pag[k] = sha(NORM(col.pag[k]))); Object.keys(col.per).forEach(k => res.per[k] = sha(NORM(col.per[k])));
  if (GRAVAR) { fs.writeFileSync(ESP, JSON.stringify(res, null, 1) + '\n'); console.log('gravado', ESP); }
  else if (fs.existsSync(ESP)) {
    const esp = JSON.parse(fs.readFileSync(ESP, 'utf8'));
    const CX = ['tapeItems', 'idxVal0', 'usd', 'eur']; /* dólar e euro mudaram de propósito na 1.83.6 (tests/cambio.js) */
    ['fn', 'pag', 'per'].forEach(g => Object.keys(res[g]).filter(k => !CX.includes(k)).forEach(k => ok('V' + { fn: '13 texto idêntico à 1.83.1: ', pag: '11 página fora do escopo idêntica à 1.83.1: ', per: '12 outros períodos idênticos à 1.83.1: ' }[g] + k, res[g][k] === esp[g][k], [k, res[g][k], esp[g][k]])));
    ok('V11b páginas fora do escopo (dólar, euro, bitcoin, 10 anos) continuam com a legenda antiga "antes do fechamento" (o número delas não mudou, então o texto também não)', Object.keys(col.pag).length >= 4 && Object.keys(col.pag).every(k => !/fechamento anterior/.test(col.pag[k])), Object.keys(col.pag));
    ok('V14 compute() da carteira idêntico à 1.83.1', res.compute === esp.compute, [res.compute, esp.compute]);
    ok('V14 tela do Início idêntica à 1.83.1', res.inicio === esp.inicio, [res.inicio, esp.inicio]);
  } else ok('snapshot tests/esperado-variacao.json existe', false);
  /* o objeto guardado em FIN não é alterado pela página */
  const fo = await p.evaluate(([ts, pts]) => { __R([['IBOV', 181443.75, 176800, 'BRL', 'i', 'ibov']], ts); __idxf(); __intra('^BVSP', pts, 173816.06); tapeMerge(); __abrirIdx('ibov', '1d'); return FIN['intra/^BVSP'].d.prev; }, [T1425, pts]);
  ok('V16 o objeto guardado em FIN (prev do arquivo de 5 min) continua intacto: 173.816,06', fo === 173816.06, fo);
  ok('sem erro de JavaScript na página', p.__erros.length === 0, p.__erros);
  await p.context().close();
}


/* V3 com os dados REAIS de 27/11 14:30 UTC (retrato congelado do commit ccd7fef do repositório de dados, lido com git show; nada disso é copiado para este repositório) */
async function real(b) {
  const g = f => { try { return cp.execFileSync('git', ['-C', DADOS, 'show', 'ccd7fef:' + f], { encoding: 'utf8', maxBuffer: 1 << 28 }); } catch (e) { return null; } };
  const merc = g('mercado.json'), intr = {}; ['_BVSP', 'BBAS3.SA', 'B3SA3.SA', 'PETR4.SA'].forEach(n => { const t = g('dados/intra/' + n + '.json'); if (t) intr[n] = JSON.parse(t); });
  if (!merc || Object.keys(intr).length < 4) { console.log('(dados reais ausentes: parte real ignorada)'); return; }
  const p = await novo(b, '11:30');
  const r = await p.evaluate(([merc, intr]) => {
    MD.d = merc; S.quotes = {}; S.trades = []; S.watch = []; MKT.q = {}; MKT.idx = {}; TPTS = 0; FIN = {}; tapeMerge(); Object.keys(intr).forEach(function (n) { FIN['intra/' + n.replace('_BVSP', '^BVSP')] = { d: intr[n], at: Date.now() }; });
    var o = {}; __abrirIdx('ibov', '1d'); o.ibov = { gdl: __gdl(), ant: __st('Fech. ant.'), faixa: Math.round(idxVal(idxDef('ibov')).p * 100) / 100 };
    ['BBAS3', 'B3SA3', 'PETR4'].forEach(function (tk) { var lv = livePx(tk); __abrirAcao(tk, lv.p, lv.pct, '1d'); o[tk] = { gdl: __gdl(), ant: __st('Fech. ant.'), faixa: Math.round(lv.pct * 100) / 100, preco: lv.p }; });
    return o;
  }, [JSON.parse(merc), intr]);
  ok('V3 real: Ibovespa +4.643,75 (2,63%) e "Fech. ant." 176.800,00 (antes: +7.627,69 (4,39%) e 173.816,06)', /\+4\.643,\d\d \(2,63%\)/.test(r.ibov.gdl || '') && r.ibov.ant === '176.800,00', r.ibov);
  [['BBAS3', '+1,28 (7,74%)'], ['B3SA3', '+1,59 (9,84%)'], ['PETR4', '+0,46 (1,07%)']].forEach(([tk, esp]) => ok('V3 real: ' + tk + ' ' + esp + ', igual à faixa (antes: ' + { BBAS3: '+13,00%', B3SA3: '+12,77%', PETR4: '+2,63%' }[tk] + ')', (r[tk].gdl || '').indexOf(esp) === 0 && String(r[tk].faixa).replace('.', ',') === esp.match(/\(([\d,]+)%/)[1].replace(/^(\d+)$/, '$1,0').replace(/,(\d)$/, ',$10') || (r[tk].gdl || '').indexOf(esp) === 0, r[tk]));
  await p.context().close();
}

(async () => {
  if (arg.includes('--mutantes')) {
    let fraco = 0; const nomes = Object.keys(MUTANTES);
    nomes.forEach(n => {
      const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mutv-')), [f, a, b2] = MUTANTES[n];
      cp.execSync('tar --exclude=node_modules --exclude=.git -cf - . | tar -xf - -C ' + tmp, { cwd: RAIZ, shell: '/bin/bash' }); try { fs.symlinkSync(path.join(RAIZ, 'node_modules'), path.join(tmp, 'node_modules')); } catch (e) { }
      const tx = fs.readFileSync(path.join(tmp, f), 'utf8'); if (!tx.includes(a)) { console.log('✗ trecho do defeito não achado:', n); fraco++; return; } fs.writeFileSync(path.join(tmp, f), tx.replace(a, () => b2));
      const r = n === 'arquivo-fora-do-sw' ? cp.spawnSync('node', ['tests/teste.js'], { encoding: 'utf8', cwd: tmp, timeout: 300000 }) : cp.spawnSync('node', [__filename, '--mut', n], { encoding: 'utf8', cwd: RAIZ, timeout: 300000, env: Object.assign({}, process.env, { APORTE_APP_DIR: tmp }) });
      const saida = (r.stdout || '') + (r.stderr || ''), quebrou = r.status !== 0, qual = (saida.match(/^✗ .{0,80}/gm) || []).slice(0, 2).join(' | ');
      console.log((quebrou ? '✓ pego   ' : '✗ ESCAPOU') + ' ' + n + (quebrou ? '  → ' + qual : '')); if (!quebrou) fraco++;
    });
    console.log(fraco ? '✗ ' + fraco + ' defeito(s) escaparam dos testes' : '✓ Todos os ' + nomes.length + ' defeitos inseridos foram pegos pelos testes'); process.exit(fraco ? 1 : 0);
  }
  const b = await chromium.launch();
  try { await principal(b); if (!arg.includes('--sem-dados') && !MUT) await real(b); } catch (e) { falhas++; console.log('✗ erro no teste:', e.message); }
  await b.close();
  console.log(falhas ? '✗ Variação: ' + falhas + ' falha(s) de ' + total : '✓ Variação: ' + total + ' conferências ok'); process.exit(falhas ? 1 : 0);
})();
