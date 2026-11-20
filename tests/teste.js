/* Testes automáticos das contas do Aporte.
 *
 * Abre o index.html num navegador sem internet (Playwright), com a data travada,
 * carrega uma carteira conhecida e confere os números: patrimônio, preço médio,
 * lucro, câmbio, proventos, taxas, renda fixa (CDI, IOF, IR), imposto de renda,
 * Bens e Direitos, XIRR, divisão do aporte e feriados da B3. Depois passa por
 * todas as abas para ver se nenhuma quebra.
 *
 * Uso:
 *   node tests/teste.js                         carteira de exemplo (contas feitas à mão abaixo)
 *   node tests/teste.js --real foto.json        compara com a foto da carteira real
 *   node tests/teste.js --real foto.json --gravar   grava a foto com os números de agora
 *
 * A foto da carteira real (trades, cotações, dólar e resultados esperados) fica
 * só no repositório privado de dados, nunca neste repositório.
 */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
const arg = process.argv.slice(2), REAL = arg.includes('--real') ? arg[arg.indexOf('--real') + 1] : null, GRAVAR = arg.includes('--gravar');

/* ---------- carteira de exemplo ---------- */
const EX = {
  now: '2026-06-15T12:00:00-03:00',
  cdi: { taxa: 0.05, de: '2025-01-01', ate: '2026-06-12' },
  state: {
    fx: { rate: 5.8, src: 'manual' },
    quotes: { ITUB4: { price: 35, src: 'manual' }, VT: { price: 120, src: 'manual' } },
    trades: [
      { id: 't1', date: '2025-01-10', ticker: 'ITUB4', market: 'BR', side: 'buy', qty: 100, price: 30, fx: 1, taxa: 1.5 },
      { id: 't2', date: '2025-01-15', ticker: 'PETR4', market: 'BR', side: 'buy', qty: 1000, price: 30, fx: 1 },
      { id: 't3', date: '2025-01-20', ticker: 'VT', market: 'US', side: 'buy', qty: 10, price: 100, fx: 5.0 },
      { id: 't4', date: '2025-02-03', ticker: 'HGLG11', market: 'BR', side: 'buy', qty: 10, price: 160, fx: 1 },
      { id: 'r1', date: '2025-03-01', ticker: 'CDB Banco X', market: 'RF', side: 'rf', qty: 1, price: 1000, pct: 100, isento: false, venc: '2027-03-01' },
      { id: 't5', date: '2025-03-10', ticker: 'ITUB4', market: 'BR', side: 'buy', qty: 50, price: 33, fx: 1 },
      { id: 't6', date: '2025-04-01', ticker: 'VALE3', market: 'BR', side: 'buy', qty: 100, price: 60, fx: 1 },
      { id: 'r2', date: '2025-04-01', ticker: 'LCI Banco Y', market: 'RF', side: 'rf', qty: 1, price: 500, pct: 90, isento: true, venc: '2026-04-01' },
      { id: 'r3', date: '2025-05-01', ticker: 'LCI Banco Y', market: 'RF', side: 'rfout', qty: 1, price: 510, ref: 'r2' },
      { id: 't7', date: '2025-05-12', ticker: 'ITUB4', market: 'BR', side: 'sell', qty: 60, price: 36, fx: 1, taxa: 0.9 },
      { id: 't8', date: '2025-06-20', ticker: 'VT', market: 'US', side: 'buy', qty: 10, price: 110, fx: 5.5 },
      { id: 'd1', date: '2025-07-01', ticker: 'ITUB4', market: 'BR', side: 'div', qty: 1, price: 50, fx: 1, tipo: 'JCP' },
      { id: 't9', date: '2025-08-05', ticker: 'HGLG11', market: 'BR', side: 'sell', qty: 10, price: 170, fx: 1 },
      { id: 't10', date: '2025-09-10', ticker: 'PETR4', market: 'BR', side: 'sell', qty: 1000, price: 32, fx: 1 },
      { id: 'd2', date: '2025-09-25', ticker: 'VT', market: 'US', side: 'div', qty: 1, price: 3, fx: 5.6, tipo: 'Dividendo', bruto: 4.29, irExt: 1.29 },
      { id: 't11', date: '2025-10-01', ticker: 'VALE3', market: 'BR', side: 'sell', qty: 100, price: 50, fx: 1 }
    ]
  }
};

