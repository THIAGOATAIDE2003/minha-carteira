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
 {k:'ipca',n:'IPCA (12 meses)',t:'Inflação oficial',src:'ipca',f:'pct'},
 /* bolsas da Europa: valor de agora vem do servidor de cotações (FUT.d), histórico do robô */
 {k:'^FTSE',n:'Inglaterra (FTSE 100)',t:'Bolsa de Londres',src:'fut',s:'^FTSE',f:'pts'},
 {k:'^FCHI',n:'França (CAC 40)',t:'Bolsa de Paris',src:'fut',s:'^FCHI',f:'pts'},
 {k:'^GDAXI',n:'Alemanha (DAX)',t:'Bolsa de Frankfurt',src:'fut',s:'^GDAXI',f:'pts'},
 {k:'^IBEX',n:'Espanha (IBEX 35)',t:'Bolsa de Madri',src:'fut',s:'^IBEX',f:'pts'},
 {k:'FTSEMIB.MI',n:'Itália (FTSE MIB)',t:'Bolsa de Milão',src:'fut',s:'FTSEMIB.MI',f:'pts'}];
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
function idxVal(x){var r=idxVal0(x);if(r&&r.p!=null&&idxFechado(x))return {v:r.v,p:0,sub:r.sub};if(r&&r.p!=null&&IDZ[x.k]!=null&&dzero(!!IDZ[x.k],MKT.at))return {v:r.v,p:0,sub:r.sub};return r}
function idxVal0(x){var I=MKT.idx;
  if(x.k==='ibov'||x.k==='eur'){var tv=tapeIdx(x.k==='ibov'?'IBOV':'EURO');if(tv&&(!I[x.k]||MKT.at<tv.at))return {v:tv.v,p:tv.p}}
  if(x.src==='cmd'){var tv=x.tp&&tapeIdx(x.tp),D0=MD.d&&MD.d.idx&&MD.d.idx[x.k];if(tv)return {v:tv.v,p:tv.p,sub:'robô, a cada 15 min no pregão'};if(D0&&D0.d&&D0.d.length>1){var l0=D0.d[D0.d.length-1][1],l1=D0.d[D0.d.length-2][1];return {v:l0,p:(l0/l1-1)*100,sub:'último fechamento'}}return null}
  if(x.src==='fut'){var q=FUT.d&&FUT.d[x.s];if(q&&q.p>0)return {v:q.p,p:q.prev>0?(q.p/q.prev-1)*100:null,sub:futEstado(q)};var D1=MD.d&&MD.d.idx&&MD.d.idx[x.k];if(D1&&D1.d&&D1.d.length>1){var m0=D1.d[D1.d.length-1][1],m1=D1.d[D1.d.length-2][1];return {v:m0,p:(m0/m1-1)*100,sub:'último fechamento'}}return null}
  if(x.src==='usd'){var f0=fxToday();return f0?{v:f0.rate,p:S.fx&&S.fx.prev&&S.fx.rate?(S.fx.rate/S.fx.prev-1)*100:null}:null}
  if(x.src==='cdi')return CDI.dates.length?{v:(Math.pow(1+CDI.s[CDI.dates[CDI.dates.length-1]]/100,252)-1)*100,sub:'Banco Central'}:null;
  if(x.src==='selic'){if(I.selic)return {v:I.selic.v,sub:'Copom'};var Ds=MD.d&&MD.d.idx&&MD.d.idx.selic;return Ds&&Ds.last?{v:Ds.last,sub:'Copom'}:null}
  if(x.src==='ipca')return I.ipca?{v:I.ipca.v,sub:'até '+String(I.ipca.m||'').slice(3)}:null;
  return I[x.k]||null}
