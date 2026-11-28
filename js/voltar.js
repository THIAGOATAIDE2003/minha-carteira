/* Aporte · js/voltar.js — botão Voltar do Android (U2a 1.85.0 camadas; U2b 1.86.0 abas e saída do app).
   Camada aberta = 1 entrada extra {ap:1,d:n}; fechar por ✕/fundo = history.back() 1× (fila VL.Q + trava VL.busy); Voltar = fecha só a de cima com a função que já existe.
   Abas: sair do Início = pushState {tb:1}; entre outras abas/sub-abas = replaceState; voltar ao Início desfaz a entrada. App instalado (standalone): entrada sentinela {sn:1} e
   aviso "Toque em voltar de novo para sair" (2 s). Sem localStorage, sem cálculo; tudo em try/catch (se falhar, o app age como antes). */
var VL={P:[],CV:{},Q:[],D:0,busy:0,tm:0,sc:0,TD:0,cur:'resumo',PH:null,AT:0,SA:0},VLI=['mk','tp','nt','stk','assist','evsheet','orgsh','nd'];
var VLC={stk:function(){stkClose()},nt:function(){ntClose()},nd:function(){ndClose()},assist:function(){asClose()},pf:function(){pfClose()},pv:function(){pvClose()},
  mk:'#mk [data-mk="close"]',tp:'#tp [data-tpe="close"]',evsheet:'#evsheet [data-evf="close"]',orgsh:'#orgsh [data-orgx="close"]'};
function vlTab(h){h=String(h||'').replace('#','');if(/^(cambio|ajustes|imposto|orcamento|mais)$/.test(h))return 'mais';
  if(/^(evolucao|aporte|desempenho|risco|plano|lancamentos|extrato|ativos)$/.test(h))return 'ativos';return /^(proventos|mercado)$/.test(h)?h:'resumo'}
function vlAb(){var r=[],i,e;for(i=0;i<VLI.length;i++){e=document.getElementById(VLI[i]);if(e&&!e.hidden)r.push(VLI[i])}
  if(document.getElementById('pfsheet'))r.push('pf');if(document.querySelector('#divtab .sheet:not([hidden])'))r.push('pv');return r}
function vlFecha(id){try{var f=VLC[id],b,e;if(typeof f==='function')f();else{b=document.querySelector(f);if(b)b.click();else{e=document.getElementById(id);if(e)e.hidden=true;document.body.style.overflow=''}}}catch(x){}}
function vlPush(s,u){try{history.pushState(s,'',u||location.href)}catch(x){}}
function vlArm(){vlPush({ap:0,sn:1});VL.AT=0}
function vlToast(){try{var v=document.createElement('div');v.className='vtoast';v.textContent='Toque em voltar de novo para sair';document.body.appendChild(v);
  setTimeout(function(){v.classList.add('out')},1500);setTimeout(function(){if(v.parentNode)v.parentNode.removeChild(v)},2100)}catch(x){}}
function vlRun(){if(VL.busy)return;var k=VL.Q.shift();if(!k){vlIdle();return}
  if(k==='p'){VL.D++;vlPush({ap:1,d:VL.D});vlRun();return}
  if(k==='b'){if(VL.D<=0){vlRun();return}VL.D--}
  VL.busy=1;VL.tm=setTimeout(function(){VL.busy=0;vlRun()},400);try{history.back()}catch(x){VL.busy=0}}
function vlOp(k){VL.Q.push(k);vlRun()}
function vlIdle(){if(VL.PH!==null&&!VL.busy&&!VL.Q.length&&!VL.P.length)vlApply(VL.PH)}
function vlHash(h){try{h=String(h||'');if(VL.P.length||VL.busy||VL.Q.length){VL.PH=h;return}vlApply(h)}catch(x){}}
function vlApply(h){VL.PH=null;var n=vlTab(h),c=VL.cur,u=location.pathname+location.search+'#'+h;
  if(VL.AT===-1)vlArm();
  if(n===c){if(n!=='resumo'&&VL.TD)try{history.replaceState({ap:0,tb:1},'',u)}catch(x){}return}
  VL.cur=n;
  if(n==='resumo'){if(VL.TD){VL.TD=0;vlOp('t')}return}
  if(!VL.TD){vlPush({ap:0,tb:1},u);VL.TD=1}else try{history.replaceState({ap:0,tb:1},'',u)}catch(x){}}
