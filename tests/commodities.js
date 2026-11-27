/* Testes da "variação do dia com uma base só" para COMMODITIES (1.83.8, js/variacao.js: vdEscopo aceita futuros XX=F): ouro, Brent, prata, café, soja, minério, WTI, cobre, milho e gás natural.
   Faixa, cartão do Mercado, título da página, "Fech. ant." e linha pontilhada do 1D mostram o MESMO valor, com base no fechamento diário do pregão anterior (nunca o último ponto de 5 min de ontem).
   Na 1.83.7 C1, C2, C3 e C6 FALHAM (o título usa uma base e "Fech. ant."/linha outra). Dados sintéticos com os números reais de 25→27/11 (Brent 94,61 → 90,84; ouro 3535,80 → 3668,50).
   Uso: node tests/commodities.js    --mutantes    --medir (imprime a tabela antes/depois)    --gravar (SÓ na árvore ANTERIOR, 1.83.7: fixa o que não pode mudar) */
const path = require('path'), fs = require('fs'), cp = require('child_process'), crypto = require('crypto');
const { chromium } = require('playwright');
const RAIZ = process.env.APORTE_APP_DIR || path.resolve(__dirname, '..'), APP = 'file://' + path.join(RAIZ, 'index.html');
const arg = process.argv, GRAVAR = arg.includes('--gravar'), MEDIR = arg.includes('--medir'), ESP = path.join(__dirname, 'esperado-commodities.json');
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra).slice(0, 700)); } };
const T = (dia, hhmm) => Date.parse(dia + 'T' + hhmm + ':00-03:00');
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const MUTANTES = {
  'escopo-so-2-letras': ['js/variacao.js', '/^[A-Z]{2,3}=F$/', '/^[A-Z]{2}=F$/'],
  'escopo-sem-commodities': ['js/variacao.js', '||/^[A-Z]{2,3}=F$/.test(sym)', ''],
  'fech-ant-volta-ao-arquivo': ['js/variacao.js', 'v=v||{pct:null,abs:null,base:null};return {pct:v.pct,abs:v.abs,fo:vdFo(fo,v.base),ant:v.base}}', 'v=v||{pct:null,abs:null,base:null};return {pct:v.pct,abs:v.abs,fo:fo,ant:fo.prev}}'],
  'sem-base-usa-arquivo': ['js/variacao.js', 'b=vdBase(sym,x.k,vdDiaSessao(fv,fo),1);return b>0&&preco>0?{pct:(preco/b-1)*100,abs:preco-b,base:b}:null}', 'b=vdBase(sym,x.k,vdDiaSessao(fv,fo),1)||fo.prev;return b>0&&preco>0?{pct:(preco/b-1)*100,abs:preco-b,base:b}:null}'],
  'preco-zero-vira-100': ['js/variacao.js', 'return b>0&&preco>0?{pct:(preco/b-1)*100,abs:preco-b,base:b}:null}\n/* cópia', 'return b>0?{pct:(preco/b-1)*100,abs:preco-b,base:b}:null}\n/* cópia'],
  'base-do-proprio-dia': ['js/variacao.js', 'if(r&&r[0]<dia&&r[0]>bd)', 'if(r&&r[0]<=dia&&r[0]>bd)'],
  'faixa-muda-de-base': ['js/mercado-setores.js', 'p:(t.it[i][1]/t.it[i][2]-1)*100,at:t.ts*1000}', 'p:(t.it[i][1]/(t.it[i][2]*1.01)-1)*100,at:t.ts*1000}'],
  'cartao-nao-zera-parado': ['js/atualizacao.js', 'if(x.src===\'cmd\')return cmeParado();', 'if(x.src===\'cmd\')return false;'],
  'pagina-so-a-primeira': ['js/variacao.js', '!fo||!vdEscopo(sym))return null;\n  var v=same?', '!fo||sym!==\'GC=F\')return null;\n  var v=same?'],
};
const PRE = () => {
  window.__arq = function (sym, pts, prev) { var p = pts.map(function (q) { return [q[0] / 1000, q[1]]; }); FIN['intra/' + sym] = { d: { p: p, prev: prev, off: -18000, ext: 0, at: p[p.length - 1][0], o: p[0][1], h: 99999, l: 0.01, cur: 'USD' }, at: Date.now() }; };
  window.__cfg = function (ts, tape, daily) { MD.d = { at: Date.now(), tape: { ts: ts / 1000, it: tape }, hist: {}, idx: {} }; S.trades = []; S.watch = []; S.quotes = {}; MKT.q = {}; MKT.idx = {}; TPTS = 0; if (typeof PXM !== 'undefined') PXM = {}; if (typeof PXI !== 'undefined') PXI = {}; STKC = {}; window.loadMD = function () { }; Object.keys(daily).forEach(function (k) { var d = daily[k]; MD.d.idx[k] = { d: d.rows, w: d.rows, name: k, cur: 'USD', last: d.rows.length ? d.rows[d.rows.length - 1][1] : 0, sym: d.sym }; }); };
  window.__pag = function (k) { window.__fo = undefined; var lc = window.lineChart; window.lineChart = function (h, c, x, f, fo) { window.__fo = fo && fo.prev; return lc.apply(this, arguments); }; try { idxOpen(k); STK.rng = '1d'; idxRender(); } finally { window.lineChart = lc; } var t = document.getElementById('stk-b').textContent.replace(/\s+/g, ' '); var r = { t: t, fo: window.__fo }; try { stkClose(); } catch (e) { } return r; };
  window.__lin = function (lbl) { var it = tapeItems().filter(function (x) { return x.l === lbl; })[0]; return it ? it.p : undefined; };
};
async function novo(b, dia, hhmm) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' }), p = await ctx.newPage(), erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await ctx.route(u => !/^(file|data):/.test(u.toString()), r => r.abort());
  await p.addInitScript(() => { window.__APORTE_TESTE__ = true; });
  await p.clock.setFixedTime(new Date(T(dia, hhmm)));
  await p.goto(APP); await p.waitForFunction(() => window.__aporte); await p.waitForTimeout(900); await p.evaluate(PRE);
  p.__erros = erros; return p;
}
const sec = async (n, f) => { try { await f(); } catch (e) { ok('Bloco "' + n + '" não rodou: ' + String(e.message).split('\n')[0].slice(0, 160), false); } };
/* k = chave do app; s = símbolo; tp = rótulo da faixa (ou null); v = preço de 27/11 (barra diária); pv = fechamento de 25/11; f5 = último ponto de 5 min da noite de 25/11 ("prev" do arquivo, base antiga) */
const CM = [
  { k: 'GLD', s: 'GC=F', tp: 'OURO', v: 3668.5, pv: 3535.8, f5: 3620.4 }, { k: 'brent', s: 'BZ=F', tp: 'PETRÓLEO', v: 90.84, pv: 94.61, f5: 91.17 },
  { k: 'silver', s: 'SI=F', tp: 'PRATA', v: 43.702, pv: 40.052, f5: 42.085 }, { k: 'coffee', s: 'KC=F', tp: 'CAFÉ', v: 2.7568, pv: 2.7579, f5: 2.69 },
  { k: 'soy', s: 'ZS=F', tp: 'SOJA', v: 12.66, pv: 12.44, f5: 12.43 }, { k: 'iron', s: 'TIO=F', tp: 'MINÉRIO', v: 104.2, pv: 102.5, f5: 103.1 },
  { k: 'wti', s: 'CL=F', tp: null, v: 83.08, pv: 83.68, f5: 82.9 }, { k: 'copper', s: 'HG=F', tp: null, v: 5.1, pv: 5.0, f5: 5.04 },
  { k: 'corn', s: 'ZC=F', tp: null, v: 4.45, pv: 4.4, f5: 4.43 }, { k: 'natgas', s: 'NG=F', tp: null, v: 3.2, pv: 3.35, f5: 3.3 }];
