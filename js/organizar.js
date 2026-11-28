/* Organizar abas (1.59.0): segurar o dedo numa barra de sub-abas abre "Organizar abas" (mudar a ordem e esconder abas). Só usa CSS order + hidden, então funciona em barras que o app refaz o tempo todo. Guardado no aparelho. */
var ORGB=[['#carseg','Carteira'],['#mkseg','Mercado'],['#ixseg','Mercado → Índices'],['#anseg','Mercado → Ideias e análise'],['.opseg','Mercado → Ideias'],['#maisseg','Mais'],['#ajseg','Ajustes'],['#stv-top','Página da ação'],['.tabs','Menu de baixo']];
var ORGS={},ORGK=null,ORGT=null,ORGX=0;
try{ORGS=JSON.parse(localStorage.getItem(LS+'-abas')||'{}')||{}}catch(e){ORGS={}}
function orgSave(){try{localStorage.setItem(LS+'-abas',JSON.stringify(ORGS))}catch(e){}}
function orgChave(b){var a=b.attributes;for(var i=0;i<a.length;i++)if(a[i].name.indexOf('data-')===0)return a[i].value;return b.textContent}
function orgRot(b){var c=b.cloneNode(true),i=c.querySelector('i');if(i)c.removeChild(i);return c.textContent.replace(/\s+/g,' ').trim()}
/* ordem atual: a guardada primeiro; o que é novo vai no fim, na ordem de fábrica */
function orgOrdem(bar,ks){var st=ORGS[bar]||{},o=(st.o||[]).filter(function(k){return ks.indexOf(k)>=0});ks.forEach(function(k){if(o.indexOf(k)<0)o.push(k)});return o}
function orgBarra(sel){return document.querySelector(sel)}
function orgBotoes(el){return [].filter.call(el.children,function(b){return b.tagName==='BUTTON'})}
function orgAplica(){
  ORGB.forEach(function(x){var el=orgBarra(x[0]);if(!el)return;var bs=orgBotoes(el);if(!bs.length)return;
    var ks=bs.map(orgChave),st=ORGS[x[0]];
    if(!st){bs.forEach(function(b){if(b.style.order)b.style.order='';if(b.hidden&&b.hasAttribute('data-org-h'))b.hidden=false});return}
    var o=orgOrdem(x[0],ks),h=st.h||[];
    bs.forEach(function(b){var k=orgChave(b),i=o.indexOf(k),on=h.indexOf(k)>=0;
      if(b.style.order!==String(i))b.style.order=String(i);
      if(on){if(!b.hidden)b.hidden=true;b.setAttribute('data-org-h','1')}else if(b.hasAttribute('data-org-h')){b.hidden=false;b.removeAttribute('data-org-h')}})})}
function orgLista(){
  var sh=document.getElementById('orgsh');if(!sh||!ORGK)return;
  var el=orgBarra(ORGK);if(!el)return;
  var bs=orgBotoes(el),m={};bs.forEach(function(b){m[orgChave(b)]=orgRot(b)});
  var ks=bs.map(orgChave),o=orgOrdem(ORGK,ks),h=(ORGS[ORGK]||{}).h||[],vis=o.filter(function(k){return h.indexOf(k)<0}).length,nome='';
  ORGB.forEach(function(x){if(x[0]===ORGK)nome=x[1]});
  var li=o.map(function(k,i){var on=h.indexOf(k)<0;
    return '<li class="orgr"><label><input type="checkbox" data-orgv="'+esc(k)+'"'+(on?' checked':'')+(on&&vis<2?' disabled':'')+'> <span>'+esc(m[k]||k)+'</span></label>'+
      '<span class="orgm"><button type="button" data-orgu="'+esc(k)+'"'+(i===0?' disabled':'')+' aria-label="Subir">▲</button><button type="button" data-orgd="'+esc(k)+'"'+(i===o.length-1?' disabled':'')+' aria-label="Descer">▼</button></span></li>'}).join('');
  setHtml(sh.querySelector('.orgc'),'<p class="note" style="margin:0 0 8px">'+esc(nome)+'. Marque as abas que quer ver e use as setas para mudar a ordem.</p><ul class="orgl">'+li+'</ul><button type="button" class="asclr" data-orgx="reset">Voltar ao padrão</button>')}
