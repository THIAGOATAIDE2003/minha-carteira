/* Aporte · js/inicio.js — aba Início: valorização, distribuição e cartões do topo.
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
/* rótulo da variação do dia: fora do pregão mostra o último dia de negociação */
function dayLbl(){var b=brt();
  if(bDay(b.d)&&b.min>=600)return {t:'hoje',b:'Quanto suas ações e o VT subiram ou caíram hoje, comparando o preço de agora com o fechamento do pregão anterior.'};
  var d=new Date(lastClose()-3*3600000),dn=['domingo','segunda','terça','quarta','quinta','sexta','sábado'][d.getUTCDay()];
  return {d:dn,t:'no último pregão ('+dn+')',b:'A bolsa está fechada agora. Esse é quanto suas ações e o VT subiram ou caíram no último dia de negociação ('+dn+'), comparado com o fechamento do dia anterior. Volta a mexer quando a bolsa abrir.'}}
/* valorização só pelo preço (VT pelo dólar de hoje, sem câmbio) + proventos recebidos */
function valoriz(R){var T=R.tot,fx=T.fxNow||1,pv=0,base=0;
  R.held.forEach(function(x){if(x.p.market==='US'){pv+=(x.p.qty*x.P1-x.p.cN)*fx;base+=x.p.cN*fx}else{pv+=x.v-x.p.cB;base+=x.p.cB}});
  pv+=T.rfV-T.rfC;base+=T.rfC;var g=pv+T.div;return {pv:pv,div:T.div,g:g,base:base,p:base?g/base:0}}
/* distribuição: páginas de arrastar (tipo, todos, ações, ETFs, renda fixa), toque na fatia mostra % e R$ */
var DCI=0;
function distHtml(R){
  var T=R.tot,cs=['var(--c1)','var(--c2)','var(--c6)','var(--c4)','var(--c5)','var(--c3)'];
  var br=R.held.filter(function(x){return x.p.market!=='US'}).map(function(x){return {n:x.p.ticker,v:x.v}}),us=R.held.filter(function(x){return x.p.market==='US'}).map(function(x){return {n:x.p.ticker,v:x.v}});
  var rf=(R.rfs||[]).filter(function(c){return !c.rs}).map(function(c){return {n:c.t.ticker,v:CDI.dates.length?c.liq:c.t.price}});
  var sm=function(a){return a.reduce(function(s,x){return s+x.v},0)};
  var pages=[{t:'Por tipo',it:[{n:'Ações',v:sm(br)},{n:'ETFs Intern.',v:sm(us)},{n:'Renda fixa',v:sm(rf)}].filter(function(x){return x.v>0})},{t:'Todos os ativos',it:br.concat(us,rf)}];
  if(br.length)pages.push({t:'Ações',it:br});if(us.length)pages.push({t:'ETFs Intern.',it:us});if(rf.length)pages.push({t:'Renda fixa',it:rf});
  if(DCI>=pages.length)DCI=0;
  var pg=pages.map(function(p){var it=p.it.slice().sort(function(a,b){return b.v-a.v}),tot=sm(it),top=it.slice(0,6),rest=sm(it.slice(6));if(rest>0)top.push({n:'Outros',v:rest});
    top.forEach(function(x,i){x.c=x.n==='Outros'?'var(--muted)':cs[i%cs.length]});
    var r=70,C=2*Math.PI*r,off=0,seg=top.map(function(i){var f=i.v/tot,l=Math.max(0,f*C-(top.length>1?2:0)),o='<circle class="dsl" data-n="'+esc(i.n)+'" data-p="'+pf.format(f*100)+'%" data-v="'+brl.format(i.v)+'" r="'+r+'" cx="100" cy="100" fill="none" stroke="'+i.c+'" stroke-width="44" stroke-dasharray="'+l.toFixed(2)+' '+(C-l).toFixed(2)+'" stroke-dashoffset="'+(-off).toFixed(2)+'" transform="rotate(-90 100 100)"/>';off+=f*C;return o}).join('');
    return '<div class="dpg"><div class="dttl">'+esc(p.t)+'<span>'+brl.format(tot)+'</span></div><div class="dwr2"><svg viewBox="0 0 200 200" class="dnt2" role="img" aria-label="Distribuição '+esc(p.t)+'">'+seg+'</svg></div>'+
      '<ul class="leg2">'+top.map(function(i){return '<li><i style="background:'+i.c+'"></i><span>'+esc(i.n)+'</span><span class="num">'+pf.format(i.v/tot*100)+'%</span></li>'}).join('')+'</ul></div>'}).join('');
  return '<div class="panel dpanel"><div class="grp"><h2>Distribuição</h2></div><div class="dcar" id="dcar">'+pg+'</div><div class="hdots">'+pages.map(function(p,i){return '<i data-dci="'+i+'"'+(i===DCI?' class="on"':'')+'></i>'}).join('')+'</div></div>';
}
document.addEventListener('scroll',function(e){var c=e.target;if(!c||c.id!=='dcar')return;var i=Math.round(c.scrollLeft/Math.max(1,c.clientWidth));if(i!==DCI){DCI=i;var dp=c.parentNode;[].forEach.call(dp.querySelectorAll('.hdots i'),function(d){d.classList.toggle('on',+d.getAttribute('data-dci')===i)})}dtipHide()},true);
function dtipHide(){var d=$('dtip');if(d)d.hidden=true;[].forEach.call(document.querySelectorAll('.dsl.dim'),function(c){c.classList.remove('dim')})}
document.addEventListener('pointerdown',function(e){var c=e.target.closest&&e.target.closest('.dsl');if(!c){if(!(e.target.closest&&e.target.closest('#dtip')))dtipHide();return}
  var d=$('dtip');if(!d){d=document.createElement('div');d.id='dtip';document.body.appendChild(d)}
  [].forEach.call(c.parentNode.querySelectorAll('.dsl'),function(x){x.classList.toggle('dim',x!==c)});
  d.innerHTML='<b>'+esc(c.getAttribute('data-n'))+'</b>: '+esc(c.getAttribute('data-p'))+'<br>'+esc(c.getAttribute('data-v'));d.hidden=false;
  var w=d.offsetWidth,h=d.offsetHeight,vw=document.documentElement.clientWidth;d.style.left=Math.min(Math.max(12,e.clientX-w/2),vw-w-12)+'px';d.style.top=(e.clientY+window.scrollY-h-14)+'px'});
