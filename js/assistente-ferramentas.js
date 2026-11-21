/* Aporte · js/assistente-ferramentas.js — o Gemini recebe só um resumo da carteira e busca sozinho os dados de que precisa (function calling): empresa, proventos, risco, oportunidades, mercado. Mesmo escopo global; a ordem de carga importa. */
var ASTD=[
  {name:'dados_empresa',description:'Tudo que o app sabe de uma ou mais empresas da B3 (indicadores, preço justo, balanços, notícias, comparação com o setor), com a fonte de cada número. Use sempre que a pergunta for sobre uma ação específica.',parameters:{type:'OBJECT',properties:{empresa:{type:'STRING',description:'Código (ex.: SBSP3) ou nome (ex.: Sabesp). Até 3, separados por vírgula.'}},required:['empresa']}},
  {name:'carteira_detalhada',description:'Cada ativo da carteira com nota, preço justo, indicadores, último balanço e resumo das notícias.'},
  {name:'proventos',description:'Proventos recebidos nos últimos 12 meses e os já anunciados a receber.'},
  {name:'risco',description:'Diagnóstico de risco da carteira (concentração, setores, alertas).'},
  {name:'oportunidades',description:'Ações fora da carteira abaixo do preço justo (garimpo), alertas e lista de acompanhamento.'},
  {name:'mercado_e_economia',description:'Selic, CDI, IPCA, Ibovespa, dólar, petróleo etc., resumo do mercado do dia e relatório da carteira feito pelo robô.'}];
var ASTS={carteira_detalhada:{ativos:1},proventos:{prov:1},risco:{risco:1},oportunidades:{op:1,lista:1},mercado_e_economia:{eco:1,res:1}};
var ASTL={dados_empresa:'empresa',carteira_detalhada:'carteira',proventos:'proventos',risco:'risco',oportunidades:'oportunidades',mercado_e_economia:'mercado'};
var ASTH='\n\nFERRAMENTAS: abaixo você recebe um resumo da carteira e os blocos que a pergunta provavelmente pede. Se faltar algum dado, chame as ferramentas para buscar (empresa específica, proventos, risco, oportunidades, mercado e economia). Chame só as necessárias e, se precisar de várias, chame todas de uma vez. Não invente números: se nenhuma ferramenta trouxer o dado, diga que o app não tem.';
/* executa a ferramenta que o Gemini pediu e devolve texto */
function asToolRun(n,a,q){var t;
  try{if(n==='dados_empresa'){var held={};compute().held.forEach(function(x){held[x.p.ticker]=1});var tks=asFind(String(a&&a.empresa||'')),inq=asFind(q||''),novos=tks.filter(function(x){return inq.indexOf(x)<0});
      t=tks.length&&!novos.length?'Esses dados já foram enviados no contexto acima (empresa citada na pergunta). Use-os, não precisa buscar de novo.':tks.length?novos.map(function(tk){return asEmp(tk,!!held[tk])}).join('\n\n'):'Não achei essa empresa na base do app. Peça ao usuário o código da ação (ex.: SBSP3).'}
    else if(ASTS[n]){ASCMP=false;t=asCtx(q,ASTS[n])||'Sem dados no app para isso.'}
    else t='Ferramenta desconhecida.'}catch(e){t='Erro ao buscar: '+(e&&e.message||e)}
  ASCMP=false;return String(t).slice(0,30000)}
/* contexto enxuto + empresas citadas na pergunta já incluídas (poupa uma ida e volta) */
/* escolhe pelas palavras da pergunta quais blocos já mandar junto (1 chamada só, poupa o limite grátis do Gemini); as ferramentas ficam de reserva */
function asRota(q){var n=asNorm(q),o={base:1,ativos:1,metas:1};
  if(/provent|dividend|recebo|renda passiva|yield/.test(n))o.prov=1;
  if(/risc|concentra|diversific|cair|queda|perd|exposi/.test(n))o.risco=1;
  if(/carteira/.test(n)&&/analis|diagnost|avali|panorama|geral/.test(n))o.risco=1;
  if(/oportunid|garimp|barat|acompanh|alerta|comprar|aportar/.test(n)){o.op=1;o.lista=1}
  if(/mercado|economia|selic|cdi|ipca|dolar|ibov|juros|inflac|petroleo|noticia/.test(n)){o.eco=1;o.res=1}
  return {o:o,det:/detalh|cada ativo|cada acao|minhas acoes|nota|preco justo|valuation|indicador/.test(n)}}
