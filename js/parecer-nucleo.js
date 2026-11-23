/* Aporte · js/parecer-nucleo.js — Parecer da IA, parte pura (1.72.0).
   Não usa tela nem estado do app: roda igual no navegador e no Node (teste de consistência).
   O CÓDIGO decide tudo: a Leitura (a favor / equilibrada / com cautela), os fatos a favor, os fatos que preocupam e os gatilhos
   ("o que me faria estar errado" e "o que acompanhar"). A IA só REESCREVE cada item em linguagem simples, em JSON, e o validador confere item por item:
   mesmos ids, números que existam no próprio fato, nada de causa ou período que não esteja no fato. Reprovou = "Parecer indisponível". */
var PARFIM='Material para estudo, não é recomendação de compra.';
var PARLEI=['a favor','equilibrada','com cautela'];
var PARMAX={fav:3,pre:4,err:2,ace:3};
var PARRET=10; /* retorno esperado só entra em "a favor" acima disso (%) */
var PAREST=1;  /* lucro que varia menos que isso (%) conta como estável */
/* ---------- formatação em português ---------- */
function parF(v,d){return (v<0?'−':'')+Math.abs(+v).toFixed(d).replace('.',',')}
function parI(v){return (v<0?'−':'')+String(Math.round(Math.abs(v))).replace(/\B(?=(\d{3})+(?!\d))/g,'.')}
function parX(v){return parF(v,Math.abs(v)<1?2:1)}
/* o verbo já diz o sentido (subiu/caiu, aumentou/reduziu): o valor sai sem sinal; zero vira "ficou estável" */
function parVb(nome,v,u,up,dn){return v>0?nome+' '+up+' '+parF(Math.abs(v),1)+u:v<0?nome+' '+dn+' '+parF(Math.abs(v),1)+u:nome+' ficou estável'}
function parSg(v,d,u){return (v>0?'+':v<0?'−':'')+Math.abs(+v).toFixed(d).replace('.',',')+u}
function parP(pk,v){return pk.moeda+' '+parF(v,2)}
function parIt(c,n){var l=(c&&c.itens||[]).filter(function(x){return x.item===n})[0];return l||null}
/* ---------- 1) LEITURA POR REGRA ---------- */
/* com cautela: qualquer trava forte (confiança baixa, dado faltando ou em verificação, 2+ testes de saúde reprovados, sem faixa) OU 2+ pontos de atenção.
   equilibrada: 1 ponto de atenção. a favor: nenhum. Pontos de atenção: preço acima do conservador, vento macro contrário, armadilha de valor,
   1 teste de saúde reprovado, retorno esperado acima de 100%, lucro atípico nos últimos 4 trimestres, lucro ou margem do ano piorando. */
function parAtencao(pk){var a=[],f=pk.faixa,sd=pk.saude_financeira,vm=pk.vento_macro,tl=pk.tendencias&&pk.tendencias.ano_contra_ano;
  if(f&&f.margem_de_seguranca_pct<0)a.push('preço acima do cenário conservador');
  if(vm&&vm.resultado==='contrário')a.push('vento macro contrário');
  if(f&&f.armadilha_de_valor)a.push('possível armadilha de valor');
  if(sd&&sd.testes_reprovados_de_3===1)a.push('1 teste de saúde financeira reprovado');
  if(f&&f.retorno_esperado_pct>100)a.push('retorno esperado acima de 100%');
  if((pk.lucros_atipicos||[]).some(function(n){return n.recente}))a.push('lucro atípico nos últimos 4 trimestres');
  if(pk.nao_avaliado&&pk.nao_avaliado.length)a.push('dados específicos do setor não avaliados');
  var l=parIt(tl,'Lucro'),m=parIt(tl,'Margem líquida');if((l&&l.variacao_pct<0)||(m&&m.variacao_pp<=-1))a.push('lucro ou margem do ano piorando');
  return a}