function renderSummary(R){
  var T=R.tot,el=$('summary');
  if(!S.trades.length){
    el.innerHTML='<div class="panel empty"><h2>Sua carteira está vazia</h2><p>Conecte seus dados da nuvem em Mais, ou lance sua primeira compra no Extrato.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="goimp" type="button">Conectar meus dados</button></div></div>';
    return;
  }
  var times=Object.keys(S.quotes).map(function(k){return S.quotes[k].at}).filter(Boolean);times.sort();
  var dn=0,dp=0,dok=0,dB=0,dU=0,pB=0,pU=0;R.held.forEach(function(x){var q=S.quotes[x.p.ticker];if(!q||!q.prev||q.src!=='auto')return;var us=x.p.market==='US',F=us?T.fxNow:1,a=x.p.qty*q.price*F,c=x.p.qty*q.prev*F;dn+=a;dp+=c;if(us){dU+=a-c;pU+=c}else{dB+=a-c;pB+=c}dok++});
  var VZ=valoriz(R),dl=dayLbl(),ctp=0,vtp=0;R.held.forEach(function(x){if(x.p.market==='US'){ctp+=x.p.cN*T.fxNow;vtp+=x.p.qty*x.P1*T.fxNow}else{ctp+=x.p.cB;vtp+=x.v}});ctp+=T.rfC;vtp+=T.rfV;
  var pv=vtp-ctp,arrow=function(v){return '<span class="arw '+cls(v)+'">'+(v>=0?'▲':'▼')+'</span>'};
  var card=function(ic,tit,info,main,sub,hk){return '<div class="hc"><div class="hct"><span class="hci">'+ic+'</span><span>'+tit+'</span>'+bal(info)+'</div><div class="hcg" data-hero="'+hk+'" role="button" tabindex="0">'+main+'</div><div class="hcs">'+sub+'</div></div>'};
  var IC={pat:'<svg viewBox="0 0 24 24"><path d="M4 11a7 6 0 0 1 13-2h2v4l-2 1-1 3h-3v-2H9v2H6l-1-3a5 5 0 0 1-1-3z"/><circle cx="15" cy="11" r="1"/></svg>',
    val:'<svg viewBox="0 0 24 24"><path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/></svg>',
    dia:'<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>'};
  var cards=[
    card(IC.pat,'Patrimônio total','Quanto vale tudo que você tem hoje. A porcentagem compara com o valor investido (o que você pagou, com o VT pelo dólar de hoje), só pelo preço.',
      '<div class="hcm"><b class="num">'+brl.format(T.value+T.cash)+'</b>'+(ctp?'<span class="num '+cls(pv)+'">'+pct(pv/ctp)+' '+arrow(pv)+'</span>':'')+'</div>',
      '<div><small>Valor investido</small><span class="num">'+brl.format(ctp)+'</span></div><button type="button" class="evolink" data-goto="evolucao">Ver evolução</button>','pat'),
    card(IC.val,'Valorização','Quanto o preço de tudo que você tem subiu ou caiu desde a compra (ganho de capital), mais os proventos que você já recebeu. Sem câmbio e sem vendas: esses ficam em Carteira → Desempenho.',
      '<div class="hcm"><b class="num '+cls(VZ.g)+'">'+sgn(VZ.g)+'</b><span class="num '+cls(VZ.g)+'">'+pct(VZ.p)+' '+arrow(VZ.g)+'</span></div>',
      '<div><small>Ganho de capital</small><span class="num">'+sgn(VZ.pv)+'</span></div><div><small>Proventos recebidos</small><span class="num">'+brl.format(VZ.div)+'</span></div>','val'),
    card(IC.dia,dl.t==='hoje'?'Variação de hoje':'Último pregão ('+dl.d+')',dl.t==='hoje'?'Quanto suas ações (Brasil e VT) subiram ou caíram hoje, só pelo preço. O VT entra pelo dólar de hoje, sem a variação do dólar.':'A bolsa está fechada. Esse é quanto suas ações (Brasil e VT) subiram ou caíram no último dia de negociação ('+dl.d+'), só pelo preço, sem a variação do dólar.',
      (dok&&dp>0?'<div class="hcm"><b class="num '+cls(dn-dp)+'">'+sgn(dn-dp)+'</b><span class="num '+cls(dn-dp)+'">'+pct((dn-dp)/dp)+' '+arrow(dn-dp)+'</span></div>':'<div class="hcm"><b class="num muted">—</b></div>'),
      (pB?'<div><small>Brasil</small><span class="num '+cls(dB)+'">'+pct(dB/pB)+'</span></div>':'')+(pU?'<div><small>VT</small><span class="num '+cls(dU)+'">'+pct(dU/pU)+'</span></div>':'')+(times.length&&dl.t==='hoje'?'<div><small>Preços de</small><span>'+hm(times[times.length-1])+'</span></div>':''),'dia')];
  cards=[cards[0],cards[2],cards[1]];
  var h='<div class="hcw"><div class="hcards" id="hcards">'+cards.join('')+'</div><div class="hdots">'+cards.map(function(c,i){return '<i data-hci="'+i+'"'+(i===HCI?' class="on"':'')+'></i>'}).join('')+'</div></div>';
  if(R.warns.length)h+=R.warns.map(function(w){return '<p class="warn">'+esc(w)+'</p>'}).join('');
  if(T.missing.length)h+='<p class="warn">Sem preço atual para '+esc(T.missing.join(', '))+'. Usei o preço médio até a cotação chegar.</p>';


  if(T.value>0)h+=distHtml(R);
  h+=metasHtml(R);
  el.innerHTML=h;
  var hc=$('hcards');if(hc&&HCI){hc.scrollLeft=HCI*hc.clientWidth}mtCenter();var dc=$('dcar');if(dc&&DCI){dc.scrollLeft=DCI*dc.clientWidth}
}
var HCI=0;
document.addEventListener('scroll',function(e){var hc=e.target;if(!hc||hc.id!=='hcards')return;var i=Math.round(hc.scrollLeft/Math.max(1,hc.clientWidth));if(i!==HCI){HCI=i;[].forEach.call(document.querySelectorAll('.hdots i'),function(d){d.classList.toggle('on',+d.getAttribute('data-hci')===i)})}},true);

