/* Aporte · js/evolucao.js — Carteira → Evolução: fechamento mês a mês.
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
/* evolução do patrimônio: fechamento de cada mês */
var HI={px:{},at:0,busy:false,err:''},EVY=null;
try{var h0=JSON.parse(localStorage.getItem(LS+'-hist')||'null');if(h0){HI.px=h0.px||{};HI.at=h0.at||0}}catch(e){}
function monthEnd(m){var y=+m.slice(0,4),mm=+m.slice(5,7);var d=new Date(Date.UTC(y,mm,0));return d.toISOString().slice(0,10)}
function evoMonths(){
  var ds=S.trades.map(function(t){return t.date}).sort();if(!ds.length)return [];
  var out=[],m=ds[0].slice(0,7),end=today().slice(0,7);
  while(m<=end){out.push(m);var y=+m.slice(0,4),mm=+m.slice(5,7)+1;if(mm>12){mm=1;y++}m=y+'-'+(mm<10?'0':'')+mm}
  return out;
}
function brHeldTickers(){
  var tks={};evoMonths().forEach(function(m){var e=monthEnd(m),q={};S.trades.forEach(function(t){if(t.market==='BR'&&t.date<=e&&(t.side==='buy'||t.side==='sell'))q[t.ticker]=(q[t.ticker]||0)+(t.side==='buy'?t.qty:-t.qty)});Object.keys(q).forEach(function(k){if(q[k]>1e-9)tks[k]=1})});
  return Object.keys(tks).filter(function(k){return /^[A-Z0-9]{4}\d{1,2}$/.test(k)});
}
function loadHist(force){
  if(!S.keys.brapi||HI.busy)return Promise.resolve();
  if(!force&&Date.now()-HI.at<24*3600000)return Promise.resolve();
  var tks=brHeldTickers();if(!tks.length)return Promise.resolve();
  HI.busy=true;var fails=0,wait=function(ms){return new Promise(function(r){setTimeout(r,ms)})};
  var one=function(tk,ranges){
    if(!ranges.length){fails++;return Promise.resolve()}
    return getJSON('https://brapi.dev/api/quote/'+encodeURIComponent(tk)+'?range='+ranges[0]+'&interval=1d&token='+encodeURIComponent(S.keys.brapi)).then(function(d){
      var r=d&&d.results&&d.results[0],a=r&&r.historicalDataPrice;if(!a||!a.length)throw 0;
      var px=HI.px[tk]=HI.px[tk]||{};a.forEach(function(x){var dt=new Date((x.date>1e12?x.date:x.date*1000)-3*3600000).toISOString().slice(0,10);if(x.close>0){var mm=dt.slice(0,7);if(!px['d'+mm]||px['d'+mm]<=dt){px[mm]=x.close;px['d'+mm]=dt}}});
    }).catch(function(){return wait(800).then(function(){return one(tk,ranges.slice(1))})});
  };
  return tks.reduce(function(p,tk,i){return p.then(function(){return i?wait(700):null}).then(function(){return one(tk,['1y','6mo','3mo'])})},Promise.resolve()).then(function(){
    HI.at=Date.now();HI.err=fails?'Sem histórico de '+fails+(fails>1?' ativos':' ativo')+' no brapi.':'';
    try{localStorage.setItem(LS+'-hist',JSON.stringify({px:HI.px,at:HI.at}))}catch(e){}
    HI.busy=false;render();
  });
}
function evoData(){
  var ms=evoMonths(),cur=today().slice(0,7),R=compute(),rows=[];
  var ts=S.trades.slice().sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:(a.id<b.id?-1:1)});
  ms.forEach(function(m){
    var e=m===cur?today():monthEnd(m),pos={},cash=0,contrib=0,divs=0,rfo={},approx=[];
    ts.forEach(function(t){if(t.date>e)return;
      var F=t.market==='US'?t.fx:1;
      if(t.side==='out'){var am=t.price*F;cash-=am;contrib-=am;if(cash<0){contrib-=cash;cash=0}return}
      if(t.side==='rf'){rfo[t.id]=t;cash-=t.price;if(cash<0){contrib-=cash;cash=0}return}
      if(t.side==='rfout'){delete rfo[t.ref];cash+=t.price;return}
      var p=pos[t.ticker]||(pos[t.ticker]={tk:t.ticker,mk:t.market,q:0,cN:0});
      if(t.side==='div'){cash+=t.price*F;divs+=t.price*F;return}
      if(t.side==='buy'){p.q+=t.qty;p.cN+=t.qty*t.price;cash-=t.qty*ePx(t)*F;if(cash<0){contrib-=cash;cash=0}}
      else{var q=Math.min(t.qty,p.q);if(q<=0)return;p.cN-=p.cN*q/p.q;p.q-=q;if(p.q<1e-9){p.q=0;p.cN=0}cash+=q*ePx(t)*F}
    });
    var fx=m===cur?(fxToday()||{}).rate:(fxOn(e)||{}).rate,val=0,seg={BR:{v:0,c:0},US:{v:0,c:0},RF:{v:0,c:0}};
    Object.keys(pos).forEach(function(k){var p=pos[k];if(p.q<1e-9)return;
      var px=null;
      if(m===cur){var gq=getQuote(k);px=gq&&gq.price}
      if(!px&&HI.px[k]&&HI.px[k][m])px=HI.px[k][m];
      if(!px&&S.mclose&&S.mclose[k]&&S.mclose[k][m])px=S.mclose[k][m];
      if(!px){px=p.cN/p.q;approx.push(k)}
      var F2=p.mk==='US'?(fx||1):1;if(p.mk==='US'&&!fx)approx.push('dólar');
      val+=p.q*px*F2;var sg=seg[p.mk==='US'?'US':'BR'];sg.v+=p.q*px*F2;sg.c+=p.cN*F2});
    Object.keys(rfo).forEach(function(id){var t=rfo[id];var c=rfCalc(t,{date:e,price:0}),lv=CDI.dates.length?c.liq:t.price;val+=lv;seg.RF.v+=lv;seg.RF.c+=t.price});
    rows.push({m:m,pat:val+cash,apl:contrib,div:divs,approx:approx,seg:seg});
  });
  rows.forEach(function(r,i){var pv=i?rows[i-1]:null;r.lucro=r.pat-r.apl;r.rend=pv?(r.pat-pv.pat)-(r.apl-pv.apl):r.pat-r.apl;r.rendP=pv&&pv.pat?r.rend/(pv.pat+Math.max(0,r.apl-pv.apl)):null});
  return rows;
}
var EVF={p:'all',t:'all'};try{var ef0=JSON.parse(localStorage.getItem(LS+'-evof')||'null');if(ef0&&ef0.p)EVF=ef0}catch(e){}
var EVTN={all:'Todos os tipos',BR:'Ações',US:'ETFs Intern.',RF:'Renda fixa'},EVPN={all:'Desde o início','12':'Últimos 12 meses','24':'2 anos','60':'5 anos','120':'10 anos'};
function niceStep(r){var e=Math.pow(10,Math.floor(Math.log(r)/Math.LN10)),f=r/e;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*e}
function kfmt(v){var a=Math.abs(v);return (v<0?'R$ -':'R$ ')+(a>=1000?num(a/1000,a%1000?1:0)+'K':num(a,2))}
function renderEvo(){
  var el=$('evotab');if(!el)return;
  var all=evoData();if(!all.length){setHtml(el,'<div class="panel"><p class="muted">Lance sua primeira compra para começar a acompanhar a evolução.</p></div>');return}
  var rows=EVF.p==='all'?all:all.slice(-(+EVF.p));
  var has={BR:0,US:0,RF:0};all.forEach(function(r){['BR','US','RF'].forEach(function(k){if(r.seg[k].c>0)has[k]=1})});
  if(EVF.t!=='all'&&!has[EVF.t])EVF.t='all';
  var pick=function(r){var o={v:0,c:0};(EVF.t==='all'?['BR','US','RF']:[EVF.t]).forEach(function(k){o.v+=r.seg[k].v;o.c+=r.seg[k].c});o.g=o.v-o.c;return o};
  var P=rows.map(pick),n=rows.length,last=P[n-1];
  var hi=Math.max.apply(null,P.map(function(o){return Math.max(o.c,o.c+o.g,0)}))||1,lo=Math.min.apply(null,P.map(function(o){return Math.min(0,o.g)}));
  var st=niceStep((hi-lo)/4||1),top=Math.ceil(hi/st)*st,bot=Math.floor(lo/st)*st;if(bot===0&&lo<0)bot=-st;
  var H=230,PT=10,PB=46,ph=H-PT-PB,y=function(v){return PT+(top-v)/(top-bot)*ph},W=300,bw=W/n,grid='',ax='';
  for(var v=bot;v<=top+1e-6;v+=st){var yy=y(v).toFixed(1);grid+='<line x1="0" x2="'+W+'" y1="'+yy+'" y2="'+yy+'" stroke="var(--line)" stroke-width="1"/>';ax+='<text x="54" y="'+(+yy+4)+'" text-anchor="end">'+kfmt(v)+'</text>'}
  var bars='',lbl='';
  P.forEach(function(o,i){var x=i*bw+bw*.18,w=bw*.64,r=rows[i];
    bars+='<g data-slot="'+i+'"><rect x="'+x.toFixed(1)+'" y="'+y(o.c).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(0,y(0)-y(o.c)).toFixed(1)+'" rx="3" fill="var(--ev1)"/>'+
      (o.g>=0?'<rect x="'+x.toFixed(1)+'" y="'+y(o.c+o.g).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(1,y(o.c)-y(o.c+o.g)).toFixed(1)+'" rx="2" fill="var(--ev2)"/>':'<rect x="'+x.toFixed(1)+'" y="'+y(0).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(1,y(o.g)-y(0)).toFixed(1)+'" rx="2" fill="var(--ev2)"/>')+'</g>';
    var cx=i*bw+bw/2,lx=r.m.slice(5,7)+'/'+r.m.slice(2,4);if(n<=14||i%Math.ceil(n/12)===0)lbl+='<span style="left:'+(cx/W*100).toFixed(2)+'%;top:'+(H-PB+6)+'px">'+lx+'</span>'});
  var zero='<line x1="0" x2="'+W+'" y1="'+y(0).toFixed(1)+'" y2="'+y(0).toFixed(1)+'" stroke="var(--muted)" stroke-width="1.2"/>';
  var tip={n:n,pts:rows.map(function(r,i){var o=P[i];return {i:i,t:r.m.slice(5,7)+'/'+r.m.slice(2,4)+(r.m===today().slice(0,7)?' (até hoje)':''),r:[['var(--c1)','Patrimônio',brl.format(o.v)],['var(--ev1)','Valor aplicado',brl.format(o.c)],['var(--ev2)','Ganho de capital',sgn(o.g),o.g>=0?'gain':'loss']]}})};
  var h='<div class="panel"><div class="split"><div><span class="lbl">Patrimônio'+(EVF.t!=='all'?' ('+EVTN[EVF.t]+')':'')+'</span><span class="num">'+brl.format(last.v)+'</span></div>'+
    '<div><span class="lbl">Ganho de capital</span><span class="num '+cls(last.g)+'">'+sgn(last.g)+(last.c?' <span class="small">('+pct(last.g/last.c)+')</span>':'')+'</span></div></div></div>';
  h+='<div class="panel evp"><div class="grp"><h2>Evolução do patrimônio</h2><button type="button" class="evfbtn" data-evf="open"><svg viewBox="0 0 24 24"><path d="M4 7h16M7 12h10M10 17h4"/></svg>Filtros</button></div>'+
    '<p class="evsub">'+EVPN[EVF.p]+(EVF.t!=='all'?' · '+EVTN[EVF.t]:'')+'</p>'+
    '<div class="dvleg evlg"><span class="a">Valor aplicado</span><span class="g">Ganho de capital</span></div>'+
    '<div class="evch"><svg class="evax" viewBox="0 0 58 '+H+'" width="58" height="'+H+'" aria-hidden="true">'+ax+'</svg>'+
    '<div class="tipc evpl"'+tipAttr(tip)+'><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" width="100%" height="'+H+'" role="img" aria-label="Evolução do patrimônio por mês">'+grid+zero+bars+'</svg>'+
    '<div class="evxl" aria-hidden="true">'+lbl+'</div></div></div>';
  h+='<details class="evtb"><summary>Ver tabela mês a mês</summary><div style="overflow-x:auto"><table class="dvtab"><thead><tr><th>Mês</th><th>Patrimônio</th><th>Aplicado</th><th>Ganho</th></tr></thead><tbody>'+
    rows.slice().reverse().map(function(r,k){var o=P[n-1-k];return '<tr><td>'+r.m.slice(5,7)+'/'+r.m.slice(2,4)+(r.approx.length?' <span class="muted">*</span>':'')+'</td><td>'+brl.format(o.v)+'</td><td>'+brl.format(o.c)+'</td><td class="'+cls(o.g)+'">'+sgn(o.g)+'</td></tr>'}).join('')+'</tbody></table></div></details></div>';
  var anyA=rows.some(function(r){return r.approx.length});
  h+='<p class="note exp" style="margin:0 4px"><b>Patrimônio</b> é quanto valia o que você tinha no fim de cada mês (ações pelo fechamento, VT pelo dólar daquele dia, renda fixa líquida). <b>Valor aplicado</b> é quanto você pagou por esses ativos (preço médio), com o VT pelo mesmo dólar. <b>Ganho de capital</b> é a diferença: só o preço, sem câmbio, vendas ou proventos, igual ao Investidor10.'+
    (anyA?' * Mês em que faltou o preço de fechamento de algum ativo; usei o preço médio dele.':'')+(HI.busy?' Buscando preços antigos no brapi...':HI.err?' '+esc(HI.err):'')+'</p>';
  h+='<div class="sheet" id="evsheet" hidden><div class="sbox" role="dialog" aria-label="Filtros de evolução do patrimônio"><div class="shd"><b>Filtros de evolução do patrimônio</b><button type="button" class="shx" data-evf="close" aria-label="Fechar">✕</button></div>'+
    '<div class="sbd"><h3>Período</h3>'+['all','12','24','60','120'].map(function(k){return '<label class="rad"><input type="radio" name="evp" value="'+k+'"'+(EVF.p===k?' checked':'')+'><span>'+EVPN[k]+'</span></label>'}).join('')+
    '<h3>Tipos de ativo</h3><div class="chips">'+['all','BR','US','RF'].filter(function(k){return k==='all'||has[k]}).map(function(k){return '<button type="button" data-evt="'+k+'" aria-pressed="'+(EVF.t===k)+'">'+EVTN[k]+'</button>'}).join('')+'</div></div>'+
    '<div class="sft"><button type="button" class="link" data-evf="reset">Restaurar padrão</button><button type="button" class="btn" data-evf="save">Salvar</button></div></div></div>';
  setHtml(el,h);
}
