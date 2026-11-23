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
  /* E3 (1.77.0): motor único. Mercado fictício: opEval/fxFor/fundOf trocados por versões controladas. */
  const E3 = await p.evaluate(() => {
    const fx = (est, ms, esp) => ({ ok: true, est: est, opp: est !== 'acima', ms: ms, espPct: esp == null ? 0.3 : esp, cons: 10, cen: 14, oti: 18, esp: 13, F: brl });
    let EV = {}, FX = {}, FU = {};
    const o = (tk, score, liq, extra) => { const x = Object.assign({ tk: tk, d: { cur: 'BRL', price: 10, k: {} }, A: { chips: [['Qualidade', 'Alta'], ['', '']], N: { dy: 5 }, sec: ['Setor' + tk, ''], alr: [], pos: [], neg: [] }, V: null, score: score, banco: false, al: [] }, extra || {}); EV[tk] = x; FU[tk] = { liq2m: liq, pl: 8, roe: 15 }; return x; };
    const roda = () => { OPC = { k: '', r: null }; FOTOQ = true; return opData(); };
    const salvo = { opEval: opEval, fxFor: fxFor, fundOf: fundOf, saudeFor: saudeFor, opConf: opConf, concFor: concFor, vtSetor: vtSetor, macroVento: macroVento, opQual: opQual, setorOf: setorOf, setorRk: setorRk, riscosFor: riscosFor };
    opEval = tk => EV[tk] || null; fxFor = x => FX[x.tk]; fundOf = tk => FU[tk] || null; saudeFor = () => ({ n: 0, mot: [], f: [], m: {} }); riscosFor = () => []; opConf = () => ({ n: 'Alta', w: [], f: 1 });
    concFor = () => null; vtSetor = () => []; macroVento = () => null; opQual = () => ({ t: '', fraca: false, w: [] }); setorOf = tk => ({ k: 'S' + tk }); setorRk = () => ['Setor', ''];
    const out = {}, novo = () => { EV = {}; FX = {}; FU = {}; const d = {}; MD.d = { ts: 1, fund: { cols: [], d: d }, cat: {} }; return d; };
    try {
      /* (a) banco sem preço justo antigo (V=null) com faixa pronta entra em Ideias */
      let d = novo(); o('BANC4', 8, 9e6, { banco: true }); FX.BANC4 = fx('abaixo', 0.2); Object.keys(EV).forEach(k => { d[k] = [0]; });
      let r = roda(); out.a = r.D.map(x => x.tk);
      /* (b) ordem pela nota e depois pela liquidez, não pelo preço justo antigo (V.up) */
      d = novo(); o('AAAA3', 7, 5e6, { V: { up: 0.9, mg: 0.1, med: 19, ms: [1] } }); o('BBBB3', 9, 3e6, { V: { up: 0.2, mg: 0.1, med: 12, ms: [1] } }); o('CCCC3', 9, 8e6);
      ['AAAA3', 'BBBB3', 'CCCC3'].forEach(k => { FX[k] = fx('abaixo', 0.2); d[k] = [0]; }); r = roda(); out.b = r.D.map(x => x.tk);
      /* (c) nenhuma ação acima da faixa em Ideias ou Em verificação, mesmo com confiança baixa ou saúde ruim */
      d = novo(); o('ACIM3', 9, 9e6); FX.ACIM3 = fx('acima', -0.3); o('ACI2', 9, 8e6, { }); FX.ACI2 = fx('acima', -0.1); o('OKOK3', 8, 7e6); FX.OKOK3 = fx('perto', -0.05);
      Object.keys(EV).forEach(k => { d[k] = [0]; }); const cfOld = opConf; opConf = x => x.tk === 'ACI2' ? { n: 'Baixa', w: ['preço velho'], f: 0 } : { n: 'Alta', w: [], f: 1 };
      r = roda(); opConf = cfOld; out.c = { D: r.D.map(x => x.tk), X: r.X.map(x => x.tk), acima: r.D.concat(r.X).filter(x => x.fx && x.fx.ok && x.fx.est === 'acima').length, skipF: r.skipF,
        html: r.D.map(x => opRow(x, 1)).join('') };
      /* (d) teto de 60 candidatas na faixa: 70 ações boas, só as 60 melhores (nota, depois liquidez) recebem faixa */
      d = novo(); let chamadas = 0; for (let i = 0; i < 70; i++) { const tk = 'T' + String(i).padStart(3, '0') + '3'; o(tk, 6 + (i % 40) / 10, 1e7 - i); FX[tk] = fx('abaixo', 0.2); d[tk] = [0]; }
      const fxOld = fxFor; fxFor = x => { chamadas++; return FX[x.tk]; }; roda(); fxFor = fxOld; out.d = chamadas;
      /* (e) faixa ainda calculando (pend) não derruba o ticker nem o manda para verificação */
      d = novo(); o('PEND3', 8, 9e6); FX.PEND3 = { ok: false, pend: true, motivo: 'calculando a faixa…' }; d.PEND3 = [0]; r = roda(); out.e = { D: r.D.map(x => x.tk), X: r.X.map(x => x.tk) };
      /* (f) exceção "ideia rara" (concentração) usa a margem da faixa: 0,45 passa, 0,30 não */
      d = novo(); o('RARA3', 8.5, 9e6); FX.RARA3 = fx('abaixo', 0.45); o('NAOR3', 8.5, 8e6); FX.NAOR3 = fx('abaixo', 0.3); d.RARA3 = [0]; d.NAOR3 = [0];
      const ccOld = concFor; concFor = () => ({ alta: true }); r = roda(); concFor = ccOld; out.f = { D: r.D.map(x => x.tk), rara: r.D.map(x => !!x.rara), skipC: r.skipC };
      /* (g) sem faixa (indisponível) vai para Em verificação com o motivo, nunca para Ideias */
      d = novo(); o('SEMF3', 8, 9e6); FX.SEMF3 = { ok: false, motivo: 'sem histórico da CVM para esta empresa' }; d.SEMF3 = [0]; r = roda(); out.g = { D: r.D.map(x => x.tk), X: r.X.map(x => x.tk), w: r.X[0] && r.X[0].cf.w.join(';') };
    } finally { Object.assign(window, salvo); }
    return out;
  });
  ok('E3 (a): banco com V=null e faixa pronta entra em Ideias', E3.a.length === 1 && E3.a[0] === 'BANC4', E3.a);
  ok('E3 (b): ordem por nota e depois liquidez (não por V.up)', E3.b.join() === 'CCCC3,BBBB3,AAAA3', E3.b);
  ok('E3 (c): zero ação acima da faixa em Ideias ou Em verificação, nem com confiança baixa', E3.c.acima === 0 && E3.c.D.join() === 'OKOK3' && E3.c.X.length === 0 && E3.c.skipF === 2, E3.c);
  ok('E3 (c): nenhuma linha de Ideias com "Acima do cenário conservador"', !/Acima do cenário conservador/.test(E3.c.html), E3.c.html.slice(0, 200));
  ok('E3 (d): só 60 ações recebem faixa', E3.d === 60, E3.d);
  ok('E3 (e): faixa calculando fica em Ideias (não cai antes da hora)', E3.e.D.join() === 'PEND3' && E3.e.X.length === 0, E3.e);
  ok('E3 (f): exceção rara usa a margem da faixa (45% passa, 30% não)', E3.f.D.join() === 'RARA3' && E3.f.rara[0] === true && E3.f.skipC === 1, E3.f);
  ok('E3 (extra): sem faixa vai para Em verificação com o motivo', E3.g.D.length === 0 && E3.g.X.join() === 'SEMF3' && /faixa indisponível: sem histórico da CVM/.test(E3.g.w), E3.g);
  /* E3 (C2): cabeçalho e nota das Ideias dizem Potencial, não Esperado */
  const CAB = await p.evaluate(() => {
    const ant = opData, o = { tk: 'XXXX3', d: { cur: 'BRL', price: 10, k: {} }, A: { N: {}, sec: ['Energia', ''], alr: [], pos: [], neg: [] }, V: null, score: 7, al: [], cf: { n: 'Alta', w: [], f: 1 }, gq: { t: '', fraca: false, w: [] } };
    opData = () => ({ W: [o], M: [], D: [o], X: [], n: 0, cand: 10, skipC: 0, skipV: 0, skipF: 3, skipS: 0 }); const v0 = OPV;
    try { OPV = 'lst'; const a = oppHtml(); OPV = 'gar'; const b = oppHtml(); return { a: a, b: b }; } finally { opData = ant; OPV = v0; }
  });
  ok('E3 (C2): cabeçalho da lista diz Potencial (nunca Esperado)', /<span>Potencial<\/span>/.test(CAB.a) && !/<span>Esperado<\/span>/.test(CAB.a) && /<span>Potencial<\/span>/.test(CAB.b), CAB.a.slice(0, 300));
  ok('E3 (C2): nota explica Potencial sem prometer retorno e conta as ações acima da faixa', /A coluna Potencial mostra quanto o preço de hoje teria de subir/.test(CAB.b) && /Não é retorno anual nem promessa/.test(CAB.b) && /3 ficaram de fora por estarem acima disso/.test(CAB.b) && !/retorno esperado/i.test(CAB.b), CAB.b.slice(-900));
  /* E3 (g): contexto do assistente com o.V=null (banco) não quebra e mantém a linha ALERTAS */
  const AS = await p.evaluate(() => {
    const ant = opData, cf = { n: 'Média', w: [], f: 0.8 };
    opData = () => ({ D: [{ tk: 'BANC4', score: 8.2, V: null, cf: cf, fx: { ok: true, espPct: 0.214, cons: 10, oti: 18, F: brl } }, { tk: 'PEND3', score: 7, V: null, fx: { ok: false, pend: true } }], W: [{ tk: 'XXXX3', al: [['ok', 'Abaixo do cenário conservador', 'x']] }], M: [], X: [] });
    try { return asCtx('oi', { op: 1 }); } finally { opData = ant; }
  });
  ok('E3 (g): assistente lista IDEIAS NOVAS com potencial e faixa, sem quebrar com V=null', /IDEIAS NOVAS \(/.test(AS) && /BANC4 nota 8,2, potencial até o valor justo \+21%, faixa R\$\s?10,00 a R\$\s?18,00, confiança média/.test(AS) && !/GARIMPO/.test(AS) && !/PEND3/.test(AS), AS);
  ok('E3 (g): linha ALERTAS continua no contexto', /ALERTAS: XXXX3: Abaixo do cenário conservador/.test(AS), AS);
  ok('nenhum erro de JavaScript', erros.length === 0, erros);
  await b.close();
  console.log(falhas ? '✗ ' + falhas + ' de ' + total + ' falharam' : '✓ Ideias: ' + total + ' conferências ok');
  process.exit(falhas ? 1 : 0);
})();
