/* Aporte · js/mercado-oportunidades.js — Mercado: oportunidades/garimpo e Research (parte 2 de 4). Faz parte do antigo mercado.js (mesmo escopo global, ordem de carga importa). */
/* ===== Oportunidades: sua lista e o garimpo automático, com alertas quando algo muda ===== */
var OPC={k:'',r:null},OPV='lst';
function opD(tk){var F=fundOf(tk),lv=livePx(tk),h=MD.d&&MD.d.hist&&MD.d.hist[tk],us=!F&&h&&h.cur==='USD';
  var P=lv?lv.p:h&&h.last?h.last:F&&F.cot;if(!(P>0))return null;
  var k={};if(h&&h.d&&h.d.length>20){var y=h.d.map(function(p){return p[1]});k.hi=Math.max.apply(null,y);k.lo=Math.min.apply(null,y)}
  return {cur:us?'USD':'BRL',price:P,pct:lv&&lv.pct,k:k}}
/* banco/financeira (setor Financeiro): Graham, Bazin e fluxo de lucro não servem (1.62.0); fica sem preço justo até existir modelo por P/VP e ROE */
function opEval(tk){var d=opD(tk);if(!d)return null;var A=stkAna(tk,d);if(A.etf)return null;var fin=!!(A.sec&&A.sec[0]==='Financeiro'),V=fin?{ms:[]}:anValCalc(tk,d,A);
  return {tk:tk,d:d,A:A,V:V.ms&&V.ms.length?V:null,score:A.score,banco:fin}}
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
  var D=[],skipC=0,skipV=0;cand.forEach(function(F){var b=F.tk.slice(0,4);if(seen[b]||mine[F.tk])return;seen[b]=1;var o=opEval(F.tk);if(!o||!o.V||o.score==null)return;
    var Q=o.A.chips[0][1],Pq=o.A.chips[1][1];if(Q==='Baixa'||o.V.up<0.2||o.score<6)return;if(o.A.N.dy>20)return;
    try{o.conc=concFor(F.tk,R)}catch(e){}if(o.conc&&o.conc.alta){if(o.V.mg>=0.4&&o.score>=8&&!(o.A.alr&&o.A.alr.length))o.rara=true;else{skipC++;return}}
    try{var vv=vtSetor(rkSect(F.tk,false)),vc=vv.filter(function(x){return x[0]==='contra'}),vfv=vv.filter(function(x){return x[0]==='favor'}).length;if(vc.length>vfv){if(o.V.mg>=0.4&&o.score>=8&&!(o.A.alr&&o.A.alr.length))o.vento=vc;else{skipV++;return}}}catch(e){}
    var pfo=S.perfil&&S.perfil.obj,Nn=o.A.N||{};o.rank=o.score*10+Math.min(60,o.V.up*100)*0.6+(Q==='Alta'?10:0)+(pfo==='renda'&&Nn.dy?Math.min(15,Nn.dy*1.5):0)+(pfo==='cresc'&&Nn.cr5>0?Math.min(15,Nn.cr5/2):0);D.push(o)});
  D.sort(function(a,b){return b.rank-a.rank});D=D.slice(0,12);
  var H=opSnap(W.concat(M,D));try{garRec(D)}catch(e){}
  var mk=function(o,m){o.al=opAlerts(o,H,m);return o};W=W.map(function(o){return mk(o,!!mine[o.tk])});M=M.map(function(o){return mk(o,1)});D=D.map(function(o){o=mk(o,0);try{o.gq=opQual(o)}catch(e){}return o});
  var n=W.concat(M).reduce(function(s,o){return s+o.al.filter(function(a){return a[0]!=='at'||!mine[o.tk]}).length},0);
  OPC={k:key,r:{W:W,M:M,D:D,n:n,cand:cand.length,skipC:skipC,skipV:skipV}};return OPC.r}
function opRow(o,add){var F=o.d.cur==='USD'?usd:brl,sc=o.score,cl=sc==null?'':sc>=7?'g':sc>=4.5?'m':'l',inW=wlist().indexOf(o.tk)>=0;
  return '<div class="opr"><button type="button" class="opt" data-stk="'+esc(o.tk)+'">'+tkLogo(o.tk,o.d.cur==='USD')+'<span><b>'+esc(o.tk)+'</b><small>'+F.format(o.d.price)+(o.V?' · justo '+F.format(o.V.med):o.banco?' · valuation de banco em breve':'')+(o.A.alr&&o.A.alr.length?' · ⚠ '+o.A.alr.length+(o.A.alr.length>1?' avisos':' aviso'):'')+(o.rara?' · ideia rara (quebra a regra de concentração)':'')+'</small></span></button>'+
    '<span class="opn '+cl+'">'+(sc!=null?num(sc,1):'—')+'</span>'+(o.V?'<span class="num opu '+(o.V.up>=0?'gain':'loss')+'">'+(o.V.up>=0?'+':'−')+pf.format(Math.abs(o.V.up*100))+'%</span>':o.banco?'<span class="opu muted" style="font-size:11px;font-weight:500">em breve</span>':'<span class="opu muted">—</span>')+
    (o.gq?'<span class="opq'+(o.gq.fraca?' fr':'')+'">'+(o.gq.fraca?'⚠ Dado frágil ('+esc(o.gq.w.join(', '))+'). ':'')+esc(o.gq.t)+'</span>':'')+(add?'<button type="button" class="opa" data-wtog="'+esc(o.tk)+'" aria-label="'+(inW?'Parar de acompanhar ':'Acompanhar ')+esc(o.tk)+'">'+(inW?'★':'☆')+'</button>':'')+
    (o.al&&o.al.length?'<ul class="opal">'+o.al.slice(0,3).map(function(a){return '<li>'+rkLvl(a[0])+'<span><b>'+a[1]+'</b> '+a[2]+'</span></li>'}).join('')+'</ul>':'')+'</div>'}
