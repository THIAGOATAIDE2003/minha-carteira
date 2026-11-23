/* Aporte · js/banco.js — Preço justo em FAIXA para BANCOS (1.73.0, Etapa 6 parte A).
   Bancos não têm "lucro × múltiplo" confiável: o valor vem do P/VP justo = (ROE − g) ÷ (custo de capital − g), vezes o patrimônio por ação.
   Só usa o histórico da CVM (ROE de 12 meses de cada trimestre, patrimônio, lucro) e os mesmos g e custo de capital das outras empresas.
   Tudo é conta feita por código; nada vem de IA. Não mexe no stkAna. Outras financeiras (seguradoras, bolsa) ficam para a parte B. */
var BKMIN=8,        /* mínimo de trimestres normais com ROE */
    BKROEMAX=50,    /* ROE acima disso (mediana, p75 ou último) = dado suspeito, sem faixa */
    BKAMP=40,       /* ROE que varia mais de 40 p.p. entre os trimestres = plano de contas estranho */
    BKGMAX=6,       /* teto do crescimento perpétuo g dos bancos (% a.a.) */
    BKSPR=4,        /* custo de capital precisa ser pelo menos 4 p.p. acima de g */
    BKPAY=1;        /* payout acima de 100% = alerta */
function bkIs(tk){return setorOf(tk).s==='Bancos'}
function bkTrap(D){var t=(D&&D.t||[]).slice(-4);if(t.length<4)return null;
  var caiu=function(k){return t.every(function(r){return r[k]!=null})&&t[0][k]>t[1][k]&&t[1][k]>t[2][k]&&t[2][k]>t[3][k]};
  if(caiu('luc'))return 'lucro';if(caiu('roe'))return 'ROE';return null}
/* ROE sustentável: mediana do ROE (12m) dos últimos 12 trimestres, sem os atípicos marcados pelo robô; p25 e p75 para os outros cenários */
function bkNorm(D){if(!D||!D.t||!D.t.length)return {ok:false,motivo:'sem histórico da CVM'};
  var t=D.t.slice(-12),nr={};(D.nr||[]).forEach(function(n){nr[n.q]=1});
  var inc=t.filter(function(r){return r.roe!=null&&isFinite(r.roe)&&!nr[hiQ(r)]}),excl=t.filter(function(r){return nr[hiQ(r)]}).map(hiQ);
  if(t.length<BKMIN||inc.length<BKMIN)return {ok:false,motivo:'poucos trimestres com ROE ('+inc.length+', precisa de '+BKMIN+')'};
  var u=t[t.length-1];if(!(u.pl>0))return {ok:false,motivo:'patrimônio do último balanço não positivo (plano de contas estranho)'};
  var v=inc.map(function(r){return r.roe}),mx=Math.max.apply(null,v),mn=Math.min.apply(null,v),p25=fxPct(v,0.25),med=fxPct(v,0.5),p75=fxPct(v,0.75);
  if(!(med>0))return {ok:false,motivo:'ROE sustentável não positivo ('+num(med,1)+'%)'};
  if(med>BKROEMAX||p75>BKROEMAX||(u.roe!=null&&u.roe>BKROEMAX))return {ok:false,motivo:'ROE implausível para banco (acima de '+BKROEMAX+'%): confira o plano de contas'};
  if(mx-mn>BKAMP)return {ok:false,motivo:'ROE varia '+num(mx-mn,0)+' p.p. entre os trimestres (plano de contas estranho)'};
  return {ok:true,n:t.length,usados:inc.length,excl:excl,p25:p25,med:med,p75:p75,ult:u.roe!=null?u.roe:null,pl:u.pl,ref:hiQ(u)}}
