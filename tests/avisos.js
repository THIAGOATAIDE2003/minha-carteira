/* Testes dos avisos de ideias e balanços no sininho (js/avisos.js, 1.81.0, E8).
   Uso: node tests/avisos.js [--dados ../minha-carteira-dados]   (sem a pasta de dados roda só a parte sintética)
        node tests/avisos.js --mutantes                           (insere defeitos de propósito: cada um tem de fazer algum teste falhar)
   Parte sintética: objetos inventados (nenhum dado real). Parte real: lê a pasta privada só localmente. */
const path = require('path'), fs = require('fs'), crypto = require('crypto'), cp = require('child_process');
const { chromium } = require('playwright');
const { abrirReal } = require('./lib-real');
const RAIZ = process.env.APORTE_APP_DIR || path.resolve(__dirname, '..'), APP = 'file://' + path.join(RAIZ, 'index.html');
const arg = process.argv, val = k => arg.includes(k) ? arg[arg.indexOf(k) + 1] : null;
const DADOS = path.resolve(val('--dados') || path.join(RAIZ, '..', 'minha-carteira-dados'));
const TEM_DADOS = fs.existsSync(path.join(DADOS, 'mercado.json')) && !arg.includes('--sem-dados');
const MUT = val('--mut') || process.env.APORTE_MUT || null;
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra).slice(0, 500)); } };
const HASH_FN = { dvAlerts: 'e2df4c2ccf1c09f2', riAlerts: '31be22f65b7a6546', whyMine: 'ff753988b427f5ec', opData: '9e54e5e4be571bf9', opEtiq: 'baf53c913be31cc4', entInfo: '1e7d5f30aebd52f6', anValCalc: 'ba2abc34a0281f23', stkAna: '8dc074ca12f0b91b', fxFor: '8bf7d1a7fc14eb1c', opCartao: '4e2bc98059316d05', opAlerts: 'd46569394ffefbda', opPorta: 'f72720cc15b96dcb', garRec: '5362e84c936e3e40', opSnap: 'e33216c8d28f2ed3', opCapSetor: '05766c260c419a8b', opGate: 'c4d830e6195b3481', opConf: '324a54e04845441d', saudeFor: '2bc4b3e438cd0756', opSanidade: 'e20703bbfac25ef5', metCiclo: '7dca9a882b796106' };
const HASH_OPDATA = '9e54e5e4be571bf93998d65f91eede584276a34b77bd0e6887b78b80e246138a';
/* defeitos de propósito: [arquivo, trecho certo, trecho com defeito] */
const MUTANTES = {
  'sem-margem-de-1%': ['js/avisos.js', 'AVH=0.01', 'AVH=0'],
  'sem-intervalo-3-dias': ['js/avisos.js', 'AVJ=3*864e5', 'AVJ=0'],
  'sem-intervalo-7-dias': ['js/avisos.js', 'AVE=7*864e5', 'AVE=0'],
  'sem-agrupar': ['js/avisos.js', 'AVMAXG=3', 'AVMAXG=99'],
  'sem-limite-de-6': ['js/avisos.js', 'AVMAXL=6', 'AVMAXL=99'],
  'dado-pela-metade-passa': ['js/avisos.js', 'r.cand<st.cand/2', 'false'],
  'faixa-calculando-passa': ['js/avisos.js', 'all[i].fx.pend)return', 'all[i].fx.pend)continue;if(0)return'],
  'estado-ruim-sem-limpeza': ['js/avisos.js', 's=avNorm(JSON.parse(raw))', 's=JSON.parse(raw)'],
  'primeira-vez-avisa': ['js/avisos.js', 'seed=!st', 'seed=false'],
  'avisa-volta-para-dentro': ['js/avisos.js', "if(np==='dentro')e.p=np;else if", "if(0)e.p=np;else if"],
  'nota-tambem-nas-ideias': ['js/avisos.js', 'if(inW||inM){if(e.n==null)', 'if(1){if(e.n==null)'],
  'saiu-de-quem-nao-acompanha': ['js/avisos.js', 'm=avMotivo(tk,mp);if(m)e.r=0;', "m=avMotivo(tk,mp);if(m){if(m.tx&&!seed)add('saiu',tk,2,2,'Saiu das ideias',m.tx,'');e.r=0}"],
  'ordem-gravidade-antes-da-carteira': ['js/avisos.js', 'a.g-b.g||a.gv-b.gv', 'a.gv-b.gv||a.g-b.g'],
  'corte-de-12-vira-saiu': ['js/avisos.js', 'try{if(!opPorta(o))return {tx:\'Não passa mais nos critérios\'}}catch(e){}return null}', 'return {tx:\'Não passa mais nos critérios\'}}'],
  'sem-retencao-da-ideia': ['js/avisos.js', 'prevD=e.l.indexOf(\'D\')>=0||e.r>0;', 'prevD=e.l.indexOf(\'D\')>=0;'],
  'balanco-repete': ['js/avisos.js', 'if(!s.ck[ck]){', 'if(1){'],
  'balanco-periodo-menor': ['js/avisos.js', 'else if(q.k>e.b){', 'else if(q.k!==e.b){'],
  'sem-frase-da-primeira-vez': ['js/avisos.js', "if(seed)out=[{k:'ini|'", "if(0)out=[{k:'ini|'"],
  'aviso-antigo-nao-some': ['js/noticias.js', '&&!avFaixaOk(tk))o.push(', ')o.push('],
  'numero-vermelho-volta': ['js/mercado-visao.js', "['opp','Ideias']", "['opp','Ideias'+'<i class=\"mkb\">1</i>']"],
  'html-sem-esc': ['js/avisos.js', "<b>'+esc(t)+'</b>", "<b>'+t+'</b>"],
  'sem-aviso-de-celular-fechado': ['js/avisos.js', "sub:sub+(gap?' · desde a sua última abertura':'')", 'sub:sub'],
  'registro-nao-limpa-30-dias': ['js/avisos.js', 'return now-x.ts<30*864e5}).slice(-60)', 'return true}).slice(-600)']
};
const T0 = Date.parse('2026-11-01T15:00:00-03:00'), H = 36e5, D = 864e5;
const PRE = () => {
  window.__o = function (tk, v) { v = v || {}; var px = v.px == null ? 10 : v.px, cons = v.cons || 8, oti = v.oti || 14;
    return { tk: tk, d: { cur: 'BRL', price: px, k: {} }, score: v.score == null ? 8 : v.score, A: { chips: [['Qualidade', v.q || 'Alta']], N: { dy: 5 } }, cf: { n: v.cf || 'Média', w: v.w || [] }, al: [], fxDem: v.dem,
      fx: v.pend ? { ok: false, pend: true, motivo: 'calculando a faixa…' } : v.nofx ? { ok: false, motivo: 'sem histórico da CVM' } : { ok: true, cons: cons, oti: oti, cen: (cons + oti) / 2, opp: v.opp !== false, est: 'perto', F: brl, espPct: 0.2, ms: 0.1 } }; };
  window.__r = function (L) { return { W: L.W || [], M: L.M || [], D: L.D || [], X: L.X || [], n: 0, cand: L.cand || 160 }; };
  window.__q = function (m) { MD.d = MD.d || {}; MD.d.cvm = { q: m }; };
  window.__ev = function (c) { return (c.ev || []).filter(function (e) { return e.ty !== 'ini'; }); };
  window.__tx = function (c) { return __ev(c).map(function (e) { return e.ty + ':' + e.tk + ':' + e.tx; }); };
};
const mutar = async () => {}; /* o defeito é aplicado numa cópia do app (pasta temporária), ver --mutantes */

