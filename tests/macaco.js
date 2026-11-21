/* Macaco: clica/digita aleatoriamente (semente fixa) em tudo que é clicável, em várias rodadas; falha em erro de JS ou CSP.
   Uso: node tests/macaco.js [rodadas] [semente] */
const { chromium } = require('playwright'); const path = require('path'), APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
const RODADAS = +process.argv[2] || 6, SEED0 = +process.argv[3] || 7;
(async () => {
  const b = await chromium.launch(); const er = []; let cliques = 0;
  for (let r = 0; r < RODADAS; r++) {
    const p = await b.newPage({ viewport: { width: 400, height: 860 } }); let seed = SEED0 + r * 101; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    p.on('pageerror', e => er.push('r' + r + ' ' + e.message + ' @ ' + String(e.stack || '').split('\n')[1]));
    p.on('console', m => { if (/Content Security/i.test(m.text())) er.push('CSP ' + m.text().slice(0, 100)); });
    p.on('dialog', d => d.dismiss().catch(() => {}));
    await p.route('**/*', q => q.request().url().startsWith('file:') ? q.continue() : q.abort());
    await p.addInitScript(() => { window.__APORTE_TESTE__ = true; window.open = () => null; });
    await p.goto(APP); await p.waitForTimeout(400);
    for (let i = 0; i < 140; i++) {
      if (p.isClosed()) { er.push('r' + r + ' página fechou/travou no clique ' + i); break; }
      let els; try { els = await p.$$('button, [data-stk], [data-sub], [data-sub2], [data-mkv], [data-anv], [data-stv], [data-th], [data-hero], [data-goto], .cchips > *, .stseg > *, summary, [role=button], a[href^="#"], input, select, textarea'); } catch (e) { er.push('r' + r + ' página caiu no clique ' + i + ': ' + e.message.slice(0, 80)); break; }
      if (!els.length) break; const el = els[Math.floor(rnd() * els.length)]; cliques++;
      try { const tag = await el.evaluate(e => e.tagName); const vis = await el.isVisible();
        if (!vis) { await p.keyboard.press('Escape').catch(() => {}); continue; }
        if (tag === 'INPUT' || tag === 'TEXTAREA') await el.fill(['', '0', '-5', '1e9', '<b>x</b>', 'ÁÉ ç', '9'.repeat(30), 'abc'][Math.floor(rnd() * 8)], { timeout: 800 });
        else if (tag === 'SELECT') { const o = await el.$$eval('option', os => os.map(x => x.value)); if (o.length) await el.selectOption(o[Math.floor(rnd() * o.length)], { timeout: 800 }); }
        else await el.click({ timeout: 800, noWaitAfter: true });
      } catch (e) { /* elemento sumiu/coberto: normal */ }
      if (i % 25 === 24) await p.keyboard.press('Escape').catch(() => {});
    }
    await p.close().catch(() => {});
  }
  const u = Array.from(new Set(er)); console.log('cliques:', cliques); console.log(u.length ? u.join('\n') : '✓ Macaco: nenhum erro'); await b.close(); if (u.length) process.exit(1);
})();