/* série do CDI: taxa fixa por dia útil (seg a sex) */
function cdiSerie(c) {
  const s = {};
  for (let t = Date.parse(c.de + 'T12:00:00Z'); t <= Date.parse(c.ate + 'T12:00:00Z'); t += 864e5) {
    const d = new Date(t); if (d.getUTCDay() % 6 === 0) continue; s[d.toISOString().slice(0, 10)] = c.taxa;
  }
  return s;
}

/* ---------- o que é conferido (a "foto" dos números) ---------- */
function foto() {
  const A = window.__aporte, r = (v, d) => v == null || !isFinite(v) ? v : +(+v).toFixed(d == null ? 2 : d);
  const R = A.compute(), T = R.tot, V = A.valoriz(R), I = A.irData(), ano = (new Date().getFullYear() - 1) + '-12-31';
  const tot = {}; ['value', 'cost', 'gain', 'div', 'fees', 'rA', 'rF', 'uA', 'uF', 'rfV', 'rfC', 'rfU', 'rfR', 'contrib', 'cash', 'bought', 'proceeds', 'outs', 'simple'].forEach(k => tot[k] = r(T[k]));
  tot.xirr = r(T.xirr, 6);
  const cb = A.cdiBench();
  return {
    tot,
    held: R.held.map(x => ({ tk: x.p.ticker, qty: r(x.p.qty, 6), pm: r(x.P0, 4), px: r(x.P1, 4), v: r(x.v), ganho: r(x.gain), custo: r(x.p.cB) })),
    closed: R.closed.map(p => ({ tk: p.ticker, rA: r(p.rA), rF: r(p.rF), div: r(p.div || 0) })),
    valoriz: { pv: r(V.pv), div: r(V.div), g: r(V.g), base: r(V.base), p: r(V.p, 6) },
    rf: R.rfs.map(c => ({ tk: c.t.ticker, bruto: r(c.bruto), iof: r(c.iof), ir: r(c.ir), liq: r(c.liq), realizado: r(c.realized), dias: c.days })),
    ir: { meses: I.rows.map(m => ({ m: m.m, vendasAcao: r(m.acao.v), ganhoAcao: r(m.acao.g), vendasFii: r(m.fii.v), ganhoFii: r(m.fii.g), isento: m.isento, imposto: r(m.imp), venc: m.venc })), prejAcao: r(I.pa), prejFii: r(I.pf) },
    bens: { data: ano, itens: A.bensEm(ano).map(p => ({ tk: p.tk, q: r(p.q, 6), custo: r(p.c), custoUS: p.mk === 'US' ? r(p.cu) : undefined })) },
    proventos: (() => { const it = A.pvItems(); return { n: it.length, recebido: r(it.filter(i => i.st === 'rec').reduce((s, i) => s + i.liq, 0)) }; })(),
    cdiBench: cb ? { val: r(cb.val), apl: r(cb.apl) } : null
  };
}

/* ---------- abre o app ---------- */
async function abrir(b, fx) {
  const pg = await b.newPage({ viewport: { width: 400, height: 900 } }), erros = [];
  pg.on('pageerror', e => erros.push(e.message + ' ← ' + String(e.stack || '').split('\n').slice(1, 9).map(s => s.trim().replace(/^at /, '')).join(' < ')));
  pg.on('console', m => { if (/Content Security Policy|Refused to (load|connect|execute|apply)/i.test(m.text())) erros.push('CSP bloqueou algo: ' + m.text().slice(0, 160)); });
  await pg.clock.setFixedTime(new Date(fx.now));
  await pg.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  const ls = {
    'minha-carteira-v1': JSON.stringify(Object.assign({ keys: { finnhub: '', brapi: '', gh: '', repo: '' }, pend: [] }, fx.state)),
    'minha-carteira-v1-cdi': JSON.stringify({ s: cdiSerie(fx.cdi), at: Date.parse(fx.now), start: fx.cdi.de })
  };
  await pg.addInitScript(o => { window.__APORTE_TESTE__ = true; if (!sessionStorage.getItem('ok')) { localStorage.clear(); for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('ok', '1'); } }, ls);
  await pg.goto(APP); await pg.waitForFunction(() => window.__aporte, null, { timeout: 15000 });
  await pg.waitForTimeout(500);
  return { pg, erros };
}

