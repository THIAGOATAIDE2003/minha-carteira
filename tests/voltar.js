/* Testes da U2a (1.85.0) e U2b (1.86.0) de js/voltar.js: o botão Voltar do Android fecha só a camada de cima (ação, Patrimônio, sino, Assistente, Perfil, Proventos, Evolução…) e, nas abas, volta ao Início; no app instalado, só sai com 2 toques.
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
  'sem-trava': ['js/voltar.js', 'if(VL.busy){if(!ly)VL.TD=s&&s.tb?1:0;VL.busy=0;clearTimeout(VL.tm);vlRun();return}', ''],
  'ignora-perfil': ['js/voltar.js', "if(document.getElementById('pfsheet'))r.push('pf');", ''],
  'fecha-sem-marcar': ['js/voltar.js', 'VL.CV[u[i]]=1;vlFecha', 'vlFecha'],
  'nao-empilha': ['js/voltar.js', "vlPush({ap:1,d:VL.D})", '0'],
  'sem-reload-limpo': ['js/voltar.js', "if(vs&&vs.ap===1){for(vi=0;vi<vs.d;vi++)VL.Q.push('t');", 'if(vs&&vs.ap===1){'],
  'chama-showtab': ['js/voltar.js', 'function vlFecha(id){try{', "function vlFecha(id){try{showTab('mercado');"],
  'sino-sem-fila': ['js/voltar.js', 'function vlRun(){if(VL.busy)return;', 'function vlRun(){'],
  'ignora-avanco': ['js/voltar.js', "if(ly&&d>n){VL.D=n;VL.busy=1;VL.tm=setTimeout(function(){VL.busy=0;vlRun()},400);history.go(n-d);return}", ''],
  'sem-desfazer-fantasma': ['js/voltar.js', "if(!n){if(ly){VL.Q.push('t');vlRun()}else vlNivel(s);return}", 'if(!n){vlNivel(s);return}'],
  'sem-guarda-D': ['js/voltar.js', "if(VL.D<=0){vlRun();return}", ''],
  'trava-sem-limite': ['js/voltar.js', 'VL.tm=setTimeout(function(){VL.busy=0;vlRun()},400);try{history.back()}', 'try{history.back()}'],
  'sem-observar-telas': ['js/voltar.js', "['divtab','evotab'].forEach", '[].forEach'],
  'x-mercados-fora': ['js/voltar.js', "mk:'#mk [data-mk=\"close\"]'", "mk:'#mk [data-xx=\"close\"]'"],
  'aba-sempre-empilha': ['js/voltar.js', "if(!VL.TD){vlPush({ap:0,tb:1},u);VL.TD=1}else try{history.replaceState({ap:0,tb:1},'',u)}catch(x){}}", "vlPush({ap:0,tb:1},u);VL.TD=1}"],
  'mesma-aba-empilha': ['js/voltar.js', "if(n===c){if(n!=='resumo'&&VL.TD)try{history.replaceState({ap:0,tb:1},'',u)}catch(x){}return}", 'if(n===c){vlPush({ap:0,tb:1},u);return}'],
  'sem-sentinela': ['js/voltar.js', 'if(VL.SA)vlPush({ap:0,sn:1},vb);', ''],
  'sem-aviso': ['js/voltar.js', 'vlToast();VL.AT=-1;', 'VL.AT=-1;'],
  'aviso-no-navegador': ['js/voltar.js', "VL.SA=!!(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||!!navigator.standalone;", 'VL.SA=true;'],
  'sem-rearmar': ['js/voltar.js', 'setTimeout(function(){if(VL.AT===-1)vlArm()},2000)', '0'],
  'link-sem-base': ['js/voltar.js', "if(vt!=='resumo'){vlPush({ap:0,tb:1},vb+'#'+vh);VL.TD=1}", ''],
  'sino-ideias-sem-adiar': ['js/voltar.js', 'if(VL.P.length||VL.busy||VL.Q.length){VL.PH=h;return}', ''],
  'voltar-nao-vai-ao-inicio': ['js/voltar.js', "if(l===0&&VL.TD){VL.TD=0;VL.cur='resumo';showTab('resumo')}", ''],
};
async function novo(b, o) {
  o = o || {};
  const ctx = await b.newContext({ viewport: { width: 380, height: 800 }, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' }), p = await ctx.newPage(), er = [];
  p.on('pageerror', e => er.push(e.message)); await ctx.route(u => !/^(file|data):/.test(u.toString()), r => r.abort());
  if (o.sa) await p.addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = q => /display-mode: standalone/.test(q) ? { matches: true, media: q, addListener() { }, removeListener() { }, addEventListener() { }, removeEventListener() { } } : mm(q); });
  if (o.antes) await p.goto('about:blank?antes');
  await p.addInitScript(o => { window.__APORTE_TESTE__ = true; if (!sessionStorage.getItem('ok')) { localStorage.clear(); localStorage.setItem('minha-carteira-v1', o); sessionStorage.setItem('ok', '1'); } }, JSON.stringify(ST));
  await p.goto(APP + (o.hash || '')); await p.waitForFunction(() => window.__aporte); await p.waitForTimeout(700); p.__er = er; p.__ctx = ctx; return p;
}
const est = p => p.evaluate(() => ({ h: location.hash, TD: typeof VL === 'object' ? VL.TD : -1, cur: typeof VL === 'object' ? VL.cur : '', vis: (document.querySelector('.tabs [aria-current="page"]') || {}).dataset ? document.querySelector('.tabs [aria-current="page"]').dataset.go : '', i: navigation.currentEntry.index, n: navigation.entries().length, st: history.state, ab: typeof vlAb === 'function' ? vlAb() : [], P: typeof VL === 'object' ? VL.P.join(',') : '', D: typeof VL === 'object' ? VL.D : -1, ov: document.body.style.overflow, y: Math.round(scrollY) }));
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
  ok('U12 voltar.js ≤ 9 KB e em index.html e sw.js', tam('js/voltar.js') <= 9216 && /js\/voltar\.js/.test(fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8')) && /'js\/voltar\.js'/.test(fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8')), tam('js/voltar.js'));
  ok('sem erro de JavaScript', p.__er.length === 0, p.__er); await p.__ctx.close();
  await segunda(b);
}

const vtx = () => [].map.call(document.querySelectorAll('.vtoast'), e => e.textContent).join('|');
const vt = () => /voltar de novo/.test(vtx());
const tab = (p, t) => p.evaluate(t2 => { var b = document.querySelector('.tabs [data-go="' + t2 + '"]'); b.click(); }, t);
async function segunda(b) {
  /* ---------- U2b: abas ---------- */
  let p = await novo(b, { antes: 1 }); let a0 = await est(p);
  ok('B0 abre no Início sem entrada extra (navegador comum)', a0.n === 1 && a0.TD === 0 && a0.cur === 'resumo', a0);
  await tab(p, 'ativos'); await esp(p, 300); let a1 = await est(p); await volta(p); let a2 = await est(p);
  ok('B1 Início → Carteira → Voltar = Início', a1.n === a0.n + 1 && a1.TD === 1 && a1.h === '#ativos' && a2.vis === 'resumo' && a2.TD === 0 && a2.i === a0.i, [a0, a1, a2]);
  await tab(p, 'ativos'); await esp(p, 200); await tab(p, 'mercado'); await esp(p, 200); await tab(p, 'proventos'); await esp(p, 200); await tab(p, 'mais'); await esp(p, 200); const m1 = await est(p); await volta(p); const m2 = await est(p);
  ok('B1 várias abas seguidas ocupam 1 entrada só; 1 Voltar = Início', m1.i === a0.i + 1 && m1.h === '#mais' && m2.vis === 'resumo' && m2.i === a0.i, [m1, m2]);
  await tab(p, 'mercado'); await esp(p, 200); const n0 = await est(p); await tab(p, 'mercado'); await tab(p, 'mercado'); await esp(p, 200); const n1 = await est(p);
  ok('B2 tocar na aba onde já está não cria entrada', n1.n === n0.n && n1.i === n0.i, [n0, n1]);
  await p.evaluate(() => { document.querySelector('[data-mkv="idx"]').click(); }); await tab(p, 'ativos'); await esp(p, 200); const s0 = await est(p);
  await p.evaluate(() => { document.querySelector('#carseg [data-cv="evo"]').click(); }); await esp(p, 200); const s1 = await est(p);
  await p.evaluate(() => { document.querySelector('#carseg [data-cv="perf"]').click(); }); await esp(p, 200); const s2 = await est(p);
  await tab(p, 'mais'); await esp(p, 150); await p.evaluate(() => { document.querySelector('#maisseg [data-mais="ajustes"]').click(); }); await esp(p, 200); const s3 = await est(p);
  await p.evaluate(() => { avIdeias(); }); await esp(p, 300); const s4 = await est(p);
  ok('B3 sub-abas (Carteira, Mais, Ideias) não criam entradas e continuam funcionando', s1.i === s0.i && s2.i === s0.i && s1.h === '#evolucao' && s2.h === '#desempenho' && s3.i === s0.i && s3.h === '#ajustes' && s4.i === s0.i && s4.h === '#mercado', [s0, s1, s2, s3, s4]);
  await volta(p); const s5 = await est(p);
  ok('B3 depois de várias sub-abas, 1 Voltar = Início', s5.vis === 'resumo' && s5.TD === 0, s5);
  /* camada + aba */
  await tab(p, 'ativos'); await esp(p, 200); const c0 = await est(p); await camadas.stk(p); await esp(p, 300); await volta(p); const c1 = await est(p); await volta(p); const c2 = await est(p);
  ok('B6 camada + aba: Voltar fecha a ação (continua na Carteira) e o 2º vai ao Início', c1.ab.length === 0 && c1.vis === 'ativos' && c1.i === c0.i && c2.vis === 'resumo' && c2.i === c0.i - 1, [c0, c1, c2]);
  /* hashchange externo */
  await p.evaluate(() => { location.hash = 'proventos'; }); await esp(p, 300); const x1 = await est(p);
  ok('B6 mudar o endereço (#proventos) à mão ainda abre a aba', x1.vis === 'proventos' && x1.h === '#proventos', x1);
  ok('B5 navegador comum: nenhum aviso de saída e nenhuma sentinela', await p.evaluate(() => ![].some.call(document.querySelectorAll('.vtoast'), e => /voltar de novo/.test(e.textContent)) && !VL.SA), 0);
  ok('sem erro de JavaScript (U2b)', p.__er.length === 0, p.__er); await p.__ctx.close();
  /* link direto */
  p = await novo(b, { antes: 1, hash: '#mercado' }); const d0 = await est(p);
  ok('B6 link direto #mercado: abre Mercado; entrada de Início por baixo', d0.vis === 'mercado' && d0.TD === 1 && d0.n === 2, d0); await volta(p); const d1 = await est(p);
  ok('B6 link direto: Voltar leva ao Início', d1.vis === 'resumo' && d1.TD === 0, d1); await p.__ctx.close();
  /* ---------- U2b: app instalado ---------- */
  p = await novo(b, { antes: 1, sa: 1 }); const i0 = await est(p);
  ok('B4 app instalado: abre com a entrada sentinela (Início fica 1 acima do fundo)', i0.n === 2 && i0.st && i0.st.sn === 1, i0);
  await volta(p, 300); const i1 = await est(p), tt = await p.evaluate(() => [].map.call(document.querySelectorAll('.vtoast'), e => e.textContent).join('|'));
  ok('B4 1º Voltar no Início: fica no app e mostra "Toque em voltar de novo para sair"', /voltar de novo para sair/.test(tt) && i1.vis === 'resumo' && p.url().indexOf('index.html') > 0, [tt, i1, p.url()]);
  await volta(p, 300); ok('B4 2º Voltar em menos de 2 s: sai do app', p.url().indexOf('index.html') < 0, p.url());
  await p.__ctx.close();
  p = await novo(b, { antes: 1, sa: 1 }); await volta(p, 300); await esp(p, 2400); const j1 = await est(p); await volta(p, 300); const j2 = await est(p), t2 = await p.evaluate(() => [].map.call(document.querySelectorAll('.vtoast'), e => e.textContent).join('|'));
  ok('B4 2º Voltar depois de 2 s: aviso de novo, não sai', p.url().indexOf('index.html') > 0 && /voltar de novo/.test(t2) && j1.st && j1.st.sn === 1, [j1, j2, t2, p.url()]);
  await tab(p, 'ativos'); await esp(p, 300); const k1 = await est(p); await volta(p, 300); const k2 = await est(p);
  ok('B4 app instalado: Carteira → Voltar = Início, sem aviso de saída', k1.TD === 1 && k2.vis === 'resumo' && p.url().indexOf('index.html') > 0, [k1, k2]);
  ok('sem erro de JavaScript (instalado)', p.__er.length === 0, p.__er); await p.__ctx.close();
  /* ---------- pendência (a): recarregar com tela aberta ---------- */
  p = await novo(b, { antes: 1 }); await tab(p, 'ativos'); await esp(p, 250); const r0 = await est(p); await camadas.stk(p); await esp(p, 300); await p.reload(); await p.waitForFunction(() => window.__aporte); await esp(p, 800); const r1 = await est(p);
  ok('P(a) recarregar com a ação aberta: volta à entrada da aba, sem Voltar morto', r1.ab.length === 0 && r1.i === r0.i && !(r1.st && r1.st.ap === 1) && r1.vis === 'ativos' && r1.TD === 1, [r0, r1]);
  await volta(p); const r2 = await est(p);
  ok('P(a) 1 Voltar depois do recarregamento já leva ao Início', r2.vis === 'resumo', r2);
  /* pendência (b): sino → linha de Ideias */
  await p.evaluate(() => { showTab('resumo'); }); await esp(p, 200); const b0 = await est(p);
  await p.evaluate(() => { ndOpen(); }); await esp(p, 300); await p.evaluate(() => { ndClose(); avIdeias(); }); await esp(p, 1000); const b1 = await est(p); await volta(p); const b2 = await est(p);
  ok('P(b) sino → Ideias: chega a Mercado com 1 entrada de aba só; 1 Voltar = Início, nenhuma sobra', b1.vis === 'mercado' && b1.ab.length === 0 && b1.D === 0 && b1.TD === 1 && b1.i === b0.i + 1 && b2.vis === 'resumo' && b2.i === b0.i, [b0, b1, b2]);
  await p.__ctx.close();
  /* ---------- reforço (c): defesas que o teste não alcançava ---------- */
  p = await novo(b); await camadas.mercados(p); await esp(p, 250); await camadas.stk(p); await esp(p, 250); const f0 = await est(p); await volta(p); await p.goForward(); await esp(p, 700); const f1 = await est(p);
  ok('R1 avançar no histórico com camada aberta é desfeito (não fecha, D e posição coerentes)', f0.P === 'mk,stk' && f1.ab.join() === 'mk' && f1.D === 1 && f1.st && f1.st.d === 1 && f1.i === f0.i - 1, [f0, f1]);
  await volta(p, 600); const f2 = await est(p);
  ok('R1 depois disso, 1 Voltar fecha Mercados (sem Voltar morto)', f2.ab.length === 0 && f2.i === 0 && f2.D === 0, f2); await p.__ctx.close();
  p = await novo(b); await camadas.mercados(p); await esp(p, 250); await volta(p); const g0 = await est(p); await p.goForward(); await esp(p, 700); const g1 = await est(p);
  ok('R2 avançar para uma entrada de camada sem camada aberta: desfaz a entrada, D em 0', g1.ab.length === 0 && g1.D === 0 && g1.i === g0.i && !(g1.st && g1.st.ap === 1), [g0, g1]); await p.__ctx.close();
  p = await novo(b); await camadas.stk(p); await esp(p, 250); const h0 = await est(p); await p.evaluate(() => { VL.D = 0; }); await p.evaluate(() => document.querySelector('#stk [data-stk="close"]').click()); await esp(p, 600); const h1 = await est(p);
  ok('R3 camada fechada com contador em 0: não volta no histórico', h1.i === h0.i && h1.ab.length === 0, [h0, h1]); await p.__ctx.close();
  p = await novo(b); await p.evaluate(() => { history.back = function () { }; VL.Q.push('b'); VL.D = 1; vlRun(); }); await esp(p, 700);
  await p.evaluate(() => stkOpen('ITUB4')); await esp(p, 500); const t0 = await est(p);
  ok('R4 se o histórico não responde, a trava solta em 400 ms e o app volta a empilhar', t0.ab.join() === 'stk' && t0.st && t0.st.ap === 1 && t0.D === 1, t0); await p.__ctx.close();
  p = await novo(b, { antes: 1 }); await p.evaluate(() => { showTab('proventos'); }); await esp(p, 300); const o0 = await est(p);
  await p.evaluate(() => { var b = document.querySelector('[data-pvo]'); b.click(); }); await esp(p, 350); const o1 = await est(p);
  await p.evaluate(() => { setHtml(document.getElementById('divtab'), '<div class="panel">novo</div>'); }); await esp(p, 700); const o2 = await est(p);
  ok('R5 painel de Proventos aberto e a tela trocada por baixo: a camada some e a entrada é devolvida (observador do #divtab)', o1.ab.join() === 'pv' && o2.ab.length === 0 && o2.i === o0.i && o2.D === 0, [o0, o1, o2]);
  await p.__ctx.close(); p = await novo(b, { antes: 1 });
  await p.evaluate(() => { showTab('ativos'); document.querySelector('[data-cv="evo"]').click(); }); await esp(p, 400); const e0 = await est(p);
  await p.evaluate(() => document.querySelector('[data-evf="open"]').click()); await esp(p, 350); const e1 = await est(p); await p.evaluate(() => { setHtml(document.getElementById('evotab'), '<div class="panel">novo</div>'); }); await esp(p, 700); const e2 = await est(p);
  ok('R5 filtro de Evolução aberto e a tela trocada por baixo: idem (observador do #evotab)', e1.ab.join() === 'evsheet' && e2.ab.length === 0 && e2.i === e0.i && e2.D === 0, [e0, e1, e2]);
  await p.__ctx.close();
  p = await novo(b, { antes: 1 }); await p.evaluate(() => { window.__mkc = 0; document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-mk="close"]')) window.__mkc++; }, true); });
  await camadas.mercados(p); await esp(p, 300); await volta(p); const q = await p.evaluate(() => window.__mkc);
  ok('R6 Voltar em Mercados aciona o ✕ de verdade (a tela usa a função própria de fechar)', q === 1, q);
  ok('sem erro de JavaScript (reforço)', p.__er.length === 0, p.__er); await p.__ctx.close();
}
(async () => {
  if (arg.includes('--mutantes')) {
    let fraco = 0; const nomes = Object.keys(MUTANTES);
    nomes.forEach(n => {
      const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mutv-')), [f, a, b2] = MUTANTES[n];
      cp.execSync('tar --exclude=node_modules --exclude=.git -cf - . | tar -xf - -C ' + tmp, { cwd: RAIZ, shell: '/bin/bash' }); try { fs.symlinkSync(path.join(RAIZ, 'node_modules'), path.join(tmp, 'node_modules')); } catch (e) { }
      const tx = fs.readFileSync(path.join(tmp, f), 'utf8'); if (!tx.includes(a)) { console.log('✗ trecho não achado:', n); fraco++; return; } fs.writeFileSync(path.join(tmp, f), tx.replace(a, () => b2));
      const r = cp.spawnSync('node', [__filename], { encoding: 'utf8', cwd: RAIZ, timeout: 280000, env: Object.assign({}, process.env, { APORTE_APP_DIR: tmp }) });
      const q = r.status !== 0, qual = ((r.stdout || '').match(/^✗ \S+ [^\n]{0,60}/gm) || []).slice(0, 2).join(' | '); console.log((q ? '✓ pego   ' : '✗ ESCAPOU') + ' ' + n + (q ? '  → ' + qual : '')); if (!q) fraco++;
    });
    console.log(fraco ? '✗ ' + fraco + ' escaparam' : '✓ Todos os ' + nomes.length + ' defeitos pegos'); process.exit(fraco ? 1 : 0);
  }
  const b = await chromium.launch(); try { await principal(b); } catch (e) { falhas++; console.log('✗ erro:', e.message.split('\n')[0]); } await b.close();
  console.log(falhas ? '✗ Voltar: ' + falhas + ' falha(s) de ' + total : '✓ Voltar: ' + total + ' conferências ok'); process.exit(falhas ? 1 : 0);
})();
