/* Aporte · js/dados.js — proventos automáticos, CDI, renda fixa e comparação com o mercado.
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
/* proventos automáticos (ações do Brasil, via brapi) */
var DV={up:[],br:[],at:0,err:'',added:0,busy:false};
try{var d0=JSON.parse(localStorage.getItem(LS+'-divs')||'null');if(d0){DV.br=(d0.up||[]).filter(function(u){return !u.us});DV.at=d0.at||0}}catch(e){}
if(!S.divFrom){S.divFrom=today();save()}
function qtyOn(tk,date,mk){var q=0;S.trades.forEach(function(t){if(t.ticker===tk&&t.market===(mk||'BR')&&t.date<=date){if(t.side==='buy')q+=t.qty;else if(t.side==='sell')q-=t.qty}});return q>1e-9?q:0}
/* dividendos do VT (e outros dos EUA) pela Alpha Vantage: anúncio, data-com e pagamento; líquido dos 30% retidos nos EUA */
var DU={up:[],at:0,err:'',busy:false};
try{var du0=JSON.parse(localStorage.getItem(LS+'-divus')||'null');if(du0){DU.up=du0.up||[];DU.at=du0.at||0}}catch(e){}
function mergeUp(){var out=(DV.md||[]).slice();
  (DV.br||[]).forEach(function(u){if(!out.some(function(o){return o.tk===u.tk&&o.dc===u.dc&&o.tipo===u.tipo&&Math.abs(o.val-u.val)<=Math.max(0.05,u.val*0.02)}))out.push(u)});
  DV.up=out.concat(DU.up).sort(function(a,b){return (a.pay||'9')<(b.pay||'9')?-1:1})}
