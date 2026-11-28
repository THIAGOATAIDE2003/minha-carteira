/* Testes da U2a (1.85.0, js/voltar.js): o botão Voltar do Android fecha só a camada de cima (ação, Patrimônio, sino, Assistente, Perfil, Proventos, Evolução…).
   Mede o histórico com a Navigation API (posição da entrada atual) e usa page.goBack() como o botão do celular. Uso: node tests/voltar.js    --mutantes */
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { chromium } = require('playwright');
const RAIZ = process.env.APORTE_APP_DIR || path.resolve(__dirname, '..'), APP = 'file://' + path.join(RAIZ, 'index.html'), arg = process.argv;
let falhas = 0, total = 0;
const ok = (n, c, x) => { total++; if (!c) { falhas++; console.log('✗', n, x === undefined ? '' : JSON.stringify(x).slice(0, 500)); } };
const NOW = '2026-06-15T12:00:00-03:00';
const ST = { keys: { finnhub: '', brapi: '', gh: '', repo: '' }, pend: [], fx: { rate: 5.8, src: 'manual' }, quotes: { ITUB4: { price: 35, src: 'manual' }, VT: { price: 120, src: 'manual' } },
  trades: [{ id: 't1', date: '2025-01-10', ticker: 'ITUB4', market: 'BR', side: 'buy', qty: 100, price: 30, fx: 1 }, { id: 't3', date: '2025-01-20', ticker: 'VT', market: 'US', side: 'buy', qty: 10, price: 100, fx: 5.0 },
    { id: 'd1', date: '2025-07-01', ticker: 'ITUB4', market: 'BR', side: 'div', qty: 1, price: 50, fx: 1, tipo: 'JCP' }, { id: 'd2', date: '2026-05-25', ticker: 'VT', market: 'US', side: 'div', qty: 1, price: 3, fx: 5.6, tipo: 'Dividendo' }] };
