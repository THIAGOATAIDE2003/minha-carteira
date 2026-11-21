/* Telas: abre as abas em 5 tamanhos (320px a 1920px), online e offline; falha em erro de JS, CSP ou rolagem horizontal. Uso: node tests/telas.js */
const { chromium } = require('playwright');
const path = require('path'), APP = 'file://' + path.resolve(__dirname,'..','index.html');
(async () => {
  const b = await chromium.launch(); const er = [];
  const tam = [[320,568],[400,900],[768,1024],[1280,800],[1920,1080]];
  for (const [w,h] of tam) for (const offline of [false,true]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, offline }); const p = await ctx.newPage(); const tag = w+'x'+h+(offline?' offline':'');
    p.on('pageerror', e => er.push(tag+' → '+e.message+' @ '+String(e.stack||'').split('\n')[1]));
    p.on('console', m => { if (/Content Security|Refused to/i.test(m.text())) er.push(tag+' CSP '+m.text().slice(0,100)); });
    await p.addInitScript(() => { window.__APORTE_TESTE__ = true; });
    await p.goto(APP); await p.waitForTimeout(500);
    const r = await p.evaluate(() => { var o = [], ov = function(n){ var d = document.documentElement; if (d.scrollWidth > d.clientWidth + 2) o.push('scroll horizontal em ' + n + ' (' + d.scrollWidth + '>' + d.clientWidth + ')'); };
      var t = function(n, f){ try { f(); ov(n) } catch (e) { o.push(n + ': ' + e.message) } };
      ['resumo','ativos','proventos','mercado','mais'].forEach(function(x){ t('tab '+x, function(){ showTab(x); render() }) });
      ['pos','evo','apo','perf','ext','risk','plano'].forEach(function(c){ t('carteira '+c, function(){ showTab('ativos'); CARV = c; render() }) });
      ['min','idx','ana','bc'].forEach(function(m){ t('mercado '+m, function(){ showTab('mercado'); MKV = m; renderMkt() }) });
      t('stk', function(){ stkOpen('BBSE3'); ['res','val','ind','tri','tese','div','sob','rec','news'].forEach(function(v){ STV = v; stkRender() }) });
      return o; });
    r.forEach(x => er.push(tag+' → '+x)); await ctx.close();
  }
  const u = Array.from(new Set(er)); console.log(u.length ? u.join('\n') : '✓ Telas: nenhum problema'); await b.close(); if (u.length) process.exit(1);
})();
