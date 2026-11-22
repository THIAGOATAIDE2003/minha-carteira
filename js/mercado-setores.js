/* Aporte · js/mercado-setores.js — Mercado: setores, catálogo da B3, mdStk e índices (parte 4 de 4). Faz parte do antigo mercado.js (mesmo escopo global, ordem de carga importa). */
/* Setores da B3: cada setor com as suas ações (catálogo do robô); pouca liquidez fica escondida, a não ser que você peça */
var SETID='',CATALL=false;try{CATALL=localStorage.getItem(LS+'-catall')==='1'}catch(e){}
function medOf(a){a=a.filter(function(v){return v!=null&&isFinite(v)}).sort(function(x,y){return x-y});return a.length?a[Math.floor(a.length/2)]:null}
function setStats(t){var ds=[],pl=[];t.forEach(function(tk){var F=fundOf(tk);if(!F)return;if(F.dy>0&&F.dy<30)ds.push(F.dy);if(F.pl>0&&F.pl<200)pl.push(F.pl)});return {dy:medOf(ds),pl:medOf(pl)}}
function setRow(tk,F){var nm=nomeEmp(tk),mine=false;try{compute().held.forEach(function(x){if(x.p.ticker===tk)mine=true})}catch(e){}
  return '<button type="button" class="str" data-stk="'+esc(tk)+'">'+tkLogo(tk,false)+'<span class="cct"><b>'+esc(tk)+(mine?' <span class="tag">sua</span>':'')+(catNovo(tk)?' <span class="tag">novo</span>':'')+'</b><small>'+esc(nm)+'</small></span><span class="srm"><b>'+(F&&F.dy!=null?pf.format(F.dy)+'%':'—')+'</b><small>DY</small></span><span class="srm"><b>'+(F&&F.pl!=null?num(F.pl,1):'—')+'</b><small>P/L</small></span></button>'}
function setoresHtml(){
  if(!catOk())return '<div class="panel"><h2>Setores da B3</h2><p class="muted">O catálogo de ações e setores chega com o robô, que preenche aos poucos. Volte mais tarde.</p></div>';
  var S0=catSetores(CATALL),sem=S0.filter(function(x){return x.id==='0'})[0],h='';
  var sw='<button type="button" class="chk'+(CATALL?' on':'')+'" data-catall="1" aria-pressed="'+CATALL+'"><i></i>Mostrar também as de pouca liquidez</button>';
  if(SETID){var o=S0.filter(function(x){return x.id===SETID})[0];
    if(o){var st=setStats(o.t),subs=Object.keys(o.sub).sort(function(a,b){return o.sub[b].length-o.sub[a].length});
      h+='<div class="panel"><button type="button" class="link sback" data-setid="">‹ Todos os setores</button><div class="grp"><h2>'+esc(o.n)+'</h2><span class="det">'+o.t.length+' ações</span></div>'+
        '<p class="small muted" style="margin:2px 0 8px">Mediana do setor: dividendos '+(st.dy!=null?pf.format(st.dy)+'%':'—')+' · P/L '+(st.pl!=null?num(st.pl,1):'—')+'</p>'+
        subs.map(function(k){return '<h3 class="rkh3">'+esc(k)+' <span class="muted">('+o.sub[k].length+')</span></h3>'+o.sub[k].map(function(tk){return setRow(tk,fundOf(tk))}).join('')}).join('')+'<div style="margin-top:12px">'+sw+'</div></div>';return h}
    SETID=''}
  h+='<div class="panel"><div class="grp"><h2>Setores da B3 '+bal('Todas as ações da bolsa (ordinárias, preferenciais e units) agrupadas pelo setor do Fundamentus. Ação nova na bolsa (IPO) entra sozinha. Toque num setor para ver as empresas dele.')+'</h2><span class="det">'+catTickers(CATALL).length+' ações</span></div><div style="margin:4px 0 12px">'+sw+'</div>'+
    S0.filter(function(x){return x.id!=='0'}).map(function(o){var st=setStats(o.t);
      return '<button type="button" class="stc" data-setid="'+o.id+'"><span class="cct"><b>'+esc(o.n)+'</b><small>'+o.t.length+' '+(o.t.length>1?'ações':'ação')+(st.dy!=null?' · DY mediano '+pf.format(st.dy)+'%':'')+(st.pl!=null?' · P/L '+num(st.pl,1):'')+'</small></span><span class="stch">›</span></button>'}).join('')+
    (sem?'<p class="note">'+sem.t.length+' '+(sem.t.length>1?'ações ainda sem setor':'ação ainda sem setor')+': o robô preenche aos poucos.</p>':'')+'</div>';
  return h}
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-setid],[data-catall],[data-clsm]');if(!t)return;
  if(t.hasAttribute('data-setid')){SETID=t.getAttribute('data-setid');window.scrollTo(0,0)}
  else if(t.hasAttribute('data-catall')){CATALL=!CATALL;try{localStorage.setItem(LS+'-catall',CATALL?'1':'0')}catch(x){}}
  else CLSN+=20;
  renderMkt()});
