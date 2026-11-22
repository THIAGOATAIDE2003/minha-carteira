/* gráfico estilo Google: cabeçalho com variação, botões de período, linha com eixos e toque com bolinha */
var RMORE=false,RGL={'1d':'hoje','5d':'últimos 5 dias','1mo':'último mês','3mo':'últimos 3 meses','6mo':'últimos 6 meses','ytd':'acumulados no ano','1y':'último ano','2y':'últimos 2 anos','5y':'últimos 5 anos','max':'máx.','yr':'por ano'};
function rgCut(hist,rg){if(rg!=='ytd'||!hist||hist.length<2)return hist;var j=new Date(new Date().getFullYear(),0,1).getTime(),i=0;while(i<hist.length-1&&hist[i+1].t<j)i++;return hist.slice(i)}
function gWhen(at,tk){if(!at)return '';var d=new Date(at),m=Math.round((Date.now()-at)/60000),us=tk&&!isBR(tk),open=tk&&tk.charAt(0)!=='^'&&(us?(function(){var n=nyNow();return !!n&&usBDay(n.d)&&n.min>=570&&n.min<960})():mktOpen()),old=open&&m>20,t=d.toLocaleDateString('pt-BR',{day:'numeric',month:'short'})+', '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+' BRT';
  return t+(old?' · atrasado ('+(m>=120?Math.round(m/60)+' h':m+' min')+')':m>=0&&m<180?' · atualizado há '+(m<1?'menos de 1':m)+' min':'')}
/* cabeçalho: nome, preço grande, variação (valor e %) em cor, seta e período, data e hora da cotação */
function gHead(name,sub,priceTxt,abs,pct,rg,absTxt,when){
  var up=pct==null?null:pct>=0,c=up==null?'':pct===0?'':up?'gain':'loss',sg=function(v){return v<0?'-':v>0?'+':''};
  return '<p class="muted small" style="margin:0 0 4px">'+esc(name||'')+(sub?' · '+esc(sub):'')+'</p><div class="gh"><b class="num">'+priceTxt+'</b></div>'+
    (pct==null&&abs!=null?'<div class="gdl '+(abs===0?'':abs>0?'gain':'loss')+'">'+sg(abs)+pf.format(Math.abs(abs))+' '+(abs===0?'':'<span class="arr">'+(abs>0?'↑':'↓')+'</span> ')+esc(RGL[rg]||'')+'</div>':'')+
    (pct!=null?'<div class="gdl '+c+'">'+(abs!=null?sg(abs)+pf.format(Math.abs(abs))+' ':'')+'('+(abs==null?sg(pct):'')+pf.format(Math.abs(pct))+'%) '+(pct===0?'':'<span class="arr">'+(up?'↑':'↓')+'</span> ')+esc(RGL[rg]||'')+'</div>':'')+
    (when?'<p class="small gwh '+(/atrasado/.test(when)?'stale':'muted')+'">'+esc(when)+'</p>':'');
}
/* botões: 1D 5D 1M 6M YTD + Mais */
function rngBar(cur,skip){
  var main=[['1d','1D'],['5d','5D'],['1mo','1M'],['6mo','6M'],['ytd','YTD']].filter(function(r){return !(skip.indexOf('nointra')>=0&&(r[0]==='1d'||r[0]==='5d'))}),more=[['3mo','3M'],['1y','1A'],['5y','5A'],['max','Máx'],['yr','Anual']].filter(function(r){return skip.indexOf(r[0])<0}),
      inMore=more.some(function(r){return r[0]===cur}),open=RMORE||inMore;
  return '<div class="rng">'+main.map(function(r){
      return '<button type="button" data-rng="'+r[0]+'" aria-pressed="'+(cur===r[0])+'">'+r[1]+'</button>'}).join('')+
    '<button type="button" data-rmore="1" aria-pressed="'+open+'">Mais '+(open?'▴':'▾')+'</button></div>'+
    (open?'<div class="rng rng2">'+more.map(function(r){return '<button type="button" data-rng="'+r[0]+'" aria-pressed="'+(cur===r[0])+'">'+r[1]+'</button>'}).join('')+'</div>':'');
}
/* grade de números do dia / 52 semanas (duas colunas, como no Google); ignora o que não veio */
function gStats(rows){rows=rows.filter(function(r){return r[1]!=null&&r[1]!=='—'});if(!rows.length)return '';
  return '<div class="gst">'+rows.map(function(r){return '<div><span>'+r[0]+'</span><b class="num">'+r[1]+'</b></div>'}).join('')+'</div>'}
