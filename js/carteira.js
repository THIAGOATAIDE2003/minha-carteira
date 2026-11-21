/* Aporte · js/carteira.js — Carteira: hoje, desempenho, posições, ativos, extrato, câmbio.
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
function hojeHtml(R){var T=R.tot,h='';
  var vBR=0,cBR=0,vUSu=0,cUSu=0,vUS=0,cUS=0,nBR=0,nUS=0;
  R.held.forEach(function(x){if(x.p.market==='US'){vUSu+=x.p.qty*x.P1;cUSu+=x.p.cN;vUS+=x.v;cUS+=x.p.cB;nUS++}else{vBR+=x.v;cBR+=x.p.cB;nBR++}});
  var res=function(v,c,f){var g=v-c;return '<span class="num small '+cls(g)+'">'+(f||sgn)(g)+' ('+pct(c?g/c:0)+')</span>'};
  var sgu=function(g){return (g>=0?'+':'−')+usd.format(Math.abs(g))};
  var nRF=(R.rfs||[]).filter(function(c){return !c.rs}).length;
  if(nBR||nUS||nRF){var vt=vBR+vUS+T.rfV,ct=cBR+cUS+T.rfC,ctp=cBR+cUSu*T.fxNow+T.rfC,vtp=vBR+vUSu*T.fxNow+T.rfV;
    h+='<div class="panel"><h2>Carteira hoje</h2><ul class="calc">'+
    (nBR?'<li><span>Brasil <span class="muted small">Nubank</span><br>'+res(vBR,cBR)+'</span><span class="num">'+brl.format(vBR)+'</span></li>':'')+
    (nUS?'<li><span>EUA <span class="muted small">Inter</span><br>'+bal('Em dólar: '+sgu(vUSu-cUSu)+' ('+pct(cUSu?(vUSu-cUSu)/cUSu:0)+'), você tem '+usd.format(vUSu)+'. Convertido pelo dólar de hoje (R$ '+num(T.fxNow,4)+'). Com o ganho do câmbio, ficaria '+sgn(vUS-cUS)+'.',res(vUSu*T.fxNow,cUSu*T.fxNow).replace('class="num small','class="num small u'))+'</span><span class="num">'+brl.format(vUS)+'</span></li>':'')+
    (nRF?'<li><span>Renda fixa <span class="muted small">líquido</span><br>'+res(T.rfV,T.rfC)+'</span><span class="num">'+brl.format(T.rfV)+'</span></li>':'')+
    '<li class="tot"><span>Total<br>'+res(vtp,ctp)+' '+bal('Quanto o preço de tudo que você tem hoje está acima (ou abaixo) do que você pagou, pelo preço médio. Sem câmbio, sem vendas antigas e sem proventos.')+'</span><span class="num">'+brl.format(vt)+'</span></li></ul></div>';
  }
  return h}
function investHtml(R){var T=R.tot,h='',ct=T.rfC;R.held.forEach(function(x){ct+=x.p.cB});if(!R.held.length&&!T.rfC)return '';var dA=ct-T.contrib;
    h+='<div class="panel"><h2>Quanto você investiu</h2><ul class="calc">'+
      '<li><span>Valor investido<br><span class="muted small">o que você pagou pelo que tem hoje (preço médio × quantidade), como no Nubank e no Inter</span></span><span class="num">'+brl.format(ct)+'</span></li>'+
      '<li><span>Aplicado do seu bolso<br><span class="muted small">dinheiro novo que saiu da sua conta para investir, menos o que você retirou</span></span><span class="num">'+brl.format(T.contrib)+'</span></li>'+
      '<li class="tot"><span>Diferença</span><span class="num">'+brl.format(Math.abs(dA))+'</span></li></ul>'+
      '<p class="note exp">'+(dA>=0?'O valor investido é maior porque parte das compras foi paga com lucro de vendas e com proventos, e não com dinheiro novo do seu bolso.':'O valor investido é menor porque parte do dinheiro aplicado ainda está parada, ou foi perdida em vendas com prejuízo.')+' O lucro total é calculado sobre o aplicado do seu bolso.</p></div>'
  return h}
/* Se vendesse os dólares hoje (1.21.0): spread do Inter + IOF da volta (dólar→real) + IR de 15% sobre o lucro em reais (Lei 14.754/2023) */
var VND={spr:0.99,iof:0.38,ir:15};
try{var vn0=JSON.parse(localStorage.getItem(LS+'-vnd')||'null');if(vn0){['spr','iof','ir'].forEach(function(k){if(typeof vn0[k]==='number'&&vn0[k]>=0&&vn0[k]<=100)VND[k]=vn0[k]})}}catch(e){}
function vendaCalc(R){
  var us=R.held.filter(function(x){return x.p.market==='US'});if(!us.length)return null;
  var v=0,c=0;us.forEach(function(x){v+=x.v;c+=x.p.cB});
  var spr=v*VND.spr/100,liq0=v-spr,iof=liq0*VND.iof/100,gan=v-c,ir=gan>0?gan*VND.ir/100:0,liq=liq0-iof-ir;
  return {v:v,c:c,spr:spr,iof:iof,ir:ir,gan:gan,liq:liq,custo:spr+iof+ir,ganLiq:liq-c}}
