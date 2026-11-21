/* Robustez: abre todas as telas (abas, página da ação com todas as abas, Mercado, Ideias, busca, sino, assistente) com dados do robô vazios, parciais, nulos ou malucos
   e com textos perigosos; qualquer exceção, HTML injetado ou link javascript: falha. Uso: node tests/robustez.js */
const { chromium } = require('playwright');
const path = require('path'), APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 400, height: 900 } }), er = [];
  pg.on('pageerror', e => er.push('PAGEERR ' + e.message + ' @ ' + String(e.stack || '').split('\n')[1]));
  pg.on('console', m => { if (/Content Security|Refused to/i.test(m.text())) er.push('CSP ' + m.text().slice(0, 120)); });
  await pg.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  await pg.addInitScript(() => { window.__APORTE_TESTE__ = true; });
  await pg.goto(APP); await pg.waitForFunction(() => window.__aporte); await pg.waitForTimeout(600);
  const out = await pg.evaluate(() => { var R = { falhas: [] }, ok = function (n, f) { try { f() } catch (e) { R.falhas.push(n + ': ' + e.message + ' @ ' + String(e.stack).split('\n')[1].trim()) } };
    var d = [], t = Math.floor(Date.now() / 864e5) - 300, p = 30; for (var i = 0; i < 300; i++) { p += Math.sin(i / 9) * .6 + .12; d.push([t + i, +p.toFixed(2)]); }
    var H = { d: d, w: d, last: d[299][1], name: 'X', cur: 'BRL' };
    // 1) dados parciais / quebrados em tudo que é novo
    var casos = { vazio: {}, nulos: { cons: { v: 1, d: { ABCD3: { n: null, alvo: [null, null, null], rec: null, rk: null, ph: [[null, null, null, null]], est: { '0y': [null, null, null, null, null, null] } } } }, cvm: { q: { ABCD3: [[2025, 1, null, null], [2025, 2, null, null]] }, nomes: {} } },
      so_cons_sem_campos: { cons: { v: 1, d: { ABCD3: {} } } }, cons_sem_d: { cons: { v: 1 } }, cvm_curto: { cvm: { q: { ABCD3: [[2025, 1, 1, 1]] } } }, prejuizo: { cvm: { q: { ABCD3: [[2024, 1, 100, -10], [2024, 2, 100, -10], [2024, 3, 100, -10], [2024, 4, 100, -10], [2025, 1, 100, -20], [2025, 2, 100, -30]] } } },
      risk_ruim: { risk: { v: 1, ac: null, fatos: null, dir: null, pol: null } }, anual_ruim: { anual: { v: 1, d: { ABCD3: {} } } }, sobre_ruim: { sobre: { v: 1, e: {}, t: { ABCD3: 'zz' } } } };
    var old = MD.d, oldT = S.teses;
    Object.keys(casos).forEach(function (nome) {
      MD.d = Object.assign({ hist: { ABCD3: H, VTX: Object.assign({}, H, { cur: 'USD' }) }, idx: {}, at: Date.now(), fund: { cols: ['cot', 'pl', 'pvp', 'dy', 'roe', 'liq2m'], d: { ABCD3: [30, 10, 1.2, 5, 15, 5e7] } } }, casos[nome]);
      ['ABCD3', 'ZZZZ3', 'VTX', 'BOVA11'].forEach(function (tk) { ok(nome + '/' + tk + '/abrir', function () { stkOpen(tk) });
        ['res', 'val', 'ind', 'tri', 'tese', 'div', 'sob', 'rec', 'news'].forEach(function (v) { ok(nome + '/' + tk + '/' + v, function () { STV = v; stkRender() }) });
        ok(nome + '/' + tk + '/tese-forms', function () { S.teses = { [tk]: { papel: '<b>x</b>', res: '"aspas" & <script>', por: null, acomp: null, quebra: undefined, nota: '', at: 'lixo' } }; STV = 'tese'; stkRender(); var h = document.getElementById('stk-b').innerHTML; if (/<script>/.test(h)) throw new Error('XSS: script no HTML'); });
        ok(nome + '/' + tk + '/fechar', function () { stkClose() }); });
    });
    // 2) Mercado: todas as sub-abas, Ideias nos 3 modos, busca com textos estranhos
    MD.d = { hist: { ABCD3: H }, idx: {}, at: Date.now(), fund: { cols: ['cot', 'pl', 'pvp', 'dy', 'roe', 'liq2m', 'divpl', 'ml', 'cr5'], d: { ABCD3: [30, 10, 1.2, 5, 15, 5e7, 1, 12, 8], MGLU3: [10, 5, 1, 1, 5, 9e8, 1, 3, 1], B3SA3: [12, 8, 2, 5, 20, 8e8, 1, 30, 9] } }, cvm: { nomes: { MGLU3: 'MAGAZINE LUIZA S.A.', B3SA3: 'B3 S.A. - BRASIL, BOLSA, BALCAO' }, q: {} } };
    S.watch = ['ABCD3', 'MGLU3'];
    ['min', 'idx', 'ana', 'bc'].forEach(function (m) { ok('mercado/' + m, function () { MKV = m; renderMkt() });
      ['', 'b', 'B3', 'magalu', 'magazine lu', '(', '[a-z', '.*', '\\', '<img src=x>', 'ação', 'x'.repeat(300), '  ', 'á', '%'].forEach(function (q) { ok('busca/' + m + '/' + q.slice(0, 8), function () { var el = document.getElementById('mk-q'); if (el) { el.value = q; } mkSearch(q); var r = document.getElementById('mk-res'); if (r && /<img src=x>/.test(r.innerHTML)) throw new Error('XSS na busca'); }) }) });
    ['rel', 'opp', 'cls', 'set', 'cmp'].forEach(function (a) { ok('analise/' + a, function () { MKV = 'ana'; ANV = a; renderMkt() }) });
    ['lst', 'car', 'gar'].forEach(function (o) { ok('ideias/' + o, function () { MKV = 'ana'; ANV = 'opp'; OPV = o; OPC = { k: '' }; renderMkt() }) });
    ok('garHist', function () { localStorage.setItem('minha-carteira-v1-gar', 'lixo'); garHist(); garRes(); localStorage.setItem('minha-carteira-v1-gar', JSON.stringify({ r: { '2020-01-01': { i: null, l: [['A', null, null, null]] }, 'bad': {} } })); garHist(); localStorage.removeItem('minha-carteira-v1-gar') });
    // 2b) abas principais com dados do robô quebrados/parciais
    var ruins = [{}, { risk: { v: 1 } }, { risk: { v: 1, ac: { ABCD3: [{ t: null, s: null, d: 'x', l: 'javascript:alert(1)', g: 1 }] }, fatos: { ABCD3: [{ d: null, c: null, a: null, l: null, g: 1 }] }, dir: { ABCD3: [null] }, pol: { gov: { n: 'x', it: null } } } }, { cons: 'lixo', anual: 5, sobre: [], cvm: { q: { ABCD3: 'x' } } }, { idx: null, tape: { it: [['A', null, null, null]] }, why: { it: { x: null } } }, { fund: { cols: [], d: {} } }, { fund: null, hist: null, cvm: null }];
    ruins.forEach(function (m, i) { MD.d = Object.assign({ hist: { ABCD3: H }, idx: {}, at: Date.now(), fund: { cols: ['cot', 'pl', 'pvp', 'dy', 'roe', 'liq2m'], d: { ABCD3: [30, 10, 1.2, 5, 15, 5e7] } } }, m);
      ['resumo', 'ativos', 'proventos', 'mercado', 'mais'].forEach(function (tab) { ok('ruim' + i + '/tab-' + tab, function () { showTab(tab); render() }) });
      ['pos', 'evo', 'apo', 'perf', 'ext', 'risk', 'plano'].forEach(function (c) { ok('ruim' + i + '/carteira-' + c, function () { showTab('ativos'); CARV = c; render() }) });
      ok('ruim' + i + '/sino', function () { ndRender(); ntUnread() });
      ok('ruim' + i + '/stk', function () { stkOpen('ABCD3'); ['res', 'news', 'tri', 'tese', 'sob', 'rec'].forEach(function (v) { STV = v; stkRender() }); stkClose() }) });
    ok('xss-link', function () { MD.d = { hist: { ABCD3: H }, idx: {}, at: Date.now(), risk: { v: 1, at: new Date().toISOString(), ac: { ABCD3: [{ t: 'x', s: 's', d: new Date().toISOString().slice(0, 10), l: 'javascript:alert(1)', g: 1 }] }, fatos: { ABCD3: [{ d: new Date().toISOString().slice(0, 10), c: 'Fato Relevante', a: 'a', l: 'javascript:alert(2)', g: 0 }] }, dir: {}, pol: {} }, fund: { cols: ['cot'], d: { ABCD3: [30] } } }; stkOpen('ABCD3'); STV = 'news'; stkRender(); if (/href="javascript/i.test(document.getElementById('stk-b').innerHTML)) throw new Error('link javascript: sem filtro'); stkClose(); });
    // 3) assistente, carteira (RF) com teses estranhas, sino
    ok('thPapeis', function () { S.teses = { RF: { papel: null, res: null }, VT: null, X: {} }; thPapeis(); thRF(); });
    ok('asCtx', function () { S.teses = { ABCD3: { papel: 'p', res: 'r', acomp: ['a'], quebra: ['q'] } }; asCtx('o que acha de ABCD3'); });
    ok('render', function () { render() });
    ok('ndRender', function () { ndRender() });
    MD.d = old; S.teses = oldT; return R; });
  console.log(JSON.stringify(out, null, 1)); console.log('erros de página:', er.length ? er.join('\n') : 'nenhum'); await b.close(); if (out.falhas.length || er.length) { console.log('✗ Robustez: falhou'); process.exit(1); } console.log('✓ Robustez: tudo certo');
})();