async function sintetico(b) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 } }), p = await ctx.newPage(), erros = [], rede = [];
  p.on('pageerror', e => erros.push(e.message)); p.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) rede.push(r.url()); });
  await mutar(ctx);
  await ctx.route(u => !/^(file|data):/.test(u.toString()), r => r.abort());
  await p.addInitScript(() => { window.__APORTE_TESTE__ = true; });
  await p.goto(APP); await p.waitForFunction(() => window.__aporte); await p.waitForTimeout(1600); const md0 = await p.evaluate(() => AV.md); await p.evaluate(PRE);
  ok('Gatilhos: ao abrir o app, o ciclo só é liberado depois que o carregamento dos dados do robô termina (AV.md ligado pelo arranque)', md0 === 1, md0);
  const E = (fn, a) => p.evaluate(fn, a);
  /* ---------- A1 primeira abertura e dado incompleto ---------- */
  const A1 = await E(({ H }) => {
    const t0 = Date.now() - 5 * H, star = __o('STAR3'), car = __o('CART3'), ide = __o('IDEI3'), r0 = __r({ W: [star], M: [car], D: [star, ide] });
    const c = avCalc(r0, null, t0), o = { seed: c.seed, tys: c.ev.map(e => e.ty), tx: c.ev.map(e => e.tx), tks: Object.keys(c.st.t).sort() };
    avGravar(c.st); o.linhas = avAlertas().map(a => a.tx);
    const c1 = avCalc(__r({ W: [star], M: [car], D: [star, ide, __o('NOVA3')] }), c.st, t0 + H); o.apos = __tx(c1); avGravar(c1.st); o.linhas2 = avAlertas().map(a => a.ty);
    const inc = {}; inc.nulo = avCalc(null, c.st, t0 + 2 * H); inc.semX = avCalc({ W: [], M: [], D: [] }, c.st, t0 + 2 * H);
    inc.pend = avCalc(__r({ W: [star, __o('PEND3', { pend: true })], D: [star] }), c.st, t0 + 2 * H); inc.metade = avCalc(__r({ W: [star], D: [star], cand: 70 }), c.st, t0 + 2 * H); inc.limite = avCalc(__r({ W: [star], D: [star], cand: 80 }), c.st, t0 + 2 * H);
    o.inc = { nulo: inc.nulo.d, semX: inc.semX.d, pend: inc.pend.d, metade: inc.metade.d, limiteOk: !inc.limite.d, semSt: !inc.pend.st && !inc.metade.st && !inc.nulo.st };
    localStorage.removeItem(AVSK); AV.rd = 0; AV.st = null; AV.ok = 0; AV.md = 1; const so = window.opData; window.opData = function () { return null; }; avCiclo(true); o.nadaGravado = localStorage.getItem(AVSK) === null && AV.ok === 0;
    window.opData = function () { return __r({ W: [star], D: [star], cand: 160 }); }; avCiclo(true); o.gravouSemente = !!localStorage.getItem(AVSK) && AV.ok === 1; window.opData = so; return o; }, { H });
  ok('A1 primeira abertura: semeia, nenhuma linha além da frase única', A1.seed === true && A1.tys.join() === 'ini' && A1.tx[0] === 'Os avisos começam a aparecer a partir de agora.' && A1.linhas.length === 1 && A1.tks.join() === 'CART3,IDEI3,STAR3', A1);
  ok('A1 depois da semente, ideia nova avisa e a frase da primeira vez some', A1.apos.join() === 'nova:NOVA3:Nova ideia' && A1.linhas2.join() === 'nova', A1);
  ok('A1 dado incompleto (nulo, sem listas, faixa calculando, menos da metade das candidatas) descarta sem gravar; metade exata passa', A1.inc.nulo && A1.inc.semX && A1.inc.pend === 'faixa calculando' && A1.inc.metade === 'dados incompletos' && A1.inc.limiteOk && A1.inc.semSt, A1.inc);
  ok('A1 ciclo com opData vazio não grava nada; com dado bom grava a semente', A1.nadaGravado && A1.gravouSemente, A1);
  /* ---------- A2/A3 posição na faixa, margem de 1%, intervalo de 3 dias ---------- */
  const A2 = await E(({ t0, D, H }) => {
    const mk = px => __r({ W: [__o('AAA3', { px: px })] }), o = {}; let st = avCalc(mk(10), null, t0).st, t = t0;
    const passo = (px, dt) => { t += dt; const c = avCalc(mk(px), st, t); st = c.st; return { ev: __ev(c), p: st.t.AAA3.p }; };
    o.osc = []; [7.96, 8.04, 7.95, 8.05, 8.0, 14.07, 13.95, 14.1, 9.9, 10].forEach(px => o.osc.push(passo(px, H).ev.length)); o.pOsc = st.t.AAA3.p;
    const a = passo(7.5, H); o.abaixo = a.ev.map(e => e.tx + '|' + e.sub + '|' + e.g + '|' + e.gv);
    const b = passo(10, D); o.volta = [b.ev.length, b.p];
    const c = passo(7.5, D); o.bloq = [c.ev.length, c.p];
    const d = passo(7.5, 3 * D); o.libera = d.ev.map(e => e.tx);
    const e = passo(10, D); const f = passo(15, 4 * D); o.acima = f.ev.map(x => x.tx + '|' + x.gv); const g = passo(10, D); o.voltaAcima = [g.ev.length, g.p];
    return o; }, { t0: T0, D, H });
  ok('A3 margem de 1%: preço oscilando ±0,5% do limite = 0 avisos e posição não muda', A2.osc.every(n => n === 0) && A2.pOsc === 'dentro', A2);
  ok('A2 passou para Abaixo da faixa: texto, preço e "antes: Dentro da faixa" (carteira=0, lista=1, ideias=2)', A2.abaixo.length === 1 && /^Passou para Abaixo da faixa\|Preço R\$\s7,50 · antes: Dentro da faixa\|1\|4$/.test(A2.abaixo[0].replace(/ /g, ' ')), A2.abaixo);
  ok('A2 voltar para Dentro NÃO avisa (decisão do Thiago)', A2.volta[0] === 0 && A2.volta[1] === 'dentro', A2.volta);
  ok('A3 intervalo mínimo de 3 dias por ação: novo cruzamento em 1 dia fica adiado e a posição não muda; passados 3 dias avisa', A2.bloq[0] === 0 && A2.bloq[1] === 'dentro' && A2.libera.join() === 'Passou para Abaixo da faixa', A2);
  ok('A2 passou para Acima da faixa avisa; voltar a Dentro de lá também não', A2.acima.length === 1 && /^Passou para Acima da faixa\|1$/.test(A2.acima[0]) && A2.voltaAcima[0] === 0 && A2.voltaAcima[1] === 'dentro', A2);
  /* ---------- nota (só carteira e lista) ---------- */
  const A3 = await E(({ t0, D, H }) => {
    const o = {}; let t = t0; const W = (n, m) => __r({ W: [__o('NOT3', { score: n })], D: [__o('IDE3', { score: m })] });
    let st = avCalc(W(8, 5), null, t).st; const passo = (n, m, dt) => { t += dt; const c = avCalc(W(n, m), st, t); st = c.st; return __ev(c); };
    o.menor = passo(8.9, 5, H).length; o.sobe = passo(9, 5, H).map(e => e.tx + '|' + e.sub + '|' + e.gv + '|' + e.g); o.novaRef = passo(9.5, 5, 4 * D).length;
    o.cai = passo(8, 5, D).map(e => e.tx + '|' + e.sub + '|' + e.gv); o.ideia = passo(8, 9.5, 5 * D).length; o.refIdeia = st.t.IDE3.n; o.float = (() => { let s2 = avCalc(__r({ W: [__o('F3', { score: 8.1 })] }), null, t).st; return __ev(avCalc(__r({ W: [__o('F3', { score: 9.1 })] }), s2, t + 4 * D)).length; })();
    return o; }, { t0: T0, D, H });
  ok('A2 nota: 0,9 não avisa; 1,0 avisa "Nota subiu" (De 8,0 para 9,0); a referência recomeça; depois cai 1,0 e avisa "Nota caiu"', A3.menor === 0 && A3.sobe.length === 1 && /^Nota subiu\|De 8,0 para 9,0\|6\|1$/.test(A3.sobe[0]) && A3.novaRef === 0 && A3.cai.length === 1 && /^Nota caiu\|De 9,0 para 8,0\|3$/.test(A3.cai[0]) && A3.float === 1, A3);
  ok('A2 nota de ideia nova (fora da lista e da carteira) NÃO avisa (decisão do Thiago)', A3.ideia === 0 && A3.refIdeia === 9.5, A3);
  /* ---------- balanço novo ---------- */
  const A4 = await E(({ t0, D, H }) => {
    const o = {}; let t = t0, st; const one = (fx, tk) => __r({ W: [__o(tk || 'BAL3', fx)] });
    __q({ BAL3: [[2026, 2, 1, 1]] }); st = avCalc(one({ cons: 14.2, oti: 23.1 }), null, t).st;
    __q({ BAL3: [[2026, 2, 1, 1], [2026, 3, 1, 1]] }); t += H; let c = avCalc(one({ cons: 15.8, oti: 25.4 }), st, t); st = c.st; o.novo = __ev(c).map(e => e.tx + '|' + e.sub + '|' + e.gv);
    t += D; c = avCalc(one({ cons: 15.8, oti: 25.4 }), st, t); st = c.st; o.repete = __ev(c).length;
    __q({ BAL3: [[2026, 1, 1, 1]] }); t += D; c = avCalc(one({ cons: 15.8, oti: 25.4 }), st, t); st = c.st; o.menor = __ev(c).length; o.bAntes = st.t.BAL3.b;
    __q({ BAL3: [[2026, 3, 1, 1]] }); t += D; c = avCalc(one({ cons: 15.8, oti: 25.4 }), st, t); o.mesmo = __ev(c).length; st.t.BAL3.b = 20262; o.chave = __ev(avCalc(one({ cons: 15.8, oti: 25.4 }), st, t + 1)).length;
    __q({ ANO3: [[2025, 4, 1, 1]] }); let s2 = avCalc(one({}, 'ANO3'), null, t).st; __q({ ANO3: [[2025, 4, 1, 1], [2026, 1, 1, 1]] }); o.virada = __ev(avCalc(one({}, 'ANO3'), s2, t + D)).map(e => e.tx);
    __q({ SEM3: [[2026, 2, 1, 1]] }); s2 = avCalc(one({ nofx: 1 }, 'SEM3'), null, t).st; __q({ SEM3: [[2026, 2, 1, 1], [2026, 3, 1, 1]] }); o.semAntes = __ev(avCalc(one({ cons: 9, oti: 12 }, 'SEM3'), s2, t + D)).map(e => e.sub);
    __q({ IGU3: [[2026, 2, 1, 1]] }); s2 = avCalc(one({ cons: 10, oti: 20 }, 'IGU3'), null, t).st; __q({ IGU3: [[2026, 2, 1, 1], [2026, 3, 1, 1]] }); o.quase = __ev(avCalc(one({ cons: 10.05, oti: 20.1 }, 'IGU3'), s2, t + D)).map(e => e.sub);
    __q({ IDB3: [[2026, 2, 1, 1]] }); s2 = avCalc(__r({ D: [__o('IDB3')] }), null, t).st; __q({ IDB3: [[2026, 2, 1, 1], [2026, 3, 1, 1]] }); o.ideia = __ev(avCalc(__r({ D: [__o('IDB3')] }), s2, t + D)).map(e => e.tx);
    __q({}); return o; }, { t0: T0, D, H });
  ok('A2 balanço novo (3T26) com "Faixa de X para Y" e gravidade máxima', A4.novo.length === 1 && /^Balanço novo \(3T26\)\|Faixa de R\$\s14,20 a R\$\s23,10 para R\$\s15,80 a R\$\s25,40\|0$/.test(A4.novo[0].replace(/ /g, ' ')), A4.novo);
  ok('A3 balanço só uma vez por trimestre; período MENOR ignorado (e não desfaz o guardado)', A4.repete === 0 && A4.chave === 0 && A4.menor === 0 && A4.bAntes === 20263 && A4.mesmo === 0, A4);
  ok('A2 balanço: virada de ano (4T25 → 1T26), sem faixa antes ("Faixa agora"), faixa quase igual, e vale para ideia nova', A4.virada.join() === 'Balanço novo (1T26)' && /^Faixa agora R\$\s9,00 a R\$\s12,00$/.test((A4.semAntes[0] || '').replace(/ /g, ' ')) && A4.quase.join() === 'Faixa quase igual' && A4.ideia.join() === 'Balanço novo (3T26)', A4);
  /* ---------- saiu das ideias (só acompanhadas), corte de 12, volta ---------- */
  const A5 = await E(({ t0, D, H }) => {
    const o = {}, S = (tk, v) => __o(tk, v), r = (W, Dd, X) => __r({ W: W, D: Dd, X: X || [] });
    let st = avCalc(r([S('ST1'), S('ST2'), S('ST3'), S('ST4')], [S('ST1'), S('ST2'), S('ST3'), S('ST4'), S('NAO3')]), null, t0).st;
    const c = avCalc(r([S('ST1'), S('ST2', { opp: false }), S('ST3', { score: 5 }), S('ST4')], [S('ST4')], [S('ST1', { dem: 'preço desatualizado: 5 dias' }), S('NAO3')]), st, t0 + 8 * D);
    o.tx = __tx(c).filter(x => /^saiu/.test(x)).sort(); o.sub = __ev(c).filter(e => e.ty === 'saiu').map(e => e.sub.replace(' · desde a sua última abertura', '')).sort(); o.naoAcomp = __ev(c).filter(e => e.tk === 'NAO3').length;
    return o; }, { t0: T0, D, H });
  ok('A2 saiu das ideias só de ação com estrela, com motivo (verificação, preço acima do limite, critérios)', A5.tx.join() === 'saiu:ST1:Saiu das ideias,saiu:ST2:Saiu das ideias,saiu:ST3:Saiu das ideias' && A5.sub.join() === 'Não passa mais nos critérios,Passou para Em verificação (preço desatualizado),Preço acima do limite para ser ideia' && A5.naoAcomp === 0, A5);
  const A5b = await E(({ t0, D, H }) => {
    const o = {}, S = (tk, v) => __o(tk, v), r = (D1, X) => __r({ W: [S('EST3')], D: D1, X: X || [] }); let st = avCalc(r([]), null, t0).st, t = t0; const ev = [];
    const passo = (dt, D1, X) => { t += dt; const c = avCalc(r(D1, X), st, t); st = c.st; __ev(c).forEach(e => ev.push(e.ty)); };
    passo(H, [S('EST3')]); passo(D, [], [S('EST3', { dem: 'x' })]); passo(D, [S('EST3')]); passo(D, [], [S('EST3', { dem: 'x' })]); o.antes = ev.join(); passo(8 * D, [S('EST3')]); passo(1 * D, [], [S('EST3', { dem: 'x' })]); o.depois = ev.join(); return o; }, { t0: T0, D, H });
  ok('A3 intervalo de 7 dias para entrou/saiu da mesma ação: o vai-e-volta em dias seguidos dá só 1 aviso; passados 7 dias volta a avisar', A5b.antes === 'nova' && A5b.depois === 'nova,nova', A5b);
  const A6 = await E(({ t0, D, H }) => {
    const o = {}, S = (tk, v) => __o(tk, v), nomes = []; for (let i = 1; i <= 14; i++) nomes.push('R' + (i < 10 ? '0' : '') + i + '3');
    const top = (ex) => nomes.filter(n => ex.indexOf(n) < 0).slice(0, 12).map(n => S(n)), W = [S('R123'), S('R023')];
    let st = avCalc(r(W, top(['R133', 'R143'])), null, t0).st; function r(W, Dd) { return __r({ W: W, D: Dd, X: [] }); }
    const ev = []; let t = t0;
    const passo = (ex, dt) => { t += dt; const c = avCalc(r(W, top(ex)), st, t); st = c.st; __ev(c).forEach(e => ev.push(e.ty + ':' + e.tk)); return c; };
    passo(['R123', 'R143'], 8 * D); const retida = st.t.R123.r > 0; passo(['R133', 'R143'], 8 * D); passo(['R123', 'R143'], 8 * D); passo(['R133', 'R143'], 8 * D);
    o.ev = ev; o.retida = retida; o.volta = st.t.R123.r === 0 && st.t.R123.l.indexOf('D') >= 0;
    t += 40 * D; passo(['R123', 'R143'], 0); const c2 = passo(['R133', 'R143'], 1 * D); o.expira = [st.t.R123.r];
    return o; }, { t0: T0, D, H });
  ok('Ajuste 5 (corte de 12): ideia que sai só por cair do corte NÃO gera "saiu" nem "nova ideia" ao voltar; só quem nunca esteve na lista gera "nova ideia"', A6.ev.join() === 'nova:R133' && A6.retida && A6.volta, A6);
  /* ---------- agrupar, 6 linhas, janela, ordem ---------- */
  const A7 = await E(({ t0, D, H }) => {
    const o = {}; const nv = n => { const L = []; for (let i = 0; i < n; i++) L.push(__o('NV' + i + '3')); return L; };
    const base = avCalc(__r({ W: [__o('BASE3')] }), null, t0).st;
    const c4 = avCalc(__r({ W: [__o('BASE3')], D: nv(4) }), base, t0 + H), c3 = avCalc(__r({ W: [__o('BASE3')], D: nv(3) }), base, t0 + H), c6 = avCalc(__r({ W: [__o('BASE3')], D: nv(6) }), base, t0 + H);
    o.g4 = c4.ev.map(e => e.ty + '|' + e.tx + '|' + e.sub + '|' + e.n); o.n3 = c3.ev.map(e => e.ty).join(); o.g6 = c6.ev.map(e => e.n).join();
    const mk = (g, gv, ty, ts, tk) => ({ k: ty + tk + ts, ty: ty, tk: tk, g: g, gv: gv, ts: ts, tx: 'tx ' + tk, sub: 's', n: 0, tks: [] }), now = Date.now();
    const log = [mk(2, 5, 'nova', now - 1000, 'DDD3'), mk(1, 4, 'faixa', now - 2000, 'WWW3'), mk(0, 6, 'nota', now - 3000, 'MMM3'), mk(0, 0, 'bal', now - 4000, 'MBL3'), mk(1, 1, 'faixa', now - 5000, 'WAC3'), mk(2, 5, 'nova', now - 6000, 'DD23'), mk(0, 3, 'nota', now - 7000, 'MCA3'), mk(2, 5, 'nova', now - 8000, 'VELHA1'), mk(1, 0, 'bal', now - 15 * D, 'FORA3'), mk(0, 0, 'ini', now - 4 * D, 'X')];
    log[9].ty = 'ini'; log[9].tk = ''; avGravar({ v: 1, ini: '2026-11-01', at: now, cand: 160, t: {}, log: log, ck: {} }); AV.rd = 0; AV.st = null; const L = avAlertas();
    o.n = L.length; o.ordem = L.map(a => a.tk).join(); o.fora = L.filter(a => a.tk === 'FORA3' || a.ty === 'ini').length;
    const velho = []; for (let i = 0; i < 80; i++) velho.push(mk(2, 5, 'nova', t0 - 40 * D + i, 'V' + i + '3')); for (let i = 0; i < 80; i++) velho.push(mk(2, 5, 'nova', t0 - 1000 + i, 'N' + i + '3'));
    const c = avCalc(__r({ W: [__o('BASE3')] }), { v: 1, ini: 'x', at: t0 - D, cand: 160, t: base.t, log: velho, ck: {} }, t0); o.log = c.st.log.length; o.logVelho = c.st.log.filter(x => x.ts < t0 - 30 * D).length;
    return o; }, { t0: T0, D, H });
  ok('A3 mais de 3 do mesmo tipo e grupo viram UMA linha (com até 4 tickers e "toque para ver"); 3 continuam separadas', A7.g4.length === 1 && A7.g4[0].split('|')[0] === 'gnova' && /^4 ações são novas ideias\|NV03, NV13, NV23, NV33 · toque para ver\|4$/.test(A7.g4[0].split('|').slice(1).join('|')) && A7.n3 === 'nova,nova,nova' && A7.g6 === '6', A7);
  ok('A3 gaveta mostra no máximo 6 linhas das 6 mais recentes, ordenadas por carteira → lista → ideias e depois gravidade; janela de 14 dias; frase da primeira vez some depois de 3 dias', A7.n === 6 && A7.ordem === 'MBL3,MMM3,WAC3,WWW3,DDD3,DD23' && A7.fora === 0, A7);
  ok('A3 registro guarda no máximo 60 avisos e nada com mais de 30 dias', A7.log <= 60 && A7.logVelho === 0, A7);
  /* ---------- só W/M/D ---------- */
  const A8 = await E(({ t0, D }) => {
    const st = avCalc(__r({ W: [__o('AAA3')] }), null, t0).st, c = avCalc(__r({ W: [__o('AAA3')], X: [__o('VER3', { px: 5 })] }), st, t0 + 8 * D); const c2 = avCalc(__r({ W: [__o('AAA3')], X: [__o('VER3', { px: 9 })] }), c.st, t0 + 16 * D);
    return { ev: __ev(c).length + __ev(c2).length, tem: Object.keys(c2.st.t).join() }; }, { t0: T0, D });
  ok('A3 Em verificação e ações fora da lista, da carteira e das ideias nunca avisam nem entram no registro', A8.ev === 0 && A8.tem === 'AAA3', A8);
  /* ---------- A4 celular fechado por dias ---------- */
  const A9 = await E(({ t0, D, H }) => {
    const o = {}, S = (tk, v) => __o(tk, v), r0 = __r({ W: [S('ST1'), S('CAR3', { score: 8 })], M: [S('CAR3', { score: 8 })], D: [S('ST1'), S('IDE3')] });
    __q({ ST1: [[2026, 2, 1, 1]] }); const st = avCalc(r0, null, t0).st;
    __q({ ST1: [[2026, 2, 1, 1], [2026, 3, 1, 1]] }); const r1 = __r({ W: [S('ST1', { px: 7, cons: 8.5, oti: 15 }), S('CAR3', { score: 9 })], M: [S('CAR3', { score: 9 })], D: [S('ST1', { px: 7, cons: 8.5, oti: 15 }), S('NOVA3')], X: [S('IDE3')] });
    const c = avCalc(r1, st, t0 + 20 * D); o.ev = __tx(c).sort(); o.desde = __ev(c).every(e => / · desde a sua última abertura$/.test(e.sub)); const c2 = avCalc(r1, c.st, t0 + 20 * D + H); o.dup = __ev(c2).length;
    __q({ ST1: [[2026, 2, 1, 1]] }); const cc = avCalc(r0, st, t0 + 20 * D); o.liquidoZero = __ev(cc).length; const cd = avCalc(r1, st, t0 + 20 * H / 20 + H); o.semDesde = __ev(cd).every(e => !/desde a sua/.test(e.sub));
    __q({}); return o; }, { t0: T0, D, H });
  ok('A4 celular fechado 20 dias: aparece o que mudou no líquido (faixa, nota, balanço, nova ideia) com "desde a sua última abertura"; nada duplica ao rodar de novo; entrou-e-saiu = 0 aviso; sem o texto quando passou pouco tempo',
    A9.ev.join() === 'bal:ST1:Balanço novo (3T26),faixa:ST1:Passou para Abaixo da faixa,nota:CAR3:Nota subiu,nova:NOVA3:Nova ideia' && A9.desde && A9.dup === 0 && A9.liquidoZero === 0 && A9.semDesde, A9);
  /* ---------- A5 registro corrompido ou apagado ---------- */
  const lixos = ['lixo', '[]', 'null', '"x"', '{"v":99,"t":{},"log":[],"ck":{},"at":1}', '{"v":1,"at":1,"t":[],"log":[],"ck":{}}', '{"v":1}', '{"v":1,"at":1,"t":{"A3":"x"},"log":{},"ck":{}}', '{"v":1,"at":"ontem","t":{},"log":[],"ck":{}}', 'x'.repeat(250000), ''];
  const A10 = await E(({ lixos }) => {
    const out = []; const alvo = { 'minha-carteira-v1': localStorage.getItem('minha-carteira-v1'), 'minha-carteira-v1-opp': '{"AAA3":[["2026-11-20",8,10,9]]}', 'minha-carteira-v1-gar': '{"r":{}}', 'minha-carteira-v1-met': '{"x":1}' };
    Object.keys(alvo).forEach(k => { if (alvo[k] != null) localStorage.setItem(k, alvo[k]); });
    const star = __o('STAR3'), r0 = __r({ W: [star], D: [star, __o('IDEI3')] }); const so = window.opData; window.opData = function () { return r0; }; AV.md = 1;
    lixos.concat([null]).forEach(function (raw) {
      localStorage.removeItem(AVSK + '-ruim'); if (raw == null) localStorage.removeItem(AVSK); else localStorage.setItem(AVSK, raw); AV.rd = 0; AV.st = null; AV.ok = 0;
      let lido, antes = 'x', depois; try { lido = avLer(); } catch (e) { lido = 'ERRO ' + e.message; }
      const ruim = localStorage.getItem(AVSK + '-ruim'); let un; try { un = ntUnread(); } catch (e) { un = 'ERRO'; }
      avCiclo(true); const st = JSON.parse(localStorage.getItem(AVSK) || 'null');
      const intactos = Object.keys(alvo).every(k => localStorage.getItem(k) === alvo[k] || (alvo[k] == null && localStorage.getItem(k) == null));
      out.push({ raw: raw == null ? 'apagado' : raw.slice(0, 12), lidoNulo: lido === null, ruim: ruim === raw || (raw === '' || raw == null ? ruim === null : false), ruimNulo: ruim === null, semeou: !!(st && st.v === 1 && st.t.STAR3 && st.log.length === 1 && st.log[0].ty === 'ini'), un: un, intactos: intactos });
    }); window.opData = so; return out; }, { lixos });
  ok('A5 registro corrompido de 10 formas e apagado: semeia sem avisos, guarda a string ruim, não quebra e não toca carteira, -opp, -gar nem -met', A10.every(x => x.lidoNulo && x.semeou && x.intactos && typeof x.un === 'number') && A10.filter(x => x.raw !== 'apagado' && x.raw !== '' && x.raw !== 'xxxxxxxxxxxx').every(x => x.ruim) && A10.filter(x => x.raw === 'xxxxxxxxxxxx').every(x => x.ruimNulo), A10.filter(x => !(x.lidoNulo && x.semeou && x.intactos && typeof x.un === 'number')));
  /* ---------- A6 sininho e gaveta ---------- */
  const A11 = await E(async ({ t0 }) => {
    const o = {}, so = window.opData, S = (tk, v) => __o(tk, v), esperar = ms => new Promise(r => setTimeout(r, ms)); localStorage.removeItem(AVSK); AV.rd = 0; AV.st = null; AV.md = 1; NT.seen = 0;
    const r0 = __r({ W: [S('STAR3')], M: [S('CART3')], D: [S('STAR3'), S('IDEI3')] }); window.opData = function () { return r0; }; OPC = { k: 't', r: r0 }; avCiclo(true);
    o.semente = [avAlertas().length, ntUnread() - (function () { var s = AV.st; AV.st = { v: 1, ini: '', at: 1, cand: 0, t: {}, log: [], ck: {} }; var n = ntUnread(); AV.st = s; return n; })()];
    NT.seen = Date.now() + 1000; NT.seen = Date.now(); await esperar(5);
    const nv = []; for (let i = 0; i < 5; i++) nv.push(S('NV' + i + '3')); const r1 = __r({ W: [S('STAR3', { px: 7 })], M: [S('CART3', { score: 9.5 })], D: [S('STAR3', { px: 7 }), S('IDEI3')].concat(nv) }); window.opData = function () { return r1; }; OPC = { k: 't2', r: r1 };
    const base = (function () { var s = AV.st; AV.st = { v: 1, ini: '', at: 1, cand: 0, t: {}, log: [], ck: {} }; var n = ntUnread(); AV.st = s; return n; })(); AV.ok = 0; avCiclo(true);
    o.linhas = avAlertas().map(a => a.tx + '|' + a.tk); o.nao = ntUnread() - base; o.badge = $('bellb').textContent; o.badgeVisivel = !$('bellb').hidden;
    ndOpen(); await esperar(300); const b = $('nd-b'), lin = [].slice.call(b.querySelectorAll('[role=button],.ndi')).filter(e => /Ideias e|Passou|Nota|Nova|ações/.test(e.textContent)); o.secao = /Ideias e balanços das suas ações/.test(b.textContent); o.ordem = [].slice.call(b.querySelectorAll('[aria-label]')).map(e => e.getAttribute('aria-label')).filter(t => /Novo:/.test(t)).map(t => t.split(' · ')[0].replace('Novo: ', ''));
    o.novas = b.querySelectorAll('.ndi.nw').length; o.aria = [].slice.call(b.querySelectorAll('[data-ndw],[data-ndi]')).every(e => e.getAttribute('role') === 'button' && e.getAttribute('aria-label') && e.tabIndex === 0); o.alvo = Math.min.apply(null, [].slice.call(b.querySelectorAll('[data-ndw],[data-ndi]')).map(e => e.getBoundingClientRect().height));
    o.barra = (function () { var e = b.querySelector('.ndi.nw'); var cs = getComputedStyle(e); return parseFloat(cs.borderLeftWidth) >= 3 && cs.borderLeftColor !== 'rgba(0, 0, 0, 0)'; })();
    window.__abre = []; window.stkOpen = function (k) { window.__abre.push(k); }; b.querySelector('[data-ndw]').click(); await esperar(400); o.abriu = window.__abre.slice(); ndOpen(); await esperar(300);
    const g = $('nd-b').querySelector('[data-ndi]'); o.grupo = !!g; if (g) { g.click(); await esperar(400); o.ideias = [MKV, ANV, OPV, !$('mkttab').hidden]; }
    ndOpen(); await esperar(3000); o.lidoDepois = [ntUnread() - base, $('bellb').hidden]; window.opData = so; return o; }, { t0: T0 });
  ok('A6 sininho: número = linhas não lidas (linha agrupada conta 1); depois de aberto e lido (2,5 s) zera', A11.badge === String(A11.nao) && A11.nao === A11.linhas.length && A11.badgeVisivel && A11.lidoDepois[0] === 0 && A11.lidoDepois[1] === true, A11);
  ok('A6/A9 gaveta: seção "Ideias e balanços das suas ações", linhas com role=button, aria-label, alvo ≥ 44 px e barra de "novo" de 3 px', A11.secao && A11.aria && A11.alvo >= 44 && A11.barra && A11.novas >= 3, A11);
  ok('Ajuste 4 e A6: ordem na gaveta (carteira antes de lista e de ideias); toque na ação abre a ação; toque na linha agrupada abre Mercado → Análise → Ideias novas', A11.ordem[0] && /^Nota subiu/.test(A11.ordem[0]) && /^Passou para Abaixo/.test(A11.ordem[1]) && /^5 ações são novas ideias/.test(A11.ordem[2]) && A11.abriu.join() === 'CART3' && A11.ideias && A11.ideias.slice(0, 3).join() === 'ana,opp,gar' && A11.ideias[3] === true, A11);
  const A12 = await E(async () => {
    const esperar = ms => new Promise(r => setTimeout(r, ms)), mk = (ty, tx, sub) => ({ k: ty + tx, ty: ty, tk: 'XSS3', g: 2, gv: 5, ts: Date.now(), tx: tx, sub: sub, n: 0, tks: [] });
    avGravar({ v: 1, ini: '', at: Date.now(), cand: 1, t: {}, log: [mk('nova', '<img src=x onerror="window.__xss=1">', '<b>negrito</b><script>window.__xss=2<\/script>')], ck: {} }); ndRender(); const b = $('nd-b');
    const o = { img: b.querySelectorAll('img').length, xss: window.__xss === undefined, texto: /<img src=x/.test(b.textContent) && /<b>negrito<\/b>/.test(b.textContent) };
    avGravar({ v: 1, ini: '', at: Date.now(), cand: 1, t: {}, log: [], ck: {} }); ndRender(); o.vazia = !/Ideias e balanços das suas ações/.test($('nd-b').textContent); return o; });
  ok('A6 sem HTML injetável (esc em texto e ticker) e a seção some quando não há avisos', A12.img === 0 && A12.xss && A12.texto && A12.vazia, A12);
  /* ---------- A7 uma só bolinha vermelha ---------- */
  const A13 = await E(() => {
    const so = window.opData, r = __r({ W: [__o('AAA3')], D: [__o('BBB3')] }); r.n = 5; let chamadas = 0; window.opData = function () { chamadas++; return r; }; const fonte = typeof opData().n; chamadas = 0;
    MKV = 'ana'; ANV = 'opp'; const c0 = chamadas; renderMkt(); const mk = [].slice.call(document.querySelectorAll('#mkseg button')).map(b => b.innerHTML), an = anSeg(); window.opData = so;
    return { mk: mk, an: /Ideias<\/button>/.test(an) && !/mkb/.test(an), mkb: document.querySelectorAll('.mkb').length, chamou: chamadas > c0, bell: !!$('bellb'), fonte: fonte, css: [].slice.call(document.styleSheets).some(s => { try { return [].slice.call(s.cssRules).some(x => /\.mkb/.test(x.cssText)); } catch (e) { return false; } }) }; });
  ok('A7 uma só bolinha vermelha: botões "Análise" e "Ideias" sem número, #bellb existe, opData().n continua existindo, o cálculo (e o registro diário) continua sendo chamado ao desenhar', A13.mk.indexOf('Ideias e análise') >= 0 && A13.mk.every(h => !/<i/.test(h)) && A13.an && A13.mkb === 0 && A13.chamou && A13.bell && A13.fonte === 'number' && !A13.css, A13);
  /* ---------- A8 aviso antigo, A10 sem push, A13 sw/CSP ---------- */
  const A14 = await E(() => {
    const o = {}; OPC = { k: 'a', r: { W: [{ tk: 'COM3', fx: { ok: true } }], M: [{ tk: 'MIN3', fx: { ok: true } }], D: [{ tk: 'IDE3', fx: { ok: true } }, { tk: 'BAN3', fx: { ok: false, banco: true } }] } };
    o.faixa = ['COM3', 'MIN3', 'IDE3', 'BAN3', 'OUT3'].map(avFaixaOk).join(); OPC = { k: '', r: null }; o.sem = avFaixaOk('COM3'); return o; });
  ok('A8 aviso antigo "Entrou na faixa confortável" some só das ações que já têm a faixa nova (lista, carteira e ideias); financeira sem faixa e ação fora das listas continuam com o antigo', A14.faixa === 'true,true,true,false,false' && A14.sem === false, A14);
  const fontes = fs.readdirSync(path.join(RAIZ, 'js')).map(f => fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8')).join('\n');
  ok('A10 sem push: nenhum Notification, pushManager ou requestPermission no código', !/\bNotification\b|pushManager|requestPermission/.test(fontes), null);
  const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8'), idx = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  ok('A13 service worker guarda js/avisos.js, index.html carrega o script depois do metodo.js e a CSP não ganhou domínio', /'js\/avisos\.js'/.test(sw) && idx.indexOf('js/metodo.js') < idx.indexOf('js/avisos.js') && idx.indexOf('js/avisos.js') > idx.indexOf('js/noticias.js') && idx.indexOf('js/avisos.js') > idx.indexOf('js/cartao.js'), null);
  const dom = s => [...new Set((s.match(/https?:\/\/[a-zA-Z0-9.-]+/g) || []))].sort().join();
  ok('A13 nenhum domínio novo em avisos.js', dom(fs.readFileSync(path.join(RAIZ, 'js/avisos.js'), 'utf8')) === '', dom(fs.readFileSync(path.join(RAIZ, 'js/avisos.js'), 'utf8')));
  /* ---------- A9 telas: 320 e 360 px, três temas, fonte ×1,3 ---------- */
  const telas = [];
  for (const w of [320, 360]) for (const tema of ['atual', 'branco', 'preto']) for (const k of [1, 1.3]) {
    await p.setViewportSize({ width: w, height: 740 });
    const r = await E(async ({ tema, k }) => {
      const esperar = ms => new Promise(r => setTimeout(r, ms)), now = Date.now(), mk = (g, gv, ty, tk, tx, sub, n, tks) => ({ k: ty + tk + tx, ty: ty, tk: tk, g: g, gv: gv, ts: now - gv * 1000, tx: tx, sub: sub, n: n || 0, tks: tks || [] });
      setTema(tema); NT.seen = 0; avGravar({ v: 1, ini: '', at: now, cand: 1, t: {}, ck: {}, log: [mk(0, 0, 'bal', 'ALFA3', 'Balanço novo (3T26)', 'Faixa de R$ 14,20 a R$ 23,10 para R$ 15,80 a R$ 25,40 · desde a sua última abertura'), mk(0, 1, 'faixa', 'BETA4', 'Passou para Acima da faixa', 'Preço R$ 72,10 · antes: Dentro da faixa'), mk(1, 3, 'gnota', '', '4 ações mudaram de nota', 'GAMA3, DELT3, EPSI3, ZETA3 · toque para ver', 4, ['GAMA3']), mk(2, 5, 'nova', 'ZETA3', 'Nova ideia', 'Confiança média · nota 9,0 · Dentro da faixa')] });
      ndOpen(); await esperar(350); const raiz = [].slice.call(document.querySelectorAll('#nd, #nd *')); if (k !== 1) { const f0 = raiz.map(e => parseFloat(getComputedStyle(e).fontSize)); raiz.forEach((e, i) => { e.style.fontSize = (f0[i] * k) + 'px'; }); }
      const b = $('nd-b'), linhas = [].slice.call(b.querySelectorAll('[data-ndw],[data-ndi]')), larg = b.getBoundingClientRect().width;
      const o = { rolagem: b.scrollWidth > b.clientWidth + 1, fora: linhas.some(e => e.getBoundingClientRect().right > b.getBoundingClientRect().right + 1), alvo: Math.min.apply(null, linhas.map(e => e.getBoundingClientRect().height)), n: linhas.length, indef: /undefined|NaN|\[object/.test(b.textContent) };
      ndClose(); await esperar(300); raiz.forEach(e => { e.style.fontSize = ''; }); return o; }, { tema, k });
    telas.push([w, tema, k, r.rolagem, r.fora, r.alvo >= 44, r.n === 4, r.indef].join(':'));
  }
  await p.setViewportSize({ width: 360, height: 740 }); await E(() => setTema('atual'));
  ok('A9 gaveta em 320 e 360 px, temas Azul, Branco e Cinza e fonte ×1,3: sem rolagem horizontal, nada fora da caixa, alvo ≥ 44 px, 4 linhas, sem undefined/NaN', telas.length === 12 && telas.every(t => /^\d+:[a-z]+:[\d.]+:false:false:true:true:false$/.test(t)), telas.filter(t => !/:false:false:true:true:false$/.test(t)));
  /* ---------- gatilhos sozinhos e falha isolada ---------- */
  const A16 = await E(async () => {
    const esperar = ms => new Promise(r => setTimeout(r, ms)), o = {}, orig = window.avCiclo; let n = 0; window.avCiclo = function () { n++; };
    document.dispatchEvent(new Event('visibilitychange')); o.visib = n; window.avCiclo = orig;
    const sa = window.avAlertas; window.avAlertas = function () { throw new Error('quebrou'); }; let un = 'x', html = 'x'; try { un = ntUnread(); ndRender(); html = $('nd-b').textContent.length; } catch (e) { un = 'ERRO'; } window.avAlertas = sa; o.falha = typeof un === 'number' && typeof html === 'number';
    const sh = window.avHtml; window.avHtml = function () { throw new Error('quebrou'); }; try { ndRender(); o.falha2 = true; } catch (e) { o.falha2 = false; } window.avHtml = sh; return o; });
  ok('Gatilhos e isolamento: voltar ao app chama o ciclo; se avisos.js falhar, o sininho e a gaveta continuam funcionando como antes', A16.visib === 1 && A16.falha && A16.falha2, A16);
  if (!MUT) { const A17 = await E(async () => { const esperar = ms => new Promise(r => setTimeout(r, ms)); const l0 = AV.md; const star = __o('AUTO3'), r0 = __r({ W: [star], D: [star] }), so = window.opData; window.opData = function () { return r0; }; localStorage.removeItem(AVSK); AV.rd = 0; AV.st = null; AV.ok = 0; AV.at = 0; await esperar(16500); window.opData = so; return { md: l0, semeou: !!localStorage.getItem(AVSK), ok: AV.ok }; });
    ok('Gatilhos: o app liga o ciclo sozinho depois de carregar os dados do robô e a cada 15 s enquanto não deu certo (sem ninguém chamar)', A17.semeou && A17.ok === 1, A17); }
  /* ---------- A12 desempenho e rede ---------- */
  const A15 = await E(({ t0, H }) => {
    const L = []; for (let i = 0; i < 40; i++) L.push(__o('P' + (i < 10 ? '0' : '') + i + '3', { px: 10 + (i % 3) })); const r = __r({ W: L.slice(0, 10), M: L.slice(10, 14), D: L.slice(14, 26), X: L.slice(26, 34), cand: 160 }), st = avCalc(r, null, t0).st;
    const ini = performance.now(); for (let i = 0; i < 50; i++) avCalc(r, st, t0 + H * (i + 1)); const calc = (performance.now() - ini) / 50;
    avGravar(st); AV.rd = 0; avLer(); const i2 = performance.now(); for (let i = 0; i < 200; i++) avAlertas(); return { calc: calc, alertas: (performance.now() - i2) / 200 }; }, { t0: T0, H });
  ok('A12 desempenho: avCalc com 40 ações < 5 ms; avAlertas (rodado a cada minuto pelo sininho) < 2 ms', A15.calc < 5 && A15.alertas < 2, A15);
  const novos = rede.filter(u => !/^https:\/\/(fonts\.googleapis\.com|economia\.awesomeapi\.com\.br|icons\.brapi\.dev|api\.bcb\.gov\.br|query1\.finance\.yahoo\.com|brapi\.dev|finnhub\.io)\//.test(u)), av = fs.readFileSync(path.join(RAIZ, 'js/avisos.js'), 'utf8');
  ok('A12 nenhuma chamada de rede nova (avisos.js não tem fetch/XHR/beacon e a página só pediu o que já pedia) e nenhum erro de JavaScript na parte sintética', novos.length === 0 && !/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/.test(av) && erros.length === 0, { rede: novos.slice(0, 3), erros: erros.slice(0, 3) });
  const hs0 = await E(async (nomes) => { const o = {}; for (const n of nomes) { const f = window[n]; if (typeof f !== 'function') { o[n] = null; continue; } const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(f.toString())); o[n] = [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 16); } return o; }, Object.keys(HASH_FN));
  ok('A11 (também sem a pasta de dados, como no CI) as funções protegidas têm o texto esperado; garRec = a da E2 (1.83.0), as outras = as da 1.80.0', Object.keys(HASH_FN).every(k => hs0[k] === HASH_FN[k]), Object.keys(HASH_FN).filter(k => hs0[k] !== HASH_FN[k]));
  await ctx.close();
}

async function real(b) {
  const pg = await abrirReal(b, DADOS, { width: 360, height: 740 });
  if (MUT) await 0;
  const E = (fn, a) => pg.evaluate(fn, a);
  await E(PRE); await E(() => { AV.md = 1; });
  /* A11 regressão: o código protegido não mudou */
  const hs = await E(async (nomes) => { const o = {}; for (const n of nomes) { const f = window[n]; if (typeof f !== 'function') { o[n] = null; continue; } const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(f.toString())); o[n] = [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 16); } return o; }, Object.keys(HASH_FN));
  ok('A11 as 20 funções protegidas (opData, opEtiq, anValCalc, stkAna, fxFor, opCartao, dvAlerts, riAlerts, whyMine, garRec…) têm o texto esperado (a garRec é a da E2, 1.83.0; as outras, as da 1.80.0)', Object.keys(HASH_FN).every(k => hs[k] === HASH_FN[k]), Object.keys(HASH_FN).filter(k => hs[k] !== HASH_FN[k]));
  const src = fs.readFileSync(path.join(RAIZ, 'js/mercado-oportunidades.js'), 'utf8'), m = /function opData\(\)\{[\s\S]*?return OPC\.r\}/.exec(src);
  ok('A11 hash do opData igual ao da 1.80.0', m && crypto.createHash('sha256').update(m[0]).digest('hex') === HASH_OPDATA, null);
  /* ciclo real: semente, depois segunda rodada sem avisos */
  const R1 = await E(() => { localStorage.removeItem(AVSK); AV.rd = 0; AV.st = null; AV.ok = 0; const r = opData(); avCiclo(true); const a = avAlertas().map(x => x.ty); const s1 = JSON.stringify(AV.st.t); AV.at = 0; AV.ok = 0; const t = performance.now(); avCiclo(true); const ms = performance.now() - t;
    return { r: { W: r.W.length, M: r.M.length, D: r.D.length, X: r.X.length }, a: a, igual: JSON.stringify(AV.st.t) === s1, ms: ms, tam: localStorage.getItem(AVSK).length, n: typeof r.n }; });
  ok('Dados reais: primeira abertura = só a frase única; segundo ciclo igual, rápido e com o registro pequeno', R1.a.join() === 'ini' && R1.igual && R1.ms < 200 && R1.tam < 4000 && R1.r.D > 0, R1);
  /* A8 com dados reais: o aviso antigo some onde a faixa nova existe */
  const R2 = await E(() => { const so = OPC; OPC = { k: '', r: null }; ENC = { k: '', r: [] }; const antes = entAlerts().map(a => a.tk); opData(); ENC = { k: '', r: [] }; const depois = entAlerts().map(a => a.tk); const fx = antes.filter(t => depois.indexOf(t) < 0).every(t => avFaixaOk(t)); return { antes: antes, depois: depois, fx: fx, sobra: depois.every(t => !avFaixaOk(t)) }; });
  ok('A8 dados reais: toda ação que perdeu o aviso antigo tem faixa nova pronta; quem ficou não tem', R2.fx && R2.sobra, R2);
  /* Ajuste 5 com dados reais: corte de 12 simulado trocando só o limite (opCapSetor), sem mexer na regra */
  const R3 = await E(() => { const orig = window.opCapSetor, evs = []; let st = null, t = Date.now();
    const rod = cap => { window.opCapSetor = cap ? function (D) { var c = orig(D); c.D = c.D.slice(0, cap); return c; } : orig; OPC = { k: '', r: null }; const r = opData(); t += 8 * 864e5; const c = avCalc(r, st, t); if (c.d) return c.d; st = c.st; c.ev.filter(e => e.ty !== 'ini').forEach(e => evs.push(e.ty + ':' + e.tk)); return r.D.map(o => o.tk).join(); };
    const a = rod(0); const sem = st.t; const tks = a.split(','); const star = tks[2]; S.watch = (S.watch || []).concat([star]); OPC = { k: '', r: null };
    const a2 = rod(0); evs.length = 0; const b2 = rod(2), c2 = rod(0), d2 = rod(2), e2 = rod(0); window.opCapSetor = orig; return { cheia: a, corte: b2, volta: c2, evs: evs, retida: st.t[tks[2]] && st.t[tks[2]].l, estrela: star }; });
  ok('Ajuste 5 (dados reais): ideia que cai só do corte e volta NÃO gera "saiu" nem "nova ideia"', R3.evs.length === 0 && R3.cheia.split(',').length >= 3, R3);
  /* fotos reais de 24/11 e 26/11 como estados: o que o app avisaria entre elas */
  const f24 = JSON.parse(fs.readFileSync(path.join(DADOS, 'dados/ideias/2026-11-24.json'), 'utf8')), f26 = JSON.parse(fs.readFileSync(path.join(DADOS, 'dados/ideias/2026-11-26.json'), 'utf8'));
  const R4 = await E(({ f24, f26, t24, t26 }) => {
    const conv = f => { const r = { W: [], M: [], D: [], X: [], n: 0, cand: 160 }; f.ideias.forEach(i => { const o = { tk: i.tk, d: { cur: 'BRL', price: i.preco, k: {} }, score: i.nota, A: { chips: [['Qualidade', 'Alta']], N: {} }, cf: { n: i.conf }, al: [], fx: { ok: true, cons: i.cons, oti: i.oti, cen: i.cen, opp: true, est: i.est, F: brl } }; (i.st === 'ideia' ? r.D : r.X).push(o); }); return r; };
    const ra = conv(f24), rb = conv(f26), tk = ra.D.concat(ra.X).map(o => o.tk).filter(t => !rb.D.concat(rb.X).some(o => o.tk === t)), o = {};
    const seg = (estrelas) => { const A = conv(f24), B = conv(f26); const pick = r => estrelas.forEach(t => { const x = r.D.concat(r.X).filter(z => z.tk === t)[0]; if (x) r.W.push(x); }); pick(A); pick(B); const st = avCalc(A, null, t24).st; const c = avCalc(B, st, t26); return __tx(c).sort(); };
    o.semEstrela = seg([]); o.comEstrela = seg(ra.D.map(x => x.tk)); o.saiuDoDia = tk; o.d24 = ra.D.map(x => x.tk).join(); o.d26 = rb.D.map(x => x.tk).join(); return o; }, { f24, f26, t24: Date.parse('2026-11-24T12:00:00-03:00'), t26: Date.parse('2026-11-26T09:00:00-03:00') });
  ok('Fotos reais de 24/11 e 26/11: quem saiu sem estrela não gera aviso; as mudanças reais viram avisos de ideia nova ou de faixa, todos com tickers das fotos', R4.semEstrela.every(x => /^(nova|faixa):/.test(x)) && !R4.semEstrela.some(x => /^saiu:/.test(x)), R4);
  console.log('   fotos reais 24→26/11 sem estrela:', JSON.stringify(R4.semEstrela), '· com estrela:', JSON.stringify(R4.comEstrela), '· Ideias 24:', R4.d24, '· 26:', R4.d26);
  /* A7 com dados reais: sem número nos botões, mesmo com opData().n > 0 */
  const R5 = await E(() => { MKV = 'ana'; ANV = 'opp'; OPC = { k: '', r: null }; const n = opData().n; renderMkt(); return { n: n, mkb: document.querySelectorAll('.mkb').length, btn: [].slice.call(document.querySelectorAll('#mkseg button,#anseg button')).map(b => b.textContent.trim()).join('|') }; });
  ok('A7 dados reais: opData().n > 0 e mesmo assim nenhum número vermelho nos botões Análise e Ideias', R5.n > 0 && R5.mkb === 0 && /Ideias e análise/.test(R5.btn) && /Ideias\|Comparar\|Ranking/.test(R5.btn), R5);
  ok('Dados reais: nenhum erro de JavaScript', pg.__erros.length === 0, pg.__erros.slice(0, 3));
  await pg.context().close();
}