function vlChk(){VL.sc=0;try{var c=vlAb(),i,id;
  for(i=0;i<VL.P.length;i++){id=VL.P[i];if(c.indexOf(id)<0){VL.P.splice(i,1);i--;if(VL.CV[id])delete VL.CV[id];else vlOp('b')}}
  for(i=0;i<c.length;i++){id=c[i];if(VL.P.indexOf(id)<0){VL.P.push(id);delete VL.CV[id];vlOp('p')}}vlIdle()}catch(x){}}
function vlAg(){if(!VL.sc){VL.sc=1;requestAnimationFrame(vlChk)}}
function vlNivel(s){var l=s&&s.tb?1:VL.SA&&!(s&&s.sn)?-1:0;
  if(l===-1){if(VL.TD){VL.TD=0;VL.cur='resumo';showTab('resumo');vlArm()}else{vlToast();VL.AT=-1;setTimeout(function(){if(VL.AT===-1)vlArm()},2000)}return}
  if(l===0&&VL.TD){VL.TD=0;VL.cur='resumo';showTab('resumo')}
  else if(l===1){VL.TD=1;VL.cur=vlTab(location.hash);showTab((location.hash||'').replace('#',''))}}
try{
  var vs=history.state,vh=(location.hash||'').replace('#',''),vt=vlTab(vh),vb=location.pathname+location.search,vi;
  VL.SA=!!(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||!!navigator.standalone;VL.cur=vt;
  if(vs&&vs.ap===1){for(vi=0;vi<vs.d;vi++)VL.Q.push('t');VL.TD=vt==='resumo'?0:1;vlRun()}
  else if(vs&&vs.tb)VL.TD=1;
  else if(!(vs&&vs.sn)&&(VL.SA||vt!=='resumo')){history.replaceState(null,'',vb);if(VL.SA)vlPush({ap:0,sn:1},vb);if(vt!=='resumo'){vlPush({ap:0,tb:1},vb+'#'+vh);VL.TD=1}}
  window.addEventListener('popstate',function(e){try{
    var s=e.state,ly=s&&s.ap===1,d=ly?s.d:0,n=VL.P.length,u=[],i;
    if(VL.busy){if(!ly)VL.TD=s&&s.tb?1:0;VL.busy=0;clearTimeout(VL.tm);vlRun();return}
    VL.AT=0;
    if(!n){if(ly){VL.Q.push('t');vlRun()}else vlNivel(s);return}
    if(ly&&d>n){VL.D=n;VL.busy=1;VL.tm=setTimeout(function(){VL.busy=0;vlRun()},400);history.go(n-d);return}
    if(ly&&d===n){history.replaceState({ap:1,d:n},'',location.href);VL.D=n;return}
    VL.D=d;for(i=0;i<n;i++)if(!VL.CV[VL.P[i]])u.push(VL.P[i]);
    for(i=u.length-1;i>=Math.max(d,0);i--){VL.CV[u[i]]=1;vlFecha(u[i])}
  }catch(x){}});
  window.addEventListener('hashchange',function(){VL.cur=vlTab(location.hash)});
  new MutationObserver(function(rs){for(var i=0,t;i<rs.length;i++){t=rs[i].target;if(t.id&&VLI.indexOf(t.id)>=0||t.classList&&t.classList.contains('sheet')){vlAg();return}}})
    .observe(document.body,{attributes:true,attributeFilter:['hidden'],subtree:true});
  var vlm=new MutationObserver(vlAg);vlm.observe(document.body,{childList:true});
  ['divtab','evotab'].forEach(function(id){var e=document.getElementById(id);if(e)vlm.observe(e,{childList:true})});
}catch(x){}
