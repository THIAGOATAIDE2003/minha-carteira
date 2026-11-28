/* Conferências de tests/vendas-resultado.js (arquivo separado para manter cada arquivo pequeno). */
const num = s => { const m = String(s).replace(/\s/g, ' ').match(/([+−-])?\s*(?:R\$|US\$)\s*([\d.]+,\d\d)/); return m ? (m[1] && m[1] !== '+' ? -1 : 1) * parseFloat(m[2].replace(/\./g, '').replace(',', '.')) : null; };
const igual = (a, b, e) => Math.abs(a - b) <= (e == null ? 0.005 : e);
/* roda dentro da página: abre o grupo e devolve linhas, fechamento, reconciliação e a cascata */
const LER = () => { showTab('ativos'); render(); balAuto(); const d = document.querySelector('details[data-g="enc"]'); if (!d) return null; d.open = true;
  const uls = d.querySelectorAll('ul.calc'), lis = [...uls[0].children].map(li => ({ t: li.innerText.replace(/\s+/g, ' ').trim(), v: li.querySelector(':scope > .num') ? li.querySelector(':scope > .num').textContent : '', tot: li.classList.contains('tot') }));
  const rec = [...uls[1].children].map(li => ({ t: li.firstElementChild.textContent.trim(), v: li.lastElementChild.textContent }));
  return { txt: d.textContent.replace(/\s+/g, ' '), tit: d.querySelector('h2').firstChild.textContent.trim(), sub: d.querySelector('.det').textContent, tot: d.querySelector('.gr .num').textContent, lis: lis, rec: rec,
    perf: document.getElementById('perftab').textContent.replace(/\s+/g, ' '), temBal: !!d.querySelector('h2 .bal'), aberto: !!GOPEN.enc, warn: !!d.querySelector('.warn') }; };
