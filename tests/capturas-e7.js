/* Gera PNGs do painel "Esse método já acertou?" (E7) a 360 px, fonte 100% e 130%, temas Branco e Cinza. Os números são SIMULADOS (nenhum dado real no painel).
   Uso: node tests/capturas-e7.js <pasta-dados> <pasta-saida> */
const { chromium } = require('playwright'); const { abrirReal } = require('./lib-real.js'); const fs = require('fs'), path = require('path');
const DADOS = process.argv[2], OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
const ENT = n => Array.from({ length: n }, (_, i) => ({ tk: 'IDEIA' + i, dia: '2026-11-23' }));
const HOJE = { v: 1, gerado: '2026-11-23', nmin: 10, entradas: ENT(11), agg: { '90': { total: { n: 0 }, conf: {}, ms: {}, fora: {}, datas: 0, prox: '2027-02-23' }, '180': { total: { n: 0 } }, '365': { total: { n: 0 } } } };
const SIM = { v: 1, gerado: '2027-06-15', nmin: 10, entradas: ENT(16), agg: { '90': { total: { n: 14, bI: 9, bC: 8, bAmbos: 6, med: 0.042, medI: 0.011, medC: 0.029 }, datas: 9, prox: null,
  conf: { Alta: { n: 8, bI: 6, bC: 5 }, 'Média': { n: 6, bI: 3, bC: 3 }, 'Verificação': { n: 5, bI: 2, bC: 1 } }, ms: { neg: { n: 7, bI: 3, bC: 3 }, '0-20': { n: 5, bI: 4, bC: 3 }, '20+': { n: 2, bI: 2, bC: 2 } }, fora: { semSaida: 2, split: 1, semDiv: 0, semFoto: 0 } }, '180': { total: { n: 0 } }, '365': { total: { n: 0 } } } };
const SIM2 = JSON.parse(JSON.stringify(SIM)); SIM2.agg['90'].total = { n: 24, bI: 15, bC: 13, bAmbos: 10, med: 0.051, medI: 0.012, medC: 0.03 }; SIM2.agg['90'].conf.Alta = { n: 12, bI: 8, bC: 7 };
const CASOS = [['fechado-hoje', HOJE, false], ['aberto-hoje-poucos-dados', HOJE, true], ['aberto-simulado-n14', SIM, true], ['aberto-simulado-grupo-n12', SIM2, true], ['balao-aberto', HOJE, false, 'balao'], ['ajustes-ok', HOJE, false, 'ajustes-ok'], ['ajustes-falha', HOJE, false, 'ajustes-falha']];
(async () => {
  const b = await chromium.launch(); const lista = [];
  for (const [tema, nome] of [['branco', 'branco'], ['preto', 'cinza']]) for (const k of [1, 1.3]) for (const [caso, R, abrir, modo] of CASOS) {
    const pg = await abrirReal(b, DADOS, { width: 360, height: 900 }, tema);
    await pg.evaluate(() => { showTab('mercado'); MKV = 'ana'; ANV = 'opp'; OPV = 'gar'; OPC = { k: '' }; renderMkt(); });
    await pg.evaluate(([R, abrir, k, modo]) => { S.keys.gh = 'tok'; localStorage.setItem(LS + '-met-st', JSON.stringify(modo === 'ajustes-falha' ? { ok: false, dia: '2026-11-23', motivo: 'sem conexão; tenta de novo em 10 minutos', bk: false } : { ok: true, dia: '2026-11-23', motivo: '', bk: true })); METRT = Date.now() + 1e9; METR = { ok: true, r: R }; METOPEN = abrir; METH = 90;
      var h = document.createElement('div'); h.id = '__h'; h.style.cssText = 'margin:0;padding:0 16px;width:328px;box-sizing:border-box;background:var(--bg)'; document.body.insertBefore(h, document.body.firstChild); setHtml(h, modo && modo.indexOf('ajustes') === 0 ? '<p class="meta" style="text-align:center;margin:12px 0">' + esc(metTxt()) + '</p>' : metHtml());
      if (k !== 1) { var els = [].slice.call(h.querySelectorAll('*')), f0 = els.map(function (e) { return parseFloat(getComputedStyle(e).fontSize); }); els.forEach(function (e, i) { e.style.fontSize = (f0[i] * k) + 'px'; }); }
      [].forEach.call(document.querySelectorAll('body *'), function (e) { if (!e.closest('#__h') && getComputedStyle(e).position === 'fixed') e.style.display = 'none'; }); if (modo === 'balao') { document.body.children.length; [].forEach.call(document.body.children, function (e) { if (e.id !== '__h' && e.id !== 'balpop') e.style.visibility = 'hidden'; }); h.querySelector('.bal').click(); } window.scrollTo(0, 0); }, [R, abrir, k, modo]);
    await pg.waitForTimeout(150);
    const f = `e7-${nome}-fonte${Math.round(k * 100)}-${caso}.png`;
    if (modo === 'balao') { const bb = await pg.evaluate(() => { const a = document.getElementById('__h').getBoundingClientRect(), b = document.getElementById('balpop').getBoundingClientRect(); const t = Math.max(0, Math.min(a.top, b.top) - 6), bt = Math.max(a.bottom, b.bottom) + 6; return { x: 0, y: t + window.scrollY, width: 360, height: bt - t }; }); await pg.screenshot({ path: path.join(OUT, f), clip: bb, fullPage: true }); }
    else await (await pg.$('#__h')).screenshot({ path: path.join(OUT, f) }); lista.push(f);
    const sw = await pg.evaluate(() => document.getElementById('__h').scrollWidth <= document.getElementById('__h').clientWidth); if (!sw) console.log('rolagem horizontal em', f);
    if (pg.__erros.length) console.log('ERROS', pg.__erros); await pg.context().close();
  }
  console.log(lista.length + ' capturas'); await b.close();
})();
