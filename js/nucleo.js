/* Aporte · js/nucleo.js — estado, ajudantes, câmbio, XIRR e compute() (as contas da carteira).
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
/* Versão do app: sobe a cada mudança que o usuário vê (veja CLAUDE.md). O sw.js usa este número no nome do cache offline. */
var VERSAO='1.52.0';
/* Enquanto os arquivos de js/ ainda estão carregando, render() não faz nada (senão chamaria funções de arquivos que ainda não chegaram). abas.js liga isto no fim. */
var BOOT=false;
window.addEventListener('error',function(e){var s=document.getElementById('status');if(s){s.className='msg err';s.textContent='Erro na página: '+e.message}logErro('erro de código',e.message+(e.filename?' ('+String(e.filename).split('/').pop()+':'+e.lineno+')':''))});
window.addEventListener('unhandledrejection',function(e){logErro('promessa sem tratamento',e.reason)});
var LS='minha-carteira-v1';
/* Logo que não carrega some (a CSP não aceita onerror escrito no HTML). O evento error não sobe, por isso a captura. */
document.addEventListener('error',function(e){var t=e.target;if(t&&t.tagName==='IMG'&&t.closest&&t.closest('.tlg'))t.remove()},true);
/* Só abre link http(s): o endereço da notícia vem do robô e nunca pode virar javascript: */
function safeUrl(u){u=String(u||'');return /^https?:\/\//i.test(u)?u:'#'}try{var vE=document.getElementById('ver');if(vE)vE.textContent=VERSAO}catch(e){}
/* setHtml(el,html[,modo]) é a ÚNICA porta de entrada de HTML montado em texto (nada de .innerHTML=, .outerHTML= ou insertAdjacentHTML fora daqui; o lint avisa).
   O texto é lido num <template> (inerte: nada executa nem carrega enquanto está lá), limpo e só então vai para a tela.
   Sai: script, iframe, object, embed, link, meta, base, style, svg foreignObject/animate/set, atributos on*, srcdoc/srcset, style com expression/javascript:
   e endereço (href, src, action...) que não seja http(s), mailto, tel, relativo ou #. O resto (svg dos gráficos, data-*, style="" curto, inputs) passa igual.
   modo: vazio = troca o conteúdo de el; 'add' = acrescenta no fim de el; 'troca' = troca o próprio el. Devolve el (ou o novo nó no 'troca'). */
var SH_BAD={SCRIPT:1,IFRAME:1,FRAME:1,FRAMESET:1,OBJECT:1,EMBED:1,APPLET:1,LINK:1,META:1,BASE:1,STYLE:1,NOSCRIPT:1,TEMPLATE:1,PORTAL:1,FOREIGNOBJECT:1,SET:1,ANIMATE:1,ANIMATETRANSFORM:1,ANIMATEMOTION:1};
var SH_URL={href:1,src:1,'xlink:href':1,action:1,formaction:1,poster:1,background:1,data:1,cite:1,ping:1};
var SH_CSS=/expression\s*\(|javascript:|vbscript:|@import|behavior\s*:|-moz-binding/i;
function shUrlOk(v,n,nm){v=String(v).replace(/[\u0000- \u007f-\u009f]/g,'');if(!/^[a-z][a-z0-9+.-]*:/i.test(v))return true;
  return /^(https?|mailto|tel):/i.test(v)||(nm==='src'&&n.nodeName==='IMG'&&/^data:image\/(png|jpe?g|gif|webp);/i.test(v))}
function shLimpa(root){[].slice.call(root.childNodes).forEach(function(n){
  if(n.nodeType===8){root.removeChild(n);return}
  if(n.nodeType!==1)return;
  if(SH_BAD[n.nodeName.toUpperCase()]){root.removeChild(n);return}
  [].slice.call(n.attributes).forEach(function(a){var nm=a.name.toLowerCase();
    if(nm.slice(0,2)==='on'||nm==='srcdoc'||nm==='srcset'||(nm==='style'&&SH_CSS.test(a.value))||(SH_URL[nm]&&!shUrlOk(a.value,n,nm)))n.removeAttribute(a.name)});
  if(n.nodeName==='A'&&n.getAttribute('target')==='_blank')n.setAttribute('rel','noopener noreferrer');
  shLimpa(n)})}
function setHtml(el,h,modo){if(!el)return el;var t=document.createElement('template');
  /* eslint-disable-next-line no-restricted-syntax */
  t.innerHTML=h==null?'':String(h);shLimpa(t.content);
  if(modo==='troca'){var f=t.content.firstChild;if(el.parentNode)el.parentNode.replaceChild(t.content,el);return f}
  if(modo!=='add')el.textContent='';
  el.appendChild(t.content);return el}
var $=function(id){return document.getElementById(id)};
var today=function(){return new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)};
var S={trades:[],quotes:{},fx:null,keys:{finnhub:'',brapi:'',gh:'',repo:''},example:false,pend:[]};
try{var raw=localStorage.getItem(LS);if(raw){var p=JSON.parse(raw);S=Object.assign(S,p);S.keys=Object.assign({finnhub:'',brapi:'',gh:'',repo:''},S.keys||{});if(!Array.isArray(S.pend))S.pend=[]}}catch(e){}
if(S.asia!=='groq'&&S.asia!=='gem')S.asia='gem';/* Gemini responde primeiro (aguenta o contexto inteiro); Groq fica de reserva, a menos que o Ajustes diga o contrário */
function save(){try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}}
function warnIn(m){var s=document.getElementById('status');if(s){s.className='msg err';s.textContent=m}try{window.scrollTo(0,0)}catch(e){}}
function sanitize(){
  var msgs=[];
  if(S.fx&&S.fx.rate&&(S.fx.rate<3||S.fx.rate>10)){msgs.push('dólar de '+num(S.fx.rate,2));S.fx=null}
  compute().held.forEach(function(x){var m=S.quotes[x.p.ticker];if(m&&(m.price>x.P0*5||m.price<x.P0/5)){msgs.push(x.p.ticker+' a '+num(m.price,2));delete S.quotes[x.p.ticker]}});
  if(!msgs.length)return '';
  save();
  return 'Apaguei valores digitados que pareciam errados ('+msgs.join(', ')+'). Se quiser, digite de novo com a vírgula.';
}
var MK={fxSeries:{},fxDates:[],fxLatest:null,fxLatestDate:'',fxMeta:null};
function ingestFx(d){MK.fxMeta=d||null;MK.fxSeries=(d&&d.series)||{};MK.fxDates=Object.keys(MK.fxSeries).sort();var n=MK.fxDates.length;MK.fxLatestDate=n?MK.fxDates[n-1]:'';MK.fxLatest=n?MK.fxSeries[MK.fxLatestDate]:null}
function fxOn(date){
  var ds=MK.fxDates;if(!ds.length)return null;
  if(date>=MK.fxLatestDate)return {rate:MK.fxLatest,date:MK.fxLatestDate};
  if(date<ds[0])return null;
  var lo=0,hi=ds.length-1;while(lo<hi){var mid=(lo+hi+1)>>1;if(ds[mid]<=date)lo=mid;else hi=mid-1}
  return {rate:MK.fxSeries[ds[lo]],date:ds[lo]};
}
function fxToday(){
  if(S.fx&&S.fx.rate)return {rate:S.fx.rate,src:S.fx.src==='auto'?'auto':'manual',at:S.fx.at};
  if(MK.fxLatest)return {rate:MK.fxLatest,src:'online',date:MK.fxLatestDate};
  return null;
}
function getQuote(tk){var m=S.quotes[tk];return m&&m.price>0?m:null}

