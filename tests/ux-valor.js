/* Testes da 1.86.1 (só texto): cartão "Patrimônio total" do Início (palavra "ativos" no %, blocos "Ativos" e "Saldo parado" só com saldo parado,
   "Custo dos ativos" no lugar de "Valor investido"), ⓘ e notas novos. Nenhum número muda.
   Uso: node tests/ux-valor.js    node tests/ux-valor.js --mutantes    node tests/ux-valor.js --dump saida.json (números e HTML do Início, p/ comparar versões; APORTE_APP_DIR=pasta)
   Tudo sintético (ITUB4, VT, CDB inventados); nenhum dado real. */
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { chromium } = require('playwright');
const RAIZ = process.env.APORTE_APP_DIR || path.resolve(__dirname, '..'), APP = 'file://' + path.join(RAIZ, 'index.html');
const arg = process.argv, val = k => arg.includes(k) ? arg[arg.indexOf(k) + 1] : null, DUMP = val('--dump');
let falhas = 0, total = 0;
const ok = (n, c, x) => { total++; if (!c) { falhas++; console.log('✗', n, x === undefined ? '' : JSON.stringify(x).slice(0, 600)); } };
const NOW = '2026-06-15T12:00:00-03:00';
const BASE = [
  { id: 't1', date: '2025-01-10', ticker: 'ITUB4', market: 'BR', side: 'buy', qty: 100, price: 30, fx: 1, taxa: 0 },
  { id: 't3', date: '2025-01-20', ticker: 'VT', market: 'US', side: 'buy', qty: 10, price: 100, fx: 5.0 },
  { id: 'r1', date: '2025-03-01', ticker: 'CDB Banco X', market: 'RF', side: 'rf', qty: 1, price: 1000, pct: 100, isento: false, venc: '2027-03-01' }];
