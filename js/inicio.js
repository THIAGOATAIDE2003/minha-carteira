/* Aporte · js/inicio.js — aba Início: valorização, distribuição e cartões do topo.
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
/* rótulo da variação do dia: fora do pregão mostra o último dia de negociação */
function dayLbl(){var b=brt();
  if(bDay(b.d)&&b.min>=600)return {t:'hoje',b:'Quanto suas ações e o VT subiram ou caíram hoje, comparando o preço de agora com o fechamento do pregão anterior.'};
  return {t:'hoje',d:'',b:'A bolsa ainda não abriu (ou está fechada hoje): a variação do dia fica zerada e volta a mexer quando o pregão abrir.'}}
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
  setHtml(d,'<b>'+esc(c.getAttribute('data-n'))+'</b>: '+esc(c.getAttribute('data-p'))+'<br>'+esc(c.getAttribute('data-v')));d.hidden=false;
  var w=d.offsetWidth,h=d.offsetHeight,vw=document.documentElement.clientWidth;d.style.left=Math.min(Math.max(12,e.clientX-w/2),vw-w-12)+'px';d.style.top=(e.clientY+window.scrollY-h-14)+'px'});
function renderSummary(R){
  var T=R.tot,el=$('summary');
  if(!S.trades.length){
    setHtml(el,'<div class="panel empty"><h2>Sua carteira está vazia</h2><p>Conecte seus dados da nuvem em Mais, ou lance sua primeira compra no Extrato.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="goimp" type="button">Conectar meus dados</button></div></div>');
    return;
  }
  var times=Object.keys(S.quotes).map(function(k){return S.quotes[k].at}).filter(Boolean);times.sort();
  var dn=0,dp=0,dok=0,dB=0,dU=0,pB=0,pU=0;R.held.forEach(function(x){var q=S.quotes[x.p.ticker];if(!q||!q.prev||q.src!=='auto')return;var us=x.p.market==='US',F=us?T.fxNow:1,a=x.p.qty*q.price*F,c=dzero(us,q.at)?a:x.p.qty*q.prev*F;dn+=a;dp+=c;if(us){dU+=a-c;pU+=c}else{dB+=a-c;pB+=c}dok++});
  var VZ=valoriz(R),dl=dayLbl(),ctp=0,vtp=0;R.held.forEach(function(x){if(x.p.market==='US'){ctp+=x.p.cN*T.fxNow;vtp+=x.p.qty*x.P1*T.fxNow}else{ctp+=x.p.cB;vtp+=x.v}});ctp+=T.rfC;vtp+=T.rfV;
  var pv=vtp-ctp,arrow=function(v){return '<span class="arw '+cls(v)+'">'+(Math.abs(v)<0.005?'':v>0?'▲':'▼')+'</span>'};
  var card=function(ic,tit,info,main,sub,hk){return '<div class="hc"><div class="hct"><span class="hci">'+ic+'</span><span>'+tit+'</span>'+bal(info)+'</div><div class="hcg" data-hero="'+hk+'" role="button" tabindex="0">'+main+'</div><div class="hcs">'+sub+'</div></div>'};
  var IC={pat:'<svg viewBox="0 0 24 24"><path d="M4 11a7 6 0 0 1 13-2h2v4l-2 1-1 3h-3v-2H9v2H6l-1-3a5 5 0 0 1-1-3z"/><circle cx="15" cy="11" r="1"/></svg>',
    val:'<svg viewBox="0 0 24 24"><path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/></svg>',
    cam:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M14.5 9.2c-.4-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.7-2.5 1.9 0 2.7 5 1.3 5 4 0 1.2-1.1 2-2.5 2-1.2 0-2.2-.5-2.6-1.4M12 6.5V8m0 8v1.5"/></svg>',
    luc:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M9 12h6"/></svg>',
    dia:'<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>'};
  var cards=[
    card(IC.pat,'Patrimônio total','Quanto vale tudo que você tem hoje. A porcentagem compara com o valor investido (o que você pagou, com o VT pelo dólar de hoje), só pelo preço.',
      '<div class="hcm"><b class="num">'+brl.format(T.value+T.cash)+'</b>'+(ctp?'<span class="num '+cls(pv)+'">'+pct(pv/ctp)+' '+arrow(pv)+'</span>':'')+'</div>',
      '<div class="hcl" data-hero="inv" role="button" tabindex="0"><small>Valor investido ›</small><span class="num">'+brl.format(ctp)+'</span></div><button type="button" class="evolink" data-goto="evolucao">Ver evolução</button>','pat'),
    card(IC.val,'Valorização','Quanto o preço de tudo que você tem subiu ou caiu desde a compra (ganho de capital), mais os proventos que você já recebeu. Sem câmbio e sem vendas: esses ficam em Carteira → Desempenho.',
      '<div class="hcm"><b class="num '+cls(VZ.g)+'">'+sgn(VZ.g)+'</b><span class="num '+cls(VZ.g)+'">'+pct(VZ.p)+' '+arrow(VZ.g)+'</span></div>',
      '<div class="hcl" data-hero="val" role="button" tabindex="0"><small>Ganho de capital ›</small><span class="num">'+sgn(VZ.pv)+'</span></div><div><small>Proventos recebidos</small><span class="num">'+brl.format(VZ.div)+'</span></div>','val'),
    card(IC.dia,dl.t==='hoje'?'Variação de hoje':'Último pregão ('+dl.d+')',dl.t==='hoje'?'Quanto suas ações (Brasil e VT) subiram ou caíram hoje, só pelo preço. O VT entra pelo dólar de hoje, sem a variação do dólar.':'A bolsa está fechada. Esse é quanto suas ações (Brasil e VT) subiram ou caíram no último dia de negociação ('+dl.d+'), só pelo preço, sem a variação do dólar.',
      (dok&&dp>0?'<div class="hcm"><b class="num '+cls(dn-dp)+'">'+sgn(dn-dp)+'</b><span class="num '+cls(dn-dp)+'">'+pct((dn-dp)/dp)+' '+arrow(dn-dp)+'</span></div>':'<div class="hcm"><b class="num muted">—</b></div>'),
      (pB?'<div><small>Brasil</small><span class="num '+cls(dB)+'">'+pct(dB/pB)+'</span></div>':'')+(pU?'<div><small>VT</small><span class="num '+cls(dU)+'">'+pct(dU/pU)+'</span></div>':'')+(times.length&&dl.t==='hoje'?'<div><small>Preços de</small><span'+(mktOpen()&&Date.now()-times[times.length-1]>30*60000?' class="loss" title="atrasados"':'')+'>'+hm(times[times.length-1])+(mktOpen()&&Date.now()-times[times.length-1]>30*60000?' (atrasados)':'')+'</span></div>':''),'dia')];
  var nUSh=R.held.some(function(x){return x.p.market==='US'&&x.p.qty>0});
  if(nUSh){var fxr=(fxToday()||{}).rate,fp=S.fx&&S.fx.prev>0&&S.fx.src==='auto'?S.fx.prev:0,vUh=0;R.held.forEach(function(x){if(x.p.market==='US')vUh+=x.p.qty*x.P1});
    var fxp2=T.uA+T.rfU+T.uF-VZ.pv,dc=fp&&fxr?vUh*(fxr-fp):null;
    cards.push(card(IC.cam,'Câmbio','O dólar contra o real. O número grande é quanto o dólar de hoje mexeu no seu VT (em reais). Abaixo, o dólar agora e quanto o câmbio já deu de lucro (ou prejuízo) no que você tem em dólar desde as compras. Toque para ver o histórico.',
      (dc!=null?'<div class="hcm"><b class="num '+cls(dc)+'">'+sgn(dc)+'</b><span class="num '+cls(dc)+'">'+pct(fxr/fp-1)+' '+arrow(dc)+'</span></div>':'<div class="hcm"><b class="num muted">—</b></div>'),
      (fxr?'<div class="hcl" data-hero="cam" role="button" tabindex="0"><small>Dólar agora ›</small><span class="num">R$ '+num(fxr,4)+'</span></div>':'')+'<div class="hcl" data-hero="cam" role="button" tabindex="0"><small>Lucro do câmbio ›</small><span class="num '+cls(fxp2)+'">'+sgn(fxp2)+'</span></div>','cam'))}
  var lucC=card(IC.luc,T.gain>=0?'Lucro total':'Prejuízo total','Quanto você ganhou (ou perdeu) de verdade se vendesse tudo hoje: preço das ações, dólar, vendas já feitas e proventos, menos as taxas. A porcentagem é sobre o que saiu do seu bolso. Toque para ver de onde vem.',
    '<div class="hcm"><b class="num '+cls(T.gain)+'">'+sgn(T.gain)+'</b><span class="num '+cls(T.gain)+'">'+pct(T.simple)+' '+arrow(T.gain)+'</span></div>',
    '<div><small>Anualizada</small><span class="num '+(T.xirr==null?'muted':cls(T.xirr))+'">'+(T.xirr==null?'—':pct(T.xirr))+'</span></div><button type="button" class="evolink" data-goto="desempenho">Ver detalhes</button>','luc').replace('data-hero="luc"','data-goto="desempenho"');
  cards=[cards[0],cards[2],cards[1],lucC].concat(cards.slice(3));
  var h='<div class="hcw"><div class="hcards" id="hcards">'+cards.join('')+'</div><div class="hdots">'+cards.map(function(c,i){return '<i data-hci="'+i+'"'+(i===HCI?' class="on"':'')+'></i>'}).join('')+'</div></div>';
  if(R.warns.length)h+=R.warns.map(function(w){return '<p class="warn">'+esc(w)+'</p>'}).join('');
  if(T.missing.length)h+='<p class="warn">Sem preço atual para '+esc(T.missing.join(', '))+'. Usei o preço médio até a cotação chegar.</p>';


  if(T.value>0)h+=distHtml(R);
  h+=metasHtml(R);
  setHtml(el,h);
  var hc=$('hcards');if(hc&&HCI){hc.scrollLeft=HCI*hc.clientWidth}mtCenter();var dc=$('dcar');if(dc&&DCI){dc.scrollLeft=DCI*dc.clientWidth}
}
var HCI=0;
document.addEventListener('scroll',function(e){var hc=e.target;if(!hc||hc.id!=='hcards')return;var i=Math.round(hc.scrollLeft/Math.max(1,hc.clientWidth));if(i!==HCI){HCI=i;[].forEach.call(document.querySelectorAll('.hdots i'),function(d){d.classList.toggle('on',+d.getAttribute('data-hci')===i)})}},true);

