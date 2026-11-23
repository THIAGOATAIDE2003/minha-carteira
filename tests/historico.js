/* Testes da seção Histórico (js/historico.js): node tests/historico.js */
const path = require('path');
const { chromium } = require('playwright');
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra)); } };
const linhas = []; let a = 2023, t = 4;
for (let i = 0; i < 12; i++) { linhas.push({ a, t, ref: a + '-' + ['03-31', '06-30', '09-30', '12-31'][t - 1], rec: 1e9, luc: i === 11 ? 1.3e8 : 1e8, pl: 1e9, cx: 1e8, div: 4e8, fco: 1e8, ml: i === 11 ? 11.8 : 10, dl: 3e8, roe: i >= 3 ? 40 : null }); t++; if (t === 5) { a++; t = 1; } }
linhas[9].luc = -2.3e9; linhas[9].ml = -230; linhas[9].roe = -1.5;
const DOC = {
  v: 1, tk: 'TEST3', cnpj: '00.000.000/0001-00', fonte: 'CVM Dados Abertos (ITR e DFP)', ref: '2026-09-30', coleta: '2026-11-23', t: linhas,
  cmp: {
    yoy: { de: '3T25', para: '3T26', tend: 'melhorando', itens: [{ c: 'rec', cur: 1e9, ref: 9e8, ch: 0.111, s: 1 }, { c: 'luc', cur: 1.3e8, ref: 1e8, ch: 0.3, s: 1 }, { c: 'ml', cur: 11.8, ref: 10, ch: 1.8, s: 1 }, { c: 'fco', cur: 1e8, ref: 1e8, ch: 0, s: 0 }, { c: 'dl', cur: 3e8, ref: 3.5e8, ch: -0.143, s: 1 }] },
    qoq: { de: '2T26', para: '3T26', tend: 'piorando', itens: [{ c: 'rec', cur: 1e9, ref: 1e9, ch: 0, s: 0 }, { c: 'luc', cur: 1.3e8, ref: 1.5e8, ch: -0.133, s: -1 }] }
  },
  nr: [{ q: '4T25', tipo: 'baixo', luc: -2.3e9, med: 1e8 }, { q: '1T24', tipo: 'alto', luc: 9e8, med: 1e8 }]
};
(async () => {
  const b = await chromium.launch(), p = await b.newPage(), erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(APP); await p.waitForTimeout(800);
  const R = await p.evaluate((doc) => {
    FIN['cvm/TEST3'] = { d: doc, at: Date.now() }; FIN['cvm/VAZIO3'] = { d: null, at: Date.now() };
    HIL.TEST3 = HIL.VAZIO3 = 1;
    return { cheio: hiHtml('TEST3'), vazio: hiHtml('VAZIO3'), item: hiItem({ c: 'luc', cur: 1, ref: -5, ch: null, s: 1 }), ml: hiItem({ c: 'ml', ch: -1.2, s: -1 }), sem: hiItem({ c: 'luc', ch: null, s: null }) };
  }, DOC);
  ok('mostra a tendência contra o mesmo trimestre do ano passado', /3T26 contra 3T25 \(mesmo trimestre do ano passado\): <b class="gain">Melhorando/.test(R.cheio), R.cheio.slice(0, 600));
  ok('mostra a tendência contra o trimestre anterior', /3T26 contra 2T26 \(trimestre anterior\): <b class="loss">Piorando/.test(R.cheio));
  ok('mostra as variações (receita, margem em p.p., dívida líquida)', /Receita[\s\S]*?\+11,10%/.test(R.cheio) && /\+1,80 p\.p\./.test(R.cheio) && /Dívida líquida[\s\S]*?−14,30%/.test(R.cheio), R.cheio.slice(0, 1500));
  ok('aviso de lucro fora do padrão só para os últimos 8 trimestres', /4T25/.test(R.cheio) && /não se repete/.test(R.cheio) && !/1T24<\/b>: o lucro/.test(R.cheio));
  ok('tabela com 8 trimestres, o mais novo primeiro', (R.cheio.match(/<tr><td>\dT\d\d<\/td>/g) || []).length === 8 && /<tbody><tr><td>3T26<\/td>/.test(R.cheio));
  ok('mostra fonte, data de referência e data de coleta', /Fonte: CVM Dados Abertos/.test(R.cheio) && /30\/09\/2026/.test(R.cheio) && /23\/11\/2026/.test(R.cheio), R.cheio.slice(-500));
  ok('sem arquivo da empresa não mostra nada', R.vazio === '');
  ok('conta com base negativa diz melhorou/piorou', />melhorou</.test(R.item));
  ok('margem mostra pontos percentuais', /−1,20 p\.p\./.test(R.ml));
  ok('item sem dado some', R.sem === '');
  /* ROE: acima de 50% ou seguradora = indisponível */
  const E = await p.evaluate((doc) => {
    var d2 = JSON.parse(JSON.stringify(doc)); d2.t.forEach(function (r) { if (r.roe != null) r.roe = 68.2 });
    FIN['cvm/ALTO3'] = { d: d2, at: Date.now() }; HIL.ALTO3 = 1;
    var d3 = JSON.parse(JSON.stringify(doc)); FIN['cvm/SEG3'] = { d: d3, at: Date.now() }; HIL.SEG3 = 1;
    var rs = rkSect; rkSect = function (t) { return t === 'SEG3' ? ['Financeiro', 'Previdência e Seguros'] : rs(t) };
    var o = { alto: hiHtml('ALTO3'), seg: hiHtml('SEG3'), normal: hiHtml('TEST3'), nd: hiRoeNd('X3', 50.1), nd2: hiRoeNd('X3', 50), nd3: hiRoeNd('X3', null) }; rkSect = rs; return o;
  }, DOC);
  ok('ROE acima de 50% vira "indisponível para este setor"', /indisp\./.test(E.alto) && /indisponível para este setor/.test(E.alto) && !/68,20%/.test(E.alto));
  ok('seguradora: ROE indisponível mesmo abaixo de 50%', /indisp\./.test(E.seg) && !/40,00%/.test(E.seg));
  ok('empresa normal continua mostrando o ROE', /40,00%/.test(E.normal) && !/indisponível para este setor/.test(E.normal));
  ok('limite: 50 mostra, 50,1 não', E.nd === true && E.nd2 === false && E.nd3 === false, [E.nd, E.nd2, E.nd3]);
  /* carregando (ainda sem cache) */
  const L = await p.evaluate(() => { delete FIN['cvm/NOVO3']; HIL.NOVO3 = 1; return hiHtml('NOVO3'); });
  ok('enquanto baixa mostra "Carregando"', /Carregando o histórico/.test(L), L);
  ok('nenhum erro de JavaScript', erros.length === 0, erros);
  await b.close();
  console.log(falhas ? '✗ ' + falhas + ' de ' + total + ' falharam' : '✓ Histórico: ' + total + ' conferências ok');
  process.exit(falhas ? 1 : 0);
})();
