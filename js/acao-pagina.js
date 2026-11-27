/* Aporte · js/acao-pagina.js — continuação do antigo acao.js (parte 3 de 3). Mesmo escopo global; a ordem de carga importa. */
function stkUSk(tk,x){if(STK.tk!==tk||!STK.d)return;var pc=function(v){return v==null?null:v/100},K=STK.d.k;
  K.pl=pickNum(x,['peTTM','peBasicExclExtraTTM']);K.lpa=pickNum(x,['epsTTM','epsBasicExclExtraItemsTTM']);K.mc=x.marketCapitalization?x.marketCapitalization*1e6:null;K.pvp=pickNum(x,['pbQuarterly','pbAnnual']);
  K.dy=pc(pickNum(x,['currentDividendYieldTTM','dividendYieldIndicatedAnnual']));K.roe=pc(pickNum(x,['roeTTM','roeRfy']));K.ml=pc(pickNum(x,['netProfitMarginTTM']));K.div=pickNum(x,['totalDebt/totalEquityQuarterly','totalDebt/totalEquityAnnual']);stkRender()}
function avHist(tk,rg){var fn=rg==='1mo'||rg==='3mo'?'TIME_SERIES_DAILY':'TIME_SERIES_WEEKLY',ck=LS+'-av-'+fn+'-'+tk;
  try{var c=JSON.parse(localStorage.getItem(ck)||'null');if(c&&Date.now()-c.at<20*3600000)return Promise.resolve(cut(c.h))}catch(e){}
  function cut(h){var days={'1mo':31,'3mo':93,'6mo':183,'1y':366,'5y':1830}[rg]||366,t0=Date.now()-days*864e5;return h.filter(function(p){return p.t>=t0})}
  return getJSON('https://www.alphavantage.co/query?function='+fn+'&symbol='+encodeURIComponent(tk)+'&apikey='+encodeURIComponent(S.keys.av)).then(function(j){
    var ser=j&&(j['Time Series (Daily)']||j['Weekly Time Series']);if(!ser)throw new Error('0');
    var h=Object.keys(ser).sort().map(function(dt){return {t:Date.parse(dt),c:parseFloat(ser[dt]['4. close'])}});try{localStorage.setItem(ck,JSON.stringify({at:Date.now(),h:h}))}catch(e){}return cut(h)})}
/* Classes da empresa (ON, PN, Unit): as outras ações da mesma empresa lado a lado, com preço de cada uma */
var SIBC={},SIBT={3:'ON',4:'PN',5:'PNA',6:'PNB',7:'PNC',8:'PND',11:'Unit'};
function sibList(tk){var nm=MD.d&&MD.d.cvm&&MD.d.cvm.nomes,f=MD.d&&MD.d.fund&&MD.d.fund.d;if(!nm||!nm[tk]||!f)return [];
  return Object.keys(nm).filter(function(t){return nm[t]===nm[tk]&&f[t]&&isBR(t)}).sort(function(a,b){return (parseInt(a.slice(4))||0)-(parseInt(b.slice(4))||0)})}
function sibLoad(l,tk){var u=pxBase(),c=SIBC[tk];if(!u||(c&&(c.busy||Date.now()-c.at<60000)))return;
  SIBC[tk]={d:c&&c.d,at:Date.now(),busy:1};getJSON(u+'/q?s='+encodeURIComponent(l.map(ySym).join(','))).then(function(j){SIBC[tk]={d:j||{},at:Date.now()};try{if(STK.tk===tk)stkRender()}catch(e){}}).catch(function(){SIBC[tk]={d:c&&c.d,at:Date.now()}})}
function sibHtml(tk){var l=sibList(tk);if(l.length<2)return '';sibLoad(l,tk);var q=(SIBC[tk]&&SIBC[tk].d)||{};
  return '<div class="panel sibp"><h2>Classes da empresa</h2><div class="sibs">'+l.map(function(t){var f=fundOf(t)||{},s=q[ySym(t)],lv=livePx(t),p=s&&s.p>0?s.p:lv?lv.p:f.cot,pc=null;
      if(t===tk&&lv&&lv.pct!=null)pc=lv.pct;else if(s&&s.p>0&&s.prev>0)pc=dzero(false,(s.t||0)*1000)?0:(s.p/s.prev-1)*100;
      var sx=parseInt(t.slice(4)),ty=SIBT[sx]||('final '+sx);
      return '<button type="button" class="sib'+(t===tk?' on':'')+'" data-stk="'+esc(t)+'"><b>'+esc(t)+'</b><small>'+ty+'</small><span class="num">'+(p>0?brl.format(p):'—')+'</span>'+(pc!=null?'<em class="num '+cls(pc)+'">'+sg0(pc)+pf.format(Math.abs(pc))+'%</em>':'<em class="muted">&nbsp;</em>')+'<small>'+(f.dy!=null&&f.dy>0?'DY '+pf.format(f.dy)+'%':'sem DY')+'</small></button>'}).join('')+'</div></div>'}
