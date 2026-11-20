/* Aporte · js/mercado.js — aba Mercado: índices, acompanhamento, oportunidades, notícias, resumo e balanços.
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
/* ===== Mercado: índices, lista de acompanhamento e página da ação ===== */
var MKT={q:{},idx:{},at:0,busy:false,err:''};
try{var mk0=JSON.parse(localStorage.getItem(LS+'-mkt')||'null');if(mk0){MKT.q=mk0.q||{};MKT.idx=mk0.idx||{};MKT.at=mk0.at||0}}catch(e){}
function isBR(tk){var t=(S.trades||[]).filter(function(x){return x.ticker===tk&&(x.market==='BR'||x.market==='US')})[0];if(t)return t.market==='BR';return /^[A-Z0-9]{4}\d{1,2}[A-Z]?$/.test(tk)}
function wlist(){return Array.isArray(S.watch)?S.watch:[]}
function mktSave(){try{localStorage.setItem(LS+'-mkt',JSON.stringify({q:MKT.q,idx:MKT.idx,at:MKT.at}))}catch(e){}}
function wait(ms){return new Promise(function(r){setTimeout(r,ms)})}
/* cotação pelo servidor próprio (Worker): horário real do Yahoo; null se não houver servidor */
function pxOne(tk){var u=pxBase();if(!u)return Promise.resolve(null);return getJSON(u+'/q?s='+encodeURIComponent(ySym(tk))).then(function(j){var q=j&&j[ySym(tk)];if(!q||!(q.p>0))return null;return {price:q.p,pct:q.prev>0?(q.p/q.prev-1)*100:0,name:'',cur:q.cur==='USD'?'USD':'BRL',at:Math.min(Date.now(),(q.t||0)*1000)||Date.now()}}).catch(function(){return null})}
function brQuote(tk){return pxOne(tk).then(function(q){return q||brQuote0(tk)})}
function brQuote0(tk){return getJSON('https://brapi.dev/api/quote/'+encodeURIComponent(tk)+'?token='+encodeURIComponent(S.keys.brapi||'')).then(function(d){var x=d&&d.results&&d.results[0];if(!x||!(x.regularMarketPrice>0))throw new Error('0');
  return {price:x.regularMarketPrice,pct:x.regularMarketChangePercent,name:x.longName||x.shortName||'',cur:'BRL',at:(Date.parse(x.regularMarketTime)||0)>0&&Date.parse(x.regularMarketTime)<=Date.now()?Date.parse(x.regularMarketTime):Date.now()}})}
function usQuote(tk){return pxOne(tk).then(function(q){return q||usQuote0(tk)})}
function usQuote0(tk){if(!S.keys.finnhub)return Promise.reject(new Error('fh'));return getJSON('https://finnhub.io/api/v1/quote?symbol='+encodeURIComponent(tk)+'&token='+encodeURIComponent(S.keys.finnhub)).then(function(d){if(!d||!(d.c>0))throw new Error('0');return {price:d.c,pct:d.dp,cur:'USD',at:d.t>0&&d.t*1000<=Date.now()?d.t*1000:Date.now()}})}
/* catálogo de índices que o usuário escolhe mostrar (S.idxSel, sincronizado como cfg 'idx') */
var IDX=[
 {k:'ibov',n:'Ibovespa',t:'Bolsa do Brasil',src:'br',s:'^BVSP',f:'pts'},
 {k:'ifix',n:'IFIX',t:'Fundos imobiliários (pelo XFIX11)',src:'br',s:'XFIX11',f:'brl'},
 {k:'smll',n:'Small caps',t:'Empresas menores do Brasil (pelo SMAL11)',src:'br',s:'SMAL11',f:'brl'},
 {k:'idiv',n:'Dividendos',t:'Pagadoras de dividendos do Brasil (pelo DIVO11)',src:'br',s:'DIVO11',f:'brl'},
 {k:'SPY',n:'S&P 500',t:'Bolsa dos EUA (pelo SPY)',src:'us',s:'SPY',f:'usd'},
 {k:'QQQ',n:'Nasdaq',t:'Tecnologia dos EUA (pelo QQQ)',src:'us',s:'QQQ',f:'usd'},
 {k:'DIA',n:'Dow Jones',t:'30 grandes dos EUA (pelo DIA)',src:'us',s:'DIA',f:'usd'},
 {k:'ACWI',n:'Mundo (MSCI)',t:'Ações do mundo todo (pelo ACWI)',src:'us',s:'ACWI',f:'usd'},
 {k:'EEM',n:'Emergentes',t:'Bolsas emergentes (pelo EEM)',src:'us',s:'EEM',f:'usd'},
 {k:'GLD',n:'Ouro',t:'Commodity · US$ por onça-troy',src:'cmd',s:'GC=F',f:'usd',tp:'OURO'},
 {k:'usd',n:'Dólar',t:'Dólar comercial',src:'usd',f:'fx'},
 {k:'eur',n:'Euro',t:'Euro em reais',src:'fx',s:'EUR-BRL',f:'fx'},
 {k:'gbp',n:'Libra',t:'Libra esterlina em reais',src:'fx',s:'GBP-BRL',f:'fx'},
 {k:'btc',n:'Bitcoin',t:'Bitcoin em reais',src:'fx',s:'BTC-BRL',f:'brl'},
 {k:'eth',n:'Ethereum',t:'Ethereum em reais',src:'fx',s:'ETH-BRL',f:'brl'},
 {k:'brent',n:'Petróleo Brent',t:'Commodity · US$ por barril',src:'cmd',s:'BZ=F',f:'usd',tp:'PETRÓLEO'},
 {k:'wti',n:'Petróleo WTI',t:'Commodity · US$ por barril (EUA)',src:'cmd',s:'CL=F',f:'usd'},
 {k:'iron',n:'Minério de ferro',t:'Commodity · US$ por tonelada',src:'cmd',s:'TIO=F',f:'usd',tp:'MINÉRIO'},
 {k:'silver',n:'Prata',t:'Commodity · US$ por onça',src:'cmd',s:'SI=F',f:'usd',tp:'PRATA'},
 {k:'copper',n:'Cobre',t:'Commodity · US$ por libra-peso',src:'cmd',s:'HG=F',f:'usd'},
 {k:'soy',n:'Soja',t:'Commodity · US$ por bushel',src:'cmd',s:'ZS=F',f:'usd',tp:'SOJA'},
 {k:'corn',n:'Milho',t:'Commodity · US$ por bushel',src:'cmd',s:'ZC=F',f:'usd'},
 {k:'coffee',n:'Café arábica',t:'Commodity · US$ por libra-peso',src:'cmd',s:'KC=F',f:'usd',tp:'CAFÉ'},
 {k:'natgas',n:'Gás natural',t:'Commodity · US$ por MMBtu',src:'cmd',s:'NG=F',f:'usd'},
 {k:'tnx',n:'Juros EUA 10 anos',t:'Rendimento do título de 10 anos do Tesouro americano',src:'cmd',s:'^TNX',f:'pct',tp:'JUROS EUA 10A'},
 {k:'selic',n:'Selic (ao ano)',t:'Taxa básica de juros, definida pelo Copom',src:'selic',f:'pct'},
 {k:'cdi',n:'CDI (ao ano)',t:'Juro entre bancos, que rende a renda fixa',src:'cdi',f:'pct'},
 {k:'ipca',n:'IPCA (12 meses)',t:'Inflação oficial',src:'ipca',f:'pct'}];
