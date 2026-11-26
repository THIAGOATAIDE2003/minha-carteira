/* Abre o app com os dados reais da pasta privada (carteira, mercado, CVM) congelados em 23/11/2026, só no navegador de teste. Uso: const pg = await abrirReal(browser, dadosDir, {width,height,tema}) */
const fs = require('fs'), path = require('path');
const rd = f => JSON.parse(fs.readFileSync(f, 'utf8'));
async function abrirReal(b, DADOS, vp, tema) {
  const mercado = rd(path.join(DADOS, 'mercado.json')), cart = rd(path.join(DADOS, 'carteira.json')), cvm = {};
  fs.readdirSync(path.join(DADOS, 'dados', 'cvm')).forEach(f => { if (/\.json$/.test(f)) cvm[f.replace(/\.json$/, '')] = rd(path.join(DADOS, 'dados', 'cvm', f)); });
  const estado = Object.assign({}, cart); delete estado.versao; delete estado.atualizadoEm; estado.keys = { finnhub: '', brapi: '', gh: '', repo: '' }; estado.pend = [];
  
  const ctx = await b.newContext({ viewport: vp }), pg = await ctx.newPage(); pg.__erros = [];
  pg.on('pageerror', e => pg.__erros.push(e.message));
  await pg.clock.setFixedTime(new Date('2026-11-23T15:00:00-03:00'));
  await pg.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  await pg.addInitScript(([o, t]) => { window.__APORTE_TESTE__ = true; if (!sessionStorage.getItem('ok')) { localStorage.clear(); localStorage.setItem('minha-carteira-v1', o); sessionStorage.setItem('ok', '1'); } }, [JSON.stringify(estado), tema || '']);
  await pg.goto('file://' + path.resolve(process.env.APORTE_APP_DIR || path.resolve(__dirname, '..'), 'index.html')); await pg.waitForFunction(() => window.__aporte, null, { timeout: 15000 }); await pg.waitForTimeout(400);
  await pg.evaluate(({ mercado, cvm }) => { MD.d = mercado; Object.keys(mercado.fund.d).forEach(tk => { FIN['cvm/' + tk] = { d: cvm[tk] || null, at: Date.now() }; }); FOTOQ = true; }, { mercado, cvm });
  if (tema && tema !== 'atual') await pg.evaluate(t => setTema(t), tema);
  return pg;
}
module.exports = { abrirReal };
