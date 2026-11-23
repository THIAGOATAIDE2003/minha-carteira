/* Testes de "Por que apareceu" e Qualidade dos lucros (js/qualidade.js): node tests/qualidade.js */
const path = require('path');
const { chromium } = require('playwright');
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra)); } };
/* 8 trimestres seguidos (2024T4..2026T3); f(r,i) altera uma linha */
function doc(f, n) {
  const t = []; let a = 2024, q = 4;
  for (let i = 0; i < (n || 8); i++) { const r = { a, t: q, rec: 1000 + i * 10, luc: 100 + i * 5, pl: 1000 + i * 20, dl: 500 - i * 10, fco: 200 + i * 5 }; if (f) f(r, i); t.push(r); q++; if (q === 5) { a++; q = 1; } }
  return { v: 1, tk: 'TEST3', t, nr: [], cmp: {} };
}
(async () => {
  const b = await chromium.launch(), p = await b.newPage(), erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(APP); await p.waitForTimeout(800);
  const C = (d, tp) => p.evaluate(([d, tp]) => qlCalc(d, tp || 'nf'), [d, tp]);
  const R = (q) => q.t.map(x => x.r);
  const q1 = await C(doc());
  ok('Q1 tudo passa: 6 de 6', q1.ap === 6 && q1.ps === 6, R(q1));
  const falha = [(r, i) => { if (i >= 4) r.luc = -5; }, (r, i) => { if (i >= 4) r.fco = 0; }, (r, i) => { if (i >= 4) r.luc = 100 + i * 0 - 50 + 60; r.rec = i >= 4 ? 5000 : 1000; }, (r, i) => { if (i === 7) r.dl = 600; }, (r, i) => { if (i >= 4) r.pl = 5000; }, (r, i) => { if (i >= 4) r.rec = 100; }];
  for (let k = 0; k < 6; k++) { const q = await C(doc(falha[k])); ok('Q2 teste T' + (k + 1) + ' pode reprovar', q.t[k].r === false, R(q)); }
  const q3 = await C(doc((r, i) => { if (i === 6) r.fco = null; }));
  ok('Q3 caixa faltando: T2 não aplicável, ap=5', q3.t[1].r === null && q3.ap === 5 && q3.ps <= 5, R(q3));
  const q4 = await C(doc((r, i) => { if (i >= 4) r.luc = -10; }));
  ok('Q4 prejuízo: T1 falso, T2 nulo, sem NaN', q4.t[0].r === false && q4.t[1].r === null && !JSON.stringify(q4).includes('NaN'), q4);
  const q5 = await C(doc((r, i) => { if (i >= 3) r.t = r.t % 4 + 1; }));
  ok('Q5 buraco entre trimestres: T3, T5, T6 não aplicáveis', q5.t[2].r === null && q5.t[4].r === null && q5.t[5].r === null, R(q5));
  const q6 = await C(doc(null, 3));
  ok('Q6 menos de 4 trimestres: tudo nulo, ap=0', q6.ap === 0 && R(q6).every(x => x === null), q6);
  const h6 = await p.evaluate((q) => qlPrem({ tk: 'TEST3', ql: q }), q6);
  ok('Q6 tela diz "dados insuficientes", não "0 de 0"', h6.includes('dados insuficientes') && !h6.includes('0 de 0'));
  const q7 = await C(doc(null, 4));
  const h7 = await p.evaluate((q) => qlPrem({ tk: 'TEST3', ql: q }), q7);
  ok('Q7 só 4 trimestres (ap<4 em nf): sem fração "x de y"', q7.ap < 4 && !/\d de \d passaram/.test(h7), q7.ap);
  const q8a = await C(doc((r, i) => { if (i === 7) r.dl = 500 - 3 * 10; }));
  ok('Q8 dívida igual a um ano atrás NÃO passa', q8a.t[3].r === false, q8a.t[3]);
  const q8b = await C(doc((r, i) => { if (i === 7) r.dl = null; }));
  ok('Q8 dívida faltando = nulo', q8b.t[3].r === null);
  const q8c = await C(doc((r, i) => { r.dl = -100 - i * 10; }));
  ok('Q8 caixa líquido ficando maior passa', q8c.t[3].r === true, q8c.t[3]);
  const q8d = await C(doc((r, i) => { r.dl = 100 + i * 10; }));
  ok('Q8 dívida positiva subindo reprova', q8d.t[3].r === false);
  const q9 = await C(doc((r, i) => { if (i === 7) r.pl = 0; }));
  ok('Q9 patrimônio ≤0: ROE não aplicável', q9.t[4].r === null, q9.t[4]);
  const q9b = await C(doc((r, i) => { r.rec = 0; }));
  ok('Q9 receita ≤0: margem e receita não aplicáveis', q9b.t[2].r === null && !JSON.stringify(q9b).includes('NaN'), R(q9b));
  const qb = await C(doc(), 'banco'), qs = await C(doc(), 'seg');
  ok('Q10 banco: só lucro e ROE', qb.ap === 2 && qb.t[0].r !== null && qb.t[4].r !== null && qb.t[1].r === null && qb.t[3].r === null, R(qb));
  ok('Q10 seguradora: só lucro', qs.ap === 1 && qs.t[0].r === true, R(qs));
  const tipos = await p.evaluate(() => { MD.d = MD.d || {}; MD.d.cat = { a: { BANC4: ['', 20, 'Bancos'] }, n: { 20: 'Intermediários Financeiros' } }; return [qlTipo('B3SA3'), qlTipo('PETR4'), qlTipo('BANC4')]; });
  ok('Q10 B3SA3 e PETR4 usam os 6 testes; BANC4 é banco', tipos[0] === 'nf' && tipos[1] === 'nf' && tipos[2] === 'banco', tipos);
  const q11 = await C(Object.assign(doc(), { nr: [{ q: '3T26', tipo: 'alto', luc: 1, med: 1 }] }));
  ok('Q11 ressalva de lucro atípico sem mudar a contagem', q11.ress && q11.ps === q1.ps && q11.ap === q1.ap, q11.ress);
  /* opPorque / porqueRow */
  const base = { tk: 'TEST3', novo: 1, score: 9, ql: q1, fx: { ok: true, est: 'abaixo', ms: 0.25 }, sd: { n: 0, m: { caixa: true }, desc: [] }, A: { N: { dy: 8 } } };
  const pq = await p.evaluate((o) => opPorque(o), base);
  ok('Q12 no máximo 2 frases, sem "acima da faixa", números de o.fx', pq.length === 2 && pq[0].includes('25%') && !pq.join(' ').includes('acima da faixa'), pq);
  const nada = await p.evaluate(() => opPorque({ tk: 'X3', novo: 1, score: 5, fx: { ok: true, est: 'acima', ms: -0.1 }, sd: { n: 1, m: {}, desc: [] } }));
  ok('Q12 sem motivo: nenhuma frase', nada.length === 0, nada);
  const semNovo = await p.evaluate((o) => { o.novo = 0; return porqueRow(o); }, JSON.parse(JSON.stringify(base)));
  ok('Q12 só aparece para Ideias novas', semNovo === '');
  const bl = await p.evaluate((o) => porqueRow(o), JSON.parse(JSON.stringify(base)));
  ok('Q12 linha tem título e balão ⓘ', bl.includes('Por que apareceu') && bl.includes('bal'), bl);
  /* risco: limites (ap>=5 e ps<=2), só na linha fechada, e só cita testes que FALHARAM */
  const mk = (ap, ps) => ({ tk: 'T3', fx: { ok: true }, sd: { n: 0, m: {}, desc: [] }, ql: { tipo: 'nf', ap, ps, t: [0, 1, 2, 3, 4, 5].map(i => ({ n: ['Lucro', 'Caixa', 'Margem', 'Dívida', 'ROE', 'Receita'][i], r: i < ps ? true : i < ap ? false : null })) } });
  const rr = await p.evaluate((casos) => { window.__fx0 = fxDoc; window.fxDoc = function () { return { t: [{}] }; }; const r = casos.map(c => { const o = { tk: 'T3', fx: { ok: true }, sd: { n: 0, m: {}, desc: [] }, ql: c }; return [c.ap + '/' + c.ps, riscosFor(o, 1).some(x => x.includes('qualidade do lucro')), riscosFor(o).some(x => x.includes('qualidade do lucro'))]; }); window.fxDoc = window.__fx0; return r; },
    [[5, 2], [6, 0], [6, 2], [4, 1], [4, 2], [5, 3], [6, 3], [5, 5]].map(([ap, ps]) => mk(ap, ps).ql));
  const deve = { '5/2': 1, '6/0': 1, '6/2': 1, '4/1': 0, '4/2': 0, '5/3': 0, '6/3': 0, '5/5': 0 };
  rr.forEach(([k, linha, parecer]) => { ok('Q14 risco ' + k + (deve[k] ? ' aparece' : ' não aparece') + ' na linha fechada', linha === !!deve[k], [k, linha]); ok('Q14 risco ' + k + ' nunca no Parecer (sem 2º argumento)', parecer === false, k); });
  /* texto do risco: só testes que não passaram (aqui Caixa e Lucro passaram) */
  const txt = await p.evaluate((o) => { window.__fx0 = fxDoc; window.fxDoc = function () { return { t: [{}] }; }; const r = riscosFor(o, 1).filter(x => x.includes('qualidade do lucro'))[0]; window.fxDoc = window.__fx0; return r; }, (() => { const o = mk(6, 2); return o; })());
  ok('Q14 texto lista só o que falhou (margem, dívida, roe, receita) e não cita caixa/lucro que passaram', txt && /margem, dívida, roe, receita/.test(txt) && !/caixa|lucro,/.test(txt.replace('qualidade do lucro', '')), txt);
  /* "perto do cenário conservador" só com distância pequena; senão mostra o número real */
  const ph = (ms) => p.evaluate((ms) => opPorque({ tk: 'X3', novo: 1, score: 5, fx: { ok: true, est: 'perto', ms }, sd: { n: 1, m: {}, desc: [] } }), ms);
  const pp1 = await ph(-0.098), pp2 = await ph(-0.02);
  ok('Q12 9,8% acima: mostra o número, sem "muito perto"', pp1[0] === 'a 9,8% do cenário conservador', pp1);
  ok('Q12 2% acima: "muito perto"', pp2[0] === 'muito perto do cenário conservador', pp2);
  /* HTML: tudo que entra na linha passa por esc() (num() devolve HTML de propósito) */
  const esc2 = await p.evaluate((o) => { const n0 = window.num; window.num = () => '<i>x</i>'; const h = porqueRow(o); window.num = n0; return h; }, { tk: 'X3', novo: 1, score: 9, fx: { ok: true, est: 'acima', ms: -0.3 }, sd: { n: 1, m: {}, desc: [] } });
  ok('Q12 esc(): "<i>" vira texto, não tag', esc2.includes('nota alta') && !esc2.includes('<i>') && esc2.includes('&lt;i&gt;'), esc2);
  /* Q15 arquivo pendente */
  const pend = await p.evaluate(() => { const o = { tk: 'ZZZZ3' }; try { return [qualFor(o), o.ql]; } catch (e) { return 'erro ' + e.message; } });
  ok('Q15 arquivo da CVM pendente: sem erro e sem cache', Array.isArray(pend) && pend[0] === null && pend[1] === undefined, pend);
  /* Q16 desempenho */
  const ms = await p.evaluate((d) => { const t0 = performance.now(); for (let i = 0; i < 60; i++) qlCalc(d, 'nf'); return performance.now() - t0; }, doc());
  ok('Q16 60 cálculos em menos de 10 ms', ms < 10, ms);
  const prem = await p.evaluate((q) => qlPrem({ tk: 'T3', ql: q }), q1);
  ok('Q13 Premissas: 6 itens com aria-label e símbolo', (prem.match(/<li aria-label=/g) || []).length === 6 && prem.includes('✓') && prem.includes('6 de 6'));
  ok('sem erros de JS', erros.length === 0, erros);
  await b.close();
  console.log(falhas ? '✗ Qualidade: ' + falhas + ' falha(s) de ' + total : '✓ Qualidade: ' + total + ' conferências ok');
  process.exit(falhas ? 1 : 0);
})();
