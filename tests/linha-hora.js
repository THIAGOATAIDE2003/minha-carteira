/* Linha de hora do cabeçalho (gHead): o ⓘ nunca fica sozinho numa linha. Larguras de 200 a 360 px (de 1 em 1), fonte 100% e 130%, quatro textos de hora.
   Uso: node tests/linha-hora.js   (APORTE_APP_DIR=<pasta> para testar outra cópia do app) */
const path = require('path'), { chromium } = require('playwright');
const RAIZ = process.env.APORTE_APP_DIR || path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 360, height: 740 }, timezoneId: 'America/Sao_Paulo' }), p = await ctx.newPage(), erros = [];
  p.on('pageerror', e => erros.push(e.message)); await ctx.route(u => !/^(file|data):/.test(u.toString()), r => r.abort());
  await p.addInitScript(() => { window.__APORTE_TESTE__ = true; });
  await p.goto('file://' + path.join(RAIZ, 'index.html')); await p.waitForFunction(() => window.__aporte); await p.waitForTimeout(700);
  const whens = ['27/11, 11:25 · atualizado há 5 min · Yahoo', 'Atrasado (2 h) · preço das 09:25 · Yahoo', 'Atrasado: preço de 26/11, 17:55 · Finnhub', 'Fechamento de 26/11, 17:55 · Brapi'];
  let ruins = [], n = 0;
  for (const k of [1, 1.3]) for (const w of whens) for (let wd = 200; wd <= 360; wd++) {
    const r = await p.evaluate(([w, k, wd]) => {
      $('stk').hidden = false; setHtml($('stk-b'), '<div class="gcard">' + gHead('Empresa ALFA3', '', 'R$ 17,82', 1.28, 7.74, '1d', '', w, bal('t', null, 'De onde vem este preço')) + '</div>'); $('stk-b').style.width = wd + 'px';
      var els = [].slice.call(document.querySelectorAll('#stk-b *')), f = els.map(function (e) { return parseFloat(getComputedStyle(e).fontSize); }); els.forEach(function (e, i) { e.style.fontSize = (f[i] * k) + 'px'; });
      var q = document.querySelector('#stk-b .gwh'), bl = q.querySelector('.bal'), rb = bl.getBoundingClientRect(), last = null, nd, tw = document.createTreeWalker(q, NodeFilter.SHOW_TEXT);
      while ((nd = tw.nextNode())) { if (nd.nodeValue.trim()) last = nd; }
      var rg = document.createRange(); rg.setStart(last, Math.max(0, last.nodeValue.trim().lastIndexOf(' ') + 1)); rg.setEnd(last, last.nodeValue.length); var rw = rg.getBoundingClientRect();
      return Math.round(rb.top + rb.height / 2) - Math.round(rw.top + rw.height / 2);
    }, [w, k, wd]); n++; if (r > 14) ruins.push([k, wd, w, r]);
  }
  await b.close();
  if (erros.length) { console.log('✗ erro de JavaScript:', erros[0]); process.exit(1); }
  console.log(ruins.length ? '✗ ⓘ sozinho na linha em ' + ruins.length + ' de ' + n + ' casos, ex.: ' + JSON.stringify(ruins[0]) : '✓ Linha de hora: ⓘ sempre junto da última palavra (' + n + ' casos, 200–360 px, fonte 100% e 130%)');
  process.exit(ruins.length ? 1 : 0);
})();