/* passa por todas as abas e subabas; qualquer erro de JavaScript reprova */
async function abas(pg) {
  const vistos = [];
  for (const t of ['resumo', 'ativos', 'proventos', 'mercado', 'mais']) {
    await pg.click('[data-go=' + t + ']'); await pg.waitForTimeout(150); vistos.push(t);
    const subs = await pg.$$eval('[data-cv],[data-mkv],[data-mais]', els => els.filter(e => e.offsetParent).map(e => { for (const a of ['data-cv', 'data-mkv', 'data-mais']) if (e.hasAttribute(a)) return '[' + a + '="' + e.getAttribute(a) + '"]'; }));
    for (const s of subs) { const l = pg.locator(s).filter({ visible: true }).first(); if (await l.count()) { await l.click(); await pg.waitForTimeout(120); vistos.push(t + ' ' + s); } }
  }
  await pg.click('[data-go=mercado]'); await pg.click('[data-mkv=ana]');
  for (const v of ['rel', 'opp', 'cls', 'set', 'cmp']) { await pg.click('[data-anv=' + v + ']'); await pg.waitForTimeout(120); vistos.push('análise ' + v); }
  await pg.click('[data-go=resumo]'); await pg.waitForTimeout(100);
  await pg.click('[data-as=open]'); await pg.waitForTimeout(100); await pg.click('[data-as=close]');
  await pg.click('[data-go=mais]'); await pg.click('[data-mais=ajustes]'); await pg.click('#perfbox [data-pf=open]'); await pg.click('[data-pf="obj:renda"]'); await pg.click('#pfsheet [data-pf=close]'); vistos.push('perfil');
  return vistos;
}

/* ---------- comparação ---------- */
let falhas = 0, ok = 0;
function confere(nome, got, exp, tol = 0.011) {
  const bom = typeof exp === 'number' ? typeof got === 'number' && Math.abs(got - exp) <= tol : JSON.stringify(got) === JSON.stringify(exp);
  if (bom) ok++; else { falhas++; console.log('  ✗ ' + nome + ': deu ' + JSON.stringify(got) + ', esperado ' + JSON.stringify(exp)); }
}
function difere(a, b, cam) {
  if (typeof b === 'number' && typeof a === 'number') return confere(cam, a, b, Math.max(0.011, Math.abs(b) * 1e-9));
  if (b && typeof b === 'object') {
    if (!a || typeof a !== 'object') return confere(cam, a, b);
    const ks = new Set(Object.keys(a).concat(Object.keys(b)));
    if (Array.isArray(b) && a.length !== b.length) confere(cam + '.length', a.length, b.length);
    ks.forEach(k => { if (a[k] === undefined && b[k] === undefined) return; difere(a[k], b[k], cam + (Array.isArray(b) ? '[' + k + ']' : '.' + k)); });
    return;
  }
  confere(cam, a, b);
}

