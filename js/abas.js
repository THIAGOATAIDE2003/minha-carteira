/* Aporte · js/abas.js — navegação entre abas e arranque do app.
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
var TABS=['resumo','ativos','proventos','mercado','mais'],MAISV='cambio',CARV='pos';
function showTab(n){
  if(n==='cambio'||n==='ajustes'||n==='imposto'||n==='orcamento'){MAISV=n;n='mais'}
  if(n==='evolucao'){CARV='evo';n='ativos'}else if(n==='aporte'){CARV='apo';n='ativos'}else if(n==='desempenho'){CARV='perf';n='ativos'}else if(n==='risco'){CARV='risk';n='ativos'}else if(n==='plano'){CARV='plano';n='ativos'}else if(n==='lancamentos'||n==='extrato'){CARV='ext';n='ativos'}else if(n==='ativos')CARV='pos';
  if(TABS.indexOf(n)<0)n='resumo';
  Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'),function(el){el.hidden=el.getAttribute('data-tab')!==n||(!!el.dataset.sub&&el.dataset.sub!==MAISV)||(!!el.dataset.sub2&&el.dataset.sub2!==CARV)});
  Array.prototype.forEach.call(document.querySelectorAll('.tabs button'),function(b){if(b.dataset.go===n)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  mtCenter();
  Array.prototype.forEach.call(document.querySelectorAll('#maisseg button'),function(b){b.setAttribute('aria-pressed',String(b.dataset.mais===MAISV))});
  Array.prototype.forEach.call(document.querySelectorAll('#carseg button'),function(b){b.setAttribute('aria-pressed',String(b.dataset.cv===CARV))});
  window.scrollTo(0,0);
  if(n==='ativos'&&CARV==='plano'){try{renderPlano()}catch(e){}}
  if(n==='mais'&&MAISV==='orcamento'){try{renderOrc()}catch(e){}}
  if(n==='mercado'){loadMkt();loadMD()}
}
BOOT=true;
Array.prototype.forEach.call(document.querySelectorAll('.tabs button'),function(b){b.addEventListener('click',function(){try{location.hash=b.dataset.go}catch(e){}showTab(b.dataset.go)})});
window.addEventListener('hashchange',function(){showTab((location.hash||'').replace('#',''))});
showTab((location.hash||'').replace('#',''));
var fixedMsg=sanitize();
render();
if(fixedMsg)warnIn(fixedMsg);
/* só para os testes automáticos (tests/teste.js): expõe as contas, sem mudar nada no app */
if(window.__APORTE_TESTE__)window.__aporte={VERSAO:VERSAO,PL:PL,plHtml:plHtml,plGat:plGat,plSnap:plSnap,plMsgs:plMsgs,plMundo:plMundo,plAportes:plAportes,mkSug:mkSug,thOf:thOf,thRF:thRF,thPapeis:thPapeis,thHtml:thHtml,thChk:thChk,thCtx:thCtx,thLn:thLn,thLembra:thLembra,garRec:garRec,garRes:garRes,garHist:garHist,opQual:opQual,trLeit:trLeit,resHtml:resHtml,csRec:csRec,csSup:csSup,csEsp:csEsp,mkSearch:mkSearch,emDiv:emDiv,emRec:emRec,emSobre:emSobre,emAnual:emAnual,emDivs:emDivs,sobOf:sobOf,sobSetor:sobSetor,sobHtml:sobHtml,vtSetor:vtSetor,vtHtml:vtHtml,vtCart:vtCart,vtCtx:vtCtx,vtF:vtF,riAlerts:riAlerts,riHtml:riHtml,riCtx:riCtx,riTemas:riTemas,riPanel:riPanel,BC:BC,bcIngest:bcIngest,bcLeitura:bcLeitura,bcMudou:bcMudou,bcHtml:bcHtml,bcCard:bcCard,bcCtx:bcCtx,rpMsgs:rpMsgs,rpHtml:rpHtml,rpExtra:rpExtra,RPSYS:RPSYS,heroOpen:heroOpen,heroRender:heroRender,setRng:function(r){STK.rng=r},dzero:dzero,cls:cls,renderTape:renderTape,sibHtml:sibHtml,dvAlerts:dvAlerts,DV:DV,vpill:vpill,pct:pct,sgn:sgn,S:S,CDI:CDI,compute:compute,valoriz:valoriz,xirr:xirr,ePx:ePx,irData:irData,bensEm:bensEm,splitNeed:splitNeed,rfCalc:rfCalc,cdiBench:cdiBench,pvItems:pvItems,b3Hol:b3Hol,annRets:annRets,evoData:evoData,dayDiff:dayDiff,irRate:irRate,catSetores:catSetores,stkAna:stkAna,anMom:anMom,catTickers:catTickers,catNovo:catNovo,catSaiu:catSaiu,MD:MD,vendaCalc:vendaCalc,renderApo:renderApo,entInfo:entInfo,ENT:ENT,concFor:concFor,vendaHtml:vendaHtml,VND:VND};

