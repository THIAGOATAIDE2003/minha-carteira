/* Testes do valuation de seguradoras e bolsa (js/seguradora.js): node tests/seguradora.js */
const path = require('path');
const { chromium } = require('playwright');
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra)); } };
/* 12 trimestres (4T23 a 3T26), lucro 100 por trimestre = 400 por ano */
function doc(luc, f, over) {
  const t = []; let a = 2023, q = 4;
  for (let i = 0; i < 12; i++) { const r = { a, t: q, rec: 1000, luc: typeof luc === 'function' ? luc(i) : luc, pl: 1000 }; if (f) f(r, i); t.push(r); q++; if (q === 5) { a++; q = 1; } }
  return Object.assign({ v: 1, tk: 'SEGU3', t, nr: [], cmp: {} }, over || {});
}
(async () => {
  const b = await chromium.launch(), p = await b.newPage(), erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(APP); await p.waitForTimeout(800);
  /* ações = 400 (patrimônio de mercado 4000 ÷ preço 10), lucro de 12 meses 400 → LPA 1,00. P/L histórico do trimestre i = preço de fim de trimestre i. */
  const C = (d, o) => p.evaluate(({ d, o }) => {
    var tq = []; var a = 2023, q = 4; for (var i = 0; i < 12; i++) { tq.push([a, q]); q++; if (q === 5) { a++; q = 1; } }
    var px = o.px === null ? [] : tq.map(function (x, i) { return [sgDia(x[0], x[1]) - (o.dias == null ? 0 : o.dias), o.px ? o.px[i] : 8 + Math.max(0, i - 3) * 0.5]; });
    MD.d = { idx: { selic: { last: 13.75 } }, hist: {}, histx: o.px === null ? {} : (function () { var h = {}; h[o.tk || 'SEGU3'] = { w: px, cur: 'BRL' }; return h; })(),
      cat: { a: { SEGU3: ['', 31, 'Seguradoras'], PAR1: ['', 31, 'Seguradoras'], PAR2: ['', 31, 'Seguradoras'], PAR3: ['', 31, 'Seguradoras'], PAR4: ['', 31, 'Seguradoras'], BANC4: ['', 20, 'Bancos'], B3SA3: ['', 37, 'Serviços Financeiros Diversos'] }, n: { 31: 'Previdência e Seguros', 20: 'Intermediários Financeiros', 37: 'Serviços Financeiros Diversos' } },
      fund: { cols: ['cot', 'pl', 'pvp', 'psr', 'dy', 'pativo', 'pebit', 'evebit', 'evebitda', 'mebit', 'ml', 'lc', 'roic', 'roe', 'liq2m', 'pl_r', 'divpl', 'cr5'], d: {} } };
    if (o.pares) o.pares.forEach(function (pl, i) { MD.d.fund.d['PAR' + (i + 1)] = [10, pl, 1, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1e7, 4000, 0, 0]; });
    var Fu = Object.assign({ pvp: 1, pl_r: 4000, dy: 8, pl: 10 }, o.Fu || {});
    return sgCalc(d, o.P || 10, o.tk || 'SEGU3', Fu);
  }, { d, o: o || {} });
  /* seguradora normal */
  const n = await C(doc(100));
  ok('seguradora normal: faixa calculada com histórico de preço', n.ok && n.seg && n.fonte === 'historico' && n.kind === 'seguradora', n);
  ok('9 pontos de P/L histórico (trimestres com 12 meses de lucro)', n.pts === 9, n.pts);
  ok('lucro normalizado = mediana 100 × 4 = 400 por ano = R$ 1,00 por ação (400 ações)', Math.abs(n.L0 - 1) < 1e-9 && n.nm.anual === 400, [n.L0, n.nm]);
  ok('P/L alvo: p25 = 9, mediana = 10, p75 = 11 (8,0 a 12,0 de 0,5 em 0,5, 9 pontos: 8..12)', Math.abs(n.pr[0].pl - 9) < 1e-9 && Math.abs(n.pr[1].pl - 10) < 1e-9 && Math.abs(n.pr[2].pl - 11) < 1e-9, n.pr);
  ok('valor = P/L alvo × lucro por ação: 9, 10 e 11', Math.abs(n.cons - 9) < 1e-9 && Math.abs(n.cen - 10) < 1e-9 && Math.abs(n.oti - 11) < 1e-9, [n.cons, n.cen, n.oti]);
  ok('preço 10 está 11% acima do conservador 9: "acima", não é oportunidade', n.est === 'acima' && !n.opp && n.ms < 0, [n.est, n.ms]);
  ok('retorno esperado com pesos 25/50/25 = 10', Math.abs(n.esp - 10) < 1e-9, n.esp);
  const ba = await C(doc(100), { P: 9.5, Fu: { pvp: 4000 / 400 / 9.5 * 1, pl_r: 4000 } });
  ok('conservador muda só o P/L: lucro por ação igual nos 3 cenários', ba.ok && ba.pr.every(c => Math.abs(c.v / c.pl - ba.L0) < 1e-9), ba.pr);
  /* dividendos */
  ok('dividendo hoje 8% de R$ 10 = R$ 0,80; payout 80% do lucro normalizado; sustentável = 0,80 (8% do preço)', Math.abs(n.dps - 0.8) < 1e-9 && Math.abs(n.pay - 0.8) < 1e-9 && Math.abs(n.divSust - 0.8) < 1e-9 && Math.abs(n.ySust - 0.08) < 1e-9, [n.dps, n.pay, n.divSust]);
  const dv = await C(doc(100), { Fu: { dy: 15 } });
  ok('DY 15% paga R$ 1,50 contra lucro de R$ 1,00: payout 150%, sustentável limitado a R$ 1,00', Math.abs(dv.pay - 1.5) < 1e-9 && Math.abs(dv.divSust - 1) < 1e-9, dv);
  const sd = await p.evaluate((f) => sgSaude({ tk: 'SEGU3', fx: f }), dv);
  ok('payout acima de 100% = alerta de saúde', sd.f.includes('payout') && sd.n === 1, sd);
  const sd0 = await p.evaluate((f) => sgSaude({ tk: 'SEGU3', fx: f }), n);
  ok('seguradora saudável: nenhum alerta, mas sinistralidade/solvência/resultado financeiro "não avaliados"', sd0.n === 0 && sd0.desc.join() === 'sinistralidade,solvência,resultado financeiro', sd0);
  const sy = await C(doc(100), { Fu: { dy: 0 } });
  ok('sem dividendos: payout "não avaliado", sem alerta', sy.ok && sy.pay === null && (await p.evaluate((f) => sgSaude({ tk: 'SEGU3', fx: f }), sy)).desc.includes('payout'));
  /* atípicos */
  const at = await C(doc(i => i === 11 ? 900 : 100, null, { nr: [{ q: '3T26', tipo: 'alto' }] }), { Fu: { pl: 10 / 3 } });
  ok('trimestre atípico fica fora do lucro normalizado', at.ok && at.nm.med === 100 && at.nm.excl.length === 1, at.ok ? at.nm : at);
  const sa = await p.evaluate((f) => sgSaude({ tk: 'SEGU3', fx: f }), at);
  /* tendência */
  const tr = await C(doc(i => i < 9 ? 100 : 100 - (i - 8) * 10));
  ok('lucro caindo 3 trimestres seguidos = armadilha; central vira média entre conservador e central', tr.ok && tr.trap === 'lucro' && Math.abs(tr.cen - (tr.pr[0].v + tr.pr[1].pl * tr.L0) / 2) < 1e-9, [tr.trap, tr.cen, tr.pr]);
  /* lucro varia entre os cenários: p25, mediana e p75 dos trimestres normais, anualizados */
  const lv = await C(doc(i => 100 + (i % 3) * 10));
  ok('lucro por ação: conservador = p25×4÷ações (1,00), central = mediana (1,10), otimista = p75 (1,20)', lv.ok && Math.abs(lv.pr[0].L - 1) < 1e-9 && Math.abs(lv.pr[1].L - 1.1) < 1e-9 && Math.abs(lv.pr[2].L - 1.2) < 1e-9, lv.pr);
  ok('valor = lucro do cenário × P/L do cenário', lv.pr.every(c => Math.abs(c.v - c.L * c.pl) < 1e-9 || c.n === 'Central'));
  ok('conservador tem exatamente 2 cortes: lucro p25 e P/L p25 (valor = 1,00 × P/L p25)', Math.abs(lv.cons - lv.pr[0].pl * 1) < 1e-9, lv.cons);
  ok('matriz P/L × lucro: 3 × 3, a diagonal bate com os cenários', lv.mx.l.length === 3 && lv.mx.pls.length === 3 && lv.mx.l.every((l, i) => Math.abs(l.c[i].v - (i === 1 ? lv.pr[1].v : lv.pr[i].v)) < 1e-9), lv.mx);
  ok('lucro constante: os 3 lucros por ação são iguais (só o P/L varia)', n.pr[0].L === n.pr[1].L && n.pr[1].L === n.pr[2].L);
  const old = await p.evaluate(() => { SGOLD = true; return null; });
  const lo2 = await C(doc(i => 100 + (i % 3) * 10)); await p.evaluate(() => { SGOLD = false; });
  ok('SGOLD (comparação): lucro igual nos 3 cenários', lo2.pr.every(c => Math.abs(c.L - 1.1) < 1e-9), lo2.pr);
  const hh = await p.evaluate((x) => { x.F = brl; return sgPrem(x); }, lv);
  ok('Premissas mostram lucro por ação por cenário e a matriz P/L × lucro', /Lucro por ação \(normalizado\)/.test(hh) && /E se o P\/L ou o lucro/.test(hh) && /2 cortes/.test(hh));
  /* bolsa */
  const bo = await C(doc(100), { tk: 'B3SA3' });
  ok('B3SA3 é "bolsa", não usa ROE nem P/VP', bo.ok && bo.kind === 'bolsa' && bo.pr[0].pvp === undefined, bo.kind);
  ok('banco não cai nesta parte', (await p.evaluate(() => sgKind('BANC4'))) === null && (await p.evaluate(() => sgIs('SEGU3'))) === true);
  /* dado faltando e implausível */
  const sp = await C(doc(100), { px: null });
  ok('sem preço histórico e sem pares: sem faixa, motivo diz os dois', !sp.ok && /sem histórico de preço/.test(sp.motivo) && /pares/.test(sp.motivo), sp);
  const se = await C(doc(100), { px: null, pares: [6, 8, 10, 12] });
  ok('sem preço histórico, usa o P/L dos pares do subsetor (p25 7,5, mediana 9, p75 10,5)', se.ok && se.fonte === 'setor' && Math.abs(se.pr[0].pl - 7.5) < 1e-9 && Math.abs(se.pr[1].pl - 9) < 1e-9 && Math.abs(se.pr[2].pl - 10.5) < 1e-9 && se.pares.length === 4, se);
  const se3 = await C(doc(100), { px: null, pares: [6, 8, 10] });
  ok('só 3 pares: não é o bastante, sem faixa', !se3.ok, se3);
  const im = await C(doc(100), { px: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51] });
  ok('P/L histórico de 40× a 51×: múltiplo implausível, sem faixa', !im.ok && /implausível/.test(im.motivo), im);
  const bx = await C(doc(100), { px: [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6] });
  ok('P/L histórico abaixo de 3×: múltiplo implausível, sem faixa', !bx.ok && /implausível/.test(bx.motivo), bx);
  const ng = await C(doc(i => i > 7 ? -50 : 100));
  ok('lucro dos últimos 12 meses negativo: sem faixa', !ng.ok && /não positivo/.test(ng.motivo), ng);
  const ch = await C(doc(100), { Fu: { pl: 40 } });
  ok('lucro da CVM não bate com o P/L do mercado: sem faixa', !ch.ok && /não bate/.test(ch.motivo), ch);
  const ch2 = await C(doc(100), { Fu: { pl: 6.25 } });
  ok('lucro da CVM 1,6× o do mercado (como WIZC3 com minoritários): sem faixa', !ch2.ok && /não bate/.test(ch2.motivo), ch2);
  const sa2 = await C(doc(100), { Fu: { pvp: null, pl_r: null } });
  ok('sem número de ações: sem faixa', !sa2.ok && /ações/.test(sa2.motivo), sa2);
  const cu = await C(doc(100, (r, i) => { if (i > 5) r.luc = null; }));
  ok('poucos trimestres com lucro: sem faixa', !cu.ok, cu);
  const lo = await C(doc(100), { dias: 30 });
  ok('preço semanal a mais de 10 dias do fim do trimestre não vale: sem pontos', !lo.ok && /sem histórico de preço/.test(lo.motivo), lo);
  /* integração: fxFor e opBanco */
  const I = await p.evaluate(() => {
    var d = { v: 1, tk: 'SEGU3', t: [], nr: [], cmp: {} }, a = 2023, q = 4;
    for (var i = 0; i < 12; i++) { d.t.push({ a: a, t: q, luc: 100, pl: 1000 }); q++; if (q === 5) { a++; q = 1; } }
    FIN['cvm/SEGU3'] = { d: d, at: Date.now() };
    var o = { tk: 'SEGU3', d: { price: 10, cur: 'BRL' }, A: { N: {}, sec: ['Financeiro'], chips: [], pos: [], neg: [] } }, oo = { tk: 'XYZ3', d: { price: 10, cur: 'BRL' }, A: { N: {}, sec: ['Financeiro'], chips: [], pos: [], neg: [] } };
    MD.d.fund.d.SEGU3 = [10, 10, 1, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1e7, 4000, 0, 0];
    var w = []; var aa = 2023, qq = 4; for (var k = 0; k < 12; k++) { w.push([sgDia(aa, qq), 8 + Math.max(0, k - 3) * 0.5]); qq++; if (qq === 5) { aa++; qq = 1; } } MD.d.histx = { SEGU3: { w: w, cur: 'BRL' } };
    var f = fxFor(o); o.fx = f; var sd = saudeFor(o); o.sd = sd;
    return { ok: f.ok, seg: f.seg, kindpl: f.pr && f.pr.map(c => c.pl), sdSeg: sd && sd.seg, outra: fxFor(oo), opB: opBanco(o), rows: [fxRow(o).length > 50, saudeRow(o).length > 50, saudePrem(o).length > 50, fxPrem(f).length > 50], riscos: riscosFor(o) };
  });
  ok('fxFor usa a regra de seguradora e saudeFor devolve a saúde de seguradora', I.ok && I.seg && I.sdSeg, I);
  ok('outra financeira (não banco, não seguradora) continua "em breve"', I.outra.banco === true && !I.outra.ok, I.outra);
  ok('seguradora conta como financeira (opBanco) e as linhas renderizam', I.opB && I.rows.every(Boolean), I);
  ok('o que pode dar errado sempre diz o que não foi avaliado', /não avaliados/.test(I.riscos[I.riscos.length - 1]), I.riscos);
  const cf = await p.evaluate(() => { var o = { tk: 'SEGU3', d: { price: 10 }, A: { N: { pl: 10, pvp: 1, roe: 10, dy: 8, cr5: 3 }, sec: ['Financeiro'], chips: [], pos: [1, 2, 3, 4], neg: [] } }; var c = opConf(o); return c.w.filter(function (x) { return /não avaliados/.test(x); }); });
  ok('confiança perde 1 ponto por "não avaliados: sinistralidade, solvência e resultado financeiro"', cf.length === 1 && /sinistralidade, solvência e resultado financeiro/.test(cf[0]), cf);
  ok('sem erros de página', erros.length === 0, erros);
  await b.close();
  if (falhas) { console.log('✗ Seguradora:', falhas, 'de', total, 'falharam'); process.exit(1); }
  console.log('✓ Seguradora:', total, 'conferências ok');
})();