/* toque nos números do Início: gráfico com períodos (evolução mensal) */
var HERON={luc:'Lucro total',inv:'Valor investido',cam:'Câmbio',pat:'Patrimônio total',val:'Valorização (ganho de capital)',dia:'Variação de hoje'};
function heroOpen(k){STK={tk:'',hero:k,rng:k==='dia'?'1d':'1y',d:null,cv:'luc'};$('stk').hidden=false;document.body.style.overflow='hidden';$('stk-h').textContent=HERON[k]||'';heroRender()}
function heroRender(){
  var b=$('stk-b'),k=STK.hero;if(!b)return;
  if(k==='cam'){heroCam(b);return}
  if(k==='luc'&&(STK.rng==='1d'||STK.rng==='5d'))STK.rng='1mo';
  if(k==='inv'&&(STK.rng==='1d'||STK.rng==='5d')){heroInv(b);return}
  if(k!=='inv'&&k!=='luc'&&(STK.rng==='1d'||STK.rng==='5d'||k==='dia')){if(k==='dia'&&STK.rng!=='1d'&&STK.rng!=='5d')STK.rng='1d';heroIntra(b,k);return}
  var rows=evoData(),T=compute().tot,rg=STK.rng,days={'1mo':31,'3mo':93,'6mo':183,'1y':366,'ytd':366,'2y':731}[rg],t0=days?Date.now()-days*864e5:0;
  var all=rows.map(function(r){var g=0;['BR','US','RF'].forEach(function(s){var q=r.seg&&r.seg[s];if(q)g+=q.v-q.c});return {t:Date.parse(monthEnd(r.m)),c:k==='pat'?r.pat:k==='luc'?r.lucro:k==='inv'?r.seg.BR.c+r.seg.US.c+r.seg.RF.c:g}});
  var Rn=compute(),ctn=0;Rn.held.forEach(function(x){ctn+=x.p.market==='US'?x.p.cN*T.fxNow:x.p.cB});ctn+=T.rfC;var now=k==='pat'?T.value+T.cash:k==='inv'?ctn:k==='luc'?T.gain:all.length?all[all.length-1].c:0;if(all.length)all[all.length-1]={t:Date.now(),c:k==='pat'||k==='inv'||k==='luc'?now:all[all.length-1].c};
  var hist=rgCut(all.filter(function(p){return p.t>=t0}),rg);if(hist.length<2&&all.length>1)hist=all.slice(-2);
  var ch=hist.length>1?hist[hist.length-1].c-hist[0].c:null,base=hist.length>1?hist[0].c:0,pc=ch!=null&&base>0&&(k==='pat'||k==='inv')?ch/base*100:null,last=hist.length?hist[hist.length-1].c:0;
  setHtml(b,gHead(HERON[k],'',brl.format(last),ch,pc!=null?pc:(ch!=null?0:null),rg,ch!=null?(ch>=0?'+':'−')+brl.format(Math.abs(ch)):'','')+rngBar(rg,k==='luc'?['yr','nointra']:['yr'])+lineChart(hist,'BRL',null)+
    (k==='luc'?'<p class="note">Quanto você ganhou ou perdeu no total, em fim de mês (o último é hoje): patrimônio menos tudo que você colocou, juntando preço, dólar, vendas e proventos. Se ele cai, veja o que mudou: toque em Preço ou em Dólar na lista.</p>':k==='inv'?'<p class="note">Quanto você pagou pelo que tem hoje, em fim de mês (o último é hoje). Sobe quando você aporta e também quando o dólar sobe, porque o custo do VT é contado pelo dólar da data. Por isso ele mexe sem você ter comprado nada.</p>':'<p class="note">Pontos de fim de mês (o último é hoje), pela mesma conta da Evolução. Só preço: sem câmbio de vendas e sem proventos.</p>'));
}