function parLeitura(pk){var hard=[],sd=pk.saude_financeira,cf=pk.confianca;
  if(cf&&cf.nivel==='Baixa')hard.push('confiança baixa nos dados');
  if(pk.limitacoes&&pk.limitacoes.length)hard.push('há limitação ou dado faltando');
  if(sd&&sd.testes_reprovados_de_3>=2)hard.push(sd.testes_reprovados_de_3+' de 3 testes de saúde financeira reprovados');
  if(!pk.faixa)hard.push('sem faixa de preço justo');
  var at=parAtencao(pk),l=hard.length||at.length>=2?'com cautela':at.length===1?'equilibrada':'a favor';
  return {leitura:l,motivos:hard.concat(at),regra:l==='com cautela'?(hard.length?'trava forte':'2 ou mais pontos de atenção'):l==='equilibrada'?'1 ponto de atenção':'nenhum ponto de atenção'}}
/* fatos próprios de bancos, seguradoras e bolsa (pk.financeira): tudo vem de números já calculados em banco.js e seguradora.js */
function parFinFatos(pk){var F=pk.financeira,f=pk.faixa,fav=[],pre=[],err=[],ace=[],na=pk.nao_avaliado||[],pay=F.payout_pct,fj=function(a){return a.length>1?a.slice(0,-1).join(', ')+' e '+a[a.length-1]:a[0]||''};
  if(F.tipo==='banco'){
    if(F.roe_sustentavel_pct>F.custo_de_capital_pct)fav.push('O ROE sustentável de '+parF(F.roe_sustentavel_pct,1)+'% (mediana de '+F.trimestres_com_roe+' trimestres) está acima do custo de capital de '+parF(F.custo_de_capital_pct,0)+'%.');
    else pre.push(['O ROE sustentável de '+parF(F.roe_sustentavel_pct,1)+'% está abaixo do custo de capital de '+parF(F.custo_de_capital_pct,0)+'%.',true]);
    if(F.pvp_hoje<F.pvp_justo_central)fav.push('O P/VP de hoje ('+parF(F.pvp_hoje,2)+'×) está abaixo do P/VP justo do cenário central ('+parF(F.pvp_justo_central,2)+'×).');
    else pre.push(['O P/VP de hoje ('+parF(F.pvp_hoje,2)+'×) está acima do P/VP justo do cenário central ('+parF(F.pvp_justo_central,2)+'×).']);
    if(F.roe_ultimo_pct!=null&&F.roe_ultimo_pct<F.roe_conservador_pct)pre.push(['O ROE mais recente ('+parF(F.roe_ultimo_pct,1)+'%) está abaixo do ROE do cenário conservador ('+parF(F.roe_conservador_pct,1)+'%).']);
    err.push('O custo de capital subir de '+parF(F.custo_de_capital_pct,0)+'% para '+parF(F.preco_justo_central_com_custo_maior.custo_pct,0)+'%: o preço justo central cairia para '+parP(pk,F.preco_justo_central_com_custo_maior.preco)+'.');
    if(f.margem_de_seguranca_pct<0)err.push('O ROE cair para o do cenário conservador ('+parF(F.roe_conservador_pct,1)+'%): o preço justo seria '+parP(pk,f.conservador)+'.');
    ace.push('O ROE do próximo balanço contra o ROE sustentável de '+parF(F.roe_sustentavel_pct,1)+'%.');
  }else{
    var nome=F.tipo==='bolsa'?'da bolsa':'da seguradora';
    if(F.pl_hoje!=null){if(F.pl_hoje<F.pl_alvo_central)fav.push('O P/L de hoje ('+parF(F.pl_hoje,1)+'×) está abaixo do P/L alvo central ('+parF(F.pl_alvo_central,1)+'×).');
      else if(F.pl_hoje>F.pl_alvo_otimista)pre.push(['O P/L de hoje ('+parF(F.pl_hoje,1)+'×) está acima do P/L alvo do cenário otimista ('+parF(F.pl_alvo_otimista,1)+'×).',true]);
      else if(F.pl_hoje>F.pl_alvo_central)pre.push(['O P/L de hoje ('+parF(F.pl_hoje,1)+'×) está acima do P/L alvo central ('+parF(F.pl_alvo_central,1)+'×).'])}
    if(F.rendimento_sustentavel_pct!=null&&F.dividendo_sustentavel_por_acao!=null)fav.push('O dividendo sustentável é de '+parP(pk,F.dividendo_sustentavel_por_acao)+' por ação, '+parF(F.rendimento_sustentavel_pct,1)+'% do preço.');
    err.push('O lucro por ação ficar no do cenário conservador ('+parP(pk,F.lucro_por_acao_conservador)+').');
    if(F.pl_hoje!=null&&F.pl_hoje>F.pl_alvo_conservador)err.push('O P/L cair para o do cenário conservador ('+parF(F.pl_alvo_conservador,1)+'×): o preço justo seria '+parP(pk,F.preco_justo_com_pl_conservador)+'.');
    if(F.dividendo_por_acao!=null&&pay!=null)ace.push('O dividendo por ação ('+parP(pk,F.dividendo_por_acao)+') contra o lucro por ação normalizado do cenário central.')}
  if(pay!=null){if(pay>100)pre.push(['O payout de '+parF(pay,0)+'% passa de 100% do lucro.',true]);else if(F.tipo==='banco')fav.push('Os dividendos pagos equivalem a '+parF(pay,0)+'% do lucro, abaixo de 100%.');}
  if(pay!=null)ace.push('O payout (hoje: '+parF(pay,0)+'%).');
  pre.unshift(['Não foram avaliados, por falta de dado no app: '+fj(na)+'.',true]);
  ace.push('Nos relatórios da empresa: '+fj(na)+', que o app não avalia.');
  return {fav:fav,pre:pre,err:err,ace:ace}}