const COM = BASE.concat([{ id: 't7', date: '2025-05-12', ticker: 'ITUB4', market: 'BR', side: 'sell', qty: 40, price: 36, fx: 1, taxa: 0 }]);
async function abrir(b, trades, tema, zoom) {
  const pg = await b.newPage({ viewport: { width: 360, height: 780 } }), erros = []; pg.__erros = erros;
  pg.on('pageerror', e => erros.push(e.message));
  await pg.clock.setFixedTime(new Date(NOW));
  await pg.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  const ls = { 'minha-carteira-v1': JSON.stringify({ keys: { finnhub: '', brapi: '', gh: '', repo: '' }, pend: [], fx: { rate: 5.8, src: 'manual' }, quotes: { ITUB4: { price: 35, src: 'manual' }, VT: { price: 120, src: 'manual' } }, trades }) };
  if (tema) ls['minha-carteira-v1-tema'] = tema;
  await pg.addInitScript(o => { window.__APORTE_TESTE__ = true; if (!sessionStorage.getItem('ok')) { localStorage.clear(); for (const k in o) localStorage.setItem(k, o[k]); sessionStorage.setItem('ok', '1'); } }, ls);
  await pg.goto(APP); await pg.waitForFunction(() => window.__aporte, null, { timeout: 15000 }); await pg.waitForTimeout(700);
  if (zoom) await pg.evaluate(z => { document.documentElement.style.zoom = z; }, zoom);
  return pg;
}
const CARD = () => { const c = document.querySelector('[data-hero="inv"]'), k = c && c.closest('.hcard,.hc,section,article,div[class*="hc"]'); return k; };
const lerInicio = pg => pg.evaluate(() => {
  const T = compute().tot, tab = document.querySelector('[data-tab="resumo"]'), h = tab.innerHTML;
  const hs = tab.querySelector('[data-hero="inv"]').parentElement; /* linha de baixo (.hcs) */
  const card = hs.closest('.hc') || hs.parentElement;
  const R = compute(); let ctp = 0, vtp = 0; R.held.forEach(x => { if (x.p.market === 'US') { ctp += x.p.cN * R.tot.fxNow; vtp += x.p.qty * x.P1 * R.tot.fxNow } else { ctp += x.p.cB; vtp += x.v } }); ctp += R.tot.rfC; vtp += R.tot.rfV;
  return { html: h, hcs: hs.textContent.replace(/\s+/g, ' ').trim(), hcm: hs.parentElement.querySelector('.hcm').textContent.replace(/\s+/g, ' ').trim(), value: T.value, cash: T.cash, vtp, ctp,
    brl: [brl.format(T.value), brl.format(T.cash), brl.format(T.value + T.cash), brl.format(ctp)].map(x => x.replace(/\s+/g, ' ')), pct: ctp ? pct((vtp - ctp) / ctp) : '', compute: JSON.stringify(compute()).length,
    blocos: [...hs.children].map(e => e.tagName + ':' + (e.querySelector('small') ? e.querySelector('small').textContent : e.textContent)),
    ovf: [card.scrollWidth - card.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth],
    recorte: [...hs.querySelectorAll('small,.num,.evolink')].some(e => { const r = e.getBoundingClientRect(), c = card.getBoundingClientRect(); return r.right > c.right + 0.5 || r.left < c.left - 0.5; }) };
});
if (arg.includes('--mutantes')) {
  const M = [['volta "Valor investido" no Início', 'js/inicio.js', '<small>Custo dos ativos ›</small>', '<small>Valor investido ›</small>'],
    ['mostra blocos com saldo 0', 'js/inicio.js', "(T.cash>0.005?'<div><small>Ativos</small>", "(true?'<div><small>Ativos</small>"],
    ['usa vtp em vez de T.value', 'js/inicio.js', "brl.format(T.value)+'</span></div><div><small>Saldo", "brl.format(vtp+1)+'</span></div><div><small>Saldo"],
    ['tira "ativos" do chip', 'js/inicio.js', "(T.cash>0.005?'<span class=\"hcq\">ativos</span> ':'')", "''"],
    ['troca o data-hero', 'js/inicio.js', '<div class="hcl" data-hero="inv" role="button" tabindex="0"><small>Custo', '<div class="hcl" data-hero="invx" role="button" tabindex="0"><small>Custo'],
    ['"ativos" também sem saldo', 'js/inicio.js', "(T.cash>0.005?'<span class=\"hcq\">ativos</span> '", "(true?'<span class=\"hcq\">ativos</span> '"],
    ['Carteira perde o texto novo', 'js/carteira.js', 'conta o VT pelo dólar de hoje, por isso', 'conta por isso']];
  let vivos = 0;
  for (const [n, f, a, c] of M) {
    const d = '/tmp/mut-uv'; cp.execSync('rm -rf ' + d + ' && mkdir -p ' + d + ' && cp -r ' + RAIZ + '/. ' + d + '/ && rm -rf ' + d + '/.git ' + d + '/node_modules');
    const t = fs.readFileSync(d + '/' + f, 'utf8'); if (!t.includes(a)) { console.log('? mutante sem alvo:', n); vivos++; continue; }
    fs.writeFileSync(d + '/' + f, t.replace(a, c));
    let morto = false; try { cp.execSync('APORTE_APP_DIR=' + d + ' node ' + __filename, { encoding: 'utf8', cwd: RAIZ, stdio: 'pipe' }); } catch (e) { morto = true; }
     console.log(morto ? '✓ pego:' : '✗ VIVO:', n); if (!morto) vivos++;
  }
  console.log(vivos ? '✗ ' + vivos + ' mutante(s) vivo(s)' : '✓ todos os mutantes pegos'); process.exit(vivos ? 1 : 0);
}
(async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  if (DUMP) {
    const o = {};
    for (const [n, tr] of [['com', COM], ['sem', BASE]]) {
      const pg = await abrir(b, tr); o[n] = await lerInicio(pg);
      
      o[n + '-carteira'] = await pg.evaluate(() => [...document.querySelectorAll('[data-tab="ativos"]')].map(e => e.textContent).join(' ').replace(/\s+/g, ' '));
      await pg.close();
    }
    fs.writeFileSync(DUMP, JSON.stringify(o, null, 1)); console.log('gravado', DUMP); await b.close(); return;
  }
  /* U1: com saldo parado */
  const pc = await abrir(b, COM), c = await lerInicio(pc);
  ok('U0 há saldo parado no cenário', c.cash > 0.005, c.cash);
  ok('U1 chip com a palavra "ativos" antes do %', /ativos\s*[−+-]?\d/.test(c.hcm) && /class="hcq">ativos<\/span>/.test(c.html), c.hcm);
  ok('U2 blocos Ativos e Saldo parado, antes do Custo dos ativos', c.blocos.slice(0, 4).join('|') === 'DIV:Ativos|DIV:Saldo parado|DIV:Custo dos ativos ›|BUTTON:Ver evolução', c.blocos);
  ok('U3 Ativos = T.value e Saldo parado = T.cash (formato R$)', c.hcs.includes(c.brl[0]) && c.hcs.includes(c.brl[1]), [c.hcs, c.brl]);
  ok('U4 número grande = T.value + T.cash', c.hcm.includes(c.brl[2]), [c.hcm, c.brl[2]]);
  ok('U5 T.value igual ao vtp usado no %', Math.abs(c.value - c.vtp) < 0.005, [c.value, c.vtp]);
  ok('U6 % do chip é o de sempre (vtp-ctp)/ctp', c.hcm.includes(c.pct), [c.hcm, c.pct]);
  ok('U7 Início sem "Valor investido", com "Custo dos ativos" e data-hero="inv"', !/Valor investido/.test(c.html) && /Custo dos ativos ›/.test(c.html) && /data-hero="inv"/.test(c.html));
  ok('U8 blocos novos não são clicáveis', !/data-hero="(ativos|cash)"/.test(c.html) && c.blocos.length === 4);
  ok('U9 textos novos dos ⓘ e sem palavras proibidas', /os ativos mais o saldo parado/.test(c.html) && /As vendas que você já fez entram nesta conta/.test(c.html) && !/denominador|numerador|\bbase\b|XIRR/i.test(c.html.replace(/<[^>]+>/g, ' ').replace(/Base de|base/g, m => m === 'base' ? 'base' : m)) , 1);
  /* tela do gráfico "Custo dos ativos" */
  await pc.click('[data-hero="inv"]'); await pc.waitForTimeout(400);
  const g = await pc.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  ok('U10 gráfico abre com título e nota novos', /Custo dos ativos/.test(g) && /O que você já vendeu não entra/.test(g) && /Quanto você investiu/.test(g), g.slice(0, 200));
  await pc.close();
  /* U11: Carteira → Valor investido com texto novo */
  const pk = await abrir(b, COM); await pk.evaluate(() => { showTab('ativos'); render(); }); await pk.waitForTimeout(300);
  const ct = await pk.evaluate(() => [...document.querySelectorAll('[data-tab="ativos"]')].map(e => e.textContent).join(' ').replace(/\s+/g, ' '));
  ok('U11 Carteira mantém "Valor investido" e explica a diferença', /Valor investido/.test(ct) && /no Início, "Custo dos ativos" conta o VT pelo dólar de hoje/.test(ct), ct.length);
  ok('U11b sem erros de JS', pk.__erros.length === 0 && pc.__erros.length === 0, [pk.__erros, pc.__erros]); await pk.close();
  /* U12: sem saldo parado: a linha nova NÃO aparece */
  const ps = await abrir(b, BASE), s = await lerInicio(ps);
  ok('U12 saldo zero: sem "ativos" no chip, sem blocos Ativos/Saldo parado', s.cash <= 0.005 && !/hcq/.test(s.html) && s.blocos.join('|') === 'DIV:Custo dos ativos ›|BUTTON:Ver evolução', [s.cash, s.blocos]);
  ok('U13 saldo zero: número grande = T.value', s.hcm.includes(s.brl[2]) && s.hcm.includes(s.pct), s.hcm); await ps.close();
  /* U14: 360 px, 130% (zoom 1,3 = pior caso, 277 px de largura útil) e 3 temas, com saldo parado */
  for (const tema of ['', 'branco', 'preto']) for (const z of [0, 1.3]) {
    const p = await abrir(b, COM, tema, z), r = await lerInicio(p);
    ok('U14 nada passa da largura nem corta (' + (tema || 'azul') + ', zoom '  + (z || 1) + ')', r.ovf[0] <= 0 && (z || r.ovf[1] <= 0) && !r.recorte, [r.ovf, r.recorte]);
    if (!z && !tema) await p.screenshot({ path: '/tmp/p1/ux-valor-360.png' }); if (z && tema === 'preto') await p.screenshot({ path: '/tmp/p1/ux-valor-130-preto.png' }); await p.close();
  }
  console.log(falhas ? '✗ ux-valor: ' + falhas + ' falha(s) de ' + total : '✓ Tudo certo: ' + total + ' conferências'); await b.close(); process.exit(falhas ? 1 : 0);
})();
