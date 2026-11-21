/* ===== Abas da página da ação (1.33.0): Dividendos, Sobre e Receita ===== */
var EMR='10';try{var er0=localStorage.getItem(LS+'-emr');if(er0==='5'||er0==='10'||er0==='max')EMR=er0}catch(e){}
function emYear(day){return new Date(day*864e5).getUTCFullYear()}
/* proventos por ação já pagos: [[dia(epoch), valor]] do Yahoo (robô) ou, na falta, do Fundamentus (data-com) */
function emDivs(tk){var h=MD.d&&MD.d.hist&&MD.d.hist[tk],o=h&&h.div&&h.div.length?h.div.map(function(x){return [x[0],+x[1],'']}):null;
  if(!o){var p=MD.d&&MD.d.prov&&MD.d.prov[tk];if(p&&p.length)o=p.filter(function(x){return x[0]&&+x[1]>0&&x[0]<=today()}).map(function(x){return [Math.floor(Date.parse(x[0])/864e5),+x[1],String(x[2]||'')]})}
  return o?o.sort(function(a,b){return a[0]-b[0]}):null}
function emBars(rows,o){/* rows: [{l,v,t:[[rótulo,valor,classe]],f:cor opcional}] */
  var ok=rows.filter(function(r){return r.v!=null});if(ok.length<2)return '';
  var mx=Math.max.apply(null,ok.map(function(r){return Math.max(r.v,r.w||0)}).concat([0])),mn=Math.min.apply(null,ok.map(function(r){return Math.min(r.v,r.w==null?0:r.w)}).concat([0])),rg=mx-mn||1,H=o.h||140,W=300,n=rows.length,bw=W/n,y0=H*(mx/rg),yy=function(v){return y0-v/rg*H};
  var bars=rows.map(function(r,i){if(r.v==null)return '';var hh=Math.abs(r.v)/rg*H,y=r.v>=0?y0-hh:y0;return '<rect x="'+(i*bw+bw*.18).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(bw*.64).toFixed(1)+'" height="'+Math.max(1,hh).toFixed(1)+'" rx="3" fill="'+(r.v<0?'var(--loss)':(r.f||'var(--c1)'))+'"/>'}).join('');
  var pts=rows.map(function(r,i){return r.w==null?null:[(i+.5)*bw,yy(r.w)]}).filter(Boolean),line=o.line&&pts.length>1?'<polyline points="'+pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1)}).join(' ')+'" fill="none" stroke="var(--c6)" stroke-width="2" vector-effect="non-scaling-stroke"/>'+pts.map(function(p){return '<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="2.6" fill="var(--c6)"/>'}).join(''):'';
  var tip={n:n,pts:rows.map(function(r,i){return {i:i,t:r.l,r:r.t}})},ls=n>14?Math.ceil(n/7):1;
  return '<div class="tipc evpl qch"'+tipAttr(tip)+'><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" width="100%" height="'+H+'" role="img" aria-label="'+esc(o.a||'')+'"><line x1="0" x2="'+W+'" y1="'+y0.toFixed(1)+'" y2="'+y0.toFixed(1)+'" stroke="var(--line)"/>'+bars+line+'</svg></div>'+
    '<div class="qlb">'+rows.map(function(r,i){return '<span>'+(i%ls===0?esc(r.s||r.l):'')+'</span>'}).join('')+'</div>'}
