/* gráfico estilo Google: cabeçalho com variação, botões de período, linha com eixos e toque com bolinha */
var RMORE=false,RGL={'1d':'hoje','5d':'em 5 dias','1mo':'em 1 mês','3mo':'em 3 meses','6mo':'em 6 meses','ytd':'acumulados no ano','1y':'em 1 ano','2y':'em 2 anos','5y':'em 5 anos','max':'no total','yr':'por ano'};
function rgCut(hist,rg){if(rg!=='ytd'||!hist||hist.length<2)return hist;var j=new Date(new Date().getFullYear(),0,1).getTime(),i=0;while(i<hist.length-1&&hist[i+1].t<j)i++;return hist.slice(i)}
function gWhen(at){if(!at)return '';var d=new Date(at),m=Math.round((Date.now()-at)/60000),t=d.toLocaleDateString('pt-BR',{day:'numeric',month:'short'})+', '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+' BRT';
  return t+(m>=0&&m<180?' · atualizado há '+(m<1?'menos de 1':m)+' min':'')}
/* cabeçalho: nome, preço grande, variação (valor e %) com seta e o período, data e hora da cotação */
function gHead(name,sub,priceTxt,abs,pct,rg,absTxt,when){
  var up=pct==null?null:pct>=0,c=up==null?'':up?'gain':'loss';
  return '<p class="muted small" style="margin:0 0 4px">'+esc(name||'')+(sub?' · '+esc(sub):'')+'</p><div class="gh"><b class="num">'+priceTxt+'</b>'+
    (pct!=null?'<span class="gch '+c+'"><span class="arr">'+(up?'▲':'▼')+'</span> '+(absTxt?absTxt+' ':'')+'('+pf.format(Math.abs(pct))+'%) <small>'+(RGL[rg]||'')+'</small></span>':'')+'</div>'+
    (when?'<p class="muted small gwh">'+esc(when)+'</p>':'');
}
/* botões: 1D 5D (em breve) 1M 6M YTD + Mais */
function rngBar(cur,skip){
  var main=[['1d','1D'],['5d','5D'],['1mo','1M'],['6mo','6M'],['ytd','YTD']],more=[['3mo','3M'],['1y','1A'],['5y','5A'],['max','Máx'],['yr','Anual']].filter(function(r){return skip.indexOf(r[0])<0}),
      inMore=more.some(function(r){return r[0]===cur}),open=RMORE||inMore;
  return '<div class="rng">'+main.map(function(r){
      if(r[0]==='1d'||r[0]==='5d')return bal('Em breve: o gráfico de '+(r[0]==='1d'?'1 dia':'5 dias')+' (minuto a minuto) chega quando o robô passar a guardar os preços do dia.','<span class="rb dim">'+r[1]+'</span>');
      return '<button type="button" data-rng="'+r[0]+'" aria-pressed="'+(cur===r[0])+'">'+r[1]+'</button>'}).join('')+
    '<button type="button" data-rmore="1" aria-pressed="'+open+'">Mais '+(open?'▴':'▾')+'</button></div>'+
    (open?'<div class="rng rng2">'+more.map(function(r){return '<button type="button" data-rng="'+r[0]+'" aria-pressed="'+(cur===r[0])+'">'+r[1]+'</button>'}).join('')+'</div>':'');
}
/* grade de números do dia / 52 semanas; ignora o que não veio */
function gStats(rows){rows=rows.filter(function(r){return r[1]!=null&&r[1]!=='—'});if(!rows.length)return '';
  return '<div class="gst">'+rows.map(function(r){return '<div><span>'+r[0]+'</span><b class="num">'+r[1]+'</b></div>'}).join('')+'</div>'}
function lineChart(hist,cur,pm,fmt){
  if(!hist||hist.length<2)return '<p class="muted small" style="margin:12px 0">Sem histórico de preços para esse período.</p>';
  var W=320,H=190,vs=hist.map(function(p){return p.c}),lo=Math.min.apply(null,vs),hi=Math.max.apply(null,vs);if(pm)vs.push(pm);
  var mn=Math.min.apply(null,vs),mx=Math.max.apply(null,vs),pd=(mx-mn)*.08||mx*.02;mn-=pd;mx+=pd;
  var n=hist.length,x=function(i){return ((i+.5)/n*W).toFixed(1)},yf=function(v){return (H-4-(v-mn)/(mx-mn)*(H-8))/H},y=function(v){return (yf(v)*H).toFixed(1)},up=hist[n-1].c>=hist[0].c;
  var pts=hist.map(function(p,i){return x(i)+','+y(p.c)}).join(' '),col=up?'var(--gain)':'var(--loss)',F=fmt?{format:fmt}:cur==='USD'?usd:brl;
  var span=(hist[n-1].t-hist[0].t)/864e5,step=Math.max(1,Math.ceil(n/60)),tp=[];for(var i=0;i<n;i+=step)tp.push(i);if(tp[tp.length-1]!==n-1)tp.push(n-1);
  var dl=function(t,long){return new Date(t).toLocaleDateString('pt-BR',long?{day:'numeric',month:'short',year:'numeric'}:span>400?{month:'short',year:'2-digit'}:{day:'numeric',month:'short'})};
  var tip={n:n,pts:tp.map(function(i){var p=hist[i],ch=(p.c/hist[0].c-1);return {i:i,t:dl(p.t,1),y:yf(p.c),c:col,r:[['','Preço',F.format(p.c)],['','No período',(ch>=0?'+':'−')+pf.format(Math.abs(ch*100))+'%',ch>=0?'gain':'loss']].concat(pm?[['','Seu preço médio',F.format(pm)]]:[])}})};
  var ticks=[hi,(hi+lo)/2,lo],labs=[0,1,2,3].map(function(k){return dl(hist[Math.min(n-1,Math.round(k*(n-1)/3))].t)});
  return '<div class="gch"><div class="tipc"'+tipAttr(tip)+'><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" width="100%" height="'+H+'" role="img" aria-label="Gráfico de preço"><defs><linearGradient id="skg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".25"/><stop offset="1" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs>'+
    ticks.map(function(v){return '<line x1="0" x2="'+W+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)" stroke-dasharray="2 4" stroke-width="1" vector-effect="non-scaling-stroke"/>'}).join('')+
    '<polygon points="0,'+H+' '+pts+' '+W+','+H+'" fill="url(#skg)"/><polyline points="'+pts+'" fill="none" stroke="'+col+'" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>'+
    (pm?'<line x1="0" x2="'+W+'" y1="'+y(pm)+'" y2="'+y(pm)+'" stroke="var(--c2)" stroke-dasharray="5 4" stroke-width="1.5" vector-effect="non-scaling-stroke"/>':'')+'</svg>'+
    ticks.map(function(v){return '<span class="gy" style="top:'+(yf(v)*100).toFixed(1)+'%">'+esc(F.format(v))+'</span>'}).join('')+'</div>'+
    '<div class="gx">'+labs.map(function(l){return '<span>'+l+'</span>'}).join('')+'</div></div>'+(pm?'<div class="spkl" style="color:var(--muted)"><span class="lg"><i class="d" style="border-color:var(--c2)"></i>seu preço médio</span></div>':'');
}