/* ---------- contas feitas à mão para a carteira de exemplo ---------- */
function contasAMao(F, P) {
  const S = EX.state;
  /* ITUB4: 100 a 30 + 50 a 33 → preço médio 31 (taxa fica fora do PM); vende 60 a 36 → lucro 300; sobram 90 a 35 */
  const it = F.held.find(h => h.tk === 'ITUB4');
  confere('ITUB4 quantidade', it.qty, 90); confere('ITUB4 preço médio', it.pm, 31); confere('ITUB4 valor', it.v, 3150); confere('ITUB4 ganho', it.ganho, 360);
  /* VT: 10 a 100 (dólar 5) + 10 a 110 (dólar 5,5); hoje 120 e dólar 5,8 */
  const vt = F.held.find(h => h.tk === 'VT'), cB = 10 * 100 * 5 + 10 * 110 * 5.5, F0 = cB / 2100;
  confere('VT preço médio (US$)', vt.pm, 105); confere('VT custo em reais', vt.custo, cB); confere('VT valor', vt.v, 20 * 120 * 5.8);
  confere('VT ganho (preço + câmbio)', vt.ganho, 20 * 120 * 5.8 - cB);
  confere('ganho de câmbio total', F.tot.uF, 20 * 120 * (5.8 - F0));
  confere('ganho de preço sem vender', F.tot.uA, 360 + 20 * (120 - 105) * F0);
  /* vendas: ITUB4 +300, HGLG11 +100, PETR4 +2000, VALE3 −1000 */
  confere('lucro com vendas', F.tot.rA, 1400);
  confere('taxas', F.tot.fees, 1.5 + 0.9);
  confere('proventos', F.tot.div, 50 + 3 * 5.6);
  /* renda fixa: CDB 100% do CDI desde 01/03/2025, 0,05% por dia útil antes de hoje; IR de 17,5% (entre 361 e 720 dias) */
  const dias = Object.keys(cdiSerie(EX.cdi)).filter(d => d >= '2025-03-01' && d < '2026-06-15').length;
  const bruto = 1000 * Math.pow(1.0005, dias), ir = (bruto - 1000) * 0.175, cdb = F.rf.find(x => x.tk === 'CDB Banco X');
  confere('CDB bruto', cdb.bruto, bruto); confere('CDB IR', cdb.ir, ir); confere('CDB líquido', cdb.liq, bruto - ir); confere('CDB dias', cdb.dias, 471);
  confere('LCI resgatada: lucro', F.rf.find(x => x.tk === 'LCI Banco Y').realizado, 10);
  confere('renda fixa no patrimônio', F.tot.rfV, bruto - ir);
  confere('patrimônio', F.tot.value, 3150 + 20 * 120 * 5.8 + bruto - ir);
  confere('lucro total', F.tot.gain, 1400 + 360 + (20 * 120 * 5.8 - cB) + 66.8 + (bruto - ir - 1000) + 10 - 2.4);
  /* imposto de renda */
  const m = k => F.ir.meses.find(x => x.m === k) || {};
  confere('IR maio/25: vendas isentas (até 20 mil)', m('2025-05').isento, true);
  confere('IR maio/25: ganho com taxas', m('2025-05').ganhoAcao, 60 * ((36 - 0.015) - (100 * 30.015 + 50 * 33) / 150));
  confere('IR ago/25: FII paga 20%', m('2025-08').imposto, 20);
  confere('IR set/25: venda acima de 20 mil paga 15%', m('2025-09').imposto, 300);
  confere('IR set/25: vencimento do DARF', m('2025-09').venc, '2025-10-31');
  confere('IR out/25: prejuízo fica guardado', F.ir.prejAcao, 1000);
  /* Bens e Direitos em 31/12/2025 (com taxas no custo, regra da Receita) */
  const bens = k => F.bens.itens.find(x => x.tk === k) || {};
  confere('Bens: ITUB4 custo', bens('ITUB4').custo, (100 * 30.015 + 50 * 33) * 90 / 150);
  confere('Bens: VT custo em reais', bens('VT').custo, cB); confere('Bens: VT custo em dólar', bens('VT').custoUS, 2100);
  confere('Bens: CDB', bens('CDB Banco X').custo, 1000); confere('Bens: sem as vendidas', F.bens.itens.length, 3);
  /* funções soltas */
  return P.evaluate(() => { const A = window.__aporte;
    return { x: A.xirr([['2025-01-01', -1000], ['2026-01-01', 1100]]), s1: A.splitNeed({ BR: 100, US: 100 }, { BR: 50, US: 50 }, 100), s2: A.splitNeed({ BR: 0, US: 100 }, { BR: 50, US: 50 }, 100),
      h: ['2026-02-16', '2026-02-17', '2026-04-03', '2026-06-04', '2026-12-25', '2026-06-15'].map(A.b3Hol), ir: [100, 200, 500, 800].map(A.irRate) }; })
    .then(o => {
      confere('XIRR de 10% ao ano', o.x, 0.1, 1e-6);
      confere('aporte dividido igual', o.s1, { BR: 50, US: 50 }); confere('aporte vai para o que está abaixo do alvo', o.s2, { BR: 100, US: 0 });
      confere('feriados da B3 (Carnaval, Sexta Santa, Corpus Christi, Natal)', o.h, [true, true, true, true, true, false]);
      confere('IR regressivo da renda fixa', o.ir, [22.5, 20, 17.5, 15]);
    });
}