/* carteira ao longo do dia/5 dias: soma de quantidade × pontos de 5 minutos (EUA pelo dólar de hoje, como no cartão de hoje) */
/* Valor investido no 1D/5D: o que você pagou em reais fica parado; só o custo em dólar do VT se mexe com o dólar de 5 minutos */
function heroInv(b){
  var rg=STK.rng,R=compute(),T=R.tot,U=0,ctn=T.rfC;R.held.forEach(function(x){if(x.p.market==='US'){U+=x.p.cN;ctn+=x.p.cN*T.fxNow}else ctn+=x.p.cB});
  var fixo=ctn-U*T.fxNow,v=finView('BRL=X',rg);
  if(!v||v.st!=='ok'){setHtml(b,rngBar(rg,['yr'])+'<p class="muted small" style="margin:12px 0">'+esc((v&&v.st==='load')?'Carregando os pontos do dia...':(v&&v.msg)||'Ainda não há pontos de 5 minutos do dólar. O robô os grava durante o pregão; volte depois da abertura.')+'</p>');return}
  var hist=v.hist.map(function(p){return {t:p.t,c:fixo+U*p.c}}),prev=rg==='1d'&&v.o&&v.o.prev?fixo+U*v.o.prev:hist[0].c,last=hist[hist.length-1].c,ch=last-prev;
  setHtml(b,gHead(HERON.inv,'',brl.format(last),ch,prev>0?ch/prev*100:null,rg,(ch>=0?'+':'−')+brl.format(Math.abs(ch)),gWhen(Date.now()))+rngBar(rg,['yr'])+
    lineChart(hist,'BRL',null,null,{intra:1,d1:rg==='1d',prev:rg==='1d'?prev:null})+
    '<p class="note">No dia, só o custo do VT se mexe, porque ele é contado pelo dólar. O que você pagou em reais nas ações do Brasil e na renda fixa fica parado. Pontos de 5 minutos do dólar.</p>')}