var IDXDEF=['ibov','SPY','QQQ','ifix','usd','eur','btc','cdi'],MKED=false;
function idxSel(){var a=Array.isArray(S.idxSel)?S.idxSel:IDXDEF;return a.filter(function(k){return IDX.some(function(x){return x.k===k})})}
function idxSet(a){S.idxSel=a;S.pend.push({t:'cfg',k:'idx',v:a});save();ghSync()}
/* novidades colocadas uma vez nos cartões do usuário (depois da primeira sincronização, para não apagar a escolha da nuvem) */
var IDXMIG=[['-idxcmd',['brent','iron','GLD']],['-idxselic',['selic','cdi']],['-idxtnx',['tnx']]];
function idxCmdAdd(){try{if(S.keys.gh&&!GH.last)return false;var a=idxSel().slice(),ch=0;IDXMIG.forEach(function(m){if(localStorage.getItem(LS+m[0]))return;localStorage.setItem(LS+m[0],'1');m[1].forEach(function(k){if(a.indexOf(k)<0){a.push(k);ch=1}})});if(ch){idxSet(a);render()}return true}catch(e){return true}}
var IDXCI=setInterval(function(){if(idxCmdAdd())clearInterval(IDXCI)},3000);
function idxDef(k){return IDX.filter(function(x){return x.k===k})[0]}
function loadMkt(force){
  if(MKT.busy)return;if(!force&&Date.now()-MKT.at<(mktOpen()?15:120)*60000&&Object.keys(MKT.idx).length){return}
  MKT.busy=true;MKT.err='';renderMkt();var jobs=[],sel=idxSel().map(idxDef);
  var fx=sel.filter(function(x){return x.src==='fx'});
  if(fx.length)jobs.push(getJSON('https://economia.awesomeapi.com.br/json/last/'+fx.map(function(x){return x.s}).join(',')).then(function(d){
    fx.forEach(function(x){var o=d[x.s.replace('-','')];if(o)MKT.idx[x.k]={v:parseFloat(o.bid),p:parseFloat(o.pctChange)}})}).catch(function(){}));
  if(S.keys.finnhub)sel.filter(function(x){return x.src==='us'}).forEach(function(x){jobs.push(usQuote(x.s).then(function(q){MKT.idx[x.k]={v:q.price,p:q.pct}}).catch(function(){}))});
  if(sel.some(function(x){return x.src==='selic'}))jobs.push(getJSON('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json').then(function(a){if(Array.isArray(a)&&a.length){var v=parseFloat(String(a[a.length-1].valor).replace(',','.'));if(v>0)MKT.idx.selic={v:v,m:a[a.length-1].data}}}).catch(function(){}));
  if(sel.some(function(x){return x.src==='ipca'}))jobs.push(getJSON('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/12?formato=json').then(function(a){
    if(Array.isArray(a)&&a.length){var f=a.reduce(function(m,r){return m*(1+parseFloat(String(r.valor).replace(',','.'))/100)},1);MKT.idx.ipca={v:(f-1)*100,m:a[a.length-1].data}}}).catch(function(){}));
  var seq=sel.filter(function(x){return x.src==='br'}).map(function(x){return {k:x.k,tk:x.s}}).concat(wlist().map(function(tk){return {w:1,tk:tk}}));
  var p=Promise.resolve();
  seq.forEach(function(it,i){p=p.then(function(){return i?wait(350):null}).then(function(){
    var f=isBR(it.tk)||it.tk.charAt(0)==='^'?(S.keys.brapi?brQuote(it.tk):Promise.reject(new Error('br'))):usQuote(it.tk);
    return f.then(function(q){if(it.k)MKT.idx[it.k]={v:q.price,p:q.pct};else MKT.q[it.tk]=q}).catch(function(e){if(it.w)MKT.err='Não consegui o preço de '+it.tk+(isBR(it.tk)?'':' (ação dos EUA precisa da chave Finnhub)')+'.'})})});
  jobs.push(p);
  Promise.all(jobs).then(function(){MKT.at=Date.now();MKT.busy=false;mktSave();renderMkt()});
}
var IDZ={ibov:0,XFIX11:0,SMAL11:0,DIVO11:0,SPY:1,QQQ:1,DIA:1,ACWI:1,EEM:1};
function idxVal(x){var r=idxVal0(x);if(r&&r.p!=null&&IDZ[x.k]!=null&&dzero(!!IDZ[x.k],MKT.at))return {v:r.v,p:0,sub:r.sub};return r}
function idxVal0(x){var I=MKT.idx;
  if(x.k==='ibov'||x.k==='eur'){var tv=tapeIdx(x.k==='ibov'?'IBOV':'EURO');if(tv&&(!I[x.k]||MKT.at<tv.at))return {v:tv.v,p:tv.p}}
  if(x.src==='cmd'){var tv=x.tp&&tapeIdx(x.tp),D0=MD.d&&MD.d.idx&&MD.d.idx[x.k];if(tv)return {v:tv.v,p:tv.p,sub:'robô, a cada 15 min no pregão'};if(D0&&D0.d&&D0.d.length>1){var l0=D0.d[D0.d.length-1][1],l1=D0.d[D0.d.length-2][1];return {v:l0,p:(l0/l1-1)*100,sub:'último fechamento'}}return null}
  if(x.src==='usd'){var f0=fxToday();return f0?{v:f0.rate,p:S.fx&&S.fx.prev&&S.fx.rate?(S.fx.rate/S.fx.prev-1)*100:null}:null}
  if(x.src==='cdi')return CDI.dates.length?{v:(Math.pow(1+CDI.s[CDI.dates[CDI.dates.length-1]]/100,252)-1)*100,sub:'Banco Central'}:null;
  if(x.src==='selic'){if(I.selic)return {v:I.selic.v,sub:'Copom'};var Ds=MD.d&&MD.d.idx&&MD.d.idx.selic;return Ds&&Ds.last?{v:Ds.last,sub:'Copom'}:null}
  if(x.src==='ipca')return I.ipca?{v:I.ipca.v,sub:'até '+String(I.ipca.m||'').slice(3)}:null;
  return I[x.k]||null}