(async () => {
  const b = await chromium.launch();
  try {
    let fx = EX, esperado = null;
    if (REAL) { const j = JSON.parse(fs.readFileSync(REAL, 'utf8')); fx = j; esperado = j.esperado || null; }
    const { pg, erros } = await abrir(b, fx);
    const F = await pg.evaluate(foto);
    /* versão única: o app mostra em Ajustes e o sw.js usa no nome do cache; todo arquivo local do index.html precisa estar no cache offline */
    confere('versão do app (formato e texto em Ajustes)', await pg.evaluate(() => /^\d+\.\d+\.\d+$/.test(window.__aporte.VERSAO) && document.getElementById('ver').textContent === window.__aporte.VERSAO), true);
    const raiz = path.resolve(__dirname, '..'), sw = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');
    for (const m of fs.readFileSync(path.join(raiz, 'index.html'), 'utf8').matchAll(/(?:src|href)="([a-z0-9./\-]+\.(?:css|js|svg|webmanifest))"/g)) confere('sw.js guarda ' + m[1] + ' para abrir offline', sw.includes("'" + m[1] + "'"), true);
    if (!REAL) {
      console.log('Carteira de exemplo: contas feitas à mão');
      await contasAMao(F, pg);
      const ref = path.join(__dirname, 'esperado-exemplo.json');
      if (GRAVAR || !fs.existsSync(ref)) { fs.writeFileSync(ref, JSON.stringify(F, null, 1)); console.log('  (foto gravada em tests/esperado-exemplo.json)'); }
      else { console.log('Carteira de exemplo: comparação com a foto gravada'); difere(F, JSON.parse(fs.readFileSync(ref, 'utf8')), 'exemplo'); }
    } else if (GRAVAR || !esperado) {
      fx.esperado = F; fs.writeFileSync(REAL, JSON.stringify(fx)); console.log('Foto da carteira real gravada em ' + REAL);
    } else { console.log('Carteira real: comparação com a foto gravada'); difere(F, esperado, 'real'); }
    /* variação do dia zera fora do pregão: segunda 23/11/2026 antes das 10h, fim de semana, e volta com a primeira cotação do dia */
    const zer = [];
    for (const [iso, us, atras] of [['2026-11-23T12:00:00Z', false, 0], ['2026-11-23T13:30:00Z', false, 0], ['2026-11-23T13:30:00Z', false, 1], ['2026-11-24T01:00:00Z', false, 0], ['2026-11-28T15:00:00Z', false, 0], ['2026-11-23T12:00:00Z', true, 0], ['2026-11-23T15:00:00Z', true, 0], ['2026-11-22T15:00:00Z', true, 0]]) {
      await pg.clock.setFixedTime(new Date(iso)); zer.push(await pg.evaluate(([u, at]) => dzero(u, at ? Date.now() - 20 * 3600000 : Date.now()), [us, atras]));
    }
    await pg.clock.setFixedTime(new Date(fx.now));
    confere('variação do dia zera antes da abertura e no fim de semana, volta com cotação nova', zer, [true, false, true, false, true, true, false, true]);
    /* servidor de cotações (Worker): preço e prévio entram em S.quotes; atraso e preço suspeito são sinalizados */
    const px = await pg.evaluate(async () => {
      S.keys.proxy = 'https://aporte-teste.workers.dev'; var of = window.fetch, got = null;
      window.fetch = function (u) { if (/workers\.dev\/q/.test(u)) return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ 'TEST3.SA': { p: 12.5, prev: 12, t: Math.floor(Date.now() / 1000) - 60 } }); } }); return of.apply(this, arguments); };
      try { got = await pxQuotes(['TEST3']); } finally { window.fetch = of; }
      var q = S.quotes.TEST3, r = { ok: !!got.TEST3 && q.price === 12.5 && q.prev === 12, base: pxBase() };
      S.keys.proxy = ''; r.sem = pxBase(); S.quotes.TEST3 = { price: 100, prev: 10, at: Date.now(), src: 'auto' };
      var md0 = MD.d; MD.d = { hist: { TEST3: { last: 10 } }, idx: {} }; r.sus = !!livePx('TEST3').sus; MD.d = md0; delete S.quotes.TEST3; return r; });
    confere('servidor de cotações: preço entra, desligado sem endereço, preço 10x do fechamento é sinalizado', [px.ok, px.base, px.sem, px.sus], [true, 'https://aporte-teste.workers.dev', '', true]);
    const vistos = await abas(pg);
    console.log('Abas abertas: ' + vistos.length);
    /* gráfico estilo Google: página da ação com histórico de mentira e os três números do Início */
    const g = await pg.evaluate(() => { var d = [], t = Math.floor(Date.now() / 864e5) - 300, p = 30; for (var i = 0; i < 300; i++) { p += Math.sin(i / 9) * .6 + .12; d.push([t + i, +p.toFixed(2)]); }
      MD.d = { hist: { TESTE3: { d: d, w: d, last: d[299][1], name: 'Teste SA', cur: 'BRL' }, TEST3: { d: d, w: d, last: d[299][1], name: 'Teste 3', cur: 'BRL' } }, idx: {}, at: Date.now() }; stkOpen('TESTE3');
      var q = function (s) { return document.querySelectorAll('#stk-b ' + s).length; }, r = { gh: q('.gh'), svg: q('.gch svg'), dim: q('.rb.dim'), stats: q('.gst') };
      document.querySelector('[data-rmore]').click(); r.mais = q('.rng2 button'); document.querySelector('[data-rng="ytd"]').click(); r.ytd = q('.gch svg');
      stkClose(); heroOpen('pat'); r.hero = q('.gch svg'); stkClose(); return r; });
    confere('página da ação: cabeçalho, gráfico, 1D/5D em breve, números e botão Mais', [g.gh, g.svg, g.dim, g.stats > 0, g.mais > 0, g.ytd], [1, 1, 0, true, true, 1]);
    confere('gráfico do patrimônio ao tocar no número do Início', g.hero, 1);
    /* Valor investido e Câmbio no Início: quarto cartão, gráficos com histórico e alternância Meu lucro/Dólar */
    const hc = await pg.evaluate(() => { var r = { cards: document.querySelectorAll('#hcards .hc').length, inv: !!document.querySelector('[data-hero="inv"]'), cam: !!document.querySelector('.hcg[data-hero="cam"]') };
      var q = function (s) { return document.querySelectorAll('#stk-b ' + s).length; };
      heroOpen('luc'); r.lucSvg = q('.gch svg'); r.lucTxt = /Lucro total/.test(document.getElementById('stk-h').textContent); stkClose();
      heroOpen('inv'); r.invSvg = q('.gch svg'); r.invNoIntra = q('[data-rng="1d"]'); stkClose();
      var fx0 = [MK.fxMeta, MK.fxSeries, MK.fxDates, MK.fxLatestDate, MK.fxLatest], se = {}; for (var dd = Date.parse('2025-01-01'); dd < Date.now(); dd += 864e5 * 3) se[new Date(dd).toISOString().slice(0, 10)] = 5.2 + (dd - Date.parse('2025-01-01')) / 864e5 / 1000; ingestFx({ series: se });
      heroOpen('cam'); r.camSvg = q('.gch svg'); r.camTog = q('[data-hcv]'); var h1 = cambioHist(); r.camPts = h1.length > 0; r.camLast = Math.abs(h1[h1.length - 1].c - (function () { var R = compute(), T = R.tot; return T.uA + T.rfU + T.uF - valoriz(R).pv })()) < 0.02;
      var now5 = Math.floor(Date.now() / 1000), p5 = []; for (var z = 0; z < 40; z++) p5.push([now5 - (40 - z) * 300, 5.4 + z * .001]); FIN['intra/BRL=X'] = { d: { cur: 'BRL', off: -10800, at: now5, prev: 5.39, p: p5 }, at: Date.now() };
      document.querySelector('[data-rng="1d"]').click(); r.cam1d = q('.gch svg'); document.querySelector('[data-hcv="usd"]').click(); r.usd1d = q('.gch svg'); document.querySelector('[data-rng="1y"]').click(); document.querySelector('[data-hcv="luc"]').click(); document.querySelector('[data-hcv="usd"]').click(); r.usdSvg = q('.gch svg'); r.usdTxt = /Dólar \(USD\/BRL\)/.test(document.getElementById('stk-b').textContent); stkClose(); MK.fxMeta = fx0[0]; MK.fxSeries = fx0[1]; MK.fxDates = fx0[2]; MK.fxLatestDate = fx0[3]; MK.fxLatest = fx0[4]; return r; });
    confere('Início: cartão de Câmbio, valor investido e câmbio abrem gráfico com histórico', [hc.cards, hc.inv, hc.cam, hc.invSvg, hc.invNoIntra, hc.camSvg, hc.camTog, hc.camPts, hc.usdSvg, hc.usdTxt, hc.lucSvg, hc.lucTxt, hc.cam1d, hc.usd1d], [4, true, true, 1, 0, 1, 2, true, 1, true, 1, true, 1, 1]);
    console.log('  (lucro do câmbio do histórico bate com Desempenho: ' + hc.camLast + ')');
    /* sino à esquerda (gaveta de notificações) e ícone de notícias à direita (tela só de toque) */
    const nt = await pg.evaluate(() => { var now = Math.floor(Date.now() / 1000), mk = function (i, c, sc, n, mins, tt) { return { id: 'x' + i, t: tt || 'Notícia ' + i, s: 'Folha', d: now - mins * 60, l: 'https://exemplo.com.br/' + i, i: i % 2 ? 'https://exemplo.com.br/i.jpg' : '', c: c, sc: sc, n: n }; };
      NT.d = { v: 1, at: now, itens: [mk(1, 'BR', 12, 2, 5), mk(2, 'EX', 5, 1, 20), mk(3, 'BR', 7, 3, 60), mk(4, 'EX', 11, 1, 90), mk(5, 'BR', 4, 1, 120, 'Petrobras sobe com petróleo')] }; NT.seen = Date.now() - 3 * 3600000; ntBadge();
      var r = { badge: document.getElementById('bellb').textContent, bellEsq: !!document.querySelector('.atl > .bell#bell'), jornalDir: !!document.querySelector('.atl #newsbtn') }; ndOpen();
      r.notif = document.querySelectorAll('#nd-b .ndi').length; r.novas = document.querySelectorAll('#nd-b .ndi.nw').length; ndClose();
      ntOpen(); r.cards = document.querySelectorAll('#nt-b .ntc').length; r.link = document.querySelector('#nt-b .ntc').getAttribute('target'); r.semAbas = !document.querySelector('[data-ntp]');
      NT.cat = 'all'; ntRender(); r.todas = document.querySelectorAll('#nt-b .ntc').length; NT.cat = 'EX'; ntRender(); r.mundo = document.querySelectorAll('#nt-b .ntc').length;
      NT.cat = 'imp'; ntClose(); return r; });
    const puxa = await pg.evaluate(() => { var tc = function (x, y) { return new Touch({ identifier: 1, target: document.body, clientX: x, clientY: y }); }, fire = function (ty, x, y) { var t = tc(x, y); document.dispatchEvent(new TouchEvent(ty, { touches: ty === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true })); };
      fire('touchstart', 12, 300); fire('touchend', 170, 312); var a = !document.getElementById('nd').hidden; fire('touchstart', 200, 300); fire('touchend', 60, 305); document.getElementById('nd').hidden = true; document.getElementById('nd').classList.remove('on'); document.body.style.overflow = '';
      fire('touchstart', 150, 400); fire('touchend', 300, 405); var b = !document.getElementById('nd').hidden; return [a, b]; });
    confere('puxar a tela da borda para o lado abre a gaveta; puxar no meio da tela não abre', puxa, [true, false]);
    /* catálogo da B3: setores, pouca liquidez escondida, IPO novo e ação que saiu */
    const cat = await pg.evaluate(() => { var A = window.__aporte, M = A.MD, old = M.d, hoje = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      M.d = { fund: { cols: ['cot', 'liq2m'], d: { AAAA3: [10, 5e6], BBBB3: [10, 1e3], CCCC3: [10, 3e6], NEWC3: [5, 1e6] } }, cat: { v: 1, a: { AAAA3: ['', 5, 'Bancos'], BBBB3: ['', 5, 'Bancos'], CCCC3: ['', 7, 'Energia'], NEWC3: [hoje, null, ''] }, n: { 5: 'Bancos', 7: 'Energia' }, x: { OLDD3: ['', '2026-10-01'] } } };
      var r = { esc: A.catTickers(false).join(), tod: A.catTickers(true).length, set: A.catSetores(false).map(function (x) { return x.n + ':' + x.t.join('/'); }).join('|'), todSet: A.catSetores(true).map(function (x) { return x.n; }).join('|'), novo: [A.catNovo('NEWC3'), A.catNovo('AAAA3')], saiu: A.catSaiu().join() };
      M.d = old; return r; });
    confere('catálogo: pouca liquidez escondida, setores, IPO novo e ação que saiu', [cat.esc, cat.tod, cat.set, cat.todSet, cat.novo, cat.saiu], ['AAAA3,CCCC3,NEWC3', 4, 'Bancos:AAAA3|Energia:CCCC3|Sem setor:NEWC3', 'Bancos|Energia|Sem setor', [true, false], 'OLDD3']);
    confere('sino embaixo da logo com número, gaveta de notificações, ícone de notícias à direita e filtros', [nt.badge, nt.bellEsq, nt.jornalDir, nt.notif, nt.novas, nt.cards, nt.link, nt.semAbas, nt.todas, nt.mundo], ['3', true, true, 3, 3, 3, '_blank', true, 5, 2]);
    /* 1D/5D com pontos de 5 minutos de mentira (arquivos do robô) e a carteira ao longo do dia */
    const g2 = await pg.evaluate(() => { var now = Math.floor(Date.now() / 1000), p5 = []; for (var i = 0; i < 40; i++) p5.push([now - (40 - i) * 300, 20 + i * .05]);
      var mk = function (prev) { return { d: { cur: 'BRL', off: -10800, at: now, prev: prev, p: p5 }, at: Date.now() }; };
      FIN['intra/TEST3.SA'] = mk(19.5); stkOpen('TEST3'); document.querySelector('[data-rng="1d"]').click(); var r = { um: document.querySelectorAll('#stk-b .gch svg').length, prev: /antes do fechamento/.test(document.getElementById('stk-b').textContent) };
      document.querySelector('[data-rng="5d"]').click(); r.cinco = document.querySelectorAll('#stk-b .gch svg').length; stkClose();
      compute().held.forEach(function (x) { FIN['intra/' + ySym(x.p.ticker)] = mk(19.5); }); heroOpen('dia'); r.dia = document.querySelectorAll('#stk-b .gch svg').length; stkClose();
      FIN['intra/TEST3.SA'] = { d: null, at: Date.now() }; stkOpen('TEST3'); document.querySelector('[data-rng="1d"]').click(); r.sem = /Ainda não há pontos/.test(document.getElementById('stk-b').textContent); stkClose(); return r; });
    confere('gráfico de 1 dia e 5 dias, linha do fechamento anterior, carteira no dia e aviso sem dados', [g2.um, g2.prev, g2.cinco, g2.dia, g2.sem], [1, true, 1, 1, true]);
    if (erros.length) { falhas += erros.length; erros.forEach(e => console.log('  ✗ erro na página: ' + e)); }
    console.log(falhas ? '\n✗ ' + falhas + ' problema(s), ' + ok + ' conferência(s) certas' : '\n✓ Tudo certo: ' + ok + ' conferências');
  } finally { await b.close(); }
  process.exit(falhas ? 1 : 0);
})();
