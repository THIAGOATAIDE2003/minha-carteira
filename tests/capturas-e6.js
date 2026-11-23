/* Gera PNGs do cartão da E6 (linha fechada e aberta) a 360 px, fonte 100% e 130%, temas Branco e Cinza. Uso: node tests/capturas-e6.js <pasta-dados> <pasta-saida> */
const { chromium } = require('playwright'); const { abrirReal } = require('./lib-real.js'); const fs = require('fs'), path = require('path');
const DADOS = process.argv[2], OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const lista = [];
  for (const [tema, nome] of [['branco', 'branco'], ['preto', 'cinza']]) for (const k of [1, 1.3]) for (const est of ['fechada', 'aberta']) {
    const pg = await abrirReal(b, DADOS, { width: 360, height: 900 }, tema);
    await pg.evaluate(() => { showTab('mercado'); MKV = 'ana'; ANV = 'opp'; OPV = 'gar'; OPC = { k: '' }; renderMkt(); });
    await pg.evaluate(([k, abrir]) => {
      var D = opData(), base = D.D.filter(function (o) { return o.tk === 'TGMA3'; })[0], petr = D.D.filter(function (o) { return o.tk === 'PETR4'; })[0];
      var abaixo = Object.assign({}, base, { d: Object.assign({}, base.d, { price: base.fx.cons * 0.88 }), fx: Object.assign({}, base.fx, { est: 'abaixo', ms: 0.12 }) });
      var acima = Object.assign({}, base, { d: Object.assign({}, base.d, { price: base.fx.oti * 1.12 }), fx: Object.assign({}, base.fx, { est: 'acima', ms: -1.2 }) });
      var baixa = Object.assign({}, base, { cf: { n: 'Baixa', w: ['preço velho (de 09/11)'], f: 0.5 } });
      var h = document.createElement('div'); h.id = '__h'; h.className = 'panel'; h.style.cssText = 'margin:0;padding:0 16px;width:328px;box-sizing:border-box';
      document.body.insertBefore(h, document.body.firstChild);
      setHtml(h, [['abaixo', abaixo], ['acima', acima], ['confianca-baixa', baixa], ['normal-com-alerta', petr]].map(function (c) { return '<div id="c-' + c[0] + '">' + opCartao(c[1], 1, 0) + '</div>'; }).join(''));
      if (k !== 1) { var els = [].slice.call(h.querySelectorAll('*')), f0 = els.map(function (e) { return parseFloat(getComputedStyle(e).fontSize); }); els.forEach(function (e, i) { e.style.fontSize = (f0[i] * k) + 'px'; }); }
      if (abrir) [].forEach.call(h.querySelectorAll('[data-opx]'), function (e) { e.click(); });
    }, [k, est === 'aberta']);
    await pg.evaluate(() => { [].forEach.call(document.querySelectorAll('body *'), function (e) { if (!e.closest('#__h') && getComputedStyle(e).position === 'fixed') e.style.display = 'none'; }); [].forEach.call(document.body.children, function (e) { if (e.id !== '__h' && !/SCRIPT/.test(e.tagName)) e.style.display = 'none'; }); document.body.style.padding = '16px 0'; });
    await pg.waitForTimeout(150);
    for (const caso of ['abaixo', 'acima', 'confianca-baixa', 'normal-com-alerta']) {
      const f = `pos-${nome}-fonte${Math.round(k * 100)}-${caso}-${est}.png`; await (await pg.$('#c-' + caso)).screenshot({ path: path.join(OUT, f) }); lista.push(f);
    }
    if (pg.__erros.length) console.log('ERROS', pg.__erros);
    await pg.context().close();
  }
  console.log(lista.length + ' capturas'); await b.close();
})();