const MUTANTES = {
  'sem-popstate': ['js/voltar.js', "window.addEventListener('popstate'", "window.addEventListener('popstate_x'"],
  'sem-trava': ['js/voltar.js', 'if(VL.busy){VL.busy=0;clearTimeout(VL.tm);vlRun();return}', ''],
  'ignora-perfil': ['js/voltar.js', "if(document.getElementById('pfsheet'))r.push('pf');", ''],
  'fecha-sem-marcar': ['js/voltar.js', 'VL.CV[u[i]]=1;vlFecha', 'vlFecha'],
  'nao-empilha': ['js/voltar.js', "history.pushState({ap:1,d:VL.D},'',location.href)", '0'],
  'sem-reload-neutro': ['js/voltar.js', "history.replaceState({ap:0},'',location.href);\n  window", "0;\n  window"],
  'chama-showtab': ['js/voltar.js', 'function vlFecha(id){try{', "function vlFecha(id){try{showTab('mercado');"],
  'sino-sem-fila': ['js/voltar.js', 'function vlRun(){if(VL.busy)return;', 'function vlRun(){'],
};
async function novo(b) {
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' }), p = await ctx.newPage(), er = [];
  p.on('pageerror', e => er.push(e.message)); await ctx.route(u => !/^(file|data):/.test(u.toString()), r => r.abort());
  await p.addInitScript(o => { window.__APORTE_TESTE__ = true; if (!sessionStorage.getItem('ok')) { localStorage.clear(); localStorage.setItem('minha-carteira-v1', o); sessionStorage.setItem('ok', '1'); } }, JSON.stringify(ST));
  await p.goto(APP); await p.waitForFunction(() => window.__aporte); await p.waitForTimeout(700); p.__er = er; p.__ctx = ctx; return p;
}
const est = p => p.evaluate(() => ({ i: navigation.currentEntry.index, n: navigation.entries().length, st: history.state, ab: typeof vlAb === 'function' ? vlAb() : [], P: typeof VL === 'object' ? VL.P.join(',') : '', D: typeof VL === 'object' ? VL.D : -1, ov: document.body.style.overflow, y: Math.round(scrollY) }));
const esp = (p, ms) => p.waitForTimeout(ms || 450);
const volta = async (p, ms) => { await p.goBack(); await esp(p, ms); };
const camadas = {
  stk: p => p.evaluate(() => stkOpen('ITUB4')), pat: p => p.evaluate(() => heroOpen('pat')), perfil: p => p.evaluate(() => pfOpen()), assist: p => p.evaluate(() => asOpen()), noticias: p => p.evaluate(() => ntOpen()),
  sino: p => p.evaluate(() => ndOpen()), faixa: p => p.evaluate(() => { document.getElementById('tp').hidden = false; document.body.style.overflow = 'hidden'; }), mercados: p => p.evaluate(() => { document.getElementById('mk').hidden = false; document.body.style.overflow = 'hidden'; }),
  organizar: p => p.evaluate(() => orgAbre('#carseg')),
};
async function principal(b) {
  const p = await novo(b); let e0;
  /* 1 ação */
  await p.evaluate(() => { showTab('ativos'); window.scrollTo(0, 120); }); await esp(p, 200); e0 = await est(p);
  await camadas.stk(p); await esp(p); let e1 = await est(p);
  ok('U1 abrir a ação soma 1 entrada e marca state.ap=1', e1.i === e0.i + 1 && e1.st && e1.st.ap === 1 && e1.ab.indexOf('stk') >= 0, [e0, e1]);
  await volta(p); let e2 = await est(p), tab = await p.evaluate(() => [document.getElementById('stk').hidden, location.hash]);
  ok('U1 Voltar fecha a ação; mesma entrada de antes, mesma rolagem, sem trocar de aba', tab[0] === true && e2.i === e0.i && e2.y === e0.y && e2.ov === '', [e0, e2, tab]);
  /* 2 ✕ */
  await camadas.stk(p); await esp(p); await p.evaluate(() => document.querySelector('#stk [data-stk="close"]').click()); await esp(p, 600); let e3 = await est(p);
  ok('U2 fechar pelo ✕ devolve a entrada: sem entrada fantasma', e3.i === e0.i && e3.D === 0 && !(e3.st && e3.st.ap) && e3.P === '', e3);
  /* 3 Patrimônio */
  await p.evaluate(() => showTab('resumo')); await camadas.pat(p); await esp(p); let e4 = await est(p); await volta(p); let e5 = await est(p);
  ok('U3 Patrimônio: abre, Voltar fecha', e4.ab.indexOf('stk') >= 0 && e5.ab.length === 0 && e5.i === e4.i - 1, [e4, e5]);
  /* 4 Mercados → ação */
  await camadas.mercados(p); await esp(p, 200); await camadas.stk(p); await esp(p); let e6 = await est(p); await volta(p); let e7 = await est(p); await volta(p); let e8 = await est(p);
  ok('U4 Mercados→ação: 1º Voltar fecha só a ação, 2º fecha Mercados', e6.P === 'mk,stk' && e7.ab.join() === 'mk' && e8.ab.length === 0 && e8.i === e5.i, [e6, e7, e8]);
  /* 5 sino → ação */
  await p.evaluate(() => { ndOpen(); }); await esp(p, 300); const s0 = await est(p);
  await p.evaluate(() => { ndClose(); setTimeout(function () { stkOpen('ITUB4'); }, 260); }); await esp(p, 900); let e9 = await est(p); await volta(p); let e10 = await est(p);
  ok('U5 sino→ação: um Voltar fecha a ação, o sino não reabre, nada sobra', s0.ab.join() === 'nd' && e9.ab.join() === 'stk' && e9.D === 1 && e10.ab.length === 0 && e10.i === e5.i, [s0, e9, e10]);
  /* 5b fechar uma camada e abrir outra no mesmo instante (fila de histórico) */
  await camadas.mercados(p); await esp(p, 300); const q0 = await est(p);
  await p.evaluate(() => { document.getElementById('mk').hidden = true; stkOpen('ITUB4'); }); await esp(p, 900); const q1 = await est(p); await volta(p); const q2 = await est(p);
  ok('U5 fechar uma camada e abrir outra no mesmo instante: a nova fica aberta, 1 entrada, Voltar fecha', q1.ab.join() === 'stk' && q1.D === 1 && q1.i === q0.i && q2.ab.length === 0 && q2.i === q0.i - 1, [q0, q1, q2]);
  /* 6 cada camada */
  const r6 = {};
  for (const k of ['perfil', 'assist', 'noticias', 'faixa', 'organizar', 'sino']) { const a = await est(p); await camadas[k](p); await esp(p, 350); const m = await est(p); await volta(p, 600); const d = await est(p); r6[k] = [m.ab.length === 1 && m.i === a.i + 1, d.ab.length === 0 && d.i === a.i && d.ov === '']; }
  ok('U6 Perfil, Assistente, Notícias, Faixa, Organizar abas e Sino: abrem e fecham com Voltar', Object.values(r6).every(v => v[0] && v[1]), r6);
  const pe = await (async () => { await p.evaluate(() => { showTab('ativos'); document.querySelector('[data-cv="evo"]') && document.querySelector('[data-cv="evo"]').click(); }); await esp(p, 400); const a = await est(p);
    const abre = await p.evaluate(() => { var b = document.querySelector('[data-evf="open"]'); if (!b) return false; b.click(); return true; }); await esp(p, 350); const m = await est(p); await volta(p, 600); const d = await est(p); return [abre, m.ab.join(), d.ab.length, d.i === a.i]; })();
  ok('U6 filtro de Evolução: abre e Voltar fecha', pe[0] && pe[1] === 'evsheet' && pe[2] === 0 && pe[3], pe);
  const pv = await (async () => { await p.evaluate(() => showTab('proventos')); await esp(p, 400); const a = await est(p);
    const abre = await p.evaluate(() => { var b = document.querySelector('[data-pvo]'); if (!b) return false; b.click(); return true; }); await esp(p, 350); const m = await est(p); await volta(p, 600); const d = await est(p); return [abre, m.ab.join(), d.ab.length, d.i === a.i]; })();
  ok('U6 Proventos (painel redesenhado): abre e Voltar fecha', pv[0] && pv[1] === 'pv' && pv[2] === 0 && pv[3], pv);
  /* 7 fundo */
  await p.evaluate(() => showTab('resumo')); await esp(p, 200); const f0 = await est(p); await camadas.assist(p); await esp(p, 300);
  await p.evaluate(() => { document.getElementById('assist').click(); }); await esp(p, 600); const f1 = await est(p);
  ok('U7 toque no fundo escuro fecha e consome a entrada', f1.ab.length === 0 && f1.i === f0.i && f1.D === 0, [f0, f1]);
  /* 8 duplo toque */
  await camadas.stk(p); await esp(p); const g0 = await est(p); const er0 = p.__er.length;
  await p.goBack().catch(() => { }); await p.goBack().catch(() => { }); await esp(p, 700); const g1 = await est(p);
  ok('U8 dois Voltar seguidos com 1 camada: fecha 1 vez, sem erro', g1.ab.length === 0 && p.__er.length === er0, [g0, g1, p.__er.slice(er0)]);
  /* 8b duas camadas, dois Voltar rápidos */
  await p.goto(APP); await p.waitForFunction(() => window.__aporte); await esp(p, 500);
  await camadas.mercados(p); await esp(p, 200); await camadas.stk(p); await esp(p, 300); const h0 = await est(p); await p.goBack().catch(() => { }); await p.goBack().catch(() => { }); await esp(p, 900); const h1 = await est(p);
  ok('U8 duas camadas + dois Voltar rápidos: as duas fecham, uma por toque', h0.P === 'mk,stk' && h1.ab.length === 0 && h1.D === 0, [h0, h1]);
  /* 9 reload com camada aberta */
  await camadas.stk(p); await esp(p); await p.reload(); await p.waitForFunction(() => window.__aporte); await esp(p, 600); const rl = await est(p);
  ok('U9 recarregar com camada aberta: sem camada, state neutro', rl.ab.length === 0 && (!rl.st || !rl.st.ap || rl.st.ap === 0) && rl.D === 0 && p.__er.length === er0, rl);
  /* 10 link #aba */
  const l0 = await est(p); await p.evaluate(() => { location.hash = 'carteira'; }); await esp(p, 300); const l1 = await est(p);
  ok('U10 link #aba abre a aba sem criar camada (só a entrada normal do hash)', l1.ab.length === 0 && l1.D === 0 && l1.n <= l0.n + 1, [l0, l1]);
  /* 11 localStorage e números */
  const ls = await p.evaluate(() => { var k = Object.keys(localStorage).sort(); var c = compute(); return { k: k, t: c.tot.value }; });
  const ls2 = await (async () => { await camadas.stk(p); await esp(p, 300); await volta(p); await camadas.perfil(p); await esp(p, 300); await volta(p); return p.evaluate(() => ({ k: Object.keys(localStorage).sort(), t: compute().tot.value })); })();
  ok('U11 chaves do localStorage e patrimônio iguais depois de abrir/fechar camadas (nenhuma chave nova)', JSON.stringify(ls.k) === JSON.stringify(ls2.k) && ls.t === ls2.t, [ls, ls2]);
  /* 12 arquivos */
  const tam = f => fs.statSync(path.join(RAIZ, f)).size;
  ok('U12 voltar.js ≤ 3 KB e em index.html e sw.js', tam('js/voltar.js') <= 3072 && /js\/voltar\.js/.test(fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8')) && /'js\/voltar\.js'/.test(fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8')), tam('js/voltar.js'));
  ok('sem erro de JavaScript', p.__er.length === 0, p.__er); await p.__ctx.close();
}
(async () => {
  if (arg.includes('--mutantes')) {
    let fraco = 0; const nomes = Object.keys(MUTANTES);
    nomes.forEach(n => {
      const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mutv-')), [f, a, b2] = MUTANTES[n];
      cp.execSync('tar --exclude=node_modules --exclude=.git -cf - . | tar -xf - -C ' + tmp, { cwd: RAIZ, shell: '/bin/bash' }); try { fs.symlinkSync(path.join(RAIZ, 'node_modules'), path.join(tmp, 'node_modules')); } catch (e) { }
      const tx = fs.readFileSync(path.join(tmp, f), 'utf8'); if (!tx.includes(a)) { console.log('✗ trecho não achado:', n); fraco++; return; } fs.writeFileSync(path.join(tmp, f), tx.replace(a, () => b2));
      const r = cp.spawnSync('node', [__filename], { encoding: 'utf8', cwd: RAIZ, timeout: 250000, env: Object.assign({}, process.env, { APORTE_APP_DIR: tmp }) });
      const q = r.status !== 0, qual = ((r.stdout || '').match(/^✗ \S+ [^\n]{0,60}/gm) || []).slice(0, 2).join(' | '); console.log((q ? '✓ pego   ' : '✗ ESCAPOU') + ' ' + n + (q ? '  → ' + qual : '')); if (!q) fraco++;
    });
    console.log(fraco ? '✗ ' + fraco + ' escaparam' : '✓ Todos os ' + nomes.length + ' defeitos pegos'); process.exit(fraco ? 1 : 0);
  }
  const b = await chromium.launch(); try { await principal(b); } catch (e) { falhas++; console.log('✗ erro:', e.message.split('\n')[0]); } await b.close();
  console.log(falhas ? '✗ Voltar: ' + falhas + ' falha(s) de ' + total : '✓ Voltar: ' + total + ' conferências ok'); process.exit(falhas ? 1 : 0);
})();