/* ---------- 2) FATOS E GATILHOS (frases curtas, com os números do pacote) ---------- */
function parFatos(pk){var f=pk.faixa,sd=pk.saude_financeira,vm=pk.vento_macro,tl=pk.tendencias&&pk.tendencias.ano_contra_ano,lim=sd&&sd.limites||{},
    fav=[],pre=[],err=[],ace=[],nm=f&&f.lucro_normalizado,cons=f&&f.premissas&&f.premissas[0],
    lucA=parIt(tl,'Lucro'),mlA=parIt(tl,'Margem líquida'),cx=sd&&sd.caixa_operacional_12_meses_milhoes;
  var add=function(L,txt,obr){L.push({txt:txt,obr:!!obr})};
  /* a favor */
  if(f&&f.margem_de_seguranca_pct>=0&&f.preco_hoje_frente_ao_conservador==='abaixo do conservador')add(fav,'O preço de '+parP(pk,pk.preco)+' está abaixo do cenário conservador de '+parP(pk,f.conservador)+' (margem de segurança de '+parF(f.margem_de_seguranca_pct,1)+'%).');
  if(vm&&vm.resultado==='favorável')add(fav,'Vento macro favorável: '+vm.razao);
  if(sd&&!pk.financeira&&sd.testes_reprovados_de_3===0){var sx=[];if(sd.caixa_maior_que_a_divida)sx.push('a empresa tem mais caixa do que dívida');else if(sd.divida_liquida_sobre_patrimonio!=null)sx.push('dívida líquida de '+parX(sd.divida_liquida_sobre_patrimonio)+'× o patrimônio');if(sd.cobertura_de_juros!=null)sx.push('o lucro da operação cobre '+parF(sd.cobertura_de_juros,1)+'× os juros');add(fav,'Os 3 testes de saúde financeira passaram'+(sx.length?': '+sx.join(' e ')+'.':'.'))}
  if(tl&&tl.tendencia==='melhorando'&&lucA&&mlA&&lucA.variacao_pct>PAREST&&mlA.variacao_pp>0)add(fav,'De '+tl.de+' para '+tl.para+', '+parVb('o lucro',lucA.variacao_pct,'%','subiu','caiu')+' e '+parVb('a margem líquida',mlA.variacao_pp,' p.p.','aumentou','reduziu')+' (tendência: melhorando).');
  if(f&&f.retorno_esperado_pct>PARRET&&f.retorno_esperado_pct<=100)add(fav,'O retorno esperado pelo modelo (média ponderada dos 3 cenários contra o preço de hoje) é de '+parF(f.retorno_esperado_pct,1)+'%.');
  if(cx!=null&&cx>0)add(fav,'O caixa operacional dos últimos 12 meses foi de '+parI(cx)+' milhões.');
  var fn=pk.financeira?parFinFatos(pk):null;if(fn)fn.fav.forEach(function(t){add(fav,t)});
  /* preocupam (os obrigatórios entram primeiro) */
  var lm=(pk.limitacoes||[]).filter(function(x,i,a){return a.indexOf(x)===i});
  if(lm.length)add(pre,'Limitação nos dados: '+lm.join('; ')+'.',true);
  if(fn)fn.pre.filter(function(x){return x[1]}).forEach(function(x){add(pre,x[0],true)});
  if(vm&&vm.resultado==='contrário')add(pre,'Vento macro contrário: '+vm.razao,true);
  if(f&&f.margem_de_seguranca_pct<0)add(pre,'O preço de '+parP(pk,pk.preco)+' está acima do cenário conservador de '+parP(pk,f.conservador)+' (margem de segurança de '+parF(f.margem_de_seguranca_pct,1)+'%).',true);
  if(f&&f.armadilha_de_valor)add(pre,'Possível armadilha de valor: '+f.armadilha_de_valor+'.',true);
  if(sd&&sd.motivos&&sd.motivos.indexOf('dívida alta')>=0){var dv=[];if(sd.divida_liquida_sobre_ebitda!=null)dv.push(parX(sd.divida_liquida_sobre_ebitda)+'× o EBITDA (limite do setor: '+parF(lim.divida_ebitda,1)+'×)');else{if(sd.divida_liquida_sobre_patrimonio!=null)dv.push(parX(sd.divida_liquida_sobre_patrimonio)+'× o patrimônio (limite: '+parF(lim.divida_patrimonio,1)+'×)');if(sd.divida_liquida_sobre_lucro_anual!=null)dv.push(parF(sd.divida_liquida_sobre_lucro_anual,1)+'× o lucro anual (limite: '+parF(lim.divida_lucro_anual,1)+'×)')}add(pre,'A dívida líquida está em '+dv.join(' e ')+'.',true)}
  if(sd&&sd.motivos&&sd.motivos.indexOf('cobertura de juros baixa')>=0&&sd.cobertura_de_juros!=null)add(pre,'O lucro da operação cobre só '+parF(sd.cobertura_de_juros,1)+'× os juros (mínimo desejado: '+parF(lim.cobertura_juros,1)+'×).',true);
  if(sd&&cx!=null&&cx<=0)add(pre,'O caixa operacional dos últimos 12 meses foi de '+parI(cx)+' milhões.',true);
  if(f&&f.retorno_esperado_pct>100)add(pre,'O retorno esperado de '+parF(f.retorno_esperado_pct,1)+'% é muito alto: vale conferir com cuidado as premissas da faixa.');
  if(fn)fn.pre.filter(function(x){return !x[1]}).forEach(function(x){add(pre,x[0])});
  (pk.lucros_atipicos||[]).filter(function(n){return n.recente}).slice(0,1).forEach(function(n){add(pre,'O lucro de '+n.trimestre+' ('+parI(n.lucro_milhoes)+' milhões) ficou '+(n.tipo==='lucro acima do normal'?'acima':'abaixo')+' do normal (mediana de '+parI(n.mediana_milhoes)+' milhões) e pode não se repetir.')});
  if(tl&&((lucA&&lucA.variacao_pct<0)||(mlA&&mlA.variacao_pp<=-1))){var pp=[];if(lucA&&lucA.variacao_pct!=null)pp.push(parVb('o lucro',lucA.variacao_pct,'%','subiu','caiu'));if(mlA&&mlA.variacao_pp!=null)pp.push(parVb('a margem líquida',mlA.variacao_pp,' p.p.','aumentou','reduziu'));add(pre,'De '+tl.de+' para '+tl.para+', '+pp.join(' e ')+(/\.$/.test(pp[pp.length-1])?'':'.'))}
  if(tl&&lucA&&mlA&&lucA.variacao_pct!=null&&mlA.variacao_pp!=null&&Math.abs(lucA.variacao_pct)<=PAREST&&mlA.variacao_pp<0&&mlA.variacao_pp>-1)add(pre,'De '+tl.de+' para '+tl.para+', o lucro ficou estável (variação de '+parF(lucA.variacao_pct,1)+'%) e a margem líquida ficou menor ('+parVb('a margem líquida',mlA.variacao_pp,' p.p.','aumentou','reduziu').replace('a margem líquida ','')+').');
  pre=pre.filter(function(x){return x.obr}).concat(pre.filter(function(x){return !x.obr}));
  if(pre.length<2)add(pre,'Mesmo sem alertas fortes nos números, a faixa de preço justo é uma estimativa simples e pode estar errada.');
  /* o que me faria estar errado */
  if(fn)fn.err.forEach(function(t){add(err,t)});
  if(f&&f.margem_de_seguranca_pct>=0&&cons&&cons.margem_liquida_pct!=null)add(err,'A margem líquida cair até '+parF(cons.margem_liquida_pct,1)+'% (a margem do cenário conservador).');
  if(f&&f.margem_de_seguranca_pct<0)add(err,'O preço cair para perto do cenário conservador de '+parP(pk,f.conservador)+'.');
  if(sd&&sd.cobertura_de_juros!=null)add(err,sd.cobertura_de_juros<lim.cobertura_juros?'A cobertura de juros continuar abaixo de '+parF(lim.cobertura_juros,1)+'× (hoje: '+parF(sd.cobertura_de_juros,1)+'×).':'A cobertura de juros cair abaixo de '+parF(lim.cobertura_juros,1)+'× (hoje: '+parF(sd.cobertura_de_juros,1)+'×).');
  if(vm&&vm.resultado==='favorável'&&/^Selic/.test(vm.razao||''))add(err,'O regime da Selic deixar de ser "'+vm.regime_da_selic+'" (hoje a Selic meta está em '+parF(vm.selic_meta_pct,2)+'%).');
  if(nm)add(err,'O lucro por trimestre ficar abaixo da mediana normalizada de '+parI(nm.por_trimestre_milhoes)+' milhões.');
  if(!err.length)add(err,'Os dados que faltam, quando chegarem, mostrarem um quadro diferente do atual.');
  /* o que acompanhar no próximo balanço */
  var sdFalha=sd&&sd.testes_reprovados_de_3>=1;
  var aSaude=[];if(sd&&sd.cobertura_de_juros!=null)aSaude.push('A cobertura de juros (hoje: '+parF(sd.cobertura_de_juros,1)+'×; mínimo desejado: '+parF(lim.cobertura_juros,1)+'×).');
  if(sd&&sd.divida_liquida_sobre_ebitda!=null)aSaude.push('A dívida líquida sobre o EBITDA (hoje: '+parX(sd.divida_liquida_sobre_ebitda)+'×; limite do setor: '+parF(lim.divida_ebitda,1)+'×).');else if(sd&&sd.divida_liquida_sobre_patrimonio!=null&&!sd.caixa_maior_que_a_divida)aSaude.push('A dívida líquida sobre o patrimônio (hoje: '+parX(sd.divida_liquida_sobre_patrimonio)+'×; limite: '+parF(lim.divida_patrimonio,1)+'×).');
  var aLuc=nm?['O lucro do próximo balanço contra a mediana normalizada de '+parI(nm.por_trimestre_milhoes)+' milhões por trimestre.']:[],aMl=mlA&&mlA.variacao_pp!=null?[parVb('A margem líquida',mlA.variacao_pp,' p.p.','aumentou','reduziu')+' no último ano.']:[],aCx=cx!=null?['O caixa operacional de 12 meses (hoje: '+parI(cx)+' milhões).']:[];
  var aFin=fn?fn.ace:[];(sdFalha?aSaude.concat(aFin,aLuc,aMl,aCx):aFin.concat(aLuc,aMl,aSaude,aCx)).forEach(function(t){add(ace,t)});
  if(!ace.length)add(ace,'A chegada dos dados que hoje faltam.');
  var id=function(L,p,max){return L.slice(0,max).map(function(x,i){return {id:p+(i+1),txt:x.txt.replace(/\.{2}(?!\.)/g,'.'),obr:x.obr}})};
  return {fav:id(fav,'A',PARMAX.fav),pre:id(pre,'P',PARMAX.pre),err:id(err,'E',PARMAX.err),ace:id(ace,'G',PARMAX.ace)}}
