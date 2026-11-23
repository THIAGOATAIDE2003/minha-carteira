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
  ok('banco sem margem/dívida não é penalizado', R.banco.n === 'Alta', R.banco);
  ok('mesma falta em não-banco é penalizada', R.naoBanco.n === 'Média', R.naoBanco);
  ok('nenhum erro de JavaScript', erros.length === 0, erros);
  await b.close();
  console.log(falhas ? '✗ ' + falhas + ' de ' + total + ' falharam' : '✓ Ideias: ' + total + ' conferências ok');
  process.exit(falhas ? 1 : 0);
})();