function loadDivsUS(force){
  if(!S.keys.av||DU.busy)return Promise.resolve();
  if(!force&&Date.now()-DU.at<12*3600000)return Promise.resolve();
  var tks={};S.trades.forEach(function(t){if(t.market==='US'&&(t.side==='buy'||t.side==='sell'))tks[t.ticker]=1});
  var list=Object.keys(tks);if(!list.length)return Promise.resolve();
  DU.busy=true;var up=[],add=[],td=today(),errs=[];
  var cut=new Date(Date.now()-120*864e5).toISOString().slice(0,10);
  return list.reduce(function(p,tk,i){return p.then(function(){return i?new Promise(function(r){setTimeout(r,1500)}):null}).then(function(){
    return getJSON('https://www.alphavantage.co/query?function=DIVIDENDS&symbol='+encodeURIComponent(tk)+'&apikey='+encodeURIComponent(S.keys.av)).then(function(j){
      if(!j||!Array.isArray(j.data)){errs.push(j&&(j.Information||j.Note||j['Error Message'])?'lim':'fmt');return}
      j.data.forEach(function(x){
        var ok=function(v){return /^\d{4}-\d{2}-\d{2}$/.test(v||'')?v:''};
        var ex=ok(x.ex_dividend_date),pay=ok(x.payment_date),amt=parseFloat(x.amount);if(!ex||!(amt>0)||ex<cut)return;
        var dc=new Date(Date.parse(ex)-864e5).toISOString().slice(0,10),q=qtyOn(tk,dc,'US');if(!q)return;
        var gross=Math.round(q*amt*100)/100,irx=Math.round(gross*0.30*100)/100,net=Math.round((gross-irx)*100)/100;if(!(net>0))return;
        var ft=fxToday(),rate=ft?ft.rate:(S.fx&&S.fx.rate)||0;
        if(!pay||pay>td){up.push({tk:tk,tipo:'Dividendo',dc:dc,pay:pay,val:Math.round(net*rate*100)/100,q:q,us:1,usd:net,r:amt,brU:gross});return}
        if(pay<S.divFrom)return;
        var id='a-'+tk+'-'+pay+'-D-'+Math.round(amt*1e6);
        if(S.trades.some(function(t){return t.id===id}))return;
        if(S.trades.some(function(t){return t.side==='div'&&t.ticker===tk&&Math.abs(dayDiff(t.date,pay))<=7&&Math.abs(t.price-net)<=Math.max(0.1,net*0.03)}))return;
        var fo=fxOn(pay);
        add.push({id:id,side:'div',market:'US',ticker:tk,date:pay,qty:1,price:net,fx:fo?fo.rate:rate,auto:1,tipo:'Dividendo',bruto:gross,irExt:irx,pq:q,pr:amt,note:'Dividendo automático'});
      });
    }).catch(function(e){errs.push(String(e&&e.message))})})},Promise.resolve()).then(function(){
    if(errs.length===list.length){var c=errs[0];DU.err=c==='lim'?'A Alpha Vantage recusou a consulta (chave errada ou limite do dia).':'Não consegui buscar os dividendos agora'+(c&&c!=='fmt'&&c!=='0'?' (código '+c+')':'')+'.';render();return}
    DU.up=up;DU.at=Date.now();DU.err='';
    try{localStorage.setItem(LS+'-divus',JSON.stringify({up:up,at:DU.at}))}catch(e){}
    mergeUp();
    if(add.length){add.forEach(function(t){S.trades.push(t);S.pend.push({t:'add',tr:t})});save();ghSync();
      $('status').className='msg muted';$('status').textContent='Caiu provento: '+add.map(function(t){return t.ticker+' '+usd.format(t.price)}).join(', ')+'. Já lancei na carteira.'}
    render();
  }).then(function(){DU.busy=false});
}
function divList(j){
  var out=[];
  var push=function(sym,d){if(d&&d.rate>0)out.push({tk:String(sym||d.symbol||d.ticker||'').toUpperCase(),pay:(d.paymentDate||'').slice(0,10),dc:(d.lastDatePrior||'').slice(0,10),ex:(d.exDate||'').slice(0,10),rate:+d.rate,label:String(d.label||'DIVIDENDO').toUpperCase()})};
  var walk=function(o,sym){
    if(Array.isArray(o)){o.forEach(function(x){walk(x,sym)});return}
    if(!o||typeof o!=='object')return;
    var sy=o.symbol||o.ticker||sym;
    if('rate' in o&&('paymentDate' in o||'lastDatePrior' in o)){push(sy,o);return}
    Object.keys(o).forEach(function(k){if(o[k]&&typeof o[k]==='object')walk(o[k],sy)});
  };
  walk(j,'');return out;
}
function divApply(ds,tks){
  var up=[],add=[],td=today(),seen={};
  ds.forEach(function(d){
    if(!d.tk||!tks[d.tk])return;
    var dc=d.dc||(d.ex?new Date(Date.parse(d.ex)-864e5).toISOString().slice(0,10):'');if(!dc)return;
    var q=qtyOn(d.tk,dc);if(!q)return;
    var jcp=/JCP|JURO|JRS/.test(d.label),irj=((d.pay||dc)>='2026-01-01')?0.175:0.15,val=Math.round(q*d.rate*(jcp?1-irj:1)*100)/100;if(!(val>0))return;
    var sk=d.tk+dc+jcp+Math.round(d.rate*1e6)+(d.pay||'');if(seen[sk])return;seen[sk]=1;
    var item={tk:d.tk,tipo:jcp?'JCP':'Dividendo',dc:dc,pay:d.pay,val:val,q:q,r:d.rate,br:Math.round(q*d.rate*100)/100};
    PVX[d.tk+'|'+(d.pay||'')]=item;
    if(!d.pay||d.pay>td){up.push(item);return}
    if(d.pay<S.divFrom)return;
    var id='a-'+d.tk+'-'+d.pay+'-'+(jcp?'J':'D')+'-'+Math.round(d.rate*1e6);
    if(S.trades.some(function(t){return t.id===id}))return;
    if(S.trades.some(function(t){return t.side==='div'&&t.ticker===d.tk&&Math.abs(dayDiff(t.date,d.pay))<=5&&Math.abs(t.price-val)<=Math.max(0.1,val*0.1)}))return;
    if(add.some(function(t){return t.id===id}))return;
    add.push({id:id,side:'div',market:'BR',ticker:d.tk,date:d.pay,qty:1,price:val,fx:1,auto:1,tipo:item.tipo,pq:q,pr:d.rate,note:item.tipo+' automático'});
  });
  return {up:up,add:add};
}
/* proventos do robô (Fundamentus): anunciados e pagos de todas as ações que você já comprou, inclusive as vendidas */
var PVX={};
function provMD(){
  var pv=MD.d&&MD.d.prov;if(!pv)return;
  var tks={};S.trades.forEach(function(t){if(t.market==='BR'&&(t.side==='buy'||t.side==='sell'))tks[t.ticker]=1});
  var ds=[];Object.keys(pv).forEach(function(tk){(pv[tk]||[]).forEach(function(x){ds.push({tk:tk,dc:x[0],rate:+x[1],label:String(x[2]||''),pay:x[3]||''})})});
  var o=divApply(ds,tks);DV.md=o.up;mergeUp();
  if(o.add.length){o.add.forEach(function(t){S.trades.push(t);S.pend.push({t:'add',tr:t})});save();ghSync();
    $('status').className='msg muted';$('status').textContent='Caiu provento: '+o.add.map(function(t){return t.ticker+' '+brl.format(t.price)}).join(', ')+'. Já lancei na carteira.'}
}
function loadDivs(force){
  if(!S.keys.brapi||DV.busy)return Promise.resolve();
  if(!force&&Date.now()-DV.at<12*3600000)return Promise.resolve();
  var tks={};S.trades.forEach(function(t){if(t.market==='BR'&&(t.side==='buy'||t.side==='sell'))tks[t.ticker]=1});
  var list=Object.keys(tks).filter(function(k){return /^[A-Z0-9]{4}\d{1,2}$/.test(k)});if(!list.length)return Promise.resolve();
  var start=new Date(Date.now()-60*864e5).toISOString().slice(0,10);
  DV.busy=true;var wait=function(ms){return new Promise(function(r){setTimeout(r,ms)})},acc=[],fails=0,last=0;
  return list.reduce(function(p,tk,i){return p.then(function(){return i?wait(700):null}).then(function(){
      return getJSON('https://brapi.dev/api/quote/'+encodeURIComponent(tk)+'?dividends=true&token='+encodeURIComponent(S.keys.brapi)).then(function(d){acc.push(d)}).catch(function(e){fails++;last=e&&e.message})})},Promise.resolve()).then(function(){
    if(!acc.length)throw new Error(last||'0');
    var j=acc;
    var ds=divList(j),o=divApply(ds,tks),up=o.up,add=o.add;
    up.sort(function(a,b){return (a.pay||'9')<(b.pay||'9')?-1:1});
    DV.br=up;DV.at=Date.now();DV.err='';DV.added+=add.length;
    try{localStorage.setItem(LS+'-divs',JSON.stringify({up:up,at:DV.at}))}catch(e){}
    mergeUp();
    if(add.length){add.forEach(function(t){S.trades.push(t);S.pend.push({t:'add',tr:t})});save();ghSync();
      $('status').className='msg muted';$('status').textContent='Caiu provento: '+add.map(function(t){return t.ticker+' '+brl.format(t.price)}).join(', ')+'. Já lancei na carteira.'}
    render();
  }).catch(function(e){var c=String(e&&e.message);DV.err=c==='403'||c==='401'||c==='400'?'Seu plano do brapi não libera proventos (código '+c+').':'Não consegui buscar os proventos agora'+(c&&c!=='0'?' (código '+c+')':'')+'.';render()}).then(function(){DV.busy=false});
}

