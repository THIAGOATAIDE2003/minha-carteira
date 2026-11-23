/* Testes do macro simples (js/macro.js): node tests/macro.js */
const path = require('path');
const { chromium } = require('playwright');
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra)); } };
(async () => {
  const b = await chromium.launch(), p = await b.newPage(), erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(APP); await p.waitForTimeout(800);
  const hoje = await p.evaluate(() => today());
  const dia = (n) => new Date(new Date(hoje + 'T12:00:00Z').getTime() - n * 864e5).toISOString().slice(0, 10);
  const mac = (r, nv, coleta) => ({ v: 1, fonte: 'BCB', coleta: coleta || hoje, ts: 1, selic: { meta: 14.5, ref: hoje, d6m: 15 }, ipca12: { v: 4.5, ref: hoje }, dolar: { v: 5.4, nivel: nv, rel: 0, ref: hoje }, focus: { data: hoje, fim: { [new Date().getFullYear()]: 14, [new Date().getFullYear() + 1]: 12 } }, regime: { r, como: ['x'] }, err: [] });
  /* catálogo falso: INCO3 incorporadora, MINE3 mineração, BANC3 banco, SEGU3 seguradora, AERO3 aéreo, VARE3 varejo */
  const prep = (m) => p.evaluate((m) => { MD.d = MD.d || {}; MD.d.cat = { a: { INCO3: [1, 10, 'Incorporações'], MINE3: [1, 11, 'Minerais Metálicos'], BANC3: [1, 20, 'Bancos'], SEGU3: [1, 31, 'Seguradoras'], AERO3: [1, 12, 'Transporte Aéreo'], VARE3: [1, 13, 'Vestuário'], PETR3: [1, 14, 'Exploração, Refino e Distribuição'] }, n: { 10: 'Construção Civil', 11: 'Mineração', 20: 'Intermediários Financeiros', 31: 'Previdência e Seguros', 12: 'Transporte', 13: 'Tecidos, Vestuário e Calçados', 14: 'Petróleo, Gás e Biocombustíveis' } }; MD.d.macro = m; return macroOk(); }, m);
  const V = (tk) => p.evaluate((tk) => macroVento(tk), tk);
  ok('macro de hoje é usado', await prep(mac('caindo', 'normal')) === true);
  let v = await V('INCO3'); ok('Selic caindo: incorporadora favorável, com razão', v && v.v === 1 && v.n === 'favorável' && /Selic em queda/.test(v.w), v);
  v = await V('SEGU3'); ok('Selic caindo: seguradora contrária (ganha com Selic alta)', v.v === -1 && v.n === 'contrário', v);
  v = await V('BANC3'); ok('banco: neutro com razão', v.v === 0 && v.n === 'neutro' && v.w.length > 10, v);
  v = await V('SEMTABELA3'); ok('ticker sem catálogo: neutro, sem erro', v && v.v === 0, v);
  await prep(mac('subindo', 'normal'));
  v = await V('INCO3'); ok('Selic subindo: incorporadora contrária', v.v === -1 && /Selic em alta/.test(v.w), v);
  v = await V('SEGU3'); ok('Selic subindo: seguradora favorável', v.v === 1, v);
  await prep(mac('estavel', 'normal'));
  v = await V('INCO3'); ok('Selic estável + dólar normal: neutro', v.v === 0 && /não mexe/.test(v.w), v);
  await prep(mac('estavel', 'alto'));
  v = await V('MINE3'); ok('dólar alto: mineradora favorável', v.v === 1 && /dólar alto/.test(v.w), v);
  v = await V('AERO3'); ok('dólar alto: aérea contrária', v.v === -1, v);
  await prep(mac('estavel', 'baixo'));
  v = await V('MINE3'); ok('dólar baixo: mineradora contrária', v.v === -1, v);
  v = await V('AERO3'); ok('dólar baixo: aérea favorável', v.v === 1, v);
  await prep(mac('caindo', 'alto'));
  v = await V('INCO3'); ok('Selic caindo + dólar alto: incorporadora favorável (dólar neutro)', v.v === 1);
  v = await V('SEGU3'); ok('efeitos opostos somam (seguradora: Selic −1)', v.v === -1);
  /* concentração */
  const conc = (tks) => p.evaluate((t) => macroConc(t.map(x => ({ tk: x }))), tks);
  let c = await conc(['INCO3', 'VARE3', 'INCO3', 'MINE3']);
  ok('3 de 4 dependem de queda da Selic → aviso', c && c.k === 'selic-queda' && c.n === 3 && c.t === 4, c);
  ok('exatamente 50% não avisa (precisa passar de 50%)', (await conc(['INCO3', 'VARE3', 'MINE3', 'BANC3'])) === null);
  ok('menos de 3 ideias não avisa', (await conc(['INCO3', 'VARE3'])) === null);
  const h = await p.evaluate(() => macroConcHtml([{ tk: 'INCO3' }, { tk: 'VARE3' }, { tk: 'INCO3' }, { tk: 'MINE3' }]));
  ok('texto do aviso', /Atenção:<\/b> 3 de 4 ideias dependem de queda da Selic/.test(h), h);
  c = await conc(['MINE3', 'PETR3', 'MINE3', 'INCO3']); ok('dólar alto também conta', c && c.k === 'dolar-alto' && c.n === 3, c);
  /* painel */
  await prep(mac('caindo', 'alto'));
  const pn = await p.evaluate(() => macroPanel());
  ok('painel mostra Selic, IPCA, dólar, Focus e o balão', /14,50%/.test(pn) && /IPCA 12m/.test(pn) && /R\$ 5,40/.test(pn) && /Focus fim de/.test(pn) && /data-bal=/.test(pn), pn);
  /* macro velho ou faltando: some tudo */
  await prep(mac('caindo', 'alto', dia(8)));
  ok('coleta de 8 dias atrás: macro escondido', await p.evaluate(() => !macroOk() && macroVento('INCO3') === null && macroPanel() === '' && macroRow({ tk: 'INCO3' }) === '' && macroConcHtml([{ tk: 'INCO3' }, { tk: 'INCO3' }, { tk: 'INCO3' }]) === ''));
  await prep(mac('caindo', 'alto', dia(7)));
  ok('coleta de 7 dias atrás ainda vale', await p.evaluate(() => macroOk()));
  ok('macro ausente: esconde sem erro', await p.evaluate(() => { MD.d.macro = undefined; return !macroOk() && macroVento('INCO3') === null && macroPanel() === '' && macroKey() === '-'; }));
  ok('macro quebrado (sem regime): esconde', await p.evaluate(() => { MD.d.macro = { coleta: today(), selic: { meta: 14 } }; return !macroOk(); }));
  /* penalização no ranking: a ideia contrária perde MCPEN pontos e continua na lista */
  ok('penalização é de 12 pontos e não elimina (só desconta do ranking)', await p.evaluate(() => MCPEN === 12 && /base-=MCPEN/.test(opData.toString())));
  ok('nenhum erro de JS', erros.length === 0, erros);
  console.log(falhas ? '✗ ' + falhas + ' de ' + total + ' falharam' : '✓ macro: ' + total + ' testes ok');
  await b.close(); process.exit(falhas ? 1 : 0);
})();