function anaHtml(){
  var sg0=anSeg();
  if(ANV==='rel')return sg0+rsRel();
  if(ANV==='set')return sg0+setoresHtml();
  if(ANV==='opp')return sg0+(oppHtml()||'<div class="panel"><p class="muted">Os dados chegam com o robô diário. Volte em alguns minutos.</p></div>');
  var f=MD.d&&MD.d.fund;if(!f||!f.d)return sg0+'<div class="panel"><p class="muted">Os indicadores chegam com o robô diário. Volte em alguns minutos.</p></div>';
  var sc=SCRS.filter(function(x){return x.k===SCR})[0]||SCRS[0],W=wlist(),mine={};compute().held.forEach(function(x){mine[x.p.ticker]=1});
  var all=Object.keys(f.d).map(function(tk){var F=fundOf(tk);F.tk=tk;return F}).filter(function(F){return F.liq2m>=1e6&&sc.f(F)});
  var seen={},list=all.sort(sc.s).filter(function(F){var b=F.tk.slice(0,4);if(seen[b])return false;seen[b]=1;return true}).slice(0,CLSN);
  var h=clsHtml(all,sc,W,mine,list);
  var R=compute(),dflt=R.held.filter(function(x){return x.p.market!=='US'}).map(function(x){return x.p.ticker});if(!CMP)CMP=[dflt[0]||'ITUB4',dflt[1]||'BBSE3'];
  var A=fundOf(CMP[0]),B=fundOf(CMP[1]),row=function(l,k,fm,better){var a=A&&A[k],b=B&&B[k],wa=a!=null&&b!=null&&(better>0?a>b:a<b),wb=a!=null&&b!=null&&(better>0?b>a:b<a);
    return '<div class="cmpr"><span>'+l+'</span><b class="'+(wa?'gain':'')+'">'+(a!=null?fm(a):'—')+'</b><b class="'+(wb?'gain':'')+'">'+(b!=null?fm(b):'—')+'</b></div>'};
  var n1=function(v){return num(v,2)},pc=function(v){return pf.format(v)+'%'};
  var hm='<div class="panel"><h2>Comparar duas ações '+bal('Digite duas ações para ver os indicadores lado a lado. O melhor de cada linha fica em verde.')+'</h2><form class="cmpf" id="cmpf"><input id="cmp-a" value="'+esc(CMP[0])+'" maxlength="8" autocomplete="off"><span>×</span><input id="cmp-b" value="'+esc(CMP[1])+'" maxlength="8" autocomplete="off"><button class="btn small" type="submit">Comparar</button></form>'+
    '<div class="cmp"><div class="cmpr cmph"><span></span><button type="button" data-stk="'+esc(CMP[0])+'">'+esc(CMP[0])+'</button><button type="button" data-stk="'+esc(CMP[1])+'">'+esc(CMP[1])+'</button></div>'+
    row('Cotação','cot',function(v){return brl.format(v)},0)+row('P/L','pl',n1,-1)+row('P/VP','pvp',n1,-1)+row('Dividendos (DY)','dy',pc,1)+row('ROE','roe',pc,1)+row('ROIC','roic',pc,1)+row('Margem líquida','ml',pc,1)+row('EV/EBITDA','evebitda',n1,-1)+row('Liquidez corrente','lc',n1,1)+row('Receita 5 anos','cr5',pc,1)+'</div>'+
    ((!A||!B)?'<p class="warn" style="margin-top:8px">'+(!A?esc(CMP[0]):esc(CMP[1]))+' não está no Fundamentus (só ações do Brasil).</p>':'')+
    '<p class="note" style="margin-top:8px">Em verde, o melhor dos dois em cada linha. Toque no código para abrir a análise completa.</p></div>';
  return sg0+(ANV==='cmp'?hm:h);
}
function renderMkt(){
  var a=document.activeElement,k=a&&a.id&&/^(INPUT|TEXTAREA)$/.test(a.tagName)&&a.closest&&a.closest('#mkttab')?{id:a.id,s:a.selectionStart,e:a.selectionEnd}:null;
  try{renderMkt0()}finally{
    if(k){var n=document.getElementById(k.id);if(n&&n!==a&&document.activeElement!==n){try{n.focus();if(k.s!=null)n.setSelectionRange(k.s,k.e)}catch(e){}}}}
}
function renderMkt0(){
  var el=$('mkttab');if(!el)return;var I=MKT.idx,f0=fxToday(),fxp=S.fx&&S.fx.prev&&S.fx.rate?(S.fx.rate/S.fx.prev-1)*100:null;
  var q0=$('mk-q')?$('mk-q').value:'',sel=idxSel();
  var on=0;try{var od=opData();on=od?od.n:0}catch(e){}
  var h='<div class="seg" id="mkseg">'+[['min','Minhas ações'],['idx','Índices'],['bc','BC'],['ana','Análise'+(on?' <i class="mkb">'+on+'</i>':'')]].map(function(v){return '<button type="button" data-mkv="'+v[0]+'" aria-pressed="'+(MKV===v[0])+'">'+v[1]+'</button>'}).join('')+'</div>';
  if(MKV!=='bc')h+='<div class="srch"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="mk-q" type="search" placeholder="'+(MKV==='idx'?'Buscar índice, moeda ou ação':MKV==='ana'?'Buscar ação (sigla ou nome)':'Buscar ação: sigla ou nome (ex.: magalu)')+'" autocomplete="off" value="'+esc(q0)+'"></div><div id="mk-res" class="panel mkrp" hidden></div>';
  if(MKV==='idx'){
  try{h+=fgHtml()}catch(e){}
  h+='<div class="panel"><div class="grp"><h2>Índices</h2><span style="display:flex;gap:10px;align-items:center"><span class="det">'+(MKT.busy?'atualizando...':MKT.at?'às '+new Date(MKT.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'')+'</span><button type="button" class="link" data-mked="1">'+(MKED?'Pronto':'Editar')+'</button></span></div>'+
    (sel.length?'<div class="idxg'+(MKED?' ed':'')+'">'+sel.map(function(k){var x=idxDef(k),o=idxVal(x);
      return '<div class="idx"'+(MKED?'':' data-idxo="'+k+'" role="button" tabindex="0"')+'>'+(MKED?'<button type="button" class="idxx" data-idxt="'+k+'" aria-label="Remover '+esc(x.n)+'">✕</button>':'')+'<small>'+esc(x.n)+'</small><b>'+(o&&isFinite(o.v)?idxFmt(x,o.v):'—')+'</b>'+(o&&isFinite(o.p)?'<span class="num '+cls(o.p)+'">'+sg0(o.p)+pf.format(Math.abs(o.p))+'%</span>':'<span class="small muted">'+(o&&o.sub?esc(o.sub):'sem dado')+'</span>')+'</div>'}).join('')+'</div>':'<p class="muted small">Nenhum índice escolhido. Use a busca acima para adicionar.</p>')+
    (MKED?'<p class="note">Toque no ✕ para tirar. Para colocar outro, procure na busca acima.</p>':'')+'</div>';
  h+='<p class="note exp" style="margin:0 4px">Ibovespa e IFIX vêm do brapi, S&P 500 e Nasdaq do Finnhub (pelos ETFs SPY e QQQ), dólar, euro e bitcoin da AwesomeAPI, CDI do Banco Central. Toque numa ação para ver gráfico e indicadores. A lista de acompanhamento fica salva na nuvem.</p>';
  }else if(MKV==='bc'){h+=bcHtml()}else if(MKV==='ana'){h+=anaHtml()}else{h+=mineHtml();
  var W=wlist();
  h+='<div class="panel"><div class="grp"><h2>Acompanhando</h2><span class="det">'+W.length+' ações</span></div>'+
    (W.length?'<ul class="wl">'+W.map(function(tk){var q=MKT.q[tk];return '<li><button type="button" class="wtk" data-stk="'+esc(tk)+'"><b>'+esc(tk)+'</b><small>'+(function(){var F=fundOf(tk);return F?'P/L '+(F.pl!=null?num(F.pl,1):'—')+' · P/VP '+(F.pvp!=null?num(F.pvp,2):'—')+' · DY '+(F.dy!=null?pf.format(F.dy)+'%':'—'):esc(q&&q.name||(isBR(tk)?'Brasil':'EUA'))})()+'</small></button><span class="wpx">'+(q?'<span>'+(q.cur==='USD'?usd:brl).format(q.price)+'</span><span class="num small '+cls(q.pct)+'">'+sg0(q.pct)+pf.format(Math.abs(q.pct||0))+'%</span>':'<span class="muted">—</span>')+'</span><button type="button" class="wx" data-wdel="'+esc(tk)+'" aria-label="Parar de acompanhar '+esc(tk)+'">✕</button></li>'}).join('')+'</ul>':'<p class="muted small">Adicione ações que você quer vigiar, mesmo sem ter. Ex.: PETR4, VALE3, WEGE3, AAPL.</p>')+
    '<form class="wadd" id="wadd"><input id="w-tk" placeholder="Código da ação" maxlength="12" autocomplete="off"><button class="btn" type="submit">Adicionar</button></form>'+
    (MKT.err?'<p class="warn" style="margin-top:8px">'+esc(MKT.err)+'</p>':'')+'</div>';
  }
  setHtml(el,h);
  ['anseg','cchips'].forEach(function(id){var r=id==='anseg'?$(id):el.querySelector('.cchips'),a=r&&r.querySelector('[aria-pressed=true]');if(a)r.scrollLeft=Math.max(0,a.offsetLeft-(r.clientWidth-a.offsetWidth)/2)});
}
/* dados prontos do robô diário (mercado.json no repositório de dados): indicadores do Fundamentus e históricos do Yahoo */
var MD={d:null,etag:'',at:0,busy:false,err:''};
try{var md0=JSON.parse(localStorage.getItem(LS+'-md')||'null');if(md0&&md0.d){MD.d=md0.d;MD.etag=md0.etag||'';MD.at=md0.at||0}}catch(e){}
function loadMD(force){
  if(!S.keys.gh||MD.busy)return Promise.resolve();if(!force&&Date.now()-MD.at<30*60000&&MD.d&&MD.d.prov)return Promise.resolve();
  MD.busy=true;var c=new AbortController(),to=setTimeout(function(){c.abort()},15000),h={'Authorization':'Bearer '+S.keys.gh,'Accept':'application/vnd.github.raw'};if(MD.etag&&MD.d)h['If-None-Match']=MD.etag;
  return fetch('https://api.github.com/repos/'+ghRepo()+'/contents/mercado.json?ref=main',{headers:h,signal:c.signal,cache:'no-store'}).then(function(r){clearTimeout(to);
    if(r.status===304){MD.at=Date.now();return null}if(r.status===404){MD.err='O robô ainda não rodou.';return null}if(!r.ok)throw new Error(r.status);
    var et=r.headers.get('ETag')||'';return r.json().then(function(j){MD.d=j;MD.etag=et;MD.at=Date.now();MD.err='';STKC={};try{provMD()}catch(e){}if(!USR.tape||Date.now()-USR.at>4*60000)usRefresh().then(function(){render()});try{localStorage.setItem(LS+'-md',JSON.stringify({d:j,etag:et,at:MD.at}))}catch(e){}render();if(!$('stk').hidden&&(STK.tk||STK.idx))stkLoad()})})
    .catch(function(e){MD.err='Não consegui ler os dados do robô agora'+(e&&e.message&&e.message!=='The user aborted a request.'?' ('+e.message+')':'')+'.'}).then(function(){MD.busy=false;MD.at=MD.at||Date.now()});
}
/* ===== Catálogo da B3: todas as ações (ON, PN e units) por setor, feito pelo robô (MD.d.cat). Pouca liquidez fica escondida por padrão ===== */
var CATLIQ=2e5;
function catOk(){return !!(MD.d&&MD.d.cat&&MD.d.cat.a)}
function catNovo(tk){var c=MD.d&&MD.d.cat,p=c&&c.a&&c.a[tk];if(!p||!p[0])return false;var t=new Date(p[0]+'T12:00:00-03:00').getTime();return isFinite(t)&&(Date.now()-t)/864e5<=90}
function catLiq(tk){var F=fundOf(tk);return F&&F.liq2m?F.liq2m:0}
function catTickers(todas){if(!catOk())return [];return Object.keys(MD.d.cat.a).filter(function(tk){return todas||catLiq(tk)>=CATLIQ}).sort(function(a,b){return catLiq(b)-catLiq(a)||(a<b?-1:1)})}
function catSetores(todas){if(!catOk())return [];var c=MD.d.cat,g={};
  catTickers(todas).forEach(function(tk){var p=c.a[tk],id=p[1]==null?'0':String(p[1]),o=g[id];if(!o)o=g[id]={id:id,n:id==='0'?'Sem setor':(c.n&&c.n[id])||'Setor '+id,t:[],sub:{}};o.t.push(tk);var ss=p[2]||'Outros';(o.sub[ss]=o.sub[ss]||[]).push(tk)});
  return Object.keys(g).map(function(k){return g[k]}).sort(function(a,b){return a.id==='0'?1:b.id==='0'?-1:a.n<b.n?-1:a.n>b.n?1:0})}
function catSaiu(){var c=MD.d&&MD.d.cat;return c&&c.x?Object.keys(c.x).sort():[]}
function fundOf(tk){var f=MD.d&&MD.d.fund;if(!f||!f.d||!f.d[tk])return null;var o={};f.cols.forEach(function(c,i){var v=f.d[tk][i];o[c]=v===0&&c!=='dy'?null:v});
  var b=MD.d.bal&&MD.d.bal[tk];if(o.divpl==null&&b&&b.divb>0&&b.pl>0)o.divpl=b.divb/b.pl;return o}
function livePx(tk){var q=S.quotes[tk],m=MKT.q[tk],a=q&&q.src==='auto'&&q.price>0?{p:q.price,pct:q.prev?(q.price/q.prev-1)*100:null,at:q.at||0}:null,b=m&&m.price>0?{p:m.price,pct:m.pct,at:m.at||0}:null;var r=a&&b?(b.at>a.at?b:a):a||b;var hh=MD.d&&MD.d.hist&&MD.d.hist[tk],lc=hh&&hh.last>0?hh.last:0;if(r){r.sus=(a&&b&&Math.abs(a.p/b.p-1)>.05&&Math.abs(a.at-b.at)<30*60000)?'duas fontes de preço diferem '+pf.format(Math.abs(a.p/b.p-1)*100)+'%':(lc&&Math.abs(r.p/lc-1)>.35)?'muito diferente do último fechamento ('+pf.format((r.p/lc-1)*100)+'%)':''}
  if(r&&r.pct!=null&&tk.charAt(0)!=='^'&&dzero(!isBR(tk),r.at))r={p:r.p,pct:0,pr:r.pct,at:r.at,sus:r.sus};return r}
/* um preço só em todo o app: o mais recente entre o que o app buscou e o que o robô trouxe na faixa vale para todas as abas */
var TPTS=0;
function tapeMerge(){var t=MD.d&&MD.d.tape;if(!t||!t.it||t.ts===TPTS)return;TPTS=t.ts;var at=t.ts*1000,ch=0;
  t.it.forEach(function(x){var l=x[0];if(!tpStk(x)||!(x[1]>0))return;var q=S.quotes[l];
    if(q&&q.src==='auto'){if((q.at||0)<at){S.quotes[l]={price:x[1],prev:x[2],at:at,src:'auto'};ch=1}}
    else if(!q){var m=MKT.q[l];if(!m||(m.at||0)<at)MKT.q[l]={price:x[1],pct:(x[1]/x[2]-1)*100,cur:x[3],name:m&&m.name||'',at:at}}});
  if(ch)save()}
function tapeIdx(lbl){var t=MD.d&&MD.d.tape;if(!t||!t.it)return null;for(var i=0;i<t.it.length;i++)if(t.it[i][0]===lbl)return {v:t.it[i][1],p:(t.it[i][1]/t.it[i][2]-1)*100,at:t.ts*1000};return null}
function mdStk(tk,rg){
  var h=MD.d&&MD.d.hist&&MD.d.hist[tk];if(!h||!h.d||h.d.length<2)return null;
  var days={'1mo':31,'3mo':93,'6mo':183,'1y':366,'2y':731}[rg],src=rg==='5y'||rg==='2y'?(h.w||[]):h.d,t0=days?Date.now()/864e5-days:0;
  var hist=src.filter(function(p){return p[0]>=t0}).map(function(p){return {t:p[0]*864e5,c:p[1]}});
  var pv=h.d.length>1?h.d[h.d.length-2][1]:null,lv=livePx(tk),price=lv?lv.p:h.last,pct=lv&&lv.pct!=null?(lv.pr!=null?lv.pr:lv.pct):(h.last&&pv?(h.last/pv-1)*100:null);
  if(lv&&hist.length&&lv.p>0)hist.push({t:Date.now(),c:lv.p});
  var F=fundOf(tk),y1=h.d.map(function(p){return p[1]}),yr=Date.now()/864e5-365,d12=(h.div||[]).filter(function(x){return x[0]>=yr}).reduce(function(a,x){return a+x[1]},0);
  var pc=function(v){return v==null?null:v/100};
  var k={hi:Math.max.apply(null,y1),lo:Math.min.apply(null,y1),d12:d12};
  if(F){k.pl=F.pl||null;k.pvp=F.pvp||null;k.dy=pc(F.dy);k.roe=pc(F.roe);k.roic=pc(F.roic);k.ml=pc(F.ml);k.evebitda=F.evebitda||null;k.div=F.divpl;k.lc=F.lc;k.lpa=F.pl&&price?price/F.pl:null;k.cr5=pc(F.cr5)}
  return {cur:h.cur||'BRL',name:h.name||'',price:price,pct:pct,hist:hist,k:k,mods:!!F||h.cur==='USD',fast:true,
    divs:(h.div||[]).slice(-8).reverse().map(function(x){return {label:'Provento',exDate:new Date(x[0]*864e5).toISOString().slice(0,10),rate:x[1]}})};
}
/* página da ação */
var STK={tk:'',rng:'1y',d:null,busy:false,err:''},STKC={};
function stkOpen(tk){if(typeof THE!=='undefined')THE=null;STK={tk:tk,rng:STK.rng||'1y',d:null,busy:false,err:''};$('stk').hidden=false;document.body.style.overflow='hidden';$('stk-h').textContent=tk;stkLoad()}
/* página de um índice (dados do robô diário: Yahoo para bolsas e moedas, Banco Central para CDI e IPCA) */
function idxOpen(k){var x=idxDef(k);if(x&&(x.src==='fut'||FUTX[k])){try{futLoad()}catch(e){}}STK={tk:'',idx:k,rng:STK.rng&&STK.rng!=='2y'?STK.rng:'1y',d:null};$('stk').hidden=false;document.body.style.overflow='hidden';$('stk-h').textContent=x?x.n:k;idxRender();if(!MD.d||!MD.d.idx)loadMD(true)}
function idxRender(){
  var b=$('stk-b'),k=STK.idx,x=idxDef(k),D=MD.d&&MD.d.idx&&MD.d.idx[k],rg=STK.rng;if(!b||!x)return;
  var rate=x.src==='cdi'||x.src==='ipca'||x.src==='selic'||x.k==='tnx',sym=D&&D.sym||'',same=!D||x.src==='usd'||x.src==='fx'||sym===x.s||sym===x.s+'.SA';
  var fmt=rate?function(v){return pf.format(v)+'%'}:same?function(v){return idxFmt(x,v)}:sym.charAt(0)==='^'?function(v){return num(v,0)+' pts'}:function(v){return usd.format(v)};
  if(!D||!D.d||D.d.length<2){setHtml(b,'<p class="muted">'+(MD.busy?'Buscando o histórico...':'O histórico de '+esc(x.n)+' chega com o robô diário. Volte em alguns minutos.')+'</p>');return}
  if(rate&&rg==='yr')rg=STK.rng='1y';
  var days={'1mo':31,'3mo':93,'6mo':183,'1y':366,'ytd':366,'2y':731}[rg],src=rg==='5y'||rg==='max'||rg==='yr'||rg==='2y'||(k==='ipca'&&rg!=='1mo')?(D.w||D.d):D.d,t0=days?Date.now()/864e5-days:0;
  var hist=src.filter(function(p){return p[0]>=t0}).map(function(p){return {t:p[0]*864e5,c:p[1]}});
  var o=idxVal(x),last=same&&o&&isFinite(o.v)?o.v:D.last,dp=o&&isFinite(o.p)?o.p:null;
  if(!rate&&same&&o&&isFinite(o.v)&&hist.length)hist.push({t:Date.now(),c:o.v});
  var ch=hist.length>1?(rate?hist[hist.length-1].c-hist[0].c:hist[hist.length-1].c/hist[0].c-1):null;
  var y1=(D.d||[]).map(function(p){return p[1]}),hi=Math.max.apply(null,y1),lo=Math.min.apply(null,y1);
  var at=function(daysAgo){var t=Date.now()/864e5-daysAgo,a=(daysAgo>370?D.w:D.d)||[];for(var i=a.length-1;i>=0;i--)if(a[i][0]<=t)return a[i][1];return null};
  var v1=at(365),v5=at(1790),chg=function(a){return a==null||!last?'—':((last/a-1)>=0?'+':'−')+pf.format(Math.abs((last/a-1)*100))+'%'};
  var fv=finView(sym,rg,true),fo=null,fmsg='';if(fv){if(fv.st==='ok'){hist=fv.hist;fo=fv.o;if(!rate&&same&&o&&isFinite(o.v))hist=finTail(hist,o.v,Date.now(),fo)}else{fmsg=fv.msg;hist=rg==='5d'?hist.slice(-6):[]}}
  hist=rgCut(hist,STK.rng);ch=hist.length>1?(rate?hist[hist.length-1].c-hist[0].c:finLast(hist)/((fo&&fo.prev)||finBase(hist))-1):null;
  var pAbs=ch==null?null:rate?ch:finLast(hist)-((fo&&fo.prev)||finBase(hist)),pPct=ch==null?null:rate?(hist[0].c?ch/hist[0].c*100:null):ch*100,per=rg==='yr'||ch==null?'1d':rg;
  if(ch==null||rg==='yr'){pPct=dp;pAbs=dp!=null&&last!=null?last-last/(1+dp/100):null}
  var st=finStat(rate?'':sym),h='<div class="gcard">'+gHead(x.t,'',last!=null?fmt(last):'—',pAbs,pPct,per,'',o&&o.at?gWhen(o.at):(MD.d&&MD.d.at?gWhen(MD.d.at):''))+whyHtml(k,dp,x.n)+
    rngBar(rg,rate?['yr','max']:[])+((rg==='yr'&&!rate)?annHtml(annRets(hist,null)):(fmsg?'<p class="muted small" style="margin:12px 0">'+esc(fmsg)+(rg==='5d'?' Por enquanto, os fechamentos dos últimos dias.':'')+'</p>':'')+(fmsg&&rg!=='5d'?'':lineChart(hist,'BRL',null,fmt,fo)))+(rate?'':gStats([['Abertura',st&&st.o!=null?pf.format(st.o):null],['Alta',st&&st.h!=null?pf.format(st.h):null],['Baixa',st&&st.l!=null?pf.format(st.l):null],['Fech. ant.',st&&st.prev!=null?pf.format(st.prev):null],['Alt 52 sem',pf.format(hi)],['Bai 52 sem',pf.format(lo)]]))+'</div>';
  var rows=rate?[['Agora',last!=null?fmt(last):'—'],['Há 1 ano',v1!=null?fmt(v1):'—'],['Há 5 anos',v5!=null?fmt(v5):'—'],['Máxima (1 ano)',fmt(hi)],['Mínima (1 ano)',fmt(lo)]]
    .concat(k==='cdi'&&D.acc12!=null?[['Rendeu em 12 meses',pf.format(D.acc12)+'%']]:[]).concat(k==='ipca'&&D.mes!=null?[['Último mês',pf.format(D.mes)+'%']]:[])
    :[['Em 12 meses',chg(v1)],['Em 5 anos',chg(v5)],['Máxima (1 ano)',fmt(hi)],['Mínima (1 ano)',fmt(lo)],['Distância da máxima',last&&hi?'−'+pf.format(Math.abs((last/hi-1)*100))+'%':'—']];
  h+=futStrip(k);
  h+='<h3 style="margin:18px 0 6px">Resumo</h3><div class="kpis">'+rows.map(function(r){return '<div><span>'+r[0]+'</span><b>'+r[1]+'</b></div>'}).join('')+'</div>'+
    '<p class="note">'+(rate?(k==='cdi'?'CDI em % ao ano, do Banco Central. É o juro que os bancos cobram entre si e fica sempre um pouco abaixo da Selic; é ele que rende CDB, LCI e LCA.':k==='selic'?'Selic meta em % ao ano, do Banco Central. É a taxa básica de juros, definida pelo Copom a cada 45 dias; o CDI anda colado nela, uns 0,10 ponto abaixo.':'IPCA acumulado em 12 meses, do Banco Central (IBGE).'):(same?'Histórico do Yahoo Finance'+(sym?' ('+esc(sym)+')':'')+', atualizado pelo robô diário; o valor de agora vem das APIs do app.':'Gráfico do próprio índice ('+esc(sym)+', Yahoo Finance) pelo fechamento mais recente; a variação de hoje vem do '+esc(x.s)+', que acompanha o índice.'))+'</p>';
  setHtml(b,h);
}
function rgEff(){return STK.rng==='yr'||STK.rng==='max'?'5y':STK.rng==='ytd'?'1y':STK.rng==='1d'||STK.rng==='5d'?'1mo':STK.rng}
/* valorização ano a ano: do último preço do ano anterior ao último do ano (o ano atual vai até hoje) */
function annRets(hist,live){var by={},ys=[];hist.forEach(function(p){var y=new Date(p.t).getUTCFullYear();if(!by[y]){by[y]=[];ys.push(y)}by[y].push(p)});ys.sort();
  var cy=new Date().getFullYear(),out=[];
  ys.forEach(function(y,i){var a=by[y],end=a[a.length-1].c;if(y===cy&&live>0)end=live;var pv=i&&by[ys[i-1]]&&ys[i-1]===y-1?by[ys[i-1]]:null,st=pv?pv[pv.length-1].c:a[0].c;
    if(!(st>0))return;out.push({y:y,r:end/st-1,part:!pv,from:pv?null:a[0].t,cur:y===cy,st:st,end:end})});
  return out}
function annHtml(rows){if(!rows.length)return '<p class="muted small" style="margin:12px 0">Sem histórico suficiente para ver ano a ano.</p>';
  var mx=Math.max.apply(null,rows.map(function(r){return Math.abs(r.r)}))||1,f=rows[0],l=rows[rows.length-1],tot=l.end/f.st-1;
  var yrs=(Date.parse(new Date(l.cur?Date.now():Date.UTC(l.y,11,31)).toISOString())-(f.from||Date.UTC(f.y-1,11,31)))/(365.25*864e5),cagr=yrs>=1?Math.pow(1+tot,1/yrs)-1:null;
  var sg=function(v){return (v>=0?'+':'−')+pf.format(Math.abs(v*100))+'%'};
  return '<ul class="anr">'+rows.slice().reverse().map(function(r){return '<li><span>'+r.y+(r.cur?' <small>até hoje</small>':r.part?' <small>desde '+new Date(r.from).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'})+'</small>':'')+'</span><i><em class="'+(r.r>=0?'g':'l')+'" style="width:'+Math.max(2,Math.abs(r.r)/mx*100).toFixed(1)+'%"></em></i><b class="num '+cls(r.r)+'">'+sg(r.r)+'</b></li>'}).join('')+'</ul>'+
    '<div class="kpis" style="margin-top:12px"><div><span>Acumulado no período</span><b class="'+cls(tot)+'">'+sg(tot)+'</b></div>'+(cagr!=null?'<div><span>Média por ano</span><b class="'+cls(cagr)+'">'+sg(cagr)+'</b></div>':'')+'</div>'+
    '<p class="note">Cada ano compara o último preço do ano com o último do ano anterior'+(rows.some(function(r){return r.part})?'; o primeiro ano conta só a partir de quando o histórico começa':'')+'. Só o preço, sem somar dividendos.</p>'}
