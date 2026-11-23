/* Aporte · js/seguradora.js — Preço justo em FAIXA para SEGURADORAS e BOLSA (1.75.0, Etapa 6 parte B).
   Seguradoras (BBSE3, CXSE3, PSSA3...) e a bolsa (B3SA3) não se valem por P/VP nem por ROE (o patrimônio delas não é o motor do lucro).
   Valor = lucro normalizado por ação × P/L alvo. Lucro normalizado = mediana dos trimestres normais (mesma conta das outras empresas, fxNorm).
   P/L alvo: percentis 25, 50 e 75 do P/L histórico da própria ação (preço do fim de cada trimestre ÷ lucro de 12 meses por ação); sem histórico de preço, do P/L atual dos pares do mesmo subsetor.
   Dividendos sustentáveis: o que o lucro normalizado paga; payout acima de 100% é alerta. Tudo conta feita por código; nada vem de IA. Não mexe no stkAna. */
var SGMIN=6,        /* mínimo de pontos de P/L histórico (ou de pares) */
    SGPLMIN=3,SGPLMAX=40, /* P/L alvo fora disso = múltiplo implausível, sem faixa */
    SGPAY=1;        /* payout sobre o lucro normalizado acima de 100% = alerta */
/* tipo da financeira: null = não é desta parte (banco ou outra financeira) */
function sgKind(tk){if(bkIs(tk))return null;if(tk==='B3SA3')return 'bolsa';var s=setorOf(tk).s;return s==='Seguradoras'||s==='Corretoras de Seguros'?'seguradora':null}
function sgIs(tk){return !!sgKind(tk)}
/* o que o app não tem para cada tipo de financeira (aparece como "não avaliado" e tira 1 ponto da confiança) */
function finNaoK(k){return k==='seguradora'?['sinistralidade','solvência','resultado financeiro']:k==='bolsa'?['volume negociado','receita por produto']:['dados específicos do setor']}
function finNao(tk){var k=sgKind(tk);return k?finNaoK(k):BKNAO}
/* preço semanal de uma ação (robô: hist para carteira/lista, histx para as financeiras da etapa 6) */
function sgPx(tk){var h=MD.d&&MD.d.hist&&MD.d.hist[tk],x=MD.d&&MD.d.histx&&MD.d.histx[tk],w=(h&&h.w&&h.w.length?h.w:x&&x.w)||[];return w}
function sgDia(a,t){return Math.floor(Date.UTC(a,t*3,0)/864e5)}
/* P/L do fim de cada trimestre: preço semanal mais próximo (até 10 dias antes) × ações ÷ lucro de 12 meses */
function sgPlHist(D,sh,tk){var w=sgPx(tk),t=D&&D.t||[],out=[];if(!w.length||!sh)return out;
  for(var i=3;i<t.length;i++){var s=0,ok=true;for(var j=i-3;j<=i;j++){if(t[j].luc==null){ok=false;break}s+=t[j].luc}if(!ok||!(s>0))continue;
    var d=sgDia(t[i].a,t[i].t),px=null;for(var k=w.length-1;k>=0;k--){if(w[k][0]<=d){if(d-w[k][0]<=10)px=w[k][1];break}}
    if(px>0)out.push(px*sh/s)}return out}
/* pares do mesmo subsetor com P/L positivo e razoável (sem a própria ação) */
function sgPares(tk){var c=MD.d&&MD.d.cat,p=c&&c.a&&c.a[tk],r=[];if(!p)return r;
  Object.keys(c.a).forEach(function(k){if(k===tk||c.a[k][1]!==p[1]||c.a[k][2]!==p[2])return;var F=fundOf(k);if(F&&F.pl>2&&F.pl<60)r.push([k,F.pl])});return r}