/* valores redondos para as linhas da grade */
function niceTicks(lo,hi,n){var r=(hi-lo)||Math.abs(hi)*.02||1,raw=r/n,p=Math.pow(10,Math.floor(Math.log(raw)/Math.LN10)),f=raw/p,st=(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p,o=[],v=Math.ceil(lo/st-1e-9)*st;for(var k=0;k<20&&v<=hi+1e-9;k++,v+=st)o.push(+v.toFixed(10));return {t:o,st:st}}
/* marcas do eixo de datas: meses, anos, dias ou horas, conforme o período */
function xTicks(hist,o){var n=hist.length,t0=hist[0].t,t1=hist[n-1].t,span=(t1-t0)/864e5,out=[],at=function(t){for(var i=0;i<n;i++)if(hist[i].t>=t)return i;return n-1},mn=['jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.'];
  if(o.intra&&o.d1){var h=(t1-t0)/36e5,st=h>6?2:1,d=new Date(t0);d.setMinutes(0,0,0);d=d.getTime()+36e5;for(;d<t1;d+=st*36e5){var q=new Date(d);out.push({i:at(d),l:('0'+q.getHours()).slice(-2)+':00'})}return out}
  if(o.intra){var last='';hist.forEach(function(p,i){var q=new Date(p.t),k=q.toDateString();if(k!==last){last=k;if(i>0)out.push({i:i,l:q.getDate()+' de '+mn[q.getMonth()]})}});return out.slice(0,5)}
  if(span>1000){var y0=new Date(t0).getFullYear()+1,st=span>2800?2:1;for(var y=y0;y<=new Date(t1).getFullYear();y+=st)out.push({i:at(new Date(y,0,1).getTime()),l:String(y)});return out}
  if(span>75){var sm=span/30,step=sm<=4?1:sm<=8?2:sm<=14?3:6,d2=new Date(t0);d2=new Date(d2.getFullYear(),d2.getMonth()+1,1);for(;d2.getTime()<t1;d2=new Date(d2.getFullYear(),d2.getMonth()+1,1))if(d2.getMonth()%step===0)out.push({i:at(d2.getTime()),l:mn[d2.getMonth()]+' de '+d2.getFullYear()});return out}
  for(var k=1;k<=3;k++){var t=t0+(t1-t0)*k/4,q2=new Date(t);out.push({i:at(t),l:q2.getDate()+' de '+mn[q2.getMonth()]})}return out}
var GID=0;
function lineChart(hist,cur,pm,fmt,o){o=o||{};var gid='skg'+(++GID);
  if(!hist||hist.length<2)return '<p class="muted small" style="margin:12px 0">Sem histórico de preços para esse período.</p>';
  var W=320,H=190,vs=hist.map(function(p){return p.c}),lo=Math.min.apply(null,vs),hi=Math.max.apply(null,vs);if(pm)vs.push(pm);if(o.prev)vs.push(o.prev);
  var mn=Math.min.apply(null,vs),mx=Math.max.apply(null,vs),pd=(mx-mn)*.08||mx*.02;mn-=pd;mx+=pd;
  var n=hist.length,x=function(i){return ((i+.5)/n*W).toFixed(1)},yf=function(v){return (H-4-(v-mn)/(mx-mn)*(H-8))/H},y=function(v){return (yf(v)*H).toFixed(1)},up=hist[n-1].c>=(o.prev||hist[0].c);
  var pts=hist.map(function(p,i){return x(i)+','+y(p.c)}).join(' '),hasX=hist.some(function(p){return p.x}),runs=[],col=up?'var(--gain)':'var(--loss)',F=fmt?{format:fmt}:cur==='USD'?usd:brl;
  if(hasX)hist.forEach(function(p,i){var f=!!p.x,r=runs[runs.length-1];if(!r||r.x!==f)runs.push({x:f,a:i>0?i-1:i,e:i});else r.e=i});/* trechos seguidos de pregão e fora do pregão; cada um começa no ponto anterior para a linha não ter buraco */
  var span=(hist[n-1].t-hist[0].t)/864e5,step=Math.max(1,Math.ceil(n/90)),tp=[];for(var i=0;i<n;i+=step)tp.push(i);if(tp[tp.length-1]!==n-1)tp.push(n-1);
  var wd=['dom.','seg.','ter.','qua.','qui.','sex.','sáb.'],mm=['jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.'];
  var dl=function(t){var q=new Date(t),b=wd[q.getDay()]+', '+q.getDate()+' de '+mm[q.getMonth()]+(span>300?' de '+q.getFullYear():'');return o.intra?(o.d1?'':b+', ')+('0'+q.getHours()).slice(-2)+':'+('0'+q.getMinutes()).slice(-2):b};
  var tip={n:n,g:1,pts:tp.map(function(i){var p=hist[i];return {i:i,t:dl(p.t),v:F.format(p.c),y:yf(p.c),c:col}})};
  var tk=niceTicks(mn+pd*.4,mx-pd*.4,4),dec=tk.st>=1?0:tk.st>=.1?2:3,lab=function(v){return fmt&&/%/.test(fmt(v))?fmt(v):num(v,dec)},xt=xTicks(hist,o).filter(function(t,k,a){var pc=(t.i+.5)/n*100,pv=k?(a[k-1].pc||0):-99;t.pc=pc;if(pc-(a._l==null?-99:a._l)<34&&k)return false;a._l=pc;return true});
  return '<div class="gch"><div class="gyc">'+tk.t.map(function(v){return '<span style="top:'+(yf(v)*100).toFixed(2)+'%">'+esc(lab(v))+'</span>'}).join('')+'</div><div class="gcw"><div class="tipc"'+tipAttr(tip)+'><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" width="100%" height="'+H+'" role="img" aria-label="Gráfico de preço"><defs><linearGradient id="'+gid+'" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:'+col+';stop-opacity:.38"/><stop offset="1" style="stop-color:'+col+';stop-opacity:.04"/></linearGradient></defs>'+
    tk.t.map(function(v){return '<line x1="0" x2="'+W+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)" stroke-width="1" vector-effect="non-scaling-stroke"/>'}).join('')+
    (hasX?runs.map(function(r){var q=hist.slice(r.a,r.e+1).map(function(pp,k){return x(r.a+k)+','+y(pp.c)}).join(' ');return r.x?'<polyline points="'+q+'" fill="none" stroke="var(--muted)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>':'<polygon points="'+x(r.a)+','+H+' '+q+' '+x(r.e)+','+H+'" fill="url(#'+gid+')"/><polyline points="'+q+'" fill="none" stroke="'+col+'" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>'}).join(''):'<polygon points="'+x(0)+','+H+' '+pts+' '+x(n-1)+','+H+'" fill="url(#'+gid+')"/><polyline points="'+pts+'" fill="none" stroke="'+col+'" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>')+
    (o.prev?'<line x1="0" x2="'+W+'" y1="'+y(o.prev)+'" y2="'+y(o.prev)+'" stroke="var(--muted)" stroke-dasharray="1 4" stroke-width="1.5" vector-effect="non-scaling-stroke"/>':'')+
    (pm?'<line x1="0" x2="'+W+'" y1="'+y(pm)+'" y2="'+y(pm)+'" stroke="var(--c2)" stroke-dasharray="5 4" stroke-width="1.5" vector-effect="non-scaling-stroke"/>':'')+
    '<line x1="0" x2="'+W+'" y1="'+(H-.5)+'" y2="'+(H-.5)+'" stroke="var(--muted)" stroke-width="1" vector-effect="non-scaling-stroke"/>'+
    xt.map(function(t){return '<line x1="'+x(t.i)+'" x2="'+x(t.i)+'" y1="'+(H-6)+'" y2="'+H+'" stroke="var(--muted)" stroke-width="1" vector-effect="non-scaling-stroke"/>'}).join('')+'</svg></div>'+
    '<div class="gx">'+xt.map(function(t){var pc=(t.i+.5)/n*100;return '<span style="left:'+pc.toFixed(1)+'%"'+(pc>86?' class="r"':pc<10?' class="l"':'')+'>'+esc(t.l)+'</span>'}).join('')+'</div></div></div>'+
    (o.prev?'<div class="spkl" style="color:var(--muted)"><span class="lg"><i class="d"></i>antes do fechamento: '+esc(F.format(o.prev))+'</span>'+(hasX?'<span class="lg"><i class="d" style="border-style:solid;border-color:var(--muted)"></i>cinza: pré e pós-mercado</span>':'')+'</div>':'')+(pm?'<div class="spkl" style="color:var(--muted)"><span class="lg"><i class="d" style="border-color:var(--c2)"></i>seu preço médio</span></div>':'');
}
/* dados finos do robô (repositório privado, pasta dados/): um arquivo por ativo, baixado só quando precisa */
var FIN={};
function ySym(tk){return tk.charAt(0)==='^'||!isBR(tk)?tk:tk+'.SA'}
function finGet(kind,sym){var k=kind+'/'+sym,px=kind==='intra'&&pxBase(),ttl=kind==='intra'?(px?60000:240000):6*3600000,c=FIN[k];
  if(c&&c.p)return c.p;if(c&&(c.err?Date.now()-c.at<60000:c.d!==undefined&&Date.now()-c.at<ttl))return Promise.resolve(c.d);if(!S.keys.gh&&!px){FIN[k]={d:null,at:Date.now()};return Promise.resolve(null)}
  var ac=new AbortController(),to=setTimeout(function(){ac.abort()},15000),old=c&&c.d;
  var p=(px?fetch(px+'/i?s='+encodeURIComponent(sym)+(/^[A-Za-z0-9]{1,10}$/.test(sym)?'&x=1':''),{signal:ac.signal}):fetch('https://api.github.com/repos/'+ghRepo()+'/contents/dados/'+kind+'/'+sym.replace(/[^A-Za-z0-9._-]/g,'_')+'.json?ref=main',{headers:{'Authorization':'Bearer '+S.keys.gh,'Accept':'application/vnd.github.raw'},signal:ac.signal,cache:'no-store'}))
    .then(function(r){clearTimeout(to);if(r.status===404)return null;if(!r.ok)throw 0;return r.json()}).catch(function(){return old===undefined?undefined:old}).then(function(d){FIN[k]={d:d,at:Date.now(),err:d===undefined};return d});
  FIN[k]={p:p,d:old,at:0};return p}
function finRedo(){if($('stk').hidden)return;if(STK.hero)heroRender();else if(STK.idx)idxRender();else stkRender()}
/* 1D/5D (pontos de 5 min) e Máx (candles diários): {st:'ok',hist,o} | {st:'load'|'none',msg} ou null quando o período não usa esses dados */
function finView(sym,rg,ext){var kind=rg==='1d'||rg==='5d'?'intra':rg==='max'?'dia':null;if(!kind||!sym)return null;
  var k=kind+'/'+sym,c=FIN[k];if(!c||(!c.p&&Date.now()-c.at>(c.err?60000:kind==='intra'?(pxBase()?60000:240000):6*3600000)))finGet(kind,sym).then(finRedo);
  c=FIN[k];var d=c&&c.d;if(c&&c.err&&!c.p&&d===undefined)return {st:'none',msg:'Não consegui carregar o histórico agora. Tente de novo em instantes.'};if(!c||c.p&&d===undefined)return {st:'load',msg:'Carregando o histórico...'};
  if(!d||!(d.p||d.d)||(d.p||d.d).length<2)return {st:'none',msg:kind==='intra'?'Ainda não há pontos de 5 minutos desse ativo. O robô os grava durante o pregão (a cada 30 min); volte depois da abertura.':'Ainda não há o histórico completo desse ativo.'};
  if(kind==='dia')return {st:'ok',hist:d.d.map(function(r){return {t:r[0]*864e5,c:r[4]}}),o:{}};
  var off=d.off==null?-10800:d.off,dia=function(t){return Math.floor((t+off)/86400)},ult=dia(d.p[d.p.length-1][0]),pts=d.p.filter(function(p){return rg==='5d'||dia(p[0])===ult}),xo=function(t){var q=(((t+off)%86400)+86400)%86400;return d.ext&&(q<34200||q>=57600)};/* d.ext: o servidor mandou pré (4h–9h30) e pós-mercado (16h–20h) do horário de Nova York */
  if(!ext)pts=pts.filter(function(p){return !xo(p[0])});
  if(pts.length<2)return {st:'none',msg:'Ainda não há pontos de 5 minutos desse ativo.'};
  return {st:'ok',hist:pts.map(function(p){var o={t:p[0]*1000,c:p[1]};if(ext&&xo(p[0]))o.x=1;return o}),o:rg==='1d'&&d.prev?{prev:d.prev,intra:1,d1:1}:{intra:1},at:d.at*1000}}

/* abertura, máxima, mínima e fechamento anterior do último pregão (arquivo de 5 min do robô) */
function finStat(sym){if(!sym)return null;var k='intra/'+sym,c=FIN[k];if(!c||(!c.p&&Date.now()-c.at>(c.err?60000:pxBase()?60000:240000)))finGet('intra',sym).then(finRedo);c=FIN[k];var d=c&&c.d;return d&&d.o!=null?{o:d.o,h:d.h,l:d.l,prev:d.prev}:null}