const pf2 = n => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (a, b) => (a / b - 1) * 100, perto = (a, b) => a != null && Math.abs(a - b) < 0.011;
const pg = t => { var m = t.match(/\((\d+,\d+)%\)\s*([↑↓])/); return m ? (m[2] === '↓' ? -1 : 1) * parseFloat(m[1].replace(',', '.')) : null; };
/* monta o cenário: hoje = dia (número), anterior = dia do pregão anterior, hh = hora de Brasília do "agora" */
function cenario(cm, dias, opc) {
  opc = opc || {}; const tapeIt = [], daily = {}, arq = [], dh = dias.hoje, dp = dias.ant, ts = dias.ts, base = dh * 86400;
  CM.forEach(c => {
    const v = opc.zero === c.k ? 0 : c.v;
    if (c.tp && !opc.semTape) tapeIt.push([c.tp, v, opc.semBase ? 0 : c.pv, 'USD', 'i', c.k]);
    const rows = (opc.semBarras || opc.semBase) ? [[dh - 40, c.pv * 0.9], [dh - 39, c.pv * 0.91]] : (opc.semHoje ? [[dp - 1, c.pv * 0.99], [dp, c.pv]] : [[dp - 1, c.pv * 0.99], [dp, c.pv], [dh, c.v]]);
    daily[c.k] = { sym: c.s, rows };
    const pts = [[(dh * 86400 + 4 * 3600 + 55 * 60) * 1000 - 86400000, c.f5]]; for (let i = 0; i < 12; i++) pts.push([(dh * 86400 + (14.5 + i * .5) * 3600) * 1000, c.v * (1 + (i - 6) * 0.0004)]); pts.push([(dh * 86400 + 18.5 * 3600) * 1000, c.v]);
    arq.push([c.s, pts, c.f5]);
  });
  return { ts, tapeIt, daily, arq };
}
const rodar = (p, cen) => p.evaluate(([cen, CM]) => { __cfg(cen.ts, cen.tapeIt, cen.daily); cen.arq.forEach(function (a) { __arq(a[0], a[1], a[2]); });
  var o = {}; CM.forEach(function (c) { var x = idxDef(c.k), e = idxVal(x); o[c.k] = { faixa: c.tp ? __lin(c.tp) : undefined, cartao: e ? e.p : null, pag: __pag(c.k) }; }); return o; }, [cen, CM]);
