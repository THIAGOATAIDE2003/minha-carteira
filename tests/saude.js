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
    MD.d = { cat: { n: { '10': 'Construção Civil', '14': 'Energia Elétrica' }, a: { RUIM3: ['', 10, 'Incorporações'], UM3: ['', 10, 'Incorporações'], BOM3: ['', 14, 'Energia Elétrica'] } } };
    const o = {};
    ['RUIM3', 'BOM3', 'UM3'].forEach(function (tk) { const x = mk(tk); x.sd = saudeFor(x); x.fx = { ok: true }; o[tk] = { sd: x.sd, risc: riscosFor(x), row: saudeRow(x), prem: saudePrem(x) }; });
    const cx = mk('BOM3', false, 16); cx.sd = saudeFor(cx); o.queda = riscosFor(cx); o.banco = saudeFor(mk('ITUB4', true)); o.sem = saudeFor(mk('NAOEXISTE3')); return o;
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
  /* setor de dívida estrutural: dívida líquida ÷ EBITDA */
  const E = await p.evaluate((d) => {
    const base = saudeCalc(d.alta), ctx = { estr: true, k: 1.5, lim: 4, setor: 'Energia Elétrica' };
    return { padrao: base, alta: saudeCalc(d.alta, ctx), ok: saudeCalc(d.ok, ctx), semk: saudeCalc(d.ok, { estr: true, k: null, lim: 4, setor: 'Energia Elétrica' }), loc: saudeCalc(d.alta, { estr: true, k: 1.5, lim: 5, setor: 'Aluguel de carros' }),
      setor: [setorOf('X1'), setorOf('X2'), setorOf('X3')] };
  }, { alta: doc((r, i) => { if (i === 11) { r.dl = 1500; } }), ok: doc((r, i) => { if (i === 11) { r.dl = 1500; r.pl = 100; } }) });
  /* alta: dl 1500, pl 1000, ebit 4×200=800 ×1,5 = EBITDA 1200 → 1,25× */
  ok('regra padrão sem setor estrutural: 1,5× o patrimônio ainda não é alta (o limite é acima de 1,5×)', E.padrao.m.regra === 'padrao' && E.padrao.m.dlpl === 1.5 && !E.padrao.f.includes('divida'), E.padrao.m);
  ok('elétrica/saneamento/locadora/concessão: mede por dívida líquida ÷ EBITDA e mostra a regra', E.alta.m.regra === 'ebitda' && Math.abs(E.alta.m.dleb - 1.25) < 1e-9 && E.alta.m.ebitda === 1200 && E.alta.m.lim === 4, E.alta.m);
  ok('dívida/patrimônio altíssima mas EBITDA cobre: não falha na regra por EBITDA', E.ok.m.dlpl === 15 && E.ok.n === 0 && !E.ok.f.includes('divida'), E.ok);
  ok('sem EBITDA disponível: volta para a regra padrão e diz isso', E.semk.m.regra === 'padrao' && E.semk.m.estr === true && E.semk.f.includes('divida'), E.semk.m);
  ok('limite das locadoras é 5×', E.loc.m.lim === 5);
  const G = await p.evaluate(() => {
    const mk = (tk, esp, f, n) => ({ tk: tk, fx: { ok: true, opp: true, espPct: esp }, sd: { n: f.length, f: f, mot: f.map(x => x === 'caixa' ? 'caixa operacional negativo' : 'dívida alta') } });
    MD.d = { cat: { n: { '10': 'Construção Civil', '14': 'Energia Elétrica' }, a: { A1: ['', 10, 'Incorporações'], A2: ['', 10, 'Incorporações'], A3: ['', 10, 'Incorporações'], A4: ['', 10, 'Incorporações'], B1: ['', 14, 'Energia Elétrica'], A5: ['', 10, 'Incorporações'] } } };
    const cap = opCapSetor([{ tk: 'A1' }, { tk: 'B1' }, { tk: 'A2' }, { tk: 'A3' }, { tk: 'A4' }, { tk: 'A5' }, { tk: 'Z9' }]);
    return { cx150: opGate(mk('P', 2.26, ['caixa'])), cx100: opGate(mk('P', 1.0, ['caixa'])), cx50: opGate(mk('P', 0.5, ['caixa'])), div150: opGate(mk('P', 2.26, ['divida'])), dois: opGate(mk('P', 0.3, ['divida', 'caixa'])), limpo: opGate(mk('P', 2.26, [])), semSd: opGate({ tk: 'P', fx: { ok: true, opp: true, espPct: 3 }, sd: null }), naoOpp: opGate({ tk: 'P', fx: { ok: true, opp: false, espPct: 3 }, sd: { n: 2, f: [], mot: [] } }), cap: cap.D.map(x => x.tk), skip: cap.skip };
  });
  ok('caixa operacional negativo + retorno esperado acima de 100% = verificação com motivo', /caixa operacional negativo nos últimos 12 meses e retorno esperado acima de 100%/.test(G.cx150), G.cx150);
  ok('caixa negativo com retorno de 100% ou menos continua (só aviso)', G.cx100 === null && G.cx50 === null);
  ok('retorno alto sem caixa negativo não é barrado por essa regra', G.div150 === null && G.limpo === null);
  ok('2 falhas continua indo para verificação', /saúde financeira: dívida alta, caixa operacional negativo/.test(G.dois), G.dois);
  ok('sem avaliação de saúde ou fora da regra de oportunidade: nada a barrar', G.semSd === null && G.naoOpp === null);
  ok('concentração: no máximo 3 por setor, mantém a ordem; outros setores livres', G.cap.join() === 'A1,B1,A2,A3,Z9' && G.skip === 2, G);
  /* setorRk: mesmo formato do rkSect, mas pelo catálogo da B3 */
  const K = await p.evaluate(() => {
    MD.d = { sect: { ACOMP3: ['Água e Saneamento', 'Água e Saneamento', 2] }, cat: { n: { '10': 'Construção Civil', '28': 'Outros', '14': 'Energia Elétrica' }, a: { CYRE3: ['', 10, 'Incorporações'], OUTR3: ['', 28, ''], EQTL3: ['', 14, 'Energia Elétrica'] } } };
    return { cat: setorRk('CYRE3'), ele: setorRk('EQTL3'), outros: setorRk('OUTR3'), semCat: setorRk('NADA3'), acomp: setorRk('ACOMP3'), us: setorRk('VT', true), velho: rkSect('CYRE3') };
  });
  ok('setorRk usa o catálogo: incorporadora vira [Consumo cíclico, Construção Civil] (o rkSect dava "Outros")', K.cat[1] === 'Construção Civil' && K.cat[0] === 'Consumo cíclico' && K.velho[0] === 'Outros', [K.cat, K.velho]);
  ok('setorRk: elétrica é Utilidade pública; ação acompanhada continua igual ao rkSect; EUA igual', K.ele[0] === 'Utilidade pública' && K.acomp[0] === 'Utilidade pública' && K.us[0] === 'Ações do mundo (ETF)', K);
  ok('setorRk: setor "Outros" ou sem catálogo cai no rkSect', K.outros[0] === 'Outros' && K.semCat[0] === 'Outros');
  ok('nenhum erro de JavaScript', erros.length === 0, erros);
  await b.close();
  console.log(falhas ? '✗ ' + falhas + ' de ' + total + ' falharam' : '✓ Saúde: ' + total + ' conferências ok');
  process.exit(falhas ? 1 : 0);
})();