(async () => {
  if (arg.includes('--mutantes')) {
    let fraco = 0; const nomes = Object.keys(MUTANTES);
    nomes.forEach(n => { const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mut-')), [f, a, b2] = MUTANTES[n]; cp.execSync('tar --exclude=node_modules --exclude=.git -cf - . | tar -xf - -C ' + tmp, { cwd: RAIZ });
      const tx = fs.readFileSync(path.join(tmp, f), 'utf8'); if (!tx.includes(a)) { console.log('✗ trecho do defeito não achado:', n); fraco++; return; } fs.writeFileSync(path.join(tmp, f), tx.replace(a, b2));
      const r = cp.spawnSync('node', [__filename, '--mut', n].concat(TEM_DADOS ? ['--dados', DADOS] : []), { encoding: 'utf8', cwd: RAIZ, timeout: 300000, env: Object.assign({}, process.env, { APORTE_APP_DIR: tmp, NODE_PATH: path.join(RAIZ, 'node_modules') }) }); cp.execSync('rm -rf ' + tmp); const saida = (r.stdout || '') + (r.stderr || ''), quebrou = r.status !== 0, qual = (saida.match(/^✗ .{0,70}/gm) || []).slice(0, 2).join(' | ');
      console.log((quebrou ? '✓ pego   ' : '✗ ESCAPOU') + ' ' + n + (quebrou ? '  → ' + qual : '')); if (!quebrou) fraco++; });
    console.log(fraco ? '✗ ' + fraco + ' defeito(s) escaparam dos testes' : '✓ Todos os ' + nomes.length + ' defeitos inseridos foram pegos pelos testes'); process.exit(fraco ? 1 : 0);
  }
  const b = await chromium.launch();
  try { await sintetico(b); if (TEM_DADOS) await real(b); else console.log('(sem a pasta de dados: parte real pulada)'); } catch (e) { falhas++; console.log('✗ erro no teste:', e.message); }
  await b.close();
  console.log(falhas ? '✗ Avisos: ' + falhas + ' falha(s) de ' + total : '✓ Avisos: ' + total + ' conferências ok'); process.exit(falhas ? 1 : 0);
})();