/* a entrada completa: o que a IA recebe + o que o validador usa */
function parEntrada(pk){var L=parLeitura(pk),F=parFatos(pk),lim=(pk.limitacoes&&pk.limitacoes.length)||(pk.confianca&&pk.confianca.nivel==='Baixa');
  var ia={ativo:pk.ativo,preco:parP(pk,pk.preco),ultimo_balanco:pk.balanco?pk.balanco.ultimo:null,leitura:L.leitura,avisar_no_inicio_do_resumo:lim?'sim: dizer que a confiança nos dados é baixa ou que há dado faltando':'não',
    a_favor:F.fav.map(function(x){return {id:x.id,fato:x.txt}}),preocupam:F.pre.map(function(x){return {id:x.id,fato:x.txt}}),errado_se:F.err.map(function(x){return {id:x.id,fato:x.txt}}),acompanhar:F.ace.map(function(x){return {id:x.id,fato:x.txt}})};
  return {ia:ia,leitura:L,fatos:F,aviso:!!lim}}
/* ---------- 3) PEDIDO ---------- */
var PARSYS='Você reescreve, em português simples e curto, itens de um parecer sobre UMA ação para um investidor iniciante.\n'+
'Você recebe DADOS em JSON. O app já decidiu tudo: a "leitura" e as listas de fatos (a_favor, preocupam, errado_se, acompanhar). Cada item tem um "id" e um "fato".\n'+
'SEU TRABALHO: reescrever CADA fato em uma frase curta e natural, mantendo o id, e escrever um resumo de 2 frases.\n'+
'REGRAS DURAS:\n'+
'- Não acrescente fato, causa, explicação, previsão, comparação ou número novo. Use só o que está no fato. Copie os números exatamente (mesma unidade, vírgula decimal). Não calcule, não some, não arredonde de outro jeito.\n'+
'- Não use "ao ano", "por ano", "anual", "mensal" nem nenhum período que não esteja escrito no fato. Não use "porque", "pois", "devido", "por causa", "historicamente", "tende a", "provavelmente".\n'+
'- Não mude o sentido: o que está em "preocupam" continua sendo preocupação; o que está em "a_favor" continua sendo ponto a favor. Não passe item de uma lista para outra.\n'+
'- Cada frase reescrita tem no máximo cerca de 1,5 vezes o tamanho do fato.\n'+
'- Resumo: 2 frases curtas, só com ideias e números que estejam nos fatos. Não escreva a palavra "leitura" nem diga se vale comprar. Se "avisar_no_inicio_do_resumo" começar com "sim", a PRIMEIRA frase do resumo avisa isso.\n'+
'- Não dê recomendação de compra ou venda. Não use "prevê", "projeta", "garante" nem "indica melhora"; para falar do cálculo do app, use "o cálculo mostra" ou "o modelo calcula".\n'+
'RESPONDA SÓ COM JSON, sem texto fora dele, neste formato exato (todos os ids recebidos, nenhum a mais):\n'+
'{"resumo":"...","a_favor":[{"id":"A1","texto":"..."}],"preocupam":[{"id":"P1","texto":"..."}],"errado_se":[{"id":"E1","texto":"..."}],"acompanhar":[{"id":"G1","texto":"..."}]}';
/* ---------- 4) VALIDADOR ---------- */
function parNums(txt){var s=String(txt==null?'':txt).replace(/[−–]/g,'-').replace(/(\d)[\u00a0\u202f\u2009 ](?=\d{3}(?!\d))/g,'$1.'),m=s.match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?/g)||[];
  return m.map(function(x){var d=0,v;if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(x)){var p=x.split(',');d=p[1]?p[1].length:0;v=parseFloat(p[0].replace(/\./g,'')+(p[1]?'.'+p[1]:''))}
    else{var q=x.split(/[.,]/);d=q[1]?q[1].length:0;v=parseFloat(x.replace(',','.'))}return {v:v,d:d,s:x}})}