function vendaHtml(R){
  var V=vendaCalc(R);if(!V)return '';
  var T=R.tot,fm=function(n){return String(n).replace('.',',')};
  var row=function(l,n,neg){return '<li><span>'+l+'</span><span class="num '+(neg?cls(-1):'')+'">'+(neg?'−':'')+brl.format(Math.abs(n))+'</span></li>'};
  return '<div class="panel"><h2>Se vendesse seus dólares hoje '+bal('Quanto sobraria em reais se você vendesse todo o seu VT agora e trouxesse o dinheiro de volta para a conta brasileira, já descontando o que o Inter e a Receita cobram. É uma estimativa: o spread muda a cada dia e o IR final é fechado na declaração anual.')+'</h2>'+
    '<ul class="calc">'+row('Seus dólares hoje (cotação do momento)',V.v)+row('Spread do Inter ('+fm(VND.spr)+'%)',V.spr,1)+row('IOF na volta para real ('+fm(VND.iof)+'%)',V.iof,1)+row('IR sobre o lucro ('+fm(VND.ir)+'%)',V.ir,1)+
    '<li class="tot"><span>Sobraria em reais</span><span class="num">'+brl.format(V.liq)+'</span></li></ul>'+
    '<div class="split" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line)"><div><span class="lbl">Lucro nos dólares antes dos custos</span><span class="num '+cls(V.gan)+'">'+sgn(V.gan)+'</span></div>'+
    '<div><span class="lbl">Lucro de verdade depois dos custos</span><span class="num '+cls(V.ganLiq)+'">'+sgn(V.ganLiq)+'</span></div></div>'+
    '<p class="note" style="margin:12px 0 0">Seu lucro total de '+sgn(T.gain)+' cai para <b>'+sgn(T.gain-V.custo)+'</b> se você vender tudo isso hoje ('+brl.format(V.custo)+' em custos).</p>'+
    '<details><summary>Ajustar spread, IOF e IR</summary><div class="keys" style="margin-top:10px">'+
    '<label class="small muted" for="vn-spr">Spread do Inter (%), confira na tela de conversão</label><input id="vn-spr" data-vnd="spr" inputmode="decimal" value="'+fm(VND.spr)+'" autocomplete="off">'+
    '<label class="small muted" for="vn-iof">IOF dólar para real (%)</label><input id="vn-iof" data-vnd="iof" inputmode="decimal" value="'+fm(VND.iof)+'" autocomplete="off">'+
    '<label class="small muted" for="vn-ir">IR sobre o lucro no exterior (%)</label><input id="vn-ir" data-vnd="ir" inputmode="decimal" value="'+fm(VND.ir)+'" autocomplete="off"></div>'+
    '<p class="note" style="margin:10px 0 0">Padrões: spread de 0,99% (valor que o Inter já divulgou; ele mostra o seu na hora da conversão), IOF de 0,38% na entrada de dólar para real e IR de 15% sobre o lucro de investimentos no exterior (Lei 14.754/2023), calculado em reais: valor da venda menos o custo de cada compra no dólar do dia. O IR da declaração pode ser menor se você tiver prejuízo em outros ativos no exterior no mesmo ano. Não inclui dividendos nem conta do seu contador.</p></details></div>'}
document.addEventListener('change',function(e){var t=e.target,k=t&&t.getAttribute&&t.getAttribute('data-vnd');if(!k)return;
  var n=parseFloat(String(t.value).replace(',','.'));if(isNaN(n)||n<0||n>100)n=VND[k];VND[k]=n;try{localStorage.setItem(LS+'-vnd',JSON.stringify(VND))}catch(er){}render()});
