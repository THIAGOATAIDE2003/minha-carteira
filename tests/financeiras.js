/* Testes das financeiras no resto do app (parte C): vento macro, parecer da IA, foto diária, previsão de saída da verificação: node tests/financeiras.js */
const path = require('path');
const { chromium } = require('playwright');
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra)); } };
(async () => {
  const b = await chromium.launch(), p = await b.newPage(), erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(APP); await p.waitForTimeout(800);
  /* cenário: Selic caindo, Focus 2028/2029 11 e 10,5; banco BANC4 (ROE 12%→ varia), seguradora SEGU3, bolsa B3SA3 */
  const S = await p.evaluate(() => {
    var y = +today().slice(0, 4), fim = {}; fim[y + 2] = 11; fim[y + 3] = 10.5;
    var tq = [], a = 2023, q = 4; for (var i = 0; i < 12; i++) { tq.push([a, q]); q++; if (q === 5) { a++; q = 1; } }
    var w = tq.map(function (x, i) { return [sgDia(x[0], x[1]), 8 + Math.max(0, i - 3) * 0.5]; });
    MD.d = { idx: { selic: { last: 13.75 } }, macro: { regime: { r: 'caindo', como: ['teste'] }, selic: { meta: 13.75 }, dolar: { nivel: 'normal', v: 5.5 }, coleta: today(), focus: { fim: fim } }, hist: {}, histx: { SEGU3: { w: w, cur: 'BRL' }, B3SA3: { w: w, cur: 'BRL' } },
      cat: { a: { SEGU3: ['', 31, 'Seguradoras'], BANC4: ['', 20, 'Bancos'], B3SA3: ['', 37, 'Serviços Financeiros Diversos'] }, n: { 31: 'Previdência e Seguros', 20: 'Intermediários Financeiros', 37: 'Serviços Financeiros Diversos' } },
      fund: { cols: [], d: {} } };
    var mk = function (tk, f) { var t = [], a = 2023, q = 4; for (var i = 0; i < 12; i++) { var r = { a: a, t: q, ref: a + '-' + ('0' + q * 3).slice(-2) + '-28', rec: 1000, luc: 100, pl: 1000, roe: 12 + (i % 4) }; if (f) f(r, i); t.push(r); q++; if (q === 5) { a++; q = 1; } } return { v: 1, tk: tk, t: t, nr: [], cmp: {} } };
    FIN['cvm/BANC4'] = { d: mk('BANC4'), at: Date.now() }; FIN['cvm/SEGU3'] = { d: mk('SEGU3', function (r) { r.roe = null }), at: Date.now() }; FIN['cvm/B3SA3'] = { d: mk('B3SA3'), at: Date.now() };
    FIN['cvm/CURT4'] = { d: mk('CURT4', function (r, i) { if (i < 7) r.roe = null }), at: Date.now() };
    MD.d.cat.a.CURT4 = ['', 20, 'Bancos'];
    return {};
  });
  const V = await p.evaluate(() => ({ b: macroVento('BANC4'), s: macroVento('SEGU3'), x: macroVento('B3SA3') }));
  ok('banco: vento neutro (efeito misto), sem pontos tirados', V.b && V.b.v === 0 && V.b.n === 'neutro', V.b);
  ok('banco: o motivo explica os dois lados com a Selic em queda', /Selic em queda tem efeito misto: favorece o crédito e reduz o custo de captação, mas pode comprimir a margem/.test(V.b.w), V.b.w);
  ok('banco com a Selic em alta: "o contrário"', await p.evaluate(() => { MD.d.macro.regime.r = 'subindo'; var w = macroVento('BANC4').w; MD.d.macro.regime.r = 'caindo'; return /Selic em alta tem efeito misto: o contrário/.test(w) && macroVento('BANC4').v === 0; }));
  ok('seguradora: vento contrário com Selic caindo (já existia)', V.s && V.s.v === -1, V.s);
  ok('bolsa: vento favorável com Selic caindo', V.x && V.x.v === 1 && /bolsa/.test(V.x.w), V.x);
  ok('Selic estável: banco sem texto de efeito misto', await p.evaluate(() => { MD.d.macro.regime.r = 'estavel'; var w = macroVento('BANC4').w; MD.d.macro.regime.r = 'caindo'; return !/efeito misto/.test(w); }));
  /* pacotes */
  const mkO = (tk, P, Fu, over) => p.evaluate(({ tk, P, Fu, over }) => {
    var D = fxDoc(tk), f = (bkIs(tk) ? bkCalc(D, P, { cr5: 4 }, tk, Fu) : sgCalc(D, P, tk, Fu));
    if (!f.ok) return { erro: f.motivo };
    f.F = brl; if (bkIs(tk)) f.bank = true; var o = { tk: tk, d: { price: P, cur: 'BRL' }, score: 7, A: { N: {}, chips: [], pos: [], neg: [] }, fx: f }; o.sd = saudeFor(o);
    o.cf = { n: 'Média', w: ['não avaliados'], f: 0.8 }; var pk = parPacote(o); return { pk: pk, ent: parEntrada(pk), sd: o.sd };
  }, { tk, P, Fu, over });
  const B = await mkO('BANC4', 8, { pvp: 1, pl_r: 1000, dy: 6, pl: 10 });
  ok('pacote do banco tem o bloco financeira e a lista de não avaliados', B.pk && B.pk.financeira && B.pk.financeira.tipo === 'banco' && B.pk.nao_avaliado.join() === 'inadimplência,Basileia,provisões', B.pk && B.pk.nao_avaliado);
  ok('pacote do banco: premissas por cenário com ROE, custo de capital e P/VP justo', B.pk.faixa.premissas.length === 3 && B.pk.faixa.premissas.every(c => c.roe_pct != null && c.custo_de_capital_pct === (c.cenario === 'Otimista' ? 12 : 13) && c.pvp_justo != null), B.pk.faixa.premissas);
  const txt = (E, k) => E.fatos[k].map(x => x.txt).join(' | ');
  ok('"preocupam" tem o fato dos itens não avaliados, marcado obrigatório', B.ent.fatos.pre.some(x => /Não foram avaliados, por falta de dado no app: inadimplência, Basileia e provisões\./.test(x.txt) && x.obr), B.ent.fatos.pre);
  ok('"acompanhar" tem o ROE sustentável e os itens que o app não avalia', /ROE do próximo balanço contra o ROE sustentável/.test(txt(B.ent, 'ace')) && /inadimplência, Basileia e provisões, que o app não avalia/.test(txt(B.ent, 'ace')), txt(B.ent, 'ace'));
  ok('"errado se" tem o custo de capital subindo (de 13% para 14%) com o preço justo da matriz', /custo de capital subir de 13% para 14%: o preço justo central cairia para R\$ /.test(txt(B.ent, 'err')), txt(B.ent, 'err'));
  ok('fato de ROE vs custo de capital e de P/VP hoje vs justo existem', /(ROE sustentável de [\d,]+%.*custo de capital de 13%)/.test(txt(B.ent, 'fav') + ' ' + txt(B.ent, 'pre')) && /P\/VP de hoje/.test(txt(B.ent, 'fav') + ' ' + txt(B.ent, 'pre')), [txt(B.ent, 'fav'), txt(B.ent, 'pre')]);
  ok('leitura de financeira nunca é "a favor" (itens não avaliados contam como 1 ponto de atenção)', B.ent.leitura.leitura !== 'a favor' && B.ent.leitura.motivos.includes('dados específicos do setor não avaliados'), B.ent.leitura);
  ok('nenhum fato de dívida, cobertura de juros ou caixa aparece para banco', !/dívida|cobertura de juros|caixa operacional|EBITDA/i.test(txt(B.ent, 'fav') + txt(B.ent, 'pre') + txt(B.ent, 'err') + txt(B.ent, 'ace')), txt(B.ent, 'pre'));
  const G = await mkO('SEGU3', 8, { pvp: 1, pl_r: 4000 / 1, dy: 8, pl: 10 });
  if (G.erro) { ok('seguradora monta o pacote', false, G.erro); } else {
    ok('pacote da seguradora: bloco financeira com P/L alvo, dividendo sustentável e origem do P/L', G.pk.financeira.tipo === 'seguradora' && G.pk.financeira.pl_alvo_central != null && G.pk.financeira.origem_do_pl === 'histórico da própria ação', G.pk.financeira);
    ok('fatos da seguradora: P/L, dividendo sustentável e itens não avaliados (sinistralidade, solvência e resultado financeiro)', /P\/L de hoje/.test(txt(G.ent, 'fav') + txt(G.ent, 'pre')) && /sinistralidade, solvência e resultado financeiro/.test(txt(G.ent, 'pre')) && /lucro por ação ficar no do cenário conservador/.test(txt(G.ent, 'err')), G.ent.fatos);
    const G2 = await mkO('SEGU3', 8, { pvp: 1, pl_r: 4000, dy: 8, pl: 12 });
    ok('gatilho "P/L cair para o do conservador" só quando o P/L de hoje está acima dele', !G2.erro && /P\/L cair para o do cenário conservador/.test(txt(G2.ent, 'err')) && !/P\/L cair para o do cenário conservador/.test(txt(G.ent, 'err')), G2.erro || txt(G2.ent, 'err'));
    ok('seguradora: ainda tem o lucro normalizado no pacote', G.pk.faixa.lucro_normalizado && G.pk.faixa.lucro_normalizado.por_ano_milhoes != null);
  }
  /* validador: mesmos fatos, a IA reescreve; número inventado barra */
  const bom = (E) => JSON.stringify({ resumo: 'Há dados que o app não avalia. O banco tem faixa calculada.', a_favor: E.fatos.fav.map(x => ({ id: x.id, texto: x.txt })), preocupam: E.fatos.pre.map(x => ({ id: x.id, texto: x.txt })), errado_se: E.fatos.err.map(x => ({ id: x.id, texto: x.txt })), acompanhar: E.fatos.ace.map(x => ({ id: x.id, texto: x.txt })) });
  const val = (E, t) => p.evaluate(({ E, t }) => { var r = parValida(t, E); return { ok: r.ok, motivo: r.motivo, leitura: r.leitura, texto: r.texto }; }, { E, t });
  const v1 = await val(B.ent, bom(B.ent));
  ok('validador aprova a reescrita fiel de um banco e fecha com o aviso padrão', v1.ok && /Material para estudo, não é recomendação de compra\.$/.test(v1.texto) && v1.leitura === B.ent.leitura.leitura, v1);
  const t2 = JSON.parse(bom(B.ent)); t2.preocupam[0].texto += ' A inadimplência subiu 3,7%.';
  const v2 = await val(B.ent, JSON.stringify(t2));
  ok('validador barra número que não está no fato (inadimplência inventada)', !v2.ok && /número fora do fato/.test(v2.motivo), v2);
  const t3 = JSON.parse(bom(B.ent)); t3.preocupam[1].texto = 'O banco enfrenta pressão de concorrência.';
  const v3 = await val(B.ent, JSON.stringify(t3));
  ok('validador barra causa fora do pacote (concorrência)', !v3.ok, v3);
  /* sem faixa (poucos trimestres): leitura "com cautela" e quando sai da verificação */
  const Q = await p.evaluate(() => { var o = { tk: 'CURT4', d: { price: 10, cur: 'BRL' }, A: { N: {}, sec: ['Financeiro'], chips: [], pos: [], neg: [] } }; var f = bkCalc(fxDoc('CURT4'), 10, { cr5: 4 }, 'CURT4', { pvp: 1, pl_r: 1000, dy: 6, pl: 10 }); return { f: f, hoje: today() }; });
  ok('poucos trimestres: sem faixa, diz quantos faltam e a previsão', !Q.f.ok && Q.f.falta >= 1 && /Previsão: /.test(Q.f.motivo), Q.f);
  const W = await p.evaluate(() => { var d = { t: [{ a: 2026, t: 3 }] }; var o = { a: fxQuando(d, 1), b: fxQuando(d, 2), c: fxQuando(d, 3), d: fxQuando({ t: [{ a: 2099, t: 1 }] }, 1) }; return o; });
  ok('previsão usa o prazo legal da CVM: depois do 3T26, o 4T26 vale até 31/03/2027 (90 dias após o ano), o 1T27 até 15/05/2027 e o 2T27 até 14/08/2027 (45 dias)', /31\/03\/2027/.test(W.a) && /4T26/.test(W.a) && /15\/05\/2027/.test(W.b) && /1T27/.test(W.b) && /14\/08\/2027/.test(W.c) && /2T27/.test(W.c), W);
  ok('prazo que já passou diz que o balanço já deveria estar disponível', await p.evaluate(() => /já deveria estar disponível/.test(fxQuando({ t: [{ a: 2023, t: 1 }] }, 1))));
  ok('prazo no futuro diz "deve sair da verificação por volta de"', /deve sair da verificação por volta de/.test(W.d), W.d);
  /* foto diária */
  const F = await p.evaluate(() => { var dn = Math.floor(Date.now() / 864e5); AV.md = 1; MD.err = ''; MD.d = MD.d || {}; MD.d.hist = Object.assign(MD.d.hist || {}, { BANC4: { d: [[dn, 8]] }, SEGU3: { d: [[dn, 10]] } }); var D = fxDoc('BANC4'), f = bkCalc(D, 8, { cr5: 4 }, 'BANC4', { pvp: 1, pl_r: 1000, dy: 6, pl: 10 }); f.F = brl; var o = { tk: 'BANC4', d: { price: 8 }, fx: f, cf: { n: 'Média', w: [] }, score: 7 }; o.sd = saudeFor(o);
    var g = sgCalc(fxDoc('SEGU3'), 10, 'SEGU3', { pvp: 1, pl_r: 4000, dy: 8, pl: 10 }); g.F = brl; var o2 = { tk: 'SEGU3', d: { price: 10 }, fx: g, cf: { n: 'Média', w: [] }, score: 7 }; o2.sd = saudeFor(o2);
    return { b: fotoLinha(o, 'ideia'), s: fotoLinha(o2, 'verificacao'), doc: fotoMontar({ D: [o], X: [o2] }, '2026-11-23') }; });
  ok('foto: banco entra com tipo, ROE sustentável, custo de capital e P/VP justo', F.b.tipo === 'banco' && F.b.ref.roe > 0 && F.b.ref.custo === 13 && F.b.ref.pvp_justo > 0 && F.b.cons > 0, F.b);
  ok('foto: seguradora entra com tipo, P/L alvo e payout', F.s.tipo === 'seguradora' && F.s.ref.pl_alvo > 0 && F.s.st === 'verificacao', F.s);
  ok('foto: empresa comum continua sem tipo', await p.evaluate(() => { var f = { ok: true, cons: 1, cen: 2, oti: 3, esp: 2, ms: 0.1, est: 'abaixo', trap: null, F: brl }; MD.d.hist.ABCD3 = { d: [[Math.floor(Date.now() / 864e5), 1]] }; var l = fotoLinha({ tk: 'ABCD3', d: { price: 1 }, fx: f, cf: null, score: 5 }, 'ideia'); return l.tipo === null && l.ref === null; }));
  ok('foto: documento tem as duas ideias e a regra dos bancos e das seguradoras', F.doc && F.doc.ideias.length === 2 && /ROE p25/.test(F.doc.regra.banco) && /lucro p25/.test(F.doc.regra.seguradora), F.doc && F.doc.regra);
  ok('parRow aparece para banco (não está mais escondido)', await p.evaluate(() => { var D = fxDoc('BANC4'), f = bkCalc(D, 8, { cr5: 4 }, 'BANC4', { pvp: 1, pl_r: 1000, dy: 6, pl: 10 }); f.F = brl; var o = { tk: 'BANC4', d: { price: 8, cur: 'BRL' }, fx: f, cf: { n: 'Média', w: [] }, score: 7 }; return parRow(o).length > 20; }));
  ok('sem erros de página', erros.length === 0, erros);
  await b.close();
  if (falhas) { console.log('✗ Financeiras:', falhas, 'de', total, 'falharam'); process.exit(1); }
  console.log('✓ Financeiras:', total, 'conferências ok');
})();