function parAchou(n,perm){for(var i=0;i<perm.length;i++){var p=perm[i];if(Math.abs(+p.toFixed(n.d)-n.v)<1e-9)return true;if(n.d===0&&Math.abs(Math.round(p)-n.v)<1e-9)return true}return false}
function parSem(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}
function parPal(t){return parSem(t).replace(/[^a-z ]/g,' ').split(/\s+/).filter(function(w){return w.length>=5})}
/* palavras de causa, período e previsão: só valem se já estiverem escritas nos fatos */
var PARPROIB=[/\bao ano\b/,/\bpor ano\b/,/\banual(mente)?\b/,/\bao mes\b/,/\bpor mes\b/,/\bmensal(mente)?\b/,/\bao trimestre\b/,/\bpor trimestre\b/,/\bporque\b/,/\bpois\b/,/\bdevido\b/,/\bpor causa\b/,/\bja que\b/,/\buma vez que\b/,/\bgracas\b/,/\bem razao\b/,/\bem funcao\b/,/\bdecorrente\b/,/\bpor conta\b/,
  /\bhistoricamente\b/,/\btende(m)? a\b/,/\bprovavelmente\b/,/\bdeve(ra|ria)? (subir|cair|aumentar|diminuir|melhorar|piorar)/,/\bprevis/,/\bprojet/,/\bsensivel\b/,/\bsetor\b/,/\bdemanda\b/,/\binflacao\b/,/\bconcorrenc/,/\bpressao\b/,/\bdesvaloriz/,/\bvolatil/,/\bpotencial\b/,/\bmuito\b/,
  /\bpreve(m|r|ra|ria)?\b/,/\bprojeta(m|r)?\b/,/\bgarante(m)?\b/,/\bgarantia\b/,/\bgarantido\b/,/\bindic(a|am|ando|ou) (uma )?melhora\b/,/\bindicio\b/];