function heroIntra(b,k){
  var R=compute(),T=R.tot,rg=STK.rng,hs=R.held.filter(function(x){return x.p.qty>0}),lista=[],falta=0,sem=0;
  hs.forEach(function(x){var c=FIN['intra/'+ySym(x.p.ticker)],v=finView(ySym(x.p.ticker),rg==='5d'?'5d':'1d');if(v&&v.st==='load')falta++;else if(!v||v.st!=='ok')sem++;else lista.push({q:x.p.qty,f:x.p.market==='US'?T.fxNow:1,h:v.hist,prev:(v.o&&v.o.prev)||v.hist[0].c})});
  var head=function(){return rngBar(rg,k==='dia'?['yr','max','ytd','3mo','1y','5y','1mo','6mo']:['yr'])};
  if(falta&&!lista.length){setHtml(b,head()+'<p class="muted small" style="margin:12px 0">Carregando os pontos do dia...</p>');return}
  if(!lista.length){setHtml(b,head()+'<p class="muted small" style="margin:12px 0">Ainda não há pontos de 5 minutos das suas ações. O robô os grava durante o pregão (a cada 30 min); volte depois da abertura.</p>');return}
  var ts={};lista.forEach(function(a){a.h.forEach(function(p){ts[p.t]=1})});var tt=Object.keys(ts).map(Number).sort(function(a,c){return a-c}),idx=lista.map(function(){return 0}),px=lista.map(function(a){return a.prev}),pts=[],base=0;
  lista.forEach(function(a){base+=a.q*a.f*a.prev});
  tt.forEach(function(t){var v=0;lista.forEach(function(a,i){while(idx[i]<a.h.length&&a.h[idx[i]].t<=t){px[i]=a.h[idx[i]].c;idx[i]++}v+=a.q*a.f*px[i]});pts.push({t:t,c:v})});
  var ref=rg==='1d'?base:pts[0].c,vl=pts[pts.length-1].c,d=vl-ref,lv=k==='pat'?T.value+T.cash:k==='val'?valoriz(R).g:null,out=pts;
  if(lv!=null)out=pts.map(function(p){return {t:p.t,c:lv+(p.c-vl)}});
  setHtml(b,gHead(HERON[k],'',brl.format(k==='dia'?d:out[out.length-1].c),d,ref>0?d/ref*100:null,rg,(d>=0?'+':'−')+brl.format(Math.abs(d)),gWhen(Date.now()))+head()+
    lineChart(k==='dia'?out.map(function(p,i){return {t:p.t,c:pts[i].c-ref}}):out,'BRL',null,null,{intra:1,d1:rg==='1d',prev:k==='dia'&&rg==='1d'?0:null})+
    '<p class="note">Soma, ponto a ponto, quantidade × preço de cada ação (pontos de 5 minutos do robô). Renda fixa e caixa ficam parados; o VT entra pelo dólar de hoje.'+(falta||sem?' Ações sem pontos hoje: '+(falta+sem)+'.':'')+'</p>');
}