function sgCalc(D,P,tk,Fu){var nm=fxNorm(D);if(!nm.ok)return nm;var kind=sgKind(tk);
  var sh=Fu&&Fu.pvp>0&&Fu.pl_r>0&&P>0?Fu.pvp*Fu.pl_r/P:null;if(!sh)return {ok:false,motivo:'sem número de ações para calcular o lucro por ação'};
  if(Fu.pl>0){var lm=Fu.pvp*Fu.pl_r/Fu.pl,rz=nm.last12/lm;if(!(rz>0.5&&rz<2))return {ok:false,motivo:'lucro da CVM não bate com o P/L do mercado (plano de contas estranho)'}}
  var L0=nm.anual/sh,ph=sgPlHist(D,sh,tk),fonte='historico',pares=null,mult;
  if(ph.length>=SGMIN)mult=[fxPct(ph,0.25),fxPct(ph,0.5),fxPct(ph,0.75)];
  else{pares=sgPares(tk);if(pares.length>=SGMIN-2){fonte='setor';var pv=pares.map(function(x){return x[1]});mult=[fxPct(pv,0.25),fxPct(pv,0.5),fxPct(pv,0.75)]}
    else return {ok:false,motivo:'sem histórico de preço ('+ph.length+' de '+SGMIN+' trimestres) e sem pares suficientes no setor ('+pares.length+' de '+(SGMIN-2)+')'}}
  if(!(mult[0]>=SGPLMIN&&mult[2]<=SGPLMAX))return {ok:false,motivo:'P/L alvo implausível ('+num(mult[0],1)+'× a '+num(mult[2],1)+'×; aceito de '+SGPLMIN+'× a '+SGPLMAX+'×)'};
  var pr=[{n:'Conservador',pl:mult[0]},{n:'Central',pl:mult[1]},{n:'Otimista',pl:mult[2]}];pr.forEach(function(c){c.v=c.pl*L0});
  var trap=fxTrap(D),trap2=trap==='lucro'?'lucro':null,cen=pr[1].v;if(trap2){cen=(pr[0].v+pr[1].v)/2;pr[1].v=cen}
  var w=FXW,esp=(w[0]*pr[0].v+w[1]*pr[1].v+w[2]*pr[2].v)/100,cons=pr[0].v,rel=P/cons-1,
    dps=Fu.dy>0?Fu.dy*P/100:null,pay=dps!=null&&L0>0?dps/L0:null,ds=dps!=null?Math.min(dps,L0):null;
  return {ok:true,seg:true,kind:kind,nm:nm,pr:pr,P:P,L0:L0,cons:cons,cen:cen,oti:pr[2].v,esp:esp,espPct:esp/P-1,ms:(cons-P)/cons,trap:trap2,fonte:fonte,pts:ph.length,pares:pares&&pares.slice(0,8),
    plHoje:Fu.pl>0?Fu.pl:null,dps:dps,pay:pay,divSust:ds,ySust:ds!=null?ds/P:null,
    est:rel<=0?'abaixo':rel<=FXTOL?'perto':'acima',opp:rel<=FXTOL}}
function sgSaude(o){var f=o&&o.fx;if(!f||!f.ok||!f.seg)return null;var fl=[],mot=[],D=fxDoc(o.tk);
  if(f.trap)fl.push('queda'),mot.push('lucro caiu 3 trimestres seguidos (possível armadilha de valor)');
  if(f.pay!=null&&f.pay>SGPAY)fl.push('payout'),mot.push('payout de '+Math.round(f.pay*100)+'% do lucro normalizado (acima de 100%)');
  var ult=D&&D.t?D.t.slice(-4).map(hiQ):[],at=D&&(D.nr||[]).filter(function(n){return n.tipo==='alto'&&ult.indexOf(n.q)>=0})[0];
  if(at)fl.push('atipico'),mot.push('lucro recente com trimestre acima do normal ('+at.q+')');
  return {seg:true,m:{},f:fl,mot:mot,n:fl.length,desc:finNao(o.tk).concat(f.pay==null?['payout']:[]),pay:f.pay}}
function sgRiscos(o){var f=o.fx,r=[];if(!f||!f.ok)return r;var sd=o.sd||sgSaude(o);
  if(f.trap)r.push('o lucro caiu 3 trimestres seguidos');
  if(sd&&sd.f.indexOf('payout')>=0)r.push('paga mais do que o lucro normalizado (payout acima de 100%)');
  if(sd&&sd.f.indexOf('atipico')>=0)r.push('o lucro recente tem um trimestre acima do normal, que pode não se repetir');
  if(f.plHoje!=null&&f.plHoje>f.pr[2].pl)r.push('o P/L de hoje ('+num(f.plHoje,1)+'×) já está acima do que a ação costuma negociar ('+num(f.pr[2].pl,1)+'×)');
  if(o.d&&o.d.k&&o.d.k.hi){var dd=o.d.price/o.d.k.hi-1;if(dd<=-0.15)r.push('o preço já caiu '+Math.round(Math.abs(dd*100))+'% da máxima do ano: pode estar barato por um motivo')}
  r.push('não avaliados (não temos esses dados): '+fjoin(finNao(o.tk)));return r.slice(0,3)}
function sgSaudeRow(o){var s=o.sd,h='';
  if(s.n>=1)h+='<div class="fql"><b class="opw">⚠ Saúde: '+esc(s.mot.join('; '))+'</b> <small class="muted">('+s.n+' alerta'+(s.n>1?'s':'')+(s.n>=2?' — por isso está em verificação':'')+')</small></div>';
  h+='<div class="fql muted"><small>Não avaliado: '+esc(s.desc.join(', '))+'. Por isso a confiança do dado nunca é alta.</small></div>';
  if(o.fx&&o.fx.ok){var r=sgRiscos(o);h+='<div class="fql"><span><b>O que pode dar errado:</b> '+esc(r.join('; '))+'.</span></div>'}
  return h}
