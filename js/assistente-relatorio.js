/* Aporte · js/assistente-relatorio.js — continuação do antigo assistente.js (parte 3 de 3). Mesmo escopo global; a ordem de carga importa. */
function asMd(s){var L=String(s||'').split('\n'),h='',ul=0;
  var il=function(x){return esc(x).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,!?:;]|$)/g,'$1<i>$2</i>').replace(/`([^`]+)`/g,'<b>$1</b>')};
  L.forEach(function(l){var t=l.trim(),m=t.match(/^(?:[-•*]|\d+[.)])\s+(.*)$/);
    if(m){if(!ul){h+='<ul>';ul=1}h+='<li>'+il(m[1])+'</li>';return}
    if(ul){h+='</ul>';ul=0}if(!t)return;var hd=t.match(/^#{1,4}\s+(.*)$/);h+=hd?'<p><b>'+il(hd[1])+'</b></p>':'<p>'+il(t)+'</p>'});
  if(ul)h+='</ul>';return h}
function asScroll(){var b=$('as-b');if(b)b.scrollTop=b.scrollHeight}
function asRender(){var b=$('as-b');if(!b)return;var h='';
  if(!AS.m.length){h='<div class="asw"><p class="asi">Pergunte qualquer coisa sobre a sua carteira. Eu vejo os mesmos números do app: preços, risco, proventos, preço justo, notícias e o garimpo.</p>'+
    (!S.keys.gq&&!S.keys.gem?'<p class="note" style="margin:0 0 12px">Falta a chave: cole a da Groq em <button type="button" class="link" data-as="cfg">Mais → Ajustes</button>.</p>':'')+
    '<div class="asq">'+ASQ.map(function(q){return '<button type="button" data-asq="'+esc(q)+'">'+esc(q)+'</button>'}).join('')+'</div></div>'}
  else h=AS.m.map(function(x,i){if(x.r==='u')return '<div class="asm u"><div class="ast">'+esc(x.t)+'</div></div>';
    var last=i===AS.m.length-1;return '<div class="asm a'+(x.e?' e':'')+'"><div class="ast">'+(x.t?asMd(x.t):last&&AS.busy?'<span class="asdots" aria-label="Pensando"><i></i><i></i><i></i></span>':'')+'</div>'+(x.e&&!S.keys.gq&&!S.keys.gem?'<button type="button" class="link" style="margin:6px 6px 0;font-size:14px" data-as="cfg">Abrir Ajustes</button>':'')+(x.t&&!(last&&AS.busy)?'<div class="asmt">'+(x.mod?'<small>'+esc(x.mod)+'</small>':'<small></small>')+'<button type="button" class="ascp" data-asc="'+i+'" aria-label="Copiar resposta"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg><span>Copiar</span></button></div>':'')+'</div>'}).join('');
  b.innerHTML=h;var s=$('as-s');if(s){s.textContent=AS.busy?'Parar':'Enviar';s.classList.toggle('stop',AS.busy)}var c=$('as-clr');if(c)c.hidden=!AS.m.length||AS.busy;asScroll()}
/* copia a resposta como texto simples (sem os ** do negrito) */
function asCopy(i,btn){var x=AS.m[i];if(!x)return;var t=String(x.t||'').replace(/\*\*(.+?)\*\*/g,'$1').replace(/`([^`]+)`/g,'$1'),ok=function(){var sp=btn.querySelector('span');if(sp){sp.textContent='Copiado';setTimeout(function(){sp.textContent='Copiar'},1600)}};
  var old=function(){var ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');ok()}catch(e){}ta.remove()};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,old);else old()}
function asOpen(){$('assist').hidden=false;document.body.style.overflow='hidden';asRender();var t=$('as-q');if(t&&!('ontouchstart' in window))t.focus()}
function asClose(){$('assist').hidden=true;document.body.style.overflow=''}
document.addEventListener('click',function(e){var c=e.target.closest&&e.target.closest('[data-asc]');if(c){asCopy(+c.getAttribute('data-asc'),c);return}var t=e.target.closest&&e.target.closest('[data-as],[data-asq]');if(!t)return;var k=t.getAttribute('data-as');
  if(t.hasAttribute('data-asq')){asAsk(t.getAttribute('data-asq'));return}
  if(k==='open')asOpen();else if(k==='close')asClose();else if(k==='clr'){if(AS.busy)return;AS.m=[];asSave();asRender()}else if(k==='cfg'){asClose();showTab('ajustes');setTimeout(function(){var i=$('k-gq');if(i){i.scrollIntoView({block:'center'});i.focus()}},60)}});
document.addEventListener('submit',function(e){if(!e.target||e.target.id!=='as-f')return;e.preventDefault();if(AS.busy){if(AS.ab)AS.ab.abort();return}var q=$('as-q');asAsk(q.value);q.value='';q.style.height=''});
document.addEventListener('keydown',function(e){if(e.target&&e.target.id==='as-q'&&e.key==='Enter'&&!e.shiftKey&&!('ontouchstart' in window)){e.preventDefault();var f=$('as-f');if(f)f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event('submit',{cancelable:true}))}});
document.addEventListener('input',function(e){if(e.target&&e.target.id==='as-q'){var q=e.target;q.style.height='';q.style.height=Math.min(120,q.scrollHeight)+'px'}});

/* Relatório de risco da carteira (Carteira → Risco): a IA lê a carteira, a concentração, os cenários e as notícias do app e explica os riscos com o porquê, sem inventar probabilidade */
var RP={t:'',at:0,mod:'',busy:false,err:''};try{var _rp=JSON.parse(localStorage.getItem(LS+'-rprel')||'null');if(_rp&&_rp.t){RP.t=_rp.t;RP.at=_rp.at||0;RP.mod=_rp.mod||''}}catch(e){}
var RPQ='Faça o relatório de risco da minha carteira, como combinado nas instruções.';
var RPSYS='\n\nTAREFA: RELATÓRIO DE RISCO DA CARTEIRA. Se houver RISCOS E POLÍTICA no contexto, use só isso para falar de diretoria, política e processos: cite manchete, fonte e data, lembre que manchete não é confirmação, nunca invente falas nem preveja preço. Escreva um relatório curto (no máximo uns 350 palavras) com estes títulos, nesta ordem, cada um numa linha começando com ##:\n## Resumo\n2 frases: o quadro geral e o que mais pesa.\n## Os maiores riscos\n3 a 5 itens. Em cada item: o que pode acontecer; por que (com o número e a fonte que estão no CONTEXTO, e as notícias se houver); chance (use só "baixa", "média" ou "alta", explicando em uma frase com base no que o CONTEXTO mostra; NUNCA escreva porcentagem de probabilidade, ela não existe nos dados); e quanto a carteira perderia (use só os números de CENÁRIOS DO APP e de CONCENTRAÇÃO; se não houver cenário para aquilo, diga que o app não calculou).\n## Faz sentido ter tanto aqui?\nOlhe a divisão Brasil / dólar / renda fixa e a concentração por setor e por grupo. Diga se faz sentido e POR QUÊ (ex.: crise no Brasil, inflação alta, juros, dólar), em palavras simples, citando o que o CONTEXTO tem sobre juros, inflação e dólar.\n## O que eu pensaria\n2 a 4 ideias que o Thiago pode considerar (ex.: diversificar um setor, reduzir um peso, esperar um preço melhor), cada uma com o motivo. Escreva como sugestão para ele decidir, nunca como ordem de comprar ou vender. Se algo exigiria um dado que o app não tem, diga.\n\nRegras extras: não invente notícia nem evento; use só o que está no CONTEXTO; se uma empresa depende da outra (BB Seguridade e Banco do Brasil, Itaúsa e Itaú), diga isso quando for relevante. Termine com uma linha: "É uma leitura com os dados do app, não uma previsão nem recomendação."';
function rpExtra(R){var L=[],T=R.tot,tot=T.value+(T.rfV||0);if(!tot)return '';
  var sec={},grp={},us=0;R.held.forEach(function(x){var t=x.p.ticker,k=rkSect(t,x.p.market==='US')[0];(sec[k]=sec[k]||{v:0,t:[]}).v+=x.v;sec[k].t.push(t);if(x.p.market==='US')us+=x.v;var g=grpOf(t);if(g){(grp[g]=grp[g]||{v:0,t:[]}).v+=x.v;grp[g].t.push(t)}});
  if(T.rfV)sec['Renda fixa']={v:T.rfV,t:['CDB/LCI']};
  L.push('CONCENTRAÇÃO (cálculo do app, % do patrimônio total de '+asR(tot)+'): '+Object.keys(sec).sort(function(a,b){return sec[b].v-sec[a].v}).map(function(k){return k+' '+num(sec[k].v/tot*100,1)+'% ('+sec[k].t.join(', ')+')'}).join('; ')+'.');
  var gk=Object.keys(grp).filter(function(k){return grp[k].t.length>1||grp[k].v/tot>=0.1});if(gk.length)L.push('GRUPOS DE EMPRESAS QUE ANDAM JUNTAS: '+gk.map(function(k){return k+' '+num(grp[k].v/tot*100,1)+'% ('+grp[k].t.join(', ')+')'}).join('; ')+'. Regra do app: concentração alta = setor acima de '+CONC.sec+'% ou grupo acima de '+CONC.grp+'%.');
  L.push('DIVISÃO: Brasil (ações e FIIs) '+num((tot-us-(T.rfV||0))/tot*100,1)+'%, dólar/exterior '+num(us/tot*100,1)+'%, renda fixa '+num((T.rfV||0)/tot*100,1)+'%.');
  try{var r=riskData(R);if(r&&r.F){var sc=[['Ibovespa cai 20%','ibov',-0.2],['Bolsa americana (S&P 500) cai 20%','SPY',-0.2],['Dólar cai 10%','usd',-0.1],['Dólar sobe 15%','usd',0.15],['Petróleo cai 25%','brent',-0.25],['Crise no Brasil (Ibovespa −25% e dólar +20%)','two',0,[-0.25,0.2]]],o=[];
    sc.forEach(function(x){if(x[1]!=='two'&&!r.F[x[1]])return;var im=rkImpact(r,x[1],x[2],x[3]);o.push(x[0]+': '+asR(im.tot)+' ('+asP(im.tot/r.tot*100,1)+' da carteira)')});
    if(o.length)L.push('CENÁRIOS DO APP (quanto a carteira mudaria, pelo comportamento passado de cada ativo; não é previsão): '+o.join('; ')+'.')}}catch(e){}
  return L.join('\n')}
function rpMsgs(cmp){ASCMP=!!cmp;var ctx='';try{ctx=asCtx(RPQ+' risco queda concentração')}finally{ASCMP=false}var ex='';try{ex=rpExtra(compute())}catch(e){}
  return [{role:'system',content:ASSYS+RPSYS+'\n\nCONTEXTO DO APP AGORA:\n'+ctx+(ex?'\n'+ex:'')},{role:'user',content:RPQ}]}
function rpHtml(){
  var gq=S.keys.gq,gm=S.keys.gem,b;
  if(RP.busy&&!RP.t)b='<p class="muted">Lendo sua carteira e escrevendo o relatório…</p>';
  else if(RP.t)b='<div class="rpt">'+asMd(RP.t)+'</div><p class="note" style="margin:10px 0 0">'+(RP.busy?'Escrevendo… ':'Gerado em '+asDt(RP.at)+(RP.mod?' · '+esc(RP.mod):'')+'. ')+'É uma leitura com os dados do app, não uma previsão.</p>';
  else b='<p class="note" style="margin:0">Uma IA lê suas maiores posições, a concentração por setor, os cenários de queda e as notícias, e explica onde estão os riscos, com o porquê. Toque em gerar.</p>';
  if(RP.err)b+='<p class="msg err">'+esc(RP.err)+'</p>';
  var bt=(gq||gm)?'<button type="button" class="btn small" data-rp="go"'+(RP.busy?' disabled':'')+' style="margin-top:12px">'+(RP.busy?'Gerando…':RP.t?'Gerar de novo':'Gerar relatório')+'</button>':'<p class="note">Para gerar, cole a chave da Groq (grátis) em Mais → Ajustes → Assistente.</p>';
  return '<div class="panel" id="rpbox"><h2>Relatório de risco da carteira '+bal('Uma IA (Groq ou Gemini, com a sua chave) lê os números do app: suas maiores posições, a concentração por setor, os cenários de queda e as notícias. Ela explica os riscos e por que fazem ou não sentido, mas não inventa probabilidade nem dado. Pode errar. Não é recomendação.')+'</h2><div id="rp-b">'+b+'</div>'+bt+'</div>'}
var RPRF=0;function rpTick(){if(RPRF)return;RPRF=requestAnimationFrame(function(){RPRF=0;var el=$('rp-b');if(el&&RP.t)el.innerHTML='<div class="rpt">'+asMd(RP.t)+'</div><p class="note" style="margin:10px 0 0">Escrevendo… É uma leitura com os dados do app, não uma previsão.</p>'})}
function rpRedraw(){var el=$('rpbox');if(el){var d=document.createElement('div');d.innerHTML=rpHtml();el.replaceWith(d.firstChild)}}
function rpGerar(){if(RP.busy)return;var gq=S.keys.gq,gm=S.keys.gem;if(!gq&&!gm){RP.err='Falta a chave da Groq ou do Gemini em Mais → Ajustes → Assistente.';rpRedraw();return}
  RP.busy=true;RP.err='';var old={t:RP.t,at:RP.at,mod:RP.mod};RP.t='';rpRedraw();
  var mk=function(c){try{return rpMsgs(c)}catch(e){return [{role:'system',content:ASSYS+RPSYS},{role:'user',content:RPQ}]}},msgs=null,gmk=function(){return msgs||(msgs=mk(false))};
  var ab=window.AbortController?new AbortController():null,sig=ab?ab.signal:undefined,tm=setTimeout(function(){if(ab&&!RP.t)ab.abort()},S.asia==='gem'?70000:40000),errs=[],on=function(t){RP.t+=t;rpTick()};
  var provs=[];if(gq)provs.push(['Groq',function(){return asGroq(gq,mk,on,sig)}]);if(gm)provs.push(['Gemini',function(){return asGem(gm,gmk(),on,sig)}]);if(S.asia==='gem'&&gm)provs.reverse();
  var run=function(k){return provs[k][1]().catch(function(e){if((e&&e.name==='AbortError')||RP.t)throw e;errs.push(asErrTxt(e,provs[k][0]));if(k+1<provs.length)return run(k+1);throw e})};
  run(0).then(function(){RP.mod=AS.mod;RP.at=Date.now();if(!RP.t){RP.t=old.t;RP.at=old.at;RP.mod=old.mod;RP.err='A IA não mandou resposta. Tente de novo.'}}).catch(function(e){
    if(RP.t){RP.mod=AS.mod;RP.at=Date.now();return}RP.t=old.t;RP.at=old.at;RP.mod=old.mod;RP.err=e&&e.name==='AbortError'?'Demorou demais para responder. Tente de novo.':'Não consegui gerar: '+errs.join(' E ')})
   .then(function(){clearTimeout(tm);RP.busy=false;if(RP.t)try{localStorage.setItem(LS+'-rprel',JSON.stringify({t:RP.t,at:RP.at,mod:RP.mod}))}catch(e){}rpRedraw()})}
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-rp]');if(t)rpGerar()});