/* Câmbio: seu lucro (custo em dólar × dólar do dia − reais que você pagou) dia a dia e, no 1D/5D, ponto a ponto com o dólar de 5 minutos */
function cambioSer(dates){
  var ts=S.trades.filter(function(t){return t.market==='US'&&(t.side==='buy'||t.side==='sell')}).sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:(a.id<b.id?-1:1)}),i=0,pos={},out=[];
  dates.forEach(function(d){
    while(i<ts.length&&ts[i].date<=d){var t=ts[i++],p=pos[t.ticker]||(pos[t.ticker]={q:0,u:0,b:0});
      if(t.side==='buy'){p.q+=t.qty;p.u+=t.qty*t.price;p.b+=t.qty*t.price*(t.fx||1)}
      else{var q=Math.min(t.qty,p.q);if(q<=0)continue;var f=q/p.q;p.u-=p.u*f;p.b-=p.b*f;p.q-=q;if(p.q<1e-9){p.q=0;p.u=0;p.b=0}}}
    var u=0,b=0;Object.keys(pos).forEach(function(k){u+=pos[k].u;b+=pos[k].b});out.push({d:d,u:u,b:b})});
  return out}
function cambioPos(){return cambioSer([today()])[0]}
function cambioHist(){
  var R=compute(),T=R.tot,fxp=T.uA+T.rfU+T.uF-valoriz(R).pv,ds=(MK.fxDates||[]).slice(),st=Math.max(1,Math.ceil(ds.length/1200)),sel=[];
  for(var i=0;i<ds.length;i+=st)sel.push(ds[i]);
  var out=[];cambioSer(sel).forEach(function(r){if(r.u>0)out.push({t:Date.parse(r.d+'T12:00:00'),c:r.u*MK.fxSeries[r.d]-r.b})});
  if(out.length)out.push({t:Date.now(),c:fxp});return out}
