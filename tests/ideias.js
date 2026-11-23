/* Testes da trava de qualidade da aba Ideias (opDU, opConf, bancos, Em verificação).
   Uso: node tests/ideias.js  (precisa do Playwright) */
const path = require('path');
const { chromium } = require('playwright');
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra)); } };
(async () => {
  const b = await chromium.launch(), p = await b.newPage(), erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(APP); await p.waitForTimeout(800);
  const T = (ymd, h) => Date.parse(ymd + 'T' + (h || '15:00:00') + '-03:00');
  const R = await p.evaluate(({ now, t }) => {
    const out = {};
    /* dias úteis: hoje = quarta 11/11/2026 */
    out.du0 = opDU(t.qua, now); out.du1 = opDU(t.ter, now); out.du2 = opDU(t.seg, now); out.du3 = opDU(t.sex, now);
    out.duSemData = opDU(0, now);
    /* mundo fictício: ticker XXXX3 com preço, balanço e indicadores controlados */
    const bom = { pl: 8, pvp: 1, roe: 15, dy: 7, ml: 12, divpl: 0.4, cr5: 6 };
    const mk = (N, pos, neg, sec) => ({ tk: 'XXXX3', A: { N: N, pos: new Array(pos).fill(1), neg: new Array(neg).fill(1), sec: sec || ['Energia', ''] } });
    const bal = (a, tri) => [[a, tri, 1e9, 1e8, 0, 0, 0]];
    const mundo = (px, q) => { S.quotes = { XXXX3: { price: 10, prev: 10, src: 'auto', at: px } }; MKT.q = {}; MD.d = { cvm: { q: { XXXX3: q } } }; };
    mundo(now - 3600e3, bal(2026, 3)); out.bom = opConf(mk(bom, 4, 1), now);
    mundo(now - 3600e3, bal(2026, 3)); out.falta2 = opConf(mk(Object.assign({}, bom, { ml: null, dy: null }), 4, 1), now);
    mundo(now - 3600e3, bal(2026, 3)); out.falta3 = opConf(mk(Object.assign({}, bom, { ml: null, dy: null, roe: null }), 4, 1), now);
    mundo(t.seg, bal(2026, 3)); out.velho = opConf(mk(bom, 4, 1), now);
    mundo(t.ter, bal(2026, 3)); out.ontem = opConf(mk(bom, 4, 1), now);
    mundo(now - 3600e3, bal(2026, 3)); out.pouco = opConf(mk(bom, 2, 1), now);
    mundo(now - 3600e3, []); out.semBal = opConf(mk(bom, 4, 1), now);
    mundo(now - 3600e3, bal(2025, 1)); out.balVelho = opConf(mk(bom, 4, 1), now);
    mundo(now - 3600e3, bal(2025, 4)); out.bal9m = opConf(mk(bom, 4, 1), now);
    const banco = Object.assign({}, bom, { ml: null, divpl: null });
    mundo(now - 3600e3, bal(2026, 3)); out.banco = opConf(mk(banco, 4, 1, ['Financeiro', '']), now);
    mundo(now - 3600e3, bal(2026, 3)); out.naoBanco = opConf(mk(banco, 4, 1), now);
    return out;
  }, { now: T('2026-11-11'), t: { qua: T('2026-11-11', '09:00:00'), ter: T('2026-11-10'), seg: T('2026-11-09'), sex: T('2026-11-06') } });
  ok('dias úteis: mesmo dia = 0', R.du0 === 0, R.du0);
  ok('dias úteis: ontem = 1', R.du1 === 1, R.du1);
  ok('dias úteis: anteontem = 2', R.du2 === 2, R.du2);
  ok('dias úteis: sexta vista na quarta = 3', R.du3 === 3, R.du3);
  ok('dias úteis: sem data = null', R.duSemData === null);
  ok('tudo bom = Alta', R.bom.n === 'Alta' && !R.bom.w.length, R.bom);
  ok('faltam 2 indicadores = Média (não Alta)', R.falta2.n === 'Média', R.falta2);
  ok('faltam 3 indicadores = Baixa', R.falta3.n === 'Baixa' && R.falta3.f === 0, R.falta3);
  ok('preço de 2 dias úteis = Baixa e diz o motivo', R.velho.n === 'Baixa' && R.velho.w.some(x => /preço velho \(de 09\/11\)/.test(x)), R.velho);
  ok('preço do pregão anterior (1 dia útil) ainda vale', R.ontem.n === 'Alta', R.ontem);
  ok('poucos sinais para a nota = Média', R.pouco.n === 'Média' && R.pouco.w.some(x => /poucos sinais/.test(x)), R.pouco);
  ok('sem balanço = Baixa', R.semBal.n === 'Baixa', R.semBal);
  ok('balanço de mais de 1 ano = Baixa', R.balVelho.n === 'Baixa', R.balVelho);
  ok('balanço de 9 meses = Média', R.bal9m.n === 'Média', R.bal9m);
  ok('banco sem margem/dívida não é penalizado por isso: só perde 1 ponto por inadimplência/Basileia/provisões não avaliadas', R.banco.n === 'Média' && R.banco.w.length === 1 && /não avaliadas/.test(R.banco.w[0]), R.banco);
  ok('mesma falta em não-banco é penalizada', R.naoBanco.n === 'Média', R.naoBanco);
  /* banco/financeira: sem preço justo, com o aviso na linha */
  const B = await p.evaluate(() => {
    const fx = (sec) => { const o = { tk: 'BANC4', d: { cur: 'BRL', price: 10, k: {} }, A: { N: {}, sec: sec, alr: [], pos: [], neg: [] }, V: null, score: 7, banco: sec[0] === 'Financeiro', al: [] }; return opRow(o, 0); };
    return { banco: fx(['Financeiro', '']), outro: fx(['Energia', '']) };
  });
  ok('linha de banco mostra "valuation de banco em breve"', /valuation de banco em breve/.test(B.banco) && /em breve<\/span>/.test(B.banco), B.banco);
  ok('linha de empresa comum não mostra isso', !/em breve/.test(B.outro));
  const S1 = await p.evaluate(() => {
    const mk = (n, w) => ({ tk: 'XXXX3', d: { cur: 'BRL', price: 10, k: {} }, A: { N: {}, sec: ['Energia', ''], alr: [], pos: [], neg: [] }, V: null, score: 7, al: [], cf: { n: n, w: w, f: 1 }, gq: { t: 'balanço do 3º tri de 2026 · preço de 1 h atrás', fraca: false, w: [] } });
    return { alta: opRow(mk('Alta', []), 1), media: opRow(mk('Média', ['faltam 2 de 7 indicadores']), 1), baixa: opRow(mk('Baixa', ['preço velho (de 09/11)']), 1) };
  });
  ok('selo Alta aparece com a data do balanço', /Confiança alta/.test(S1.alta) && /balanço do 3º tri/.test(S1.alta), S1.alta);
  ok('selo Média mostra o motivo', /Confiança média/.test(S1.media) && /faltam 2 de 7 indicadores/.test(S1.media));
  ok('selo Baixa mostra o motivo em destaque', /Confiança baixa/.test(S1.baixa) && /⚠ preço velho \(de 09\/11\)/.test(S1.baixa) && /opq fr/.test(S1.baixa), S1.baixa);
  const V = await p.evaluate(() => {
    const mk = (tk) => ({ tk: tk, d: { cur: 'BRL', price: 10, k: {} }, A: { N: {}, sec: ['Energia', ''], alr: [], pos: [], neg: [] }, V: null, score: 7, al: [], cf: { n: 'Baixa', w: ['preço velho (de 09/11)'], f: 0 } });
    return { rank: [opRankV(100, { f: 1 }), opRankV(100, { f: 0.8 }), opRankV(100, null)], vazio: opVerHtml({ X: [] }, ''), cheio: opVerHtml({ X: [mk('PINE4')] }, '<div class="opr oph"></div>') };
  });
  ok('ranking: Alta vale 100%, Média 80%', V.rank[0] === 100 && Math.abs(V.rank[1] - 80) < 1e-9 && V.rank[2] === 100, V.rank);
  ok('sem ações em verificação não mostra a seção', V.vazio === '');
  ok('Em verificação mostra título, contagem, ação e motivo', /Em verificação \(1\)/.test(V.cheio) && /PINE4/.test(V.cheio) && /preço velho \(de 09\/11\)/.test(V.cheio), V.cheio);
  const X = await p.evaluate(() => {
    const mk = (n, w, up) => ({ tk: 'XXXX3', d: { cur: 'BRL', price: 10, k: {} }, A: { N: {}, sec: ['Energia', ''], alr: [], pos: [], neg: [] }, V: { med: 10 * (1 + up), up: up }, score: 7, al: [], cf: { n: n, w: w.slice(), f: n === 'Alta' ? 1 : 0.8 } });
    const a = opSanidade(mk('Média', ['faltam 2 de 7 indicadores'], 0.9)), b = opSanidade(mk('Alta', [], 0.9)), c = opSanidade(mk('Média', [], 0.4)), d = opSanidade(mk('Alta', [], 0.5)), e = opSanidade(mk('Baixa', ['preço velho'], 0.9));
    return { a: a.cf, b: b.cf, c: c.cf, d: d.cf, e: e.cf, rb: opRow(b, 1), ra: opRow(a, 1) };
  });
  ok('Média + potencial > 50% vai para verificação com o motivo', X.a.ext === true && X.a.w[0] === 'potencial extremo, dados incompletos' && X.a.w.length === 2, X.a);
  ok('Alta + potencial > 50% fica normal com aviso', !X.b.ext && X.b.aviso === 'potencial muito alto, confira' && /Potencial muito alto, confira/.test(X.rb), X.b);
  ok('Média com potencial de 40% não é mexida', !X.c.ext && !X.c.aviso && !X.c.w.length, X.c);
  ok('exatamente 50% não dispara', !X.d.ext && !X.d.aviso, X.d);
  ok('Baixa não ganha motivo extra', !X.e.ext && X.e.w.length === 1, X.e);
  ok('linha em verificação mostra ⚠ e o motivo', /⚠ potencial extremo, dados incompletos/.test(X.ra) && /opq fr/.test(X.ra), X.ra);
  ok('nenhum erro de JavaScript', erros.length === 0, erros);
  await b.close();
  console.log(falhas ? '✗ ' + falhas + ' de ' + total + ' falharam' : '✓ Ideias: ' + total + ' conferências ok');
  process.exit(falhas ? 1 : 0);
})();