/* renda fixa: CDI diário do Banco Central (SGS série 12) */
var CDI={s:{},dates:[],at:0,start:'',err:''};
function ingestCdi(o){CDI.s=(o&&o.s)||{};CDI.dates=Object.keys(CDI.s).sort();CDI.at=(o&&o.at)||0;CDI.start=(o&&o.start)||''}
try{var c0=JSON.parse(localStorage.getItem(LS+'-cdi')||'null');if(c0)ingestCdi(c0)}catch(e){}
var IOFT=[96,93,90,86,83,80,76,73,70,66,63,60,56,53,50,46,43,40,36,33,30,26,23,20,16,13,10,6,3];
function dayDiff(a,b){return Math.round((Date.parse(b)-Date.parse(a))/864e5)}
function irRate(d){return d<=180?22.5:d<=360?20:d<=720?17.5:15}
function rfCalc(t,rs){
  var end=rs?rs.date:today(),f=1,n=0,last='',lastR=0;
  CDI.dates.forEach(function(d){if(d>=t.date&&d<end){var r=CDI.s[d]/100*(t.pct/100);f*=1+r;n++;last=d;lastR=r}});
  var bruto=t.price*f,gain=bruto-t.price,days=Math.max(0,dayDiff(t.date,end));
  var iofP=days>=30?0:IOFT[Math.max(1,days)-1],iof=gain>0?gain*iofP/100:0;
  var irP=t.isento?0:irRate(days),ir=gain-iof>0?(gain-iof)*irP/100:0;
  var liq=bruto-iof-ir;
  return {t:t,rs:rs,bruto:bruto,gain:gain,days:days,iofP:iofP,iof:iof,irP:irP,ir:ir,liq:liq,n:n,last:last,lastGain:bruto-bruto/(1+lastR),
    realized:rs?rs.price-t.price:0,stale:!CDI.dates.length};
}


