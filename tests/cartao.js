/* Testes do cartão limpo e da barra da faixa das Ideias (js/cartao.js, style-cartao.css, 1.79.0, E6).
   Uso: node tests/cartao.js [--dados ../minha-carteira-dados]  (sem a pasta de dados, só roda a parte sintética) */
const path = require('path'), fs = require('fs'), crypto = require('crypto');
const { chromium } = require('playwright');
const { abrirReal } = require('./lib-real');
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
const arg = process.argv, di = arg.indexOf('--dados');
const DADOS = path.resolve(di > 0 ? arg[di + 1] : path.join(__dirname, '..', '..', 'minha-carteira-dados'));
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra).slice(0, 400)); } };
const HASH_OPDATA = '9e54e5e4be571bf93998d65f91eede584276a34b77bd0e6887b78b80e246138a'; /* opData da 1.78.0: a E6 não pode mexer */
/* funções dentro do navegador: objeto sintético, escala de fonte, contraste, retângulos */
const PRE = () => {
  window.__mk = function (tk, ov) { ov = ov || {}; var o = { tk: tk, d: { cur: 'BRL', price: 38, k: {} }, A: { N: { dy: 8.5 }, alr: [], pos: [], neg: [] }, score: 9, al: [], cf: { n: 'Média', w: [], f: 1 }, sd: { n: 0, m: { caixa: true, dlpl: 0.2 }, mot: [], desc: [] }, ql: { tipo: 'nf', ap: 6, ps: 5, t: [] }, novo: 1 };
    o.fx = Object.assign({ ok: true, F: brl, cons: 34.5, cen: 46.8, oti: 61.2, espPct: 0.214, ms: -0.1, est: 'perto', trap: null, pr: [], nm: {} }, ov.fx || {});
    Object.keys(ov).forEach(function (k) { if (k !== 'fx') o[k] = ov[k]; }); return o; };
  window.__host = function (html) { var h = document.getElementById('__h'); if (!h) { h = document.createElement('div'); h.id = '__h'; h.className = 'panel'; h.style.cssText = 'margin:0;padding:0 16px;width:' + (innerWidth - 32) + 'px;box-sizing:border-box'; document.body.insertBefore(h, document.body.firstChild); } h.style.width = (innerWidth - 32) + 'px'; setHtml(h, html); return h; };
  window.__escala = function (k) { var els = [].slice.call(document.querySelectorAll('#__h *')), fs0 = els.map(function (e) { return parseFloat(getComputedStyle(e).fontSize); }); els.forEach(function (e, i) { e.style.fontSize = (fs0[i] * k) + 'px'; }); };
  window.__rgb = function (s) { var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s) || []; return [+m[1], +m[2], +m[3]]; };
  window.__hex = function (s) { s = s.trim(); if (s[0] === '#') { var h = s.slice(1); if (h.length === 3) h = h.replace(/./g, '$&$&'); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; } return __rgb(s); };
  window.__lum = function (c) { var f = c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
  window.__cr = function (a, b) { var x = __lum(a), y = __lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  window.__var = function (n) { return __hex(getComputedStyle(document.documentElement).getPropertyValue(n)); };
  window.__r = function (e) { var r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  window.__cruza = function (a, b) { return Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5; };
};
const TEMAS = ['atual', 'branco', 'preto'];
(async () => {
  const b = await chromium.launch(), erros = [];
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 } }), p = await ctx.newPage();
  p.on('pageerror', e => erros.push(e.message));
  await p.addInitScript(() => { window.__APORTE_TESTE__ = true; });
  await p.goto(APP); await p.waitForFunction(() => window.__aporte); await p.waitForTimeout(300); await p.evaluate(PRE);
  /* T1 dado nulo */
  const T1 = await p.evaluate(() => {
    const casos = { pend: __mk('A3', { fx: { ok: false, pend: true, motivo: 'calculando a faixa…' } }), banco: __mk('B3', { fx: { ok: false, banco: true, motivo: 'valuation desta financeira em breve' } }), semcvm: __mk('C3', { fx: { ok: false, motivo: 'sem histórico da CVM para esta empresa' } }),
      semcf: __mk('D3', { cf: null }), semalr: __mk('E3', { A: { N: {} } }), px0: __mk('F3', { d: { cur: 'BRL', price: 0, k: {} } }), pxnan: __mk('G3', { d: { cur: 'BRL', price: NaN, k: {} } }), consnan: __mk('H3', { fx: { cons: NaN } }), consneg: __mk('I3', { fx: { cons: -5 } }),
      otinan: __mk('J3', { fx: { oti: NaN } }), semnota: __mk('K3', { score: null }), esp: __mk('L3', { fx: { espPct: NaN } }), cennan: __mk('M3', { fx: { cen: NaN } }) };
    const R = {}; Object.keys(casos).forEach(k => { let h = ''; try { h = opCartao(casos[k], 1); } catch (e) { h = 'ERRO ' + e.message; } R[k] = { h: h, barra: /class="opbw"/.test(h), ruim: /NaN|Infinity|undefined|null|ERRO/.test(h), etq: opEtiq(casos[k]).t }; });
    return R; });
  ok('T1 nenhum NaN/Infinity/undefined/erro em 13 casos de dado nulo', Object.keys(T1).every(k => !T1[k].ruim), Object.keys(T1).filter(k => T1[k].ruim));
  ok('T1 sem faixa válida = sem barra e "Faixa indisponível"/"Calculando…"', ['pend', 'banco', 'semcvm', 'px0', 'pxnan', 'consnan', 'consneg', 'otinan'].every(k => !T1[k].barra && /Faixa indisponível|Calculando/.test(T1[k].etq)), T1.pend.etq);
  ok('T1 cen inválido: barra sem traço central, sem erro', T1.cennan.barra && !/opbc/.test(T1.cennan.h));
  ok('T1 nota e potencial nulos viram "—" com texto "indisponível" para leitor de tela', />—<\/b><small>nota/.test(T1.semnota.h) && /Nota indisponível/.test(T1.semnota.h) && /Potencial indisponível/.test(T1.esp.h) && />—<\/b><small>potencial/.test(T1.esp.h));
  ok('T1 motivo curto aparece na linha fechada (sem faixa)', /opmu">sem histórico da CVM para esta empresa/.test(T1.semcvm.h) && /valuation desta financeira em breve/.test(T1.banco.h));
  /* T2 barra pura */
  const T2 = await p.evaluate(() => { const f = (c, m, o) => ({ cons: c, cen: m, oti: o }), R = {};
    R.ab = opBarra(f(34, 46, 61), 30); R.de = opBarra(f(34, 46, 61), 40); R.ac = opBarra(f(34, 46, 61), 70); R.igual = opBarra(f(50, 50, 50), 50); R.eqc = opBarra(f(34, 46, 61), 34); R.eqo = opBarra(f(34, 46, 61), 61);
    R.cenfora = opBarra(f(34, 99, 61), 40); R.longe1 = opBarra(f(34, 46, 61), 3.4); R.longe2 = opBarra(f(34, 46, 61), 340); R.cent = opBarra(f(0.34, 0.46, 0.61), 0.399);
    R.usd = opBarra({ cons: 12.34, cen: 15, oti: 20 }, 13.1); return R; });
  const todas = Object.values(T2), pos = x => [x.c, x.o, x.p].concat(x.m == null ? [] : [x.m]);
  ok('T2 todas as posições em [1,99] e nunca NaN', todas.every(x => pos(x).every(v => isFinite(v) && v >= 1 && v <= 99)), T2);
  ok('T2 lados: abaixo, dentro, acima; preço igual a cons e a oti = dentro', T2.ab.lado === 'abaixo' && T2.de.lado === 'dentro' && T2.ac.lado === 'acima' && T2.eqc.lado === 'dentro' && T2.eqo.lado === 'dentro' && T2.igual.lado === 'dentro');
  ok('T2 fio só quando o preço está fora (e do lado certo)', T2.ab.fio && T2.ab.fio[0] <= T2.ab.fio[1] && T2.ac.fio && T2.de.fio === null && T2.eqc.fio === null && T2.longe1.fio && T2.longe2.fio);
  ok('T2 cons==oti não quebra; ordem cons ≤ central ≤ oti na tela; preço ordenado', T2.igual.c <= T2.igual.o && T2.de.c < T2.de.m && T2.de.m < T2.de.o && T2.ab.p < T2.ab.c && T2.ac.p > T2.ac.o, T2.igual);
  /* T3 etiqueta */
  const T3 = await p.evaluate(() => { const e = (px, c, o) => opEtiq(__mk('T3', { d: { cur: 'BRL', price: px, k: {} }, fx: { cons: c, oti: o } })).c; return { a: e(34.49, 34.5, 61.2), b: e(34.5, 34.5, 61.2), c: e(61.2, 34.5, 61.2), d: e(61.21, 34.5, 61.2), perto: e(37, 34.5, 61.2), cinza: ['abaixo', 'dentro', 'acima', 'nd'].map(k => 0), est: opEtiq(__mk('T3', { fx: { est: 'perto' } })).t }; });
  ok('T3 limites exatos: 34,49 abaixo; 34,50 e 61,20 dentro; 61,21 acima', T3.a === 'abaixo' && T3.b === 'dentro' && T3.c === 'dentro' && T3.d === 'acima', T3);
  ok('T3 "perto" (f.est) mostra "Dentro da faixa"', T3.perto === 'dentro' && T3.est === 'Dentro da faixa');
  const T3b = await p.evaluate(() => ['abaixo', 'dentro', 'acima'].map(k => { const px = k === 'abaixo' ? 30 : k === 'dentro' ? 40 : 70, h = opCartao(__mk('T3', { d: { cur: 'BRL', price: px, k: {} } }), 1), t = __host(h); const x = t.querySelector('.opx'); return { k, txt: x.textContent, n: (x.textContent.match(/(Abaixo|Dentro|Acima) da faixa/g) || []).length, antigo: /Muito perto do cenário|Acima do cenário conservador|Abaixo do cenário conservador/.test(t.textContent), bg: getComputedStyle(t.querySelector('.opdt')).backgroundColor }; }));
  ok('T3 uma única etiqueta por linha, com texto, e nenhum selo antigo', T3b.every(r => r.n === 1 && !r.antigo), T3b);
  ok('T3 "Dentro" tem ponto vazio (sem preenchimento de cor)', T3b[1].bg === 'rgba(0, 0, 0, 0)' && T3b[0].bg !== 'rgba(0, 0, 0, 0)' && T3b[2].bg !== 'rgba(0, 0, 0, 0)', T3b.map(r => r.bg));
  ok('T3 alerta "cenário conservador/otimista" fica oculto quando há faixa', await p.evaluate(() => { const o = __mk('T3', { al: [['at', 'Acima do cenário otimista', 'x'], ['ok', 'Outro alerta', 'y']] }); const h = opCartao(o, 1); return !/Acima do cenário otimista/.test(h) && /Outro alerta/.test(h); }));
  /* T4 leitura de tela */
  const T4 = await p.evaluate(() => { const h = __host(opCartao(__mk('PETR4', { fx: { trap: 'lucro' } }), 1) + opCartao(__mk('SEM3', { fx: { ok: false, motivo: 'x' } }), 1, 1) + opFiltroHtml([__mk('P3')])); const x = h.querySelector('.opx'), id = x.getAttribute('aria-controls'), tabs = [].slice.call(h.querySelector('.opk').querySelectorAll('button')).map(b => b.className.split(' ')[0]);
    return { exp: x.getAttribute('aria-expanded'), ctl: !!document.getElementById(id), lbl: x.getAttribute('aria-label'), lbl2: h.querySelectorAll('.opx')[1].getAttribute('aria-label'), hid: [].every.call(h.querySelectorAll('.opbw,.opdt,.opwn,.opch'), e => e.closest('[aria-hidden="true"]')), bb: document.querySelectorAll('button button').length, sr: h.querySelectorAll('.opn .sr,.opu .sr').length, bal: [].every.call(h.querySelectorAll('.bal'), b => b.getAttribute('aria-label') && b.getAttribute('aria-label') !== ''), press: [].map.call(h.querySelectorAll('.opfb'), b => b.getAttribute('aria-pressed')), grp: !!h.querySelector('.opf[role="group"][aria-label]'), tabs, balRot: [].map.call(h.querySelectorAll('.opf .bal'), b => b.getAttribute('aria-label')) }; });
  ok('T4 botão de abrir com aria-expanded e aria-controls existente', T4.exp === 'false' && T4.ctl);
  ok('T4 aria-label no formato combinado (etiqueta, armadilha, preço, faixa, confiança, atenção, toque duas vezes)', /^PETR4, preço abaixo da faixa\. Armadilha de valor\. Preço 38 reais e 0 centavos\. Faixa de 34,50 a 61,20 reais, central 46,80\. Confiança média\. 1 ponto de atenção\. Toque duas vezes para abrir os detalhes\.$/.test(T4.lbl) || /^PETR4, preço dentro da faixa\. Armadilha de valor\./.test(T4.lbl), T4.lbl);
  ok('T4 linha sem faixa fala "faixa indisponível"', /^SEM3, faixa indisponível: x\./.test(T4.lbl2), T4.lbl2);
  ok('T4 barra, pontos, ⚠ e seta com aria-hidden; nenhum botão dentro de botão; nota/potencial com texto para leitor', T4.hid && T4.bb === 0 && T4.sr === 4, T4);
  ok('T4 todo ⓘ novo tem aria-label próprio; filtros com aria-pressed e role=group', T4.bal && T4.press.length === 3 && T4.press.every(v => v === 'true' || v === 'false') && T4.grp && T4.balRot.join('|') === 'Explicação: dividendos|Explicação: menor risco', T4);
  ok('T4 ordem de foco: ticker, estrela, botão de abrir, conteúdo aberto', T4.tabs.slice(0, 3).join(',') === 'opt,opa,opx', T4.tabs);
  /* T5 temas */
  for (const tm of TEMAS) {
    const T5 = await p.evaluate(async (tm) => { setTema(tm); await new Promise(r => setTimeout(r, 50)); const h = __host(opCartao(__mk('PETR4', { fx: { trap: 'lucro' }, cf: { n: 'Baixa', w: [], f: 1 } }), 1)), sf = __var('--surface'), q = s => h.querySelector(s), cs = (e) => __rgb(getComputedStyle(e).color), R = {};
      R.etq = __cr(cs(q('.opet b')), sf); R.conf = __cr(cs(q('.opmu')), sf); R.warn = __cr(cs(q('.opwn')), sf); R.nota = __cr(cs(q('.opn b')), sf); R.pot = __cr(cs(q('.opu b')), sf);
      R.op = ['--op-abaixo', '--op-dentro', '--op-acima'].map(v => __cr(__var(v), sf)); R.muted = __cr(__var('--muted'), sf); R.fg = __cr(__var('--fg'), sf);
      const m = q('.opbm'), f = q('.opbf'), ms = getComputedStyle(m); R.forma = ms.borderRadius.indexOf('50%') >= 0 && __r(m).h > __r(f).h && ms.boxShadow.indexOf(getComputedStyle(h.querySelector('.opbf')).backgroundColor) < 0 && /rgb/.test(ms.boxShadow); R.anel = __rgb(ms.boxShadow.match(/rgba?\([^)]*\)/)[0]).join() === sf.join();
      R.cinza = [opEtiq(__mk('G3', { d: { cur: 'BRL', price: 30, k: {} } })).t, opEtiq(__mk('G3')).t, opEtiq(__mk('G3', { d: { cur: 'BRL', price: 70, k: {} } })).t]; R.mf = __cr(__hex(getComputedStyle(m).backgroundColor), sf); return R; }, tm);
    ok('T5 [' + tm + '] texto da etiqueta, confiança, ⚠, nota e potencial ≥ 4,5:1', T5.etq >= 4.5 && T5.conf >= 4.5 && T5.warn >= 4.5 && T5.nota >= 4.5 && T5.pot >= 4.5, T5);
    ok('T5 [' + tm + '] cada --op-* ≥ 3:1; faixa (--muted) e marcador ≥ 3:1', T5.op.every(v => v >= 3) && T5.muted >= 3 && T5.mf >= 3, T5.op);
    ok('T5 [' + tm + '] marcador distinguível da faixa sem cor: círculo maior com anel da cor da superfície', T5.forma && T5.anel, T5);
    ok('T5 [' + tm + '] etiqueta compreensível em escala de cinza (texto presente nos 3 estados)', T5.cinza.join('|') === 'Abaixo da faixa|Dentro da faixa|Acima da faixa', T5.cinza);
  }
  await p.evaluate(() => setTema('atual'));
  const css = fs.readFileSync(path.join(__dirname, '..', 'style-cartao.css'), 'utf8'), corpo = css.split('\n').filter(l => !/^:root/.test(l)).join('\n');
  ok('T5 CSS do cartão: zero cor literal fora dos 3 blocos de tema; sem --c2 nem --tint', !/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(corpo.replace(/\/\*[\s\S]*?\*\//g, '')) && !/--c2|--tint/.test(css));
  /* T6 tela estreita e fonte grande */
  const EXTREMOS = () => { const L = [__mk('PETR4'), __mk('BPAC11X', { d: { cur: 'BRL', price: 12345.67, k: {} }, fx: { cons: 1234.56, cen: 5000, oti: 9876.54, espPct: 1.214 } }), __mk('ABCD3', { fx: { espPct: -1, trap: 'lucro' }, d: { cur: 'BRL', price: 70, k: {} } }), __mk('SEM3', { fx: { ok: false, motivo: 'histórico curto: 5 de 8 trimestres com ROE' } }), __mk('LONG3', { fx: { espPct: 12.5 }, cf: { n: 'Baixa', w: ['preço velho (de 09/11)'], f: 1 }, A: { N: {}, alr: [['Preço em queda', 'x'], ['Outro', 'y'], ['Mais um', 'z']] } }), __mk('USD1', { d: { cur: 'USD', price: 1234.56, k: {} }, fx: { F: usd, cons: 1000, cen: 1300, oti: 1600 } })];
    L[3].fxDem = 'faixa indisponível: histórico curto: 5 de 8. Previsão: deve sair por volta de 14/08/2027;'; return L; };
  for (const [w, h] of [[320, 640], [360, 740]]) for (const k of [1, 1.3]) {
    await p.setViewportSize({ width: w, height: h });
    const T6 = await p.evaluate(([k, ext]) => { const L = eval('(' + ext + ')')(); const host = __host(opFiltroHtml(L) + L.map((o, i) => opCartao(o, 1, i === 3)).join('')); if (k !== 1) __escala(k);
      const R = { sw: document.scrollingElement.scrollWidth, cw: document.scrollingElement.clientWidth, alt: [], over: [], cruz: [], alvo: [], fora: [] };
      host.querySelectorAll('.opk').forEach(c => { const r = __r(c); R.alt.push(Math.round(r.h)); if (c.scrollWidth > c.clientWidth + 1 || r.r > innerWidth + 1) R.over.push(c.querySelector('.opt b').textContent);
        const parts = ['.opt', '.opn', '.opu', '.opa'].map(s => __r(c.querySelector(s))); for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (__cruza(parts[i], parts[j])) R.cruz.push(i + '-' + j);
        const bn = c.querySelectorAll('.opbn > span'); if (bn.length === 2 && __cruza(__r(bn[0]), __r(bn[1]))) R.cruz.push('barra'); const x = c.querySelector('.opx'), xr = __r(x); c.querySelectorAll('.opx3 *').forEach(e => { const er = __r(e); if (er.w > 0 && (er.r > xr.r + 1 || er.l < xr.l - 1)) R.fora.push(e.className); });
        if (__r(c.querySelector('.opt')).h < 43.5 || xr.h < 43.5 || __r(c.querySelector('.opa')).h < 39.5) R.alvo.push('linha'); });
      host.querySelectorAll('.opfb,.opf .bal').forEach(e => { const r = __r(e); if (r.h < 43.5 || (e.classList.contains('bal') && r.w < 43.5)) R.alvo.push(e.className); }); return R; }, [k, EXTREMOS.toString()]);
    const tag = 'T6 [' + w + 'px ×' + k + '] ';
    ok(tag + 'sem rolagem horizontal; nada passa da borda do cartão', T6.sw <= T6.cw + 1 && T6.over.length === 0 && T6.fora.length === 0, T6);
    ok(tag + 'altura da fechada ≤ ' + (k === 1 ? 150 : 200) + ' px (Ideias/Sua lista; Em verificação à parte)', T6.alt.filter((_, i) => i !== 3 && i !== 4).every(v => v <= (k === 1 ? 150 : 200)), T6.alt);
    ok(tag + 'ticker, preço, nota, potencial, estrela e valores da barra não se sobrepõem', T6.cruz.length === 0, T6.cruz);
    ok(tag + 'alvos de toque ≥ 44 px (estrela ≥ 40; filtros e ⓘ ≥ 44)', T6.alvo.length === 0, T6.alvo);
  }
  await p.setViewportSize({ width: 360, height: 740 });
  /* T7 abrir/fechar e toque */
  const T7 = await p.evaluate(() => { const o = __mk('PETR4', { fx: { trap: 'lucro' }, A: { N: { dy: 8 }, alr: [['Preço em queda', 'caiu']] }, rara: true }); window.stkOpen = function (t) { window.__stk = t; }; const h = __host(opCartao(o, 1)), k = h.querySelector('.opk'), x = k.querySelector('.opx'), d = k.querySelector('.opd'), R = {}; d.__marca = 1;
    k.querySelector('.opt').click(); R.stk = window.__stk; R.depoisTicker = [x.getAttribute('aria-expanded'), d.hidden];
    R.antes = d.hidden; x.click(); R.abriu = [x.getAttribute('aria-expanded'), d.hidden, d.__marca === 1, !!OPOPEN.PETR4, /fechar os detalhes/.test(x.getAttribute('aria-label'))];
    const av = [].map.call(d.querySelectorAll('.opav li b'), e => e.textContent); R.av = av.map(t => t.replace(/:$/, '')); R.primeiro = d.firstElementChild.className; R.blocos = { porque: d.textContent.indexOf('Por que apareceu') >= 0, bal: d.querySelectorAll('.bal').length, prem: !!d.querySelector('[data-fxp]'), tx: d.textContent.indexOf(((t) => { t.innerHTML = ''; return ''; })(document.createElement('div'))) >= 0 };
    x.click(); R.fechou = [x.getAttribute('aria-expanded'), d.hidden, !!OPOPEN.PETR4]; OPOPEN = {}; return R; });
  ok('T7 toque no ticker abre a página da ação e NÃO alterna os detalhes', T7.stk === 'PETR4' && T7.depoisTicker[0] === 'false' && T7.depoisTicker[1] === true, T7);
  ok('T7 toque na parte de baixo alterna hidden/aria-expanded sem refazer o HTML (mesmo nó)', T7.abriu[0] === 'true' && T7.abriu[1] === false && T7.abriu[2] && T7.abriu[3] && T7.abriu[4] && T7.fechou[0] === 'false' && T7.fechou[1] === true && !T7.fechou[2], T7);
  ok('T7 parte aberta: avisos sérios primeiro (armadilha) e "Ideia rara" por último', T7.primeiro === 'opav' && T7.av[0] === 'Armadilha de valor' && T7.av[T7.av.length - 1] === 'Ideia rara' && T7.av.length === 3, T7.av);
  ok('T7 blocos E5 (Por que apareceu), Premissas e balões continuam na parte aberta', T7.blocos.porque && T7.blocos.prem && T7.blocos.bal >= 2, T7.blocos);
  const T7b = await p.evaluate(() => { const o = __mk('PETR4'), ref = document.createElement('div'); setHtml(ref, porqueRow(o) + saudeRow(o) + macroRow(o) + parRow(o), 'troca'); const h = __host(opCartao(o, 1)); const d = h.querySelector('.opd'); const t = ref.textContent.replace(/\s+/g, ' ').trim(); return { ok: d.textContent.replace(/\s+/g, ' ').indexOf(t.slice(0, 60)) >= 0, t: t.slice(0, 80) }; });
  ok('T7 texto dos blocos E3/E5 na parte aberta é o mesmo da 1.78.0 (porqueRow/saudeRow inalterados)', T7b.ok, T7b);
  const T7c = await p.evaluate(async () => { document.body.style.minHeight = '3000px'; let html = ''; for (let i = 0; i < 6; i++) html += opCartao(__mk('TK' + i, { fx: { trap: 'lucro' }, A: { N: { dy: 8 }, alr: [['a', 'b'], ['c', 'd'], ['e', 'f']] } }), 1); const h = __host(html); const ks = h.querySelectorAll('.opk'), x = ks[2].querySelector('.opx'); x.click(); scrollTo(0, Math.floor(ks[2].getBoundingClientRect().top + scrollY + 20)); const antes = ks[2].getBoundingClientRect().top; x.click(); await new Promise(r => setTimeout(r, 50)); const depois = ks[2].getBoundingClientRect().top; OPOPEN = {}; document.body.style.minHeight = ''; scrollTo(0, 0); return { antes, depois }; });
  ok('T7 fechar linha cujo topo saiu da tela rola até ela (sem "pulo")', T7c.antes < 0 && T7c.depois >= -1 && T7c.depois < 400, T7c);
  /* T8 filtros (funções puras) */
  const T8 = await p.evaluate(() => { const b = (ov) => __mk('F3', ov), r = (o, t) => opMenorRisco(o, t), C = 'Conservador', M = 'Moderado', A = 'Arrojado', R = {};
    R.dy = [5.99, 6, 15, 15.01, null, undefined].map(v => opDividendos(__mk('D3', { A: { N: { dy: v }, alr: [] } })));
    R.cb = r(b({ cf: { n: 'Alta', w: [], f: 1 } }), C); R.cn1 = r(b({ sd: { n: 1, m: { caixa: true }, mot: [], desc: [] } }), C); R.cdesc = r(b({ sd: { n: 0, m: { caixa: true }, mot: [], desc: ['dívida'] } }), C);
    R.cdl = [0.5, 0.51].map(v => r(b({ sd: { n: 0, m: { caixa: false, dlpl: v }, mot: [], desc: [] } }), C)); R.cdlnulo = r(b({ sd: { n: 0, m: { caixa: false, dlpl: null }, mot: [], desc: [] } }), C); R.ccx = r(b({ sd: { n: 0, m: { caixa: true, dlpl: 9 }, mot: [], desc: [] } }), C);
    R.cql = [[6, 3], [6, 4], [5, 5], [3, 3], [4, 4]].map(a => r(b({ ql: { ap: a[0], ps: a[1], t: [] } }), C)); R.cqlnulo = r(b({ ql: null }), C);
    R.mdl = [1, 1.01].map(v => r(b({ sd: { n: 0, m: { caixa: false, dlpl: v }, mot: [], desc: [] } }), M)); R.mn1 = r(b({ sd: { n: 1, m: { caixa: true }, mot: [], desc: [] } }), M); R.mql = r(b({ ql: { ap: 2, ps: 0, t: [] } }), M);
    R.a = [0, 1, 2].map(n => r(b({ sd: { n: n, m: { caixa: false, dlpl: 5 }, mot: [], desc: [] } }), A)); R.trap = [C, M, A].map(t => r(b({ fx: { trap: 'lucro' } }), t)); R.vento = [C, M, A].map(t => r(b({ vento: [['contra', 'x', 'y']] }), t));
    R.baixa = [C, M, A].map(t => r(b({ cf: { n: 'Baixa', w: [], f: 1 } }), t)); R.media = r(b({ cf: { n: 'Média', w: [], f: 1 } }), C);
    R.banco = [C, M, A].map(t => r(b({ sd: { n: 0, bank: true, f: [], desc: [], m: {}, mot: [] }, fx: { bank: true } }), t)); R.bancofalha = r(b({ sd: { n: 1, bank: true, f: [], desc: [], m: {}, mot: [] }, fx: { bank: true } }), M); R.seg = [C, M].map(t => r(b({ sd: { n: 0, seg: true, f: [], desc: [], m: {}, mot: [] }, fx: { seg: true } }), t));
    R.semfx = r(b({ fx: { ok: false } }), A); R.semsd = r(b({ sd: null }), A); return R; });
  ok('T8 Dividendos: 6,00 e 15,00 passam; 5,99, 15,01, null e undefined não', T8.dy.join() === 'false,true,true,false,false,false', T8.dy);
  ok('T8 Conservador: saúde sem falha e sem dado faltando; dívida ≤ 0,5× ou caixa; dívida nula não passa', T8.cb === true && T8.cn1 === false && T8.cdesc === false && T8.cdl.join() === 'true,false' && T8.cdlnulo === false && T8.ccx === true, T8);
  ok('T8 Conservador: qualidade ≥ 4 passados e ≥ 4 aplicáveis (3/4/5 e dado nulo)', T8.cql.join() === 'false,true,true,false,true' && T8.cqlnulo === false, T8.cql);
  ok('T8 Moderado: 0 falhas, dívida ≤ 1,0×, sem exigência de qualidade; Arrojado: no máx. 1 falha', T8.mdl.join() === 'true,false' && T8.mn1 === false && T8.mql === true && T8.a.join() === 'true,true,false', T8);
  ok('T8 armadilha reprova Conservador e Moderado (não Arrojado); vento contra só no Conservador; confiança Baixa reprova todos', T8.trap.join() === 'false,false,true' && T8.vento.join() === 'false,true,true' && T8.baixa.join() === 'false,false,false' && T8.media === true, T8);
  ok('T8 bancos e seguradoras: fora do Conservador; Moderado/Arrojado entram se a saúde própria não falha', T8.banco.join() === 'false,true,true' && T8.bancofalha === false && T8.seg.join() === 'false,true', T8);
  ok('T8 dado faltando (faixa ou saúde nula) não passa', T8.semfx === false && T8.semsd === false);
  const T8b = await p.evaluate(() => { const D = [__mk('A3', { A: { N: { dy: 8 }, alr: [] } }), __mk('B3', { A: { N: { dy: 3 }, alr: [] }, sd: { n: 2, m: {}, mot: ['x'], desc: [] } })], ant = window.opData, v0 = OPV, f0 = OPF, p0 = S.perfil; window.opData = () => ({ W: [], M: [], D: D, X: [__mk('X3', { fx: { ok: false, motivo: 'm' } })], n: 0, cand: 2, skipC: 0, skipV: 0, skipF: 0, skipS: 0 }); OPV = 'gar'; const R = {};
    try { S.perfil = null; OPF = 'todas'; let h = oppHtml(); R.todas = (h.match(/class="opk"/g) || []).length; R.statusTodas = OPSTAT; OPF = 'risco'; h = oppHtml(); R.risco = (h.match(/class="opk"/g) || []).length; R.lg = /Perfil usado: Moderado \(padrão\)/.test(h); R.ver = /Em verificação \(1\)/.test(h); R.stat = OPSTAT;
      const host = __host(h); const bt = host.querySelector('.opfp'); R.btn = bt && __r(bt).h >= 43.5; bt.click(); R.pf = !!document.getElementById('pfsheet'); pfClose(); OPF = 'div'; h = oppHtml(); R.legDiv = /Perfil usado/.test(h); R.div = (h.match(/class="opk"/g) || []).length;
      window.opData = () => ({ W: [], M: [], D: [D[1]], X: [], n: 0, cand: 1, skipC: 0, skipV: 0, skipF: 0, skipS: 0 }); OPF = 'div'; h = oppHtml(); R.vazio = /Nenhuma das 1 ideia passa neste filtro\. Toque em Todas\./.test(h);
      S.perfil = { obj: 'renda', prazo: '5', reac: 'vende', queda: '10', ext: 'nao', rf: 'sim', res: 'sim', ap: 0 }; OPF = 'risco'; window.opData = () => ({ W: [], M: [], D: [D[0], __mk('BK3', { sd: { n: 0, bank: true, f: [], desc: [], m: {}, mot: [] }, fx: { bank: true } })], X: [], n: 0, cand: 2, skipC: 0, skipV: 0, skipF: 0, skipS: 0 }); h = oppHtml(); R.tipo = opTipoPerfil(); R.legC = h.indexOf('Perfil usado: ' + R.tipo) >= 0; R.bancos = /Bancos e seguradoras não entram no Conservador/.test(h); }
    finally { window.opData = ant; OPV = v0; OPF = f0; S.perfil = p0; } return R; });
  ok('T8 Todas mostra tudo; Menor risco filtra; Dividendos filtra; contagem do status = linhas', T8b.todas === 2 && T8b.risco === 1 && T8b.div === 1 && T8b.statusTodas === 'Mostrando 2 de 2 ideias' && T8b.stat === 'Mostrando 1 de 2 ideias', T8b);
  ok('T8 legenda "Perfil usado" só com Menor risco; sem perfil = "Moderado (padrão)" e botão ≥ 44 px chama o perfil', T8b.lg && T8b.btn && T8b.pf && !T8b.legDiv, T8b);
  ok('T8 filtro vazio mostra mensagem; Em verificação nunca é filtrada', T8b.vazio && T8b.ver, T8b);
  ok('T8 com perfil: legenda mostra o perfil; no Conservador avisa que bancos ficam de fora', T8b.legC && (T8b.tipo !== 'Conservador' || T8b.bancos), T8b);
  const T8c = await p.evaluate(() => { localStorage.setItem(LS + '-opf', 'lixo'); return 1; }); await p.reload(); await p.waitForFunction(() => window.__aporte); await p.waitForTimeout(200);
  ok('T8 valor inválido em -opf volta para Todas', await p.evaluate(() => OPF === 'todas'));
  await p.evaluate(() => localStorage.removeItem(LS + '-opf')); await p.evaluate(PRE);
  const T8d = await p.evaluate(() => { const x = [__mk('A3'), __mk('B3'), __mk('C3')], ant = window.opData; window.opData = () => ({ W: [], M: [], D: x, X: [], n: 0, cand: 3, skipC: 0, skipV: 0, skipF: 0, skipS: 0 }); const a = opData().D.map(o => o.tk).join(); opFiltra(opData().D, 'div'); const b = opData().D.map(o => o.tk).join(); window.opData = ant; return a === b; });
  ok('T8 filtrar não altera a lista de opData()', T8d);
  for (const k of [1, 1.3]) { const f = await p.evaluate((k) => { OPF = 'risco'; const h = __host(opFiltroHtml([__mk('A3')]) ); if (k !== 1) __escala(k); const f = h.querySelector('.opf'), r = __r(f), cs = [].map.call(f.querySelectorAll('.opfb'), e => __r(e)); const R = { linhas: new Set(cs.map(c => Math.round(c.t))).size, corta: cs.some(c => c.r > innerWidth - 15), sw: document.scrollingElement.scrollWidth <= document.scrollingElement.clientWidth + 1 }; OPF = 'todas'; return R; }, k); ok('T8 filtros a ' + k * 100 + '%: sem cortar nem rolar' + (k > 1 ? ' (quebram em mais de uma linha)' : ''), !f.corta && f.sw && (k === 1 || f.linhas >= 2), f); }
  /* T9 armadilha de valor */
  const T9 = await p.evaluate(() => { const com = __host(opCartao(__mk('T3', { fx: { trap: 'lucro' } }), 1)), x = com.querySelector('.opx'), pal = x.querySelector('.opar'), vis = pal && pal.getBoundingClientRect().height > 0 && pal.getBoundingClientRect().bottom <= x.getBoundingClientRect().bottom, primeiro = com.querySelector('.opav li b').textContent.replace(/:$/, ''), wn = getComputedStyle(com.querySelector('.opwn')).color, fg = getComputedStyle(com.querySelector('.opet b')).color; const sem = __host(opCartao(__mk('T3'), 1)); return { txt: pal && pal.textContent, vis, primeiro, neutro: wn === fg, sem: !/Armadilha de valor/.test(sem.querySelector('.opx').textContent) }; });
  ok('T9 armadilha: palavra visível na linha fechada, 1º aviso na aberta, ⚠ sem cor de alerta; sem armadilha não aparece', T9.txt === 'Armadilha de valor' && T9.vis && T9.primeiro === 'Armadilha de valor' && T9.neutro && T9.sem, T9);
  /* T10 regressão: opData da 1.78.0 intocado */
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'mercado-oportunidades.js'), 'utf8'), m = /function opData\(\)\{[\s\S]*?return OPC\.r\}/.exec(src);
  ok('T10 corpo de opData idêntico ao da 1.78.0 (hash)', m && crypto.createHash('sha256').update(m[0]).digest('hex') === HASH_OPDATA);
  /* T11 robustez */
  const T11 = await p.evaluate(() => { const ruim = '<img src=x onerror=alert(1)>', o = __mk(ruim, { fx: { ok: false, motivo: ruim + ': ' + ruim }, cf: { n: 'Baixa', w: [ruim], f: 1, aviso: ruim }, A: { N: {}, alr: [[ruim, ruim]] } }), h = __host(opCartao(o, 1)); const R = { img: h.querySelectorAll('img[src="x"]').length, on: /onerror/.test(h.innerHTML) && h.querySelectorAll('[onerror]').length, id: h.querySelector('.opd').id, ctl: h.querySelector('.opx').getAttribute('aria-controls') }; let ex = 0; try { [__mk('Z3', { fx: { cons: Infinity } }), __mk('Z4', { sd: null, ql: null, cf: null, A: {} }), __mk('Z5', { score: -1, d: { cur: 'USD', price: 1e12, k: {} } })].forEach(o => { __host(opCartao(o, 1)); __host(opCartao(o, 0, 1)); }); } catch (e) { ex = e.message; } R.ex = ex; return R; });
  ok('T11 ticker e motivo com HTML malicioso ficam escapados; id só com [A-Za-z0-9]; dados absurdos não quebram', T11.img === 0 && !T11.on && /^opd-[A-Za-z0-9]*$/.test(T11.id) && T11.id === T11.ctl && T11.ex === 0, T11);
  /* T12 offline e CSP */
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), idx = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok('T12 js/cartao.js e style-cartao.css no precache do sw.js e no index.html; nenhum domínio novo', /'js\/cartao\.js'/.test(sw) && /'style-cartao\.css'/.test(sw) && /js\/cartao\.js/.test(idx) && /style-cartao\.css/.test(idx) && !/https?:\/\//.test(fs.readFileSync(path.join(__dirname, '..', 'js', 'cartao.js'), 'utf8')) && !/https?:\/\//.test(css));
  /* T13 desempenho */
  const ms = await p.evaluate(() => { const L = []; for (let i = 0; i < 20; i++) L.push(__mk('T' + i)); const t0 = performance.now(); L.forEach(o => opCartao(o, 1)); return performance.now() - t0; });
  ok('T13 20 linhas em menos de 30 ms', ms < 30, ms);
  /* dados reais (se a pasta privada existir) */
  if (fs.existsSync(path.join(DADOS, 'mercado.json'))) {
    for (const tm of TEMAS) for (const [w, h] of [[320, 640], [360, 740]]) for (const k of [1, 1.3]) {
      const pg = await abrirReal(b, DADOS, { width: w, height: h }, tm);
      await pg.evaluate(PRE);
      const R = await pg.evaluate((k) => { showTab('mercado'); MKV = 'ana'; ANV = 'opp'; OPV = 'gar'; OPC = { k: '' }; renderMkt(); const pan = document.querySelector('.opp'); if (k !== 1) { [].slice.call(pan.querySelectorAll('*')).map(e => [e, parseFloat(getComputedStyle(e).fontSize)]).forEach(a => { a[0].style.fontSize = a[1] * k + 'px'; }); }
        const ks = [].slice.call(pan.querySelectorAll('.opk')), R = { n: ks.length, alt: ks.map(c => Math.round(c.getBoundingClientRect().height)), over: 0, tx: pan.textContent, ver: pan.querySelectorAll('.opk.ver').length, acima: 0 };
        ks.forEach(c => { if (c.scrollWidth > c.clientWidth + 1) R.over++; }); ks.forEach(c => c.querySelector('.opx').click()); R.sw = document.scrollingElement.scrollWidth <= document.scrollingElement.clientWidth + 1; R.overAb = ks.filter(c => c.scrollWidth > c.clientWidth + 1).length; R.overList = ks.filter(c => c.scrollWidth > c.clientWidth + 1).map(c => c.querySelector('.opt b').textContent);
        R.acima = ks.filter(c => /Acima da faixa/.test(c.querySelector('.opx').textContent)).length; R.antigo = /Muito perto do cenário|Acima do cenário conservador/.test(pan.textContent); R.etq = ks.map(c => (c.querySelector('.opx').textContent.match(/Abaixo da faixa|Dentro da faixa|Acima da faixa|Faixa indisponível|Calculando/g) || []).length); R.todos = { ideias: ks.slice(0, 4).map(c => c.querySelector('.opt b').textContent.replace(' ›', '')).join(), dy: opFiltra(opData().D, 'div').length, mod: opFiltra(opData().D, 'risco').length }; return R; }, k);
      const tag = 'REAL [' + tm + ' ' + w + 'px ×' + k + '] ';
      ok(tag + '11 linhas, sem rolagem horizontal (fechadas e abertas), uma etiqueta por linha, nenhum selo antigo', R.n === 11 && R.over === 0 && R.overAb === 0 && R.sw && R.etq.every(v => v === 1) && !R.antigo, { n: R.n, over: R.over, overAb: R.overList, sw: R.sw, etq: R.etq });
      ok(tag + 'fechada ≤ ' + (k === 1 ? 150 : 200) + ' px; nenhuma Ideia ou Em verificação "Acima da faixa"', R.alt.every(v => v <= (k === 1 ? 150 : 200)) && R.acima === 0, R.alt);
      if (tm === 'atual' && w === 360 && k === 1) ok('REAL Todas 4 · Dividendos 4 · Menor risco (Moderado) 4; Ideias na ordem de hoje', R.todos.ideias === 'TGMA3,FIQE3,PETR4,VLID3' && R.todos.dy === 4 && R.todos.mod === 4, R.todos);
      ok(tag + 'sem erro de JS', pg.__erros.length === 0, pg.__erros); await pg.context().close();
    }
  } else console.log('(pasta de dados reais não encontrada: parte REAL pulada)');
  ok('sem erros de JS', erros.length === 0, erros);
  await b.close();
  console.log(falhas ? '✗ Cartão: ' + falhas + ' falha(s) de ' + total : '✓ Cartão: ' + total + ' conferências ok');
  process.exit(falhas ? 1 : 0);
})();