function orgAbre(sel){
  var sh=document.getElementById('orgsh');
  if(!sh){sh=document.createElement('div');sh.className='sheet';sh.id='orgsh';sh.hidden=true;
    setHtml(sh,'<div class="sbox" role="dialog" aria-label="Organizar abas"><div class="shd"><b>Organizar abas</b><button type="button" class="shx" data-orgx="close" aria-label="Fechar">✕</button></div><div class="orgc" style="padding:14px 18px 18px;overflow:auto"></div></div>');
    document.body.appendChild(sh)}
  ORGK=sel;orgLista();sh.hidden=false}
function orgMexe(k,d){
  var el=orgBarra(ORGK);if(!el)return;var ks=orgBotoes(el).map(orgChave),o=orgOrdem(ORGK,ks),i=o.indexOf(k),j=i+d;
  if(i<0||j<0||j>=o.length)return;o[i]=o[j];o[j]=k;
  var st=ORGS[ORGK]||{h:[]};st.o=o;ORGS[ORGK]=st;orgSave();orgAplica();orgLista()}
document.addEventListener('click',function(e){
  if(ORGX&&Date.now()-ORGX<700){ORGX=0;e.preventDefault();e.stopPropagation();return}
  var t=e.target,c=t.closest&&t.closest('[data-orgx],[data-orgu],[data-orgd]');
  if(!c){var sh=document.getElementById('orgsh');if(sh&&e.target===sh)sh.hidden=true;return}
  if(c.hasAttribute('data-orgu')){orgMexe(c.getAttribute('data-orgu'),-1);return}
  if(c.hasAttribute('data-orgd')){orgMexe(c.getAttribute('data-orgd'),1);return}
  var a=c.getAttribute('data-orgx');
  if(a==='close'){document.getElementById('orgsh').hidden=true;return}
  if(a==='reset'){delete ORGS[ORGK];orgSave();orgAplica();orgLista()}},true);
document.addEventListener('change',function(e){
  var c=e.target.closest&&e.target.closest('[data-orgv]');if(!c||!ORGK)return;
  var k=c.getAttribute('data-orgv'),st=ORGS[ORGK]||{},h=(st.h||[]).filter(function(x){return x!==k});
  if(!c.checked)h.push(k);
  st.h=h;ORGS[ORGK]=st;orgSave();orgAplica();orgLista()});
/* segurar ~0,6 s numa barra de abas */
function orgAlvo(e){var t=e.target;if(!t.closest)return null;for(var i=0;i<ORGB.length;i++){var el=t.closest(ORGB[i][0]);if(el)return ORGB[i][0]}return null}
document.addEventListener('pointerdown',function(e){
  clearTimeout(ORGT);var s=orgAlvo(e);if(!s||e.target.closest('#orgsh'))return;
  var x0=e.clientX,y0=e.clientY;
  ORGT=setTimeout(function(){ORGX=Date.now();try{navigator.vibrate&&navigator.vibrate(15)}catch(er){}orgAbre(s)},600);
  var mv=function(ev){if(Math.abs(ev.clientX-x0)>8||Math.abs(ev.clientY-y0)>8)off()},off=function(){clearTimeout(ORGT);document.removeEventListener('pointermove',mv,true);document.removeEventListener('pointerup',off,true);document.removeEventListener('pointercancel',off,true)};
  document.addEventListener('pointermove',mv,true);document.addEventListener('pointerup',off,true);document.addEventListener('pointercancel',off,true)},true);
document.addEventListener('contextmenu',function(e){if(orgAlvo(e))e.preventDefault()});