/* comparação com o mercado: BOVA11 (Ibovespa) e IVVB11 (S&P 500 em reais), cotados no brapi */
var BX={px:{},at:0,busy:false,err:''};
try{var bx0=JSON.parse(localStorage.getItem(LS+'-bench')||'null');if(bx0){BX.px=bx0.px||{};BX.at=bx0.at||0}}catch(e){}
function loadBench(force){
  if(!S.keys.brapi||BX.busy||!S.trades.length)return Promise.resolve();
  if(!force&&Date.now()-BX.at<12*3600000)return Promise.resolve();
  BX.busy=true;var fails=0,wait=function(ms){return new Promise(function(r){setTimeout(r,ms)})};
  var one=function(tk,ranges){if(!ranges.length){fails++;return Promise.resolve()}
    return getJSON('https://brapi.dev/api/quote/'+tk+'?range='+ranges[0]+'&interval=1d&token='+encodeURIComponent(S.keys.brapi)).then(function(d){
      var r=d&&d.results&&d.results[0],a=r&&r.historicalDataPrice;if(!a||!a.length)throw 0;var px={};
      a.forEach(function(x){if(x.close>0)px[new Date((x.date>1e12?x.date:x.date*1000)-3*3600000).toISOString().slice(0,10)]=x.close});
      if(r.regularMarketPrice>0)px[today()]=r.regularMarketPrice;BX.px[tk]=px;
    }).catch(function(){return wait(800).then(function(){return one(tk,ranges.slice(1))})})};
  return one('BOVA11',['1y','6mo','3mo']).then(function(){return wait(700)}).then(function(){return one('IVVB11',['1y','6mo','3mo'])}).then(function(){
    BX.at=Date.now();BX.err=fails?'Sem histórico do '+(fails>1?'BOVA11 e do IVVB11':'índice')+' no brapi.':'';BX.busy=false;
    try{localStorage.setItem(LS+'-bench',JSON.stringify({px:BX.px,at:BX.at}))}catch(e){}render();
  });
}
function pxOn(tk,d){var px=BX.px[tk];if(!px)return null;var ks=Object.keys(px).sort(),best=null;for(var i=0;i<ks.length;i++){if(ks[i]<=d)best=px[ks[i]];else break}return best||(ks.length&&ks[0]>d?px[ks[0]]:null)}
function benchSeg(mk,etf){
  var px=BX.px[etf];if(!px)return null;var ks=Object.keys(px).sort(),pT=px[ks[ks.length-1]];
  var units=0,buys=0,proc=0,divs=0,miss=false;
  S.trades.forEach(function(t){if(t.market!==mk)return;var F=mk==='US'?t.fx:1,v=t.qty*ePx(t)*F;
    if(t.side==='div'){divs+=t.price*F;return}if(t.side!=='buy'&&t.side!=='sell')return;
    var p=pxOn(etf,t.date);if(!p){miss=true;return}
    if(t.side==='buy'){units+=v/p;buys+=v}else{units-=v/p;proc+=v}});
  if(!buys||miss)return null;
  var R=compute(),val=0;R.held.forEach(function(x){if(x.p.market===mk)val+=x.v});
  var gP=val+proc+divs-buys,gB=units*pT+proc-buys;
  return {gP:gP,gB:gB,pP:gP/buys,pB:gB/buys,last:ks[ks.length-1]};
}
function cdiBench(){
  if(!CDI.dates.length)return null;
  var ds=CDI.dates,n=ds.length,suf=new Array(n+1);suf[n]=1;for(var i=n-1;i>=0;i--)suf[i]=suf[i+1]*(1+CDI.s[ds[i]]/100);
  var fac=function(d){var lo=0,hi=n;while(lo<hi){var mid=(lo+hi)>>1;if(ds[mid]<d)lo=mid+1;else hi=mid}return suf[lo]};
  if(S.trades.some(function(t){return t.date<ds[0]}))return null;
  var ts=S.trades.slice().sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:(a.id<b.id?-1:1)}),cash=0,contrib=0,val=0,apl=0;
  var put=function(d,v){val+=v*fac(d);apl+=v};
  ts.forEach(function(t){var F=t.market==='US'?t.fx:1,c0=contrib;
    if(t.side==='out'){var am=t.price*F;cash-=am;contrib-=am;if(cash<0){contrib-=cash;cash=0}}
    else if(t.side==='rf'){cash-=t.price;if(cash<0){contrib-=cash;cash=0}}
    else if(t.side==='rfout'||t.side==='div'){cash+=t.price*F}
    else if(t.side==='buy'){cash-=t.qty*ePx(t)*F;if(cash<0){contrib-=cash;cash=0}}
    else if(t.side==='sell'){cash+=t.qty*ePx(t)*F}
    if(Math.abs(contrib-c0)>1e-9)put(t.date,contrib-c0);
  });
  return {val:val,apl:apl,gain:val-apl,last:ds[n-1]};
}
function loadCDI(force){
  if(!S.trades.length)return Promise.resolve();
  var start=S.trades.map(function(t){return t.date}).sort()[0];
  if(!force&&CDI.dates.length&&CDI.start&&CDI.start<=start&&Date.now()-CDI.at<3*3600000)return Promise.resolve();
  var br=function(iso){var q=iso.split('-');return q[2]+'/'+q[1]+'/'+q[0]};
  return getJSON('https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial='+br(start)+'&dataFinal='+br(today())).then(function(a){
    var s2={};(a||[]).forEach(function(x){var q=String(x.data).split('/'),v=parseFloat(String(x.valor).replace(',','.'));if(q.length===3&&v>=0&&v<1)s2[q[2]+'-'+q[1]+'-'+q[0]]=v});
    if(!Object.keys(s2).length)throw 0;
    var o={s:s2,at:Date.now(),start:start};ingestCdi(o);CDI.err='';try{localStorage.setItem(LS+'-cdi',JSON.stringify(o))}catch(e){}render();
  }).catch(function(){CDI.err='Não consegui buscar o CDI no Banco Central agora'+(CDI.dates.length?'; usando o último CDI salvo.':'.');render()});
}