var brl=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
var usd=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD'});
var NUMF={};var num=function(n,d){d=d==null?4:d;return (NUMF[d]||(NUMF[d]=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:d}))).format(n)};
var pf=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
/* sinal que trata zero como zero: sem + nem −, e cls() deixa cinza */
var sg0=function(n){return Math.abs(n)<0.005?'':n>0?'+':'−'};
var pct=function(n){return (Math.abs(n)<0.00005?'':n>0?'+':'−')+pf.format(Math.abs(n)*100)+'%'};
var sgn=function(n){return sg0(n)+brl.format(Math.abs(n))};
var cls=function(n){return n>0.005?'gain':n<-0.005?'loss':'muted'};
/* Registro de erros (1.41.7): guarda os últimos 30 problemas (rede/API, nuvem, erro de código) numa chave própria do localStorage (não vai para a nuvem)
   e mostra em Ajustes > Status das fontes (errBox). Sem internet não conta: falhar offline é normal. Repetido em sequência vira "×N". Nunca grava chave/token. */
var ERRK=LS+'-erros',ERRS=[];
try{ERRS=JSON.parse(localStorage.getItem(ERRK)||'[]');if(!Array.isArray(ERRS))ERRS=[]}catch(e){ERRS=[]}
function logErro(onde,e){try{if(navigator.onLine===false)return;var m=String(e&&e.message!=null?e.message:e).slice(0,160),u=ERRS[0];
  if(u&&u.o===onde&&u.m===m){u.n=(u.n||1)+1;u.t=Date.now()}else{ERRS.unshift({t:Date.now(),o:String(onde).slice(0,60),m:m,n:1});if(ERRS.length>30)ERRS.length=30}
  try{localStorage.setItem(ERRK,JSON.stringify(ERRS))}catch(x){}}catch(x){}}
