/* Aporte · vendas-resultado.js — "Resultado das vendas" (grupo enc). Lê compute(); resultado por ação = rA+rF, antes das taxas. */
var VR_PM='É a média do que você pagou, ponderada pela quantidade. Comprou 10 a R$ 10 e 10 a R$ 20: o preço médio é R$ 15. Vender a R$ 18 dá +R$ 3 por ação.';
function vrQ(n){return String(+(+n).toFixed(4)).replace('.',',')}
function vrRow(p){
  var us=p.market==='US',m=function(v){return us?usd.format(v):brl.format(v)},g=p.rA+p.rF,z=Math.abs(g)<0.005,n=p.sN||1,pv=p.sP/p.sQ,pg=p.sC/p.sQ,full=p.qty<1e-9;
  return '<li><span><b>'+esc(p.ticker)+'</b> <span class="tag">'+(full?'Vendida por completo':'Vendida em parte · ainda tenho '+vrQ(p.qty))+'</span>'+
    '<br><span class="muted small">Vendi '+vrQ(p.sQ)+(p.sQ===1?' ação':' ações')+(n>1?' (em '+n+' vendas)':'')+' a '+m(pv)+' em média.</span>'+
    '<br><span class="muted small">Eu tinha pago '+m(pg)+' em média. Resultado: '+(z?'ficou no zero a zero':g>0?'ganho de '+brl.format(g):'perda de '+brl.format(-g))+'.</span>'+
    (us?'<br><span class="muted small">Em reais: '+sgn(p.rA)+' do preço da ação e '+sgn(p.rF)+' do dólar.</span>':'')+'</span><span class="num '+cls(g)+'">'+sgn(g)+'</span></li>';
}
function vendasRes(R,rfc){
  var T=R.tot,all=R.held.concat(R.closed).map(function(x){return x.p||x}),ac=all.filter(function(p){return p.sQ>0}),rows=ac.map(function(p){return {g:p.rA+p.rF,h:vrRow(p)}});
  rfc.forEach(function(c){rows.push({g:c.realized,h:'<li><span><b>'+esc(c.t.ticker)+'</b> <span class="tag">Renda fixa</span><br><span class="muted small">Resgate. O valor já está sem IOF e sem IR.</span></span><span class="num '+cls(c.realized)+'">'+sgn(c.realized)+'</span></li>'})});
  if(!rows.length)return null;
  rows.sort(function(a,b){return b.g-a.g});
  var gan=0,per=0,rz=T.rA+T.rF+T.rfR,pz=T.uA+T.uF+T.rfU,vd=R.closed.map(function(x){return x.p||x}).filter(function(p){return (p.div||0)>0.005});
  rows.forEach(function(r){if(r.g>0.005)gan+=r.g;else if(r.g<-0.005)per+=r.g});
  var body='<p class="note" style="margin:10px 0">Aqui entra só o que você ganhou ou perdeu ao vender. Dividendos não entram (ficam em Proventos). Os valores são antes das taxas da B3. '+bal(VR_PM,'<span class="bi">i</span>','Preço médio')+' <span class="muted small">preço médio</span></p>'+
    '<ul class="calc">'+rows.map(function(r){return r.h}).join('')+
    '<li><span>Ganhos nas vendas</span><span class="num '+cls(gan)+'">'+sgn(gan)+'</span></li><li><span>Perdas nas vendas</span><span class="num '+cls(per)+'">'+sgn(per)+'</span></li><li class="tot"><span>= Resultado das vendas</span><span class="num '+cls(rz)+'">'+sgn(rz)+'</span></li></ul>'+
    '<h3 style="margin:14px 0 4px">Como isso entra no seu Lucro total</h3><ul class="calc">'+
    '<li><span>Ações e renda fixa que você ainda tem</span><span class="num '+cls(pz)+'">'+sgn(pz)+'</span></li>'+
    '<li><span>+ Resultado das vendas</span><span class="num '+cls(rz)+'">'+sgn(rz)+'</span></li>'+
    '<li><span>+ Proventos recebidos</span><span class="num '+cls(T.div)+'">'+sgn(T.div)+'</span></li>'+
    (T.fees>0.005?'<li><span>− Taxas da B3 (compras e vendas)</span><span class="num loss">'+sgn(-T.fees)+'</span></li>':'')+
    '<li class="tot"><span>= Lucro total</span><span class="num '+cls(T.gain)+'">'+sgn(T.gain)+'</span></li></ul>';
  if(vd.length){var dv=0;vd.forEach(function(p){dv+=p.div});vd.sort(function(a,b){return b.div-a.div});
    body+='<p class="note" style="margin-top:8px">Dos proventos, '+brl.format(dv)+' vieram de ações que você não tem mais ('+vd.slice(0,5).map(function(p){return esc(p.ticker)+' '+brl.format(p.div)}).join(', ')+(vd.length>5?' e mais '+(vd.length-5):'')+'). Eles não entram nas vendas: estão em Proventos e já fazem parte do Lucro total.</p>'}
  var soma=pz+rz+T.div-T.fees;if(Math.abs(soma-T.gain)>0.01)body+='<p class="warn">A conta não fecha em '+brl.format(Math.abs(soma-T.gain))+'. Revise os lançamentos.</p>';
  return {sub:rows.length+' com venda · só o ganho ou a perda de vender',body:body,tot:rz};
}
