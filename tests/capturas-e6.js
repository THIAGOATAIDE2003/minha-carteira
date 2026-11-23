/* Gera PNGs do cartão da E6 (linha fechada e aberta) a 360 px, fonte 100% e 130%, temas Branco e Cinza. Uso: node tests/capturas-e6.js <pasta-dados> <pasta-saida> */
const { chromium } = require('playwright'); const { abrirReal } = require('./lib-real.js'); const fs = require('fs'), path = require('path');
const DADOS = process.argv[2], OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const lista = [];
  for (const [tema, nome] of [['branco', 'branco'], ['preto', 'cinza']]) for (const k of [1, 1.3]) for (const est of ['fechada', 'aberta']) {
    const pg = await abrirReal(b, DADOS, { width: 360, height: 900 }, tema);
    await pg.evaluate(() => { showTab('mercado'); MKV = 'ana'; ANV = 'opp'; OPV = 'gar'; OPC = { k: '' }; renderMkt(); });
    await pg.evaluate(([k, abrir]) => {
      var D = opData(), base = D.D.filter(function (o) { return o.tk === 'TGMA3'; })[0], ver = D.X.filter(function (o) { return o.tk === 'PINE4'; })[0];
      var trap = Object.assign({}, base); trap.fx = Object.assign({}, base.fx, { trap: 'lucro', espPct: -0.18 });
      var h = document.createElement('div'); h.id = '__h'; h.className = 'panel'; h.style.cssText = 'margin:0;padding:0 16px;width:328px;box-sizing:border-box';
      document.body.insertBefore(h, document.body.firstChild);
      setHtml(h, [['normal', base, 0], ['armadilha', trap, 0], ['verificacao', ver, 1]].map(function (c) { return '<div id="c-' + c[0] + '">' + opCartao(c[1], 1, c[2]) + '</div>'; }).join(''));
      if (k !== 1) { var els = [].slice.call(h.querySelectorAll('*')), f0 = els.map(function (e) { return parseFloat(getComputedStyle(e).fontSize); }); els.forEach(function (e, i) { e.style.fontSize = (f0[i] * k) + 'px'; }); }
      if (abrir) [].forEach.call(h.querySelectorAll('[data-opx]'), function (e) { e.click(); });
    }, [k, est === 'aberta']);
    await pg.evaluate(() => { [].forEach.call(document.querySelectorAll('body *'), function (e) { if (!e.closest('#__h') && getComputedStyle(e).position === 'fixed') e.style.display = 'none'; }); [].forEach.call(document.body.children, function (e) { if (e.id !== '__h' && !/SCRIPT/.test(e.tagName)) e.style.display = 'none'; }); document.body.style.padding = '16px 0'; });
    await pg.waitForTimeout(150);
    for (const caso of ['normal', 'armadilha', 'verificacao']) {
      const f = `${nome}-fonte${Math.round(k * 100)}-${caso}-${est}.png`; await (await pg.$('#c-' + caso)).screenshot({ path: path.join(OUT, f) }); lista.push(f);
    }
    if (pg.__erros.length) console.log('ERROS', pg.__erros);
    await pg.context().close();
  }
  console.log(lista.length + ' capturas'); await b.close();
})();
