/* Testes do valuation de bancos (js/banco.js): node tests/banco.js */
const path = require('path');
const { chromium } = require('playwright');
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra)); } };
/* 12 trimestres; roe(i) e pl(i) controláveis */
function doc(roe, over, f) {
  const t = []; let a = 2023, q = 4;
  for (let i = 0; i < 12; i++) { const r = { a, t: q, rec: 1000, luc: 100, pl: 1000, roe: typeof roe === 'function' ? roe(i) : roe }; if (f) f(r, i); t.push(r); q++; if (q === 5) { a++; q = 1; } }
  return Object.assign({ v: 1, tk: 'BANC4', t, nr: [], cmp: {} }, over || {});
}
(async () => {
  const b = await chromium.launch(), p = await b.newPage(), erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(APP); await p.waitForTimeout(800);
  /* mercado fictício: preço 10, P/VP 1, patrimônio R$ 1000 → 100 ações, VPA 10; Selic 13,75 → custo de capital 15% */
  const C = (d, o) => p.evaluate(({ d, o }) => {
    MD.d = MD.d || {}; MD.d.idx = { selic: { last: 13.75 } };
    var Fu = Object.assign({ pvp: 1, pl_r: 1000, dy: 6, pl: 10 }, o.Fu || {});
    return bkCalc(d, o.P || 10, Object.assign({ cr5: 4 }, o.N || {}), 'BANC4', Fu);
  }, { d, o: o || {} });
  /* banco normal: ROE 12% constante */
  const n = await C(doc(12));
  ok('banco normal: faixa calculada', n.ok && n.bank, n);
  ok('ROE sustentável = mediana (12%), só 9 trimestres têm ROE? aqui todos os 12', n.nm.med === 12 && n.nm.usados === 12, n.nm);
  ok('g = 4%, custo de capital = 15% (Selic 13,75 + 1, arredondado)', n.pr[1].g === 4 && n.pr[1].r === 15, n.pr);
  ok('P/VP justo central = (12−4)÷(15−4) = 0,727', Math.abs(n.pr[1].pvp - 8 / 11) < 1e-9, n.pr[1]);
  ok('VPA = 10 (patrimônio 1000 ÷ 100 ações); valor central = 7,27', Math.abs(n.vpa - 10) < 1e-9 && Math.abs(n.cen - 80 / 11) < 1e-9, [n.vpa, n.cen]);
  ok('conservador muda só o ROE: g e custo de capital iguais ao central', n.pr[0].g === n.pr[1].g && n.pr[0].r === n.pr[1].r);
  ok('otimista: custo de capital 1 ponto menor', n.pr[2].r === 14);
  ok('ROE constante: conservador = central; otimista maior só pelo desconto', Math.abs(n.cons - n.cen) < 1e-9 && n.oti > n.cen);
  ok('preço 10 acima do conservador 7,27 → "acima", não é oportunidade, margem negativa', n.est === 'acima' && !n.opp && n.ms < 0, [n.est, n.ms]);
  ok('retorno esperado com pesos 25/50/25', Math.abs(n.esp - (n.pr[0].v * 25 + n.pr[1].v * 50 + n.pr[2].v * 25) / 100) < 1e-9);
  /* percentis: ROE varia 10..21, conservador usa p25 e otimista p75 */
  const v = await C(doc(i => 10 + i));
  ok('p25 < mediana < p75 do ROE e valores crescentes', v.ok && v.pr[0].roe < v.pr[1].roe && v.pr[1].roe < v.pr[2].roe && v.cons < v.cen && v.cen < v.oti, v.pr);
  ok('mediana de 10..21 = 15,5', Math.abs(v.nm.med - 15.5) < 1e-9, v.nm.med);
  /* preço barato: abaixo do conservador */
  const bar = await C(doc(20), { P: 10, Fu: { pvp: 1 } });
  ok('ROE 20%, P/VP 1: preço abaixo do conservador = oportunidade', bar.ok && bar.est === 'abaixo' && bar.opp && bar.ms > 0, [bar.est, bar.ms, bar.cons]);
  /* g limitado */
  const gc = await C(doc(15), { N: { cr5: 10 } });
  ok('g de 10% é limitado a 6% (teto de banco) e a faixa avisa', gc.pr[1].g === 6 && gc.gcap === 10, [gc.pr[1].g, gc.gcap]);
  const gn = await C(doc(15), { N: { cr5: -3 } });
  ok('crescimento negativo vira g = 0', gn.pr[1].g === 0);
  /* atípicos excluídos */
  const at = await C(doc(i => i === 11 ? 40 : 12, { nr: [{ q: '3T26', tipo: 'alto' }] }));
  ok('trimestre atípico (nr) fica fora do ROE sustentável', at.ok && at.nm.med === 12 && at.nm.excl.length === 1 && at.nm.usados === 11, at.nm);
  /* ROE implausível */
  const im = await C(doc(70));
  ok('ROE acima de 50%: sem faixa, motivo explica', !im.ok && /implausível/.test(im.motivo), im);
  const im2 = await C(doc(i => i === 11 ? 60 : 12));
  ok('último ROE acima de 50% também barra', !im2.ok && /implausível/.test(im2.motivo), im2);
  const am = await C(doc(i => i % 2 ? 5 : 48));
  ok('ROE que varia mais de 40 p.p. = plano de contas estranho', !am.ok && /plano de contas/.test(am.motivo), am);
  const ng = await C(doc(-3));
  ok('ROE sustentável negativo: sem faixa', !ng.ok && /não positivo/.test(ng.motivo), ng);
  const pn = await C(doc(12, null, (r, i) => { if (i === 11) r.pl = -5; }));
  ok('patrimônio negativo = plano estranho', !pn.ok && /patrimônio/.test(pn.motivo), pn);
  /* dado faltando */
  const sr = await C(doc(i => i < 6 ? null : 12));
  ok('só 6 trimestres com ROE: histórico curto, sem faixa', !sr.ok && /histórico curto/.test(sr.motivo), sr);
  const sa = await C(doc(12), { Fu: { pvp: null, pl_r: null } });
  ok('sem número de ações: sem faixa', !sa.ok && /ações/.test(sa.motivo), sa);
  const dv = await C(doc(12), { Fu: { pl_r: 5000 } });
  ok('patrimônio da CVM muito diferente do mercado: sem faixa', !dv.ok && /não bate/.test(dv.motivo), dv);
  ok('sem histórico', !(await C(null)).ok);
  /* saúde */
  const S = (d, o) => p.evaluate(({ d, o }) => { var f = bkCalc(d, o.P || 10, { cr5: 4 }, 'BANC4', Object.assign({ pvp: 1, pl_r: 1000, dy: 6, pl: 10 }, o.Fu || {})); return { f: f.ok ? { trap: f.trap, pay: f.pay, r: f.r } : f, s: bkSaude({ fx: f }), rk: bkRiscos({ fx: f, sd: bkSaude({ fx: f }) }) }; }, { d, o: o || {} });
  const s0 = await S(doc(20));
  ok('banco saudável: nenhum alerta, mas 3 itens "não avaliado"', s0.s.n === 0 && s0.s.desc.join() === 'inadimplência,Basileia,provisões', s0.s);
  ok('os riscos sempre dizem que inadimplência/Basileia/provisões não foram avaliadas', /não foram avaliadas/.test(s0.rk[s0.rk.length - 1]), s0.rk);
  const s1 = await S(doc(12));
  ok('ROE sustentável (12%) abaixo do custo de capital (15%) = alerta', s1.s.f.includes('roe') && s1.s.n === 1, s1.s);
  const s2 = await S(doc(i => 20 - (i > 7 ? (i - 7) : 0)));
  ok('ROE caindo 3 trimestres seguidos = possível armadilha de valor; central rebaixado', s2.f.trap === 'ROE' && s2.s.f.includes('queda'), s2);
  const rz = await C(doc(i => 20 - (i > 7 ? (i - 7) : 0)));
  ok('armadilha: central vira a média entre conservador e central', rz.trap === 'ROE' && Math.abs(rz.cen - (rz.pr[0].v + rz.pr[1].v) / 2) < 1e-9 || rz.cen <= rz.pr[1].v, rz);
  const s3 = await S(doc(20, null, (r, i) => { r.luc = 100 - (i > 8 ? (i - 8) * 5 : 0); }));
  ok('lucro caindo 3 trimestres seguidos também é armadilha', s3.f.trap === 'lucro', s3.f);
  const s4 = await S(doc(20), { Fu: { dy: 12, pl: 10 } });
  ok('payout acima de 100% (DY 12% × P/L 10 = 120%) = alerta', s4.s.f.includes('payout') && Math.round(s4.f.pay * 100) === 120, s4.s);
  const s5 = await S(doc(20), { Fu: { dy: null } });
  ok('sem DY: payout "não avaliado", sem alerta', !s5.s.f.includes('payout') && s5.s.desc.includes('payout'), s5.s);
  const s6 = await S(doc(12, null, (r, i) => { r.luc = 100 - (i > 8 ? (i - 8) * 5 : 0); }));
  const g6 = await p.evaluate((d) => { var f = bkCalc(d, 1, { cr5: 4 }, 'BANC4', { pvp: 0.5, pl_r: 1000, dy: 6, pl: 10 }); if (!f.ok) return 'sem faixa: ' + f.motivo; f.F = brl; var o = { fx: f, sd: bkSaude({ fx: f }) }; return String(opGate(o)); }, doc(12, null, (r, i) => { r.luc = 100 - (i > 8 ? (i - 8) * 5 : 0); }));
  ok('2 alertas (ROE baixo + queda) = Em verificação pelo opGate', /^saúde financeira: /.test(g6), g6);
  /* custo de capital de médio prazo + matriz + trimestres que faltam */
  const T = (focus, old) => p.evaluate(({ focus, old }) => {
    MD.d.idx = { selic: { last: 13.75 } };
    var y = +today().slice(0, 4), fim = {}; if (focus) { fim[y + 2] = focus[0]; fim[y + 3] = focus[1]; }
    MD.d.macro = focus ? { regime: { r: 'caindo' }, selic: { meta: 13.75 }, coleta: today(), focus: { fim: fim } } : null;
    BKOLD = !!old; var t = bkTaxa(); BKOLD = false; return t;
  }, { focus, old });
  const t1 = await T([11, 10.5]);
  ok('taxa de médio prazo = (Selic 13,75 + média Focus 2028/29 de 10,75) ÷ 2 = 12,25; + 1 de prêmio = 13,25 → 13', t1.regra === 'medio' && Math.abs(t1.focus - 10.75) < 1e-9 && Math.abs(t1.medio - 12.25) < 1e-9 && t1.r === 13, t1);
  const t2 = await T([11, 10.5], true);
  ok('regra antiga (BKOLD): Selic de hoje + 1 = 14,75 → 15', t2.regra === 'selic' && t2.r === 15, t2);
  const t3 = await T(null);
  ok('sem Focus utilizável cai na regra simples (Selic + 1)', t3.regra === 'selic' && t3.r === 15, t3);
  const t4 = await T([8, 7]);
  ok('piso de 12%: Selic 13,75 e Focus 7,5 daria 10,6 + 1 = 12 (não passa de baixo do piso)', t4.r === 12, t4);
  await T([11, 10.5]);
  const nv = await C(doc(12));
  ok('com a regra nova o custo de capital do central é 13% e o P/VP justo (12−4)÷(13−4) = 0,889', nv.pr[1].r === 13 && Math.abs(nv.pr[1].pvp - 8 / 9) < 1e-9, nv.pr);
  ok('a matriz tem 3 ROEs × 3 custos: taxa−1, taxa, taxa+1', nv.mx.rs.join() === '12,13,14' && nv.mx.l.length === 3 && nv.mx.l.every(l => l.c.length === 3), nv.mx.rs);
  ok('célula central da matriz = valor do central (sem armadilha)', Math.abs(nv.mx.l[1].c[1].v - nv.pr[1].v) < 1e-9 && Math.abs(nv.mx.l[0].c[1].v - nv.pr[0].v) < 1e-9);
  ok('custo de capital menor dá preço justo maior em cada linha', nv.mx.l.every(l => l.c[0].v > l.c[1].v && l.c[1].v > l.c[2].v));
  const html = await p.evaluate((o) => { var f = bkCalc(o.d, 10, { cr5: 4 }, 'BANC4', { pvp: 1, pl_r: 1000, dy: 6, pl: 10 }); f.F = brl; return bkPrem(f); }, { d: doc(12) });
  ok('Premissas mostram a regra do custo de capital e a matriz', /média entre a Selic de hoje/.test(html) && /E se o custo de capital for outro/.test(html) && /\(usado\)/.test(html), html.slice(0, 200));
  const fa = await C(doc(i => i < 7 ? null : 12));
  ok('histórico curto diz quantos trimestres faltam', !fa.ok && fa.falta === 3 && fa.tem === 5 && /faltam 3/.test(fa.motivo), fa);
  /* motivo chega ao Em verificação */
  await p.evaluate(() => { MD.d.macro = null; });
  /* integração: fxFor com banco, confiança nunca Alta, linhas renderizam */
  const I = await p.evaluate(() => {
    var d = { v: 1, tk: 'BANC4', t: [], nr: [], cmp: {} }, a = 2023, q = 4;
    for (var i = 0; i < 12; i++) { d.t.push({ a: a, t: q, luc: 100, pl: 1000, roe: 20 }); q++; if (q === 5) { a++; q = 1; } }
    FIN['cvm/BANC4'] = { d: d, at: Date.now() };
    MD.d = MD.d || {}; MD.d.idx = { selic: { last: 13.75 } };
    MD.d.cat = { a: { BANC4: ['', 20, 'Bancos'], SEGU3: ['', 31, 'Seguradoras'] }, n: { 20: 'Intermediários Financeiros', 31: 'Previdência e Seguros' } };
    MD.d.fund = MD.d.fund || { d: {} }; var o = { tk: 'BANC4', d: { price: 8, cur: 'BRL' }, A: { N: { cr5: 4 }, sec: ['Outros'], chips: [], pos: [], neg: [] } };
    var oo = { tk: 'XYZ3', d: { price: 8, cur: 'BRL' }, A: { N: {}, sec: ['Financeiro'], chips: [], pos: [], neg: [] } };
    var r = { banco_detectado_so_pelo_setor: opBanco(o), outra_continua_em_breve: fxFor(oo) };
    return r;
  });
  ok('banco é detectado pelo subsetor "Bancos" mesmo sem marca de Financeiro', I.banco_detectado_so_pelo_setor === true, I);
  ok('outra financeira (nem banco nem seguradora) continua "em breve"', I.outra_continua_em_breve && I.outra_continua_em_breve.banco === true && !I.outra_continua_em_breve.ok, I);
  ok('sem erros de página', erros.length === 0, erros);
  await b.close();
  if (falhas) { console.log('✗ Banco:', falhas, 'de', total, 'falharam'); process.exit(1); }
  console.log('✓ Banco:', total, 'conferências ok');
})();