/* --- Dividendos --- */
function emDiv(tk,d,mine,K,pm){var F=d.cur==='USD'?usd:brl,dv=emDivs(tk),pr=d.price,day=Math.floor(Date.now()/864e5),h='';
  var up=[];try{up=pvItems().filter(function(x){return x.tk===tk&&x.st!=='rec'})}catch(e){}
  var rec=0,nrec=0;try{pvItems().forEach(function(x){if(x.tk===tk&&x.st==='rec'){rec+=x.liq||0;nrec++}})}catch(e){}
  if(!dv||!dv.length){return '<div class="panel"><h2>Dividendos</h2><p class="muted" style="margin:0">Ainda não tenho o histórico de proventos dessa ação. Toque em <b>Acompanhar</b> (embaixo) que o robô passa a buscar.</p></div>'+(up.length?emUp(up):'')}
  var d12=0,n12=0;dv.forEach(function(x){if(day-x[0]<=365){d12+=x[1];n12++}});
  var por={};dv.forEach(function(x){var y=emYear(x[0]);por[y]=(por[y]||0)+x[1]});var ys=Object.keys(por).map(Number).sort(),yc=new Date().getUTCFullYear();
  var cheios=ys.filter(function(y){return y<yc}).slice(-5),med=cheios.length?cheios.reduce(function(s,y){return s+por[y]},0)/cheios.length:null;
  var dy12=pr>0?d12/pr*100:null,yoc=mine&&pm>0?d12/pm*100:null;
  var kp=[['Dividend yield (12 meses)',dy12==null?'—':pf.format(dy12)+'%'],['Por ação em 12 meses',F.format(d12)],['Pagamentos em 12 meses',String(n12)],['Média por ano',med==null?'—':F.format(med)]];if(yoc!=null)kp.push(['Sobre o seu preço médio',pf.format(yoc)+'% ao ano']);
  h+='<div class="panel"><h2>Dividendos '+bal('Proventos por ação pagos pela empresa (dividendos e juros sobre capital próprio, em valor bruto), do histórico que o robô guarda. O dividend yield de 12 meses é o que ela pagou nos últimos 12 meses dividido pelo preço de hoje.')+'</h2><div class="kpis" style="margin-top:6px">'+kp.map(function(r){return '<div><span>'+r[0]+'</span><b>'+r[1]+'</b></div>'}).join('')+'</div>'+
    (rec>0?'<p class="note" style="margin:8px 0 0">Você já recebeu <b>'+brl.format(rec)+'</b> de proventos dessa ação ('+nrec+(nrec>1?' pagamentos':' pagamento')+', líquidos).</p>':'')+'</div>';
  var rows=ys.slice(-8).map(function(y){var v=por[y];return {l:String(y)+(y===yc?' (até agora)':''),s:"'"+String(y).slice(2),v:v,f:y===yc?'var(--c6)':'var(--c1)',t:[['','Por ação',F.format(v)]]}});
  var bc=emBars(rows,{a:'Proventos por ação por ano'});if(bc)h+='<div class="panel"><h2>Proventos por ano '+bal('Soma do que a empresa pagou por ação em cada ano. O ano atual aparece mais claro porque ainda não terminou. Toque nas barras.')+'</h2>'+bc+'</div>';
  if(up.length)h+=emUp(up);
  h+='<div class="panel"><h2>Últimos pagamentos</h2><ul class="calc small">'+dv.slice(-12).reverse().map(function(x){var dt=new Date(x[0]*864e5).toISOString().slice(0,10);return '<li><span>'+(x[2]?esc(x[2].replace('JUROS SOBRE CAPITAL PRÓPRIO','JCP'))+' <span class="muted">· ':'<span class="muted">')+'data-com '+fmtDate(dt)+'</span></span><span class="num">'+F.format(x[1])+'</span></li>'}).join('')+'</ul><p class="note">Valores brutos por ação. Dividendos de ações brasileiras são isentos de imposto para quem recebe; juros sobre capital próprio têm 15% retidos.</p></div>';
  return h}