/* Arranque dos temporizadores: ficam aqui, no último arquivo, para nenhum deles disparar antes de todos os js/ terem carregado
   (lá atrás eles estavam dentro de um arquivo só). Mesma ordem de antes. */
setTimeout(function(){try{provMD()}catch(e){}mergeUp();render()},0);
setTimeout(function(){ghSync()},300);
setInterval(function(){if(!document.hidden)ghSync()},5*60000);
setInterval(function(){if(!document.hidden)try{renderTape()}catch(e){}},15000);
setInterval(renderMktSt,60000);setInterval(renderSync,60000);setTimeout(renderMktSt,0);
setInterval(function(){if(!document.hidden)doRefresh(true)},5*60000);
setTimeout(function(){doRefresh(true)},600);
setTimeout(function(){loadCDI()},900);
setTimeout(function(){loadDivs()},2500);
setTimeout(function(){loadDivsUS()},4200);
try{tapeStart()}catch(e){}setTimeout(function(){loadMD()},700);setTimeout(function(){loadNews()},1500);setInterval(function(){if(!document.hidden)loadNews()},10*60000);setTimeout(ntBadge,1700);setInterval(ntBadge,60000);setInterval(function(){if(!document.hidden)loadMD()},60*60000);setInterval(function(){var b=brt();if(!document.hidden&&bDay(b.d)&&b.min>=540&&b.min<1380)loadMD(true)},5*60000);
setTimeout(function(){loadHist()},5000);
setTimeout(function(){loadBench()},3500);
setInterval(function(){if(!document.hidden){loadDivs();loadDivsUS()}},60*60000);
setInterval(function(){if(!document.hidden)loadCDI()},60*60000);
/* número da versão na abertura do app (some sozinho em 3 s) */
setTimeout(function(){try{var v=document.createElement('div');v.className='vtoast';v.textContent='Aporte · versão '+VERSAO;document.body.appendChild(v);setTimeout(function(){v.classList.add('out')},2600);setTimeout(function(){if(v.parentNode)v.parentNode.removeChild(v)},3200)}catch(e){}},300);
/* aviso de versão nova: compara a versão em uso com a do servidor (sem cache) e oferece atualizar na hora */
var VIS0=Date.now();
function checkVersao(){if(document.hidden||!navigator.onLine)return;
  fetch('js/nucleo.js?_v='+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.text():''}).then(function(t){var m=/var VERSAO='([0-9.]+)'/.exec(t||'');if(!m||m[1]===VERSAO||$('vnova'))return;
    var duro=function(){return (window.caches?caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k)}))}):Promise.resolve()).then(function(){return navigator.serviceWorker&&navigator.serviceWorker.getRegistrations?navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(x){return x.unregister()}))}):0}).then(function(){location.reload()}).catch(function(){location.reload()})};
    /* atualiza: instala o service worker da versão nova (ele baixa a versão inteira, sem usar o cache do navegador, e troca o cache), e só então recarrega; se algo falhar, limpa tudo e recarrega */
    var go=function(){if(!navigator.serviceWorker||!navigator.serviceWorker.register)return duro();
      return navigator.serviceWorker.register('sw.js?v='+m[1]).then(function(reg){return new Promise(function(res,rej){var w=reg.installing||reg.waiting||reg.active;if(!w)return rej();var tm=setTimeout(rej,20000),fim=function(){if(w.state==='activated'){clearTimeout(tm);res()}else if(w.state==='redundant'){clearTimeout(tm);rej()}};w.addEventListener('statechange',fim);fim()})}).then(function(){location.reload()}).catch(duro)};
    /* logo ao abrir ou ao voltar para o app (primeiros 15 s) e sem nada sendo digitado: atualiza sozinho, no máximo 1 vez a cada 3 min (evita repetir se o servidor ainda serve a versão antiga) */
    try{var au=+localStorage.getItem(LS+'-autoup')||0,ae=document.activeElement,dig=ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);
      if(Date.now()-VIS0<15000&&!dig&&Date.now()-au>180000){localStorage.setItem(LS+'-autoup',String(Date.now()));go();return}}catch(e){}
    var b=document.createElement('button');b.id='vnova';b.type='button';b.className='vtoast vnova';b.textContent='Nova versão '+m[1]+' · toque para atualizar';
    b.addEventListener('click',function(){b.textContent='Atualizando...';go()});
    document.body.appendChild(b)}).catch(function(){})}
setTimeout(checkVersao,1500);setInterval(checkVersao,60000);document.addEventListener('visibilitychange',function(){if(!document.hidden){VIS0=Date.now();setTimeout(checkVersao,500)}});