function perfHtml(R){
  var T=R.tot,h='',bm=cdiBench(R),nBR=R.held.some(function(x){return x.p.market==='BR'}),nUS=R.held.some(function(x){return x.p.market==='US'});
  var pz=T.uA+T.rfU,rz=T.rA+T.rF+T.rfR;
  var VZ=valoriz(R),fxp=pz+T.uF-VZ.pv;var wfi=[['Preço das ações que você tem',VZ.pv]];if(nUS||Math.abs(fxp)>0.005)wfi.push(['Dólar (sobre o VT que você tem)',fxp]);wfi.push(['Vendas já feitas',rz],['Proventos recebidos',T.div]);if(T.fees>0.005)wfi.push(['Taxas da B3 pagas nas notas',-T.fees]);
  var wmx=Math.max.apply(null,wfi.map(function(w){return Math.abs(w[1])}))||1;
  h+='<div class="panel"><h2>Tudo que você já '+(T.gain>=0?'lucrou':'perdeu')+'</h2><p class="note" style="margin:-6px 0 12px">Se vendesse tudo hoje, juntando preço, dólar, vendas e proventos.</p><ul class="calc wf">'+
    wfi.map(function(w){var hk=w[0].indexOf('Preço das')===0?'val':w[0].indexOf('Dólar')===0?'cam':'';return '<li'+(hk?' class="hcl" data-hero="'+hk+'" role="button" tabindex="0"':'')+'><span>'+w[0]+(hk?' ›':'')+'</span><span class="num '+cls(w[1])+'">'+sgn(w[1])+'</span><span class="trk"><i class="'+(w[1]>=0?'g':'l')+'" style="width:'+Math.max(1.5,Math.abs(w[1])/wmx*100).toFixed(1)+'%"></i></span></li>'}).join('')+
    '<li class="tot hcl" data-hero="luc" role="button" tabindex="0"><span>'+(T.gain>=0?'Lucro':'Prejuízo')+' total ›</span><span class="num '+cls(T.gain)+'">'+sgn(T.gain)+'</span></li></ul>'+
    '<div class="split" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line)"><div><span class="lbl">Rentabilidade simples '+bal('O lucro total dividido pelo que saiu do seu bolso. Ex.: aplicou R$ 100 e ganhou R$ 7, rendeu 7%. Não importa quando cada aporte entrou.')+'</span><span class="num '+cls(T.gain)+'">'+pct(T.simple)+'</span></div>'+
    '<div><span class="lbl">Anualizada (XIRR) '+bal('Quanto a carteira renderia em 1 ano inteiro no ritmo atual, levando em conta a data de cada compra e venda. Com menos de 1 ano de carteira, esse número exagera: olhe mais a simples.')+'</span><span class="num '+(T.xirr==null?'muted':cls(T.xirr))+'">'+(T.xirr==null?'—':pct(T.xirr))+'</span></div></div>'+
    '<details><summary>Como a conta é feita</summary><ul class="calc small" style="margin-top:12px">'+
    '<li><span>Valor atual dos ativos</span><span class="num">'+brl.format(T.value)+'</span></li>'+
    '<li><span>+ Saldo parado (vendas e proventos não reinvestidos)</span><span class="num">'+brl.format(T.cash)+'</span></li>'+
    '<li><span>− Aplicado do seu bolso</span><span class="num">'+brl.format(T.contrib)+'</span></li>'+
    '<li class="tot"><span>= Resultado</span><span class="num '+cls(T.gain)+'">'+sgn(T.check)+'</span></li></ul>'+
    '<p class="note"><b>Aplicado do seu bolso</b> é o dinheiro novo que você colocou. Se você vende uma ação e compra outra com o dinheiro da venda, isso não conta como aporte novo.<br><b>Simples</b> é o resultado dividido pelo aplicado do seu bolso. Não considera quando cada aporte entrou.<br><b>XIRR</b> considera a data de cada compra e venda e mostra o ritmo anual equivalente'+(T.days<365?'. Com menos de 1 ano de carteira ('+T.days+' dias) esse número exagera, então olhe mais a simples.':'.')+'</p>'+
    (Math.abs(T.check-T.gain)>0.01?'<p class="warn">A conta não fecha em '+brl.format(Math.abs(T.check-T.gain))+'. Revise os lançamentos.</p>':'')+
    '</details></div>';

  h+=vendaHtml(R);
  var sb=nBR?benchSeg('BR','BOVA11'):null,su=nUS?benchSeg('US','IVVB11'):null;
  if(sb||su){var ln=function(lab,a,bl,b){var d=a.gP-a.gB;return '<li class="vsli"><span><b>'+lab+'</b></span><span class="num '+cls(d)+'">'+sgn(d)+'</span>'+vsBars(a.pP,'Você',a.pB,bl)+'</li>'};
    h+='<div class="panel"><h2>Sua carteira contra o mercado</h2><ul class="calc">'+(sb?ln('Ações do Brasil',sb,'Ibovespa'):'')+(su?ln('VT (em reais)',su,'S&P 500'):'')+'</ul>'+
      '<p class="note exp">Valor em reais: quanto você ganhou a mais (+) ou a menos (−) do que teria ganho se, em cada compra e venda, tivesse comprado e vendido o índice no mesmo dia. Ibovespa pelo BOVA11 e S&P 500 pelo IVVB11, que já inclui o dólar. Inclui seus proventos; os ETFs não pagam proventos. As porcentagens são sobre o total que você comprou em cada parte.</p></div>'}
  else if(S.keys.brapi&&(nBR||nUS)&&!BX.at)h+='<div class="panel"><h2>Sua carteira contra o mercado</h2><p class="muted small">'+(BX.err?esc(BX.err):'Buscando Ibovespa e S&P 500...')+'</p></div>';
  if(bm){var dif=(T.value+T.cash)-bm.val;
    h+='<div class="panel"><h2>Sua carteira contra o CDI</h2><ul class="calc">'+
      '<li><span>Sua carteira hoje</span><span class="num">'+brl.format(T.value+T.cash)+'</span></li>'+
      '<li><span>Se o mesmo dinheiro estivesse no CDI</span><span class="num">'+brl.format(bm.val)+'</span></li>'+
      '<li class="tot"><span>'+(dif>=0?'Você está à frente do CDI':'Você está atrás do CDI')+'</span><span class="num '+cls(dif)+'">'+sgn(dif)+'</span></li></ul>'+
      '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line)">'+vsBars(T.simple,'Sua carteira',bm.gain/bm.apl,'CDI')+'</div>'+
      '<p class="note exp">Cada real que você aplicou foi colocado no CDI na mesma data em que entrou na carteira, rendendo 100% do CDI até '+fmtDate(bm.last)+' (último CDI do Banco Central). Retiradas saem do CDI na mesma data. Sem IR, para comparar com a carteira, que também está sem IR.</p></div>'}
  else if(S.trades.length&&!CDI.dates.length)h+='<div class="panel"><h2>Sua carteira contra o CDI</h2><p class="muted small">'+(CDI.err?esc(CDI.err):'Buscando o CDI no Banco Central...')+'</p></div>';
  h+=hojeHtml(R)+investHtml(R);
  return h;
}
function renderPerf(R){var el=$('perftab');if(!el)return;var h=S.trades.length?perfHtml(R):'';el.innerHTML=h||'<div class="panel"><p class="muted">Lance suas compras para comparar a carteira com o mercado e com o CDI.</p></div>'}
function posCard(x){
  var p=x.p,us=p.market==='US',cur=us?usd:brl;
  return '<div class="pos"><div class="row"><span class="tk">'+esc(p.ticker)+'</span><span class="val num">'+brl.format(x.v)+'</span></div>'+
    '<div class="row"><span class="det">'+num(p.qty)+' un. a '+(x.hasQuote?cur.format(x.P1):'—')+(us?' ('+usd.format(p.qty*x.P1)+')':'')+'</span>'+
    '<span class="num '+cls(x.gain)+'" style="white-space:nowrap">'+sgn(x.gain)+' ('+pct(x.pct)+')</span></div>'+
    '<div class="det">Preço médio '+cur.format(x.P0)+(us?', dólar médio R$ '+num(x.F0,4):'')+'</div>'+
    (us?'<div class="parts"><span>Ação <span class="num '+cls(x.a)+'">'+sgn(x.a)+'</span></span><span>Câmbio <span class="num '+cls(x.f)+'">'+sgn(x.f)+'</span></span></div>':'')+
    '<div class="det">'+(!x.qt?'Sem cotação ainda':x.qt.src==='auto'?'Preço automático de '+hm(x.qt.at):x.qt.src==='online'?'Preço online'+(x.qt.asOf?', fechamento de '+esc(fmtDate(x.qt.asOf)):''):'Último preço salvo, de '+hm(x.qt.at||Date.now()))+'</div></div>';
}
function rfCard(c){
  var t=c.t,lg=c.liq-t.price,dm=function(d){return d?fmtDate(d).slice(0,5):''};
  return '<div class="pos"><div class="row"><span class="tk">'+esc(t.ticker)+'</span><span class="val num">'+brl.format(c.liq)+'</span></div>'+
    '<div class="row"><span class="det">'+num(t.pct,2)+'% do CDI, aplicado em '+fmtDate(t.date)+' ('+c.days+(c.days===1?' dia':' dias')+')'+(t.venc?', vence em '+fmtDate(t.venc):'')+(t.isento?', isento de IR':'')+'</span>'+
    '<span class="num '+cls(lg)+'" style="white-space:nowrap">'+sgn(lg)+' ('+pct(t.price?lg/t.price:0)+')</span></div>'+
    '<ul class="calc small" style="margin-top:6px">'+
    '<li><span>Valor aplicado</span><span class="num">'+brl.format(t.price)+'</span></li>'+
    '<li><span>+ Rendimento bruto <span class="muted">('+c.n+(c.n===1?' dia útil':' dias úteis')+')</span></span><span class="num '+cls(c.gain)+'">'+sgn(c.gain)+'</span></li>'+
    '<li><span>− IOF <span class="muted">('+(c.iofP?c.iofP+'% do rendimento, resgate antes de 30 dias':'zerado após 30 dias')+')</span></span><span class="num">'+brl.format(c.iof)+'</span></li>'+
    '<li><span>− IR <span class="muted">('+(t.isento?'isento':num(c.irP,1)+'% do rendimento')+')</span></span><span class="num">'+brl.format(c.ir)+'</span></li>'+
    '<li class="tot"><span>= Líquido se resgatar hoje</span><span class="num">'+brl.format(c.liq)+'</span></li></ul>'+
    '<div class="det">'+(c.n?'Último rendimento: '+sgn(c.lastGain)+' (CDI de '+dm(c.last)+', creditado na manhã seguinte).':(CDI.dates.length?'Ainda sem rendimento: o primeiro entra na manhã do próximo dia útil.':'Esperando o CDI do Banco Central para calcular.'))+'</div>'+
    '<details style="margin-top:6px"><summary>Resgatar</summary><div class="stack" style="margin-top:10px">'+
    '<label class="small muted">Data do resgate<input type="date" id="rfd-'+esc(t.id)+'" value="'+today()+'"></label>'+
    '<label class="small muted">Valor que caiu na conta (R$)<input inputmode="decimal" id="rfv-'+esc(t.id)+'" value="'+String(Math.round(c.liq*100)/100).replace('.',',')+'"></label>'+
    '<button class="btn small" type="button" data-rfok="'+esc(t.id)+'">Confirmar resgate</button></div></details></div>';
}
function renderPositions(R){
  var el=$('positions'),rfs=R.rfs||[],rfo=rfs.filter(function(c){return !c.rs}),rfc=rfs.filter(function(c){return c.rs}),T=R.tot;
  if(!R.held.length&&!R.closed.length&&!rfs.length){el.innerHTML='<div class="panel"><p class="muted">Nenhum ativo ainda. Lance uma compra no Extrato.</p></div>';return}
  var grp=function(title,sub,total,body,res,key){return '<details class="panel gbox" data-g="'+key+'"'+(GOPEN[key]?' open':'')+'><summary><div class="grp"><div><h2>'+title+'</h2>'+(sub?'<span class="det">'+sub+'</span>':'')+'</div><div class="gr">'+(total!=null?'<span class="num gt">'+brl.format(total)+'</span>':'')+(res?'<span class="num small '+cls(res[0])+'">'+sgn(res[0])+(res[1]!=null?' ('+pct(res[1])+')':'')+'</span>':'')+'</div></div></summary><div class="gbody">'+body+'</div></details>'};
  var gsum=function(a){var g=sum(a,function(x){return x.gain}),c=sum(a,function(x){return x.p.cB});return [g,c?g/c:null]};
  var sum=function(a,f){return a.reduce(function(s,x){return s+f(x)},0)};
  var br=R.held.filter(function(x){return x.p.market!=='US'}),us=R.held.filter(function(x){return x.p.market==='US'}),h='';
  if(br.length||us.length)h+=atvTable(R);
  if(rfo.length)h+=grp('Renda fixa','Valor líquido, já sem IOF e IR',T.rfV,rfo.map(rfCard).join('')+
    '<details><summary>Como a renda fixa é calculada</summary><div class="small" style="margin-top:10px;display:flex;flex-direction:column;gap:8px">'+
    '<p><b>Rendimento:</b> todo dia útil o CDI do dia (taxa do Banco Central) é aplicado sobre o seu saldo, multiplicado pelo seu % do CDI. Por exemplo, CDI de 0,055% ao dia × 110% dá 0,0605% naquele dia. O banco credita de manhã cedo, com o CDI do dia anterior, e o app faz igual.</p>'+
    '<p><b>IOF:</b> só se resgatar antes de 30 dias. Começa em 96% do rendimento no 1º dia e cai até zerar no 30º.</p>'+
    '<p><b>IR:</b> sobre o rendimento, pela tabela regressiva: 22,5% até 180 dias, 20% até 360, 17,5% até 720 e 15% depois. LCI e LCA são isentas.</p>'+
    '<p><b>Líquido:</b> aplicado + rendimento − IOF − IR. É o que cai na conta se resgatar hoje. Pode diferir alguns centavos do banco por arredondamento do CDI.</p>'+
    (CDI.err?'<p class="msg err">'+esc(CDI.err)+'</p>':'')+'</div></details>',[T.rfU,T.rfC?T.rfU/T.rfC:null],'rf');
  if(R.closed.length||rfc.length){
    var rows=R.closed.map(function(p){return {n:p.ticker,g:p.rA+p.rF+(p.div||0),v:p.rA+p.rF,d:p.div||0,rf:0}}).concat(rfc.map(function(c){return {n:c.t.ticker,g:c.realized,rf:1}}));
    rows.sort(function(a,b){return b.g-a.g});
    h+=grp('Encerradas',rows.length+' posições já vendidas: lucro das vendas + proventos',null,'<ul class="calc" style="margin-top:10px">'+rows.map(function(r){
      return '<li><span><b>'+esc(r.n)+'</b>'+(r.rf?' <span class="tag">Renda fixa</span>':'')+(r.rf?'':'<br><span class="muted small">Vendas '+sgn(r.v)+(r.d?' · proventos '+brl.format(r.d):'')+'</span>')+'</span><span class="num '+cls(r.g)+'">'+sgn(r.g)+'</span></li>'}).join('')+'</ul>',[sum(rows,function(r){return r.g}),null],'enc');
  }
  el.innerHTML=h;
}

