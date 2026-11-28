/* Conferências de tests/valor-dolar.js */
module.exports = async function (b, ok, X, ARQ) {
  const { abrir, SNAP, lerCom, fmt, norm, brN, ig, RAIZ, DADOS, ESP, arg, val } = X, fs = require('fs'), cp = require('child_process'), path = require('path');
  if (arg.includes('--mutantes')) return mutantes(RAIZ, ARQ, fs, cp, path);
  const pg = await abrir(b), esp = JSON.parse(fs.readFileSync(ESP, 'utf8')).sint, snap = await pg.evaluate(SNAP);
  /* 6. antes × depois (1.87.0): nada mais mudou */
  const dif = k => JSON.stringify(snap[k]) === JSON.stringify(esp[k]);
  ok('V6 compute() (T, held, closed) e localStorage idênticos à 1.87.0', dif('tot') && dif('held') && dif('closed') && dif('ls'), ['tot', 'held', 'ls'].filter(k => !dif(k)));
  ok('V6 HTML das linhas em reais idêntico byte a byte; aria-labels, cabeçalho e colunas iguais', dif('brRows') && snap.brRows.length === 2 && dif('nhd') && dif('cols') && JSON.stringify(snap.aria.filter(a => !/EUA/.test(a))) === JSON.stringify(esp.aria.filter(a => !/EUA/.test(a))), [snap.brRows.length, esp.brRows.length]);
  const L = await lerCom(pg), Us = L.us;
  /* 1. linhas */
  Us.forEach(u => { const r = L.rows[u.tk]; ok('V1 ' + u.tk + ': 2ª linha = US$ qty×P1 no formato (mil/mi)', r && r.sm.length === 2 && r.sm[1] === fmt(u.qty * u.P1), [r && r.sm, fmt(u.qty * u.P1)]); });
  ok('V1 formatos: US$ 246,90 · US$ 1,2 mil · US$ 500 mil · US$ 1,23 mi', ['SMLX', 'VTX', 'BIGX', 'MILX'].map(k => L.rows[k].sm[1]).join('|') === 'US$ 246,90|US$ 1,2 mil|US$ 500 mil|US$ 1,23 mi', ['SMLX', 'VTX', 'BIGX', 'MILX'].map(k => L.rows[k].sm[1]));
  ok('V1 ativos em reais NÃO têm US$ e ficam com 1 linha', ['ABCD3', 'EFGH3'].every(k => L.rows[k].sm.length === 1 && !/US\$/.test(L.rows[k].sm[0])), [L.rows.ABCD3, L.rows.EFGH3]);
  /* 2. igualdade com Desempenho */
  const sU = Us.reduce((a, u) => a + u.qty * u.P1, 0), bal = norm(L.bal).match(/você tem (US\$ [\d.,]+)\./);
  ok('V2 Σ US$ das linhas = "você tem US$ X" do ⓘ de Desempenho (R$ 0,00)', bal && ig(brN(bal[1]), sU) && ig(Us.reduce((a, u) => a + brN(L.rows[u.tk].sm[1].indexOf('mil') < 0 && L.rows[u.tk].sm[1].indexOf('mi') < 0 ? L.rows[u.tk].sm[1] : 'US$ 0,00'), 0), 246.9 + 0), [bal && bal[1], sU]);
  Us.forEach(u => ok('V2 ' + u.tk + ': US$ × dólar de hoje = coluna Valor em reais (≤ R$ 0,01)', ig(u.qty * u.P1 * L.fx, brN(L.rows[u.tk].vr), 0.011), [u.qty * u.P1 * L.fx, L.rows[u.tk].vr]));
  /* 3. cabeçalho */
  ok('V3 cabeçalho "Nos EUA: US$ X" (Todos) = Σ EUA', L.dets.includes('Nos EUA: ' + fmt(sU)), [L.dets, fmt(sU)]);
  const LB = await lerCom(pg, 'BR'), LU = await lerCom(pg, 'US');
  ok('V3 filtro "Ações": some o "Nos EUA"; filtro "ETFs Intern.": = Σ das linhas', !LB.dets.some(d => /Nos EUA/.test(d)) && LU.dets.includes('Nos EUA: ' + fmt(sU)) && Object.keys(LU.rows).length === 4, [LB.dets, LU.dets]);
  /* 4. sem cotação: usa o preço médio, igual a Desempenho, sem NaN */
  const pn = await abrir(b); await pn.evaluate(() => { delete S.quotes.VTX; });
  const LN = await lerCom(pn), vt = LN.us.find(u => u.tk === 'VTX'), balN = norm(LN.bal).match(/você tem (US\$ [\d.,]+)\./), sN = LN.us.reduce((a, u) => a + u.qty * u.P1, 0);
  ok('V4 sem cotação do VT: US$ = qty × preço médio (US$ 1,0 mil), igual a Desempenho, sem NaN/undefined', Math.abs(vt.P1 - vt.pm) < 1e-9 && LN.rows.VTX.sm[1] === fmt(vt.qty * vt.pm) && balN && ig(brN(balN[1]), sN) && !/NaN|undefined/.test(LN.txt), [LN.rows.VTX.sm, balN && balN[1]]);
  const NN = await pn.evaluate(() => { const h = atvTable({ tot: { fxNow: 5.8 }, held: [{ p: { market: 'US', ticker: 'NANX', qty: NaN, cN: 1, cB: 1 }, P1: 1, v: NaN }, { p: { market: 'US', ticker: 'OKX', qty: 2, cN: 200, cB: 1000 }, P1: 150, v: 1740 }] }); const d = new DOMParser().parseFromString(h, 'text/html'); return { cab: d.querySelector('.atv .grp').textContent.replace(/\s+/g, ' '), sm: [...d.querySelectorAll('.an')].map(a => a.textContent.replace(/\s+/g, ' ')) }; });
  ok('V4 valor que não é número: sem "US$ NaN" (a 2ª linha some); o outro ativo segue com US$ 300,00', !/NaN/.test(NN.cab.replace(/R\$ NaN em/, '')) && /Nos EUA: US\$ 300,00/.test(NN.cab) && NN.sm.find(x => /^NA?NANX|NANX/.test(x)).indexOf('US$') < 0 && /US\$ 300,00/.test(NN.sm.find(x => /OKX/.test(x))), NN);
  { const pw = await abrir(b, { larga: 1 }), rw = await lerCom(pw); ok('V5 fonte larga (DejaVu Sans, a do CI): "US$ 500 mil" e "US$ 1,23 mi" sem reticências', Object.keys(rw.rows).every(k => rw.rows[k].ok), Object.keys(rw.rows).filter(k => !rw.rows[k].ok)); await pw.close(); }
  /* 5. 360 px, zoom 1,3, fonte 130%, 3 temas */
  for (const tema of ['', 'branco', 'preto']) for (const [z, f] of [[0, ''], [1.3, ''], [0, '130%']]) {
    const p = await abrir(b, { tema: tema, zoom: z, fonte: f }), r = await lerCom(p);
    ok('V5 360 px, ' + (z ? 'zoom 1,3' : f ? 'fonte 130%' : '100%') + ', tema ' + (tema || 'azul') + ': nada estoura; "US$ 500 mil" sem reticências; linhas em reais com a mesma altura', r.w <= (z ? 3 : 0) && Object.keys(r.rows).every(k => r.rows[k].ok) && r.rows.ABCD3.h === r.rows.EFGH3.h && r.rows.VTX.h > r.rows.ABCD3.h, [r.w, Object.keys(r.rows).filter(k => !r.rows[k].ok), r.rows.ABCD3.h, r.rows.VTX.h]);
    if (!tema && !z && !f) await p.screenshot({ path: '/tmp/p1/vd-360.png' }); if (tema === 'preto' && f) await p.screenshot({ path: '/tmp/p1/vd-130-preto.png' }); await p.close();
  }
  ok('V0 versão 1.87.1, arquivo novo no index.html e no sw.js, sem erro de JS', await pg.evaluate(() => VERSAO) === '1.87.1' && /js\/valor-dolar\.js/.test(fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8')) && /js\/valor-dolar\.js/.test(fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8')) && pg.__erros.length === 0 && pn.__erros.length === 0, [pg.__erros, pn.__erros]);
  /* 7. carteira real (fora do repositório) */
  if (DADOS) { const { abrirReal } = require('./lib-real.js'), pr = await abrirReal(b, DADOS, { width: 400, height: 900 }), sr = await pr.evaluate(SNAP);
    if (arg.includes('--real-antes')) { const a = JSON.parse(fs.readFileSync(val('--real-antes'), 'utf8')); ok('V7 real: patrimônio, custo, XIRR, T, posições, localStorage e HTML das linhas em reais IDÊNTICOS à 1.87.0', ['tot', 'held', 'closed', 'ls', 'brRows', 'aria'].every(k => k === 'aria' ? JSON.stringify(sr.aria.filter(x => !/EUA/.test(x))) === JSON.stringify(a.aria.filter(x => !/EUA/.test(x))) : JSON.stringify(sr[k]) === JSON.stringify(a[k])), ['tot', 'held', 'ls', 'brRows'].filter(k => JSON.stringify(sr[k]) !== JSON.stringify(a[k]))); }
    const LR = await lerCom(pr), vtR = LR.us.find(u => u.tk === 'VT'), balR = norm(LR.bal).match(/você tem (US\$ [\d.,]+)\./), sR = LR.us.reduce((a, u) => a + u.qty * u.P1, 0);
    ok('V7 real: VT em US$ na lista = "você tem US$ X" de Desempenho (R$ 0,00) e a 2ª linha usa o formato', vtR && balR && ig(brN(balR[1]), sR) && LR.rows.VT.sm[1] === fmt(vtR.qty * vtR.P1) && LR.dets.includes('Nos EUA: ' + fmt(sR)), [balR && balR[1], LR.rows.VT && LR.rows.VT.sm, LR.dets]);
    if (arg.includes('--mostrar')) console.log('REAL:', JSON.stringify({ vtUS: vtR && vtR.qty * vtR.P1, desempenho: balR && balR[1], linha: LR.rows.VT && LR.rows.VT.sm, cab: LR.dets, patr: sr.tot.value + sr.tot.cash, custo: sr.tot.cost, xirr: sr.tot.xirr, gain: sr.tot.gain, vtR$: LR.rows.VT && LR.rows.VT.vr })); await pr.close(); }
};
function mutantes(RAIZ, ARQ, fs, cp, path) {
  const C = 'js/carteira.js', M = [['a: usa r.v (R$) como US$', C, 'vU:us?x.p.qty*x.P1:null', 'vU:us?x.v:null'], ['b: divide r.v por fx duas vezes', C, 'vU:us?x.p.qty*x.P1:null', 'vU:us?x.v/fx/fx:null'], ['c: usa preço médio no lugar de P1', C, 'vU:us?x.p.qty*x.P1:null', 'vU:us?x.p.qty*pm:null'],
    ['d: mostra US$ em ativo BR', C, "(r.us&&isFinite(r.vU)?'<small class=\"du\">'", "(isFinite(r.v)?'<small class=\"du\">'"], ['e: cabeçalho soma também os BR', C, 's+(r.us&&isFinite(r.vU)?r.vU:0)', 's+(isFinite(r.vU)?r.vU:r.v)'], ['f: troca "mil" por valor cheio', 'js/valor-dolar.js', "v<1e5?'US$ '+num(v/1e3,1)+' mil'", 'v<1e5?usd.format(v)'],
    ['g: tira a guarda de número finito', C, "(r.us&&isFinite(r.vU)?'<small class=\"du\">'", "(r.us?'<small class=\"du\">'"], ['h: junta R$ e US$ na mesma linha', C, "<small>'+vk+'</small>'+(r.us&&isFinite(r.vU)?'<small class=\"du\">'+usdK(r.vU)+'</small>':'')", "<small>'+vk+(r.us&&isFinite(r.vU)?' · '+usdK(r.vU):'')+'</small>'"]];
  let vivos = 0;
  M.forEach(m => { const d = '/tmp/mut-vd'; cp.execSync('rm -rf ' + d + ' && mkdir -p ' + d + ' && cp -r ' + RAIZ + '/. ' + d + '/ && rm -rf ' + d + '/.git ' + d + '/node_modules'); const f = path.join(d, m[1]), t = fs.readFileSync(f, 'utf8');
    if (!t.includes(m[2])) { console.log('? sem alvo:', m[0]); vivos++; return; } fs.writeFileSync(f, t.replace(m[2], m[3])); let morto = false; try { cp.execSync('APORTE_APP_DIR=' + d + ' node ' + ARQ, { stdio: 'pipe', cwd: RAIZ }); } catch (e) { morto = true; }
    console.log(morto ? '✓ pego:' : '✗ VIVO:', m[0]); if (!morto) vivos++; });
  console.log(vivos ? '✗ ' + vivos + ' mutante(s) vivo(s)' : '✓ os 8 mutantes foram pegos'); process.exit(vivos ? 1 : 0);
}