function emUp(up){return '<div class="panel"><h2>A receber</h2><ul class="calc small">'+up.map(function(x){return '<li><span>'+esc(x.tipo||'Provento')+' <span class="muted">· '+(x.dc?'data-com '+fmtDate(x.dc):'')+(x.pay?' · pagamento '+fmtDate(x.pay):' · pagamento a definir')+'</span></span><span class="num">'+(x.liq>0?brl.format(x.liq):x.r?brl.format(x.r)+'/ação':'—')+'</span></li>'}).join('')+'</ul></div>'}
/* --- Receita e lucro por ano (DFP da CVM, pelo robô) --- */
function emAnual(tk){var a=MD.d&&MD.d.anual&&MD.d.anual.d&&MD.d.anual.d[tk];if(!a)return null;var o=Object.keys(a).map(function(y){return [+y,a[y][0],a[y][1]]}).filter(function(x){return x[1]!=null||x[2]!=null}).sort(function(x,y){return x[0]-y[0]});return o.length?o:null}
function emRec(tk,d){var A=isBR(tk)?emAnual(tk):null,h='';
  if(!A)return '<div class="panel"><h2>Receita e lucro</h2><p class="muted" style="margin:0">'+(isBR(tk)?'Os balanços anuais dessa empresa ainda não chegaram ao app. O robô busca na CVM aos poucos (começa pela sua carteira e pela sua lista); toque em <b>Acompanhar</b> para ela entrar.':'Receita e lucro por ano só estão disponíveis para ações do Brasil (balanços da CVM).')+'</p></div>';
  var n=EMR==='5'?5:EMR==='10'?10:A.length,R=A.slice(-n),F=brl,last=A[A.length-1],ant=A.filter(function(x){return x[0]===last[0]-1})[0],g=ant&&ant[1]>0&&last[1]!=null?last[1]/ant[1]-1:null,c5=null;
  var a5=A.filter(function(x){return x[0]===last[0]-5})[0];if(a5&&a5[1]>0&&last[1]>0)c5=Math.pow(last[1]/a5[1],1/5)-1;
  var ml=last[1]>0&&last[2]!=null?last[2]/last[1]*100:null,sg=function(v){return '<b class="'+(v>=0?'gain':'loss')+'">'+(v>=0?'+':'−')+pf.format(Math.abs(v*100))+'%</b>'};
  var seg='<div class="seg" style="grid-template-columns:repeat(3,1fr);margin:8px 0">'+[['5','5 anos'],['10','10 anos'],['max','Máximo']].map(function(x){return '<button type="button" data-emr="'+x[0]+'" aria-pressed="'+(EMR===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>';
  var rows=R.map(function(x){var m=x[1]>0&&x[2]!=null?x[2]/x[1]*100:null;return {l:String(x[0]),s:"'"+String(x[0]).slice(2),v:x[1],w:x[2],f:'var(--c1)',t:[['','Receita líquida',qfmt(x[1])],['','Lucro líquido',qfmt(x[2])]].concat(m!=null?[['','Margem líquida',pf.format(m)+'%']]:[])}});
  h+='<div class="panel"><h2>Receita e lucro '+bal('Receita líquida (barras) e lucro líquido (linha) de cada ano, tirados dos balanços anuais que a empresa entrega à CVM (consolidado). Mostra se o negócio cresce e se o lucro acompanha. Toque nas barras para ver cada ano.')+'</h2>'+
    '<p class="anv" style="margin:4px 0 0">Em '+last[0]+': receita de <b>'+qfmt(last[1])+'</b>'+(g!=null?' ('+sg(g)+' vs '+(last[0]-1)+')':'')+' e lucro de <b>'+qfmt(last[2])+'</b>'+(ml!=null?' (margem líquida de '+pf.format(ml)+'%)':'')+'.'+(c5!=null?' Em 5 anos a receita cresceu em média '+sg(c5)+' por ano.':'')+'</p>'+seg+
    '<div class="muted small" style="display:flex;gap:14px;margin:4px 0"><span><i class="dot" style="background:var(--c1)"></i> Receita líquida</span><span><i class="dot" style="background:var(--c6)"></i> Lucro líquido</span></div>'+emBars(rows,{line:1,h:170,a:'Receita e lucro por ano'})+
    '<p class="note">Balanços anuais (DFP) da CVM, consolidado. Anos disponíveis: '+A[0][0]+' a '+last[0]+'. O ano em andamento só entra depois que a empresa publica o balanço. Para bancos, a receita é a das operações financeiras.</p></div>';
  h+=(function(){try{return qHtml(tk)}catch(e){return ''}})();
  h+='<div class="panel"><h2>Receita por país e por negócio</h2><p class="muted small" style="margin:0">Quanto a empresa fatura em cada região ou em cada produto (petróleo, diesel, etc.) vem das notas dos balanços, em texto, e não existe em base gratuita organizada. Para não mostrar número errado, o app não preenche isso.</p></div>';
  return h}
/* --- Sobre --- */
function emSobre(tk,d){var h=(function(){try{return sobHtml(tk,d)}catch(e){return ''}})();
  if(!h)h='<div class="panel"><h2>Sobre a empresa</h2><p class="muted" style="margin:0">'+(d.sector?'Setor: '+esc(d.sector)+'. ':'')+'O resumo da empresa só existe para ações do Brasil (cadastro da CVM).</p></div>';
  return h}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-emr]');if(!b)return;EMR=b.getAttribute('data-emr');try{localStorage.setItem(LS+'-emr',EMR)}catch(x){}if(STK.tk)stkRender()});