function stkRender(){if(typeof THE!=='undefined'&&THE&&STK.tk===THE&&STV==='tese'){var ae=document.activeElement;if(ae&&ae.id&&ae.id.indexOf('th-')===0)return}if(STK.tk&&STK.d&&!STK.idx&&STK.tk.charAt(0)!=='^'){var lv0=livePx(STK.tk);if(lv0){STK.d.price=lv0.p;if(lv0.pct!=null)STK.d.pct=lv0.pr!=null?lv0.pr:lv0.pct}}
  var b=$('stk-b');if(!b||$('stk').hidden)return;var d=STK.d,tk=STK.tk;
  if(!d){setHtml(b,STK.err?'<p class="warn">'+esc(STK.err)+'</p><button type="button" class="btn ghost" style="margin-top:12px" data-rng="'+STK.rng+'">Tentar de novo</button>':'<p class="muted">Carregando '+esc(tk)+'...</p>');return}
  var F=d.cur==='USD'?usd:brl,K=d.k||{},R=compute(),mine=R.held.filter(function(x){return x.p.ticker===tk})[0],pm=mine?mine.p.cN/mine.p.qty:null;
  var W=wlist(),inW=W.indexOf(tk)>=0;
  var pc=function(v){return v==null?'—':pf.format(v*100)+'%'},nm=function(v,dd){return v==null?'—':num(v,dd==null?2:dd)};
  var big=function(v){return v==null?'—':(d.cur==='USD'?'US$ ':'R$ ')+(v>=1e9?num(v/1e9,1)+' bi':num(v/1e6,0)+' mi')};
  var dyC=K.dy!=null?K.dy:(K.d12&&d.price?K.d12/d.price:null),pvp=K.pvp!=null?K.pvp:(K.vpa&&d.price?d.price/K.vpa:null);
  var hs=rgCut(d.hist,STK.rng),fv=finView(ySym(tk),STK.rng,true),fo=null,fmsg='',fat=0;if(fv){if(fv.st==='ok'){hs=fv.hist;fo=fv.o;fat=fv.at||0;var lq=livePx(tk);hs=finTail(hs,d.price,Math.max(lq&&lq.at||0,d.at||0),fo);if(STK.rng==='1d'&&fo&&fo.intra&&d.price>0){for(var ix=hs.length-1;ix>=0&&hs[ix].x;ix--);if(ix>=0&&hs[ix].c!==d.price&&Math.abs(d.price/hs[ix].c-1)<0.01){hs=hs.slice();hs[ix]={t:hs[ix].t,c:d.price}}}}else{fmsg=fv.msg;hs=STK.rng==='5d'?d.hist.slice(-6):[]}}
  if(pdAuto(fv,STK.rng))return stkRender();
  var ch=hs.length>1?finLast(hs)/((fo&&fo.prev)||finBase(hs))-1:null,lv1=livePx(tk),zd,prv=d.pct!=null?d.price/(1+d.pct/100):null,
    zd=tk.charAt(0)!=='^'&&dzero(!isBR(tk),Math.max(lv1&&lv1.at||0,d.at||0)),perPct=STK.rng==='yr'?(zd?0:d.pct):ch!=null?ch*100:(zd?0:d.pct),perAbs=STK.rng==='yr'||ch==null?(prv!=null?(zd?0:d.price-prv):null):finLast(hs)-((fo&&fo.prev)||finBase(hs)),perRg=STK.rng==='yr'||ch==null?'1d':STK.rng;
  var vd=vdPagAcao(tk,STK.rng,fv,fo,d.price);if(vd){perPct=vd.pct;perAbs=vd.abs;fo=vd.fo;perRg='1d'}
  var st=finStat(ySym(tk)),h='<div class="gcard">'+(lv1&&lv1.sus?'<p class="warn" style="margin:0 0 8px">Confira esse preço: '+esc(lv1.sus)+'. Pode estar errado ou atrasado.</p>':'')+vdPon(vd,gHead(d.name,d.sector||(function(){try{return sobSetor(tk)}catch(e){return ''}})(),F.format(d.price),perAbs,perPct,pdRg(perRg,fv,STK.rng),'',(lv1&&lv1.at?pxLinha(lv1):gWhen(fat||d.at,tk)),lv1&&lv1.at?bal(pxWhy(lv1),null,'De onde vem este preço'):''))+whyHtml(tk,lv1?lv1.pct:(zd?0:d.pct),tk)+(d.cur==='USD'?extHtml(tk):'')+
    rngBar(STK.rng,d.fast?[]:['max'])+pdNota()+
    (STK.busy?'<p class="muted small">Atualizando...</p>':'')+(d.rgGot!==undefined&&d.rgGot!==rgEff()&&STK.rng!=='yr'&&STK.rng!=='1d'&&STK.rng!=='5d'&&STK.rng!=='max'?'<p class="note" style="margin:0 0 6px">O plano grátis do brapi '+(d.rgGot?'só liberou até '+({'1mo':'1 mês','3mo':'3 meses','6mo':'6 meses','1y':'1 ano'}[d.rgGot]||d.rgGot)+' de gráfico':'não liberou o gráfico')+' para essa ação.</p>':'')+(STK.rng==='yr'?annHtml(annRets(d.hist,d.price)):(fmsg?'<p class="muted small" style="margin:12px 0'+pdMin(fv)+'">'+esc(fmsg)+(STK.rng==='5d'?' Por enquanto, os fechamentos dos últimos dias.':'')+'</p>':'')+(fmsg&&STK.rng!=='5d'?'':lineChart(hs,d.cur,pm,null,fo)));

  var f0=function(v){return v!=null?pf.format(v):null},op=st?st.o:d.o,hh=st?st.h:d.h,ll=st?st.l:d.l;
  h+=gStats([['Abertura',f0(op)],['Alta',f0(hh)],['Baixa',f0(ll)],['Fech. ant.',vd?f0(vd.ant):f0(st&&st.prev!=null?st.prev:prv)],['Alt 52 sem',f0(K.hi)],['Bai 52 sem',f0(K.lo)]])+(tk.charAt(0)!=='^'?'<button type="button" class="gan" data-gan="1">Analisar '+esc(tk)+' ›</button>':'')+'</div>';
  h+=(tk.charAt(0)!=='^'&&d.cur!=='USD'?sibHtml(tk):'')+'<div class="seg stseg" id="stv-top">'+[['res','Resumo'],['val','Preço justo'],['ind','Indicadores'],['tri','Resultados'],['tese','Tese'],['div','Dividendos'],['sob','Sobre'],['rec','Receita'],['news','Notícias']].map(function(x){return '<button type="button" data-stv="'+x[0]+'" aria-pressed="'+(STV===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>';
  var PE=d.cur==='USD'?null:anPeers(tk),sm=function(k,f){return PE&&PE[k]!=null?' <small class="ksec">setor '+f(PE[k])+'</small>':''},sp=function(v){return pf.format(v)+'%'},sn=function(v){return num(v,1)};
  if(STV==='val')h+=anVal(tk,d);
  else if(STV==='news')h+=rsNews(tk);
  else if(STV==='tese')h+=thHtml(tk,d);
  else if(STV==='tri')h+=resHtml(tk,d);
  else if(STV==='div')h+=emDiv(tk,d,mine,K,pm);
  else if(STV==='sob')h+=emSobre(tk,d);
  else if(STV==='rec')h+=emRec(tk,d);
  else if(STV==='ind'){
  h+='<div class="kpis" style="margin-top:6px">'+
    [['P/L',nm(K.pl),sm('pl',sn)],['P/VP',nm(pvp),sm('pvp',function(v){return num(v,2)})],['Dividendos (DY)',pc(dyC),sm('dy',sp)],['ROE',pc(K.roe),sm('roe',sp)],['LPA',K.lpa==null?'—':F.format(K.lpa)],['Margem líquida',pc(K.ml),sm('ml',sp)],['Máx. 52 sem.',K.hi==null?'—':F.format(K.hi)],['Mín. 52 sem.',K.lo==null?'—':F.format(K.lo)],['Valor de mercado',big(K.mc)],['EV/EBITDA',nm(K.evebitda),sm('evebitda',sn)],['Dívida/PL',K.div==null?'—':(K.div>5?num(K.div,0)+'%':nm(K.div)),sm('divpl',function(v){return num(v,2)})],['ROIC',pc(K.roic),sm('roic',sp)],['Liquidez corrente',nm(K.lc)],['Receita 5 anos',pc(K.cr5)]].filter(function(r){return r[1]!=='—'||['P/L','P/VP','Dividendos (DY)','ROE'].indexOf(r[0])>=0})
      .map(function(r){return '<div><span>'+r[0]+'</span><b>'+r[1]+(r[2]||'')+'</b></div>'}).join('')+'</div>'+
    (PE&&PE.n?'<p class="note">"Setor" é a mediana de '+PE.n+' empresas do setor '+esc(String(PE.name).toLowerCase())+'.</p>':'')+
    (!d.mods?'<p class="note">Indicadores ainda não disponíveis para essa ação. Eles chegam com o robô diário (até a próxima atualização).</p>':'');
  }else{
  h+=anResumo(tk,d)+rsMini(tk);
  if(mine)h+='<div class="panel"><h2>Sua posição</h2><ul class="calc" style="margin-top:8px"><li><span>'+num(mine.p.qty,4)+(mine.p.market==='US'?' cotas':' ações')+' a '+F.format(pm)+' (preço médio)</span><span class="num '+cls(d.price-pm)+'">'+(d.price>=pm?'+':'−')+pf.format(Math.abs((d.price/pm-1)*100))+'%</span></li></ul></div>';
  if(d.divs&&d.divs.length)h+='<h3 style="margin:18px 0 6px">Últimos proventos'+(K.d12&&d.price?' <span class="muted small">('+F.format(K.d12)+' por ação em 12 meses)</span>':'')+'</h3><ul class="calc small">'+d.divs.slice(0,8).map(function(c){return '<li><span>'+esc(String(c.label||'').replace('JUROS SOBRE CAPITAL PRÓPRIO','JCP'))+' <span class="muted">'+(c.exDate?'data ex '+fmtDate(c.exDate):c.paymentDate?'pago em '+fmtDate(String(c.paymentDate).slice(0,10)):'a definir')+'</span></span><span class="num">'+(d.cur==='USD'?'US$ ':'R$ ')+num(+c.rate,4)+'</span></li>'}).join('')+'</ul>';
  }
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 6px"><button type="button" class="btn ghost" data-wtog="'+esc(tk)+'">'+(inW?'Parar de acompanhar':'Acompanhar')+'</button>'+'</div>'+
    '<p class="note">'+(d.fast?'Gráfico e proventos do Yahoo'+(d.cur==='USD'?', indicadores do Finnhub':', indicadores do Fundamentus')+', atualizados pelo robô diário'+(MD.d&&MD.d.at?' ('+new Date(MD.d.at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+')':'')+'; preço de agora do '+(d.cur==='USD'?'Finnhub':'brapi'):'Dados do '+(d.cur==='USD'?'Finnhub e Alpha Vantage':'brapi'+(d.histSrc?', gráfico da Alpha Vantage':'')))+'. Indicadores servem para estudar, não são recomendação de compra ou venda.</p>';
  setHtml(b,h);
  try{var sg=b.querySelector('.stseg'),ab=sg&&sg.querySelector('[aria-pressed="true"]');if(sg&&ab){var r1=ab.getBoundingClientRect(),r2=sg.getBoundingClientRect();if(r1.left<r2.left||r1.right>r2.right)sg.scrollLeft+=r1.left-r2.left-(r2.width-r1.width)/2}}catch(e){}
}
function watchSet(W){S.watch=W;S.pend.push({t:'cfg',k:'watch',v:W});save();ghSync();clearTimeout(watchSet.t);watchSet.t=setTimeout(function(){loadMD(true)},150000)}
/* assistente de IA removido a pedido do usuário: limpa o que ficou guardado */
try{if(S.keys&&S.keys.gm){delete S.keys.gm;save()}['-aichat','-gemm','-gemm2','-gemm3','-gemth'].forEach(function(k){localStorage.removeItem(LS+k)})}catch(e){}
