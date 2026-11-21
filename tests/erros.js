/* Registro de erros (Ajustes > Status das fontes): grava falha de rede, junta repetidas (×N), escapa HTML, limita a 30, copia e limpa; offline não conta.
   Uso: node tests/erros.js (precisa do playwright) */
const { chromium } = require('playwright');
const path = require('path'), APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ permissions: ['clipboard-read', 'clipboard-write'] }), pg = await ctx.newPage(), er = [], f = [];
  pg.on('pageerror', e => er.push('PAGEERR ' + e.message));
  await pg.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  await pg.addInitScript(() => { window.__APORTE_TESTE__ = true; });
  await pg.goto(APP); await pg.waitForFunction(() => window.__aporte);
  const ok = (n, c) => { if (!c) f.push(n); };
  await pg.evaluate(() => { ERRS = []; localStorage.removeItem(ERRK); });
  // 1) rede que falha entra no registro
  await pg.evaluate(() => getJSON('https://economia.awesomeapi.com.br/json/last/USD-BRL').catch(() => {}));
  let r = await pg.evaluate(() => ERRS.slice());
  ok('falha de rede registrada', r.length === 1 && /rede economia\.awesomeapi\.com\.br/.test(r[0].o));
  // 2) repetida em sequência vira ×N
  await pg.evaluate(() => { logErro('x', 'mesma'); logErro('x', 'mesma'); logErro('x', 'mesma'); });
  r = await pg.evaluate(() => ERRS.slice()); ok('repetida junta', r[0].o === 'x' && r[0].n === 3 && r.length === 2);
  // 3) limite de 30 e persistência
  await pg.evaluate(() => { for (let i = 0; i < 50; i++) logErro('o' + i, 'm' + i); });
  r = await pg.evaluate(() => [ERRS.length, JSON.parse(localStorage.getItem(ERRK)).length]); ok('limite 30', r[0] === 30 && r[1] === 30);
  // 4) HTML perigoso no texto do erro não vira HTML
  await pg.evaluate(() => { ERRS = []; logErro('<img src=x id=hack>', '<script>window.__x=1</script>'); });
  let h = await pg.evaluate(() => { var d = document.createElement('div'); setHtml(d, errBox()); return [!!d.querySelector('#hack'), !!d.querySelector('script'), d.textContent.indexOf('<script>') >= 0]; });
  ok('erro escapado', h[0] === false && h[1] === false && h[2] === true);
  // 5) offline não registra
  await ctx.setOffline(true); await pg.evaluate(() => { ERRS = []; logErro('off', 'x'); }); r = await pg.evaluate(() => ERRS.length); ok('offline não conta', r === 0); await ctx.setOffline(false);
  // 6) aparece em Ajustes e os botões funcionam
  await pg.evaluate(() => { ERRS = []; logErro('nuvem GitHub', 'HTTP 401 Bad credentials'); render(); });
  const vis = await pg.evaluate(() => { var s = document.getElementById('srcinfo'); return s ? s.textContent : ''; });
  ok('aparece no Status das fontes', /Últimos erros/.test(vis) && /HTTP 401/.test(vis));
  await pg.evaluate(() => document.querySelector('[data-errcopy]').click());
  await pg.waitForTimeout(150);
  const clip = await pg.evaluate(() => navigator.clipboard.readText().catch(() => 'ERRO')); ok('copiar', /nuvem GitHub \| HTTP 401/.test(clip));
  await pg.evaluate(() => document.querySelector('[data-errclr]').click());
  r = await pg.evaluate(() => [ERRS.length, localStorage.getItem(ERRK), /Nenhum erro registrado/.test(document.getElementById('srcinfo').textContent)]); ok('limpar', r[0] === 0 && r[1] === null && r[2]);
  // 7) a chave do GitHub nunca vai para o registro
  await pg.evaluate(() => { S.keys.gh = 'github_pat_SEGREDO123'; logErro('nuvem GitHub', 'HTTP 403'); });
  r = await pg.evaluate(() => localStorage.getItem(ERRK)); ok('sem token no registro', !/SEGREDO/.test(r));
  await b.close();
  if (f.length || er.length) { console.log('FALHOU\n' + f.concat(er).join('\n')); process.exit(1); }
  console.log('✓ Registro de erros: tudo certo');
})();
