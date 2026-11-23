/* Aporte · js/faixa.js — Preço justo em FAIXA (1.64.0): 3 cenários feitos com o lucro normalizado do histórico da CVM.
   Só usado pelas Ideias (opData/opRow em mercado-oportunidades.js). Não mexe no stkAna nem no anValCalc.
   Tudo é conta feita por código com premissas simples e visíveis; nada vem de IA. */
var FXV=0,FXL={},FXP=0,FXOPEN={},FXW=[25,50,25],FXTOL=0.10,FXPAY=0.5,FXN=8,FXMC=0.85,FXOLD=false;  /* FXOLD só serve para comparar com a regra antiga de 4 cortes (1.64.0) */
/* mediana e percentil (interpolado) de uma lista de números */
function fxPct(a,p){if(!a.length)return null;var s=a.slice().sort(function(x,y){return x-y}),i=(s.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return s[lo]+(s[hi]-s[lo])*(i-lo)}
/* arquivo do histórico (dados/cvm/<TICKER>.json): undefined = baixando, null = não existe/indisponível */
function fxDoc(tk){var c=FIN['cvm/'+tk];if(c&&!c.p&&c.d!==undefined)return c.d;if(c&&c.err&&!c.p)return null;
  if(!FXL[tk]){FXL[tk]=1;FXP++;finGet('cvm',tk).then(function(){},function(){}).then(function(){FXP--;FXV++;if(FXP<=0){FXP=0;try{renderMkt()}catch(e){}}})}
  return undefined}
/* lucro normalizado: mediana dos últimos 8 a 12 trimestres, sem os trimestres marcados como atípicos pelo robô */
function fxNorm(D){if(!D||!D.t||!D.t.length)return {ok:false,motivo:'sem histórico da CVM'};
  var t=D.t.slice(-12);if(t.length<FXN)return {ok:false,motivo:'histórico curto ('+t.length+' trimestres, precisa de '+FXN+')'};
  var nr={};(D.nr||[]).forEach(function(n){nr[n.q]=1});
  var inc=t.filter(function(r){return r.luc!=null&&!nr[hiQ(r)]}),excl=t.filter(function(r){return nr[hiQ(r)]}).map(hiQ);
  if(inc.length<6)return {ok:false,motivo:'poucos trimestres normais ('+inc.length+')'};
  var med=fxPct(inc.map(function(r){return r.luc}),0.5);if(!(med>0))return {ok:false,motivo:'lucro normalizado não positivo'};
  var u4=D.t.slice(-4),last12=u4.length===4&&u4.every(function(r){return r.luc!=null})?u4.reduce(function(s,r){return s+r.luc},0):null;
  if(!(last12>0))return {ok:false,motivo:'lucro dos últimos 12 meses não positivo'};
  var ml=inc.filter(function(r){return r.ml!=null}).map(function(r){return r.ml}),mm=ml.length>=6?{p25:fxPct(ml,0.25),med:fxPct(ml,0.5),p75:fxPct(ml,0.75)}:null;
  if(mm&&!(mm.med>0))mm=null;
  return {ok:true,n:t.length,usados:inc.length,excl:excl,med:med,anual:med*4,last12:last12,ml:mm,ref:hiQ(t[t.length-1])}}
/* tendência: lucro ou margem caindo 3 trimestres seguidos (4 pontos, cada um menor que o anterior) */
function fxTrap(D){var t=(D&&D.t||[]).slice(-4);if(t.length<4)return null;
  var caiu=function(k){return t.every(function(r){return r[k]!=null})&&t[0][k]>t[1][k]&&t[1][k]>t[2][k]&&t[2][k]>t[3][k]};
  if(caiu('luc'))return 'lucro';if(caiu('ml'))return 'margem';return null}
/* valor por ação de um cenário: lucro por ação normalizado × margem, crescendo g por 5 anos; distribui FXPAY do lucro; no ano 5 vende por múltiplo × lucro */
function fxVal(L0,fm,g,r,m){var v=0,e=L0*fm,i;for(i=1;i<=5;i++){e*=1+g/100;v+=e*FXPAY/Math.pow(1+r/100,i)}return v+e*m/Math.pow(1+r/100,5)}
/* lucro por ação normalizado: preferência pelo número de ações (valor de mercado = P/VP × patrimônio ÷ preço); sem isso, lucro por ação de hoje (preço ÷ P/L) × (normalizado ÷ últimos 12 meses), com razão limitada */
function fxCalc(D,P,N,pe,tk,Fu,old){var nm=fxNorm(D);if(!nm.ok)return nm;
  var sh=Fu&&Fu.pvp>0&&Fu.pl_r>0&&P>0?Fu.pvp*Fu.pl_r/P:null;
  if(!sh&&!(N&&N.pl>0&&P>0))return {ok:false,motivo:'sem número de ações nem P/L para calcular o lucro por ação'};
  var cfg=VALP[tk]||{},sel=MD.d&&MD.d.idx&&MD.d.idx.selic&&MD.d.idx.selic.last,
    gb=cfg.g!=null?cfg.g:Math.max(0,Math.min(10,N.cr5!=null?Math.round(N.cr5):5)),rb=cfg.r!=null?cfg.r:Math.max(12,Math.round((sel||13)+1)),
    M=pe&&pe>0?Math.max(6,Math.min(15,pe)):10,
    ratio0=nm.anual/nm.last12,ratio=Math.max(0.3,Math.min(2,ratio0)),lim=!sh&&ratio!==ratio0,L0=sh?nm.anual/sh:P/N.pl*ratio,
    mm=nm.ml,fmC=mm?Math.max(0.6,Math.min(1,mm.p25/mm.med)):1,fmO=mm?Math.max(1,Math.min(1.3,mm.p75/mm.med)):1,
    pr=[old?{n:'Conservador',g:Math.max(0,gb-4),fm:fmC,r:rb+2,m:Math.round(M*0.75*10)/10,ml:mm?mm.p25:null}:{n:'Conservador',g:gb,fm:fmC,r:rb,m:Math.round(M*FXMC*10)/10,ml:mm?mm.p25:null},
        {n:'Central',g:gb,fm:1,r:rb,m:Math.round(M*10)/10,ml:mm?mm.med:null},
        {n:'Otimista',g:Math.min(12,gb+3),fm:fmO,r:Math.max(8,rb-1),m:Math.round(M*1.2*10)/10,ml:mm?mm.p75:null}];
  pr.forEach(function(c){c.v=fxVal(L0,c.fm,c.g,c.r,c.m)});
  var trap=fxTrap(D),cen=pr[1].v,cenRaw=cen;if(trap){cen=(pr[0].v+pr[1].v)/2;pr[1].v=cen}
  var w=FXW,esp=(w[0]*pr[0].v+w[1]*pr[1].v+w[2]*pr[2].v)/100,cons=pr[0].v,rel=P/cons-1;
  return {ok:true,nm:nm,pr:pr,P:P,cons:cons,cen:cen,cenRaw:cenRaw,oti:pr[2].v,esp:esp,espPct:esp/P-1,ms:(cons-P)/cons,trap:trap,lim:lim,ratio:ratio,L0:L0,base:sh?'acoes':'pl',
    est:rel<=0?'abaixo':rel<=FXTOL?'perto':'acima',opp:rel<=FXTOL}}
/* calcula a faixa de uma ideia (o vem de opEval): bancos e seguradoras não têm faixa; sem arquivo = indisponível; baixando = pendente */
function fxFor(o){if(!o)return null;var bk=false,sg=false;if(opBanco(o)){if(bkIs(o.tk))bk=true;else if(sgIs(o.tk))sg=true;else return {ok:false,banco:true,motivo:'valuation desta financeira em breve'}}
  var D=fxDoc(o.tk);if(D===undefined)return {ok:false,pend:true,motivo:'calculando a faixa…'};if(D===null)return {ok:false,bank:bk,seg:sg,motivo:'sem histórico da CVM para esta empresa'};
  try{var A=o.A;if(bk){var B=bkCalc(D,o.d.price,A.N||{},o.tk,fundOf(o.tk));if(B.ok)B.F=brl;else B.bank=true;return B}if(sg){var G=sgCalc(D,o.d.price,o.tk,fundOf(o.tk));if(G.ok)G.F=brl;else G.seg=true;return G}var F=fxCalc(D,o.d.price,A.N||{},A.pe&&A.pe.pl,o.tk,fundOf(o.tk),FXOLD);if(F.ok)F.F=o.d.cur==='USD'?usd:brl;return F}catch(e){return {ok:false,motivo:'não foi possível calcular a faixa'}}}
function fxFaixa(f){return f.F.format(f.cons)+' a '+f.F.format(f.oti)}
function fxEstado(f){return f.est==='abaixo'?['Abaixo do cenário conservador','g']:f.est==='perto'?['Muito perto do cenário conservador','g']:['Acima do cenário conservador','l']}
/* linha da ideia: faixa, margem de segurança e botão para ver as premissas */
function fxRow(o){var f=o.fx;if(!f)return '';
  if(!f.ok)return '<div class="fql muted">'+(f.pend?'Faixa de preço justo: calculando…':f.banco?'Faixa de preço justo: '+esc(f.motivo)+'.':'Faixa de preço justo indisponível: '+esc(f.motivo)+'.')+'</div>';
  var e=fxEstado(f),ab=!!FXOPEN[o.tk];
  return '<div class="fql"><span>Faixa <b class="num">'+esc(fxFaixa(f))+'</b> · central '+esc(f.F.format(f.cen))+'</span> <span>Margem de segurança <b class="num '+(f.ms>=0?'gain':'loss')+'">'+(f.ms>=0?'':'−')+pf.format(Math.abs(f.ms*100))+'%</b> <small class="muted">(sobre o conservador)</small></span> <b class="opc '+e[1]+'">'+e[0]+'</b>'+(f.trap?' <b class="opw">⚠ Possível armadilha de valor</b>':'')+
    ' <button type="button" class="fqb" data-fxp="'+esc(o.tk)+'" aria-expanded="'+ab+'">'+(ab?'Esconder premissas':'Premissas')+'</button></div>'+(ab?fxPrem(f)+(typeof saudePrem==='function'?saudePrem(o):''):'')}
function fxPrem(f){if(f.bank)return bkPrem(f);if(f.seg)return sgPrem(f);var F=f.F,nm=f.nm,pr=f.pr,td=function(fn){return pr.map(function(c){return '<td class="num">'+fn(c)+'</td>'}).join('')},p1=function(v){return pf.format(v)+'%'};
  return '<div class="fqp"><p class="note" style="margin:0 0 6px"><b>Lucro normalizado</b>: mediana de '+nm.usados+' trimestres ('+nm.n+' no histórico, até '+esc(nm.ref)+')'+(nm.excl.length?', sem os atípicos ('+esc(nm.excl.join(', '))+')':'')+' = '+qfmt(nm.med)+' por trimestre, '+qfmt(nm.anual)+' por ano. Últimos 12 meses no balanço: '+qfmt(nm.last12)+'.'+(f.lim?' A diferença foi limitada para não distorcer a conta.':'')+'</p>'+
    '<div class="atsc"><table class="tb"><thead><tr><th></th>'+pr.map(function(c){return '<th>'+c.n+'</th>'}).join('')+'</tr></thead><tbody>'+
    '<tr><td>Crescimento do lucro (% a.a.)</td>'+td(function(c){return p1(c.g)})+'</tr>'+
    '<tr><td>Margem líquida</td>'+td(function(c){return c.ml==null?'<span class="muted">—</span>':p1(c.ml)})+'</tr>'+
    '<tr><td>Desconto (% a.a.)</td>'+td(function(c){return p1(c.r)})+'</tr>'+
    '<tr><td>Múltiplo de saída (P/L)</td>'+td(function(c){return num(c.m,1)+'×'})+'</tr>'+
    '<tr><td>Valor por ação</td>'+td(function(c){return '<b>'+F.format(c.v)+'</b>'})+'</tr></tbody></table></div>'+
    '<p class="note" style="margin:6px 0 0">Cada cenário projeta o lucro por ação normalizado ('+F.format(f.L0)+') por 5 anos, distribui '+Math.round(FXPAY*100)+'% dele e vende no ano 5 pelo múltiplo de saída, tudo trazido a valor de hoje pela taxa de desconto. O conservador muda só 2 coisas em relação ao central: margem de um trimestre fraco (percentil 25 do histórico) e múltiplo de saída 15% menor; crescimento e desconto são os mesmos do central. O otimista usa margem de um trimestre forte (percentil 75), mais crescimento, menos desconto e múltiplo maior.</p>'+
    '<p class="anv" style="margin:8px 0 2px"><b>Retorno esperado</b>: média dos 3 cenários com pesos '+FXW.join('/')+' = <b class="num">'+F.format(f.esp)+'</b> (<b class="num '+(f.espPct>=0?'gain':'loss')+'">'+csPc(f.espPct*100)+'</b> sobre o preço de hoje, '+F.format(f.P)+').</p>'+
    '<p class="note" style="margin:0">Vira ideia só se o preço estiver abaixo do conservador ou até '+Math.round(FXTOL*100)+'% acima dele. '+(f.trap?'<b class="hiw">Possível armadilha de valor: o '+f.trap+' caiu 3 trimestres seguidos, então o cenário central foi rebaixado (média entre conservador e central).</b> ':'')+'Mude crescimento e desconto na aba Valuation da ação, se quiser testar. É uma estimativa com premissas simples, não garantia.</p></div>'}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-fxp]');if(!b)return;var t=b.getAttribute('data-fxp');FXOPEN[t]=!FXOPEN[t];try{renderMkt()}catch(x){}});
