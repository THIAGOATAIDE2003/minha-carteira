/* Testes da saúde financeira e dos riscos das Ideias (js/saude.js): node tests/saude.js */
const path = require('path');
const { chromium } = require('playwright');
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra)); } };
function doc(f, over) {
  const t = []; let a = 2023, q = 4;
  for (let i = 0; i < 12; i++) { const r = { a, t: q, rec: 1000, luc: 100, ml: 10, pl: 1000, dl: 500, fco: 150, ebit: 200, rf: -20 }; if (f) f(r, i); t.push(r); q++; if (q === 5) { a++; q = 1; } }
  return Object.assign({ v: 1, tk: 'TEST3', t, nr: [], cmp: {} }, over || {});
}
(async () => {
  const b = await chromium.launch(), p = await b.newPage(), erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(APP); await p.waitForTimeout(800);
  const C = (d) => p.evaluate((d) => saudeCalc(d), d);
  const s0 = await C(doc());
  ok('empresa saudável: nenhuma falha', s0 && s0.n === 0 && s0.mot.length === 0 && s0.desc.length === 0, s0);
  ok('métricas: dívida/patrimônio 0,5, dívida/lucro 1,25, cobertura 10×, caixa 600', s0.m.dlpl === 0.5 && Math.abs(s0.m.dll - 1.25) < 1e-9 && Math.abs(s0.m.cob - 10) < 1e-9 && s0.m.fco === 600, s0.m);
  const s1 = await C(doc((r, i) => { if (i === 11) r.dl = 2000; }));
  ok('dívida líquida acima de 1,5× o patrimônio = "dívida alta"', s1.n === 1 && s1.f[0] === 'divida' && s1.mot[0] === 'dívida alta', s1);
  const s2 = await C(doc((r, i) => { if (i === 11) { r.dl = 1700; r.pl = 3000; } }));
  ok('dívida líquida acima de 4× o lucro anual = "dívida alta"', s2.n === 1 && s2.f[0] === 'divida' && s2.m.dlpl < 1.5, s2.m);
  const s3 = await C(doc((r, i) => { if (i === 11) { r.dl = -500; } r.luc = i >= 8 ? -10 : 100; }));
  ok('caixa maior que a dívida nunca é dívida alta', !s3.f.includes('divida') && s3.m.caixa === true, s3);
  const s4 = await C(doc((r, i) => { if (i >= 8) { r.ebit = 30; r.rf = -40; } }));
  ok('lucro da operação cobre menos de 2× os juros = cobertura baixa', s4.f.includes('juros') && s4.m.cob < 2 && s4.mot.includes('cobertura de juros baixa'), s4.m);
  const s5 = await C(doc((r, i) => { if (i >= 8) { r.ebit = -10; r.rf = -40; } }));
  ok('EBIT negativo com juros a pagar = cobertura baixa', s5.f.includes('juros'));
  const s6 = await C(doc((r, i) => { if (i >= 8) { r.ebit = 30; r.rf = 10; } }));
  ok('resultado financeiro positivo = sem problema de juros', !s6.f.includes('juros') && s6.m.cob === null);
  const s7 = await C(doc((r, i) => { if (i >= 8) r.fco = i === 8 ? -100 : -50; }));
  ok('caixa operacional dos 12 meses negativo = falha', s7.f.includes('caixa') && s7.mot.includes('caixa operacional negativo'), s7);
  const s8 = await C(doc((r, i) => { if (i === 11) r.dl = 2000; if (i >= 8) r.fco = -50; }));
  ok('2 falhas: dívida alta + caixa negativo', s8.n === 2 && s8.mot.join() === 'dívida alta,caixa operacional negativo', s8);
  const s9 = await C(doc((r) => { delete r.ebit; delete r.rf; }));
  ok('sem EBIT/resultado financeiro (arquivo antigo): não falha, marca como sem dado', s9.n === 0 && s9.desc.includes('juros'), s9);
  const s10 = await C(doc((r, i) => { if (i === 6) r.fco = null; if (i >= 8) r.fco = 100; }));
  ok('trimestre sem dado dentro dos 12 meses: ignora o teste, não falha', s10.n === 0, s10);
  ok('histórico curto = sem avaliação', (await C({ t: [{}] })) === null && (await C(null)) === null);

  /* decisão: 2+ falhas = verificação (feita em opData); aqui testa saudeFor e as linhas */
  const R = await p.evaluate((d) => {
    const mk = (tk, banco, hi) => ({ tk: tk, banco: banco, d: { cur: 'BRL', price: 10, k: { hi: hi || 11 } }, A: { N: {}, sec: banco ? ['Financeiro', ''] : ['Construção Civil', 'Construção Civil'], alr: [], pos: [], neg: [] }, V: null, score: 7, al: [], cf: { n: 'Alta', w: [], f: 1 } });
    FIN['cvm/RUIM3'] = { d: d.ruim, at: Date.now() }; FIN['cvm/BOM3'] = { d: d.bom, at: Date.now() }; FIN['cvm/UM3'] = { d: d.um, at: Date.now() };
    const rs = rkSect; rkSect = function (t) { return t === 'BOM3' ? ['Energia', 'Energia Elétrica'] : ['Consumo cíclico', 'Construção Civil']; };
    const o = {};
    ['RUIM3', 'BOM3', 'UM3'].forEach(function (tk) { const x = mk(tk); x.sd = saudeFor(x); x.fx = { ok: true }; o[tk] = { sd: x.sd, risc: riscosFor(x), row: saudeRow(x), prem: saudePrem(x) }; });
    const cx = mk('BOM3', false, 16); cx.sd = saudeFor(cx); o.queda = riscosFor(cx); o.banco = saudeFor(mk('ITUB4', true)); o.sem = saudeFor(mk('NAOEXISTE3')); rkSect = rs; return o;
  }, {
    ruim: doc((r, i) => { if (i === 11) { r.dl = 4500; } if (i >= 8) r.fco = -50; }, { cmp: { yoy: { itens: [{ c: 'ml', ch: -3.0, s: -1 }] } }, nr: [{ q: '3T26', tipo: 'alto', luc: 900, med: 100 }] }),
    bom: doc(), um: doc((r, i) => { if (i === 11) r.dl = 2000; })
  });
  ok('banco e empresa sem arquivo não passam pelo teste', R.banco === null && R.sem === null);
  ok('empresa ruim: 2 falhas e a linha avisa que está em verificação', R.RUIM3.sd.n === 2 && /Saúde financeira: dívida alta, caixa operacional negativo/.test(R.RUIM3.row) && /em verificação/.test(R.RUIM3.row), R.RUIM3.row);
  ok('empresa com 1 falha: aviso amarelo sem "em verificação"', R.UM3.sd.n === 1 && /Saúde financeira: dívida alta/.test(R.UM3.row) && !/em verificação/.test(R.UM3.row) && /opw/.test(R.UM3.row));
  ok('empresa saudável: sem aviso de saúde', !/Saúde financeira/.test(R.BOM3.row));
  ok('"O que pode dar errado" aparece sempre (com faixa)', /O que pode dar errado/.test(R.BOM3.row) && /O que pode dar errado/.test(R.RUIM3.row));
  ok('riscos: no máximo 2, o mais grave primeiro (dívida 4500/1000 = 4,5× o patrimônio)', R.RUIM3.risc.length === 2 && /^dívida líquida de 4,5× o patrimônio/.test(R.RUIM3.risc[0]), R.RUIM3.risc);
  ok('riscos: segundo maior entre queda de margem, lucro atípico e Selic', R.RUIM3.risc[1] && /margem|acima do normal|Selic/.test(R.RUIM3.risc[1]), R.RUIM3.risc);
  ok('riscos: setor sensível à Selic e preço caído aparecem quando são os maiores', R.UM3.risc.some(x => /Selic|preço já caiu/.test(x)), R.UM3.risc);
  ok('empresa saudável, setor não sensível e preço perto da máxima: nenhum risco forte', R.BOM3.risc.length === 0 && /nenhum risco forte/.test(R.BOM3.row), R.BOM3.risc);
  ok('preço 37,5% abaixo da máxima do ano vira risco', R.queda.length === 1 && /preço já caiu 38% da máxima/.test(R.queda[0]), R.queda);
  ok('premissas mostram os 3 testes de saúde', /Saúde financeira/.test(R.RUIM3.prem) && /Dívida:/.test(R.RUIM3.prem) && /Cobertura de juros:/.test(R.RUIM3.prem) && /Caixa operacional:/.test(R.RUIM3.prem));
  ok('nenhum erro de JavaScript', erros.length === 0, erros);
  await b.close();
  console.log(falhas ? '✗ ' + falhas + ' de ' + total + ' falharam' : '✓ Saúde: ' + total + ' conferências ok');
  process.exit(falhas ? 1 : 0);
})();
