/* Testes do medidor de tempos (1.83.9, js/tempos.js): só observa. Mostra os tempos em Ajustes, guarda as últimas 20 aberturas numa chave NOVA (só ao sair do app), copia e limpa;
   não toca em nenhuma chave existente, não usa rede nem temporizador, e se o medidor falhar o app segue igual.
   Na 1.83.8 (sem o medidor) T1 a T7 FALHAM. Uso: node tests/tempos.js    --mutantes */
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { chromium } = require('playwright');
const RAIZ = process.env.APORTE_APP_DIR || path.resolve(__dirname, '..'), APP = 'file://' + path.join(RAIZ, 'index.html');
const arg = process.argv;
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra).slice(0, 600)); } };
const MUTANTES = {
  'sem-limite-de-aberturas': ['js/tempos.js', 'var a=TMH.concat([TM]).slice(-TMN),o=[]', 'var a=TMH.concat([TM]),o=[]'],
  'conta-render-aninhado-duas-vezes': ['js/tempos.js', 'if(!TMD&&typeof BOOT', 'if(typeof BOOT'],
  'grava-a-cada-render': ['js/tempos.js', 'if(t<5000)TM.ra++}', 'if(t<5000)TM.ra++;tmSalva()}'],
  'limpar-nao-apaga': ['js/tempos.js', 'localStorage.removeItem(TMK);', ''],
  'mexe-em-chave-existente': ['js/tempos.js', 'localStorage.setItem(TMK,JSON.stringify(o))', 'localStorage.setItem(TMK,JSON.stringify(o));localStorage.setItem(LS+\'-ajv\',\'x\')'],
  'usa-rede': ['js/tempos.js', 'function tmSalva(){try{', 'function tmSalva(){try{fetch(\'https://exemplo.invalid/\',{method:\'POST\',body:JSON.stringify(TM)});'],
  'acao-sem-limite': ['js/tempos.js', 'if(TM.ac.length<10)TM.ac.push', 'TM.ac.push'],
  'copiar-sem-versao': ['js/tempos.js', "t='Aporte '+VERSAO+' · medidor", "t='Aporte · medidor"],
  'desenha-dentro-do-render': ['js/tempos.js', 'if(t<5000)TM.ra++}', 'if(t<5000)TM.ra++;tmDesenha()}'],
};
async function novo(b) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' }), p = await ctx.newPage(), erros = [], reqs = [];
  p.on('pageerror', e => erros.push(e.message)); p.on('request', r => { if (!/^(file|data):/.test(r.url())) reqs.push(r.url()); });
  await ctx.route(u => !/^(file|data):/.test(u.toString()), r => r.abort());
  await p.addInitScript(() => { window.__APORTE_TESTE__ = true; });
  await p.goto(APP); await p.waitForFunction(() => window.__aporte); await p.waitForTimeout(900);
  p.__erros = erros; p.__reqs = reqs; return p;
}
const sec = async (n, f) => { try { await f(); } catch (e) { ok('Bloco "' + n + '" não rodou: ' + String(e.message).split('\n')[0].slice(0, 160), false); } };
const raf2 = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
async function principal(b) {
  const p = await novo(b);
  await sec('T1 quadro em Ajustes', async () => {
    const r = await p.evaluate(async () => { var antes = Object.keys(localStorage).sort(); showTab('ajustes'); AJV = 'dados'; ajApply(); document.body.click(); await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
      var el = document.getElementById('tmbox'); return { txt: el ? el.textContent : null, antes: antes, esq: TM.esq, uti: TM.uti, rn: TM.rn, vis: !!(el && el.offsetParent), btn: !!document.getElementById('tm-copia') && !!document.getElementById('tm-limpa') }; });
    ok('T1 o quadro "Velocidade do app" aparece em Ajustes com os botões', r.txt && /Velocidade do app/.test(r.txt) && r.btn && r.vis, r);
    ok('T1 esqueleto e tela pronta medidos (números positivos, esqueleto antes da pronta)', r.esq > 0 && r.uti > 0 && r.esq <= r.uti, [r.esq, r.uti]);
    ok('T1 texto em português simples com "Esqueleto da tela", "Tela pronta", "Redesenhos" e "página de ação"', /Esqueleto da tela/.test(r.txt) && /Tela pronta para usar/.test(r.txt) && /Redesenhos nesta abertura/.test(r.txt) && /Abrir página de ação/.test(r.txt), r.txt);
    ok('T1 a abertura já contou redesenhos', r.rn >= 1, r.rn);
  });
  await sec('T2 redesenhos', async () => {
    const r = await p.evaluate(() => { var n0 = TM.rn, d0 = TM.rt; render(); render(); return { dois: TM.rn - n0, soma: TM.rt - d0 >= 0, prof: TMD }; });
    ok('T2 cada render() soma 1, a duração é guardada e a profundidade volta a zero', r.dois === 2 && r.soma && r.prof === 0, r);
    const d = await p.evaluate(() => { var o = window.tmDesenha, c = 0; window.tmDesenha = function () { c++; return o.apply(this, arguments); }; render(); render(); window.tmDesenha = o; return c; });
    ok('T2 o quadro nunca é redesenhado de dentro do render()', d === 0, d);
    const a = await p.evaluate(() => { var o = tmRender0; window.__in = 0; tmRender0 = function () { if (!window.__in) { window.__in = 1; window.render(); window.__in = 0; } return o.apply(this, arguments); }; var n0 = TM.rn; render(); var n = TM.rn - n0; tmRender0 = o; return { n: n, prof: TMD }; });
    ok('T2 render() chamada dentro de render() conta uma vez só', a.n === 1 && a.prof === 0, a);
  });
  await sec('T3 página de ação', async () => {
    const r = await p.evaluate(() => { var n0 = TM.ac.length; var sr = tmSR0; tmSR0 = function () { return 1; }; window.__sr = sr; stkOpen('PETR4'); STK.d = { price: 40, name: 'Petrobras' }; try { stkRender(); } catch (e) { } var a = TM.ac.slice(); try { stkClose(); } catch (e) { } tmSR0 = sr; return { n0: n0, a: a, tk: STK && STK.tk }; });
    ok('T3 abrir a página da ação registra 1 tempo (ms, número ≥ 0)', r.a.length === r.n0 + 1 && r.a[r.a.length - 1] >= 0, r);
    const r2 = await p.evaluate(() => { var sr = tmSR0; tmSR0 = function () { return 1; }; for (var i = 0; i < 15; i++) { stkOpen('PETR4'); STK.d = { price: 40, name: 'x' }; try { stkRender(); } catch (e) { } try { stkClose(); } catch (e) { } } tmSR0 = sr; return TM.ac.length; });
    ok('T3 no máximo 10 tempos de ação por abertura', r2 <= 10, r2);
  });
  await sec('T4 gravação', async () => {
    const r = await p.evaluate(() => { var outras = {}; Object.keys(localStorage).forEach(function (k) { outras[k] = localStorage.getItem(k); }); var antes = localStorage.getItem(TMK);
      for (var i = 0; i < 30; i++) TMH.push({ t: i, v: 'x', esq: 1, uti: 2, rn: 1, ra: 1, rt: 1, rm: 1, ac: [] });
      Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'));
      var dep = JSON.parse(localStorage.getItem(TMK) || 'null'), mudou = [];
      Object.keys(outras).forEach(function (k) { if (localStorage.getItem(k) !== outras[k]) mudou.push(k); });
      var novas = Object.keys(localStorage).filter(function (k) { return !(k in outras); });
      return { antes: antes, n: dep && dep.length, mudou: mudou, novas: novas, ultimo: dep && dep[dep.length - 1] && dep[dep.length - 1].v }; });
    ok('T4 nada é gravado durante o uso (só ao sair do app)', r.antes === null, r.antes);
    ok('T4 ao sair grava no máximo as últimas 20 aberturas', r.n === 20 && r.ultimo === '1.83.9', r);
    ok('T4 nenhuma chave existente mudou; a única chave nova é minha-carteira-v1-tempos', r.mudou.length === 0 && r.novas.length === 1 && r.novas[0] === 'minha-carteira-v1-tempos', r);
  });
  await sec('T5 copiar e limpar', async () => {
    const r = await p.evaluate(async () => { var guardado = ''; Object.defineProperty(navigator, 'clipboard', { value: { writeText: function (t) { guardado = t; return Promise.resolve(); } }, configurable: true });
      Object.defineProperty(document, 'hidden', { value: false, configurable: true }); showTab('ajustes'); document.body.click(); await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
      document.getElementById('tm-copia').click(); await new Promise(function (r) { setTimeout(r, 50); }); var msg = document.getElementById('tm-msg').textContent;
      document.getElementById('tm-limpa').click(); return { txt: guardado, msg: msg, chave: localStorage.getItem(TMK), rn: TM.rn, th: TMH.length, msg2: document.getElementById('tm-msg').textContent }; });
    ok('T5 "Copiar resumo" copia o texto com versão, esqueleto, tela pronta e redesenhos', /Aporte 1\.83\.9/.test(r.txt) && /Esqueleto da tela/.test(r.txt) && /Tela pronta/.test(r.txt) && /Redesenhos/.test(r.txt) && r.msg === 'Copiado', [r.txt.slice(0, 200), r.msg]);
    ok('T5 "Limpar medições" apaga a chave e zera os contadores', r.chave === null && r.rn === 0 && r.th === 0 && /apagadas/.test(r.msg2), r);
  });
  await sec('T6 sem rede e sem temporizador', async () => {
    const fonte = fs.readFileSync(path.join(RAIZ, 'js/tempos.js'), 'utf8');
    ok('T6 o código do medidor não tem fetch, XMLHttpRequest, sendBeacon, WebSocket, setTimeout nem setInterval', !/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|setTimeout|setInterval|\.innerHTML\s*=/.test(fonte), fonte.length);
    const n0 = p.__reqs.length;
    await p.evaluate(() => { showTab('ajustes'); document.getElementById('tm-copia') && document.getElementById('tm-copia').click(); Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); });
    await p.waitForTimeout(300);
    ok('T6 nenhum pedido de rede saiu do medidor', p.__reqs.length === n0, p.__reqs.slice(n0));
  });
  await sec('T7 falha do medidor não derruba o app', async () => {
    const r = await p.evaluate(() => { var erro = null, a = null; var pn = performance.now, si = Storage.prototype.setItem; try { performance.now = function () { throw new Error('boom'); }; Storage.prototype.setItem = function () { throw new Error('cheio'); };
        a = compute(); render(); tmSalva(); tmDesenha(); stkOpen('PETR4'); stkClose(); document.dispatchEvent(new Event('visibilitychange')); } catch (e) { erro = String(e.message); } finally { performance.now = pn; Storage.prototype.setItem = si; }
      return { erro: erro, tot: a && a.tot ? true : !!a }; });
    ok('T7 com relógio e armazenamento quebrando, render(), compute(), gravação e quadro seguem sem erro', r.erro === null && r.tot, r);
  });
  ok('sem erro de JavaScript na página', p.__erros.length === 0, p.__erros);
  await p.context().close();
}
(async () => {
  if (arg.includes('--mutantes')) {
    let fraco = 0; const nomes = Object.keys(MUTANTES);
    nomes.forEach(n => {
      const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mutt-')), [f, a, b2] = MUTANTES[n];
      cp.execSync('tar --exclude=node_modules --exclude=.git -cf - . | tar -xf - -C ' + tmp, { cwd: RAIZ, shell: '/bin/bash' }); try { fs.symlinkSync(path.join(RAIZ, 'node_modules'), path.join(tmp, 'node_modules')); } catch (e) { }
      const tx = fs.readFileSync(path.join(tmp, f), 'utf8'); if (!tx.includes(a)) { console.log('✗ trecho do defeito não achado:', n); fraco++; return; } fs.writeFileSync(path.join(tmp, f), tx.replace(a, () => b2));
      const r = cp.spawnSync('node', [__filename], { encoding: 'utf8', cwd: RAIZ, timeout: 300000, env: Object.assign({}, process.env, { APORTE_APP_DIR: tmp }) });
      const saida = (r.stdout || '') + (r.stderr || ''), quebrou = r.status !== 0, qual = (saida.match(/^✗ .{0,80}/gm) || []).slice(0, 2).join(' | ');
      console.log((quebrou ? '✓ pego   ' : '✗ ESCAPOU') + ' ' + n + (quebrou ? '  → ' + qual : '')); if (!quebrou) fraco++;
    });
    console.log(fraco ? '✗ ' + fraco + ' defeito(s) escaparam dos testes' : '✓ Todos os ' + nomes.length + ' defeitos inseridos foram pegos pelos testes'); process.exit(fraco ? 1 : 0);
  }
  const b = await chromium.launch();
  try { await principal(b); } catch (e) { falhas++; console.log('✗ erro no teste:', e.message); }
  await b.close();
  console.log(falhas ? '✗ Tempos: ' + falhas + ' falha(s) de ' + total : '✓ Tempos: ' + total + ' conferências ok'); process.exit(falhas ? 1 : 0);
})();