function idxFmt(x,v){return x.f==='pts'?num(v,0)+' pts':x.f==='usd'?usd.format(v):x.f==='fx'?'R$ '+v.toFixed(4).replace('.',','):x.f==='pct'?pf.format(v)+'%':brl.format(v)}
/* sugestões de ações: por sigla (começa com), por nome da empresa (palavras que começam com o que foi digitado) e por apelido (magalu) */
function mkNorm(x){return String(x||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
function mkSug(q,max){var f=MD.d&&MD.d.fund&&MD.d.fund.d;if(!f)return [];var nq=mkNorm(q),tq=nq.replace(/ /g,'').toUpperCase();if(!nq)return [];var toks=nq.split(' ').filter(Boolean),sc={},liq=function(tk){var x=fundOf(tk);return x&&x.liq2m||0};
  var put=function(tk,v){if(sc[tk]==null||v>sc[tk])sc[tk]=v};
  var al=typeof ASAL!=='undefined'?ASAL:{};Object.keys(al).forEach(function(k){var kn=mkNorm(k);if(kn.indexOf(nq)===0||(nq.length>=3&&kn.indexOf(nq)>=0))put(al[k],kn===nq?95:85)});
  Object.keys(f).forEach(function(tk){
    if(tk===tq)put(tk,100);else if(tq&&tk.indexOf(tq)===0)put(tk,80);
    var n=mkNorm(nomeEmp(tk)+' '+((MD.d.cvm&&MD.d.cvm.nomes&&MD.d.cvm.nomes[tk])||'')),w=n.split(' ');
    if(n&&toks.every(function(t){return w.some(function(x){return x.indexOf(t)===0})}))put(tk,60);
    else if(nq.length>=3&&n.indexOf(nq)>=0)put(tk,40)});
  var seen={},o=[];Object.keys(sc).sort(function(a,b){return sc[b]-sc[a]||liq(b)-liq(a)||(a<b?-1:1)}).forEach(function(tk){var k=tk.slice(0,4)+(sc[tk]>=80?tk:'');if(seen[k]&&sc[tk]<80)return;seen[k]=1;o.push(tk)});
  return o.slice(0,max||8)}
function mkSugRow(x){var iw=wlist().indexOf(x)>=0,nm=nomeEmp(x),sub=fundSub(x);
  return '<li><span><b>'+esc(x)+(nm?' <span style="font-weight:400;color:var(--muted)">· '+esc(nm)+'</span>':'')+'</b><small>'+(sub||'Ação ou ETF')+'</small></span><span style="display:flex;gap:6px"><button type="button" class="btn small ghost" data-stk="'+esc(x)+'">Ver</button><button type="button" class="btn small'+(iw?' ghost':'')+'" data-wtog="'+esc(x)+'">'+(iw?'Remover':'Acompanhar')+'</button></span></li>'}
function mkSearch(q){
  var el=$('mk-res');if(!el)return;q=String(q||'').trim();if(!q){setHtml(el,'');el.hidden=true;return}
  var nq=q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),sel=idxSel();
  var hits=MKV!=='idx'?[]:IDX.filter(function(x){return (x.n+' '+x.t+' '+(x.s||'')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').indexOf(nq)>=0});
  var h=hits.map(function(x){var on=sel.indexOf(x.k)>=0;return '<li><span><b>'+esc(x.n)+'</b><small>'+esc(x.t)+'</small></span><button type="button" class="btn small'+(on?' ghost':'')+'" data-idxt="'+x.k+'">'+(on?'Remover':'Adicionar')+'</button></li>'}).join('');
  var tk=q.toUpperCase().replace(/[^A-Z0-9]/g,''),sg=mkSug(q,hits.length?4:8);
  sg.forEach(function(x){h+=mkSugRow(x)});
  if(/^[A-Z0-9]{2,7}$/.test(tk)&&sg.indexOf(tk)<0&&(MKV!=='idx'?(/\d/.test(tk)||!sg.length):!hits.length&&!sg.length)){var inW=wlist().indexOf(tk)>=0,F=fundOf(tk);
    h+='<li><span><b>'+esc(tk)+'</b><small>'+(F?'Ação do Brasil · P/L '+(F.pl!=null?num(F.pl,1):'—')+' · DY '+(F.dy!=null?pf.format(F.dy)+'%':'—'):'Ação ou ETF')+'</small></span><span style="display:flex;gap:6px"><button type="button" class="btn small ghost" data-stk="'+esc(tk)+'">Ver</button><button type="button" class="btn small'+(inW?' ghost':'')+'" data-wtog="'+esc(tk)+'">'+(inW?'Remover':'Acompanhar')+'</button></span></li>'}
  setHtml(el,h?'<ul class="mkres">'+h+'</ul>':'<p class="muted small" style="padding:8px 2px">Nada encontrado.</p>');el.hidden=false}
function idxCard(lbl,o,fmt){return '<div class="idx"><small>'+lbl+'</small><b>'+(o&&isFinite(o.v)?fmt(o.v):'—')+'</b>'+(o&&isFinite(o.p)?'<span class="num '+cls(o.p)+'">'+sg0(o.p)+pf.format(Math.abs(o.p))+'%</span>':'<span class="small muted">sem dado</span>')+'</div>'}
/* Mercado em 3 partes: Minhas ações, Índices e Análise */
var MKV='min',SCR='dy',CMP=null;
try{var mv0=localStorage.getItem(LS+'-mkv');if(mv0==='min'||mv0==='idx'||mv0==='ana'||mv0==='bc')MKV=mv0}catch(e){}
function tkRow(tk,us,sub){var lv=livePx(tk),q=MKT.q[tk],p=lv?lv.p:q&&q.price,pc=lv&&lv.pct!=null?lv.pct:q&&q.pct,F=us?usd:brl;
  return '<li><button type="button" class="wtk wtk2" data-stk="'+esc(tk)+'">'+tkLogo(tk,us)+'<span class="an"><b>'+esc(tk)+'</b><small>'+sub+'</small></span></button><span class="wpx">'+(p?'<span>'+F.format(p)+'</span><span class="num small '+cls(pc||0)+'">'+(pc!=null?sg0(pc)+pf.format(Math.abs(pc))+'%':'')+'</span>':'<span class="muted">—</span>')+'</span>'}
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
