/* Gera PNGs da gaveta do sininho (E8) a 360 px, fonte 100% e 130%, temas Branco e Cinza. Os avisos são SIMULADOS (tickers inventados); o resto da tela vem da cópia dos dados.
   Uso: node tests/capturas-e8.js <pasta-dados> <pasta-saida> */
const { chromium } = require('playwright'); const { abrirReal } = require('./lib-real.js'); const fs = require('fs'), path = require('path');
const DADOS = process.argv[2], OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
const L = (g, gv, ty, tk, tx, sub, n, tks) => ({ g, gv, ty, tk, tx, sub, n: n || 0, tks: tks || [] });
const TIPOS_A = [L(0, 0, 'bal', 'ALFA3', 'Balanço novo (3T26)', 'Faixa de R$ 14,20 a R$ 23,10 para R$ 15,80 a R$ 25,40'), L(0, 1, 'faixa', 'BETA4', 'Passou para Acima da faixa', 'Preço R$ 72,10 · antes: Dentro da faixa'), L(1, 3, 'nota', 'GAMA3', 'Nota caiu', 'De 9,0 para 8,0'), L(1, 4, 'faixa', 'DELT3', 'Passou para Abaixo da faixa', 'Preço R$ 5,10 · antes: Dentro da faixa'), L(1, 2, 'saiu', 'EPSI3', 'Saiu das ideias', 'Passou para Em verificação (dado desatualizado)'), L(2, 5, 'nova', 'ZETA3', 'Nova ideia', 'Confiança média · nota 9,0 · Dentro da faixa')];
const TIPOS_B = [L(0, 6, 'nota', 'ALFA3', 'Nota subiu', 'De 8,0 para 9,0 · desde a sua última abertura'), L(0, 0, 'gbal', '', '4 ações têm balanço novo', 'ALFA3, BETA4, GAMA3, DELT3 · toque para ver', 4, ['ALFA3', 'BETA4', 'GAMA3', 'DELT3']), L(1, 4, 'gfaixa', '', '5 ações mudaram de posição na faixa', 'GAMA3, DELT3, EPSI3, ZETA3 e mais 1 · toque para ver', 5, ['GAMA3', 'DELT3', 'EPSI3', 'ZETA3', 'ETA3']), L(1, 2, 'gsaiu', '', '4 ações saíram das ideias', 'GAMA3, DELT3, EPSI3, ZETA3 · toque para ver', 4, ['GAMA3', 'DELT3', 'EPSI3', 'ZETA3']), L(1, 3, 'gnota', '', '4 ações mudaram de nota', 'GAMA3, DELT3, EPSI3, ZETA3 · toque para ver', 4, ['GAMA3', 'DELT3', 'EPSI3', 'ZETA3']), L(2, 5, 'gnova', '', '5 ações são novas ideias', 'ETA13, ETA23, ETA33, ETA43 e mais 1 · toque para ver', 5, ['ETA13', 'ETA23', 'ETA33', 'ETA43', 'ETA53'])];
const CASOS = [['cada-tipo-1', TIPOS_A], ['cada-tipo-2-agrupados', TIPOS_B], ['primeira-abertura', 'primeira'], ['vazio', []], ['vazio-total', []], ['abas-sem-numero', TIPOS_A]];
(async () => {
  const b = await chromium.launch(), lista = [];
  for (const [tema, nome] of [['branco', 'branco'], ['preto', 'cinza']]) for (const k of [1, 1.3]) for (const [caso, log] of CASOS) {
    const pg = await abrirReal(b, DADOS, { width: 360, height: 740 }, tema);
    await pg.evaluate(([log, caso]) => {
      AV.md = 1; NT.seen = 0; localStorage.removeItem(AVSK); AV.rd = 0; AV.st = null; AV.ok = 0;
      if (log === 'primeira') avCiclo(true);
      else { const now = Date.now(); avGravar({ v: 1, ini: '2026-11-23', at: now, cand: 160, t: {}, ck: {}, log: log.map((x, i) => Object.assign({ k: x.ty + i, ts: now - i * 60000 }, x)) }); }
      if (caso === 'vazio-total') { window.whyMine = function () { return []; }; window.dvAlerts = function () { return []; }; window.riAlerts = function () { return []; }; window.entAlerts = function () { return []; }; NT.d = { itens: [] }; }
      ntBadge(); if (caso === 'abas-sem-numero') { showTab('mercado'); MKV = 'ana'; ANV = 'opp'; OPV = 'gar'; OPC = { k: '' }; renderMkt(); }
    }, [log, caso]);
    if (caso !== 'abas-sem-numero') { await pg.evaluate(() => ndOpen()); await pg.waitForTimeout(450); }
    if (k !== 1) await pg.evaluate(k => { var raiz = document.getElementById('nd') && !document.getElementById('nd').hidden ? document.querySelectorAll('#nd, #nd *') : document.querySelectorAll('body *'), els = [].slice.call(raiz), f0 = els.map(function (e) { return parseFloat(getComputedStyle(e).fontSize); }); els.forEach(function (e, i) { e.style.fontSize = (f0[i] * k) + 'px'; }); }, k);
    await pg.evaluate(() => [].forEach.call(document.querySelectorAll('.vtoast'), e => e.remove())); /* o aviso de versão da abertura some sozinho em 3 s no app real */
    await pg.waitForTimeout(200);
    const f = `e8-${nome}-fonte${Math.round(k * 100)}-${caso}.png`; await pg.screenshot({ path: path.join(OUT, f) }); lista.push(f);
    const r = await pg.evaluate(() => { const n = document.getElementById('nd'), b = document.getElementById('nd-b'); return { rolagem: n && !n.hidden ? b.scrollWidth > b.clientWidth + 1 : document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, mkb: document.querySelectorAll('.mkb').length, badge: document.getElementById('bellb').textContent, bolinhas: [].slice.call(document.querySelectorAll('i,span,b')).filter(e => /\bmkb\b/.test(e.className)).length }; });
    if (r.rolagem || r.mkb) console.log('PROBLEMA', f, JSON.stringify(r));
    if (pg.__erros.length) console.log('ERROS', pg.__erros); await pg.context().close();
  }
  console.log(lista.length + ' capturas'); await b.close();
})();