function fxDaily(){var ds=MK.fxDates||[],out=[],st=Math.max(1,Math.ceil(ds.length/1200));
  for(var i=0;i<ds.length;i+=st)out.push({t:Date.parse(ds[i]+'T12:00:00'),c:MK.fxSeries[ds[i]]});
  var fr=(fxToday()||{}).rate;if(fr&&(!out.length||Date.now()-out[out.length-1].t>36e5))out.push({t:Date.now(),c:fr});return out}
function heroCam(b){
  var rg=STK.rng,cv=STK.cv||'luc',R=compute(),T=R.tot,fxp=T.uA+T.rfU+T.uF-valoriz(R).pv,P=cambioPos(),fxn=(fxToday()||{}).rate||0,off=fxp-(P.u*fxn-P.b);
  var tg='<div class="rng">'+[['luc','Meu lucro'],['usd','Dólar']].map(function(r){return '<button type="button" data-hcv="'+r[0]+'" aria-pressed="'+(cv===r[0])+'">'+r[1]+'</button>'}).join('')+'</div>',
      fmt=cv==='usd'?function(v){return 'R$ '+num(v,4)}:null,nm=cv==='usd'?'Dólar (USD/BRL)':'Lucro do câmbio',tx=function(v){return cv==='usd'?'R$ '+num(v,4):brl.format(v)};
  var hist=[],ref=null,msg='',o={};
  if(rg==='1d'||rg==='5d'){
    var v=finView('BRL=X',rg);
    if(!v||v.st!=='ok')msg=(v&&v.msg)||'';
    else{var prev=rg==='1d'&&v.o&&v.o.prev?v.o.prev:v.hist[0].c;
      hist=cv==='usd'?v.hist.slice():v.hist.map(function(p){return {t:p.t,c:P.u*p.c-P.b+off}});ref=cv==='usd'?prev:P.u*prev-P.b+off;o={intra:1,d1:rg==='1d',prev:rg==='1d'?ref:null}}
  }else{
    var days={'1mo':31,'3mo':93,'6mo':183,'1y':366,'ytd':366,'2y':731}[rg],t0=days?Date.now()-days*864e5:0,all=cv==='usd'?fxDaily():cambioHist();
    hist=rgCut(all.filter(function(p){return p.t>=t0}),rg);if(hist.length<2&&all.length>1)hist=all.slice(-2);ref=hist.length?hist[0].c:null}
  var last=hist.length?hist[hist.length-1].c:0,ch=hist.length>1&&ref!=null?last-ref:null,pc=cv==='usd'&&ch!=null&&ref>0?ch/ref*100:null;
  setHtml(b,tg+(hist.length?gHead(nm,'',tx(last),ch,pc!=null?pc:(ch!=null?0:null),rg,'',''):'')+rngBar(rg,['yr'])+
    (hist.length?lineChart(hist,'BRL',null,fmt,o):'<p class="muted small" style="margin:12px 0">'+esc(msg||'Sem histórico para esse período.')+'</p>')+
    (cv==='usd'?'<p class="note">Cotação do dólar (1D e 5D com pontos de 5 minutos; os demais períodos, dia a dia). O último ponto é agora.</p>':'<p class="note">Quanto o câmbio deu de lucro (ou prejuízo) no que você tem em dólar: o custo em dólar vezes o dólar do dia, menos o que você pagou em reais. 1D e 5D acompanham o dólar de 5 minutos; os demais, dia a dia. Não inclui a variação do preço do VT.</p>'))
}