/* P/VP justo (Gordon): quanto o patrimônio vale por real, dado o ROE, o crescimento e o custo de capital */
function bkPvp(roe,g,r){return Math.max(0,(roe-g)/(r-g))}
function bkCalc(D,P,N,tk,Fu){var nm=bkNorm(D);if(!nm.ok)return nm;
  var sh=Fu&&Fu.pvp>0&&Fu.pl_r>0&&P>0?Fu.pvp*Fu.pl_r/P:null;if(!sh)return {ok:false,motivo:'sem número de ações para calcular o patrimônio por ação'};
  var rz=nm.pl/Fu.pl_r;if(!(rz>0.5&&rz<2))return {ok:false,motivo:'patrimônio da CVM não bate com o do mercado (plano de contas estranho)'};
  var cfg=VALP[tk]||{},sel=MD.d&&MD.d.idx&&MD.d.idx.selic&&MD.d.idx.selic.last,
    g0=cfg.g!=null?cfg.g:Math.max(0,Math.min(10,N&&N.cr5!=null?Math.round(N.cr5):5)),rb=cfg.r!=null?cfg.r:Math.max(12,Math.round((sel||13)+1)),
    g=Math.min(g0,BKGMAX,rb-BKSPR),vpa=nm.pl/sh,
    pr=[{n:'Conservador',roe:nm.p25,g:g,r:rb},{n:'Central',roe:nm.med,g:g,r:rb},{n:'Otimista',roe:nm.p75,g:g,r:Math.max(8,rb-1)}];
  pr.forEach(function(c){c.pvp=bkPvp(c.roe,c.g,c.r);c.v=c.pvp*vpa});
  var trap=bkTrap(D),cen=pr[1].v;if(trap){cen=(pr[0].v+pr[1].v)/2;pr[1].v=cen}
  var w=FXW,esp=(w[0]*pr[0].v+w[1]*pr[1].v+w[2]*pr[2].v)/100,cons=pr[0].v,rel=P/cons-1;
  if(!(cons>0))return {ok:false,motivo:'cenário conservador sem valor (ROE abaixo do crescimento)'};
  var pay=Fu.dy>0&&Fu.pl>0?Fu.dy*Fu.pl/100:null;
  return {ok:true,bank:true,nm:nm,pr:pr,P:P,vpa:vpa,gcap:g0>g?g0:null,cons:cons,cen:cen,oti:pr[2].v,esp:esp,espPct:esp/P-1,ms:(cons-P)/cons,trap:trap,pvpHoje:P/vpa,pay:pay,r:rb,
    est:rel<=0?'abaixo':rel<=FXTOL?'perto':'acima',opp:rel<=FXTOL}}
/* saúde do banco: só 3 alertas que conseguimos calcular; o que não temos fica "não avaliado" e rebaixa a confiança (opConf) */
var BKNAO=['inadimplência','Basileia','provisões'];
function bkSaude(o){var f=o&&o.fx;if(!f||!f.ok||!f.bank)return null;var fl=[],mot=[],nm=f.nm;
  if(nm.med<f.r)fl.push('roe'),mot.push('ROE sustentável ('+num(nm.med,1)+'%) abaixo do custo de capital ('+num(f.r,0)+'%)');
  if(f.trap)fl.push('queda'),mot.push((f.trap==='ROE'?'ROE':'lucro')+' caiu 3 trimestres seguidos (possível armadilha de valor)');
  if(f.pay!=null&&f.pay>BKPAY)fl.push('payout'),mot.push('payout de '+Math.round(f.pay*100)+'% (acima de 100%)');
  return {bank:true,m:{},f:fl,mot:mot,n:fl.length,desc:BKNAO.concat(f.pay==null?['payout']:[]),pay:f.pay}}
function bkRiscos(o){var f=o.fx,r=[];if(!f||!f.ok)return r;var sd=o.sd||bkSaude(o);
  if(sd&&sd.f.indexOf('roe')>=0)r.push('o ROE sustentável não cobre o custo de capital');
  if(f.trap)r.push((f.trap==='ROE'?'o ROE':'o lucro')+' caiu 3 trimestres seguidos');
  if(sd&&sd.f.indexOf('payout')>=0)r.push('paga mais do que lucra (payout acima de 100%)');
  if(f.nm.ult!=null&&f.nm.ult<f.nm.p25)r.push('o ROE de agora ('+num(f.nm.ult,1)+'%) está abaixo do que o banco costuma entregar');
  if(o.d&&o.d.k&&o.d.k.hi){var dd=o.d.price/o.d.k.hi-1;if(dd<=-0.15)r.push('o preço já caiu '+Math.round(Math.abs(dd*100))+'% da máxima do ano: pode estar barato por um motivo')}
  r.push('inadimplência, Basileia e provisões não foram avaliadas (não temos esses dados)');return r.slice(0,3)}
function bkSaudeRow(o){var s=o.sd,h='';
  if(s.n>=1)h+='<div class="fql"><b class="opw">⚠ Saúde do banco: '+esc(s.mot.join('; '))+'</b> <small class="muted">('+s.n+' alerta'+(s.n>1?'s':'')+(s.n>=2?' — por isso está em verificação':'')+')</small></div>';
  h+='<div class="fql muted"><small>Não avaliado: '+esc(s.desc.join(', '))+'. Por isso a confiança do dado nunca é alta.</small></div>';
  if(o.fx&&o.fx.ok){var r=bkRiscos(o);h+='<div class="fql"><span><b>O que pode dar errado:</b> '+esc(r.join('; '))+'.</span></div>'}
  return h}