function sgSaudePrem(o){var s=o.sd,f=o.fx,q=function(ok,t){return '<li>'+rkLvl(ok===null?'at':ok?'ok':'al')+'<div><p style="margin:0;color:var(--fg)">'+t+'</p></div></li>'};
  return '<ul class="rkl fqs"><li><b>Saúde (o que o app consegue calcular)</b></li>'+
    q(!f.trap,'Tendência: '+(f.trap?'lucro caiu 3 trimestres seguidos.':'sem queda de 3 trimestres seguidos no lucro.'))+
    q(f.pay==null?null:f.pay<=SGPAY,'Payout sobre o lucro normalizado: '+(f.pay==null?'sem dado.':Math.round(f.pay*100)+'% (alerta acima de 100%).'))+
    q(s.f.indexOf('atipico')<0,'Lucro recente: '+(s.f.indexOf('atipico')<0?'sem trimestre muito acima do normal.':'tem trimestre acima do normal, que pode não se repetir.'))+
    q(null,'Não avaliado, porque o app não tem o dado: '+esc(finNao(o.tk).join(', '))+'.')+'</ul>'}
function sgPrem(f){var F=f.F,nm=f.nm,pr=f.pr,td=function(fn){return pr.map(function(c){return '<td class="num">'+fn(c)+'</td>'}).join('')};
  return '<div class="fqp"><p class="note" style="margin:0 0 6px"><b>Lucro normalizado</b>: mediana de '+nm.usados+' trimestres ('+nm.n+' no histórico, até '+esc(nm.ref)+')'+(nm.excl.length?', sem os atípicos ('+esc(nm.excl.join(', '))+')':'')+' = '+qfmt(nm.med)+' por trimestre, '+qfmt(nm.anual)+' por ano = <b>'+F.format(f.L0)+'</b> por ação. Últimos 12 meses no balanço: '+qfmt(nm.last12)+'.</p>'+
    '<div class="atsc"><table class="tb"><thead><tr><th></th>'+pr.map(function(c){return '<th>'+c.n+'</th>'}).join('')+'</tr></thead><tbody>'+
    '<tr><td>P/L alvo</td>'+td(function(c){return num(c.pl,1)+'×'})+'</tr>'+
    '<tr><td>Valor por ação</td>'+td(function(c){return '<b>'+F.format(c.v)+'</b>'})+'</tr></tbody></table></div>'+
    '<p class="note" style="margin:6px 0 0">Valor por ação = lucro normalizado por ação × P/L alvo. '+(f.fonte==='historico'?'O P/L alvo vem do P/L histórico da própria ação ('+f.pts+' fins de trimestre: preço do dia ÷ lucro de 12 meses por ação): conservador = percentil 25, central = mediana, otimista = percentil 75.':'Sem histórico de preço suficiente, o P/L alvo vem do P/L de hoje dos pares do mesmo subsetor ('+f.pares.map(function(x){return esc(x[0])+' '+num(x[1],1)+'×'}).join(', ')+'): percentil 25, mediana e percentil 75.')+' O conservador muda só 1 coisa em relação ao central: o P/L (percentil 25); o lucro é o mesmo nos três. P/L de hoje: '+(f.plHoje!=null?num(f.plHoje,1)+'×':'sem dado')+'.</p>'+
    '<p class="note" style="margin:6px 0 0"><b>Dividendos</b>: hoje '+(f.dps!=null?F.format(f.dps)+' por ação nos últimos 12 meses ('+Math.round(f.dps/f.P*1000)/10+'% do preço)':'sem dado')+(f.pay!=null?', ou '+Math.round(f.pay*100)+'% do lucro normalizado por ação. Sustentável (no máximo o que o lucro normalizado paga): '+F.format(f.divSust)+' por ação, '+num(f.ySust*100,1)+'% do preço.':'.')+'</p>'+
    '<p class="anv" style="margin:8px 0 2px"><b>Retorno esperado</b>: média dos 3 cenários com pesos '+FXW.join('/')+' = <b class="num">'+F.format(f.esp)+'</b> (<b class="num '+(f.espPct>=0?'gain':'loss')+'">'+csPc(f.espPct*100)+'</b> sobre o preço de hoje, '+F.format(f.P)+').</p>'+
    '<p class="note" style="margin:0">Vira ideia só se o preço estiver abaixo do conservador ou até '+Math.round(FXTOL*100)+'% acima dele. '+(f.trap?'<b class="hiw">Possível armadilha de valor: o lucro caiu 3 trimestres seguidos, então o cenário central foi rebaixado (média entre conservador e central).</b> ':'')+esc(finNaoK(f.kind).join(', '))+' não entram na conta. É uma estimativa com premissas simples, não garantia.</p></div>'}