function oppHtml(){var r=opData();if(!r)return '';
  var h='<div class="panel opp"><div class="grp"><h2>Ideias para estudar '+bal('O app avisa sozinho quando uma ação da sua lista ou da carteira fica abaixo do preço justo, cai muito ou melhora a nota. As ideias novas são ações que passaram em filtros automáticos. Passar nos filtros não quer dizer que seja boa compra: é um ponto de partida para você estudar.')+'</h2>'+(r.n?'<span class="opb">'+r.n+' aviso'+(r.n>1?'s':'')+'</span>':'')+'</div>'+
    '<div class="seg opseg">'+[['lst','Sua lista ('+r.W.length+')'],['car','Sua carteira'],['gar','Ideias novas']].map(function(x){return '<button type="button" data-opv="'+x[0]+'" aria-pressed="'+(OPV===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>';
  var cab='<div class="opr oph"><span>Ação</span><span>Nota</span><span>Potencial</span></div>';
  if(OPV==='car')h+=r.M.length?cab+r.M.map(function(o){return opRow(o,0)}).join('')+'<p class="note">Suas ações do Brasil com nota, preço justo e avisos. Abaixo do preço justo pode ser hora de aportar; acima, de esperar.</p>':'<p class="muted">Sem ações do Brasil na carteira.</p>';
  else if(OPV==='gar')h+=(r.D.length?cab+r.D.map(function(o){return opRow(o,1)}).join(''):'<p class="muted">Nenhuma empresa passou nos critérios agora.</p>')+'<p class="note">O app olhou sozinho '+r.cand+' ações'+(r.skipC?' (escondi '+r.skipC+(r.skipC>1?' ideias':' ideia')+' de setores ou grupos em que você já tem muito, a menos que fossem uma oportunidade rara)':'')+(r.skipV?' (e '+r.skipV+(r.skipV>1?' de setores':' de setor')+' com vento contra agora, como juros altos para construção)':'')+' com mais de R$ 2 milhões negociados por dia e separou as que têm nota boa (6 ou mais), qualidade média ou alta e preço justo pelo menos 20% acima do preço de hoje. Toque na estrela para colocar na sua lista e receber os avisos.</p><p class="note"><b>Atenção:</b> estas ações só passaram em filtros. O preço justo é uma estimativa simples, feita com o lucro passado, e pode estar errado. Estude a empresa antes de qualquer decisão.</p>'+(function(){try{return garHist()}catch(e){return ''}})();
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
  try{h+=riHtml(tk)}catch(x){}
  var nw=e.news||[];
  h+='<div class="panel"><h2>Manchetes dos últimos 30 dias '+bal('Notícias sobre a empresa buscadas pelo robô no Google Notícias. Toque para abrir a notícia inteira.')+'</h2>'+(nw.length?'<ul class="rsn">'+nw.map(function(n){return '<li><a href="'+esc(safeUrl(n.l))+'" target="_blank" rel="noopener">'+esc(n.t)+'</a><small>'+(n.d?fmtDate(n.d):'')+(n.s?' · '+esc(n.s):'')+'</small></li>'}).join('')+'</ul>':'<p class="muted" style="margin:0">Nenhuma manchete encontrada no último mês.</p>')+
    '<p class="note">Manchetes do Google Notícias, buscadas pelo robô'+(MD.d.res.at?' em '+rsWhen(MD.d.res.at):'')+'. Tocando, abre a notícia no navegador.</p></div>';
  return h}
function rsMini(tk){var e=rsOf(tk);if(!e||!e.ai)return '';var a=e.ai,sn=RSSN[a.sentimento]||RSSN.neutro;
  return '<div class="panel rsmini"><div class="grp"><h2>O que dizem as notícias '+bal('Resumo rápido da IA sobre as notícias da empresa. Veja tudo na aba Notícias.')+'</h2><b class="'+sn[1]+'">'+sn[0]+'</b></div><p class="anv" style="margin-top:6px">'+esc(a.resumo||'')+'</p><button type="button" class="link" data-stv="news">Ver notícias e eventos</button></div>'}