function asMsgsT(q){asSysAtual();var rt=asRota(q);ASCMP=!rt.det;var ctx;try{ctx=asCtx(q,rt.o)}finally{ASCMP=false}
  var held={};compute().held.forEach(function(x){held[x.p.ticker]=1});
  var emp=asFind(q).map(function(tk){try{return asEmp(tk,!!held[tk])}catch(e){return ''}}).filter(Boolean);
  var h=AS.m.filter(function(x){return x.t&&!x.e}).slice(-7,-1).map(function(x){var t=x.t.length>700?x.t.slice(0,700)+' […]':x.t;return {role:x.r==='u'?'user':'model',parts:[{text:t}]}});
  return {sys:ASSYS+ASTH+'\n\nRESUMO DA CARTEIRA AGORA:\n'+ctx+(emp.length?'\n\n'+emp.join('\n\n'):'')+asmCtxT(q),ct:h.concat([{role:'user',parts:[{text:q}]}])}}
/* versão mínima para o limite pequeno da Groq grátis: prompt curto + só a empresa citada (ou o resumo da carteira) */
var ASMINI='Você é a assistente do Aporte, app de investimentos do Thiago. Português do Brasil, simples e direto, frases curtas, sem termos em inglês. Use só os números do CONTEXTO; nunca invente número, data, notícia ou causa. Cite a fonte entre parênteses. Se faltar dado, diga que o app não tem. Faça as contas certas. Diga de qual lucro vem a margem líquida e não explique a queda do lucro (juros, impostos) sem dados. Se a CONCILIAÇÃO DE FONTES ou o DIVERGE aparecer, mostre os dois valores e diga que a causa é desconhecida. Confira sinais e valores antes de comparar variações. Não chame empresa de saudável só por margem EBIT e dívida. Se o contexto disser LUCRO DISTORCIDO ou NÃO CONFIÁVEL, obedeça: não conclua cara ou barata por P/L ou preço justo e não explique a causa. Onde a CONFERÊNCIA disser DIVERGE, mostre os dois valores. Nunca inverta a direção "preço justo X% abaixo do preço". Em empresa cíclica não conclua por um indicador só. Formato: pergunta simples = resposta curta; análise = **Os números**, **Minha leitura**, **O que falta saber**. Não dê ordem de compra ou venda.';
/* nível "empresa" da Groq: prompt completo + só a empresa citada + resumo enxuto da carteira (sem a lista de ativos nem os outros blocos) */
function asMsgsE(q){ASCMP=true;var ctx,emp;try{ctx=asCtx(q,{base:1,metas:1});var held={};compute().held.forEach(function(x){held[x.p.ticker]=1});emp=asFind(q).map(function(tk){try{return asEmp(tk,!!held[tk])}catch(e){return ''}}).filter(Boolean)}finally{ASCMP=false}
  var h=AS.m.filter(function(x){return x.t&&!x.e}).slice(-4,-1).map(function(x){return {role:x.r==='u'?'user':'assistant',content:x.t.length>600?x.t.slice(0,600)+' […]':x.t}});
  return [{role:'system',content:ASSYS+'\n\nRESUMO DA CARTEIRA AGORA:\n'+ctx+'\n\n'+emp.join('\n\n')+asmCtxT(q)}].concat(h,[{role:'user',content:q}])}
function asMsgsMini(q){ASCMP=true;var ctx;try{var tks=asFind(q),held={};compute().held.forEach(function(x){held[x.p.ticker]=1});
    ctx=tks.length?tks.map(function(tk){try{return asEmp(tk,!!held[tk])}catch(e){return ''}}).filter(Boolean).join('\n\n'):asCtx(q,{base:1,metas:1})}finally{ASCMP=false}
  var h=AS.m.filter(function(x){return x.t&&!x.e}).slice(-3,-1).map(function(x){return {role:x.r==='u'?'user':'assistant',content:x.t.length>400?x.t.slice(0,400)+' […]':x.t}});
  return [{role:'system',content:ASMINI+'\n\nCONTEXTO DO APP:\n'+ctx.slice(0,9000)}].concat(h,[{role:'user',content:q}])}