/* tabela de ativos (estilo Investidor10): logo, quantidade, variação total e do dia; toque no % mostra o valor, toque na linha abre a análise */
var ATF='all',ASRT={k:'v',d:-1};
function tkLogo(tk,us){var ini=esc(tk.slice(0,2));return '<span class="tlg"><span>'+ini+'</span><img alt="" loading="lazy" src="'+(us?'https://financialmodelingprep.com/image-stock/'+encodeURIComponent(tk)+'.png':'https://icons.brapi.dev/icons/'+encodeURIComponent(tk)+'.svg')+'"></span>'}
function vpill(p,txt){if(p==null||!isFinite(p))return '<span class="vpl n">—</span>';var z=Math.abs(p*100)<0.005;return bal(txt,'<span class="vpl '+(z?'n':p>0?'g':'l')+'">'+(z?'':p>0?'+':'−')+pf.format(Math.abs(p*100))+'%'+(z?'':' <i>'+(p>0?'▲':'▼')+'</i>')+'</span>')}
function atvTable(R){
  var T=R.tot,fx=T.fxNow||1,dl=dayLbl(),rows=R.held.map(function(x){var us=x.p.market==='US',F=us?fx:1,pm=x.p.cN/x.p.qty,q=S.quotes[x.p.ticker];
    var tg=(x.P1-pm)*x.p.qty*F,dd=q&&q.prev&&q.src==='auto'?(dzero(us,q.at)?0:(q.price-q.prev)*x.p.qty*F):null;
    return {x:x,tk:x.p.ticker,us:us,q:x.p.qty,v:x.p.qty*x.P1*F,pm:pm,px:x.P1,t:pm?x.P1/pm-1:null,tg:tg,d:dd!=null?(dzero(us,q.at)?0:q.price/q.prev-1):null,dg:dd,prev:q&&q.prev}});
  var has={BR:rows.some(function(r){return !r.us}),US:rows.some(function(r){return r.us})};if(ATF!=='all'&&!has[ATF])ATF='all';
  var vis=rows.filter(function(r){return ATF==='all'||(ATF==='US')===r.us});
  vis.sort(function(a,b){var k=ASRT.k,A=k==='n'?a.tk:a[k],B=k==='n'?b.tk:b[k];if(A==null)return 1;if(B==null)return -1;return (A<B?-1:A>B?1:0)*ASRT.d});
  var tv=vis.reduce(function(s,r){return s+r.v},0),tc=vis.reduce(function(s,r){return s+r.v-r.tg},0),tgt=tv-tc,tdd=vis.reduce(function(s,r){return s+(r.dg||0)},0),tdp=vis.reduce(function(s,r){return s+(r.dg!=null?r.v-r.dg:0)},0);
  var F2=function(r){return r.us?usd:brl},hd=function(k,l,cl){return '<button type="button" class="ath'+(cl?' '+cl:'')+'" data-asrt="'+k+'">'+l+' <i>'+(ASRT.k===k?(ASRT.d<0?'↓':'↑'):'⇅')+'</i></button>'};
  var h='<div class="panel atv"><div class="grp"><div><h2>Ativos</h2><span class="det">'+brl.format(tv)+' em '+vis.length+(vis.length>1?' ativos':' ativo')+'</span></div><div class="gr">'+
      vpill(tc?tgt/tc:null,'Desde a compra, só pelo preço: '+sgn(tgt)+'. O VT entra pelo dólar de hoje, sem o câmbio.')+(tdp?vpill(tdd/tdp,(dl.t==='hoje'?'Hoje':'No último pregão ('+dl.d+')')+': '+sgn(tdd)+'.'):'')+'</div></div>'+
    (has.BR&&has.US?'<div class="chips atf">'+[['all','Todos'],['BR','Ações'],['US','ETFs Intern.']].map(function(f){return '<button type="button" data-atf="'+f[0]+'" aria-pressed="'+(ATF===f[0])+'">'+f[1]+'</button>'}).join('')+'</div>':'')+
    '<div class="atsc"><div class="atr ahd">'+hd('n','Ativo','a1')+hd('q','Quant.')+hd('t','Total')+hd('d',dl.t==='hoje'?'Hoje':'Dia')+hd('tg','Total R$')+hd('pm','Preço médio')+hd('px','Preço atual')+hd('v','Valor')+'</div>'+
    vis.map(function(r){var F=F2(r),qt=num(r.q,r.us?4:0),qs=num(r.q,r.us?2:0),vk=r.v>=1e3?'R$ '+num(r.v/1e3,1)+' mil':brl.format(r.v);
      return '<div class="atr"><button type="button" class="a1" data-stk="'+esc(r.tk)+'" aria-label="Abrir análise de '+esc(r.tk)+'">'+tkLogo(r.tk,r.us)+'<span class="an"><b>'+esc(r.tk)+'</b><small>'+vk+'</small></span></button>'+
        '<span class="aq">'+qs+'</span>'+
        vpill(r.t,r.tk+': '+sgn(r.tg)+' desde a compra ('+qt+(r.us?' cotas':' ações')+', preço médio '+F.format(r.pm)+', agora '+F.format(r.x.P1)+(r.us?'; em reais pelo dólar de hoje, sem câmbio':'')+').')+
        vpill(r.d,r.tk+(dl.t==='hoje'?' hoje':' no último pregão ('+dl.d+')')+': '+(r.dg!=null?sgn(r.dg)+' (de '+F.format(r.prev)+' para '+F.format(r.x.P1)+')':'sem dado')+'.')+
        '<span class="av '+cls(r.tg)+'">'+sgn(r.tg)+'</span><span class="av">'+F.format(r.pm)+'</span><span class="av">'+F.format(r.x.P1)+'</span><span class="av">'+brl.format(r.v)+'</span></div>'}).join('')+
    '</div><p class="note" style="margin-top:10px">Arraste para o lado para ver mais colunas. Toque no % para ver o valor; toque no nome do ativo para abrir a análise.</p></div>';
  return h;
}
var TRF='all',GOPEN={};
document.addEventListener('toggle',function(e){var d=e.target;if(d&&d.dataset&&d.dataset.g)GOPEN[d.dataset.g]=d.open},true);
function trKind(t){return t.side==='div'?'div':(t.side==='rf'||t.side==='rfout')?'rf':t.side==='buy'?'buy':t.side==='sell'?'sell':'out'}
function renderTrades(){
  var el=$('trades');
  if(!S.trades.length){el.innerHTML='<p class="muted">Nada lançado ainda.</p>';return}
  var fs=[['all','Tudo'],['buy','Compras'],['sell','Vendas'],['div','Proventos'],['rf','Renda fixa']];
  var h='<div class="yrs">'+fs.map(function(f){return '<button type="button" data-trf="'+f[0]+'" aria-pressed="'+(TRF===f[0])+'">'+f[1]+'</button>'}).join('')+'</div>';
  var q=($('tr-q').value||'').trim().toUpperCase();
  var ts=S.trades.filter(function(t){return (TRF==='all'||trKind(t)===TRF)&&(!q||String(t.ticker).toUpperCase().indexOf(q)>-1||String(t.note||'').toUpperCase().indexOf(q)>-1)}).sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:(a.id<b.id?1:-1)});
  if(!ts.length)h+='<p class="muted" style="margin-top:14px">'+(q?'Nada encontrado para "'+esc(q)+'".':'Nenhum lançamento desse tipo.')+'</p>';
  else if(q){var sb=0,ss=0,sd=0;ts.forEach(function(t){var v=t.qty*ePx(t)*(t.market==='US'?t.fx:1);if(t.side==='buy'||t.side==='rf')sb+=v;else if(t.side==='sell'||t.side==='rfout')ss+=v;else if(t.side==='div')sd+=v});
    h+='<p class="det" style="margin:12px 0 0">'+ts.length+(ts.length>1?' lançamentos':' lançamento')+(sb?' · comprou '+brl.format(sb):'')+(ss?' · vendeu '+brl.format(ss):'')+(sd?' · proventos '+brl.format(sd):'')+'</p>'}
  var cm='',nowm=today().slice(0,7),mcnt={};ts.forEach(function(t){var m=t.date.slice(0,7);mcnt[m]=(mcnt[m]||0)+1});
  var first=ts.length?ts[0].date.slice(0,7):'';
  ts.forEach(function(t){
    var m=t.date.slice(0,7);if(m!==cm){if(cm)h+='</details>';cm=m;var mn=MESL[+m.slice(5)-1],gk='m'+m,op=q||(GOPEN[gk]!=null?GOPEN[gk]:(m===nowm||m===first));
      h+='<details class="mbox" data-g="'+gk+'"'+(op?' open':'')+'><summary>'+mn.charAt(0).toUpperCase()+mn.slice(1)+' de '+m.slice(0,4)+'<span class="mc">'+mcnt[m]+(mcnt[m]>1?' lançamentos':' lançamento')+'</span></summary>'}
    var us=t.market==='US',cur=us?usd:brl,tot=t.qty*ePx(t)*(us?t.fx:1),k=t.side;
    var lab=k==='buy'?'Compra':k==='sell'?'Venda':k==='out'?'Retirada':k==='rf'?'Aplicação':k==='rfout'?'Resgate':'Provento';
    var sc=k==='sell'||k==='out'||k==='rfout'?' s':k==='div'?' p':'';
    var det=(t.auto?'automático, ':'')+(k==='rf'?num(t.pct,2)+'% do CDI'+(t.isento?', isento':''):k==='div'||k==='out'||k==='rfout'?(us?cur.format(t.price)+' a R$ '+num(t.fx,4):''):num(t.qty)+' × '+cur.format(t.price)+(us?' a R$ '+num(t.fx,4):'')+(t.taxa?(k==='sell'?' − ':' + ')+brl.format(t.taxa)+' de taxas':''));
    h+='<div class="tr"><span class="side'+sc+'">'+lab+'</span><span><b>'+esc(k==='out'?(t.note||'Dinheiro retirado'):t.ticker)+'</b> <span class="d">'+fmtDate(t.date).slice(0,5)+'</span></span><span class="num">'+brl.format(tot)+'</span>'+
      '<div class="x"><span class="num">'+det+'</span><span style="display:flex;gap:14px">'+(k==='rfout'||k==='out'?'':'<button class="link" type="button" data-edit="'+esc(t.id)+'">Editar</button>')+'<button class="link" type="button" data-del="'+esc(t.id)+'">Excluir</button></span></div></div>';
  });
  if(cm)h+='</details>';
  el.innerHTML=h;
}

