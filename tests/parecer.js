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
  const n = await E(() => parNums('R$ 1.234,5 e 5,89, 71%, 3T26, −4,2 p.p., 1 585 milhões').map(x => [x.v, x.d]));
  ok('extrai números em português (milhar, vírgula, trimestre, sinal, espaço)', JSON.stringify(n) === JSON.stringify([[1234.5, 1], [5.89, 2], [71, 0], [3, 0], [26, 0], [4.2, 1], [1585, 0]]), n);
  /* pacote base: ideia boa, tudo limpo */
  await E(() => {
    window.PKB = () => ({ ativo: 'TEST3', moeda: 'R$', preco: 10.5, setor: 'X', nota: { valor: 7.4, minimo: 0, maximo: 10 }, situacao: 'ideia', balanco: { ultimo: '3T26', data: '30/09/2026' },
      faixa: { conservador: 12.34, central: 15.5, otimista: 20.1, preco_hoje_frente_ao_conservador: 'abaixo do conservador', margem_de_seguranca_pct: 14.9, retorno_esperado_pct: 52.3, pesos_dos_cenarios_pct: [25, 50, 25], armadilha_de_valor: null,
        premissas: [{ cenario: 'Conservador', crescimento_pct: 5, retorno_exigido_pct: 15, multiplo_lucro: 7.5, margem_liquida_pct: 8.2 }], lucro_normalizado: { trimestres_usados: 8, trimestres_no_historico: 12, por_trimestre_milhoes: 100, por_ano_milhoes: 400, ultimos_12_meses_milhoes: 420, trimestres_atipicos_de_fora: [] } },
      tendencias: { ano_contra_ano: { de: '3T25', para: '3T26', tendencia: 'melhorando', itens: [{ item: 'Lucro', variacao_pct: 28.6 }, { item: 'Margem líquida', variacao_pp: 1.2 }] }, trimestre_contra_trimestre: null },
      saude_financeira: { testes_reprovados_de_3: 0, motivos: [], divida_liquida_sobre_patrimonio: 0.5, divida_liquida_sobre_lucro_anual: 1.2, divida_liquida_sobre_ebitda: null, cobertura_de_juros: 10, caixa_operacional_12_meses_milhoes: 600, caixa_maior_que_a_divida: false, limites: { divida_patrimonio: 1.5, divida_lucro_anual: 4, cobertura_juros: 2, divida_ebitda: null } },
      vento_macro: { resultado: 'favorável', razao: 'Selic em queda ajuda: financiamento mais barato.', regime_da_selic: 'caindo', selic_meta_pct: 13.75, dolar_nivel: 'alto' },
      confianca: { nivel: 'Alta', motivos: [], aviso: null }, limitacoes: [] });
    window.Lt = (pk) => parLeitura(pk);
  });
  const L = (f) => p.evaluate((f) => { const pk = PKB(); eval(f); return parLeitura(pk); }, f);
  let l = await L(''); ok('tudo limpo = a favor', l.leitura === 'a favor' && l.motivos.length === 0, l);
  l = await L("pk.confianca.nivel='Baixa'"); ok('confiança baixa = com cautela', l.leitura === 'com cautela' && l.regra === 'trava forte', l);
  l = await L("pk.saude_financeira.testes_reprovados_de_3=2"); ok('2 testes de saúde reprovados = com cautela', l.leitura === 'com cautela', l);
  l = await L("pk.limitacoes=['em verificação: x']"); ok('dado faltando ou em verificação = com cautela', l.leitura === 'com cautela', l);
  l = await L("pk.faixa=null"); ok('sem faixa = com cautela', l.leitura === 'com cautela', l);
  l = await L("pk.vento_macro.resultado='contrário'"); ok('só vento contrário = equilibrada', l.leitura === 'equilibrada' && /vento macro contrário/.test(l.motivos[0]), l);
  l = await L("pk.faixa.margem_de_seguranca_pct=-5"); ok('só margem de segurança negativa = equilibrada', l.leitura === 'equilibrada', l);
  l = await L("pk.faixa.margem_de_seguranca_pct=-5;pk.vento_macro.resultado='contrário'"); ok('margem negativa + vento contrário = com cautela', l.leitura === 'com cautela' && l.regra === '2 ou mais pontos de atenção', l);
  l = await L("pk.saude_financeira.testes_reprovados_de_3=1"); ok('1 teste de saúde reprovado = equilibrada', l.leitura === 'equilibrada', l);
  l = await L("pk.faixa.retorno_esperado_pct=130"); ok('potencial acima de 100% = ponto de atenção, com o texto "potencial" (nunca "retorno esperado")', l.leitura === 'equilibrada' && l.motivos.join('|') === 'potencial acima de 100%', l);
  l = await L("pk.lucros_atipicos=[{trimestre:'1T26',recente:true,tipo:'lucro acima do normal',lucro_milhoes:300,mediana_milhoes:100}]"); ok('lucro atípico recente = ponto de atenção', l.leitura === 'equilibrada', l);
  l = await L("pk.tendencias.ano_contra_ano.itens[0].variacao_pct=-10"); ok('lucro do ano caindo = ponto de atenção', l.leitura === 'equilibrada', l);
  /* fatos */
  const F = (f) => p.evaluate((f) => { const pk = PKB(); eval(f); return parFatos(pk); }, f);
  let f = await F('');
  const tx = (g) => p.evaluate((g) => { const pk = PKB(); eval(g); const x = parFatos(pk); return [].concat(x.fav, x.pre, x.err, x.ace).map(y => y.txt); }, g);
  let T = await tx("pk.tendencias.ano_contra_ano.itens[0].variacao_pct=-34.6;pk.tendencias.ano_contra_ano.itens[1].variacao_pp=-8.6;pk.tendencias.ano_contra_ano.tendencia='piorando'");
  ok('verbo já indica o sentido: "lucro caiu 34,6%" e "margem líquida reduziu 8,6 p.p." (sem sinal)', T.some(t => /o lucro caiu 34,6% e a margem líquida reduziu 8,6 p\.p\.$/.test(t)) && !T.some(t => /(caiu|reduziu|subiu|aumentou) [−+]/.test(t)), T);
  ok('acompanhar usa verbo e valor sem sinal', T.some(t => /^A margem líquida reduziu 8,6 p\.p\. no último ano\.$/.test(t)), T);
  T = await tx('pk.saude_financeira=null');
  ok('tendência melhorando: "subiu" e "aumentou", valores sem sinal', T.some(t => /o lucro subiu 28,6% e a margem líquida aumentou 1,2 p\.p\. \(tendência: melhorando\)/.test(t)) && T.some(t => /^A margem líquida aumentou 1,2 p\.p\. no último ano\.$/.test(t)), T);
  T = await tx("pk.saude_financeira=null;pk.tendencias.ano_contra_ano.itens[1].variacao_pp=0;pk.tendencias.ano_contra_ano.itens[0].variacao_pct=0");
  const fa = (g) => p.evaluate((g) => { const pk = PKB(); eval(g); const x = parFatos(pk); return { fav: x.fav.map(y => y.txt), pre: x.pre.map(y => y.txt) }; }, g);
  let R = await fa("pk.saude_financeira=null;pk.tendencias.ano_contra_ano.itens[0].variacao_pct=0.4;pk.tendencias.ano_contra_ano.itens[1].variacao_pp=-0.5");
  ok('lucro +0,4% com margem −0,5 p.p.: não é "melhorando"; vira "lucro estável, margem menor"', !R.fav.concat(R.pre).some(t => /melhorando/.test(t)) && R.pre.some(t => /o lucro ficou estável \(variação de 0,4%\) e a margem líquida ficou menor \(reduziu 0,5 p\.p\.\)/.test(t)), R);
  R = await fa("pk.saude_financeira=null;pk.tendencias.ano_contra_ano.itens[0].variacao_pct=0;pk.tendencias.ano_contra_ano.itens[1].variacao_pp=0");
  ok('lucro e margem zerados: sem "melhorando" e sem frase de margem menor', !R.fav.concat(R.pre).some(t => /melhorando|margem líquida ficou menor/.test(t)), R);
  R = await fa("pk.saude_financeira=null;pk.tendencias.ano_contra_ano.itens[0].variacao_pct=12;pk.tendencias.ano_contra_ano.itens[1].variacao_pp=-0.5");
  ok('lucro sobe mas margem cai: não é "melhorando"', !R.fav.some(t => /melhorando/.test(t)), R);
  R = await fa("pk.saude_financeira=null;pk.tendencias.ano_contra_ano.itens[0].variacao_pct=0.5;pk.tendencias.ano_contra_ano.itens[1].variacao_pp=1.5");
  ok('lucro estável (+0,5%) com margem maior: também não é "melhorando" (lucro precisa subir mais de 1%)', !R.fav.some(t => /melhorando/.test(t)), R);
  R = await fa("pk.saude_financeira=null;pk.faixa.retorno_esperado_pct=3.8");
  ok('potencial de 3,8% não entra em "a favor"', !R.fav.some(t => /potencial até o valor justo/.test(t)), R);
  R = await fa("pk.saude_financeira=null;pk.faixa.retorno_esperado_pct=10");
  ok('potencial de exatamente 10% ainda não entra', !R.fav.some(t => /potencial até o valor justo/.test(t)), R);
  R = await fa("pk.saude_financeira=null;pk.vento_macro=null;pk.tendencias=null;pk.faixa.retorno_esperado_pct=10.1");
  ok('potencial de 10,1% entra em "a favor"', R.fav.some(t => /potencial até o valor justo.*10,1%/.test(t)) && !R.fav.some(t => /retorno esperado/.test(t)), R);

  for (const g of ['', "pk.tendencias.ano_contra_ano.itens[0].variacao_pct=-34.6;pk.tendencias.ano_contra_ano.itens[1].variacao_pp=-8.6", "pk.tendencias.ano_contra_ano.itens[0].variacao_pct=-34.6;pk.tendencias.ano_contra_ano.itens[1].variacao_pp=0;pk.limitacoes=['a: b.']", "pk.faixa=null;pk.saude_financeira=null;pk.tendencias=null"]) { T = await tx(g); ok('nenhum fato tem ponto duplo ("p.p..")', !T.some(t => /[^.]\.\.(?!\.)/.test(t)), T); }
  ok('vento favorável SEMPRE em a favor, nunca em preocupam', f.fav.some(x => /^Vento macro favorável/.test(x.txt)) && !f.pre.some(x => /Vento macro/.test(x.txt)), f);
  f = await F("pk.vento_macro.resultado='contrário';pk.vento_macro.razao='dólar alto pesa: custos em dólar.'");
  ok('vento contrário SEMPRE em preocupam (obrigatório), nunca em a favor', f.pre[0].txt.startsWith('Vento macro contrário') && f.pre[0].obr && !f.fav.some(x => /Vento macro/.test(x.txt)), f);
  ok('fatos têm ids únicos e frases com os números do pacote', f.fav[0].id === 'A1' && f.fav[0].txt.includes('R$ 10,50') && f.fav[0].txt.includes('R$ 12,34') && f.fav[0].txt.includes('14,9%'), f.fav);
  f = await F("pk.faixa.margem_de_seguranca_pct=-29.9;pk.faixa.preco_hoje_frente_ao_conservador='acima do conservador'");
  ok('margem negativa vai para preocupam, não para a favor', f.pre.some(x => /acima do cenário conservador/.test(x.txt) && /−29,9%/.test(x.txt)) && !f.fav.some(x => /abaixo do cenário conservador/.test(x.txt)), f);
  f = await F("pk.limitacoes=['faixa indisponível: x'];pk.confianca.nivel='Baixa'");
  ok('limitação entra como fato obrigatório', f.pre[0].obr && /^Limitação nos dados/.test(f.pre[0].txt), f.pre);
  f = await F("pk.saude_financeira.testes_reprovados_de_3=2;pk.saude_financeira.motivos=['dívida alta','cobertura de juros baixa'];pk.saude_financeira.divida_liquida_sobre_patrimonio=1.3;pk.saude_financeira.cobertura_de_juros=1.4");
  ok('saúde reprovada vira fato com os limites', f.pre.some(x => /1,3× o patrimônio \(limite: 1,5×\)/.test(x.txt)) && f.pre.some(x => /só 1,4× os juros \(mínimo desejado: 2,0×\)/.test(x.txt)), f.pre);
  ok('gatilhos: margem do conservador, cobertura, Selic e lucro normalizado; acompanhar tem 3 itens', f.err.length === 2 && f.ace.length === 3 && f.err.every(x => x.id[0] === 'E') && f.ace.every(x => x.id[0] === 'G'), [f.err, f.ace]);
  f = await F("pk.saude_financeira=null;pk.tendencias=null;pk.vento_macro=null;pk.faixa=null");
  ok('sem dados: sempre sobra um item em cada lista (nada vazio)', f.pre.length >= 1 && f.err.length >= 1 && f.ace.length >= 1, f);
  ok('listas respeitam os máximos (3, 4, 2, 3)', await E(() => { const x = parFatos(PKB()); return x.fav.length <= 3 && x.pre.length <= 4 && x.err.length <= 2 && x.ace.length <= 3; }));
  /* validador */
  await E(() => {
    window.ENT = parEntrada(PKB());
    window.OK = (mod, EN) => { EN = EN || ENT; const j = { resumo: 'A ação está abaixo do cenário conservador de R$ 12,34, com preço de R$ 10,50.', a_favor: [], preocupam: [], errado_se: [], acompanhar: [] };
      [['a_favor', 'fav'], ['preocupam', 'pre'], ['errado_se', 'err'], ['acompanhar', 'ace']].forEach(([c, k]) => { j[c] = EN.fatos[k].map(x => ({ id: x.id, texto: x.txt })); });
      if (mod) mod(j); return JSON.stringify(j); };
  });
  const V = (mod, ent) => p.evaluate(([mod, ent]) => { const EN = ent ? eval(ent) : ENT, x = parValida(OK(mod ? eval('(j)=>{' + mod + '}') : null, EN), EN); return { ok: x.ok, motivo: x.motivo, fim: x.texto ? x.texto.endsWith(PARFIM) : null, texto: x.texto }; }, [mod, ent]);
  let v = await V(); ok('fatos copiados sem mudar passam; o texto sai com títulos, Leitura do código e frase final', v.ok && v.fim && /## Resumo/.test(v.texto) && /Leitura: a favor/.test(v.texto) && /## O que me faria estar errado/.test(v.texto), v);
  v = await V("j.a_favor[0].texto=j.a_favor[0].texto.replace('14,9%','19,9%')"); ok('número inventado no item reprova', !v.ok && /número fora do fato/.test(v.motivo), v);
  v = await V("j.preocupam[0].texto=j.preocupam[0].texto+' por ano'"); ok('"por ano" que não está no fato reprova', !v.ok && /palavra proibida/.test(v.motivo), v);
  v = await V("j.a_favor[1].texto=j.a_favor[1].texto+' porque o juro cai'"); ok('causa nova ("porque") reprova', !v.ok && /proibida/.test(v.motivo), v);
  v = await V("j.preocupam[0].texto='O setor é sensível à Selic e a demanda deve cair.'"); ok('causa fora do pacote reprova', !v.ok, v);
  v = await V("j.a_favor[0].texto='A dívida está controlada e a empresa cresce rápido sem parar de contratar novos funcionários nem de abrir lojas por todo o país, segundo analistas.'"); ok('frase sem relação com o fato reprova', !v.ok, v);
  v = await V("const t=j.a_favor.pop();j.preocupam.push({id:t.id,texto:t.texto})"); ok('passar fato de a favor para preocupam reprova', !v.ok, v);
  v = await V("j.a_favor.pop()"); ok('esquecer de reescrever um fato reprova', !v.ok && /faltou reescrever/.test(v.motivo), v);
  v = await V("j.preocupam.push({id:'P9',texto:'Fato novo'})"); ok('fato novo (id inexistente) reprova', !v.ok && /não pertence/.test(v.motivo), v);
  v = await V("j.resumo='Leitura: a favor, vale comprar.'"); ok('resumo que fala da leitura reprova', !v.ok, v);
  v = await V("j.resumo='O preço está 99,9% abaixo.'"); ok('número inventado no resumo reprova', !v.ok && /resumo/.test(v.motivo), v);
  for (const [w, t] of [['prevê', ' O modelo prevê retorno.'], ['projeta', ' O modelo projeta lucro.'], ['garante', ' Isso garante o retorno.'], ['indica melhora', ' O quadro indica melhora.'], ['indicando melhora', ' O quadro, indicando melhora.']]) {
    v = await V("j.preocupam[0].texto=j.preocupam[0].texto+'" + t + "'"); ok('"' + w + '" em um item reprova', !v.ok && /palavra proibida/.test(v.motivo), v);
    v = await V("j.resumo=j.resumo+'" + t + "'"); ok('"' + w + '" no resumo reprova', !v.ok && /palavra proibida/.test(v.motivo), v);
  }
  v = await V("j.preocupam[0].texto=j.preocupam[0].texto+' O cálculo mostra isso.'"); ok('"o cálculo mostra" é permitido', v.ok, v);
  v = await V("j.preocupam[0].texto=j.preocupam[0].texto+' O modelo calcula isso.'"); ok('"o modelo calcula" é permitido', v.ok, v);
  ok('a instrução à IA lista as palavras barradas e as trocas', await E(() => /prevê.*projeta.*garante.*indica melhora/.test(PARSYS) && /o cálculo mostra/.test(PARSYS) && /o modelo calcula/.test(PARSYS)));
  ok('resposta que não é JSON reprova', await E(() => !parValida('## Resumo\ntexto', ENT).ok));
  ok('JSON dentro de cercas de código é aceito', await E(() => parValida('```json\n' + OK() + '\n```', ENT).ok));
  ok('arredondamento (R$ 10,5 no lugar de R$ 10,50) é aceito', (await V("j.a_favor[0].texto=j.a_favor[0].texto.replace('R$ 10,50','R$ 10,5')")).ok);
  /* limitação: resumo precisa avisar, e a leitura é cautela por regra */
  await E(() => { const pk = PKB(); pk.limitacoes = ['confiança baixa nos dados: preço velho']; pk.confianca = { nivel: 'Baixa', motivos: ['preço velho'], aviso: null }; window.ENT2 = parEntrada(pk); });
  ok('com limitação a leitura é com cautela e a IA recebe o aviso', await E(() => ENT2.leitura.leitura === 'com cautela' && /^sim/.test(ENT2.ia.avisar_no_inicio_do_resumo)));
  v = await V(null, 'ENT2'); ok('limitação e resumo que não avisa reprova', !v.ok && /não avisa/.test(v.motivo), v);
  v = await V("j.resumo='A confiança nos dados é baixa: há limitação. O preço é de R$ 10,50.'", 'ENT2'); ok('limitação avisada na primeira frase passa', v.ok, v);
  ok('a IA nunca recebe a Leitura para escolher: a Leitura do texto vem do código', await E(() => { const x = parValida(OK((j) => { j.resumo = 'Resumo curto com R$ 10,50.'; j.leitura = 'com cautela'; }), ENT); return x.ok && /Leitura: a favor/.test(x.texto); }));
  /* fluxo: sem chave, sucesso + cache, reprovação, timeout */
  await E(() => {
    PARON = true; S.keys.gem = 'x'; S.keys.gq = '';
    FIN['cvm/TEST3'] = { d: { v: 1, tk: 'TEST3', t: [{ a: 2026, t: 2, ref: '2026-06-30' }, { a: 2026, t: 3, ref: '2026-09-30' }], nr: [], cmp: null }, at: Date.now() }; 
    window.O = { tk: 'TEST3', d: { price: 10.5, cur: 'BRL' }, score: 7.4, cf: { n: 'Alta', w: [], ext: false },
      fx: { ok: true, cons: 12.34, cen: 15.5, oti: 20.1, ms: 0.1754, espPct: 0.523, est: 'abaixo', trap: null, F: brl, nm: { usados: 8, n: 12, med: 100e6, anual: 400e6, last12: 420e6, excl: [] }, pr: [{ n: 'Conservador', g: 5, r: 15, m: 7.5, ml: 8.2 }, { n: 'Central', g: 5, r: 14, m: 10, ml: 10 }, { n: 'Otimista', g: 8, r: 13, m: 12, ml: 12 }] } };
    OPC.r = { D: [O], X: [], W: [], M: [] };
  });
  await E(() => { S.keys.gem = ''; S.keys.gq = ''; });
  await E(() => parGerar('TEST3')); ok('sem chave: mensagem simples', await E(() => /Falta a chave/.test(PAR.err.TEST3)));
  await E(() => {
    S.keys.gem = 'x'; localStorage.removeItem(LS + '-parecer'); window.CH = 0; window.MODE = 'ok'; asGemModels = () => Promise.resolve(['m']);
    asGem = (k, m, on) => { CH++; AS.mod = 'Gemini · teste'; const ent = parEntrada(parPacote(O)); const j = { resumo: 'A ação está abaixo do cenário conservador, com preço de R$ 10,50.', a_favor: [], preocupam: [], errado_se: [], acompanhar: [] };
      [['a_favor', 'fav'], ['preocupam', 'pre'], ['errado_se', 'err'], ['acompanhar', 'ace']].forEach(([c, k]) => { j[c] = ent.fatos[k].map(x => ({ id: x.id, texto: x.txt })); });
      if (MODE === 'inventa') j.preocupam[0].texto += ' em 99 por cento dos casos'; on(JSON.stringify(j)); return Promise.resolve(); };
  });
  ok('a mensagem enviada à IA só tem os dados do app (fatos), sem chaves nem carteira', await E(() => { S.keys.gh = 'TOKENGH456'; S.keys.gem = 'SEGREDO123'; const s = JSON.stringify(parEntrada(parPacote(O)).ia); S.keys.gem = 'x'; return !/SEGREDO123|TOKENGH456|trades|quantidade|patrimônio/i.test(s) && /"fato"/.test(s) && /"leitura"/.test(s); }));
  await E(() => parGerar('TEST3')); await p.waitForTimeout(300);
  ok('parecer válido aparece, com a regra da leitura e o cache', await E(() => { const c = parLer().TEST3; const h = parRow(O); return c && /## Resumo/.test(c.t) && PAR.open.TEST3 === true && /Esconder parecer/.test(h) && /Leitura definida por regra do app/.test(h) && /Material para estudo/.test(h); }));
  await E(() => parGerar('TEST3')); await E(() => parGerar('TEST3')); await p.waitForTimeout(200);
  ok('abrir de novo usa o cache (a IA foi chamada só 1 vez)', await E(() => CH === 1));
  await E(() => { const c = parLer(); c.TEST3.k = 'outro-balanco'; localStorage.setItem(LS + '-parecer', JSON.stringify(c)); MODE = 'inventa'; });
  await E(() => parGerar('TEST3')); await p.waitForTimeout(300);
  ok('balanço novo gera de novo; fato com número inventado vira "Parecer indisponível" sem texto', await E(() => CH === 2 && /Parecer indisponível/.test(PAR.err.TEST3) && !/99 por cento/.test(parRow(O)) && PAR.open.TEST3 === false));
  ok('o limite de espera é de 25 segundos', await E(() => PARMS === 25000));
  await E(() => { window.PARMS = 300; asGem = (k, m, on, sig) => new Promise((res, rej) => { sig.addEventListener('abort', () => { const e = new Error('abort'); e.name = 'AbortError'; rej(e); }); }); });
  await E(() => parGerar('TEST3')); await p.waitForTimeout(900);
  ok('IA que não responde: mensagem simples e o app não trava', await E(() => PAR.busy === null && /não respondeu/.test(PAR.err.TEST3)));
  ok('nenhum erro de JS', erros.length === 0, erros);
  console.log(falhas ? '✗ ' + falhas + ' de ' + total + ' falharam' : '✓ parecer: ' + total + ' testes ok');
  await b.close(); process.exit(falhas ? 1 : 0);
})();