/* pensar pouco no chat: o raciocínio longo do Gemini deixava até "oi" levando dezenas de segundos */
function asThink(m){return /gemini-3/.test(m)?{thinkingLevel:'low'}:/2\.5/.test(m)?{thinkingBudget:1024}:null}
/* Gemini com ferramentas: repete (até 5 vezes) enquanto ele pedir dados; no fim, a resposta chega em streaming.
   Cada tentativa tem 25 s para o primeiro sinal; se não vier, tenta o 2º modelo e depois desiste do Gemini (a Groq assume) e AS.st guarda em que etapa parou. */
function asGemT(key,q,on,sig){AS.st='Gemini: lista de modelos';var P=asMsgsT(q);
  return asGemModels(key).then(function(ms){ms=ms.slice(0,2);var i=0,last=null,rt=0;
    var go=function(){if(i>=ms.length)return Promise.reject(last||new Error('sem modelo'));var m=ms[i++],got=0,hops=0,ct=P.ct.slice(),usadas=[],th=asThink(m);
      var step=function(){var calls=[],body={systemInstruction:{parts:[{text:P.sys}]},contents:ct,generationConfig:{temperature:0.3,maxOutputTokens:6000}};if(th)body.generationConfig.thinkingConfig=th;if(hops<2)body.tools=[{functionDeclarations:ASTD}];
        var ac=window.AbortController?new AbortController():null,fired=0,tmo=null,fin=function(){if(tmo){clearTimeout(tmo);tmo=null}};
        if(ac){if(sig){if(sig.aborted)ac.abort();else sig.addEventListener('abort',function(){ac.abort()})}tmo=setTimeout(function(){fired=1;ac.abort()},25000)}
        AS.st='Gemini '+m+': aguardando resposta'+(hops?' (rodada '+(hops+1)+')':'');
        return fetch('https://generativelanguage.googleapis.com/v1beta/models/'+m+':streamGenerateContent?alt=sse',{method:'POST',signal:ac?ac.signal:sig,headers:{'Content-Type':'application/json','x-goog-api-key':key},body:aspB(JSON.stringify(body))})
          .then(asHttp).then(function(r){AS.mod='Gemini · '+m+(usadas.length?' · consultou '+usadas.join(', '):'');
            return asSSE(r,function(j){fin();AS.st='Gemini '+m+': recebendo';var c=j.candidates&&j.candidates[0],ps=c&&c.content&&c.content.parts||[];ps.forEach(function(p){if(p.functionCall)calls.push(p)});return ps.filter(function(p){return !p.functionCall&&!p.thought}).map(function(p){return p.text||''}).join('')},function(t){got=1;on(t)})})
          .then(function(){fin();if(!calls.length)return;hops++;ct.push({role:'model',parts:calls});
            var rs=calls.map(function(p){var n=p.functionCall.name,l=ASTL[n]||n;AS.st='ferramenta '+n;if(usadas.indexOf(l)<0)usadas.push(l);return {functionResponse:{name:n,response:{result:asToolRun(n,p.functionCall.args,q)}}}});
            ct.push({role:'user',parts:rs});return step()})
          .catch(function(e){fin();if(fired&&!(sig&&sig.aborted)){var t=new Error('o modelo '+m+' não respondeu em 25 s');t.tmo=1;throw t}throw e})};
      var run=function(){return step().catch(function(e){if(e.name==='AbortError'||got)throw e;if(e.st===400&&th&&!hops){th=null;return run()}if(e.st===429&&!rt&&!got){var ra=/"retryDelay":\s*"(\d+)/.exec(e.tx||''),w=ra?+ra[1]:0;if(w>0&&w<=5){rt=1;AS.st='Gemini '+m+': esperando o limite liberar ('+w+' s)';return new Promise(function(r){setTimeout(r,(w+1)*1000)}).then(run)}}last=e;aspFb();return go()})};return run()};
    return go()})}