const D = { pos: { hoje: 20784, ant: 20782 }, nor: { hoje: 20781, ant: 20780 }, fds: { hoje: 20784, ant: 20782 } };
async function principal(b) {
  /* C1/C2: depois do feriado dos EUA (27/11 19:00; 26/11 sem pregão): pregão anterior = 25/11 */
  const p = await novo(b, '2026-11-27', '17:30');
  let r1;
  await sec('C1 depois do feriado', async () => {
    r1 = await rodar(p, cenario(CM, Object.assign({ ts: T('2026-11-27', '17:30') }, D.pos)));
    CM.forEach(c => { const e = pct(c.v, c.pv), o = r1[c.k], t = o.pag.t;
      if (c.tp) ok('C1 ' + c.k + ': faixa = cartão = título = ' + pf2(e) + '%', perto(o.faixa, e) && perto(o.cartao, e) && perto(pg(t), e), [o.faixa, o.cartao, pg(t), e]);
      else ok('C2 ' + c.k + ': cartão = título = ' + pf2(e) + '%', perto(o.cartao, e) && perto(pg(t), e), [o.cartao, pg(t), e]);
      ok('C1 ' + c.k + ': "Fech. ant." = ' + pf2(c.pv) + ' e linha pontilhada = ' + pf2(c.pv) + ' (não ' + pf2(c.f5) + ')', new RegExp('Fech\\. ant\\.' + pf2(c.pv).replace(/\./g, '\\.')).test(t) && o.pag.fo != null && Math.abs(o.pag.fo - c.pv) < 1e-6, [t.slice(0, 260), o.pag.fo]); });
  });
  /* C3: dia normal (24/11 18:00, pregão anterior 23/11) */
  await sec('C3 dia normal', async () => {
    await p.clock.setFixedTime(new Date(T('2026-11-24', '17:30')));
    const r = await rodar(p, cenario(CM, Object.assign({ ts: T('2026-11-24', '17:30') }, D.nor)));
    CM.forEach(c => { const e = pct(c.v, c.pv), o = r[c.k], t = o.pag.t;
      ok('C3 ' + c.k + ' dia normal: título = ' + pf2(e) + '% e "Fech. ant." = ' + pf2(c.pv), perto(pg(t), e) && new RegExp('Fech\\. ant\\.' + pf2(c.pv).replace(/\./g, '\\.')).test(t) && Math.abs(o.pag.fo - c.pv) < 1e-6, [pg(t), t.slice(0, 200), o.pag.fo]); });
  });
  /* C4: fim de semana (sábado 28/11): mercado parado, variação zerada como na faixa; a base continua sendo o fechamento (nunca o arquivo de 5 min) */
  await sec('C4 fim de semana', async () => {
    await p.clock.setFixedTime(new Date(T('2026-11-28', '12:00')));
    const r = await rodar(p, cenario(CM, Object.assign({ ts: T('2026-11-28', '12:00') }, D.fds)));
    CM.forEach(c => { const o = r[c.k], t = o.pag.t;
      ok('C4 ' + c.k + ' sábado: cartão e título zerados e "Fech. ant." = ' + pf2(c.pv), (o.cartao === 0 || o.cartao === null) && (pg(t) == null || pg(t) === 0) && !/indisponível/.test(t) && new RegExp('Fech\\. ant\\.' + pf2(c.pv).replace(/\./g, '\\.') + '(?!\\d)').test(t) && o.pag.fo != null && Math.abs(o.pag.fo - c.pv) < 1e-6, [o.cartao, pg(t), t.slice(0, 200)]); });
  });
  /* C5: sem base confiável (faixa sem fechamento anterior e barras diárias velhas demais): só o preço, sem percentual e sem voltar ao arquivo de 5 min (as 4 sem faixa mostram o último fechamento do robô como o cartão, igual à 1.83.7) */
  await sec('C5 sem base', async () => {
    await p.clock.setFixedTime(new Date(T('2026-11-27', '17:30')));
    const r = await rodar(p, cenario(CM, Object.assign({ ts: T('2026-11-27', '17:30') }, D.pos), { semBase: true }));
    CM.filter(c => c.tp).forEach(c => { const o = r[c.k], t = o.pag.t;
      ok('C5 ' + c.k + ' sem base: "indisponível", sem percentual, sem ' + pf2(c.f5) + ' do arquivo', /Variação de hoje indisponível/.test(t) && pg(t) == null && !new RegExp('Fech\\. ant\\.' + pf2(c.f5).replace(/\./g, '\\.') + '(?!\\d)').test(t) && o.pag.fo == null, [t.slice(0, 220), o.pag.fo]); });
  });
  /* C6: preço zero: nada de −100% */
  await sec('C6 preço zero', async () => {
    const r = await rodar(p, cenario(CM, Object.assign({ ts: T('2026-11-27', '17:30') }, D.pos), { zero: 'brent' }));
    const t = r.brent.pag.t;
    ok('C6 Brent com preço 0: sem −100% e sem erro', !/100,00%/.test(t) && !/NaN|Infinity/.test(t), t.slice(0, 220));
  });
  /* C7: pregão aberto, sem a barra de hoje ainda (só medido: o que a página mostra) */
  if (MEDIR) {
    const rr = await rodar(p, cenario(CM, Object.assign({ ts: T('2026-11-27', '17:30') }, D.pos), { semHoje: true }));
    console.log('MEDIR-SEM-BARRA-DE-HOJE ' + JSON.stringify(CM.map(c => [c.k, rr[c.k].faixa, rr[c.k].cartao, pg(rr[c.k].pag.t), (rr[c.k].pag.t.match(/Fech\. ant\.([\d,.]+)/) || [])[1], rr[c.k].pag.fo])));
    console.log('MEDIR-POS-FERIADO ' + JSON.stringify(CM.map(c => [c.k, r1[c.k].faixa, r1[c.k].cartao, pg(r1[c.k].pag.t), (r1[c.k].pag.t.match(/Fech\. ant\.([\d,.]+)/) || [])[1], r1[c.k].pag.fo])));
  }
  /* C8: nada mais mudou: faixa, cartão, compute, localStorage, S e as páginas de outros ativos iguais à 1.83.7 */
  await sec('C8', async () => {
    const r = await p.evaluate(([cen]) => { __cfg(cen.ts, cen.tapeIt, cen.daily); cen.arq.forEach(function (a) { __arq(a[0], a[1], a[2]); }); render();
      var it = tapeItems().map(function (x) { return [x.l, x.v, x.p]; }), cart = ['GLD', 'brent', 'silver', 'coffee', 'soy', 'iron', 'wti', 'copper', 'corn', 'natgas', 'tnx', 'ibov', 'usd'].map(function (k) { var e = idxVal(idxDef(k)); return [k, e && e.v, e && e.p]; });
      var rate = {}; try { rate.tnx = (function () { MD.d.idx.tnx = { d: [[20780, 4.8], [20784, 4.9]], w: [[20780, 4.8], [20784, 4.9]], name: 'tnx', cur: 'USD', last: 4.9, sym: '^TNX' }; idxOpen('tnx'); STK.rng = '1d'; idxRender(); var t = document.getElementById('stk-b').textContent.replace(/\s+/g, ' '); stkClose(); return t; })(); } catch (e) { rate.tnx = 'erro ' + e.message; }
      return { faixa: JSON.stringify(it), cartao: JSON.stringify(cart), compute: JSON.stringify(compute()), S: JSON.stringify([S.fx, S.trades, S.quotes]), ls: Object.keys(localStorage).sort().join('|'), tnx: rate.tnx }; }, [cenario(CM, Object.assign({ ts: T('2026-11-27', '17:30') }, D.pos))]);
    const res = { faixa: sha(r.faixa), cartao: sha(r.cartao), compute: sha(r.compute), S: sha(r.S), ls: sha(r.ls), tnx: sha(r.tnx) };
    if (GRAVAR) { fs.writeFileSync(ESP, JSON.stringify(res, null, 1) + '\n'); console.log('gravado', ESP); }
    else if (fs.existsSync(ESP)) { const e = JSON.parse(fs.readFileSync(ESP, 'utf8')); Object.keys(e).forEach(k => ok('C8 ' + k + ' idêntico à 1.83.7', res[k] === e[k], [k, res[k], e[k]])); }
    else ok('snapshot tests/esperado-commodities.json existe', false);
  });
  ok('sem erro de JavaScript na página', p.__erros.length === 0, p.__erros);
  await p.context().close();
}
(async () => {
  if (arg.includes('--mutantes')) {
    let fraco = 0; const nomes = Object.keys(MUTANTES);
    nomes.forEach(n => {
      const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mutm-')), [f, a, b2] = MUTANTES[n];
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
  console.log(falhas ? '✗ Commodities: ' + falhas + ' falha(s) de ' + total : '✓ Commodities: ' + total + ' conferências ok'); process.exit(falhas ? 1 : 0);
})();