function bkSaudePrem(o){var s=o.sd,f=o.fx,nm=f.nm,q=function(ok,t){return '<li>'+rkLvl(ok===null?'at':ok?'ok':'al')+'<div><p style="margin:0;color:var(--fg)">'+t+'</p></div></li>'};
  return '<ul class="rkl fqs"><li><b>Saúde do banco (o que o app consegue calcular)</b></li>'+
    q(nm.med>=f.r,'ROE sustentável: '+num(nm.med,1)+'% contra custo de capital de '+num(f.r,0)+'% (alerta se ficar abaixo).')+
    q(!f.trap,'Tendência: '+(f.trap?(f.trap==='ROE'?'ROE':'lucro')+' caiu 3 trimestres seguidos.':'sem queda de 3 trimestres seguidos no lucro nem no ROE.'))+
    q(f.pay==null?null:f.pay<=BKPAY,'Payout (dividendos ÷ lucro): '+(f.pay==null?'sem dado.':Math.round(f.pay*100)+'% (alerta acima de 100%).'))+
    q(null,'Não avaliado, porque o app não tem o dado: '+esc(BKNAO.join(', '))+'. Confira nos relatórios do banco.')+'</ul>'}
function bkPrem(f){var F=f.F,nm=f.nm,pr=f.pr,td=function(fn){return pr.map(function(c){return '<td class="num">'+fn(c)+'</td>'}).join('')},p1=function(v){return pf.format(v)+'%'};
  return '<div class="fqp"><p class="note" style="margin:0 0 6px"><b>ROE sustentável</b>: mediana do ROE de 12 meses em '+nm.usados+' trimestres ('+nm.n+' no histórico, até '+esc(nm.ref)+')'+(nm.excl.length?', sem os atípicos ('+esc(nm.excl.join(', '))+')':'')+' = '+p1(nm.med)+'. Patrimônio por ação: '+F.format(f.vpa)+' (P/VP de hoje: '+num(f.pvpHoje,2)+'×).</p>'+
    '<div class="atsc"><table class="tb"><thead><tr><th></th>'+pr.map(function(c){return '<th>'+c.n+'</th>'}).join('')+'</tr></thead><tbody>'+
    '<tr><td>ROE (% a.a.)</td>'+td(function(c){return p1(c.roe)})+'</tr>'+
    '<tr><td>Crescimento g (% a.a.)</td>'+td(function(c){return p1(c.g)})+'</tr>'+
    '<tr><td>Custo de capital (% a.a.)</td>'+td(function(c){return p1(c.r)})+'</tr>'+
    '<tr><td>P/VP justo</td>'+td(function(c){return num(c.pvp,2)+'×'})+'</tr>'+
    '<tr><td>Valor por ação</td>'+td(function(c){return '<b>'+F.format(c.v)+'</b>'})+'</tr></tbody></table></div>'+
    '<p class="note" style="margin:6px 0 0">P/VP justo = (ROE − g) ÷ (custo de capital − g); valor por ação = P/VP justo × patrimônio por ação. O conservador muda só 1 coisa em relação ao central: o ROE de um período fraco (percentil 25 do histórico); g e custo de capital são os mesmos. O otimista usa o ROE de um período forte (percentil 75) e custo de capital 1 ponto menor. Crescimento g'+(f.gcap!=null?' limitado a '+BKGMAX+'% para bancos (o histórico sugeria '+f.gcap+'%)':' pelo mesmo critério das outras empresas')+'; custo de capital pela Selic + 1 ponto (mínimo 12%).</p>'+
    '<p class="anv" style="margin:8px 0 2px"><b>Retorno esperado</b>: média dos 3 cenários com pesos '+FXW.join('/')+' = <b class="num">'+F.format(f.esp)+'</b> (<b class="num '+(f.espPct>=0?'gain':'loss')+'">'+csPc(f.espPct*100)+'</b> sobre o preço de hoje, '+F.format(f.P)+').</p>'+
    '<p class="note" style="margin:0">Vira ideia só se o preço estiver abaixo do conservador ou até '+Math.round(FXTOL*100)+'% acima dele. '+(f.trap?'<b class="hiw">Possível armadilha de valor: o '+(f.trap==='ROE'?'ROE':'lucro')+' caiu 3 trimestres seguidos, então o cenário central foi rebaixado (média entre conservador e central).</b> ':'')+'Inadimplência, Basileia e provisões não entram na conta. É uma estimativa com premissas simples, não garantia.</p></div>'}