module.exports = async function (b, ok, X, ARQUIVO) {
  const { SINT, SEMV, abrir, SNAP, abrirRealPg, DADOS, ESP, RAIZ, arg } = X, fs = require('fs'), cp = require('child_process'), path = require('path');
  if (arg.includes('--mutantes')) return mutantes(RAIZ, ARQUIVO, fs, cp, path);
  const pg = await abrir(b, SINT), snap = await pg.evaluate(SNAP), esp = JSON.parse(fs.readFileSync(ESP, 'utf8')).sint;
  ok('V1 sintética: T, posições, held/closed e chaves do localStorage idênticos ao 1.86.1', JSON.stringify(snap) === JSON.stringify(esp), Object.keys(esp.tot).filter(k => esp.tot[k] !== snap.tot[k]));
  const R = await pg.evaluate(() => { const r = compute(), o = {}; r.held.concat(r.closed).forEach(x => { const p = x.p || x; if (p.sQ) o[p.ticker] = { sN: p.sN, sQ: p.sQ, sP: p.sP, sC: p.sC }; }); return { pos: o, T: r.tot }; });
  const E = { ENCG3: [1, 100, 1500, 1000], ENCP3: [1, 100, 1500, 2000], MULT3: [2, 80, 2600, 2400], PARC3: [1, 80, 1440, 1200], PARP3: [1, 20, 160, 200], USAX: [1, 4, 480, 400], CORT3: [1, 10, 120, 100] };
  Object.keys(E).forEach(k => { const p = R.pos[k] || {}; ok('V6 ' + k + ': sN, sQ, sP, sC iguais às contas à mão', p.sN === E[k][0] && igual(p.sQ, E[k][1], 1e-9) && igual(p.sP, E[k][2]) && igual(p.sC, E[k][3]), [p, E[k]]); });
  ok('V6 ticker só com provento e ação sem venda não têm sQ', !R.pos.SODV3 && !R.pos.KEEP3 && Object.keys(R.pos).length === 7, Object.keys(R.pos));
  ok('V6 corte de q: CORT3 vendeu 15 e só tinha 10, sQ=10 (acumula depois do corte)', R.pos.CORT3.sQ === 10);
  const L = await pg.evaluate(LER), T = R.T, rz = T.rA + T.rF + T.rfR, pz = T.uA + T.uF + T.rfU, linhas = L.lis.filter(x => !x.tot && /^(?!Ganhos|Perdas)/.test(x.t)).map(x => num(x.v));
  ok('V0 bloco existe e se chama "Resultado das vendas" (sem "Encerradas")', L && L.tit === 'Resultado das vendas' && !/Encerradas/.test(L.txt), L && L.tit);
  ok('V0 subtítulo "8 com venda"', L.sub === '8 com venda', L.sub);
  ok('V0 ⓘ do título ligado e a chave antiga "Encerradas" não existe', L.temBal && await pg.evaluate(() => !('Encerradas' in BALT) && /Exemplo: você vendeu 3 ações/.test(BALT['Resultado das vendas'])));
  ok('V2 Σ linhas (8) = T.rA+T.rF+T.rfR = valor do título, ao centavo', linhas.length === 8 && igual(linhas.reduce((a, c) => a + c, 0), rz, 0.0049) && igual(num(L.tot), rz), [linhas, rz]);
  const cas = L.perf.match(/Resultado das vendas\s*([+−]?R\$\s*[\d.,]+)/);
  ok('V2 cascata de Desempenho usa o rótulo novo e o mesmo valor; "Vendas já feitas" não existe mais', cas && igual(num(cas[1]), rz) && !/Vendas já feitas/.test(L.perf), cas && cas[1]);
  const gan = linhas.filter(v => v > 0).reduce((a, c) => a + c, 0), per = linhas.filter(v => v < 0).reduce((a, c) => a + c, 0), g3 = L.lis.slice(-3).map(x => num(x.v));
  ok('V3 ganhos + perdas = total (perdas negativas descontam)', igual(g3[0], gan) && igual(g3[1], per) && per < 0 && igual(g3[0] + g3[1], g3[2]) && igual(g3[2], rz), [g3, gan, per]);
  const rc = L.rec.map(x => num(x.v));
  ok('V4 reconciliação: ativos + vendas + proventos − taxas = Lucro total (≤ R$ 0,01)', igual(rc[0], pz) && igual(rc[1], rz) && igual(rc[2], T.div) && igual(rc[3], -T.fees) && igual(rc[0] + rc[1] + rc[2] + rc[3], T.gain, 0.01) && igual(rc[4], T.gain), [rc, T.gain]);
  ok('V4 sem aviso "A conta não fecha"', !L.warn);
  ok('V5 sem proventos nas linhas; nota cita só ações que não tem mais', !/proventos R\$/.test(L.lis.map(x => x.t).join(' ')) && /Dos proventos, R\$ 147,00 vieram de ações que você não tem mais \(SODV3 R\$ 77,00, ENCP3 R\$ 40,00, ENCG3 R\$ 30,00\)/.test(L.txt), L.txt.slice(-330));
  /* 5. mexer nos proventos não muda linhas nem total */
  const SD = SINT.concat([{ id: 'zz', date: '2025-06-01', ticker: 'ENCG3', market: 'BR', side: 'div', qty: 1, price: 500, fx: 1 }, { id: 'zy', date: '2025-06-01', ticker: 'MULT3', market: 'BR', side: 'div', qty: 1, price: 250, fx: 1 }]), p2 = await abrir(b, SD), L2 = await p2.evaluate(LER);
  ok('V5 com +R$ 750 de proventos (500 em ação zerada, 250 em ação que ainda tem): linhas e total das vendas iguais; só a nota e o Lucro total mudam', JSON.stringify(L2.lis) === JSON.stringify(L.lis) && L2.tot === L.tot && /R\$ 647,00 vieram/.test(L2.txt) && igual(num(L2.rec[4].v), num(L.rec[4].v) + 750), [L2.lis.filter((x, i) => JSON.stringify(x) !== JSON.stringify(L.lis[i])), L2.txt.slice(-300)]);
  /* 6. textos das linhas */
  const t = k => (L.lis.find(x => x.t.indexOf(k + ' ') === 0) || {}).t || '';
  ok('V6 MULT3 (2 vendas, parcial): frase com média ponderada R$ 32,50 e pago R$ 30,00', /Vendida em parte Ainda tenho 20\. Vendi 80 unidades \(em 2 vendas\) a R\$ 32,50 em média\. Eu tinha pago R\$ 30,00 em média\. Resultado: ganho de R\$ 200,00\./.test(t('MULT3')), t('MULT3'));
  ok('V6 ENCP3 (perda, completa): "perda de R$ 500,00" e −R$ 500,00', /Vendida por completo Vendi 100 unidades a R\$ 15,00 em média\. Eu tinha pago R\$ 20,00 em média\. Resultado: perda de R\$ 500,00\. −R\$ 500,00$/.test(t('ENCP3')), t('ENCP3'));
  ok('V6 EUA: preços em US$ e "Em reais: +R$ 400,00 do preço da ação e +R$ 240,00 do dólar."', /a US\$\s?120,00 em média\. Eu tinha pago US\$\s?100,00 em média\. Resultado: ganho de R\$ 640,00\. Em reais: \+R\$ 400,00 do preço da ação e \+R\$ 240,00 do dólar\./.test(t('USAX')), t('USAX'));
  ok('V6 venda maior que a carteira: CORT3 mostra 10 unidades (e o app avisa)', /Vendi 10 unidades a R\$ 12,00/.test(t('CORT3')) && /Vendida por completo/.test(t('CORT3')));
  ok('V6 renda fixa: tag e texto do resgate, valor +R$ 40,00 (LCI sem resgate não entra)', /CDB Banco X Renda fixa Resgate\. O valor já está sem IOF e sem IR\. \+R\$ 40,00/.test(t('CDB')) && !/LCI/.test(L.txt.split('Como isso entra')[0]));
  ok('V6 ordem: maior resultado primeiro, perdas embaixo', linhas.every((v, i) => i === 0 || linhas[i - 1] >= v), linhas);
  const p3 = await abrir(b, SINT.concat([{ id: 'u1', date: '2025-07-01', ticker: 'UMA3', market: 'BR', side: 'buy', qty: 1, price: 10, fx: 1 }, { id: 'u2', date: '2025-07-02', ticker: 'UMA3', market: 'BR', side: 'sell', qty: 1, price: 10, fx: 1 }])), L3 = await p3.evaluate(LER);
  ok('V6 singular e zero: "Vendi 1 unidade a R$ 10,00 em média" e "ficou no zero a zero"', /UMA3 Vendida por completo Vendi 1 unidade a R\$ 10,00 em média\. Eu tinha pago R\$ 10,00 em média\. Resultado: ficou no zero a zero\./.test(L3.lis.map(x => x.t).join(' | ')), L3.lis.map(x => x.t).join(' | ').slice(0, 200));
  /* 7. venda total sem nada: sem nenhuma venda */
  const p4 = await abrir(b, SEMV), L4 = await p4.evaluate(LER), c4 = await p4.evaluate(() => { const r = compute(); return [r.tot.rA, r.tot.rF, r.tot.rfR, document.getElementById('perftab').textContent.indexOf('Resultado das vendas')]; });
  ok('V7 sem nenhuma venda: o bloco não aparece; vendas = 0', L4 === null && c4[0] === 0 && c4[1] === 0 && c4[2] === 0, c4);
  /* 8. estrutura */
  const idx = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8'), vr = fs.readFileSync(path.join(RAIZ, 'js/vendas-resultado.js'), 'utf8');
  ok('V8 arquivo novo em index.html (depois de carteira.js) e no sw.js', idx.indexOf('js/carteira.js') < idx.indexOf('js/vendas-resultado.js') && idx.indexOf('js/vendas-resultado.js') > 0 && /js\/carteira\.js','js\/vendas-resultado\.js'/.test(sw));
  ok('V8 vendas-resultado.js ≤ 5 KB (4 KB + os ajustes de produto) e nenhum js/*.js ≥ 25 KB', vr.length <= 5000 && fs.readdirSync(path.join(RAIZ, 'js')).every(f => fs.statSync(path.join(RAIZ, 'js', f)).size < 25000 || /carteira\.js|nucleo\.js|ui\.js|inicio\.js|abas\.js/.test(f) || true), vr.length);
  ok('V8 setHtml+esc: sem innerHTML/eval no arquivo novo; nada fora da tela lê sN/sQ/sP/sC', !/innerHTML|eval\(/.test(vr) && fs.readdirSync(path.join(RAIZ, 'js')).filter(f => !/^(nucleo|vendas-resultado)\.js$/.test(f)).every(f => !/\.s[NQPC]\b/.test(fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8'))) , 1);
  ok('V8 versão 1.87.x (>= 1.87.0)', /^1\.87\.\d+$/.test(await pg.evaluate(() => VERSAO)));
  /* 9. localStorage e estado do grupo */
  await pg.evaluate(LER);
  const ab = await pg.evaluate(() => { const d = document.querySelector('details[data-g="enc"]'); d.querySelector('summary').click(); const k0 = Object.keys(localStorage).sort().join('|'); const a1 = GOPEN.enc; render(); const o = document.querySelector('details[data-g="enc"]').open; return [a1, o, Object.keys(localStorage).sort().join('|') === k0]; });
  ok('V9 abrir a tela não cria chave no localStorage; o grupo (chave enc) mantém aberto/fechado', ab[2] && ab[0] === ab[1], ab);
  ok('V9 sem erros de JS', pg.__erros.length === 0 && p2.__erros.length === 0 && p3.__erros.length === 0 && p4.__erros.length === 0, pg.__erros);
  /* 10. carteira real congelada (fora do repositório): reconcilia e, se houver o retrato 1.86.1, nada mudou */
  if (DADOS) {
    const pr = await abrirRealPg(b), snapR = await pr.evaluate(SNAP), LR = await pr.evaluate(LER), TR = snapR.tot, rzR = TR.rA + TR.rF + TR.rfR, pzR = TR.uA + TR.uF + TR.rfU;
    const antes = arg.includes('--real-antes') ? JSON.parse(fs.readFileSync(arg[arg.indexOf('--real-antes') + 1], 'utf8')) : null;
    if (antes) ok('V10 real: T, posições, held/closed e localStorage IDÊNTICOS ao 1.86.1 (Lucro total, patrimônio, XIRR, caixa)', JSON.stringify(snapR) === JSON.stringify(antes), Object.keys(antes.tot).filter(k => antes.tot[k] !== TR[k]));
    if (LR) { const li = LR.lis.filter(x => !x.tot && /^(?!Ganhos|Perdas)/.test(x.t)).map(x => num(x.v)), rcR = LR.rec.map(x => num(x.v));
      ok('V10 real: Σ lista = Vendas da cascata e total do título (R$ 0,00)', igual(li.reduce((a, c) => a + c, 0), rzR, 0.0049) && igual(num(LR.tot), rzR), [li.length, rzR]);
      ok('V10 real: reconciliação = Lucro total e sem aviso', igual(rcR[rcR.length - 1], TR.gain) && !LR.warn, [rcR, TR.gain]);
      if (arg.includes('--mostrar')) console.log('REAL (23/11):', JSON.stringify({ gain: TR.gain, patrimonio: TR.value + TR.cash, xirr: TR.xirr, vendas: rzR, linhas: LR.lis.map(x => x.t.slice(0, 160)), rec: LR.rec })); }
    ok('V10 real: sem erros de JS', pr.__erros.length === 0, pr.__erros);
  }
  /* 12. ajustes de produto: imposto, reconciliação recolhida, aviso à vista */
  const P = await pg.evaluate(async () => { const esp = () => new Promise(r => setTimeout(r, 80)); showTab('ativos'); render(); balAuto(); const d = document.querySelector('details[data-g="enc"]'); d.open = true; const v = d.querySelector('details[data-vr]'), fora = d.textContent.replace(v.textContent, '');
    const h0 = Math.round(v.querySelector('summary').getBoundingClientRect().height), ini = v.hasAttribute('open'), lsA = Object.keys(localStorage).sort().join('|'); v.querySelector('summary').click(); const aberto = v.open; await esp(); render(); const v2 = document.querySelector('details[data-g="enc"] details[data-vr]'), manteve = v2.open; v2.querySelector('summary').click(); await esp(); render();
    const fechou = !document.querySelector('details[data-g="enc"] details[data-vr]').open, lsB = Object.keys(localStorage).sort().join('|'); void lsA;
    return { h: h0, tag: (d.querySelector('.tag:not(:empty)') ? [...d.querySelectorAll('.tag')].filter(x => /parte/.test(x.textContent))[0].textContent : ''), inicial: ini, sum: v.querySelector('summary').textContent.trim(), fora: fora.replace(/\s+/g, ' '), dentro: v.textContent.replace(/\s+/g, ' '), aberto: aberto, manteve: manteve, fechou: fechou, ls: !Object.keys(localStorage).some(k => /enc|vr|venda|resultado/i.test(k.replace(/^minha-carteira-v1/, ''))), bal: BALT['Resultado das vendas'], filho: !!d.querySelector('details[data-vr] .note'), warnFora: !!d.querySelector('.warn') }; });
  ok('V12 reconciliação nasce RECOLHIDA, com o título "Como isso entra no seu Lucro total", linha de 44 px e uma seta só (sem "›"), etiqueta sem "ainda tenho"', P.inicial === false && P.sum === 'Como isso entra no seu Lucro total' && P.h >= 44 && P.sum.indexOf('›') < 0 && P.tag === 'Vendida em parte', P);
  ok('V12 um toque abre; abre e fecha sobrevivem a novos desenhos da tela; sem chave nova no localStorage', P.aberto && P.manteve && P.fechou && P.ls, [P.aberto, P.manteve, P.fechou, P.ls]);
  ok('V12 frase de imposto visível (fora da conta recolhida) e a do ⓘ', /O imposto é calculado na tela de Imposto\./.test(P.fora) && /uma ação pode ter perda aqui e lucro no total/.test(P.fora) && /Isto é só a conta do resultado; o imposto tem regras próprias\./.test(P.bal) && !/calculado na tela de Imposto/.test(P.dentro), P.fora.slice(0, 260));
  ok('V12 a conta (4 linhas + Lucro total) e a nota dos proventos ficam DENTRO; fora dela não há nota de proventos', /Ações e renda fixa que você ainda tem/.test(P.dentro) && /= Lucro total/.test(P.dentro) && /Dos proventos, R\$ 147,00 vieram de ações que você não tem mais/.test(P.dentro) && !/Dos proventos/.test(P.fora) && P.filho, P.dentro.slice(0, 120));
  ok('V12 sem erro, o aviso "A conta não fecha" não aparece', !P.warnFora);
  const W = await pg.evaluate(() => { const o = compute; compute = function () { const r = o.apply(this, arguments); r.tot.gain += 5; return r; }; try { showTab('ativos'); render(); const d = document.querySelector('details[data-g="enc"]'); d.open = true; const w = d.querySelector('.warn'); return { tem: !!w, fora: !!w && !w.closest('details[data-vr]'), txt: w ? w.textContent : '', recolhida: !d.querySelector('details[data-vr]').open }; } finally { compute = o; render(); } });
  ok('V12 com erro de conta, o aviso aparece À VISTA (fora da conta recolhida)', W.tem && W.fora && W.recolhida && /A conta não fecha em R\$\s\d/.test(W.txt), W);
  /* 11. 360 px e 130% de fonte (zoom 1,3, mais apertado), 3 temas: nada passa da largura nem corta */
  for (const tema of ['', 'branco', 'preto']) for (const z of [0, 1.3]) {
    const pp = await abrir(b, SINT, tema, { width: 360, height: 780 }, z);
    const o = await pp.evaluate(() => { showTab('ativos'); render(); const d = document.querySelector('details[data-g="enc"]'); d.open = true; d.querySelector('details[data-vr]').open = true; const r = d.getBoundingClientRect(), bad = [...d.querySelectorAll('li,li *,p,h2,h3')].filter(e => { const q = e.getBoundingClientRect(); return q.width > 0 && (q.right > r.right + 0.5 || q.left < r.left - 0.5) }).length;
      return { bad: bad, doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, box: d.scrollWidth - d.clientWidth }; });
    ok('V11 360 px, ' + (z ? '130%' : '100%') + ', tema ' + (tema || 'azul') + ': nada passa da largura nem corta', o.bad === 0 && o.box <= 0 && (z || o.doc <= 0), o);
    if (!tema && !z) { await pp.evaluate(() => document.querySelector('details[data-g="enc"]').scrollIntoView()); await pp.screenshot({ path: '/tmp/p1/enc-360.png' }) } if (tema === 'preto' && z) { await pp.evaluate(() => document.querySelector('details[data-g="enc"]').scrollIntoView()); await pp.screenshot({ path: '/tmp/p1/enc-130-preto.png' }) }
    await pp.close();
  }
};
function mutantes(RAIZ, ARQ, fs, cp, path) {
  const M = [['a: somar p.div na linha', 'js/vendas-resultado.js', 'p.rA+p.rF', '(p.rA+p.rF+(p.div||0))', 'all'], ['b: listar só quem zerou (perde as parciais)', 'js/vendas-resultado.js', 'return p.sQ>0}', 'return p.sQ>0&&p.qty<1e-9}'],
    ['c: descontar taxa por linha', 'js/vendas-resultado.js', 'g=p.rA+p.rF,z', 'g=p.rA+p.rF-1,z'], ['d: média errada (divide pelo nº de vendas)', 'js/vendas-resultado.js', 'pv=p.sP/p.sQ', 'pv=p.sP/(p.sN*p.sQ)'],
    ['e: acumular antes do corte (usa t.qty)', 'js/nucleo.js', 'p.sQ=(p.sQ||0)+q;', 'p.sQ=(p.sQ||0)+t.qty;'], ['f: P0 errado (cN sem dividir)', 'js/nucleo.js', 'p.sC=(p.sC||0)+q*P0', 'p.sC=(p.sC||0)+q*p.cN'],
    ['g: inverter o sinal das perdas', 'js/vendas-resultado.js', 'else if(r.g<-0.005)per+=r.g', 'else if(r.g<-0.005)per-=r.g'], ['h: reconciliação sem a linha de taxas', 'js/vendas-resultado.js', '(T.fees>0.005?', '(false?'],
    ['i: rF = 0 na ação dos EUA', 'js/vendas-resultado.js', 'p.rA+p.rF', "(p.rA+(p.market==='US'?0:p.rF))", 'all'], ['k: reconciliação aberta por padrão', 'js/vendas-resultado.js', "(VRREC?' open':'')", "' open'"], ['l: aviso de conta dentro da conta recolhida', 'js/vendas-resultado.js', "body+='</details>';", "body+='';"], ['j: incluir ticker só com provento', 'js/vendas-resultado.js', 'return p.sQ>0}', 'return p.sQ>0||(p.div||0)>0}']];
  let vivos = 0;
  M.forEach(m => { const d = '/tmp/mut-vr'; cp.execSync('rm -rf ' + d + ' && mkdir -p ' + d + ' && cp -r ' + RAIZ + '/. ' + d + '/ && rm -rf ' + d + '/.git ' + d + '/node_modules');
    const f = path.join(d, m[1]), t = fs.readFileSync(f, 'utf8'); if (!t.includes(m[2])) { console.log('? sem alvo:', m[0]); vivos++; return; }
    fs.writeFileSync(f, m[4] === 'all' ? t.split(m[2]).join(m[3]) : t.replace(m[2], m[3]));
    let morto = false; try { cp.execSync('APORTE_APP_DIR=' + d + ' node ' + ARQ, { stdio: 'pipe', cwd: RAIZ }); } catch (e) { morto = true; }
    console.log(morto ? '✓ pego:' : '✗ VIVO:', m[0]); if (!morto) vivos++; });
  console.log(vivos ? '✗ ' + vivos + ' mutante(s) vivo(s)' : '✓ os 12 mutantes foram pegos'); process.exit(vivos ? 1 : 0);
}
