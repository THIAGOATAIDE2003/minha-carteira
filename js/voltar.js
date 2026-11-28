/* Aporte · js/voltar.js — botão Voltar do Android fecha a camada de cima (U2a, 1.85.0). Só observa; não edita as telas.
   Camada aberta = 1 entrada extra no histórico (state {ap:1,d:n}); fechar por ✕/fundo = history.back() 1×; Voltar = fecha só a camada do topo com a função que já existe.
   Sem chave de localStorage, sem cálculo. Tudo em try/catch: se falhar, o app age como antes. */
var VL={P:[],CV:{},Q:[],D:0,busy:0,tm:0,sc:0},VLI=['mk','tp','nt','stk','assist','evsheet','orgsh','nd'];
var VLC={stk:function(){stkClose()},nt:function(){ntClose()},nd:function(){ndClose()},assist:function(){asClose()},pf:function(){pfClose()},pv:function(){pvClose()},
  mk:'#mk [data-mk="close"]',tp:'#tp [data-tpe="close"]',evsheet:'#evsheet [data-evf="close"]',orgsh:'#orgsh [data-orgx="close"]'};
function vlAb(){var r=[],i,e;for(i=0;i<VLI.length;i++){e=document.getElementById(VLI[i]);if(e&&!e.hidden)r.push(VLI[i])}
  if(document.getElementById('pfsheet'))r.push('pf');if(document.querySelector('#divtab .sheet:not([hidden])'))r.push('pv');return r}
function vlFecha(id){try{var f=VLC[id],b,e;if(typeof f==='function')f();else{b=document.querySelector(f);if(b)b.click();else{e=document.getElementById(id);if(e)e.hidden=true;document.body.style.overflow=''}}}catch(x){}}
function vlRun(){if(VL.busy)return;var k=VL.Q.shift();if(!k)return;
  if(k==='p'){VL.D++;try{history.pushState({ap:1,d:VL.D},'',location.href)}catch(x){}vlRun();return}
  if(VL.D<=0){vlRun();return}
  VL.D--;VL.busy=1;VL.tm=setTimeout(function(){VL.busy=0;vlRun()},400);try{history.back()}catch(x){VL.busy=0}}
function vlOp(k){VL.Q.push(k);vlRun()}
function vlChk(){VL.sc=0;try{var c=vlAb(),i,id;
  for(i=0;i<VL.P.length;i++){id=VL.P[i];if(c.indexOf(id)<0){VL.P.splice(i,1);i--;if(VL.CV[id])delete VL.CV[id];else vlOp('b')}}
  for(i=0;i<c.length;i++){id=c[i];if(VL.P.indexOf(id)<0){VL.P.push(id);delete VL.CV[id];vlOp('p')}}}catch(x){}}
function vlAg(){if(!VL.sc){VL.sc=1;requestAnimationFrame(vlChk)}}
try{
  if(history.state&&history.state.ap)history.replaceState({ap:0},'',location.href);
  window.addEventListener('popstate',function(e){try{
    if(VL.busy){VL.busy=0;clearTimeout(VL.tm);vlRun();return}
    var s=e.state,d=s&&s.ap?s.d:0,n=VL.P.length,u=[],i;
    if(!n){VL.D=d;return}
    if(s&&s.ap&&d>=n){history.replaceState({ap:1,d:n},'',location.href);VL.D=n;return}
    VL.D=d;for(i=0;i<n;i++)if(!VL.CV[VL.P[i]])u.push(VL.P[i]);
    for(i=u.length-1;i>=Math.max(d,0);i--){VL.CV[u[i]]=1;vlFecha(u[i])}
  }catch(x){}});
  new MutationObserver(function(rs){for(var i=0,t;i<rs.length;i++){t=rs[i].target;if(t.id&&VLI.indexOf(t.id)>=0||t.classList&&t.classList.contains('sheet')){vlAg();return}}})
    .observe(document.body,{attributes:true,attributeFilter:['hidden'],subtree:true});
  var vlm=new MutationObserver(vlAg);vlm.observe(document.body,{childList:true});
  ['divtab','evotab'].forEach(function(id){var e=document.getElementById(id);if(e)vlm.observe(e,{childList:true})});
}catch(x){}
