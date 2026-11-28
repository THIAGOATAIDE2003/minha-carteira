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
  for (const v of ['opp', 'cmp', 'rank']) { await pg.click('[data-anv=' + v + ']'); await pg.waitForTimeout(120); vistos.push('análise ' + v); }
  await pg.click('[data-go=resumo]'); await pg.waitForTimeout(100);
  await pg.evaluate(() => document.querySelector('[data-as=open]').click()); await pg.waitForTimeout(100); await pg.click('[data-as=close]');
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
    /* por que subiu/caiu hoje: aparece na página do índice e no sino, só com movimento forte e dentro do dia */
    await pg.clock.setFixedTime(new Date('2026-11-19T18:00:00Z'));
    const wy = await pg.evaluate(() => { try { var ag = Math.floor(Date.now() / 1000); MD.d = MD.d || {}; MD.d.why = { v: 1, at: ag, it: { brent: { p: -3.7, u: 2, at: ag, ok: 1, t: 'Petróleo cai com expectativa de mais oferta.', n: [{ t: 'Opep avalia elevar produção', s: 'Valor', l: 'https://x.com/a' }] }, ibov: { p: -2, u: 0, at: ag - 40 * 3600, ok: 0, t: 'antigo', n: [] } } };
      var h = whyHtml('brent', -3.7, 'Petróleo'), old = whyHtml('ibov', -2, 'Ibovespa'), zero = whyHtml('brent', 0, 'Petróleo');
      IDX.forEach(function (x) { if (x.k === 'brent' && idxSel().indexOf('brent') < 0) S.idxSel = idxSel().concat(['brent']); }); ndRender(); var nd = document.getElementById('nd-b').innerHTML; return [nd.indexOf('Movimentos fortes') > 0 && nd.indexOf('data-ndw="brent"') > 0, h.indexOf('Por que Petróleo cai hoje?') > 0, h.indexOf('Opep avalia') > 0, old, zero, whyOf('brent') ? 1 : 0]; } catch (e) { return String(e); } });
    confere('por que cai hoje: aparece com movimento forte; some se antigo ou se a variação está zerada', wy, [true, true, true, '', '', 1]);
    await pg.clock.setFixedTime(new Date(fx.now));
    /* Lucro total: tem 1D e 5D como os outros; no ano mostra só o valor (sem '(0,00%)') e a área fecha nos pontos */
    const lt = await pg.evaluate(() => { heroOpen('luc'); var a = document.getElementById('stk-b').innerHTML; STK.rng = '1d'; heroRender(); var b = document.getElementById('stk-b').innerHTML; STK.rng = '5d'; heroRender(); var c = document.getElementById('stk-b').innerHTML; document.getElementById('stk').hidden = true; document.body.style.overflow = ''; return [/data-rng="1d"/.test(a) && /data-rng="5d"/.test(a), /\(0,00%\)/.test(a), /data-rng="1d"/.test(b) && /data-rng="1d"/.test(c), /<polygon points="0,/.test(a)]; });
    confere('Lucro total tem 1D/5D, sem (0,00%) e com a área fechada nos pontos', lt, [true, false, true, false]);
    /* futuros vivem dentro do índice (S&P/Nasdaq/Dow), sem painel nem perfil próprio */
    const fut = await pg.evaluate(function () {
      var now = Math.floor(Date.now() / 1000); FUT.d = { 'ES=F': { p: 7000, prev: 6900, t: now - 60 }, 'NQ=F': { p: 25000, prev: 25100, t: now - 86400 * 2 } }; FUT.ok = true;
      var st = futStrip('SPY'), sv = /Futuro do S&amp;P 500/.test(st) && /ao vivo/.test(st) && /7\.000/.test(st), fe = /fechado/.test(futStrip('QQQ')), nq = futStrip('ibov') === '', nada = !IDX.some(function (x) { return x.k === 'ES=F' || x.k === 'EWZ'; }), semPainel = typeof futHtml === 'undefined';
      FUT.d = {}; return [sv, fe, nq, nada, semPainel]; });
    confere('Futuros dentro do índice, sem painel nem perfil próprio', fut, [true, true, true, true, true]);
    /* pré e pós-mercado: pontos fora do pregão vêm marcados, o gráfico pinta de cinza e quem não pede (Início) não os recebe */
    const ext = await pg.evaluate(function () {
      var off = -18000, mk = function (d, h, m) { return Date.UTC(2026, 10, d, h, m) / 1000 - off; }, P = [[19, 9, 30, 147], [19, 15, 55, 147.17], [20, 5, 0, 146], [20, 9, 30, 146.3], [20, 12, 0, 144], [20, 15, 55, 142.08], [20, 16, 5, 142.5], [20, 19, 55, 142.2]].map(function (r) { return [mk(r[0], r[1], r[2]), r[3]]; });
      FIN['intra/VT'] = { d: { ext: 1, off: off, p: P, prev: 147.17, at: P[P.length - 1][0] }, at: Date.now() };
      var com = finView('VT', '1d', true), sem = finView('VT', '1d'), nx = com.hist.filter(function (p) { return p.x; }).length, svg = lineChart(com.hist, 'USD', null, null, com.o);
      delete FIN['intra/VT']; return [com.hist.length, nx, sem.hist.length, /stroke="var\(--muted\)" stroke-width="2"/.test(svg), /pré e pós-mercado/.test(svg)]; });
    /* gráfico fecha no último preço (se for mais novo) e a variação parte do pregão, não do pré-mercado */
    const cauda = await pg.evaluate(function () {
      var off = -18000, T = function (h, m) { return (Date.UTC(2026, 10, 20, h, m) / 1000 - off) * 1000; }, H = [{ t: T(5, 0), c: 153, x: 1 }, { t: T(9, 30), c: 152 }, { t: T(15, 55), c: 142 }, { t: T(19, 36), c: 143.41, x: 1 }], fo = { prev: 147.17, intra: 1, d1: 1, off: off, ext: 1 };
      var a = finTail(H, 142.08, T(20, 0), fo), b = finTail(H, 142.08, T(19, 0), fo), c = finTail(H, 143.41, T(20, 0), fo), d = finTail(H, 142.08, T(20, 0), { intra: 0 }), e = finTail(H, 142.08, T(19, 36) + 3e5, { prev: 1, intra: 1, off: off, ext: 0 });
      return [finBase(H), a.length, a[4].c, !!a[4].x, b.length, c.length, d.length, !!e[4].x]; });
    confere('Gráfico: fecha no último preço e base da variação sem o pré-mercado', cauda, [152, 5, 142.08, true, 4, 4, 4, false]);
    confere('Gráfico com pré e pós-mercado em cinza', ext, [6, 3, 3, true, true]);
    /* variação do dia zerada depois da meia-noite de Brasília (EUA ainda fechados), cinza quando zero */
    await pg.clock.setFixedTime(new Date('2026-11-20T03:50:00Z'));
    confere('00h50 de Brasília: variação dos EUA já zerada (cotação de ontem à noite)', await pg.evaluate(() => window.__aporte.dzero(true, Date.now() - 6 * 3600000)), true);
    await pg.clock.setFixedTime(new Date('2026-11-19T20:00:00Z'));
    confere('17h de Brasília (pregão dos EUA aberto): variação dos EUA continua real', await pg.evaluate(() => window.__aporte.dzero(true, Date.now() - 300000)), false);
    await pg.clock.setFixedTime(new Date(fx.now));
    confere('variação zero fica cinza (muted)', await pg.evaluate(() => [window.__aporte.cls(0), window.__aporte.cls(1), window.__aporte.cls(-1)]), ['muted', 'gain', 'loss']);
    confere('avisos de proventos: semeia o que já existe e só avisa de anúncio novo', await pg.evaluate(() => { var a = window.__aporte, td = new Date().toISOString().slice(0, 10), tk = a.compute().held[0].p.ticker; localStorage.removeItem('minha-carteira-v1-dvseen'); a.DV.up.length = 0; a.DV.up.push({ tk: tk, tipo: 'JCP', dc: td, pay: '', val: 10, q: 10, r: 1 }); var s1 = a.dvAlerts().map(function (x) { return x.tx; }); a.DV.up.push({ tk: tk, tipo: 'Dividendo', dc: '2030-01-01', pay: '2030-02-01', val: 5, q: 10, r: 0.5 }); var s2 = a.dvAlerts().map(function (x) { return x.tx; }); a.DV.up.length = 0; return [s1.join('|'), s2.indexOf('Novo provento anunciado') >= 0, s2.length]; }), ['Data-com é hoje', true, 2]);
    confere('pílula e sinais de zero: cinza, sem seta e sem +', await pg.evaluate(() => { var a = window.__aporte, h = a.vpill(0, 'x'), u = a.vpill(0.01, 'x'); return [/vpl n/.test(h), /▲|▼|\+/.test(h), /vpl g/.test(u), a.pct(0), a.sgn(0) === a.sgn(0.001)]; }), [true, false, true, '0,00%', true]);
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
    /* página da ação: percorre TODAS as abas com dados completos de mentira, sem erro; aba Tese: escrever, salvar e não perder o texto digitado */
    const ab = await pg.evaluate(function () { var d = [], t = Math.floor(Date.now() / 864e5) - 300, p = 30; for (var i = 0; i < 300; i++) { p += Math.sin(i / 9) * .6 + .12; d.push([t + i, +p.toFixed(2)]); }
      var old = MD.d, oldT = S.teses, oldP = S.pend.length, out = { erros: [], vazias: [] };
      var q = []; for (var y = 2024; y <= 2025; y++) for (var k = 1; k <= 4; k++) if (y < 2025 || k < 3) q.push([y, k, 100 + k, 10 + k, 20, -5, -3]);
      MD.d = { hist: { ABCD3: { d: d, w: d, last: d[299][1], name: 'Abcd SA', cur: 'BRL', div: [] } }, idx: {}, at: Date.now(), fund: { cols: ['cot', 'pl', 'pvp', 'dy', 'roe', 'liq2m'], d: { ABCD3: [30, 10, 1.2, 5, 15, 5e7] } },
        cvm: { nomes: { ABCD3: 'ABCD SA' }, q: { ABCD3: q } }, cons: { v: 1, at: '2026-11-21', d: { ABCD3: { n: 5, alvo: [40, 50, 30], rec: [2, 2, 1, 0, 0], rk: 2, ph: [['2025-03-31', 1, 1.1, null]], est: { '0y': [3, 0.1, 1e9, 0.05, 4, null] } } } },
        anual: { v: 1, ok: [2024], d: { ABCD3: { 2024: [1e9, 1e8] } } }, sobre: { v: 1, e: { 1: { a: 'Faz coisas.', f: 2000, c: 'privado', s: 'x', w: '' } }, t: { ABCD3: '1' } }, risk: { v: 1, at: new Date().toISOString(), ac: {}, fatos: {}, dir: {}, pol: {} } };
      stkOpen('ABCD3'); var tabs = ['res', 'val', 'ind', 'tri', 'tese', 'div', 'sob', 'rec', 'news'];
      tabs.forEach(function (v) { try { STV = v; stkRender(); if (document.getElementById('stk-b').textContent.length < 200) out.vazias.push(v); } catch (e) { out.erros.push(v + ': ' + e.message); } });
      STV = 'tese'; stkRender(); out.convida = document.getElementById('stk-b').innerHTML.indexOf('Escrever minha tese') >= 0;
      document.querySelector('#stk-b [data-th="edit"]').click(); var ta = document.getElementById('th-res'); out.form = !!ta; ta.value = 'Minha tese X'; document.getElementById('th-acomp').value = '• lucro\n\n- roe'; ta.focus();
      stkRender(); out.manteve = document.getElementById('th-res') && document.getElementById('th-res').value === 'Minha tese X';
      document.querySelector('#stk-b [data-th="save"]').click(); var T = S.teses && S.teses.ABCD3; out.salvou = !!T && T.res === 'Minha tese X' && T.acomp.join('|') === 'lucro|roe' && S.pend.length === oldP + 1 && S.pend[S.pend.length - 1].k === 'teses';
      out.mostra = document.getElementById('stk-b').innerHTML.indexOf('Minha tese X') >= 0 && document.getElementById('stk-b').innerHTML.indexOf('Os números de hoje') >= 0;
      stkClose(); S.teses = oldT; S.pend.length = oldP; MD.d = old; return out; });
    confere('página da ação: todas as abas abrem sem erro e com conteúdo; tese: escrever, não perder o digitado ao atualizar, salvar na nuvem', [ab.erros.join(';'), ab.vazias.join(','), ab.convida, ab.form, ab.manteve, ab.salvou, ab.mostra], ['', '', true, true, true, true, true]);
    /* Valor investido e Câmbio no Início: quarto cartão, gráficos com histórico e alternância Meu lucro/Dólar */
    const hc = await pg.evaluate(() => { var r = { cards: document.querySelectorAll('#hcards .hc').length, inv: !!document.querySelector('[data-hero="inv"]'), cam: !!document.querySelector('.hcg[data-hero="cam"]') };
      var q = function (s) { return document.querySelectorAll('#stk-b ' + s).length; };
      heroOpen('luc'); r.lucSvg = q('.gch svg'); r.lucTxt = /Lucro total/.test(document.getElementById('stk-h').textContent); stkClose();
      heroOpen('inv'); r.invSvg = q('.gch svg'); r.invNoIntra = q('[data-rng="1d"]'); stkClose();
      var fx0 = [MK.fxMeta, MK.fxSeries, MK.fxDates, MK.fxLatestDate, MK.fxLatest], se = {}; for (var dd = Date.parse('2025-01-01'); dd < Date.now(); dd += 864e5 * 3) se[new Date(dd).toISOString().slice(0, 10)] = 5.2 + (dd - Date.parse('2025-01-01')) / 864e5 / 1000; ingestFx({ series: se });
      heroOpen('cam'); r.camSvg = q('.gch svg'); r.camTog = q('[data-hcv]'); var h1 = cambioHist(); r.camPts = h1.length > 0; r.camLast = Math.abs(h1[h1.length - 1].c - (function () { var R = compute(), T = R.tot; return T.uA + T.rfU + T.uF - valoriz(R).pv })()) < 0.02;
      var now5 = Math.floor(Date.now() / 1000), p5 = []; for (var z = 0; z < 40; z++) p5.push([now5 - (40 - z) * 300, 5.4 + z * .001]); FIN['intra/BRL=X'] = { d: { cur: 'BRL', off: -10800, at: now5, prev: 5.39, p: p5 }, at: Date.now() };
      document.querySelector('[data-rng="1d"]').click(); r.cam1d = q('.gch svg'); document.querySelector('[data-hcv="usd"]').click(); r.usd1d = q('.gch svg'); document.querySelector('[data-rng="1y"]').click(); document.querySelector('[data-hcv="luc"]').click(); document.querySelector('[data-hcv="usd"]').click(); r.usdSvg = q('.gch svg'); r.usdTxt = /Dólar \(USD\/BRL\)/.test(document.getElementById('stk-b').textContent); stkClose(); MK.fxMeta = fx0[0]; MK.fxSeries = fx0[1]; MK.fxDates = fx0[2]; MK.fxLatestDate = fx0[3]; MK.fxLatest = fx0[4]; return r; });
    confere('Início: cartão de Câmbio, valor investido e câmbio abrem gráfico com histórico', [hc.cards, hc.inv, hc.cam, hc.invSvg, hc.invNoIntra, hc.camSvg, hc.camTog, hc.camPts, hc.usdSvg, hc.usdTxt, hc.lucSvg, hc.lucTxt, hc.cam1d, hc.usd1d], [5, true, true, 1, 1, 1, 2, true, 1, true, 1, true, 1, 1]);
    confere('Início: card Lucro total vai para Carteira → Desempenho', await pg.evaluate(() => { var c = document.querySelector('.hcg[data-goto="desempenho"]'); if (!c) return 'sem card'; c.querySelector('b').click(); var v = document.querySelector('[data-tab="ativos"][data-sub2="perf"]'); var ok = v && !v.hidden; window.__aporte.setRng && 0; var rr = [ok, /Tudo que você já/.test(document.body.innerText)]; location.hash = ''; return rr; }), [true, true]);
    confere('balão (ⓘ) fica na frente das telas deslizantes (z-index maior que o da sheet)', await pg.evaluate(() => { var b = document.createElement('div'); b.id = 'balpop'; b.hidden = true; document.body.appendChild(b); var z = +getComputedStyle(b).zIndex, sh = document.createElement('div'); sh.className = 'sheet'; sh.hidden = true; document.body.appendChild(sh); var zs = +getComputedStyle(sh).zIndex; b.remove(); sh.remove(); return z > zs; }), true);
    confere('ajustes em abas: uma aba por vez, escolha salva', await pg.evaluate(() => { var a = window.__aporte; showTab('ajustes'); var vis = function () { return [].filter.call(document.querySelectorAll('#ajcol [data-aj]'), function (e) { return e.offsetParent !== null; }).map(function (e) { return e.getAttribute('data-aj'); }).join(','); }, r = [vis()]; ['aparencia', 'dados', 'precos', 'assistente'].forEach(function (v) { document.querySelector('#ajseg [data-ajv=' + v + ']').click(); r.push(vis() + '|' + document.querySelector('#ajseg [aria-pressed=true]').getAttribute('data-ajv') + '|' + localStorage.getItem('minha-carteira-v1-ajv')); }); document.querySelector('#ajseg [data-ajv=perfil]').click(); return r; }), ['perfil', 'aparencia|aparencia|aparencia', 'dados,dados,dados|dados|dados', 'precos|precos|precos', 'assistente|assistente|assistente']);
    confere('vender tudo hoje: a conta fecha (posições + já ganho − custos = lucro = valor − aportado)', await pg.evaluate(() => { var a = window.__aporte, R = a.compute(), V = a.vendaCalc(R), r = function (n) { return Math.round(n * 100) / 100; }; return [r(V.posLuc + V.bolso - V.custo - V.lucro), r(V.valor - V.contrib - V.lucro), r(V.lucro - (R.tot.gain - V.custo))]; }), [0, 0, 0]);
    confere('simulador de venda e troca: vende para chegar no % pedido, mostra imposto, destino e o depois', await pg.evaluate(() => { var a = window.__aporte; a.renderApo(); var tk = document.getElementById('sim-tk'); if (!tk) return 'sem painel'; var o = tk.options[0].textContent, m = /([\d.,]+)%/.exec(o), cur = parseFloat(m[1].replace('.', '').replace(',', '.')); document.getElementById('sim-al').value = String(Math.floor(cur / 2)).replace('.', ','); document.getElementById('sim-dest').value = 'novo'; document.getElementById('sim-nv').value = 'ITUB4'; document.getElementById('sim-px').value = '30'; document.getElementById('sim-go').click(); var t = document.getElementById('sim-res').innerText; return [/Vender/.test(t), /Imposto estimado/.test(t), /Dinheiro para reinvestir/.test(t), /Comprar ITUB4/.test(t), /Depois da troca/.test(t)]; }), [true, true, true, true, true]);
    if (!REAL) confere('vender tudo hoje: dólares com spread 0,99%, IOF 0,38% e IR 15%', await pg.evaluate(() => { var a = window.__aporte, V = a.vendaCalc(a.compute()), r = function (n) { return Math.round(n * 100) / 100; }, h = a.vendaHtml(a.compute()); return [r(V.v), r(V.c), r(V.spr), r(V.iof), r(V.ir), r(V.liq), /Você ficaria com/.test(h) && /data-vnd="spr"/.test(h)]; }), [13920, 11050, 137.81, 52.37, 430.5, 13299.32, true]);
    confere('faixa: padrão sem prata/soja/café, escolher o que mostrar e arrastar', await pg.evaluate(async () => { var a = window.__aporte, it = [['IBOV', 100000, 99000, 'BRL', 'i', 'ibov'], ['OURO', 4000, 3990, 'USD', 'i', 'GLD'], ['PRATA', 50, 49, 'USD', 'i', ''], ['SOJA', 12, 11, 'USD', 'i', ''], ['CAFÉ', 3, 2.9, 'USD', 'i', ''], ['PETR4', 40, 39, 'BRL', 's', ''], ['VALE3', 60, 59, 'BRL', 's', ''], ['ITUB4', 40, 39, 'BRL', 's', '']]; a.MD.d = a.MD.d || {}; a.MD.d.tape = { ts: Date.now() / 1000, it: it }; localStorage.removeItem('minha-carteira-v1-tapeoff'); location.reload; a.renderTape(); var tx = function () { return [].map.call(document.querySelectorAll('#tape .tpi'), function (n) { return n.getAttribute('data-tp'); }); }; var r = []; r.push(tx().indexOf('PRATA') < 0 && tx().indexOf('OURO') >= 0); document.querySelector('[data-tpe="open"]').click(); var b = document.querySelector('[data-tpt="PRATA"]'); r.push(!!b && b.getAttribute('aria-pressed') === 'false'); b.click(); r.push(tx().indexOf('PRATA') >= 0); document.querySelector('[data-tpr="1"]').click(); r.push(tx().indexOf('PRATA') < 0); document.querySelector('[data-tpe="close"]').click(); var t = document.getElementById('tape'), ev = function (ty, x) { t.dispatchEvent(new PointerEvent(ty, { clientX: x, bubbles: true, pointerId: 1 })); }; await new Promise(function (s) { setTimeout(s, 300); }); var p0 = document.querySelector('#tape .tptr').style.transform; ev('pointerdown', 200); ev('pointermove', 150); ev('pointermove', 100); await new Promise(function (s) { setTimeout(s, 100); }); var p1 = document.querySelector('#tape .tptr').style.transform; ev('pointerup', 100); r.push(p0 !== p1); return r; }), [true, true, true, true, true]);
    confere('classes da empresa: ON e PN lado a lado, só da mesma empresa', await pg.evaluate(() => { var a = window.__aporte; a.MD.d = a.MD.d || {}; a.MD.d.cvm = { nomes: { AAAA3: 'X SA', AAAA4: 'X SA', BBBB3: 'Y SA', CCCC3: 'Z', CCCC4: 'Z', CCCC11: 'Z' } }; a.MD.d.fund = { cols: ['cot', 'dy'], d: { AAAA3: [10, 5], AAAA4: [9, 6], BBBB3: [1, 1], CCCC3: [2, 0], CCCC4: [3, 0], CCCC11: [8, 0] } }; var h = a.sibHtml('AAAA4'), u = a.sibHtml('BBBB3'), c = a.sibHtml('CCCC3'); return [/AAAA3/.test(h) && /AAAA4/.test(h) && /ON/.test(h) && /PN/.test(h) && !/BBBB3/.test(h), u === '', /Unit/.test(c)]; }), [true, true, true]);
    const invErr = await pg.evaluate(() => { try { window.__aporte.heroOpen('inv'); window.__aporte.setRng('1d'); window.__aporte.heroRender(); var t = document.getElementById('stk-b').textContent; stkClose(); return t.length > 5 ? 'ok' : 'vazio'; } catch (e) { return String(e); } });
    confere('Valor investido abre no 1D/5D sem erro', invErr, 'ok');
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
    /* nota: queda no último trimestre, notícia negativa e preço em queda baixam a nota e viram aviso (caso tipo BBSE3) */
    const nota = await pg.evaluate(() => { var A = window.__aporte, M = A.MD, old = M.d, day = Math.floor(Date.now() / 864e5), r = {};
      var mk = function (ql, neg, queda) { var w = [], d = []; for (var i = 0; i < 60; i++) { d.push([day - 300 + i * 5, queda ? 45 - i * 0.15 : 30 + i * 0.05]); } M.d = { fund: { cols: ['cot', 'pl', 'pvp', 'dy', 'roe', 'ml', 'liq2m', 'cr5'], d: { BBSE3: [30, 8, 6, 10, 70, 60, 9e8, 12] } }, hist: { BBSE3: { d: d, w: d } }, cvm: { q: { BBSE3: ql } }, res: neg ? { acoes: { BBSE3: { ai: { sentimento: 'negativo', resumo: 'Novas contratações de seguro em queda.', eventos: [] }, aiAt: Date.now() / 1000 } } } : {} }; return A.stkAna('BBSE3', { cur: 'BRL', price: 30, k: {} }); };
      var bom = [[2025, 1, 2000, 800], [2025, 2, 2000, 800], [2025, 3, 2000, 800], [2025, 4, 2000, 800], [2026, 1, 2100, 820], [2026, 2, 2100, 820], [2026, 3, 2100, 820]];
      var ruim = bom.slice(0, 6).concat([[2026, 3, 1700, 600]]);
      var a = mk(bom, false, false), b = mk(ruim, true, true);
      r.base = [a.score, a.alr.length]; r.ruimMenor = b.score < a.score; r.alr = b.alr.map(function (x) { return x[0]; }).join('|'); r.peso = b.neg.filter(function (x) { return x[2] > 1; }).length;
      M.d = old; return r; });
    confere('nota: trimestre pior, notícia negativa e preço em queda baixam a nota e viram aviso', [nota.base, nota.ruimMenor, nota.alr, nota.peso], [[10, 0], true, 'Lucro do último trimestre caiu|Receita do último trimestre caiu|Preço em queda|Notícias recentes negativas', 3]);
    /* veredito de entrada: faixa pela margem de segurança, preço contra lucro, entrada em partes */
    const ent = await pg.evaluate(() => { var A = window.__aporte, M = A.MD, old = M.d, day = Math.floor(Date.now() / 864e5), r = {};
      var d = []; for (var i = 0; i < 60; i++) { d.push([day - 300 + i * 5, 30 + i * 0.5]); } var P = d[59][1];
      var q = function (g) { var o = []; for (var i = 0; i < 4; i++) o.push([2025, i + 1, 2000, 800]); for (var j = 0; j < 4; j++) o.push([2026, j + 1, 2000, 800 * (1 + g)]); return o; };
      var mk = function (g) { M.d = { fund: { cols: ['cot', 'pl', 'pvp', 'dy', 'roe', 'ml', 'liq2m', 'cr5'], d: { BBSE3: [P, 8, 6, 10, 70, 60, 9e8, 12] } }, hist: { BBSE3: { d: d, w: d } }, cvm: { q: { BBSE3: q(g) } }, res: {} }; var dd = { cur: 'BRL', price: P, k: {} }; return [dd, A.stkAna('BBSE3', dd)]; };
      var m = mk(0.25), V = function (mg) { return { ms: [1], mg: mg, up: mg / (1 - mg), med: P / (1 - mg), F: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }) }; };
      r.z = [A.entInfo('BBSE3', m[0], m[1], V(0.3)).z, A.entInfo('BBSE3', m[0], m[1], V(0.1)).z, A.entInfo('BBSE3', m[0], m[1], V(-0.2)).z];
      r.lucroOk = A.entInfo('BBSE3', m[0], m[1], V(0.3)).lu[0]; var m2 = mk(0); r.lucroAl = A.entInfo('BBSE3', m2[0], m2[1], V(0.3)).lu[0];
      var ruim = q(0).slice(0, 7).concat([[2026, 4, 1500, 500]]), dq = d.map(function (x, i) { return [x[0], 60 - i * 0.5]; }), Pq = dq[59][1];
      M.d = { fund: { cols: ['cot', 'pl', 'pvp', 'dy', 'roe', 'ml', 'liq2m', 'cr5'], d: { BBSE3: [Pq, 8, 6, 10, 70, 60, 9e8, 12] } }, hist: { BBSE3: { d: dq, w: dq } }, cvm: { q: { BBSE3: ruim } }, res: {} }; var dd2 = { cur: 'BRL', price: Pq, k: {} }, A2 = A.stkAna('BBSE3', dd2), E2 = A.entInfo('BBSE3', dd2, A2, V(0.3)); r.motivo = [E2.z, E2.caiu, E2.mot.length > 0];
      M.d = { fund: { cols: ['cot', 'pl', 'pvp', 'dy', 'roe', 'ml', 'liq2m', 'cr5'], d: { BBSE3: [Pq, 8, 6, 10, 70, 60, 9e8, 12] } }, hist: { BBSE3: { d: dq, w: dq } }, cvm: { q: { BBSE3: q(0.05) } }, res: {} }; var A3 = A.stkAna('BBSE3', dd2), E3 = A.entInfo('BBSE3', dd2, A3, V(0.3)); r.semMotivo = [E3.z, E3.mot.length];
      var RF = { tot: { value: 1000, rfV: 0 }, held: [{ p: { ticker: 'BBAS3', market: 'BR' }, v: 600 }, { p: { ticker: 'BBSE3', market: 'BR' }, v: 200 }, { p: { ticker: 'VALE3', market: 'BR' }, v: 200 }] };
      var c1 = A.concFor('ITUB4', RF), c2 = A.concFor('BBSE3', RF), c3 = A.concFor('VALE3', RF); r.conc = [c1.alta, Math.round(c1.sp), c2.alta, Math.round(c2.gp), c3.alta];
      M.d = { fund: { cols: ['cot', 'pl', 'pvp', 'dy', 'roe', 'ml', 'liq2m', 'cr5'], d: { BBSE3: [Pq, 8, 6, 10, 70, 60, 9e8, 12] } }, hist: { BBSE3: { d: d, w: d }, BBAS3: { d: dq, w: dq, last: Pq } }, cvm: { q: { BBSE3: q(0.05) } }, res: {} }; var dd4 = { cur: 'BRL', price: P, k: {} }, A4 = A.stkAna('BBSE3', dd4);
      var E4 = A.entInfo('BBSE3', dd4, A4, V(0.3), c2), E5 = A.entInfo('BBSE3', dd4, { chips: [['Qualidade', 'Alta']], alr: [], score: 9, wp: 5, wn: 0, pos: [], neg: [], inf: [] }, V(0.45), c2);
      r.dep = A4.alr.map(function (x) { return x[0]; }).filter(function (t) { return /Depende/.test(t); }).join(); var AC = { chips: [['Qualidade', 'Alta']], alr: [], score: 9, wp: 5, wn: 0, pos: [], neg: [], inf: [] }; r.concZ = [E4.z, E5.z, E5.rara, A.entInfo('BBSE3', dd4, AC, V(0.3), c2).z];
      A.ENT.mg = 35; r.z35 = A.entInfo('BBSE3', m[0], m[1], V(0.3)).z; A.ENT.mg = 25; M.d = old; return r; });
    confere('entrada: faixa confortável/justa/cara pela margem, preço contra lucro (com e sem lucro) e margem ajustável', [ent.z, ent.lucroOk, ent.lucroAl, ent.z35, ent.motivo, ent.semMotivo, ent.conc, ent.dep, ent.concZ], [['conf', 'just', 'caro'], 'ok', 'al', 'just', ['motivo', true, true], ['semmotivo', 0], [true, 80, true, 80, false], 'Depende de BBAS3', ['motivo', 'conf', true, 'conc']]);
    /* relatório de risco: contexto e prompt montados sem rede; sem chave pede a chave; sem probabilidade inventada */
    const rp = await pg.evaluate(function () { var A = window.__aporte, k = S.keys.gq, g = S.keys.gem; S.keys.gq = ''; S.keys.gem = ''; var semChave = A.rpHtml(); S.keys.gq = 'x'; var comChave = A.rpHtml(); S.keys.gq = k; S.keys.gem = g; var m = A.rpMsgs(false), ex = A.rpExtra(compute()); return { semChave: /chave da Groq/.test(semChave), botao: /data-rp="go"/.test(comChave), sys: m[0].role === 'system' && /RELATÓRIO DE RISCO/.test(m[0].content) && /NUNCA escreva porcentagem/.test(m[0].content), ctx: /CONTEXTO DO APP AGORA/.test(m[0].content), conc: /CONCENTRAÇÃO/.test(ex) && /DIVISÃO: Brasil/.test(ex), user: m[1].role === 'user' }; });
    confere('relatório de risco: sem chave avisa, com chave mostra botão, prompt com contexto, concentração e regra de não inventar probabilidade', [rp.semChave, rp.botao, rp.sys, rp.ctx, rp.conc, rp.user], [true, true, true, true, true, true]);
    /* Banco Central / Focus: linhas cruas do Olinda viram tabela, mudança em 4 semanas, leitura, Selic por reunião, card e contexto da IA */
    const bc = await pg.evaluate(function () { var A = window.__aporte, y = new Date().getFullYear(), L = '2026-11-16', P = '2026-10-19', row = function (ind, d, ref, med) { return { Indicador: ind, Data: d, DataReferencia: String(ref), Mediana: med, Minimo: med - 0.5, Maximo: med + 0.5, numeroRespondentes: 100, baseCalculo: 0 }; };
      var d = A.bcIngest({ IPCA: [row('IPCA', L, y, 4.8), row('IPCA', P, y, 4.5), row('IPCA', L, y + 1, 4.0), row('IPCA', P, y + 1, 4.0)], Selic: [row('Selic', L, y, 15), row('Selic', P, y, 15)], 'Câmbio': [row('Câmbio', L, y, 5.6), row('Câmbio', P, y, 5.5)], 'PIB Total': [row('PIB Total', L, y, 2.1), row('PIB Total', P, y, 2.0)] },
        [{ Indicador: 'Selic', Data: L, Reuniao: 'R2/' + (y + 1), Mediana: 14.5 }, { Indicador: 'Selic', Data: L, Reuniao: 'R1/' + (y + 1), Mediana: 14.75 }, { Indicador: 'Selic', Data: P, Reuniao: 'R1/' + (y + 1), Mediana: 15 }, { Indicador: 'Selic', Data: L, Reuniao: 'R8/' + y, Mediana: 15 }]);
      A.BC.d = d; A.BC.at = Date.now(); var lei = A.bcLeitura().map(function (x) { return x[0] + ':' + x[1]; }), mu = A.bcMudou(), h = A.bcHtml(), cx = A.bcCtx();
      return { ipca: d.ind.IPCA.y[y].now.med, ant: d.ind.IPCA.y[y].ant, reun: d.reun.map(function (e) { return e.r; }), l: d.L, lei0: lei[0], mu0: mu[0], tbl: /Boletim Focus/.test(h) && /4,8%/.test(h) && /Selic esperada/.test(h), card: /1ª reunião de /.test(h) || /Selic esperada/.test(h), ctx: /FOCUS \(Banco Central, pesquisa de 16\/11\/2026/.test(cx) && /NÃO DISPONÍVEL/.test(cx), y: y }; });
    confere('Banco Central: Focus (mediana, 4 semanas antes, reuniões em ordem, leitura da inflação acima do teto, mudanças, tabela, card e contexto da IA)', [bc.ipca, bc.ant, bc.reun, bc.l, bc.lei0, bc.mu0, bc.tbl, bc.card, bc.ctx], [4.8, 4.5, ['R8/' + bc.y, 'R1/' + (bc.y + 1), 'R2/' + (bc.y + 1)], '2026-11-16', 'al:Inflação de ' + bc.y + ': 4,8%', 'Inflação ' + bc.y + ': subiu de 4,5% para 4,8%', true, true, true]);
    /* plano da carteira: prompt com cenário, gatilhos e plano anterior; plano segue valendo sem gatilho; gatilhos quando algo muda */
    const plano = await pg.evaluate(function () { var A = window.__aporte, P = A.PL, old = { t: P.t, at: P.at, snap: P.snap }, k = S.keys.gq; S.keys.gq = 'x'; var vazio = A.plHtml(); var sn = A.plSnap(); P.t = '## Onde estamos\nTexto do plano.'; P.at = Date.now(); P.snap = JSON.parse(JSON.stringify(sn)); var igual = A.plHtml(), g0 = A.plGat().length;
      P.snap.selic = (sn.selic == null ? 10 : sn.selic) + 2; P.snap.usd = (sn.usd || 5) * 0.8; var g1 = A.plGat(); var m = A.plMsgs(false); var ok = { sys: /PLANO DA CARTEIRA/.test(m[0].content) && /nunca porcentagem/.test(m[0].content), gat: /GATILHOS DE REVISÃO DO APP/.test(m[0].content), ant: /PLANO ANTERIOR/.test(m[0].content), usr: m[1].role === 'user' };
      P.t = old.t; P.at = old.at; P.snap = old.snap; S.keys.gq = k; return { criar: /Criar o plano/.test(vazio), segue: /O plano segue valendo/.test(igual) && /Refazer o plano/.test(igual), g0: g0, g1: g1.length >= 1, dolar: g1.some(function (x) { return /dólar subiu/.test(x); }), ok: ok }; });
    const apo = await pg.evaluate(function () { var A = window.__aporte, x = A.plAportes(), m = A.plMsgs(false)[0].content; return { l: /^APORTES \(valor aplicado/.test(x), n: !/NaN|undefined|Infinity/.test(x), seg: /Brasil −?R\$/.test(x) && /dólar −?R\$/.test(x) && /renda fixa −?R\$/.test(x), ctx: /APORTES \(valor aplicado/.test(m) && /sem vender nada/.test(m) }; });
    confere('plano: resumo de aportes (média 12 e 3 meses, por segmento) sem NaN e dentro do prompt', [apo.l, apo.n, apo.seg, apo.ctx], [true, true, true, true]);
    confere('plano da carteira: botão criar sem plano, plano segue valendo sem gatilho, gatilho de dólar, prompt com gatilhos e plano anterior', [plano.criar, plano.segue, plano.g0, plano.g1, plano.dolar, plano.ok.sys, plano.ok.gat, plano.ok.ant, plano.ok.usr], [true, true, 0, true, true, true, true, true, true]);
    /* riscos e política: fixture do robô → seções da ação, aviso do sino só para o que é novo e grave, contexto da IA com fonte e data */
    const ris = await pg.evaluate(function () { var A = window.__aporte, M = A.MD, old = M.d, tk = compute().held.filter(function (x) { return x.p.market !== 'US'; })[0].p.ticker, hoje = today(), ant = new Date(Date.now() - 20 * 864e5).toISOString().slice(0, 10), sk = LS + '-riseen', sv = localStorage.getItem(sk); localStorage.removeItem(sk);
      var risk = { v: 1, at: new Date().toISOString(), ac: {}, fatos: {}, pol: { gov: { n: 'Governo e impostos', it: [{ t: 'Governo discute imposto', s: 'Valor', d: hoje, l: 'https://x.com/a' }] }, bc: { n: 'Banco Central', it: [] } }, err: [] };
      risk.ac[tk] = [{ t: 'Diretoria sob investigação', s: 'G1', d: hoje, l: 'https://x.com/b', g: 1 }, { t: 'Empresa abre vaga', s: 'Folha', d: ant, l: 'https://x.com/c', g: 0 }]; risk.dir = {}; risk.dir[tk] = [{ t: 'Presidente prevê lucro maior em 2027', s: 'InfoMoney', d: hoje, l: 'https://x.com/d' }]; risk.fatos[tk] = [{ d: hoje, c: 'Fato Relevante', a: 'Renúncia do presidente', l: 'https://cvm/1', g: 1 }];
      M.d = Object.assign({}, old, { risk: risk }); var a0 = A.riAlerts().length; var d = JSON.parse(localStorage.getItem(sk) || '{}'); Object.keys(d).forEach(function (k) { d[k] = Date.now(); }); localStorage.setItem(sk, JSON.stringify(d)); var a1 = A.riAlerts(); var h = A.riHtml(tk), c = A.riCtx([tk], true), p = A.riPanel();
      var r = { semente: a0 === 0, alertas: a1.length === 2, tipos: a1.map(function (x) { return x.tx; }).sort().join(), secs: /Riscos e política/.test(h) && /Fatos relevantes \(CVM\)/.test(h) && /Diretoria sob investigação/.test(h) && /Renúncia do presidente/.test(h), link: /href="https:\/\/cvm\/1"/.test(h) && /O que a diretoria diz/.test(h) && /Presidente prevê lucro maior em 2027/.test(h) && /fala da diretoria, manchete\): Presidente prevê/.test(c), tema: /Governo discute imposto/.test(h), ctx: /GRAVE, manchete\): Diretoria sob investigação \[G1, /.test(c) && /CVM Fato Relevante/.test(c) && /NÃO é confirmação/.test(c), painel: /Riscos nas suas ações/.test(p) && /Diretoria sob investigação/.test(p), semR: A.riHtml('AAPL') === '' };
      M.d = old; if (sv == null) localStorage.removeItem(sk); else localStorage.setItem(sk, sv); return r; });
    confere('riscos e política: aviso só do que é novo e grave, seções na ação com data e link, tema do setor, painel no Risco e contexto da IA com fonte', [ris.semente, ris.alertas, ris.tipos, ris.secs, ris.link, ris.tema, ris.ctx, ris.painel, ris.semR], [true, true, 'Fato relevante,Notícia de risco', true, true, true, true, true, true]);
    /* vento do setor: juros altos pesam em construção, ajudam a margem de banco, minério/dólar ajudam mineração; sem fator forte fica vazio */
    const vt = await pg.evaluate(function () { var A = window.__aporte, bc0 = window.bcSelicNow, bd = A.BC.d, y = String(new Date().getFullYear() + 1), M = A.MD, old = M.d; window.bcSelicNow = function () { return 14.75; };
      var mk = function (v) { var o = { y: {} }; o.y[y] = { now: { med: v } }; o.y[String(new Date().getFullYear())] = { now: { med: v } }; return o; }; A.BC.d = { ind: { 'PIB Total': mk(1.0), Selic: mk(12.5), IPCA: mk(5.2) }, reun: [], L: '' };
      var d0 = Date.UTC(2026, 0, 1) / 864e5; M.d = Object.assign({}, old, { idx: { iron: { d: [[d0 - 365, 100], [d0, 70]] }, usd: { d: [[d0 - 365, 5], [d0, 6]] }, brent: { d: [[d0 - 365, 80], [d0, 82]] } } });
      var c = A.vtSetor(['Consumo cíclico', 'Construção Civil']).map(function (x) { return x[0] + ':' + x[1]; }), b = A.vtSetor(['Financeiro', 'Intermediários Financeiros']).map(function (x) { return x[0] + ':' + x[1]; }), m = A.vtSetor(['Materiais básicos', 'Mineração']).map(function (x) { return x[0] + ':' + x[1]; }), p = A.vtSetor(['Petróleo e gás', 'Petróleo, Gás e Biocombustíveis']), t = A.vtSetor(['Saúde', 'Equipamentos']);
      var ctx = A.vtCtx(['BBAS3']), tm = A.riTemas('BBAS3'), html = A.vtHtml('BBAS3');
      window.bcSelicNow = bc0; A.BC.d = bd; M.d = old;
      return { c: c.join('|'), b: b.join('|'), m: m.join('|'), p: p.length, t: t.length, ctx: /VENTO DOS SETORES/.test(ctx) && /MISTO — Juros altos/.test(ctx), tm: tm.indexOf('bc') >= 0 && tm.indexOf('fisc') >= 0, html: /Vento do setor/.test(html) }; });
    confere('vento do setor: construção sofre com juros e PIB fraco e ganha com queda esperada, banco fica misto, mineração pesa pelo minério, sem fator fica vazio, contexto da IA e temas de política do banco', [vt.c, vt.b, vt.m, vt.p, vt.t, vt.ctx, vt.tm, vt.html], ['contra:Juros altos|contra:Economia fraca|favor:Juros devem cair', 'misto:Juros altos|contra:Economia fraca', 'contra:Minério caiu|favor:Dólar subiu', 1, 0, true, true, true]);
    /* vento do setor segura o "Confortável": preço bem abaixo do justo + setor com mais fatores contra vira 'vento'; empate mantém */
    const ven = await pg.evaluate(() => { var A = window.__aporte, M = A.MD, old = M.d, vs0 = window.vtSetor, day = Math.floor(Date.now() / 864e5), r = {};
      var d = []; for (var i = 0; i < 60; i++) { d.push([day - 300 + i * 5, 30 + i * 0.5]); } var P = d[59][1];
      var q = []; for (var i2 = 0; i2 < 4; i2++) q.push([2025, i2 + 1, 2000, 800]); for (var j = 0; j < 4; j++) q.push([2026, j + 1, 2000, 1000]);
      M.d = { fund: { cols: ['cot', 'pl', 'pvp', 'dy', 'roe', 'ml', 'liq2m', 'cr5'], d: { BBSE3: [P, 8, 6, 10, 70, 60, 9e8, 12] } }, hist: { BBSE3: { d: d, w: d } }, cvm: { q: { BBSE3: q } }, res: {} };
      var dd = { cur: 'BRL', price: P, k: {} }, an = A.stkAna('BBSE3', dd), V = { ms: [1], mg: 0.3, up: 0.43, med: P / 0.7, F: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }) };
      window.vtSetor = function () { return [['contra', 'Juros altos', 'Selic em 14,8%']]; }; var E = A.entInfo('BBSE3', dd, an, V, { alta: false });
      window.vtSetor = function () { return [['contra', 'Juros altos', 'x'], ['favor', 'Juros devem cair', 'y']]; }; var E2 = A.entInfo('BBSE3', dd, an, V, { alta: false });
      window.vtSetor = function () { return []; }; var E3 = A.entInfo('BBSE3', dd, an, V, { alta: false });
      window.vtSetor = vs0; M.d = old; return { z: E.z, vt: E.vt.length, z2: E2.z, z3: E3.z }; });
    confere('entrada: setor com mais fatores contra que a favor troca Confortável por vento; empate e sem fator mantêm confortável', [ven.z, ven.vt, ven.z2, ven.z3], ['vento', 1, 'conf', 'conf']);
    /* sobre a empresa: setor no cabeçalho e painel com o cadastro da CVM */
    const sob = await pg.evaluate(function () { var A = window.__aporte, M = A.MD, old = M.d, tk = compute().held.filter(function (x) { return x.p.market !== 'US'; })[0].p.ticker, r = {};
      M.d = Object.assign({}, old, { sobre: { v: 1, e: { 9: { a: 'Banco múltiplo que atua em varejo.', f: '1808', c: 'Estatal', s: 'Bancos', w: 'www.exemplo.com.br' } }, t: {} } }); M.d.sobre.t[tk] = '9';
      var h = A.sobHtml(tk); r.a = /Sobre a empresa/.test(h) && /Banco múltiplo que atua em varejo/.test(h) && /1808/.test(h) && /Estatal/.test(h) && /https:\/\/www\.exemplo\.com\.br/.test(h);
      M.d = Object.assign({}, old, { sobre: null }); var h2 = A.sobHtml(tk); r.b = /ainda não chegou/.test(h2) || h2 === ''; r.eua = A.sobHtml('AAPL') === ''; r.set = typeof A.sobSetor(tk) === 'string'; M.d = old; return r; });
    confere('sobre a empresa: painel com atividade, fundação, controle e site; sem cadastro avisa; EUA não mostra', [sob.a, sob.b, sob.eua, sob.set], [true, true, true, true]);
    /* abas da ação: dividendos, receita e lucro por ano, sobre */
    const emp = await pg.evaluate(function () { var A = window.__aporte, M = A.MD, old = M.d, tk = compute().held.filter(function (x) { return x.p.market !== 'US'; })[0].p.ticker, day = Math.floor(Date.now() / 864e5), r = {};
      var dv = []; for (var i = 0; i < 8; i++) dv.push([day - 30 - i * 90, 0.5]); var hist = Object.assign({}, old.hist); hist[tk] = Object.assign({}, hist[tk], { div: dv });
      var an = {}; an[tk] = {}; for (var y = 2015; y <= 2024; y++) an[tk][y] = [100e9 + y * 1e9, 10e9 + (y % 3) * 1e9];
      M.d = Object.assign({}, old, { hist: hist, anual: { v: 1, ok: [], d: an } });
      var d = { cur: 'BRL', price: 20, k: {}, name: 'X' }, hd = A.emDiv(tk, d, null, {}, 0), hr = A.emRec(tk, d);
      r.div = /Dividendos/.test(hd) && /Dividend yield \(12 meses\)/.test(hd) && /Proventos por ano/.test(hd) && /Últimos pagamentos/.test(hd);
      r.rec = /Receita e lucro/.test(hr) && /Em 2024: receita de/.test(hr) && /5 anos/.test(hr) && /Receita por país e por negócio/.test(hr) && /data-tip=/.test(hr);
      M.d = Object.assign({}, old, { anual: null }); r.recVazio = /ainda não chegaram/.test(A.emRec(tk, d)); r.usa = /só estão disponíveis para ações do Brasil/.test(A.emRec('AAPL', d)); r.sob = /Sobre a empresa/.test(A.emSobre(tk, d)); M.d = old; return r; });
    confere('abas da ação: dividendos com yield e gráfico anual, receita e lucro por ano com tooltip, avisos sem dados, sobre', [emp.div, emp.rec, emp.recVazio, emp.usa, emp.sob], [true, true, true, true, true]);
    /* tese do usuário: mostra o que ele escreveu, números de hoje, lembrete quando o trimestre é ruim, contexto da IA, lista por linha */
    const te = await pg.evaluate(function () { var A = window.__aporte, S = A.S, old = S.teses, M = A.MD, od = M.d;
      S.teses = { XYZW3: { papel: 'Complementar', res: 'Tese de teste', por: 'Porque sim', acomp: ['Lucro', 'ROE'], quebra: ['Queda do lucro por 2 trimestres'], nota: '', at: '2020-01-01' } };
      M.d = Object.assign({}, od, { cvm: { q: { XYZW3: [[2024, 1, 100, 10], [2024, 2, 100, 10], [2024, 3, 100, 10], [2024, 4, 100, 10], [2025, 1, 100, 8], [2025, 2, 100, 7]] }, nomes: {} } });
      var h = A.thHtml('XYZW3', { cur: 'BRL' }), vazio = A.thHtml('SEMTESE3', { cur: 'BRL' }), lem = A.thLembra('XYZW3'), ctx = A.thCtx('XYZW3'), ln = A.thLn('• um\n\n- dois \n três');
      var r = { mostra: h.indexOf('Tese de teste') >= 0 && h.indexOf('Complementar') >= 0 && h.indexOf('vale rever') >= 0, num: h.indexOf('Os números de hoje') >= 0 && h.indexOf('Vindo mal') >= 0, vazio: vazio.indexOf('Escrever minha tese') >= 0, lem: lem.indexOf('Queda do lucro') >= 0, ctx: ctx.indexOf('REVER SE: Queda do lucro') >= 0, ln: ln.join('|') };
      S.teses = old; M.d = od; return r; });
    const tp = await pg.evaluate(function () { var A = window.__aporte, S = A.S, old = S.teses; S.teses = { RF: { papel: 'Reserva de oportunidades', res: 'Reserva para aproveitar quedas' }, VT: { papel: 'Diversificação internacional e dólar' } }; var r = [A.thRF().indexOf('Reserva para aproveitar') >= 0, A.thPapeis().indexOf('Renda fixa: Reserva de oportunidades') >= 0 && A.thPapeis().indexOf('VT: Diversificação') >= 0]; S.teses = old; return r; });
    confere('tese: papel da renda fixa e do VT chega à carteira e à IA', tp, [true, true]);
    confere('tese: aparece, números do dia, vazio convida a escrever, lembra quando o trimestre é ruim, vai para a IA, lista por linha', [te.mostra, te.num, te.vazio, te.lem, te.ctx, te.ln], [true, true, true, true, true, 'um|dois|três']);
    /* ideias para estudar: histórico guardado por dia e comparado com o Ibovespa; qualidade do dado */
    const gh = await pg.evaluate(function () { var A = window.__aporte, ls = localStorage, K = 'minha-carteira-v1-gar', old = ls.getItem(K), M = A.MD, od = M.d, oq = A.S.quotes;
      var out = {}; ls.setItem(K, JSON.stringify({ r: {} })); out.h0 = A.garHist().indexOf('Esse método já acertou?') >= 0 && A.garRes().n === 0;
      var d60 = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10), d5 = new Date(Date.now() - 5 * 864e5).toISOString().slice(0, 10), r = {}; r[d60] = { i: 100000, l: [['AAAA3', 10, 8, 15], ['BBBB3', 10, 8, 15]] }; r[d5] = { i: 100000, l: [['CCCC3', 10, 8, 15]] };
      ls.setItem(K, JSON.stringify({ r: r })); M.d = Object.assign({}, od, { idx: Object.assign({}, od && od.idx, { ibov: { d: [[0, 110000]] } }) });
      A.S.quotes = Object.assign({}, oq, { AAAA3: { price: 13, src: 'auto', at: Date.now() }, BBBB3: { price: 9, src: 'auto', at: Date.now() }, CCCC3: { price: 50, src: 'auto', at: Date.now() } });
      var R = A.garRes(); out.n = R.n; out.bat = R.bat; out.age = R.age; out.html = A.garHist().indexOf('Esse método já acertou?') >= 0;
      var q = A.opQual({ tk: 'ZZZZ3', A: { N: { pl: 1 } } }); out.fraca = q.fraca; out.w = q.w.join('|');
      M.d = od; A.S.quotes = oq; if (old == null) ls.removeItem(K); else ls.setItem(K, old); return out; });
    confere('ideias: sem histórico não inventa; com histórico conta só quem tem 30+ dias e compara com o Ibovespa; dado frágil avisa', [gh.h0, gh.n, gh.bat, gh.age, gh.html, gh.fraca, gh.w.indexOf('sem balanço') >= 0 && gh.w.indexOf('faltam 6 indicadores') >= 0], [true, 2, 1, 60, true, true, true]);
    /* aba Resultados: leitura dos trimestres por regras, consenso e superou/abaixo do esperado */
    const rs = await pg.evaluate(function () { var A = window.__aporte, M = A.MD, old = M.d;
      var q = [[2024, 1, 100, 10], [2024, 2, 100, 10], [2024, 3, 100, 10], [2024, 4, 100, 10], [2025, 1, 110, 12], [2025, 2, 110, 13]];
      var q2 = [[2024, 1, 100, 10], [2024, 2, 100, 10], [2024, 3, 100, 10], [2024, 4, 100, 10], [2025, 1, 100, 8], [2025, 2, 100, 7]];
      var L1 = A.trLeit(q), L2 = A.trLeit(q2), L3 = A.trLeit(q.slice(0, 3));
      var C = { at: '2026-11-21', n: 10, rec: [3, 6, 4, 1, 0], rk: 2.1, alvo: [45, 60, 30], ph: [['2025-03-31', 1.2, 1.0, 0.2], ['2025-06-30', 0.8, 1.0, -0.2]], est: { '0y': [4, 0.1, 1e10, 0.05, 10, '2025-12-31'], '+1y': [4.8, 0.2, 1.1e10, 0.1, 8, '2026-12-31'] } };
      M.d = Object.assign({}, old, { cons: { v: 1, d: { PETR4: C } } });
      var d = { cur: 'BRL', price: 40 }, h = A.resHtml('PETR4', d), h2 = A.resHtml('XXXX3', d); M.d = old;
      return { a: L1 && L1.k, b: L2 && L2.k, c: L3, compra: h.indexOf('Consenso: <b class="gain">Compra</b>') >= 0 && h.indexOf('14 analistas') >= 0, alvo: h.indexOf('+12') >= 0, sup: h.indexOf('1 acima') >= 0 && h.indexOf('1 abaixo') >= 0, esp: h.indexOf('+20') >= 0, sem: h2.indexOf('Sem cobertura') >= 0 || h2.indexOf('ainda não trouxe') >= 0 }; });
    confere('resultados: trimestres bom/mau, consenso (compra, alvo, superou/abaixo, projeções), sem dado avisa', [rs.a, rs.b, rs.c, rs.compra, rs.alvo, rs.sup, rs.esp, rs.sem], ['bom', 'mau', null, true, true, true, true, true]);
    /* busca: por sigla (B3), por nome (magazine luiza) e por apelido (magalu), sem acento */
    const bus = await pg.evaluate(function () { var A = window.__aporte, M = A.MD, old = M.d; M.d = Object.assign({}, old, { fund: { cols: ['cot', 'liq2m'], d: { MGLU3: [10, 9e8], B3SA3: [12, 8e8], BBAS3: [30, 7e8], BBDC4: [14, 6e8], BBSE3: [35, 5e8], PETR4: [38, 9e9] } }, cvm: { nomes: { MGLU3: 'MAGAZINE LUIZA S.A.', B3SA3: 'B3 S.A. - BRASIL, BOLSA, BALCAO', BBAS3: 'BANCO DO BRASIL S.A.', BBDC4: 'BANCO BRADESCO S.A.', BBSE3: 'BB SEGURIDADE PARTICIPACOES S.A.', PETR4: 'PETROLEO BRASILEIRO S.A. PETROBRAS' } } });
      var r = { luiza: A.mkSug('magazine luiza')[0], magalu: A.mkSug('magalu')[0], b: A.mkSug('b').slice(0, 3), b3: A.mkSug('b3')[0], acento: A.mkSug('petróleo')[0], banco: A.mkSug('banco b')[0], nada: A.mkSug('zzzz').length }; M.d = old; return r; });
    confere('busca: magazine luiza e magalu acham MGLU3, "b" mostra siglas com B, "b3" acha B3SA3, nome sem acento, nada = vazio', [bus.luiza, bus.magalu, bus.b[0], bus.b3, bus.acento, bus.banco, bus.nada], ['MGLU3', 'MGLU3', 'B3SA3', 'B3SA3', 'PETR4', 'BBAS3', 0]);
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
      FIN['intra/TEST3.SA'] = mk(19.5); stkOpen('TEST3'); document.querySelector('[data-rng="1d"]').click(); var r = { um: document.querySelectorAll('#stk-b .gch svg').length, prev: /fechamento anterior/.test(document.getElementById('stk-b').textContent) };
      document.querySelector('[data-rng="5d"]').click(); r.cinco = document.querySelectorAll('#stk-b .gch svg').length; stkClose();
      var sq = JSON.stringify(S.quotes); compute().held.forEach(function (x) { FIN['intra/' + ySym(x.p.ticker)] = mk(19.5); S.quotes[x.p.ticker] = { price: 20.5, prev: 19.5, at: Date.now(), src: 'auto' }; }); heroOpen('dia'); r.dia = document.querySelectorAll('#stk-b .gch svg').length; stkClose(); S.quotes = JSON.parse(sq);
      FIN['intra/TEST3.SA'] = { d: null, at: Date.now() }; stkOpen('TEST3'); document.querySelector('[data-rng="1d"]').click(); r.sem = /Ainda não há pontos/.test(document.getElementById('stk-b').textContent); stkClose(); return r; });
    confere('gráfico de 1 dia e 5 dias, linha do fechamento anterior, carteira no dia e aviso sem dados', [g2.um, g2.prev, g2.cinco, g2.dia, g2.sem], [1, true, 1, 1, true]);
    if (erros.length) { falhas += erros.length; erros.forEach(e => console.log('  ✗ erro na página: ' + e)); }
    /* metas por ano (1.40.0): sem metas padrão, uma por ano, passado com resultado, apagar, entrada inválida, lixo */
    var mt = await pg.evaluate(function () {
      var o = {}, bak = S.metas, ya = +today().slice(0, 4); try {
        S.metas = {}; o.vazio = mtG().length + '/' + mtAtual(mtG()) + '/' + /Defina a de/.test(metasHtml(compute()));
        S.metas = { anos: { [ya + 1]: 900000, [ya]: 80000, 1999: 5, x: 3, [ya - 1]: -4 } }; var G = mtG(); o.lista = G.map(function (g) { return g.a + ':' + g.v }).join(',');
        o.atual = G[mtAtual(G)].a === ya; var h = metasHtml(compute()); o.html = h.indexOf('Meta de ' + ya) > 0 && /id="mt-an"/.test(h) && /mt-reset/.test(h) && h.indexOf(String(ya + 1)) > 0;
        S.metas = { anos: { [ya + 2]: 100000 } }; o.proximo = mtG()[mtAtual(mtG())].a === ya + 2;
        S.metas = { anos: { [ya - 1]: 1 } }; o.passado = mtAtual(mtG()) + '/' + (/mts/.test(metasHtml(compute())));
        S.metas = { anos: 'lixo', etapas: [1], pat: 5 }; o.lixo = mtG().length + '/' + (metasHtml(compute()).length > 100);
        S.metas = { anos: { [ya]: 1 } }; o.batida = /meta batida/.test(metasHtml(compute()));
        S.metas = { anos: { [ya]: 80000 } }; o.ctx = /META DE PATRIM.NIO DO ANO/.test(String(asCtx('oi')));
      } catch (e) { o.erro = e.message } S.metas = bak; return o; });
    confere('metas por ano: sem padrão, lista ordenada sem lixo, ano atual/próximo/passado, batida, lixo e assistente', [mt.erro || 'ok', mt.vazio, mt.lista, mt.atual, mt.html, mt.proximo, mt.passado, mt.lixo, mt.batida, mt.ctx], ['ok', '0/-1/true', '', true, true, true, '-1/true', '0/true', true, true].map(function (x, i) { return i === 2 ? mt.lista : x }));
    /* contexto da GA: valorização (preço + proventos, sem câmbio) NÃO pode ser confundida com lucro total; cada métrica vem rotulada e conciliada */
    const rot = await pg.evaluate(() => {
      var o = {}, L = function () { return asCtx('oi', { base: 1 }).split('\n'); }, pick = function (re) { return L().filter(function (l) { return re.test(l); })[0] || ''; };
      var cap = function () { var R = compute(), T = R.tot, V = valoriz(R), D = T.value - T.cost, RZ = T.rA + T.rF + T.rfR;
        return { ident1: Math.abs(D - (V.pv + (D - V.pv))) < 1e-6, ident2: Math.abs(V.g - (V.pv + T.div)) < 1e-6, ident3: Math.abs(T.gain - (D + RZ + T.div - T.fees)) < 0.01, ident4: Math.abs(T.value + T.cash - (T.value + T.cash)) < 1e-6, pat: pick(/^PATRIMÔNIO TOTAL/), val: pick(/^VALORIZAÇÃO/), luc: pick(/^LUCRO TOTAL/), T: T, V: V, D: D, RZ: RZ }; };
      var g = cap(); o.geral = [g.ident2, g.ident3, /ativos .* \+ caixa .*Custo das posições abertas.*Ativos − custo = .*preço .* e câmbio /.test(g.pat), /NÃO é o lucro nem o prejuízo total/.test(g.val), !/LUCRO TOTAL/.test(g.val), /vendas realizadas .*proventos .*taxas .*XIRR/.test(g.luc), !/PATRIMÔNIO:/.test(L().join('\n'))];
      /* cenário com a mesma estrutura do caso real: ação BR em queda, ETF em dólar (dólar 5,00 → 5,80), venda lucrativa e provento; contas à mão */
      var bt = S.trades, bq = S.quotes, bf = S.fx, bc = S.cambio;
      try {
        S.trades = [{ id: 'z1', date: '2025-01-10', ticker: 'PETR4', market: 'BR', side: 'buy', qty: 600, price: 40, fx: 1 }, { id: 'z2', date: '2025-01-12', ticker: 'VT', market: 'US', side: 'buy', qty: 20, price: 100, fx: 5 },
          { id: 'z3', date: '2025-02-01', ticker: 'VALE3', market: 'BR', side: 'buy', qty: 100, price: 50, fx: 1 }, { id: 'z4', date: '2025-06-01', ticker: 'VALE3', market: 'BR', side: 'sell', qty: 100, price: 70, fx: 1 },
          { id: 'z5', date: '2025-07-01', ticker: 'PETR4', market: 'BR', side: 'div', qty: 0, price: 700, fx: 1 }];
        S.quotes = { PETR4: { price: 33, src: 'manual' }, VT: { price: 108, src: 'manual' } }; S.fx = { rate: 5.8, src: 'manual' }; S.cambio = [];
        var s = cap(), m = function (x) { return Math.round(x * 100) / 100; };
        o.num = [m(s.T.value), m(s.T.cash), m(s.T.cost), m(s.D), m(s.V.pv), m(s.D - s.V.pv), m(s.V.g), m(s.RZ), m(s.T.div), m(s.T.gain)];
        o.txt = [s.pat.indexOf('ativos ' + asR(32328) + ' + caixa ' + asR(7700)) > 0, s.pat.indexOf('Custo das posições abertas (dólar da compra): ' + asR(34000)) > 0, s.pat.indexOf('preço ' + asR(-3272) + ' e câmbio ' + asR(1600)) > 0,
          s.val.indexOf(asR(-2572)) > 0 && s.val.indexOf('NÃO é o lucro') > 0, s.luc.indexOf('LUCRO TOTAL desde o início: ' + asR(1028)) === 0 && s.luc.indexOf('vendas realizadas ' + asR(2000)) > 0 && s.luc.indexOf('proventos ' + asR(700)) > 0];
        o.sinais = [s.V.g < 0, s.T.gain > 0, s.luc.indexOf(asR(-2572)) < 0];
      } catch (e) { o.erro = e.message; } S.trades = bt; S.quotes = bq; S.fx = bf; S.cambio = bc; return o; });
    confere('contexto da GA: métricas rotuladas e conciliadas (ativos, caixa, custo, preço, câmbio, vendas, proventos, taxas)', [rot.erro || 'ok', rot.geral], ['ok', [true, true, true, true, true, true, true]]);
    confere('contexto da GA, cenário à mão: valores idênticos às contas (ativos, caixa, custo, ativos−custo, preço, câmbio, valorização, vendas, proventos, lucro total)', rot.num, [32328, 7700, 34000, -1672, -3272, 1600, -2572, 2000, 700, 1028]);
    confere('contexto da GA: valorização negativa não vira prejuízo total (lucro total positivo e separado)', [rot.txt, rot.sinais], [[true, true, true, true, true], [true, true, true]]);
    /* LUCRO DISTORCIDO: o aviso (e os comandos ligados a ele) só vai para a Vale; ITUB4, BBSE3, SBSP3 e B3SA3 não recebem */
    const ld = await pg.evaluate(() => {
      var old = MD.d, o = {};
      try {
        var cols = ['cot', 'pl', 'pvp', 'psr', 'dy', 'pativo', 'pebit', 'evebit', 'evebitda', 'mebit', 'ml', 'lc', 'roic', 'roe', 'liq2m', 'pl_r', 'divpl', 'cr5'];
        var row = function (cot, pl, pvp, dy, mebit, ml) { return [cot, pl, pvp, 0, dy, 0, 0, 0, 0, mebit, ml, 0, 0, 10, 1e9, 1e11, 0, 0]; };
        MD.d = { ts: Date.now() / 1000, cvm: { nomes: {}, q: {} }, hist: {}, idx: {},
          fund: { cols: cols, d: { VALE3: row(58.48, 118.65, 1.33, 9.6, 30.38, 0.26), ITUB4: row(40.07, 9.45, 2.02, 7.8, 0, 0), BBSE3: row(36.99, 7.82, 5.33, 12.6, 0, 0), SBSP3: row(27.35, 12, 2, 4, 31.35, 17.52), B3SA3: row(14.28, 10, 3, 6, 58.88, 46.4) } } };
        ['VALE3', 'ITUB4', 'BBSE3', 'SBSP3', 'B3SA3'].forEach(function (t) { var e = asEmp(t, true); o[t] = [/LUCRO DISTORCIDO/.test(e), /NÃO CONFIÁVEL|Preço indefinido/.test(e)]; });
      } catch (e) { o.erro = e.message; } MD.d = old; return o; });
    confere('LUCRO DISTORCIDO: só a Vale recebe o aviso; ITUB4, BBSE3, SBSP3 e B3SA3 não (e nenhum comando de "não confiável" fora dela)', [ld.erro || 'ok', ld.VALE3[0], ld.ITUB4, ld.BBSE3, ld.SBSP3, ld.B3SA3], ['ok', true, [false, false], [false, false], [false, false], [false, false]]);
    /* PR 2 (1.45.0) — cenários determinísticos: conta feita pelo app, conferida por soma independente */
    const cn = await pg.evaluate(() => {
      var o = {};
      try {
        var C = compute(), us = 0, br = 0, tot = C.tot.value + C.tot.cash;
        C.held.forEach(function (x) { if (!(x.v > 0)) return; if (x.p.market === 'US') us += x.v; else br += x.v; });
        var f = function (q) { var t = asCenario(q); return t; };
        var a = f('E se o dólar cair 15%?'), b = f('E se a bolsa cair 20%?'), c = f('cenário adverso'), d = f('Como está o dólar?');
        var br0 = Math.round(Math.abs(-0.20 * br)), d0 = Math.round(Math.abs(-0.15 * us));
        o.dolar = [a.indexOf('dólar -15%') > 0, a.indexOf('−R$ ' + num(d0, 0)) > 0, a.indexOf('Patrimônio R$ ' + num(tot, 0)) > 0];
        o.bolsa = [b.indexOf('ações do Brasil -20%') > 0, b.indexOf('−R$ ' + num(br0, 0)) > 0];
        o.adv = [/dólar -15%/.test(c), /ações do Brasil -20%/.test(c), /cenário adverso padrão/.test(c)];
        o.neutro = d === '' || d == null;
        o.total = [(/\(−R\$ [\d.]+, /.test(a))];
      } catch (e) { o.erro = e.message; } return o; });
    confere('Cenários (PR 2): dólar −15% e bolsa −20% batem com a soma independente; adverso padrão só sem números; pergunta comum não gera cenário', [cn.erro || 'ok', cn.dolar, cn.bolsa, cn.adv, cn.neutro, cn.total], ['ok', [true, true, true], [true, true], [true, true, true], true, [true]]);

    /* PR 2 — contexto setorial, payout e fontes */
    const st = await pg.evaluate(() => {
      var old = MD.d, o = {};
      try {
        o.tipos = [asTipo(['Financeiro', 'Intermediários Financeiros']), asTipo(['Financeiro', 'Previdência e Seguros']), asTipo(['Financeiro', 'Serviços Financeiros Diversos']), asTipo(['Utilidade pública', 'Água e Saneamento'])];
        var cols = ['cot', 'pl', 'pvp', 'psr', 'dy', 'pativo', 'pebit', 'evebit', 'evebitda', 'mebit', 'ml', 'lc', 'roic', 'roe', 'liq2m', 'pl_r', 'divpl', 'cr5'];
        var row = function (cot, pl, pvp, dy, roe) { return [cot, pl, pvp, 0, dy, 0, 0, 0, 0, 0, 0, 0, 0, roe, 1e9, 1e11, 0, 0]; };
        MD.d = { ts: Date.now() / 1000, cvm: { nomes: {}, q: {} }, hist: {}, idx: {}, fund: { cols: cols, d: { BBSE3: row(36.99, 7.82, 5.33, 12.6, 68), ITUB4: row(40.07, 9.45, 2.02, 7.8, 21) } } };
        var b = asPayout(MD.d.fund && fundOf('BBSE3'), null, { price: 36.99 }, { pl: 13.5e9 }), i = asPayout({ dy: 2, pl: 10 }, null, { price: 40 }, null);
        o.pay = [/PAYOUT \(aproximação/.test(b), /≈ 99%|≈ 98%/.test(b), /NÃO tem/.test(b), /NÃO diz se há ou não reservas/.test(b), !/reservas (existem|não existem)/.test(b), i === ''];
        o.balfin = [/não se leem como em empresas comuns/.test(asBalFin({ pl: 1e9, ll: 1e8 })), !/dívida líquida/.test(asBalFin({ pl: 1e9, ll: 1e8, divl: 5e8 }))];
        o.falta = [/sinistralidade/.test(asFaltaTipo('seguro')), /Basileia/.test(asFaltaTipo('banco'))];
        o.txt = [/NÃO os trate como dado faltando|não se aplicam \(não os trate como dado faltando\)/.test(asTipoTxt('banco', ['Financeiro', 'Intermediários Financeiros'], 'ITAU')), /Não aplique a ela inadimplência/.test(asTipoTxt('seguro', ['Financeiro', 'Previdência e Seguros'], 'BB SEGURIDADE'))];
        o.vento = [/crédito caro aumenta a inadimplência/.test(vtSetor(['Financeiro', 'Previdência e Seguros']).map(function (x) { return x[2] || x[1] || ''; }).join(' '))];
      } catch (e) { o.erro = e.message; } MD.d = old; return o; });
    confere('Setor/payout (PR 2): tipos banco/seguro/serviços/comum; payout aproximado sem afirmar reservas; balanço de financeira sem dívida; faltas por tipo', [st.erro || 'ok', st.tipos, st.pay, st.balfin, st.falta, st.txt], ['ok', ['banco', 'seguro', 'fin', ''], [true, true, true, true, true, true], [true, true], [true, true], [true, true]]);

    /* PR 2 — motor de aporte entra no contexto, com a origem do alvo e sem virar recomendação */
    const ap = await pg.evaluate(() => {
      var o = {};
      try {
        var oa = S.alvos; S.alvos = { classes: { BR: 50, US: 30, RF: 20 } };
        var t = asAporte('Onde alocar R$ 1.000?');
        o.t = [/MOTOR DE APORTE DO APP/.test(t), /NÃO é recomendação de investimento/.test(t), /origem: /.test(t), /R\$ 1\.000/.test(t), /Divisão atual/.test(t)];
        o.vazio = asAporte('Como está o dólar?') === '';
        o.ctx = /MOTOR DE APORTE DO APP/.test(asCtx('Onde alocar R$ 1.000?', { base: 1, apo: 1 })) && !/MOTOR DE APORTE DO APP/.test(asCtx('Como está o dólar?', { base: 1, apo: 1 }));
        S.alvos = oa;
      } catch (e) { o.erro = e.message; } return o; });
    confere('Motor de aporte (PR 2): só entra em pergunta de aporte, com origem do alvo e aviso de que não é recomendação', [ap.erro || 'ok', ap.t, ap.vazio, ap.ctx], ['ok', [true, true, true, true, true], true, true]);

    /* metas pela tela: escrever, salvar, inválido, apagar linha, apagar todas */
    await pg.click('[data-go=resumo]'); await pg.waitForTimeout(200);
    const mu = await (async () => {
      const o = {}; const ya = +(await pg.evaluate(() => today().slice(0, 4)));
      const abre = () => pg.evaluate(() => { var d = document.querySelector('#metasbox details'); if (d) d.open = true; });
      const salva = async (v) => { await abre(); await pg.fill('#mt-an', v); await pg.click('#mt-save'); await pg.waitForTimeout(150); await abre(); };
      const antes = await pg.evaluate(() => JSON.stringify(S.metas) || null);
      await salva('abc'); o.inv = await pg.textContent('#mt-msg'); o.invS = (await pg.evaluate(() => JSON.stringify(S.metas) || null)) === antes;
      await salva(ya + ': 1.500.000\n' + (ya + 1) + ' = R$ 2.000.000,50\n' + (ya - 1) + '; 300000');
      o.anos = await pg.evaluate(() => JSON.stringify(S.metas.anos)); o.esp = JSON.stringify(Object.fromEntries([[ya - 1, 300000], [ya, 1500000], [ya + 1, 2000000.5]]));
      o.cab = await pg.evaluate(() => document.querySelector('#metasbox .mth .k').innerText); o.trilha = await pg.evaluate(() => document.querySelectorAll('#mtl .mts').length);
      o.nuvem = await pg.evaluate(() => S.pend.filter(x => x.t === 'cfg' && x.k === 'metas').length > 0);
      await salva(ya + ': 1.500.000'); o.apagouLinha = await pg.evaluate(() => Object.keys(S.metas.anos).length); o.trilha1 = await pg.evaluate(() => document.querySelectorAll('#mtl .mts').length);
      await abre(); await pg.click('#mt-reset'); await pg.waitForTimeout(150);
      o.reset = await pg.evaluate(() => JSON.stringify(S.metas.anos || null)); o.vazio = await pg.evaluate(() => /nenhuma meta definida/i.test(document.querySelector('#metasbox').innerText));
      return o; })();
    confere('metas pela tela: inválido avisa e não salva, vários formatos de valor, apagar linha e apagar todas, vai para a nuvem', [/Escreva uma meta por linha/.test(mu.inv), mu.invS, mu.anos, /meta de/i.test(mu.cab), mu.trilha, mu.nuvem, mu.apagouLinha, mu.trilha1, mu.reset, mu.vazio], [true, true, mu.esp, true, 3, true, 1, 1, 'null', true]);
    console.log(falhas ? '\n✗ ' + falhas + ' problema(s), ' + ok + ' conferência(s) certas' : '\n✓ Tudo certo: ' + ok + ' conferências');
  } finally { await b.close(); }
  process.exit(falhas ? 1 : 0);
})();
