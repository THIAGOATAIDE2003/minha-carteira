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
var ASTH='\n\nFERRAMENTAS: abaixo você recebe só um resumo da carteira. Para responder bem, chame as ferramentas para buscar o que faltar (empresa específica, proventos, risco, oportunidades, mercado e economia). Chame só as necessárias e, se precisar de várias, chame todas de uma vez. Não invente números: se nenhuma ferramenta trouxer o dado, diga que o app não tem.';
/* executa a ferramenta que o Gemini pediu e devolve texto */
function asToolRun(n,a,q){var t;
  try{if(n==='dados_empresa'){var held={};compute().held.forEach(function(x){held[x.p.ticker]=1});var tks=asFind(String(a&&a.empresa||''));
      t=tks.length?tks.map(function(tk){return asEmp(tk,!!held[tk])}).join('\n\n'):'Não achei essa empresa na base do app. Peça ao usuário o código da ação (ex.: SBSP3).'}
    else if(ASTS[n]){ASCMP=false;t=asCtx(q,ASTS[n])||'Sem dados no app para isso.'}
    else t='Ferramenta desconhecida.'}catch(e){t='Erro ao buscar: '+(e&&e.message||e)}
  ASCMP=false;return String(t).slice(0,30000)}
/* contexto enxuto + empresas citadas na pergunta já incluídas (poupa uma ida e volta) */
function asMsgsT(q){ASCMP=true;var ctx;try{ctx=asCtx(q,{base:1,ativos:1,metas:1})}finally{ASCMP=false}
  var held={};compute().held.forEach(function(x){held[x.p.ticker]=1});
  var emp=asFind(q).map(function(tk){try{return asEmp(tk,!!held[tk])}catch(e){return ''}}).filter(Boolean);
  var h=AS.m.filter(function(x){return x.t&&!x.e}).slice(-11,-1).map(function(x){var t=x.t.length>1500?x.t.slice(0,1500)+' […]':x.t;return {role:x.r==='u'?'user':'model',parts:[{text:t}]}});
  return {sys:ASSYS+ASTH+'\n\nRESUMO DA CARTEIRA AGORA:\n'+ctx+(emp.length?'\n\n'+emp.join('\n\n'):''),ct:h.concat([{role:'user',parts:[{text:q}]}])}}
/* pensar pouco no chat: o raciocínio longo do Gemini deixava até "oi" levando dezenas de segundos */
function asThink(m){return /gemini-3/.test(m)?{thinkingLevel:'low'}:/2\.5/.test(m)?{thinkingBudget:1024}:null}
/* Gemini com ferramentas: repete (até 5 vezes) enquanto ele pedir dados; no fim, a resposta chega em streaming.
   Cada tentativa tem 25 s para o primeiro sinal; se não vier, tenta o 2º modelo e depois desiste do Gemini (a Groq assume) e AS.st guarda em que etapa parou. */
function asGemT(key,q,on,sig){AS.st='Gemini: lista de modelos';var P=asMsgsT(q);
  return asGemModels(key).then(function(ms){ms=ms.slice(0,2);var i=0,last=null;
    var go=function(){if(i>=ms.length)return Promise.reject(last||new Error('sem modelo'));var m=ms[i++],got=0,hops=0,ct=P.ct.slice(),usadas=[],th=asThink(m);
      var step=function(){var calls=[],body={systemInstruction:{parts:[{text:P.sys}]},contents:ct,generationConfig:{temperature:0.3,maxOutputTokens:6000}};if(th)body.generationConfig.thinkingConfig=th;if(hops<5)body.tools=[{functionDeclarations:ASTD}];
        var ac=window.AbortController?new AbortController():null,fired=0,tmo=null,fin=function(){if(tmo){clearTimeout(tmo);tmo=null}};
        if(ac){if(sig){if(sig.aborted)ac.abort();else sig.addEventListener('abort',function(){ac.abort()})}tmo=setTimeout(function(){fired=1;ac.abort()},25000)}
        AS.st='Gemini '+m+': aguardando resposta'+(hops?' (rodada '+(hops+1)+')':'');
        return fetch('https://generativelanguage.googleapis.com/v1beta/models/'+m+':streamGenerateContent?alt=sse',{method:'POST',signal:ac?ac.signal:sig,headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(body)})
          .then(asHttp).then(function(r){AS.mod='Gemini · '+m+(usadas.length?' · consultou '+usadas.join(', '):'');
            return asSSE(r,function(j){fin();AS.st='Gemini '+m+': recebendo';var c=j.candidates&&j.candidates[0],ps=c&&c.content&&c.content.parts||[];ps.forEach(function(p){if(p.functionCall)calls.push(p)});return ps.filter(function(p){return !p.functionCall&&!p.thought}).map(function(p){return p.text||''}).join('')},function(t){got=1;on(t)})})
          .then(function(){fin();if(!calls.length)return;hops++;ct.push({role:'model',parts:calls});
            var rs=calls.map(function(p){var n=p.functionCall.name,l=ASTL[n]||n;AS.st='ferramenta '+n;if(usadas.indexOf(l)<0)usadas.push(l);return {functionResponse:{name:n,response:{result:asToolRun(n,p.functionCall.args,q)}}}});
            ct.push({role:'user',parts:rs});return step()})
          .catch(function(e){fin();if(fired&&!(sig&&sig.aborted)){var t=new Error('o modelo '+m+' não respondeu em 25 s');t.tmo=1;throw t}throw e})};
      var run=function(){return step().catch(function(e){if(e.name==='AbortError'||got)throw e;if(e.st===400&&th&&!hops){th=null;return run()}last=e;return go()})};return run()};
    return go()})}
