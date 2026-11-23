/* Testes da faixa de preço justo (js/faixa.js): node tests/faixa.js  (precisa do Playwright).
   As contas esperadas são refeitas aqui, à parte, com os mesmos números de entrada. */
const path = require('path');
const { chromium } = require('playwright');
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra)); } };
const perto = (a, b, e) => Math.abs(a - b) <= (e || 1e-6) * Math.max(1, Math.abs(b));
/* histórico fictício: 12 trimestres 4T23..3T26 */
function doc(f) {
  const t = []; let a = 2023, q = 4;
  for (let i = 0; i < 12; i++) { const r = { a, t: q, rec: 1000, luc: 100, ml: 10 }; if (f) f(r, i); t.push(r); q++; if (q === 5) { a++; q = 1; } }
  return { v: 1, tk: 'TEST3', t, nr: [] };
}
/* a mesma conta, escrita à parte */
const val = (L0, fm, g, r, m) => { let e = L0 * fm, v = 0; for (let i = 1; i <= 5; i++) { e *= 1 + g / 100; v += e * 0.5 / Math.pow(1 + r / 100, i); } return v + e * m / Math.pow(1 + r / 100, 5); };
(async () => {
  const b = await chromium.launch(), p = await b.newPage(), erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(APP); await p.waitForTimeout(800);
  const N = { pl: 5, cr5: 6 };
  const calc = (d, P, pe) => p.evaluate(({ d, P, N, pe }) => { MD.d = { idx: { selic: { last: 13 } } }; VALP = {}; var f = fxCalc(d, P, N, pe, 'TEST3'); if (f.ok) f.F = brl; return f; }, { d, P: P, N, pe: pe });

  /* 1. caso base: tudo constante, 10 de preço, P/L 5 => lucro por ação 2 */
  const base = await calc(doc(), 10, 8);
  ok('base: lucro normalizado = mediana (100 por trimestre, 400 por ano)', base.ok && base.nm.med === 100 && base.nm.anual === 400 && base.nm.usados === 12 && base.nm.excl.length === 0, base.nm);
  ok('base: lucro por ação = 2 (10 / P/L 5)', perto(base.L0, 2), base.L0);
  const eC = val(2, 1, 6, 14, 6.8), eM = val(2, 1, 6, 14, 8), eO = val(2, 1, 9, 13, 9.6);
  ok('base: premissas dos 3 cenários (g 6/6/9, desconto 14/14/13, múltiplo 6,8/8/9,6)', base.pr.map(c => c.g).join() === '6,6,9' && base.pr.map(c => c.r).join() === '14,14,13' && base.pr.map(c => c.m).join() === '6.8,8,9.6', base.pr);
  ok('base: valores dos cenários batem com a conta à parte', perto(base.cons, eC) && perto(base.cen, eM) && perto(base.oti, eO), [base.cons, base.cen, base.oti, eC, eM, eO]);
  ok('conservador ≤ central ≤ otimista', base.cons < base.cen && base.cen < base.oti);
  ok('retorno esperado = 25% conservador + 50% central + 25% otimista', perto(base.esp, 0.25 * eC + 0.5 * eM + 0.25 * eO) && perto(base.espPct, base.esp / 10 - 1), base.esp);
  ok('margem de segurança é sobre o conservador', perto(base.ms, (eC - 10) / eC), base.ms);

  /* 2. trimestre atípico é excluído da mediana */
  const at = doc((r, i) => { if (i === 5) r.luc = 5000; });
  at.nr = [{ q: hiTri(at.t[5]), tipo: 'alto', luc: 5000, med: 100 }];
  function hiTri(r) { return r.t + 'T' + String(r.a).slice(2); }
  const A1 = await calc(at, 10, 8);
  ok('atípico fora: mediana de 11 trimestres, sem o marcado', A1.ok && A1.nm.usados === 11 && A1.nm.excl.length === 1 && A1.nm.med === 100, A1.nm);
  const sem = doc((r, i) => { if (i === 5) r.luc = 5000; });
  const A2 = await calc(sem, 10, 8);
  ok('mediana aguenta um trimestre estranho mesmo sem marca', A2.ok && A2.nm.med === 100);
  /* lucro normalizado diferente do último: usa a razão (limitada entre 0,3 e 2) */
  const dim = doc((r, i) => { r.luc = i >= 8 ? 50 : 200; r.ml = i >= 8 ? 5 : 20; });
  const D1 = await calc(dim, 10, 8);
  ok('lucro caiu: normalizado (mediana 200) ÷ últimos 12 meses (200) com razão limitada em 2', D1.ok && D1.nm.med === 200 && D1.nm.last12 === 200, D1.nm);
  ok('razão limitada a 2 e avisa', D1.ok && D1.lim === true && perto(D1.ratio, 2), [D1.ratio, D1.lim]);

  /* 2b. com número de ações (P/VP × patrimônio ÷ preço): lucro por ação = lucro normalizado ÷ ações, sem depender do P/L */
  const Ac = await p.evaluate((d) => { MD.d = { idx: { selic: { last: 13 } } }; VALP = {}; return fxCalc(d, 10, { pl: 5, cr5: 6 }, 8, 'TEST3', { pvp: 1, pl_r: 1000 }); }, dim);
  ok('com ações: lucro por ação = 800 (mediana 200 × 4) ÷ 100 ações, sem limitar a razão', Ac.ok && perto(Ac.L0, 8) && Ac.lim === false && Ac.base === 'acoes', [Ac.L0, Ac.lim, Ac.base]);
  ok('com ações: valor do central bate com a conta à parte', perto(Ac.cen, val(8, 1, 6, 14, 8)), Ac.cen);
  ok('sem ações usa o P/L e marca a base', base.base === 'pl');
    /* 2c. regra antiga (4 cortes) continua disponível só para comparar */
  const Old = await p.evaluate((d) => { MD.d = { idx: { selic: { last: 13 } } }; VALP = {}; return fxCalc(d, 10, { pl: 5, cr5: 6 }, 8, 'TEST3', null, true); }, doc());
  ok('regra antiga: conservador com g−4, desconto+2 e múltiplo 0,75×, bem menor que o novo', perto(Old.cons, val(2, 1, 2, 16, 6)) && Old.cons < base.cons, [Old.cons, base.cons]);
  ok('novo conservador só difere do central em margem e múltiplo', base.pr[0].g === base.pr[1].g && base.pr[0].r === base.pr[1].r && base.pr[0].m < base.pr[1].m);
  /* 3. margem: cenário conservador usa o percentil 25 e o otimista o 75 */
  const mg = doc((r, i) => { r.ml = [8, 10, 10, 10, 10, 10, 10, 10, 10, 12, 12, 12][i]; });
  const M1 = await calc(mg, 10, 8);
  ok('margem: conservador ≤ central ≤ otimista nos fatores', M1.ok && M1.pr[0].fm <= 1 && M1.pr[2].fm >= 1 && M1.pr[0].ml <= M1.pr[1].ml && M1.pr[1].ml <= M1.pr[2].ml, M1.pr.map(c => [c.fm, c.ml]));
  ok('margem: valor do conservador usa o fator de margem', perto(M1.cons, val(M1.L0, M1.pr[0].fm, 6, 14, 6.8)), M1.cons);

  /* 4. armadilha de valor: lucro ou margem caindo 3 trimestres seguidos */
  const tl = doc((r, i) => { if (i >= 8) r.luc = [100, 95, 90, 85][i - 8]; });
  const T1 = await calc(tl, 10, 8);
  ok('lucro caindo 3 trimestres seguidos = armadilha, central rebaixado para a média', T1.ok && T1.trap === 'lucro' && perto(T1.cen, (T1.cons + T1.cenRaw) / 2) && T1.cen < T1.cenRaw, [T1.trap, T1.cen, T1.cenRaw]);
  ok('retorno esperado usa o central rebaixado', perto(T1.esp, 0.25 * T1.cons + 0.5 * T1.cen + 0.25 * T1.oti));
  const tm = doc((r, i) => { if (i >= 8) r.ml = [10, 9, 8, 7][i - 8]; });
  const T2 = await calc(tm, 10, 8);
  ok('margem caindo 3 trimestres seguidos = armadilha', T2.ok && T2.trap === 'margem', T2.trap);
  const t3 = doc((r, i) => { if (i >= 9) r.luc = [100, 95, 90][i - 9]; });
  const T3 = await calc(t3, 10, 8);
  ok('só 2 quedas seguidas não é armadilha', T3.ok && !T3.trap, T3.trap);
  const t4 = doc((r, i) => { if (i >= 8) r.luc = [100, 95, 96, 85][i - 8]; });
  const T4 = await calc(t4, 10, 8);
  ok('queda interrompida não é armadilha', T4.ok && !T4.trap);

  /* 5. dados que faltam */
  const curto = doc(); curto.t = curto.t.slice(-7);
  const C1 = await calc(curto, 10, 8);
  ok('menos de 8 trimestres: sem faixa', !C1.ok && /histórico curto/.test(C1.motivo), C1);
  const neg = doc((r) => { r.luc = -10; });
  const C2 = await calc(neg, 10, 8);
  ok('lucro normalizado negativo: sem faixa', !C2.ok && /não positivo/.test(C2.motivo), C2);
  const mui = doc((r, i) => { r.luc = i < 6 ? 100 : -50; });
  mui.nr = [];
  const C3 = await calc(mui, 10, 8);
  ok('mediana ≤ 0: sem faixa', !C3.ok, C3);
  const exc = doc(); exc.nr = exc.t.slice(0, 7).map(r => ({ q: hiTri(r), tipo: 'alto', luc: 1, med: 1 }));
  const C4 = await calc(exc, 10, 8);
  ok('atípicos demais (sobram menos de 6): sem faixa', !C4.ok && /poucos trimestres normais/.test(C4.motivo), C4);
  const C5 = await p.evaluate((d) => { MD.d = {}; return fxCalc(d, 10, { pl: null }, 8, 'TEST3'); }, doc());
  ok('sem P/L: sem faixa', !C5.ok);
  const C6 = await calc(doc((r, i) => { if (i >= 8) r.luc = -10; }), 10, 8);
  ok('lucro dos últimos 12 meses ≤ 0: sem faixa', !C6.ok && /12 meses/.test(C6.motivo), C6);

  /* 6. regra de oportunidade: abaixo do conservador ou até 10% acima. O lucro por ação vem de preço ÷ P/L, então varia-se o P/L */
  const k = base.cons / base.L0;   /* valor conservador por R$ 1 de lucro por ação */
  const O = await p.evaluate(({ d, k }) => { MD.d = { idx: { selic: { last: 13 } } }; VALP = {}; const f = (pl) => { const x = fxCalc(d, 10, { pl: pl, cr5: 6 }, 8, 'TEST3'); return [x.est, x.opp]; }; return { abaixo: f(k * 0.5), igual: f(k), perto: f(k * 1.1 - 1e-6), longe: f(k * 1.15) }; }, { d: doc(), k: k });
  ok('preço bem abaixo do conservador = abaixo e oportunidade', O.abaixo[0] === 'abaixo' && O.abaixo[1] === true, O);
  ok('preço igual ao conservador = abaixo/oportunidade', O.igual[1] === true, O);
  ok('até 10% acima do conservador = muito perto e ainda oportunidade', O.perto[0] === 'perto' && O.perto[1] === true, O);
  ok('mais de 10% acima = não é oportunidade', O.longe[0] === 'acima' && O.longe[1] === false, O);

  /* 7. bancos e seguradoras; sem arquivo; baixando */
  const F = await p.evaluate(() => {
    const mk = (tk, banco) => ({ tk: tk, banco: banco, d: { cur: 'BRL', price: 10, k: {} }, A: { N: { pl: 5, cr5: 6 }, sec: banco ? ['Financeiro', 'Intermediários Financeiros'] : ['Energia', ''], alr: [], pos: [], neg: [] }, V: null, score: 7 });
    FIN['cvm/SEM3'] = { d: null, at: Date.now() };
    FIN['cvm/ERR3'] = { d: undefined, err: true, at: Date.now() };
    const oldGet = finGet; let chamou = 0; finGet = function () { chamou++; return new Promise(function () { }); };
    const r = { banco: fxFor(mk('ITUB4', true)), sem: fxFor(mk('SEM3')), err: fxFor(mk('ERR3')), pend: fxFor(mk('NOVO3')), pend2: fxFor(mk('NOVO3')), chamou: chamou };
    finGet = oldGet; return r;
  });
  ok('banco/seguradora: sem faixa, "valuation de banco em breve"', F.banco.ok === false && F.banco.banco === true && /em breve/.test(F.banco.motivo));
  ok('sem arquivo: indisponível com motivo', F.sem.ok === false && !F.sem.pend && /sem histórico/.test(F.sem.motivo));
  ok('erro ao baixar: indisponível (não fica "calculando" para sempre)', F.err.ok === false && !F.err.pend, F.err);
  ok('baixando: pendente e só pede o arquivo uma vez', F.pend.pend === true && F.pend2.pend === true && F.chamou === 1, F.chamou);

  /* 8. linha da ideia: faixa, margem de segurança, premissas ao tocar, armadilha */
  const H = await p.evaluate((d) => {
    MD.d = { idx: { selic: { last: 13 } } }; VALP = {};
    const mk = (doc, P, pl) => { const A = { N: { pl: pl || 5, cr5: 6 }, pe: { pl: 8 }, sec: ['Energia', ''], alr: [], pos: [], neg: [] }; const o = { tk: 'TEST3', d: { cur: 'BRL', price: P, k: {} }, A: A, V: null, score: 7, al: [], cf: { n: 'Alta', w: [], f: 1 } }; FIN['cvm/TEST3'] = { d: doc, at: Date.now() }; o.fx = fxFor(o); return o; };
    const o = mk(d.base, 10); FXOPEN = {}; const fechada = opRow(o, 1); FXOPEN.TEST3 = true; const aberta = opRow(o, 1); FXOPEN = {};
    const t = mk(d.trap, 10); const ra = opAlerts(o, {}, false), rt = opRow(t, 1);
    const cara = mk(d.base, 10, 200), alc = opAlerts(cara, {}, true), pv = fxFaixa(o.fx);
    return { fechada, aberta, rt, ra, rcara: opRow(cara, 1), alc, pv, esp: o.fx.espPct };
  }, { base: doc(), trap: doc((r, i) => { if (i >= 8) r.luc = [100, 95, 90, 85][i - 8]; }) });
  ok('linha mostra a faixa (de conservador a otimista) e a central', /Faixa <b class="num">R\$\s[\d.,]+ a R\$\s[\d.,]+<\/b> · central R\$/.test(H.fechada), H.fechada.slice(-900));
  ok('linha mostra margem de segurança sobre o conservador', /Margem de segurança <b class="num (gain|loss)">/.test(H.fechada) && /sobre o conservador/.test(H.fechada));
  ok('premissas escondidas até tocar; botão aparece', !/Lucro normalizado/.test(H.fechada) && /data-fxp="TEST3"/.test(H.fechada) && />Premissas</.test(H.fechada));
  ok('ao tocar mostra premissas: lucro normalizado, crescimento, margem, desconto, múltiplo e pesos', /Lucro normalizado/.test(H.aberta) && /Crescimento do lucro/.test(H.aberta) && /Margem líquida/.test(H.aberta) && /Desconto \(% a\.a\.\)/.test(H.aberta) && /Múltiplo de saída/.test(H.aberta) && /pesos 25\/50\/25/.test(H.aberta) && /Esconder premissas/.test(H.aberta));
  ok('coluna Esperado mostra o retorno esperado (não um número único de preço justo)', !/justo R\$/.test(H.fechada) && new RegExp('opu (gain|loss)">[+−]').test(H.fechada));
  ok('armadilha de valor aparece na linha e nas premissas', /Possível armadilha de valor/.test(H.rt));
  ok('sem armadilha no caso normal', !/armadilha/.test(H.fechada));
  ok('alerta de ideia usa o conservador, não o preço justo único', H.ra.length >= 0 && !H.ra.some(a => /Abaixo do preço justo/.test(a[1])));
  ok('preço acima da faixa: "Acima do cenário conservador" e alerta de topo para quem tem', /Acima do cenário conservador/.test(H.rcara) && H.alc.some(a => /Acima do cenário otimista/.test(a[1])), H.alc);
  ok('faixa em texto: "R$ x a R$ y"', /^R\$\s[\d.,]+ a R\$\s[\d.,]+$/.test(H.pv.replace(/ /g, ' ')), H.pv);
  /* trava de sanidade (1.62.3) passa a olhar o retorno esperado da faixa */
  const Z = await p.evaluate(() => {
    const mk = (n, esp) => ({ tk: 'XXXX3', d: { cur: 'BRL', price: 10, k: {} }, A: { N: {}, sec: ['Energia', ''], alr: [], pos: [], neg: [] }, V: null, fx: { ok: true, espPct: esp }, score: 7, al: [], cf: { n: n, w: [], f: 1 } });
    return { m: opSanidade(mk('Média', 0.9)).cf, a: opSanidade(mk('Alta', 0.9)).cf, n: opSanidade(mk('Média', 0.3)).cf };
  });
  ok('esperado > 50% com confiança média vai para verificação; alta ganha aviso; 30% passa', Z.m.ext === true && Z.a.aviso === 'potencial muito alto, confira' && !Z.n.ext && !Z.n.aviso, Z);
  ok('nenhum erro de JavaScript', erros.length === 0, erros);
  await b.close();
  console.log(falhas ? '✗ ' + falhas + ' de ' + total + ' falharam' : '✓ Faixa: ' + total + ' conferências ok');
  process.exit(falhas ? 1 : 0);
})();