function parProib(t,tudo){var s=parSem(t),a=[];PARPROIB.forEach(function(r){var m=s.match(r);if(m&&!r.test(tudo))a.push(m[0])});return a}
function parItem(t,fato){var n=parNums(t),perm=parNums(fato).map(function(x){return x.v}),ex=n.filter(function(x){return !parAchou(x,perm)});if(ex.length)return 'número fora do fato ('+ex.slice(0,3).map(function(x){return x.s}).join(', ')+')';
  var w=parPal(fato),tw=parPal(t);if(!tw.some(function(x){return w.indexOf(x)>=0})&&!(n.length&&parNums(fato).length))return 'frase sem relação com o fato';
  var nf=String(fato).split(/\s+/).length,nt=String(t).split(/\s+/).length;if(nt>Math.ceil(nf*1.8)+8)return 'frase muito maior que o fato (acrescentou conteúdo)';return ''}
function parJson(txt){var t=String(txt||'').trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim(),a=t.indexOf('{'),b=t.lastIndexOf('}');if(a<0||b<a)return null;try{return JSON.parse(t.slice(a,b+1))}catch(e){return null}}
var PARSEC=[['a_favor','fav','O que está a favor'],['preocupam','pre','O que preocupa'],['errado_se','err','O que me faria estar errado'],['acompanhar','ace','O que acompanhar no próximo balanço']];
/* txt = resposta da IA; ent = parEntrada(pk). Devolve {ok, motivo, texto, leitura}. O texto final é montado pelo código. */
function parValida(txt,ent){var J=parJson(txt);if(!J||typeof J!=='object')return {ok:false,motivo:'resposta fora do formato JSON'};
  var tudo=parSem([ent.ia.preco].concat(ent.fatos.fav,ent.fatos.pre,ent.fatos.err,ent.fatos.ace).map(function(x){return x.txt||x}).join(' ')),out=[],todos=[];
  var allNums=[];['fav','pre','err','ace'].forEach(function(k){ent.fatos[k].forEach(function(x){parNums(x.txt).forEach(function(n){allNums.push(n.v)})})});parNums(ent.ia.preco+' '+(ent.ia.ultimo_balanco||'')).forEach(function(n){allNums.push(n.v)});
  var res=String(J.resumo||'').trim();if(!res)return {ok:false,motivo:'sem resumo'};if(res.split(/\s+/).length>70)return {ok:false,motivo:'resumo longo demais'};
  var ex=parNums(res).filter(function(x){return !parAchou(x,allNums)});if(ex.length)return {ok:false,motivo:'número fora dos fatos no resumo ('+ex.slice(0,3).map(function(x){return x.s}).join(', ')+')'};
  var pr=parProib(res,tudo);if(pr.length)return {ok:false,motivo:'palavra proibida no resumo: '+pr.slice(0,3).join(', ')};
  if(/\bleitura\b/i.test(res))return {ok:false,motivo:'o resumo fala da leitura (quem define é o app)'};
  if(ent.aviso&&!/(confian[çc]a|limita|falta|faltam|indispon|dado|verifica)/i.test(res.split(/[.!?]\s+/)[0]||''))return {ok:false,motivo:'a primeira frase do resumo não avisa da limitação dos dados'};
  var md='## Resumo\n'+res+'\nLeitura: '+ent.leitura.leitura+'\n';
  for(var s=0;s<PARSEC.length;s++){var ch=PARSEC[s][0],L=ent.fatos[PARSEC[s][1]],A=J[ch];if(!Array.isArray(A))return {ok:false,motivo:'faltou a lista '+ch};
    var ids={};for(var i=0;i<A.length;i++){var it=A[i];if(!it||typeof it.id!=='string'||typeof it.texto!=='string')return {ok:false,motivo:'item malformado em '+ch};
      var fato=L.filter(function(x){return x.id===it.id})[0];if(!fato)return {ok:false,motivo:'id '+it.id+' não pertence a '+ch};if(ids[it.id])return {ok:false,motivo:'id repetido '+it.id};ids[it.id]=1;
      var mo=parItem(it.texto,fato.txt);if(mo)return {ok:false,motivo:it.id+': '+mo};var p2=parProib(it.texto,tudo);if(p2.length)return {ok:false,motivo:it.id+': palavra proibida ('+p2.slice(0,3).join(', ')+')'};todos.push(it.texto)}
    var falt=L.filter(function(x){return !ids[x.id]});if(falt.length)return {ok:false,motivo:'faltou reescrever '+falt.map(function(x){return x.id}).join(', ')};
    md+='## '+PARSEC[s][2]+'\n'+A.map(function(x){return '- '+x.texto.trim()}).join('\n')+'\n'}
  if(/\b(compre|comprar agora|venda tudo|vender tudo|recomendo)\b/i.test(res+' '+todos.join(' ')))return {ok:false,motivo:'linguagem de recomendação'};
  return {ok:true,motivo:'',leitura:ent.leitura.leitura,texto:md.trim()+'\n\n'+PARFIM}}