/* toque nos números do Início: gráfico com períodos (evolução mensal) */
var HERON={pat:'Patrimônio total',val:'Valorização (ganho de capital)',dia:'Variação de hoje'};
function heroOpen(k){STK={tk:'',hero:k,rng:'1y',d:null};$('stk').hidden=false;document.body.style.overflow='hidden';$('stk-h').textContent=HERON[k]||'';heroRender()}
function heroRender(){
  var b=$('stk-b'),k=STK.hero;if(!b)return;
  if(k==='dia'){b.innerHTML='<p class="muted">O gráfico do dia, minuto a minuto, chega com a próxima etapa (o robô precisa passar a guardar os preços do dia). Por enquanto, a variação de hoje aparece no cartão.</p>';return}
  var rows=evoData(),T=compute().tot,rg=STK.rng,days={'1mo':31,'3mo':93,'6mo':183,'1y':366,'ytd':366,'2y':731}[rg],t0=days?Date.now()-days*864e5:0;
  var all=rows.map(function(r){var g=0;['BR','US','RF'].forEach(function(s){var q=r.seg&&r.seg[s];if(q)g+=q.v-q.c});return {t:Date.parse(monthEnd(r.m)),c:k==='pat'?r.pat:g}});
  var now=k==='pat'?T.value+T.cash:all.length?all[all.length-1].c:0;if(all.length)all[all.length-1]={t:Date.now(),c:k==='pat'?now:all[all.length-1].c};
  var hist=rgCut(all.filter(function(p){return p.t>=t0}),rg);if(hist.length<2&&all.length>1)hist=all.slice(-2);
  var ch=hist.length>1?hist[hist.length-1].c-hist[0].c:null,base=hist.length>1?hist[0].c:0,pc=ch!=null&&base>0&&k==='pat'?ch/base*100:null,last=hist.length?hist[hist.length-1].c:0;
  b.innerHTML=gHead(HERON[k],'',brl.format(last),ch,pc!=null?pc:(ch!=null?0:null),rg,ch!=null?(ch>=0?'+':'−')+brl.format(Math.abs(ch)):'','')+rngBar(rg,['yr'])+lineChart(hist,'BRL',null)+
    '<p class="note">Pontos de fim de mês (o último é hoje), pela mesma conta da Evolução. Só preço: sem câmbio de vendas e sem proventos.</p>';
}
