/* Testes do parecer da IA (js/parecer-nucleo.js e js/parecer.js): node tests/parecer.js — a IA é simulada, sem rede */
const path = require('path');
const { chromium } = require('playwright');
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('✗', nome, extra === undefined ? '' : JSON.stringify(extra)); } };
(async () => {
  const b = await chromium.launch(), p = await b.newPage(), erros = [];
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(APP); await p.waitForTimeout(800);
  const E = (f, a) => p.evaluate(f, a);
  /* números */
  const n = await E(() => parNums('R$ 1.234,5 e 5,89, 71%, 3T26, −4,2 p.p.').map(x => [x.v, x.d]));
  ok('extrai números em português (milhar, vírgula, trimestre, sinal)', JSON.stringify(n) === JSON.stringify([[1234.5, 1], [5.89, 2], [71, 0], [3, 0], [26, 0], [4.2, 1]]), n);
  /* pacote falso */
  await E(() => {
    PARON = true; S.keys.gem = 'x'; S.keys.gq = '';
    FIN['cvm/TEST3'] = { d: { v: 1, tk: 'TEST3', t: [{ a: 2026, t: 2, ref: '2026-06-30' }, { a: 2026, t: 3, ref: '2026-09-30' }], nr: [{ q: '3T26', tipo: 'alto', luc: 500e6, med: 100e6 }],
      cmp: { yoy: { de: '3T25', para: '3T26', tend: 'melhorando', itens: [{ c: 'luc', ch: 0.286, s: 1 }, { c: 'ml', ch: -1.7, s: -1 }] }, qoq: null } }, at: Date.now() };
    window.O = { tk: 'TEST3', d: { price: 10.5, cur: 'BRL' }, score: 7.4, cf: { n: 'Alta', w: [], ext: false },
      fx: { ok: true, cons: 12.34, cen: 15.5, oti: 20.1, ms: 0.1754, espPct: 0.523, est: 'abaixo', trap: null, F: brl, nm: { usados: 8, n: 12, med: 100e6, anual: 400e6, last12: 420e6, excl: ['3T26'] }, pr: [{ n: 'Conservador', g: 5, r: 15, m: 7.5, ml: 8.2 }, { n: 'Central', g: 5, r: 14, m: 10, ml: 10 }, { n: 'Otimista', g: 8, r: 13, m: 12, ml: 12 }] } };
    OPC.r = { D: [O], X: [], W: [], M: [] };
  });
  const pk = await E(() => parPacote(O));
  ok('pacote tem faixa, margem, retorno, balanço e limitações vazias', pk.faixa.conservador === 12.34 && pk.faixa.margem_de_seguranca_pct === 17.5 && pk.faixa.retorno_esperado_pct === 52.3 && pk.balanco.ultimo === '3T26' && pk.limitacoes.length === 0, pk);
  ok('pacote traz tendência e lucro atípico', pk.tendencias.ano_contra_ano.itens[0].variacao_pct === 28.6 && pk.lucros_atipicos[0].lucro_milhoes === 500, pk.tendencias);
  const n2 = await E(() => parNums('R$ 1 585 milhões e 1.585 e 12 000 e 3 585 mil').map(x => x.v));
  ok('milhar com espaço vira um número só', JSON.stringify(n2) === JSON.stringify([1585, 1585, 12000, 3585]), n2);
  const bom = '## Resumo\nA ação está abaixo do cenário conservador, com margem de segurança de 17,5%.\nLeitura: a favor\n## O que está a favor\n- Preço de 10,5 contra conservador de 12,34.\n- Retorno esperado de 52,3%.\n## O que preocupa\n- Margem líquida caiu 1,7 p.p. em um ano.\n- O balanço 3T26 tem lucro atípico de 500 milhões.\n## O que me faria estar errado\n- Se o lucro normalizado de 100 milhões por trimestre não se sustentar.\n## O que acompanhar no próximo balanço\n- Margem líquida e caixa operacional.\n';
  const V = (t, k) => p.evaluate(([t, k]) => { const x = parValida(t, k || window.PK); return { ok: x.ok, motivo: x.motivo, tem: x.texto ? x.texto.endsWith(PARFIM) : null }; }, [t, k]);
  await E((k) => { window.PK = k; }, pk);
  let v = await V(bom); ok('parecer correto passa e recebe a frase final', v.ok && v.tem, v);
  v = await V(bom.replace('52,3%', '58,9%')); ok('número inventado reprova', !v.ok && /fora do pacote: 58,9/.test(v.motivo), v);
  v = await V(bom.replace('17,5%', '17,6%')); ok('arredondamento errado reprova', !v.ok, v);
  v = await V(bom.replace('17,5%', '18%')); ok('arredondar 17,5 para 18 (0 casas) é aceito', v.ok, v);
  v = await V(bom.replace('## O que preocupa', '## O que preocupa mais')); ok('título fora do formato reprova', !v.ok && /estrutura/.test(v.motivo), v);
  v = await V(bom.replace('Leitura: a favor', '')); ok('sem a linha Leitura reprova', !v.ok, v);
  v = await V(bom + '\nMaterial para estudo, não é recomendação de compra.'); ok('frase final dita pela IA não duplica', v.ok && v.tem, v);
  v = await V(bom.replace('Retorno esperado de 52,3%.', 'Compre agora, retorno de 52,3%.')); ok('linguagem de recomendação reprova', !v.ok, v);
  const pkL = Object.assign({}, pk, { limitacoes: ['confiança baixa nos dados: preço velho'], confianca: { nivel: 'Baixa', motivos: ['preço velho'], aviso: null } });
  v = await V(bom, pkL); ok('confiança baixa e a IA não avisa no início: reprova', !v.ok, v);
  const aviso = bom.replace('A ação está abaixo', 'A confiança nos dados é baixa: preço velho. A ação está abaixo').replace('Leitura: a favor', 'Leitura: com cautela');
  v = await V(aviso, pkL); ok('confiança baixa avisada no início e Leitura com cautela: passa', v.ok, v);
  v = await V(aviso.replace('com cautela', 'a favor'), pkL); ok('confiança baixa com conclusão forte reprova', !v.ok, v);
  /* fluxo: sem chave, sucesso + cache, reprovação, timeout */
  await E(() => { S.keys.gem = ''; S.keys.gq = ''; });
  await E(() => parGerar('TEST3')); ok('sem chave: mensagem simples', await E(() => /Falta a chave/.test(PAR.err.TEST3)));
  await E(() => { S.keys.gem = 'x'; localStorage.removeItem(LS + '-parecer'); window.CH = 0; window.TXT = null; asGemModels = () => Promise.resolve(['m']); asGem = (k, m, on) => { CH++; AS.mod = 'Gemini · teste'; on(TXT); return Promise.resolve(); }; });
  await E((t) => { window.TXT = t; }, bom);
  await E(() => parGerar('TEST3')); await p.waitForTimeout(300);
  ok('parecer válido aparece na linha e no cache', await E(() => { const c = parLer().TEST3; return c && /Resumo/.test(c.t) && PAR.open.TEST3 === true && /Esconder parecer/.test(parRow(O)) && /Material para estudo/.test(parRow(O)); }));
  await E(() => parGerar('TEST3')); await E(() => parGerar('TEST3')); await p.waitForTimeout(200);
  ok('abrir de novo usa o cache (a IA foi chamada só 1 vez)', await E(() => CH === 1));
  await E(() => { const c = parLer(); c.TEST3.k = 'outro-balanco'; localStorage.setItem(LS + '-parecer', JSON.stringify(c)); });
  await E((t) => { window.TXT = t; }, bom.replace('52,3%', '99,9%'));
  await E(() => parGerar('TEST3')); await p.waitForTimeout(300);
  ok('balanço novo gera de novo; número inventado vira "Parecer indisponível" sem texto', await E(() => CH === 2 && /Parecer indisponível/.test(PAR.err.TEST3) && !/99,9/.test(parRow(O)) && PAR.open.TEST3 === false));
  await E(() => { window.PARMS = 300; asGem = (k, m, on, sig) => new Promise((res, rej) => { sig.addEventListener('abort', () => { const e = new Error('abort'); e.name = 'AbortError'; rej(e); }); }); });
  await E(() => parGerar('TEST3')); await p.waitForTimeout(900);
  ok('IA que não responde: mensagem simples e o app não trava', await E(() => PAR.busy === null && /não respondeu/.test(PAR.err.TEST3)));
  ok('o pacote não vaza chave nem dados da carteira', await E(() => { S.keys.gem = 'SEGREDO123'; S.keys.gh = 'TOKENGH456'; const s = JSON.stringify(parPacote(O)); return !/SEGREDO123|TOKENGH456|trades|quantidade|patrimônio/i.test(s); }));
  ok('nenhum erro de JS', erros.length === 0, erros);
  console.log(falhas ? '✗ ' + falhas + ' de ' + total + ' falharam' : '✓ parecer: ' + total + ' testes ok');
  await b.close(); process.exit(falhas ? 1 : 0);
})();