function idxFmt(x,v){return x.f==='pts'?num(v,0)+' pts':x.f==='usd'?usd.format(v):x.f==='fx'?'R$ '+v.toFixed(4).replace('.',','):x.f==='pct'?pf.format(v)+'%':brl.format(v)}
function mkSearch(q){
  var el=$('mk-res');if(!el)return;q=String(q||'').trim();if(!q){el.innerHTML='';el.hidden=true;return}
  var nq=q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''),sel=idxSel();
  var hits=MKV!=='idx'?[]:IDX.filter(function(x){return (x.n+' '+x.t+' '+(x.s||'')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').indexOf(nq)>=0});
  var h=hits.map(function(x){var on=sel.indexOf(x.k)>=0;return '<li><span><b>'+esc(x.n)+'</b><small>'+esc(x.t)+'</small></span><button type="button" class="btn small'+(on?' ghost':'')+'" data-idxt="'+x.k+'">'+(on?'Remover':'Adicionar')+'</button></li>'}).join('');
  var tk=q.toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(MKV!=='idx'&&MD.d&&MD.d.fund&&tk.length>=2){Object.keys(MD.d.fund.d).filter(function(x){return x!==tk&&x.indexOf(tk)===0}).sort().slice(0,6).forEach(function(x){var iw=wlist().indexOf(x)>=0;
    h+='<li><span><b>'+esc(x)+'</b><small>'+fundSub(x)+'</small></span><span style="display:flex;gap:6px"><button type="button" class="btn small ghost" data-stk="'+esc(x)+'">Ver</button><button type="button" class="btn small'+(iw?' ghost':'')+'" data-wtog="'+esc(x)+'">'+(iw?'Remover':'Acompanhar')+'</button></span></li>'})}
  if(MKV!=='idx'&&/^[A-Z0-9]{2,7}$/.test(tk)&&(/\d/.test(tk)||!hits.length)){var inW=wlist().indexOf(tk)>=0,F=fundOf(tk);
    h+='<li><span><b>'+esc(tk)+'</b><small>'+(F?'Ação do Brasil · P/L '+(F.pl!=null?num(F.pl,1):'—')+' · DY '+(F.dy!=null?pf.format(F.dy)+'%':'—'):'Ação ou ETF')+'</small></span><span style="display:flex;gap:6px"><button type="button" class="btn small ghost" data-stk="'+esc(tk)+'">Ver</button><button type="button" class="btn small'+(inW?' ghost':'')+'" data-wtog="'+esc(tk)+'">'+(inW?'Remover':'Acompanhar')+'</button></span></li>'}
  el.innerHTML=h?'<ul class="mkres">'+h+'</ul>':'<p class="muted small" style="padding:8px 2px">Nada encontrado.</p>';el.hidden=false}
function idxCard(lbl,o,fmt){return '<div class="idx"><small>'+lbl+'</small><b>'+(o&&isFinite(o.v)?fmt(o.v):'—')+'</b>'+(o&&isFinite(o.p)?'<span class="num '+cls(o.p)+'">'+(o.p>=0?'+':'−')+pf.format(Math.abs(o.p))+'%</span>':'<span class="small muted">sem dado</span>')+'</div>'}
/* Mercado em 3 partes: Minhas ações, Índices e Análise */
var MKV='min',SCR='dy',CMP=null;
try{var mv0=localStorage.getItem(LS+'-mkv');if(mv0==='min'||mv0==='idx'||mv0==='ana')MKV=mv0}catch(e){}
function tkRow(tk,us,sub){var lv=livePx(tk),q=MKT.q[tk],p=lv?lv.p:q&&q.price,pc=lv&&lv.pct!=null?lv.pct:q&&q.pct,F=us?usd:brl;
  return '<li><button type="button" class="wtk wtk2" data-stk="'+esc(tk)+'">'+tkLogo(tk,us)+'<span class="an"><b>'+esc(tk)+'</b><small>'+sub+'</small></span></button><span class="wpx">'+(p?'<span>'+F.format(p)+'</span><span class="num small '+cls(pc||0)+'">'+(pc!=null?(pc>=0?'+':'−')+pf.format(Math.abs(pc))+'%':'')+'</span>':'<span class="muted">—</span>')+'</span>'}
function fundSub(tk){var F=fundOf(tk);return F?'P/L '+(F.pl!=null?num(F.pl,1):'—')+' · P/VP '+(F.pvp!=null?num(F.pvp,2):'—')+' · DY '+(F.dy!=null?pf.format(F.dy)+'%':'—'):''}
function mineHtml(){
  var R=compute();if(!R.held.length)return '<div class="panel"><p class="muted">Você ainda não tem ações na carteira.</p></div>';
  var dl=dayLbl();
  return '<div class="panel"><div class="grp"><h2>Minhas ações</h2><span class="det">'+(dl.t==='hoje'?'variação de hoje':'último pregão ('+dl.d+')')+'</span></div><ul class="wl">'+
    R.held.slice().sort(function(a,b){return b.v-a.v}).map(function(x){var us=x.p.market==='US',pm=x.p.cN/x.p.qty;
      return tkRow(x.p.ticker,us,fundSub(x.p.ticker)||(us?'ETF internacional':'Ação'))+'</li>'}).join('')+'</ul><p class="note" style="margin-top:8px">Toque numa ação para ver gráfico, indicadores e proventos.</p></div>';
}
var SCRS=[
 {k:'dy',n:'Maiores dividendos',d:'Dividendos (DY) dos últimos 12 meses, do maior para o menor.',f:function(F){return F.dy>0&&F.dy<30&&F.pl>0},s:function(a,b){return b.dy-a.dy}},
 {k:'pl',n:'Mais baratas (P/L)',d:'Menor preço sobre lucro, só empresas com lucro e ROE positivo.',f:function(F){return F.pl>0&&F.roe>0},s:function(a,b){return a.pl-b.pl}},
 {k:'roe',n:'Mais rentáveis (ROE)',d:'Maior retorno sobre o patrimônio.',f:function(F){return F.roe>0&&F.roe<150&&F.pl>0},s:function(a,b){return b.roe-a.roe}},
 {k:'pvp',n:'Abaixo do patrimônio',d:'P/VP menor que 1: a bolsa paga menos do que o patrimônio da empresa.',f:function(F){return F.pvp>0&&F.pvp<1&&F.pl>0},s:function(a,b){return a.pvp-b.pvp}},
 {k:'qual',n:'Boas e baratas',d:'DY de 6% ou mais, ROE de 12% ou mais e P/L até 12.',f:function(F){return F.dy>=6&&F.roe>=12&&F.pl>0&&F.pl<=12},s:function(a,b){return b.dy-a.dy}}];
/* ===== Oportunidades: sua lista e o garimpo automático, com alertas quando algo muda ===== */
var OPC={k:'',r:null},OPV='lst';
function opD(tk){var F=fundOf(tk),lv=livePx(tk),h=MD.d&&MD.d.hist&&MD.d.hist[tk],us=!F&&h&&h.cur==='USD';
  var P=lv?lv.p:h&&h.last?h.last:F&&F.cot;if(!(P>0))return null;
  var k={};if(h&&h.d&&h.d.length>20){var y=h.d.map(function(p){return p[1]});k.hi=Math.max.apply(null,y);k.lo=Math.min.apply(null,y)}
  return {cur:us?'USD':'BRL',price:P,pct:lv&&lv.pct,k:k}}
function opEval(tk){var d=opD(tk);if(!d)return null;var A=stkAna(tk,d);if(A.etf)return null;var V=anValCalc(tk,d,A);
  return {tk:tk,d:d,A:A,V:V.ms&&V.ms.length?V:null,score:A.score}}
function opHist(){try{return JSON.parse(localStorage.getItem(LS+'-opp')||'{}')||{}}catch(e){return {}}}
/* guarda uma foto por dia de cada ação (nota, preço justo, preço) para comparar depois */
function opSnap(list){var H=opHist(),td=today(),ch=0;list.forEach(function(o){if(!o)return;var a=H[o.tk]=H[o.tk]||[];if(a.length&&a[a.length-1][0]===td)return;a.push([td,o.score,o.V?Math.round(o.V.med*100)/100:null,Math.round(o.d.price*100)/100]);if(a.length>60)a.splice(0,a.length-60);ch=1});
  if(ch)try{localStorage.setItem(LS+'-opp',JSON.stringify(H))}catch(e){}return H}
function opAlerts(o,H,mine){var al=[],F=o.d.cur==='USD'?usd:brl;
  if(o.V&&o.V.up>=0.2)al.push(['ok','Abaixo do preço justo','Preço justo '+F.format(o.V.med)+', '+pf.format(o.V.up*100)+'% acima do preço de hoje.']);
  else if(o.V&&o.V.up<=-0.2&&mine)al.push(['at','Acima do preço justo','Está '+pf.format(Math.abs(o.V.up)*100)+'% acima do preço justo ('+F.format(o.V.med)+').']);
  if(o.d.k.hi){var dd=o.d.price/o.d.k.hi-1;if(dd<=-0.25)al.push(['at','Caiu '+pf.format(Math.abs(dd*100))+'% da máxima do ano','Vale entender o motivo antes de comprar.'])}
  var a=H[o.tk]||[],old=null;for(var i=a.length-1;i>=0;i--){if(dayDiff(a[i][0],today())>=6){old=a[i];break}}
  if(old){if(o.score!=null&&old[1]!=null&&o.score-old[1]>=1)al.push(['ok','A nota melhorou','De '+num(old[1],1)+' para '+num(o.score,1)+' desde '+fmtDate(old[0])+'.']);
    else if(o.score!=null&&old[1]!=null&&old[1]-o.score>=1)al.push(['al','A nota piorou','De '+num(old[1],1)+' para '+num(o.score,1)+' desde '+fmtDate(old[0])+'.']);
    if(old[3]&&Math.abs(o.d.price/old[3]-1)>=0.1)al.push([o.d.price<old[3]?'ok':'at',(o.d.price<old[3]?'Ficou ':'Subiu ')+pf.format(Math.abs(o.d.price/old[3]-1)*100)+'%'+(o.d.price<old[3]?' mais barata':''),'Era '+F.format(old[3])+' em '+fmtDate(old[0])+'.'])}
  if(o.A.N&&o.A.N.dy>=6&&o.A.N.dy<=15&&!mine)al.push(['ok','Paga bons dividendos','DY de '+pf.format(o.A.N.dy)+'%.']);
  return al}
function opData(){var f=MD.d&&MD.d.fund;if(!f||!f.d)return null;var R=compute(),mine={};R.held.forEach(function(x){mine[x.p.ticker]=1});
  var key=MD.d.ts+'|'+wlist().join(',')+'|'+Object.keys(mine).join(',')+'|'+Math.floor(Date.now()/9e5)+'|'+(S.perfil&&S.perfil.obj||'');if(OPC.k===key)return OPC.r;
  var W=wlist().map(opEval).filter(Boolean),M=Object.keys(mine).filter(function(t){return R.held.some(function(x){return x.p.ticker===t&&x.p.market!=='US'})}).map(opEval).filter(Boolean);
  /* garimpo: empresas de qualidade abaixo do preço justo, entre as ações com boa liquidez */
  var seen={},cand=Object.keys(f.d).filter(function(tk){var F=fundOf(tk);return F&&F.liq2m>=2e6&&F.pl>2&&F.roe>0}).map(function(tk){var F=fundOf(tk);F.tk=tk;return F}).sort(function(a,b){return b.liq2m-a.liq2m});
  var D=[];cand.forEach(function(F){var b=F.tk.slice(0,4);if(seen[b]||mine[F.tk])return;seen[b]=1;var o=opEval(F.tk);if(!o||!o.V||o.score==null)return;
    var Q=o.A.chips[0][1],Pq=o.A.chips[1][1];if(Q==='Baixa'||o.V.up<0.2||o.score<6)return;if(o.A.N.dy>20)return;
    var pfo=S.perfil&&S.perfil.obj,Nn=o.A.N||{};o.rank=o.score*10+Math.min(60,o.V.up*100)*0.6+(Q==='Alta'?10:0)+(pfo==='renda'&&Nn.dy?Math.min(15,Nn.dy*1.5):0)+(pfo==='cresc'&&Nn.cr5>0?Math.min(15,Nn.cr5/2):0);D.push(o)});
  D.sort(function(a,b){return b.rank-a.rank});D=D.slice(0,12);
  var H=opSnap(W.concat(M,D));
  var mk=function(o,m){o.al=opAlerts(o,H,m);return o};W=W.map(function(o){return mk(o,!!mine[o.tk])});M=M.map(function(o){return mk(o,1)});D=D.map(function(o){return mk(o,0)});
  var n=W.concat(M).reduce(function(s,o){return s+o.al.filter(function(a){return a[0]!=='at'||!mine[o.tk]}).length},0);
  OPC={k:key,r:{W:W,M:M,D:D,n:n,cand:cand.length}};return OPC.r}
function opRow(o,add){var F=o.d.cur==='USD'?usd:brl,sc=o.score,cl=sc==null?'':sc>=7?'g':sc>=4.5?'m':'l',inW=wlist().indexOf(o.tk)>=0;
  return '<div class="opr"><button type="button" class="opt" data-stk="'+esc(o.tk)+'">'+tkLogo(o.tk,o.d.cur==='USD')+'<span><b>'+esc(o.tk)+'</b><small>'+F.format(o.d.price)+(o.V?' · justo '+F.format(o.V.med):'')+(o.A.alr&&o.A.alr.length?' · ⚠ '+o.A.alr.length+(o.A.alr.length>1?' avisos':' aviso'):'')+'</small></span></button>'+
    '<span class="opn '+cl+'">'+(sc!=null?num(sc,1):'—')+'</span>'+(o.V?'<span class="num opu '+(o.V.up>=0?'gain':'loss')+'">'+(o.V.up>=0?'+':'−')+pf.format(Math.abs(o.V.up*100))+'%</span>':'<span class="opu muted">—</span>')+
    (add?'<button type="button" class="opa" data-wtog="'+esc(o.tk)+'" aria-label="'+(inW?'Parar de acompanhar ':'Acompanhar ')+esc(o.tk)+'">'+(inW?'★':'☆')+'</button>':'')+
    (o.al&&o.al.length?'<ul class="opal">'+o.al.slice(0,3).map(function(a){return '<li>'+rkLvl(a[0])+'<span><b>'+a[1]+'</b> '+a[2]+'</span></li>'}).join('')+'</ul>':'')+'</div>'}
function oppHtml(){var r=opData();if(!r)return '';
  var h='<div class="panel opp"><div class="grp"><h2>Oportunidades '+bal('O app avisa sozinho quando uma ação da sua lista ou da carteira fica abaixo do preço justo, cai muito ou melhora a nota. O Garimpo procura sozinho empresas boas e baratas na bolsa toda.')+'</h2>'+(r.n?'<span class="opb">'+r.n+' aviso'+(r.n>1?'s':'')+'</span>':'')+'</div>'+
    '<div class="seg opseg">'+[['lst','Sua lista ('+r.W.length+')'],['car','Sua carteira'],['gar','Garimpo']].map(function(x){return '<button type="button" data-opv="'+x[0]+'" aria-pressed="'+(OPV===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>';
  var cab='<div class="opr oph"><span>Ação</span><span>Nota</span><span>Potencial</span></div>';
  if(OPV==='car')h+=r.M.length?cab+r.M.map(function(o){return opRow(o,0)}).join('')+'<p class="note">Suas ações do Brasil com nota, preço justo e avisos. Abaixo do preço justo pode ser hora de aportar; acima, de esperar.</p>':'<p class="muted">Sem ações do Brasil na carteira.</p>';
  else if(OPV==='gar')h+=(r.D.length?cab+r.D.map(function(o){return opRow(o,1)}).join(''):'<p class="muted">Nenhuma empresa passou nos critérios agora.</p>')+'<p class="note">O app olhou sozinho '+r.cand+' ações com mais de R$ 2 milhões negociados por dia e separou as que têm nota boa (6 ou mais), qualidade média ou alta e preço justo pelo menos 20% acima do preço de hoje. Toque na estrela para colocar na sua lista e receber os avisos.</p>';
  else h+=r.W.length?cab+r.W.map(function(o){return opRow(o,1)}).join('')+'<p class="note">Os avisos aparecem quando a ação fica abaixo do preço justo, cai muito, ou quando a nota e o preço mudam em relação a uma semana atrás.</p>':'<p class="muted">Sua lista está vazia. Busque uma ação ali em cima e toque em Acompanhar, ou veja o Garimpo.</p>';
  return h+'<p class="note">Avisos e notas são automáticos, para estudar; não são recomendação de compra ou venda.</p></div>'}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-opv]');if(!b)return;OPV=b.getAttribute('data-opv');try{localStorage.setItem(LS+'-opv',OPV)}catch(x){}renderMkt()});
try{OPV=localStorage.getItem(LS+'-opv')||'lst'}catch(e){}

/* ===== Research: notícias das empresas e resumo da IA, feitos pelo robô (o celular só mostra) ===== */
function rsOf(tk){var r=MD.d&&MD.d.res;return r&&r.acoes&&r.acoes[tk]||null}
function rsWhen(s){if(!s)return '';var d=new Date(s);return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
var RSSN={positivo:['Positivo','g'],neutro:['Neutro','m'],negativo:['Negativo','l']},RSIM2={alto:'Alto',medio:'Médio',baixo:'Baixo'};
function rsNoAI(){var r=MD.d&&MD.d.res;return r&&!r.ia?'<p class="note">O resumo da IA aparece quando a chave do Gemini estiver guardada no GitHub (segredo <b>GEMINI_KEY</b>). As manchetes já funcionam.</p>':'<p class="note">O resumo da IA chega na próxima rodada do robô (6h17 ou 18h40).</p>'}
function rsNews(tk){var e=rsOf(tk);
  if(!e)return '<div class="panel"><p class="muted" style="margin:0">As notícias e o resumo da IA são feitos para as ações da sua carteira e da sua lista. Toque em <b>Acompanhar</b> que o robô passa a buscar essa também.</p></div>';
  var a=e.ai,h='';
  if(a){var sn=RSSN[a.sentimento]||RSSN.neutro,cf=Math.max(0,Math.min(100,+a.confianca||0));
    h+='<div class="panel anp"><div class="anh"><div><span class="lbl">Resumo da IA '+bal('A inteligência artificial lê as manchetes do último mês e os números da empresa e resume o momento dela. Feito pelo robô 2 vezes por dia. Pode errar: confira nas notícias abaixo.')+'</span><p class="anv">'+esc(a.resumo||'')+'</p></div></div>'+
      '<div class="rsg"><div><span>Tom das notícias '+bal('Se as notícias recentes são boas, neutras ou ruins para a empresa, na leitura da IA.')+'</span><b class="'+sn[1]+'">'+sn[0]+'</b></div><div><span>Confiança do mercado '+bal('De 0 a 100: quanto o mercado parece confiar na empresa agora, pelas notícias e pelos números. É uma estimativa da IA.')+'</span><b>'+cf+'<small>/100</small></b><i><em style="width:'+cf+'%"></em></i></div></div>'+
      '<p class="small muted" style="margin:10px 0 0">Feito pela IA ('+esc(e.mod||'Gemini')+') com as manchetes abaixo, em '+rsWhen(e.aiAt)+'. Pode errar: confira nas notícias.</p></div>';
    if(a.eventos&&a.eventos.length)h+='<div class="panel"><h2>O que pode mexer com a ação '+bal('Fatos das notícias que podem afetar o preço: impacto (alto, médio, baixo), se pode valorizar ou desvalorizar e se o efeito é em meses ou anos.')+'</h2><ul class="rkl">'+a.eventos.map(function(v){var dc=v.direcao==='positivo'?'ok':v.direcao==='negativo'?'al':'at';
      return '<li>'+rkLvl(dc)+'<div><b>'+esc(v.titulo||'')+'</b><div class="rstg"><span class="rsi '+(v.impacto||'')+'">Impacto '+(RSIM2[v.impacto]||esc(v.impacto||'?'))+'</span><span>'+(v.direcao==='positivo'?'pode valorizar':v.direcao==='negativo'?'pode desvalorizar':'efeito incerto')+'</span><span>'+(v.prazo==='anos'?'nos próximos anos':'nos próximos meses')+'</span></div><p>'+esc(v.porque||'')+'</p></div></li>'}).join('')+'</ul></div>';
    var lst=function(t,arr,c){return arr&&arr.length?'<div class="panel"><h2>'+t+'</h2><ul class="rkl">'+arr.map(function(x){return '<li>'+rkLvl(c)+'<div><p style="margin:0;color:var(--fg)">'+esc(x)+'</p></div></li>'}).join('')+'</ul></div>':''};
    h+=lst('Riscos',a.riscos,'al')+lst('Oportunidades',a.oportunidades,'ok')}
  else h+='<div class="panel">'+rsNoAI()+'</div>';
  var nw=e.news||[];
  h+='<div class="panel"><h2>Manchetes dos últimos 30 dias '+bal('Notícias sobre a empresa buscadas pelo robô no Google Notícias. Toque para abrir a notícia inteira.')+'</h2>'+(nw.length?'<ul class="rsn">'+nw.map(function(n){return '<li><a href="'+esc(safeUrl(n.l))+'" target="_blank" rel="noopener">'+esc(n.t)+'</a><small>'+(n.d?fmtDate(n.d):'')+(n.s?' · '+esc(n.s):'')+'</small></li>'}).join('')+'</ul>':'<p class="muted" style="margin:0">Nenhuma manchete encontrada no último mês.</p>')+
    '<p class="note">Manchetes do Google Notícias, buscadas pelo robô'+(MD.d.res.at?' em '+rsWhen(MD.d.res.at):'')+'. Tocando, abre a notícia no navegador.</p></div>';
  return h}
function rsMini(tk){var e=rsOf(tk);if(!e||!e.ai)return '';var a=e.ai,sn=RSSN[a.sentimento]||RSSN.neutro;
  return '<div class="panel rsmini"><div class="grp"><h2>O que dizem as notícias '+bal('Resumo rápido da IA sobre as notícias da empresa. Veja tudo na aba Notícias.')+'</h2><b class="'+sn[1]+'">'+sn[0]+'</b></div><p class="anv" style="margin-top:6px">'+esc(a.resumo||'')+'</p><button type="button" class="link" data-stv="news">Ver notícias e eventos</button></div>'}

/* ===== Market Overview: resumo do mercado no topo dos Índices ===== */
function mktOverview(){var it=tapeItems();if(it.length<3)return '';
  var by={};it.forEach(function(x){by[x.l]=x});
  var key=[['IBOV','Ibovespa','ibov'],['S&P 500','S&P 500','SPY'],['NASDAQ','Nasdaq','QQQ'],['DÓLAR','Dólar','usd'],['JUROS EUA 10A','Juros EUA','tnx'],['PETRÓLEO','Petróleo','brent'],['MINÉRIO','Minério','iron'],['OURO','Ouro','GLD'],['BITCOIN','Bitcoin','btc']].filter(function(k){return by[k[0]]});
  var sg=function(p){return (p>=0?'+':'−')+pf.format(Math.abs(p))+'%'};
  var st=it.filter(function(x){return x.st}).slice().sort(function(a,b){return b.p-a.p}),up=st.filter(function(x){return x.p>0}).slice(0,3),dn=st.filter(function(x){return x.p<0}).slice(-3).reverse();
  var R=compute(),dv=0,dp=0;R.held.forEach(function(x){var lv=livePx(x.p.ticker);if(!lv||lv.pct==null)return;var F=x.p.market==='US'?(R.tot.fxNow||1):1,a=x.p.qty*lv.p*F,b=a/(1+lv.pct/100);dv+=a-b;dp+=b});
  var d=MD.d&&MD.d.res&&MD.d.res.dia,a=d&&d.ai,dl=dayLbl();
  var h='<div class="panel mko"><div class="grp"><h2>Resumo do mercado '+bal('Como foi o dia na bolsa: texto da IA, variação dos principais índices, dólar, juros e commodities, quanto sua carteira mexeu e as maiores altas e quedas.')+'</h2><span class="det">'+(dl.t==='hoje'?'hoje':'último pregão')+'</span></div>';
  if(a)h+='<p class="mkot">'+esc(a.titulo||'')+'</p><p class="anv" style="margin-top:4px">'+esc(a.texto||'')+'</p>'+(a.carteira?'<p class="anv mkoc">'+esc(a.carteira)+'</p>':'');
  h+='<div class="mkog">'+key.map(function(k){var x=by[k[0]],c=Math.abs(x.p)<0.005?'':x.p>0?'gain':'loss';return '<button type="button" data-idxo="'+k[2]+'"><span>'+k[1]+'</span><b class="num '+c+'">'+sg(x.p)+'</b></button>'}).join('')+'</div>';
  if(dp)h+='<div class="mkoy"><span>Sua carteira '+(dl.t==='hoje'?'hoje':'no último pregão')+'</span><b class="num '+cls(dv)+'">'+sgn(dv)+' <small>('+sg(dv/dp*100)+')</small></b></div>';
  if(up.length||dn.length)h+='<div class="mkom"><div><span class="lbl">Maiores altas</span>'+up.map(function(x){return '<button type="button" data-stk="'+esc(x.l)+'"><b>'+esc(x.l)+'</b><span class="gain">'+sg(x.p)+'</span></button>'}).join('')+'</div><div><span class="lbl">Maiores quedas</span>'+dn.map(function(x){return '<button type="button" data-stk="'+esc(x.l)+'"><b>'+esc(x.l)+'</b><span class="loss">'+sg(x.p)+'</span></button>'}).join('')+'</div></div>';
  h+='<p class="small muted" style="margin:10px 0 0">'+(a?'Texto da IA ('+esc(d.mod||'')+') em '+rsWhen(d.at)+'. ':'')+'Números da faixa de cotações, entre as grandes empresas do Brasil e dos EUA.</p></div>';
  return h}
/* ===== Resultados trimestrais (CVM) na página da ação ===== */
function cvmQ(tk){var c=MD.d&&MD.d.cvm&&MD.d.cvm.q,q=c&&c[tk];return q?q.map(function(x){var y=x.slice();y[2]=x[2]?x[2]:null;return y}):null}
function qfmt(v){if(v==null)return '—';var a=Math.abs(v),s=v<0?'−':'';return s+'R$ '+(a>=1e9?num(a/1e9,a>=1e10?1:2)+' bi':num(a/1e6,0)+' mi')}
function qTtm(q){if(!q||q.length<8)return null;var s=function(a,i){var t=0;for(var k=0;k<4;k++){var v=a[a.length-1-i-k][3];if(v==null)return null;t+=v}return t},a=s(q,0),b=s(q,4);return a==null||b==null?null:{a:a,b:b,g:b>0?a/b-1:null}}
function qChart(q,ix,tit){var vs=q.map(function(x){return x[ix]}),ok=vs.filter(function(v){return v!=null});if(ok.length<2)return '';
  var mx=Math.max.apply(null,ok.concat([0])),mn=Math.min.apply(null,ok.concat([0])),rg=mx-mn||1,H=120,n=q.length,W=300,bw=W/n,y0=H*(mx/rg);
  var bars=q.map(function(x,i){var v=x[ix];if(v==null)return '';var hh=Math.abs(v)/rg*H,yy=v>=0?y0-hh:y0;return '<g data-slot="'+i+'"><rect x="'+(i*bw+bw*.18).toFixed(1)+'" y="'+yy.toFixed(1)+'" width="'+(bw*.64).toFixed(1)+'" height="'+Math.max(1,hh).toFixed(1)+'" rx="3" fill="'+(v<0?'var(--loss)':ix===2?'var(--c1)':'var(--c6)')+'"/></g>'}).join('');
  var tip={n:n,pts:q.map(function(x,i){var p=null;for(var j=0;j<i;j++)if(q[j][0]===x[0]-1&&q[j][1]===x[1])p=q[j];var g=p&&p[ix]&&x[ix]!=null&&p[ix]>0?x[ix]/p[ix]-1:null;return {i:i,t:x[1]+'º tri de '+x[0],r:[['',tit,qfmt(x[ix])]].concat(g!=null?[['','vs mesmo tri do ano antes',(g>=0?'+':'−')+pf.format(Math.abs(g*100))+'%',g>=0?'gain':'loss']]:[])}})};
  return '<h3 class="rkh3">'+tit+' por trimestre</h3><div class="tipc evpl qch"'+tipAttr(tip)+'><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" width="100%" height="'+H+'" role="img" aria-label="'+tit+' por trimestre"><line x1="0" x2="'+W+'" y1="'+y0.toFixed(1)+'" y2="'+y0.toFixed(1)+'" stroke="var(--line)"/>'+bars+'</svg></div>'+
    '<div class="qlb">'+q.map(function(x){return '<span>'+x[1]+'T'+String(x[0]).slice(2)+'</span>'}).join('')+'</div>'}
function qHtml(tk){var q=cvmQ(tk);if(!q||q.length<2)return '';var l=q[q.length-1],t=qTtm(q),p=null;q.forEach(function(x){if(x[0]===l[0]-1&&x[1]===l[1])p=x});
  var gl=p&&p[3]>0&&l[3]!=null?l[3]/p[3]-1:null,gr=p&&p[2]>0&&l[2]!=null?l[2]/p[2]-1:null,sg=function(g){return '<b class="'+(g>=0?'gain':'loss')+'">'+(g>=0?'+':'−')+pf.format(Math.abs(g*100))+'%</b>'};
  return '<div class="panel"><h2>Resultados trimestrais '+bal('Receita e lucro de cada trimestre, tirados dos balanços oficiais que a empresa entrega à CVM. Mostra se ela está crescendo ou piorando.')+'</h2><p class="anv" style="margin:4px 0 0">No '+l[1]+'º tri de '+l[0]+': '+(l[2]!=null?'receita de <b>'+qfmt(l[2])+'</b>'+(gr!=null?' ('+sg(gr)+' no ano)':'')+' e ':'')+'lucro de <b>'+qfmt(l[3])+'</b>'+(gl!=null?' ('+sg(gl)+' no ano)':'')+'.'+(t?' Lucro dos últimos 12 meses: <b>'+qfmt(t.a)+'</b>'+(t.g!=null?' ('+sg(t.g)+' contra os 12 meses anteriores)':'')+'.':'')+'</p>'+
    qChart(q,2,'Receita')+qChart(q,3,'Lucro')+'<p class="note">Balanços entregues à CVM (consolidado). O 4º trimestre é o ano inteiro menos os 9 primeiros meses. Toque nas barras para ver cada trimestre.</p></div>'}

var ANV='rel';try{var av0=localStorage.getItem(LS+'-anv');if(av0==='rel'||av0==='opp'||av0==='cls'||av0==='set'||av0==='cmp')ANV=av0}catch(e){}
function anSeg(){var on=0;try{var od=opData();on=od?od.n:0}catch(e){}
  return '<div class="seg anseg" id="anseg">'+[['rel','Relatório'],['opp','Oportunidades'+(on?' <i class="mkb">'+on+'</i>':'')],['cls','Classificação'],['set','Setores'],['cmp','Comparar']].map(function(v){return '<button type="button" data-anv="'+v[0]+'" aria-pressed="'+(ANV===v[0])+'">'+v[1]+'</button>'}).join('')+'</div>'}
/* Relatório da carteira (IA): aba própria, sempre aberta, com a data de quando foi escrito logo no topo; o texto de economia (macro) não aparece mais */
function rsRel(){var c=MD.d&&MD.d.res&&MD.d.res.cart;if(!c||!c.ai)return '<div class="panel"><h2>Relatório da carteira · IA</h2><p class="muted">O relatório chega com o robô, uma vez por dia. Volte em alguns minutos.</p></div>';var a=c.ai;
  var lst=function(t,arr,cl){return arr&&arr.length?'<h3 class="rkh3">'+t+'</h3><ul class="rkl">'+arr.map(function(x){return '<li>'+rkLvl(cl)+'<div><p style="margin:0;color:var(--fg)">'+esc(x)+'</p></div></li>'}).join('')+'</ul>':''};
  return '<div class="panel rscart"><div class="grp"><h2>Relatório da carteira '+bal('Uma vez por dia a IA junta as notícias das suas empresas e os números e escreve o que importa para a sua carteira: destaques, riscos e o que acompanhar.')+'</h2><span class="det">'+rsWhen(c.at)+'</span></div>'+
    '<p class="small muted" style="margin:2px 0 8px">Escrito pela IA ('+esc(c.mod||'Gemini')+') em '+rsWhen(c.at)+'. Pode errar e não é recomendação.</p>'+
    (a.titulo?'<b class="rstit">'+esc(a.titulo)+'</b>':'')+lst('Destaques',a.destaques,'ok')+lst('Riscos',a.riscos,'al')+lst('Para acompanhar',a.atencao,'at')+'</div>'}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-anv]');if(!b)return;ANV=b.getAttribute('data-anv');try{localStorage.setItem(LS+'-anv',ANV)}catch(x){}renderMkt()});
/* nomes e setores nas telas de classificação e setores */
function nomeEmp(tk){var n=(MD.d&&MD.d.cvm&&MD.d.cvm.nomes&&MD.d.cvm.nomes[tk])||(MD.d&&MD.d.hist&&MD.d.hist[tk]&&MD.d.hist[tk].name)||'';if(!n)return '';
  n=n.replace(/\s+S\.?\s?\/?\s?A\.?.*$/i,'').replace(/\s+-\s+.*$/,'');var l=n.toLowerCase().replace(/(^|[\s.])(\S)/g,function(m,a,b){return a+b.toUpperCase()});return l.replace(/\b(Do|Da|De|Dos|Das|E)\b/g,function(x){return x.toLowerCase()})}
function catSetorNome(tk){var c=MD.d&&MD.d.cat,p=c&&c.a&&c.a[tk];return p&&p[1]!=null&&c.n?(c.n[String(p[1])]||''):''}
var CLSN=20;
function cMini(l,v){return '<span>'+l+'<b>'+v+'</b></span>'}
function clsHtml(all,sc,W,mine,list){
  var pc=function(v){return v!=null?pf.format(v)+'%':'—'},n2=function(v){return v!=null?num(v,2):'—'},n1=function(v){return v!=null?num(v,1):'—'};
  var big={dy:['dy','DY',pc],qual:['dy','DY',pc],pl:['pl','P/L',n1],roe:['roe','ROE',pc],pvp:['pvp','P/VP',n2]}[sc.k]||['dy','DY',pc];
  var h='<div class="panel"><div class="grp"><h2>Classificação de ações '+bal('Lista as ações da bolsa pelo critério que você escolher (dividendos, mais baratas, mais rentáveis...). Toque numa para ver a análise.')+'</h2><span class="det">'+all.length+' ações</span></div>'+
    '<div class="cchips">'+SCRS.map(function(x){return '<button type="button" data-scr="'+x.k+'" aria-pressed="'+(x.k===sc.k)+'">'+x.n+'</button>'}).join('')+'</div>'+
    '<p class="small muted" style="margin:0 2px 12px">'+sc.d+' Só ações com mais de R$ 1 milhão negociados por dia.</p>';
  h+=list.map(function(F,i){var nm=nomeEmp(F.tk),st=catSetorNome(F.tk),bg=F[big[0]];
    return '<div class="ccd"><button type="button" class="ccm" data-stk="'+esc(F.tk)+'"><i class="ccn">'+(i+1)+'</i>'+tkLogo(F.tk,false)+'<span class="cct"><b>'+esc(F.tk)+(mine[F.tk]?' <span class="tag">sua</span>':W.indexOf(F.tk)>=0?' <span class="tag">★</span>':'')+(catNovo(F.tk)?' <span class="tag">novo</span>':'')+'</b><small>'+esc(nm)+'</small>'+(st?'<small class="sx">'+esc(st)+'</small>':'')+'</span></button>'+
      '<span class="ccv"><b>'+big[2](bg)+'</b><small>'+big[1]+'</small></span><div class="ccg">'+cMini('P/L',n1(F.pl))+cMini('P/VP',n2(F.pvp))+cMini('DY',pc(F.dy))+cMini('ROE',pc(F.roe))+'</div></div>'}).join('');
  if(!list.length)h+='<p class="muted">Nenhuma ação passou nesse critério agora.</p>';
  if(list.length>=CLSN)h+='<button type="button" class="btn ghost" data-clsm="1" style="width:100%">Mostrar mais '+CLSN+'</button>';
  return h+'<p class="note" style="margin-top:10px">Indicadores do Fundamentus, atualizados pelo robô diário. A classificação é ponto de partida para estudar, não recomendação.</p></div>'}
/* Setores da B3: cada setor com as suas ações (catálogo do robô); pouca liquidez fica escondida, a não ser que você peça */
var SETID='',CATALL=false;try{CATALL=localStorage.getItem(LS+'-catall')==='1'}catch(e){}
function medOf(a){a=a.filter(function(v){return v!=null&&isFinite(v)}).sort(function(x,y){return x-y});return a.length?a[Math.floor(a.length/2)]:null}
function setStats(t){var ds=[],pl=[];t.forEach(function(tk){var F=fundOf(tk);if(!F)return;if(F.dy>0&&F.dy<30)ds.push(F.dy);if(F.pl>0&&F.pl<200)pl.push(F.pl)});return {dy:medOf(ds),pl:medOf(pl)}}
function setRow(tk,F){var nm=nomeEmp(tk),mine=false;try{compute().held.forEach(function(x){if(x.p.ticker===tk)mine=true})}catch(e){}
  return '<button type="button" class="str" data-stk="'+esc(tk)+'">'+tkLogo(tk,false)+'<span class="cct"><b>'+esc(tk)+(mine?' <span class="tag">sua</span>':'')+(catNovo(tk)?' <span class="tag">novo</span>':'')+'</b><small>'+esc(nm)+'</small></span><span class="srm"><b>'+(F&&F.dy!=null?pf.format(F.dy)+'%':'—')+'</b><small>DY</small></span><span class="srm"><b>'+(F&&F.pl!=null?num(F.pl,1):'—')+'</b><small>P/L</small></span></button>'}
function setHtml(){
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
  if(ANV==='set')return sg0+setHtml();
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
  var el=$('mkttab');if(!el)return;var I=MKT.idx,f0=fxToday(),fxp=S.fx&&S.fx.prev&&S.fx.rate?(S.fx.rate/S.fx.prev-1)*100:null;
  var q0=$('mk-q')?$('mk-q').value:'',sel=idxSel();
  var on=0;try{var od=opData();on=od?od.n:0}catch(e){}
  var h='<div class="seg" id="mkseg">'+[['min','Minhas ações'],['idx','Índices'],['ana','Análise'+(on?' <i class="mkb">'+on+'</i>':'')]].map(function(v){return '<button type="button" data-mkv="'+v[0]+'" aria-pressed="'+(MKV===v[0])+'">'+v[1]+'</button>'}).join('')+'</div>';
  h+='<div class="srch"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="mk-q" type="search" placeholder="'+(MKV==='idx'?'Buscar índice ou moeda':MKV==='ana'?'Buscar ação para analisar':'Buscar ação para ver ou acompanhar')+'" autocomplete="off" value="'+esc(q0)+'"></div><div id="mk-res" class="panel mkrp" hidden></div>';
  if(MKV==='idx'){
  try{h+=mktOverview()}catch(e){}
  h+='<div class="panel"><div class="grp"><h2>Índices</h2><span style="display:flex;gap:10px;align-items:center"><span class="det">'+(MKT.busy?'atualizando...':MKT.at?'às '+new Date(MKT.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'')+'</span><button type="button" class="link" data-mked="1">'+(MKED?'Pronto':'Editar')+'</button></span></div>'+
    (sel.length?'<div class="idxg'+(MKED?' ed':'')+'">'+sel.map(function(k){var x=idxDef(k),o=idxVal(x);
      return '<div class="idx"'+(MKED?'':' data-idxo="'+k+'" role="button" tabindex="0"')+'>'+(MKED?'<button type="button" class="idxx" data-idxt="'+k+'" aria-label="Remover '+esc(x.n)+'">✕</button>':'')+'<small>'+esc(x.n)+'</small><b>'+(o&&isFinite(o.v)?idxFmt(x,o.v):'—')+'</b>'+(o&&isFinite(o.p)?'<span class="num '+cls(o.p)+'">'+(o.p>=0?'+':'−')+pf.format(Math.abs(o.p))+'%</span>':'<span class="small muted">'+(o&&o.sub?esc(o.sub):'sem dado')+'</span>')+'</div>'}).join('')+'</div>':'<p class="muted small">Nenhum índice escolhido. Use a busca acima para adicionar.</p>')+
    (MKED?'<p class="note">Toque no ✕ para tirar. Para colocar outro, procure na busca acima.</p>':'')+'</div>';
  h+='<p class="note exp" style="margin:0 4px">Ibovespa e IFIX vêm do brapi, S&P 500 e Nasdaq do Finnhub (pelos ETFs SPY e QQQ), dólar, euro e bitcoin da AwesomeAPI, CDI do Banco Central. Toque numa ação para ver gráfico e indicadores. A lista de acompanhamento fica salva na nuvem.</p>';
  }else if(MKV==='ana'){h+=anaHtml()}else{h+=mineHtml();
  var W=wlist();
  h+='<div class="panel"><div class="grp"><h2>Acompanhando</h2><span class="det">'+W.length+' ações</span></div>'+
    (W.length?'<ul class="wl">'+W.map(function(tk){var q=MKT.q[tk];return '<li><button type="button" class="wtk" data-stk="'+esc(tk)+'"><b>'+esc(tk)+'</b><small>'+(function(){var F=fundOf(tk);return F?'P/L '+(F.pl!=null?num(F.pl,1):'—')+' · P/VP '+(F.pvp!=null?num(F.pvp,2):'—')+' · DY '+(F.dy!=null?pf.format(F.dy)+'%':'—'):esc(q&&q.name||(isBR(tk)?'Brasil':'EUA'))})()+'</small></button><span class="wpx">'+(q?'<span>'+(q.cur==='USD'?usd:brl).format(q.price)+'</span><span class="num small '+cls(q.pct)+'">'+(q.pct>=0?'+':'−')+pf.format(Math.abs(q.pct||0))+'%</span>':'<span class="muted">—</span>')+'</span><button type="button" class="wx" data-wdel="'+esc(tk)+'" aria-label="Parar de acompanhar '+esc(tk)+'">✕</button></li>'}).join('')+'</ul>':'<p class="muted small">Adicione ações que você quer vigiar, mesmo sem ter. Ex.: PETR4, VALE3, WEGE3, AAPL.</p>')+
    '<form class="wadd" id="wadd"><input id="w-tk" placeholder="Código da ação" maxlength="12" autocomplete="off"><button class="btn" type="submit">Adicionar</button></form>'+
    (MKT.err?'<p class="warn" style="margin-top:8px">'+esc(MKT.err)+'</p>':'')+'</div>';
  }
  el.innerHTML=h;
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
function stkOpen(tk){STK={tk:tk,rng:STK.rng||'1y',d:null,busy:false,err:''};$('stk').hidden=false;document.body.style.overflow='hidden';$('stk-h').textContent=tk;stkLoad()}
/* página de um índice (dados do robô diário: Yahoo para bolsas e moedas, Banco Central para CDI e IPCA) */
function idxOpen(k){var x=idxDef(k);STK={tk:'',idx:k,rng:STK.rng&&STK.rng!=='2y'?STK.rng:'1y',d:null};$('stk').hidden=false;document.body.style.overflow='hidden';$('stk-h').textContent=x?x.n:k;idxRender();if(!MD.d||!MD.d.idx)loadMD(true)}
function idxRender(){
  var b=$('stk-b'),k=STK.idx,x=idxDef(k),D=MD.d&&MD.d.idx&&MD.d.idx[k],rg=STK.rng;if(!b||!x)return;
  var rate=x.src==='cdi'||x.src==='ipca'||x.src==='selic'||x.k==='tnx',sym=D&&D.sym||'',same=!D||x.src==='usd'||x.src==='fx'||sym===x.s||sym===x.s+'.SA';
  var fmt=rate?function(v){return pf.format(v)+'%'}:same?function(v){return idxFmt(x,v)}:sym.charAt(0)==='^'?function(v){return num(v,0)+' pts'}:function(v){return usd.format(v)};
  if(!D||!D.d||D.d.length<2){b.innerHTML='<p class="muted">'+(MD.busy?'Buscando o histórico...':'O histórico de '+esc(x.n)+' chega com o robô diário. Volte em alguns minutos.')+'</p>';return}
  if(rate&&rg==='yr')rg=STK.rng='1y';
  var days={'1mo':31,'3mo':93,'6mo':183,'1y':366,'ytd':366,'2y':731}[rg],src=rg==='5y'||rg==='max'||rg==='yr'||rg==='2y'||(k==='ipca'&&rg!=='1mo')?(D.w||D.d):D.d,t0=days?Date.now()/864e5-days:0;
  var hist=src.filter(function(p){return p[0]>=t0}).map(function(p){return {t:p[0]*864e5,c:p[1]}});
  var o=idxVal(x),last=same&&o&&isFinite(o.v)?o.v:D.last,dp=o&&isFinite(o.p)?o.p:null;
  if(!rate&&same&&o&&isFinite(o.v)&&hist.length)hist.push({t:Date.now(),c:o.v});
  var ch=hist.length>1?(rate?hist[hist.length-1].c-hist[0].c:hist[hist.length-1].c/hist[0].c-1):null;
  var y1=(D.d||[]).map(function(p){return p[1]}),hi=Math.max.apply(null,y1),lo=Math.min.apply(null,y1);
  var at=function(daysAgo){var t=Date.now()/864e5-daysAgo,a=(daysAgo>370?D.w:D.d)||[];for(var i=a.length-1;i>=0;i--)if(a[i][0]<=t)return a[i][1];return null};
  var v1=at(365),v5=at(1790),chg=function(a){return a==null||!last?'—':((last/a-1)>=0?'+':'−')+pf.format(Math.abs((last/a-1)*100))+'%'};
  var fv=finView(sym,rg),fo=null,fmsg='';if(fv){if(fv.st==='ok'){hist=fv.hist;fo=fv.o}else{fmsg=fv.msg;hist=rg==='5d'?hist.slice(-6):[]}}
  hist=rgCut(hist,STK.rng);ch=hist.length>1?(rate?hist[hist.length-1].c-hist[0].c:hist[hist.length-1].c/((fo&&fo.prev)||hist[0].c)-1):null;
  var pAbs=ch==null?null:rate?ch:hist[hist.length-1].c-((fo&&fo.prev)||hist[0].c),pPct=ch==null?null:rate?(hist[0].c?ch/hist[0].c*100:null):ch*100,per=rg==='yr'||ch==null?'1d':rg;
  if(ch==null||rg==='yr'){pPct=dp;pAbs=dp!=null&&last!=null?last-last/(1+dp/100):null}
  var st=finStat(rate?'':sym),h='<div class="gcard">'+gHead(x.t,'',last!=null?fmt(last):'—',pAbs,pPct,per,'',o&&o.at?gWhen(o.at):(MD.d&&MD.d.at?gWhen(MD.d.at):''))+
    rngBar(rg,rate?['yr','max']:[])+((rg==='yr'&&!rate)?annHtml(annRets(hist,null)):(fmsg?'<p class="muted small" style="margin:12px 0">'+esc(fmsg)+(rg==='5d'?' Por enquanto, os fechamentos dos últimos dias.':'')+'</p>':'')+(fmsg&&rg!=='5d'?'':lineChart(hist,'BRL',null,fmt,fo)))+(rate?'':gStats([['Abertura',st&&st.o!=null?pf.format(st.o):null],['Alta',st&&st.h!=null?pf.format(st.h):null],['Baixa',st&&st.l!=null?pf.format(st.l):null],['Fech. ant.',st&&st.prev!=null?pf.format(st.prev):null],['Alt 52 sem',pf.format(hi)],['Bai 52 sem',pf.format(lo)]]))+'</div>';
  var rows=rate?[['Agora',last!=null?fmt(last):'—'],['Há 1 ano',v1!=null?fmt(v1):'—'],['Há 5 anos',v5!=null?fmt(v5):'—'],['Máxima (1 ano)',fmt(hi)],['Mínima (1 ano)',fmt(lo)]]
    .concat(k==='cdi'&&D.acc12!=null?[['Rendeu em 12 meses',pf.format(D.acc12)+'%']]:[]).concat(k==='ipca'&&D.mes!=null?[['Último mês',pf.format(D.mes)+'%']]:[])
    :[['Em 12 meses',chg(v1)],['Em 5 anos',chg(v5)],['Máxima (1 ano)',fmt(hi)],['Mínima (1 ano)',fmt(lo)],['Distância da máxima',last&&hi?'−'+pf.format(Math.abs((last/hi-1)*100))+'%':'—']];
  h+='<h3 style="margin:18px 0 6px">Resumo</h3><div class="kpis">'+rows.map(function(r){return '<div><span>'+r[0]+'</span><b>'+r[1]+'</b></div>'}).join('')+'</div>'+
    '<p class="note">'+(rate?(k==='cdi'?'CDI em % ao ano, do Banco Central. É o juro que os bancos cobram entre si e fica sempre um pouco abaixo da Selic; é ele que rende CDB, LCI e LCA.':k==='selic'?'Selic meta em % ao ano, do Banco Central. É a taxa básica de juros, definida pelo Copom a cada 45 dias; o CDI anda colado nela, uns 0,10 ponto abaixo.':'IPCA acumulado em 12 meses, do Banco Central (IBGE).'):(same?'Histórico do Yahoo Finance'+(sym?' ('+esc(sym)+')':'')+', atualizado pelo robô diário; o valor de agora vem das APIs do app.':'Gráfico do próprio índice ('+esc(sym)+', Yahoo Finance) pelo fechamento mais recente; a variação de hoje vem do '+esc(x.s)+', que acompanha o índice.'))+'</p>';
  b.innerHTML=h;
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