function errMsg(e,seg){return e&&e.name==='AbortError'?'tempo esgotado ('+seg+' s)':/^\d{3}$/.test(String(e&&e.message))?'resposta HTTP '+e.message:e}
function errBox(){var h='<h3 style="margin:16px 0 6px">Últimos erros</h3>';
  if(!ERRS.length)return h+'<p class="muted small" style="margin:0">Nenhum erro registrado.</p>';
  return h+'<ul class="calc stl">'+ERRS.slice(0,8).map(function(x){return '<li><span><b>'+esc(x.o)+(x.n>1?' ×'+x.n:'')+'</b><br><span class="muted small">'+esc(x.m)+'</span></span><span class="muted small">'+new Date(x.t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</span></li>'}).join('')+'</ul><div style="display:flex;gap:8px;margin-top:10px"><button type="button" class="btn ghost" data-errcopy="1">Copiar</button><button type="button" class="btn ghost" data-errclr="1">Limpar</button></div>'}
var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
function parseNum(s){s=String(s==null?'':s).trim().replace(/\s/g,'');if(!s)return NaN;if(s.indexOf(',')>-1)s=s.replace(/\./g,'').replace(',','.');return parseFloat(s)}
function fmtDate(d){var a=d.split('-');return a[2]+'/'+a[1]+'/'+a[0]}

function xirr(flows){
  if(flows.length<2)return null;
  var pos=flows.some(function(f){return f[1]>0}),neg=flows.some(function(f){return f[1]<0});
  if(!pos||!neg)return null;
  var t0=new Date(flows[0][0]).getTime(),ys=flows.map(function(c){return (new Date(c[0]).getTime()-t0)/864e5/365}),vs=flows.map(function(c){return c[1]});
  var f=function(r){var s=0;for(var j=0;j<vs.length;j++)s+=vs[j]/Math.pow(1+r,ys[j]);return s};
  var lo=-0.9999,hi=1000,flo=f(lo),fhi=f(hi);
  if(flo*fhi>0)return null;
  for(var i=0;i<200;i++){var mid=(lo+hi)/2,fm=f(mid);if(flo*fm<=0){hi=mid}else{lo=mid;flo=fm}}
  return (lo+hi)/2;
}

/* preço efetivo com as taxas da B3 (compra soma, venda desconta): conta o dinheiro que saiu/entrou, mas não entra no preço médio */
function ePx(t){var x=(t.taxa||0)/(t.qty||1);return t.side==='buy'?t.price+x:t.side==='sell'?t.price-x:t.price}
/* compute() é caro e o render() chama ele ~11 vezes: durante um render, todos recebem o mesmo resultado (CMEMO, zerado no fim) */
var CMEMO=null;
function compute(){if(CMEMO)return CMEMO;return computeRaw()}
function computeRaw(){
  var by={},warns=[],flows=[],bought=0,proceeds=0,divs=0,cash=0,contrib=0;
  var ts=S.trades.slice().sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:(a.id<b.id?-1:1)});
  var outs=0,fees=0;
  ts.forEach(function(t){
    if(t.side==='out'){var am=t.price*(t.market==='US'?t.fx:1);outs+=am;cash-=am;contrib-=am;if(cash<0){contrib-=cash;cash=0}return}
    if(t.side==='rf'){bought+=t.price;flows.push([t.date,-t.price]);cash-=t.price;if(cash<0){contrib-=cash;cash=0}return}
    if(t.side==='rfout'){proceeds+=t.price;cash+=t.price;flows.push([t.date,t.price]);return}
    var p=by[t.ticker]||(by[t.ticker]={ticker:t.ticker,market:t.market,qty:0,cN:0,cB:0,rA:0,rF:0,lastFx:1});
    var F=t.market==='US'?t.fx:1;p.lastFx=F;
    if(t.side==='div'){
      var dv=t.price*F;p.div=(p.div||0)+dv;divs+=dv;proceeds+=dv;cash+=dv;flows.push([t.date,dv]);return;
    }
    if(t.side==='buy'){
      var ep=ePx(t);fees+=t.taxa||0;p.qty+=t.qty;p.cN+=t.qty*t.price;p.cB+=t.qty*t.price*F;
      bought+=t.qty*ep*F;flows.push([t.date,-t.qty*ep*F]);
      cash-=t.qty*ep*F;if(cash<0){contrib-=cash;cash=0}
    }else{
      var q=t.qty;
      if(q>p.qty+1e-9){warns.push('Venda de '+t.ticker+' em '+fmtDate(t.date)+' maior que a quantidade que você tinha. Conferi só até o que havia em carteira.');q=p.qty}
      if(q<=0)return;
      var P0=p.cN/p.qty,F0=p.cB/p.cN,prop=q/p.qty;
      var sp=ePx(t);fees+=(t.taxa||0)*q/t.qty;p.rA+=q*(t.price-P0)*F0;p.rF+=q*t.price*(F-F0);
      p.cN-=p.cN*prop;p.cB-=p.cB*prop;p.qty-=q;
      if(p.qty<1e-9){p.qty=0;p.cN=0;p.cB=0}
      proceeds+=q*sp*F;cash+=q*sp*F;flows.push([t.date,q*sp*F]);
    }
  });
  var ft0=fxToday(),fxNow=ft0?ft0.rate:null;
  var tot={outs:outs,value:0,cost:0,uA:0,uF:0,rA:0,rF:0,div:divs,bought:bought,proceeds:proceeds,contrib:contrib,cash:cash,missing:[]};
  var held=[],closed=[];
  Object.keys(by).sort().forEach(function(k){
    var p=by[k];tot.rA+=p.rA;tot.rF+=p.rF;
    if(p.qty>0){
      var P0=p.cN/p.qty,F0=p.cB/p.cN,qt=getQuote(p.ticker),P1=qt?qt.price:P0;
      if(!qt)tot.missing.push(p.ticker);
      var F1=p.market==='US'?(fxNow||p.lastFx):1;
      var v=p.qty*P1*F1,a=p.qty*(P1-P0)*F0,f=p.qty*P1*(F1-F0);
      tot.value+=v;tot.cost+=p.cB;tot.uA+=a;tot.uF+=f;
      held.push({p:p,P0:P0,P1:P1,F0:F0,F1:F1,v:v,a:a,f:f,gain:a+f,pct:p.cB?(a+f)/p.cB:0,hasQuote:!!qt,qt:qt});
    }else{closed.push(p)}
  });
  var rfs=[];tot.rfV=0;tot.rfC=0;tot.rfU=0;tot.rfR=0;
  ts.forEach(function(t){if(t.side!=='rf')return;var rs=ts.filter(function(x){return x.side==='rfout'&&x.ref===t.id})[0]||null;var c=rfCalc(t,rs);rfs.push(c);
    if(rs){tot.rfR+=c.realized}else{tot.value+=c.liq;tot.cost+=t.price;tot.rfV+=c.liq;tot.rfC+=t.price;tot.rfU+=c.liq-t.price}});
  tot.fees=fees;tot.gain=tot.rA+tot.rF+tot.uA+tot.uF+tot.div+tot.rfU+tot.rfR-fees;
  tot.check=tot.value+proceeds-bought;
  var fl=flows.slice();if(tot.value>0)fl.push([today(),tot.value]);
  tot.xirr=xirr(fl);
  tot.simple=contrib?tot.gain/contrib:0;
  var first=ts.length?ts[0].date:null;
  tot.days=first?Math.round((Date.now()-new Date(first).getTime())/864e5):0;
  tot.fxNow=fxNow;
  return {tot:tot,held:held,closed:closed,warns:warns,rfs:rfs};
}
