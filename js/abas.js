/* Aporte · js/abas.js — navegação entre abas e arranque do app.
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
var TABS=['resumo','ativos','proventos','mercado','mais'],MAISV='cambio',CARV='pos';
function showTab(n){
  if(n==='cambio'||n==='ajustes'||n==='imposto'){MAISV=n;n='mais'}
  if(n==='evolucao'){CARV='evo';n='ativos'}else if(n==='aporte'){CARV='apo';n='ativos'}else if(n==='desempenho'){CARV='perf';n='ativos'}else if(n==='risco'){CARV='risk';n='ativos'}else if(n==='lancamentos'||n==='extrato'){CARV='ext';n='ativos'}else if(n==='ativos')CARV='pos';
  if(TABS.indexOf(n)<0)n='resumo';
  Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'),function(el){el.hidden=el.getAttribute('data-tab')!==n||(!!el.dataset.sub&&el.dataset.sub!==MAISV)||(!!el.dataset.sub2&&el.dataset.sub2!==CARV)});
  Array.prototype.forEach.call(document.querySelectorAll('.tabs button'),function(b){if(b.dataset.go===n)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  mtCenter();
  Array.prototype.forEach.call(document.querySelectorAll('#maisseg button'),function(b){b.setAttribute('aria-pressed',String(b.dataset.mais===MAISV))});
  Array.prototype.forEach.call(document.querySelectorAll('#carseg button'),function(b){b.setAttribute('aria-pressed',String(b.dataset.cv===CARV))});
  window.scrollTo(0,0);
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
if(window.__APORTE_TESTE__)window.__aporte={VERSAO:VERSAO,S:S,CDI:CDI,compute:compute,valoriz:valoriz,xirr:xirr,ePx:ePx,irData:irData,bensEm:bensEm,splitNeed:splitNeed,rfCalc:rfCalc,cdiBench:cdiBench,pvItems:pvItems,b3Hol:b3Hol,annRets:annRets,evoData:evoData,dayDiff:dayDiff,irRate:irRate};

/* Arranque dos temporizadores: ficam aqui, no último arquivo, para nenhum deles disparar antes de todos os js/ terem carregado
   (lá atrás eles estavam dentro de um arquivo só). Mesma ordem de antes. */
setTimeout(function(){try{provMD()}catch(e){}mergeUp();render()},0);
setTimeout(function(){ghSync()},300);
setInterval(function(){if(!document.hidden)ghSync()},5*60000);
setInterval(function(){if(!document.hidden)try{renderTape()}catch(e){}},15000);
setInterval(renderMktSt,60000);setTimeout(renderMktSt,0);
setInterval(function(){if(!document.hidden)doRefresh(true)},5*60000);
setTimeout(function(){doRefresh(true)},600);
setTimeout(function(){loadCDI()},900);
setTimeout(function(){loadDivs()},2500);
setTimeout(function(){loadDivsUS()},4200);
setTimeout(function(){loadMD()},700);setInterval(function(){if(!document.hidden)loadMD()},60*60000);
setTimeout(function(){loadHist()},5000);
setTimeout(function(){loadBench()},3500);
setInterval(function(){if(!document.hidden){loadDivs();loadDivsUS()}},60*60000);
setInterval(function(){if(!document.hidden)loadCDI()},60*60000);
/* número da versão na abertura do app (some sozinho em 3 s) */
setTimeout(function(){try{var v=document.createElement('div');v.className='vtoast';v.textContent='Aporte · versão '+VERSAO;document.body.appendChild(v);setTimeout(function(){v.classList.add('out')},2600);setTimeout(function(){if(v.parentNode)v.parentNode.removeChild(v)},3200)}catch(e){}},300);