function renderBanner(){$('banner').innerHTML=''}

function renderFx(){
  var el=$('fxtab');if(!el)return;
  var T={usd:0,tot:0,nac:0,ref:0,iof:0,spread:0,okUsd:0},rows=(S.cambio||[]).map(function(c){
    var f=fxOn(c[0]),ref=f?f.rate:null,r={d:c[0],usd:c[1],taxa:c[2],nac:c[3],iof:c[4],tot:c[5],est:!!c[6],ref:ref};if(r.est)T.estTot=(T.estTot||0)+r.tot;
    T.usd+=r.usd;T.tot+=r.tot;T.nac+=r.nac;T.iof+=r.iof;
    if(ref){r.refBrl=r.usd*ref;r.spread=r.nac-r.refBrl;T.ref+=r.refBrl;T.spread+=r.spread;T.okUsd+=r.usd}
    return r});
  var h='';
  var cost=T.spread+T.iof;
  h+='<div class="panel hero"><h2>Custo do câmbio</h2><div class="big loss">'+brl.format(cost)+'</div><div class="sub"><span class="num">'+pf.format(T.ref?cost/T.ref*100:0)+'%</span><span class="muted small">a mais do que o dólar de referência custaria</span></div></div>';
  h+='<div class="panel" style="margin-top:16px"><ul class="calc" style="margin:0;font-size:15px">'+
    '<li><span>Dólar de referência (sem spread)</span><span class="num">'+brl.format(T.ref)+'</span></li>'+
    '<li><span>+ Spread do Inter (estimado)</span><span class="num loss">'+brl.format(T.spread)+'</span></li>'+
    '<li><span>+ IOF (1,1%, exato)</span><span class="num loss">'+brl.format(T.iof)+'</span></li>'+
    '<li class="tot"><span>= Total que saiu do bolso</span><span class="num">'+brl.format(T.tot)+'</span></li></ul></div>';
  var avgPaid=T.tot/T.usd,avgRef=T.okUsd?T.ref/T.okUsd:null,ft=fxToday();
  h+='<div class="panel" style="margin-top:16px"><div class="split">'+
    '<div><span class="lbl">Dólares comprados</span><span class="num">'+usd.format(T.usd)+'</span></div>'+
    '<div><span class="lbl">Dólar médio pago (com tudo)</span><span class="num">'+brl.format(avgPaid)+'</span></div>'+
    '<div><span class="lbl">Dólar médio de referência</span><span class="num">'+(avgRef?brl.format(avgRef):'—')+'</span></div>'+
    '<div><span class="lbl">Dólar de hoje</span><span class="num">'+(ft?'R$ '+num(ft.rate,4):'—')+'</span></div></div></div>';
  if(!(S.cambio||[]).length){el.innerHTML='<div class="panel"><p class="muted" style="margin:0">Nenhuma compra de dólar registrada. Elas vêm junto com o backup.</p></div>';return}
  var buys=0,dvu=0;S.trades.forEach(function(t){if(t.market==='US'){if(t.side==='div'){dvu+=t.price;return}var c=t.qty*t.price;buys+=t.side==='buy'?c:-c}});
  if(T.estTot)h+='<div class="msg muted" style="margin-top:12px">Duas compras de dólar de 05/06 ('+usd.format(461)+') estão no extrato do Inter Global, mas sem comprovante. Usei a taxa do comprovante de US$ 1 do mesmo dia, então esses '+brl.format(T.estTot)+' são estimados. Se mandar o comprovante, eu troco pelo valor exato.</div>';
  if(buys-T.usd-dvu>5)h+='<div class="msg muted" style="margin-top:12px">Suas compras nos EUA somam '+usd.format(buys)+', mas os comprovantes somam '+usd.format(T.usd)+'. Faltam cerca de '+usd.format(buys-T.usd)+' sem comprovante (esses dólares usam o dólar de mercado do dia).</div>';
  h+='<div class="panel" style="margin-top:16px"><h2 style="margin-bottom:12px">Cada compra de dólar</h2>';
  rows.slice().reverse().forEach(function(r,i){
    h+='<div class="pos"><div class="row"><span><strong>'+fmtDate(r.d)+'</strong> <span class="muted small">'+usd.format(r.usd)+(r.est?' · estimado, sem comprovante':'')+'</span></span><span class="val">'+brl.format(r.tot)+'</span></div>'+
      '<div class="det">Inter cobrou '+num(r.taxa,4)+(r.ref?' · referência '+num(r.ref,4):'')+'</div>'+
      '<div class="parts">'+(r.ref?'<span>Spread <span class="num loss">'+brl.format(r.spread)+'</span></span>':'')+'<span>IOF <span class="num loss">'+brl.format(r.iof)+'</span></span></div></div>'});
  h+='</div>';
  h+='<details class="panel" style="margin-top:16px"><summary>Como esses números são calculados</summary><div class="small" style="margin-top:10px;display:flex;flex-direction:column;gap:8px">'+
    '<p>Cada comprovante do Inter traz o valor em dólar, a taxa cambial cobrada, o valor em reais e o IOF.</p>'+
    '<p><b>IOF</b> é exato, vem direto do comprovante.</p>'+
    '<p><b>Spread</b> = (taxa cobrada pelo Inter − dólar de referência do dia) × dólares comprados. O dólar de referência é o fechamento diário do mercado. Como o Inter cota durante o dia, o spread é uma estimativa, pode variar um pouco para mais ou para menos.</p>'+
    '<p><b>Total</b> = dólar de referência + spread + IOF, e bate com o valor debitado na sua conta.</p></div></details>';
  el.innerHTML=h;
}
