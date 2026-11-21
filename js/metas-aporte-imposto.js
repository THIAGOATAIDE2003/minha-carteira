/* Aporte · js/metas-aporte-imposto.js — imposto de renda, aporte, metas de patrimônio e relatório de IR.
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
/* imposto de renda: ações e FIIs no Brasil (swing trade), proventos e bens para a declaração */
var FIIS={HGLG11:1},IRY=null;
function isFII(tk){return !!FIIS[tk]}
function irData(){
  var ts=S.trades.filter(function(t){return t.market==='BR'&&(t.side==='buy'||t.side==='sell')}).sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:(a.side==='buy'?-1:1)});
  var pos={},mo={},dts={},warn=[];
  ts.forEach(function(t){
    var p=pos[t.ticker]||(pos[t.ticker]={q:0,c:0});(dts[t.ticker+'|'+t.date]=dts[t.ticker+'|'+t.date]||{})[t.side]=1;
    if(t.side==='buy'){p.q+=t.qty;p.c+=t.qty*ePx(t);return}
    var q=Math.min(t.qty,p.q);if(q<=0)return;var avg=p.c/p.q,g=q*(ePx(t)-avg),m=t.date.slice(0,7),k=isFII(t.ticker)?'fii':'acao';
    var r=mo[m]||(mo[m]={m:m,acao:{v:0,g:0,it:[]},fii:{v:0,g:0,it:[]}});r[k].v+=q*t.price;r[k].g+=g;r[k].it.push({tk:t.ticker,d:t.date,q:q,v:q*t.price,g:g});
    p.c-=avg*q;p.q-=q;if(p.q<1e-9){p.q=0;p.c=0}
  });
  Object.keys(dts).forEach(function(k){if(dts[k].buy&&dts[k].sell)warn.push(k.split('|')[0]+' em '+fmtDate(k.split('|')[1]))});
  var pa=0,pf=0,rows=Object.keys(mo).sort().map(function(m){
    var r=mo[m],a=r.acao,f=r.fii;
    r.isento=a.v<=20000;
    if(r.isento){if(a.g<0)pa+=-a.g;r.baseA=0}else{var b=a.g-pa;if(b>0){r.baseA=b;pa=0}else{r.baseA=0;pa=-b}}
    var bf=f.g-pf;if(f.v>0||f.g){if(bf>0){r.baseF=bf;pf=0}else{r.baseF=0;pf=-bf}}else r.baseF=0;
    r.imp=r.baseA*0.15+r.baseF*0.20;r.pa=pa;r.pf=pf;
    var y=+m.slice(0,4),mm=+m.slice(5,7)+1;if(mm>12){mm=1;y++}var ld=new Date(Date.UTC(y,mm,0));while(ld.getUTCDay()===0||ld.getUTCDay()===6)ld.setUTCDate(ld.getUTCDate()-1);r.venc=ld.toISOString().slice(0,10);
    return r});
  return {rows:rows,pa:pa,pf:pf,warn:warn};
}
function bensEm(dt){
  var pos={};S.trades.slice().sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0}).forEach(function(t){
    if(t.date>dt)return;
    if(t.side==='rf'){pos['rf'+t.id]={tk:t.ticker,rf:1,q:1,c:t.price,mk:'RF'};return}
    if(t.side==='rfout'){delete pos['rf'+t.ref];return}
    if(t.side!=='buy'&&t.side!=='sell')return;
    var p=pos[t.ticker]||(pos[t.ticker]={tk:t.ticker,mk:t.market,q:0,c:0,cu:0});var F=t.market==='US'?t.fx:1;
    if(t.side==='buy'){p.q+=t.qty;p.c+=t.qty*ePx(t)*F;p.cu+=t.qty*ePx(t)}else{var q=Math.min(t.qty,p.q);if(q<=0)return;p.c-=p.c*q/p.q;p.cu-=p.cu*q/p.q;p.q-=q}
  });
  return Object.keys(pos).map(function(k){return pos[k]}).filter(function(p){return p.q>1e-9});
}

/* alocação alvo e próximo aporte (só compras, sem vender nada) */
var APV='';try{if(S.perfil&&S.perfil.ap>0)APV=String(S.perfil.ap).replace('.',',')}catch(e){}
function splitNeed(cur,tgt,amt){
  var tot=0,ks=Object.keys(tgt);ks.forEach(function(k){tot+=cur[k]||0});
  var after=tot+amt,need={},sn=0;ks.forEach(function(k){need[k]=Math.max(0,tgt[k]/100*after-(cur[k]||0));sn+=need[k]});
  var out={};ks.forEach(function(k){out[k]=sn<=amt?need[k]+(amt-sn)*tgt[k]/100:(sn?amt*need[k]/sn:0)});return out;
}
function renderApo(){
  var el=$('apotab');if(!el)return;
  var R=compute(),T=R.tot,br=R.held.filter(function(x){return x.p.market==='BR'}),us=R.held.filter(function(x){return x.p.market==='US'});
  var cur={BR:0,US:0,RF:T.rfV||0};br.forEach(function(x){cur.BR+=x.v});us.forEach(function(x){cur.US+=x.v});
  var tot=cur.BR+cur.US+cur.RF;if(!tot){setHtml(el,'<div class="panel"><p class="muted">Lance suas compras para montar a divisão.</p></div>');return}
  var A=S.alvos||{};var cl=A.classes||{BR:Math.round(cur.BR/tot*100),US:Math.round(cur.US/tot*100),RF:0};
  var adj=100-(cl.BR+cl.US+cl.RF);if(adj&&!S.alvos)cl.US+=adj;
  var inB=A.br||{};br.forEach(function(x){if(inB[x.p.ticker]==null)inB[x.p.ticker]=+(100/br.length).toFixed(1)});
  var nm={BR:'Brasil (ações)',US:'EUA (VT)',RF:'Renda fixa'},h='';
  var row=function(k,lab,c,tg,id){return '<span>'+lab+'<br><span class="muted small">hoje '+pf.format(c)+'%</span></span><input id="'+id+'" inputmode="decimal" value="'+String(tg).replace('.',',')+'" aria-label="'+lab+' alvo em %"><div class="alvbar"><i style="width:'+Math.min(100,c)+'%"></i><b style="left:calc('+Math.min(100,tg)+'% - 1px)"></b></div>'};
  h+='<div class="panel"><h2>Sua divisão ideal</h2><p class="note exp" style="margin:0 0 12px">Quanto de cada parte você quer ter, em %. A barra azul é como está hoje; o traço dourado é o seu alvo.'+(S.alvos?'':' Preenchi com a divisão de hoje, ajuste e salve.')+'</p>'+(function(){var a=pfAlvo();if(!a||(cl.BR===a.BR&&cl.US===a.US&&cl.RF===a.RF))return '';return '<div class="pfsug"><span>Pelo seu perfil: <b>Brasil '+a.BR+'%</b>, <b>exterior '+a.US+'%</b>, <b>renda fixa '+a.RF+'%</b></span><button type="button" class="link" id="al-pf">Usar</button></div>'})()+'<div class="alv">'+
    ['BR','US','RF'].map(function(k){return row(k,nm[k],cur[k]/tot*100,cl[k],'al-'+k)}).join('')+'</div>'+
    (br.length>1?'<details><summary>Divisão dentro do Brasil</summary><p class="note" style="margin:8px 0 10px">Quanto cada ação representa dentro da parte do Brasil. Começa igual para todas.</p><div class="alv">'+
      br.map(function(x){return row('',esc(x.p.ticker),cur.BR?x.v/cur.BR*100:0,inB[x.p.ticker],'ab-'+x.p.ticker)}).join('')+'</div></details>':'')+
    '<div style="display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap"><button class="btn small" type="button" id="al-save">Salvar divisão</button><span class="msg" id="al-msg"></span></div></div>';
  h+='<div class="panel"><h2>Quanto vai aportar?</h2><div style="display:flex;gap:8px;margin-top:4px"><input id="apo-v" inputmode="decimal" placeholder="1.000,00" value="'+esc(APV)+'" aria-label="Valor do aporte em reais"><button class="btn" type="button" id="apo-go">Calcular</button></div><div id="apo-res"></div></div>';
  h+=simPanel(R,tot);
  h+='<p class="note exp" style="margin:0 4px">O cálculo só sugere compras: coloca o dinheiro primeiro onde está mais abaixo do alvo, sem vender nada. Não é recomendação de investimento, é a conta da divisão que você escolheu.</p>';
  setHtml(el,h);if(APV)apoCalc();if(SIM.al)simCalc();
}
function apoCalc(){
  var raw=String($('apo-v').value||'').trim(),v=/^\d{1,3}(\.\d{3})+$/.test(raw)?parseFloat(raw.replace(/\./g,'')):parseNum(raw),out=$('apo-res');APV=raw;
  if(!(v>0)){setHtml(out,'<p class="msg err" style="margin-top:10px">Digite um valor, por exemplo 1.000.</p>');return}
  var R=compute(),T=R.tot,br=R.held.filter(function(x){return x.p.market==='BR'}),us=R.held.filter(function(x){return x.p.market==='US'});
  var cur={BR:0,US:0,RF:T.rfV||0};br.forEach(function(x){cur.BR+=x.v});us.forEach(function(x){cur.US+=x.v});
  var A=S.alvos||{},tot=cur.BR+cur.US+cur.RF,cl=A.classes||{BR:Math.round(cur.BR/tot*100),US:Math.round(cur.US/tot*100),RF:0};
  var sc=cl.BR+cl.US+cl.RF;cl={BR:cl.BR/sc*100,US:cl.US/sc*100,RF:cl.RF/sc*100};
  var dist=splitNeed(cur,cl,v),fx=(fxToday()||{}).rate,li=[];
  if(dist.BR>0.5&&br.length){
    var inB=(A.br||{}),tg={},cb={},s2=0;br.forEach(function(x){tg[x.p.ticker]=inB[x.p.ticker]!=null?inB[x.p.ticker]:100/br.length;s2+=tg[x.p.ticker];cb[x.p.ticker]=x.v});
    Object.keys(tg).forEach(function(k){tg[k]=tg[k]/s2*100});
    var db=splitNeed(cb,tg,dist.BR),left=0;
    br.forEach(function(x){var a=db[x.p.ticker];if(a<0.5)return;var px=x.P1,q=px?Math.floor(a/px):0;left+=a-q*px;
      li.push('<li><span><b>'+esc(x.p.ticker)+'</b><br><span class="muted small">'+(q?q+(q>1?' ações':' ação')+' a '+brl.format(px)+' = '+brl.format(q*px):'menos de 1 ação ('+brl.format(px)+' cada)')+'</span></span><span class="num">'+brl.format(a)+'</span></li>')});
    if(left>0.5)li.push('<li class="muted small"><span>Sobra por arredondar em ações inteiras</span><span class="num">'+brl.format(left)+'</span></li>');
  }
  if(dist.US>0.5&&us.length){var x=us[0],u=fx?dist.US/fx:0,q=x.P1?u/x.P1:0;
    li.push('<li><span><b>'+esc(x.p.ticker)+'</b><br><span class="muted small">'+(fx?usd.format(u)+' a R$ '+num(fx,4)+' ≈ '+num(q,4)+' cotas a '+usd.format(x.P1)+', antes do spread e IOF do câmbio':'')+'</span></span><span class="num">'+brl.format(dist.US)+'</span></li>')}
  if(dist.RF>0.5)li.push('<li><span><b>Renda fixa</b><br><span class="muted small">CDB, LCI ou LCA</span></span><span class="num">'+brl.format(dist.RF)+'</span></li>');
  var after={BR:cur.BR+dist.BR,US:cur.US+dist.US,RF:cur.RF+dist.RF},ta=tot+v;
  setHtml(out,'<ul class="calc" style="margin-top:14px">'+li.join('')+'<li class="tot"><span>Total</span><span class="num">'+brl.format(v)+'</span></li></ul>'+
    '<p class="note">Depois do aporte: Brasil '+pf.format(after.BR/ta*100)+'%, EUA '+pf.format(after.US/ta*100)+'%, Renda fixa '+pf.format(after.RF/ta*100)+'% (alvo '+pf.format(cl.BR)+'% / '+pf.format(cl.US)+'% / '+pf.format(cl.RF)+'%).</p>');
}
/* simulador de venda e troca: "quero esse ativo com X% da carteira, quantas ações vendo e onde reinvisto?" (só conta, não lança nada) */
var SIM={tk:'',al:'',dest:'td',nv:'',px:''};
function simPanel(R,tot){
  var hs=R.held.filter(function(x){return x.v>0});if(!hs.length)return '';
  if(!SIM.tk||!hs.some(function(x){return x.p.ticker===SIM.tk}))SIM.tk=hs.slice().sort(function(a,b){return b.v-a.v})[0].p.ticker;
  var opt=hs.map(function(x){return '<option value="'+esc(x.p.ticker)+'"'+(x.p.ticker===SIM.tk?' selected':'')+'>'+esc(x.p.ticker)+' — hoje '+pf.format(x.v/tot*100)+'%</option>'}).join('');
  var dopt='<option value="td"'+(SIM.dest==='td'?' selected':'')+'>Dividir entre as outras ações do Brasil que tenho</option>'+hs.filter(function(x){return x.p.market==='BR'}).map(function(x){return '<option value="'+esc(x.p.ticker)+'"'+(SIM.dest===x.p.ticker?' selected':'')+'>'+esc(x.p.ticker)+'</option>'}).join('')+'<option value="novo"'+(SIM.dest==='novo'?' selected':'')+'>Ação nova (digitar o código)</option>';
  return '<div class="panel" id="simbox"><h2>Simular venda e troca</h2><p class="note exp" style="margin:0 0 10px">Escolha o ativo, diga quantos % da carteira você quer que ele tenha e para onde iria o dinheiro. É só uma conta: não lança nada na sua carteira.</p>'+
    '<div class="alv" style="grid-template-columns:1fr">'+
    '<label class="muted small">Ativo que quer diminuir<select id="sim-tk">'+opt+'</select></label>'+
    '<label class="muted small">Quanto quer que ele tenha da carteira (%)<input id="sim-al" inputmode="decimal" placeholder="7" value="'+esc(SIM.al)+'"></label>'+
    '<label class="muted small">Onde reinvestir<select id="sim-dest">'+dopt+'</select></label>'+
    '<div id="sim-nvw" '+(SIM.dest==='novo'?'':'hidden')+'><label class="muted small">Código da ação nova<input id="sim-nv" placeholder="ex.: ITUB4" autocapitalize="characters" value="'+esc(SIM.nv)+'"></label>'+
    '<label class="muted small">Preço dela (só se o app não achar)<input id="sim-px" inputmode="decimal" placeholder="opcional" value="'+esc(SIM.px)+'"></label></div></div>'+
    '<button class="btn" type="button" id="sim-go" style="margin-top:10px">Simular</button><div id="sim-res"></div></div>';
}
function simPx(tk){var l=livePx(tk);if(l&&l.p>0)return l.p;var q=S.quotes[tk];return q&&q.price>0?q.price:0}
function simCalc(){
  var out=$('sim-res');if(!out)return;
  var g=function(id){var e=$(id);return e?e.value:''};
  SIM.tk=g('sim-tk');SIM.al=g('sim-al').trim();SIM.dest=g('sim-dest')||'td';SIM.nv=g('sim-nv').trim().toUpperCase();SIM.px=g('sim-px').trim();
  var nw=$('sim-nvw');if(nw)nw.hidden=SIM.dest!=='novo';
  var al=parseNum(SIM.al);if(!SIM.al){setHtml(out,'');return}
  if(!(al>=0&&al<100)){setHtml(out,'<p class="msg err" style="margin-top:10px">Digite um % entre 0 e 100, por exemplo 7.</p>');return}
  var R=compute(),T=R.tot,tot=T.value+(T.rfV||0);
  var x=R.held.filter(function(h){return h.p.ticker===SIM.tk})[0];if(!x||!tot)return;
  var cur=x.v/tot*100;
  if(al>=cur){setHtml(out,'<p class="note" style="margin-top:10px">'+esc(SIM.tk)+' já está com '+pf.format(cur)+'%, não precisa vender nada para chegar em '+pf.format(al)+'%.</p>');return}
  var pu=x.P1*x.F1,us=x.p.market==='US',X=(cur-al)/100*tot,q=us?Math.round(X/pu*1e4)/1e4:Math.max(1,Math.round(X/pu));
  q=Math.min(q,x.p.qty);var V=q*pu,li=[],imp=0,custo=0,nota='';
  if(us){var spr=V*VND.spr/100,iof=(V-spr)*VND.iof/100,ir=Math.max(0,V-x.p.cB*q/x.p.qty)*VND.ir/100;custo=spr+iof;imp=ir;
    nota='Dólar para real: spread '+pf.format(VND.spr)+'% e IOF '+pf.format(VND.iof)+'%; IR de '+pf.format(VND.ir)+'% sobre o lucro em reais (pago na declaração anual).'}
  else{var gain=q*(x.P1-x.P0),fii=isFII(x.p.ticker),aliq=fii?.20:(V>20000?.15:0);imp=Math.max(0,gain)*aliq;
    nota=fii?'FII: 20% sobre o lucro, sem isenção.':(V>20000?'Vendas de ações acima de R$ 20 mil no mês: 15% sobre o lucro.':'Vendas de ações até R$ 20 mil no mês são isentas de IR (conta só esta venda, sem outras do mês).')}
  var net=V-custo-imp;
  li.push('<li><span><b>Vender '+esc(SIM.tk)+'</b><br><span class="muted small">'+(us?num(q,4)+' cotas':q+(q>1?' ações':' ação'))+' a '+(us?usd.format(x.P1):brl.format(x.P1))+(us?' (≈ '+brl.format(pu)+' cada)':'')+'</span></span><span class="num">'+brl.format(V)+'</span></li>');
  if(custo>0.005)li.push('<li class="muted small"><span>Custos do câmbio (spread + IOF)</span><span class="num">− '+brl.format(custo)+'</span></li>');
  li.push('<li class="muted small"><span>Imposto estimado</span><span class="num">'+(imp>0.005?'− '+brl.format(imp):'R$ 0,00')+'</span></li>');
  li.push('<li class="tot"><span>Dinheiro para reinvestir</span><span class="num">'+brl.format(net)+'</span></li>');
  var dests=[],erro='';
  if(SIM.dest==='novo'){
    if(!/^[A-Z]{4}\d{1,2}$/.test(SIM.nv))erro='Digite o código da ação nova, por exemplo ITUB4.';
    else{var pn=simPx(SIM.nv)||parseNum(SIM.px);if(!(pn>0))erro='Não achei o preço de '+esc(SIM.nv)+'. Digite o preço no campo acima.';else dests.push({tk:SIM.nv,px:pn,novo:1,v:0})}}
  else if(SIM.dest==='td'){R.held.filter(function(h){return h.p.market==='BR'&&h.p.ticker!==SIM.tk}).forEach(function(h){dests.push({tk:h.p.ticker,px:h.P1,v:h.v})});if(!dests.length)erro='Você não tem outra ação do Brasil. Escolha "Ação nova".'}
  else{var h=R.held.filter(function(z){return z.p.ticker===SIM.dest})[0];if(h&&h.p.ticker!==SIM.tk)dests.push({tk:h.p.ticker,px:h.P1,v:h.v});else erro='Escolha um destino diferente do ativo que está vendendo.'}
  if(erro){setHtml(out,'<ul class="calc" style="margin-top:14px">'+li.join('')+'</ul><p class="msg err">'+erro+'</p>');return}
  var part=net/dests.length,left=0,bought=0;
  dests.forEach(function(d){var n=Math.floor(part/d.px);d.n=n;d.c=n*d.px;left+=part-d.c;bought+=d.c;
    li.push('<li><span><b>Comprar '+esc(d.tk)+(d.novo?' <span class="muted small">(nova)</span>':'')+'</b><br><span class="muted small">'+(n?n+(n>1?' ações':' ação')+' a '+brl.format(d.px):'menos de 1 ação ('+brl.format(d.px)+' cada)')+'</span></span><span class="num">'+brl.format(d.c)+'</span></li>')});
  if(left>0.5)li.push('<li class="muted small"><span>Sobra por arredondar em ações inteiras</span><span class="num">'+brl.format(left)+'</span></li>');
  var t2=tot-custo-imp-left,sv=x.v-V,r='<p class="note">Depois da troca (sobre o total de '+brl.format(t2)+'): <b>'+esc(SIM.tk)+' '+pf.format(sv/t2*100)+'%</b>'+(sv/t2*100.0>al+.5||sv/t2*100<al-.5?' (alvo '+pf.format(al)+'%; ficou diferente por vender em ações inteiras)':'');
  dests.forEach(function(d){r+=', <b>'+esc(d.tk)+' '+pf.format((d.v+d.c)/t2*100)+'%</b> (antes '+pf.format(d.v/tot*100)+'%)'});
  r+='.</p><p class="note exp">'+nota+' É uma estimativa: não considera prejuízos antigos, outras vendas do mês nem taxas da corretora.</p>';
  setHtml(out,'<ul class="calc" style="margin-top:14px">'+li.join('')+'</ul>'+r);
}
document.addEventListener('change',function(e){var i=e.target&&e.target.id;if(i&&i.indexOf('sim-')===0&&i!=='sim-go')simCalc()});
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target&&e.target.id&&e.target.id.indexOf('sim-')===0){e.preventDefault();simCalc()}});
function alvSave(){
  var g=function(id){var v=parseNum(($(id)||{}).value);return isFinite(v)?v:0};
  var c={BR:g('al-BR'),US:g('al-US'),RF:g('al-RF')},sm=c.BR+c.US+c.RF,m=$('al-msg');
  if(Math.abs(sm-100)>0.05){m.className='msg err';m.textContent='A soma está em '+pf.format(sm)+'%. Ajuste para dar 100%.';return}
  var b={};Array.prototype.forEach.call(document.querySelectorAll('[id^="ab-"]'),function(i){var v=parseNum(i.value);b[i.id.slice(3)]=isFinite(v)?v:0});
  var bs=Object.keys(b).reduce(function(a,k){return a+b[k]},0);
  if(Object.keys(b).length&&Math.abs(bs-100)>0.5){m.className='msg err';m.textContent='Dentro do Brasil a soma está em '+pf.format(bs)+'%. Ajuste para 100%.';return}
  S.alvos={classes:c,br:b};S.pend.push({t:'cfg',k:'alvos',v:S.alvos});save();ghSync();m.className='msg gain';m.textContent='Salvo.';
  if(APV)apoCalc();
}

/* metas: UMA META POR ANO (S.metas.anos {'2026':valor}), o usuário escreve/ajusta/apaga em Ajustar; sem metas padrão. Prazo = dezembro do ano. Renda passiva opcional. */
var MTS=null,MTC=-1;
function mesesAte(d){var a=today(),y=+d.slice(0,4)-+a.slice(0,4),m=+d.slice(5,7)-+a.slice(5,7);return y*12+m}
function mtMes(mm,curto){var d=new Date(),t=d.getMonth()+mm,y=d.getFullYear()+Math.floor(t/12);return curto?MESL[t%12].slice(0,3)+'/'+String(y).slice(2):MESL[t%12]+' de '+y}
function mtR(v){return 'R$ '+Math.round(v).toLocaleString('pt-BR')}
/* lista [{a:ano,v:valor}] em ordem de ano; ignora lixo */
function mtG(){var M=S.metas||{},o=M.anos,r=[];if(o&&typeof o==='object'&&!Array.isArray(o))Object.keys(o).forEach(function(k){var a=+k,v=+o[k];if(a>=2000&&a<=2100&&isFinite(v)&&v>0)r.push({a:a,v:v})});r.sort(function(x,y){return x.a-y.a});return r}
/* meta em foco: a do ano atual; sem ela, a do próximo ano que existir; sem nenhuma, -1 */
function mtAtual(G){var ya=+today().slice(0,4),i=-1;G.forEach(function(g,k){if(g.a===ya)i=k});if(i<0)G.forEach(function(g,k){if(i<0&&g.a>ya)i=k});return i}
function mtCenter(){var ml=$('mtl');if(!ml||!ml.clientWidth)return;if(MTS!=null){ml.scrollLeft=MTS;return}var c=ml.querySelector('.cur')||ml.lastChild;if(c)ml.scrollLeft=Math.max(0,c.offsetLeft-ml.clientWidth/2+c.clientWidth/2)}
document.addEventListener('scroll',function(e){var c=e.target;if(c&&c.id==='mtl'&&c.clientWidth)MTS=c.scrollLeft},true);
function metasHtml(R){
  var T=R.tot,M=S.metas||{},G=mtG(),pat=T.value+T.cash,ci=mtAtual(G),ya=+today().slice(0,4);if(ci!==MTC){MTC=ci;MTS=null}
  var h='<div class="panel" id="metasbox"><h2>Metas '+bal('Uma meta de patrimônio por ano, escolhida por você. Todo ano você define quanto quer juntar até dezembro, vê se está no caminho e ajusta com calma se precisar. Metas de anos passados ficam guardadas com o resultado. Toque nos quadros e nos anos para ver os detalhes.')+'</h2>';
  var ev=evoData(),k=ev.length,ap=0,nm=0;if(k>1){var i0=Math.max(0,k-7);ap=(ev[k-1].apl-ev[i0].apl);nm=(k-1)-i0}var apm=nm?ap/nm:0;
  var cdiM=CDI.dates.length?Math.pow(1+CDI.s[CDI.dates[CDI.dates.length-1]]/100,21)-1:0.008;
  /* em quantos meses o patrimônio chega a cada valor no ritmo atual (aporte médio + CDI) */
  var etaDe=function(V){if(pat>=V)return 0;if(apm<=0)return -1;var v=pat,mm=0;while(v<V&&mm<600){v=v*(1+cdiM)+apm;mm++}return mm>=600?-1:mm};
  h+='<div class="mt">';
  if(ci<0){h+='<div class="mth"><div><span class="k">'+(G.length?'Sem meta para este ano':'Nenhuma meta definida')+'</span><div class="v">Defina a de '+ya+'</div></div></div><p class="small muted" style="margin:8px 0 0">Toque em Ajustar, escreva quanto quer juntar até dezembro de '+ya+' e salve. Você muda ou apaga quando quiser.</p>'}
  else{var g=G[ci],V=g.v,done=pat>=V,pc=Math.min(1,pat/V),fal=Math.max(0,V-pat),n=mesesAte(g.a+'-12'),e=etaDe(V),chips='',t2;
    chips+='<span class="pill">até dezembro de '+g.a+'</span>';
    if(done)chips+='<span class="pill" style="color:var(--gain)">meta batida ✓</span>';
    else if(g.a<ya)chips+='<span class="pill" style="color:var(--loss)">ano encerrado</span>';
    else if(e>0)chips+=e<=n?'<span class="pill" style="color:var(--gain)">no prazo</span>':'<span class="pill" style="color:var(--loss)">'+(e-n)+(e-n>1?' meses':' mês')+' de atraso</span>';
    else if(e<0)chips+='<span class="pill" style="color:var(--loss)">sem aportes para estimar</span>';
    h+='<div class="mth"><div><span class="k">Meta de '+g.a+'</span><div class="v">'+mtR(V)+'</div></div><span class="p">'+pf.format(pc*100)+'%</span></div>'+
      '<div class="meta-bar"><i style="width:'+(pc*100)+'%"></i></div><div class="mtc">'+chips+'</div><div class="mtks">';
    h+=bal(done?'Você tem '+brl.format(pat)+', acima da meta de '+brl.format(V)+'. Se quiser, defina uma meta maior ou a do próximo ano em Ajustar.':'Você tem '+brl.format(pat)+'. Faltam '+brl.format(fal)+' para chegar a '+brl.format(V)+'.','<small>Faltam</small><b>'+(done?'—':mtR(fal))+'</b>').replace('class="bal"','class="bal mtk"');
    if(!done&&n>0){var gg=Math.pow(1+cdiM,n),pmt=(V-pat*gg)*cdiM/(gg-1);
      t2=bal('Para chegar lá até dezembro de '+g.a+' ('+n+(n>1?' meses':' mês')+'), precisa aportar cerca de '+brl.format(Math.max(0,pmt))+' por mês se a carteira render como o CDI ('+pf.format(cdiM*100)+'% ao mês)'+(pmt<=0?'; só o rendimento já leva você lá':'')+'. Sem rendimento nenhum, seriam '+brl.format(fal/n)+' por mês.','<small>Aporte por mês</small><b>'+mtR(Math.max(0,pmt))+'</b>')}
    else t2=bal(done?'Meta já batida.':g.a<ya?'Esse ano já acabou. Defina a meta do ano atual em Ajustar.':'Estamos no último mês do ano: o que falta é '+brl.format(fal)+'.','<small>Aporte por mês</small><b>'+(done?'—':g.a<ya?'ano encerrado':mtR(fal))+'</b>');
    h+=t2.replace('class="bal"','class="bal mtk"');
    h+=bal(done?'Meta batida.':apm>0?(e>0?'Aportando '+brl.format(apm)+' por mês do bolso, como nos últimos meses, e com a carteira rendendo como o CDI, você chega lá em '+e+(e>1?' meses':' mês')+' ('+mtMes(e)+').':'Nesse ritmo levaria mais de 50 anos.'):'Ainda não há aportes recentes para estimar quando você chega lá.','<small>No seu ritmo</small><b>'+(done?'✓':apm>0&&e>0?mtMes(e,1):'—')+'</b>').replace('class="bal"','class="bal mtk"');
    h+='</div>'}
  /* trilha por ano: passados com o resultado, atual em destaque, próximos com a previsão */
  if(G.length)h+='<div class="mtl" id="mtl">'+G.map(function(g,i){var st=g.a<ya&&i!==ci?'ok':i===ci?'cur':'fut',sub,tx,ic,res=null;
    if(g.a<ya){for(var j=0;j<ev.length;j++)if(ev[j].m.slice(0,4)<=String(g.a))res=ev[j].pat;var bat=res!=null&&res>=g.v;
      st=bat?'ok':'fut';ic=bat?'✓':'✗';sub=res==null?'sem dados':bat?'batida':pf.format(res/g.v*100)+'%';
      tx='Meta de '+g.a+': '+brl.format(g.v)+'. '+(res==null?'Sem dados do patrimônio no fim do ano.':'Patrimônio no fim do ano: '+brl.format(res)+' ('+pf.format(res/g.v*100)+'% da meta).')}
    else{var e2=etaDe(g.v);ic=String(g.a).slice(2);sub=i===ci?(pat>=g.v?'batida':'atual'):e2>0?mtMes(e2,1):'';
      tx='Meta de '+g.a+': '+brl.format(g.v)+'. '+(pat>=g.v?'Já batida.':'Faltam '+brl.format(g.v-pat)+'.'+(e2>0?' No seu ritmo, você chega lá em '+mtMes(e2)+'.':''))}
    return '<button type="button" class="bal mts '+st+'" data-bal="'+esc(tx)+'"><i>'+ic+'</i><b>'+g.a+'</b><small>'+sub+'</small></button>'}).join('')+'</div>';
  h+='</div>';
  if(M.renda&&M.renda.valor>0){
    var d0=S.trades.map(function(t){return t.date}).sort()[0],ini=new Date(Date.now()-365*864e5).toISOString().slice(0,10),from=d0>ini?d0:ini;
    var rec=0;S.trades.forEach(function(t){if(t.side==='div'&&t.date>=from)rec+=t.price*(t.market==='US'?t.fx:1)});
    var meses=Math.max(1,Math.round(dayDiff(from,today())/30.44)),rm=rec/meses,W=M.renda.valor,pr=Math.min(1,rm/W),yl=pat?rm*12/pat:0;
    h+='<div class="mt"><div class="mth"><div><span class="k">Renda passiva '+bal('Média dos proventos '+(meses<12?'desde '+fmtDate(from):'dos últimos 12 meses')+': '+brl.format(rm)+' por mês, '+pf.format(pr*100)+'% da meta de '+brl.format(W)+'. '+(yl>0?'Com os proventos rendendo '+pf.format(yl*100)+'% ao ano sobre o patrimônio, a meta pede um patrimônio de cerca de '+brl.format(W*12/yl)+'.':'Ainda não há proventos suficientes para estimar.'))+'</span><div class="v">'+brl.format(rm)+'<span class="det"> de '+mtR(W)+' por mês</span></div></div><span class="p" style="color:var(--c2)">'+pf.format(pr*100)+'%</span></div>'+
      '<div class="meta-bar r"><i style="width:'+(pr*100)+'%"></i></div></div>'}
  h+='<details'+(ci<0?' open':'')+'><summary>Ajustar</summary><div class="stack" style="margin-top:12px">'+
    '<label class="small muted">Metas por ano (uma por linha: ano e valor em R$). Apague a linha para excluir.<textarea id="mt-an" rows="'+Math.max(3,G.length+1)+'" placeholder="'+ya+': 80000">'+esc(G.map(function(g){return g.a+': '+Math.round(g.v)}).join('\n'))+'</textarea></label>'+
    '<label class="small muted">Renda passiva por mês (R$, opcional)<input id="mt-rv" inputmode="decimal" placeholder="deixe vazio se não quiser" value="'+(M.renda&&M.renda.valor?String(M.renda.valor).replace('.',','):'')+'"></label>'+
    '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn small" type="button" id="mt-save">Salvar</button><button class="btn small ghost" type="button" id="mt-reset">Apagar todas as metas</button><span class="msg" id="mt-msg"></span></div></div></details></div>';
  return h;
}
function mtParse(t){t=String(t||'').replace(/^R\$\s*/i,'').replace(/\s/g,'');return /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)?parseFloat(t.replace(/\./g,'').replace(',','.')):parseNum(t)}
function metasSave(reset){
  var old=S.metas||{},M={},mm=$('mt-msg'),erro=function(t){if(mm){mm.className='msg loss';mm.textContent=t}};
  var an={};
  if(!reset){var raw=String($('mt-an')?$('mt-an').value:'').split(/\n+/),bad=false;
    raw.forEach(function(l){l=l.trim();if(!l)return;var m=l.match(/^(\d{4})\s*[:;=\-–]?\s*(.+)$/);if(!m){bad=true;return}var a=+m[1],v=mtParse(m[2]);if(a<2000||a>2100||!(v>0)||v>1e10){bad=true;return}an[a]=v});
    if(bad){erro('Escreva uma meta por linha: ano e valor. Ex.: '+today().slice(0,4)+': 80000');return}}
  if(Object.keys(an).length)M.anos=an;
  var rv=reset?(old.renda&&old.renda.valor):mtParse($('mt-rv').value);if(rv>0)M.renda={valor:rv};
  S.metas=M;S.pend.push({t:'cfg',k:'metas',v:M});save();try{document.activeElement.blur()}catch(e){}MTC=-1;render();ghSync();
  mm=$('mt-msg');if(mm){mm.className='msg gain';mm.textContent=reset?'Metas apagadas.':'Salvo.'}
}
function renderIR(){
  var el=$('irtab');if(!el)return;
  var D=irData(),cm=today().slice(0,7),cur=D.rows.filter(function(r){return r.m===cm})[0]||{acao:{v:0,g:0},fii:{v:0,g:0},isento:true};
  var mn=function(m){var x=MESL[+m.slice(5,7)-1];return x.charAt(0).toUpperCase()+x.slice(1)};
  var h='',va=cur.acao.v,over=va>20000;
  h+='<div class="panel"><h2>Vendas de ações em '+mn(cm).toLowerCase()+'</h2><div class="grp" style="margin:0"><span class="num gt">'+brl.format(va)+'</span><span class="det">de R$ 20.000,00 isentos</span></div>'+
    '<div class="irbar'+(over?' over':'')+'"><i style="width:'+Math.min(100,va/200)+'%"></i></div>'+
    '<p class="note" style="margin-top:6px">'+(over?'Passou de R$ 20 mil: o lucro das vendas deste mês paga 15% de IR (DARF código 6015 até '+fmtDate(cur.venc||today())+').':'Ainda pode vender '+brl.format(20000-va)+' em ações este mês sem pagar IR sobre o lucro.')+(cur.fii.v?' FIIs não têm isenção: o lucro paga 20%.':'')+'</p></div>';
  var due=D.rows.filter(function(r){return r.imp>0.005});
  h+='<div class="panel"><h2>DARF a pagar</h2>'+(due.length?'<ul class="calc">'+due.map(function(r){return '<li><span>'+mn(r.m)+' de '+r.m.slice(0,4)+'<br><span class="muted small">código 6015, vence em '+fmtDate(r.venc)+'</span></span><span class="num loss">'+brl.format(r.imp)+'</span></li>'}).join('')+'</ul>':'<p class="muted small">Nenhum. Em todos os meses, suas vendas de ações ficaram abaixo de R$ 20 mil ou não deram lucro.</p>')+
    (D.pa>0.005||D.pf>0.005?'<ul class="calc" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line)">'+(D.pa>0.005?'<li><span>Prejuízo em ações para descontar de lucros futuros</span><span class="num">'+brl.format(D.pa)+'</span></li>':'')+(D.pf>0.005?'<li><span>Prejuízo em FIIs para descontar de lucros futuros</span><span class="num">'+brl.format(D.pf)+'</span></li>':'')+'</ul>':'')+
    (D.warn.length?'<p class="warn" style="margin-top:10px">Compra e venda do mesmo ativo no mesmo dia ('+esc(D.warn.join(', '))+'). Isso pode ser day trade, que paga 20% sem isenção. Confira com a nota da corretora.</p>':'')+'</div>';
  if(D.rows.length){
    h+='<div class="panel"><h2>Mês a mês</h2><div style="overflow-x:auto"><table class="dvtab"><thead><tr><th>Mês</th><th>Vendas</th><th>Lucro</th><th>Situação</th></tr></thead><tbody>'+
      D.rows.slice().reverse().map(function(r){var v=r.acao.v+r.fii.v,g=r.acao.g+r.fii.g;
        var st=r.imp>0.005?'<span class="loss">DARF '+brl.format(r.imp)+'</span>':r.isento&&r.acao.g>0?'<span class="gain">Isento</span>':g<0?'Prejuízo':'Sem imposto';
        return '<tr><td>'+mn(r.m).slice(0,3)+'/'+r.m.slice(2,4)+'</td><td>'+brl.format(v)+'</td><td class="'+cls(g)+'">'+sgn(g)+'</td><td>'+st+'</td></tr>'}).join('')+'</tbody></table></div>'+
      '<details><summary>Ver cada venda</summary><ul class="calc small" style="margin-top:12px">'+D.rows.slice().reverse().map(function(r){return r.acao.it.concat(r.fii.it).map(function(x){return '<li><span><b>'+esc(x.tk)+'</b> <span class="muted">'+fmtDate(x.d)+', '+num(x.q)+' un., '+brl.format(x.v)+'</span></span><span class="num '+cls(x.g)+'">'+sgn(x.g)+'</span></li>'}).join('')}).join('')+'</ul></details></div>';
  }
  var ys={};S.trades.forEach(function(t){ys[t.date.slice(0,4)]=1});var years=Object.keys(ys).sort();if(!IRY||!ys[IRY])IRY=years[years.length-1]||today().slice(0,4);
  var Y=+IRY,end=IRY+'-12-31',prev=(Y-1)+'-12-31',b1=bensEm(end),b0=bensEm(prev),b0m={};b0.forEach(function(p){b0m[p.tk]=p});
  var dv=S.trades.filter(function(t){return t.side==='div'&&t.date.slice(0,4)===IRY}),byT={};
  dv.forEach(function(t){var k=t.market==='US'?'ext':(t.tipo==='JCP'||/JCP/.test(t.note||''))?'jcp':'div';var o=(byT[k]=byT[k]||{});var r=o[t.ticker]||(o[t.ticker]={v:0,b:0,ir:0});r.v+=t.price*(t.market==='US'?t.fx:1);r.b+=(t.bruto||t.price)*(t.market==='US'?t.fx:1);r.ir+=(t.irExt||0)*(t.market==='US'?t.fx:1)});
  var lst=function(o,f){return Object.keys(o||{}).sort().map(function(k){return '<li><span><b>'+esc(k)+'</b></span><span class="num">'+f(o[k])+'</span></li>'}).join('')};
  var tot=function(o,f){return Object.keys(o||{}).reduce(function(a,k){return a+f(o[k])},0)};
  var cod=function(p){return p.rf?'Grupo 04 (aplicações de renda fixa)':p.mk==='US'?'Grupo 07 ou 04, conforme o tipo (ETF no exterior)':isFII(p.tk)?'Grupo 07, código 03 (FII)':'Grupo 03, código 01 (ações)'};
  h+='<div class="panel"><div class="grp"><h2>Declaração de IR</h2>'+(years.length>1?'<div class="yrs">'+years.map(function(y){return '<button type="button" data-iry="'+y+'" aria-pressed="'+(y===IRY)+'">'+y+'</button>'}).join('')+'</div>':'<span class="det">ano '+IRY+'</span>')+'</div>'+
    '<p class="note" style="margin:0 0 10px">O que vai na declaração entregue em '+(Y+1)+', referente a '+IRY+'.'+(IRY===today().slice(0,4)?' O ano ainda não acabou: os valores mudam até 31/12.':'')+'</p>'+
    '<h3 style="margin:12px 0 6px">Bens e Direitos</h3><p class="note exp" style="margin:0 0 8px">Cada ativo pelo custo (preço médio × quantidade), não pelo valor de mercado. Ativos dos EUA em reais, pelo dólar de cada compra.</p>'+
    (b1.length||b0.length?'<div style="overflow-x:auto"><table class="dvtab"><thead><tr><th>Ativo</th>'+(b0.length?'<th>31/12/'+(Y-1)+'</th>':'')+'<th>31/12/'+Y+'</th></tr></thead><tbody>'+
      b1.concat(b0.filter(function(p){return !b1.some(function(x){return x.tk===p.tk&&!!x.rf===!!p.rf})}).map(function(p){return {tk:p.tk,mk:p.mk,rf:p.rf,q:0,c:0,gone:1}})).map(function(p){var o=b0m[p.tk];
        return '<tr><td><b>'+esc(p.tk)+'</b><br><span class="muted small">'+(p.gone?'vendido no ano':num(p.q)+(p.rf?'':' un.')+(p.mk==='US'?' · '+usd.format(p.cu):''))+'<br>'+cod(p)+'</span></td>'+(b0.length?'<td>'+(o?brl.format(o.c):'R$ 0,00')+'</td>':'')+'<td>'+brl.format(p.c)+'</td></tr>'}).join('')+'</tbody></table></div>':'<p class="muted small">Nenhum bem nesse ano.</p>')+
    '<h3 style="margin:16px 0 6px">Rendimentos isentos (dividendos)</h3>'+(byT.div?'<ul class="calc">'+lst(byT.div,function(r){return brl.format(r.v)})+'<li class="tot"><span>Total</span><span class="num">'+brl.format(tot(byT.div,function(r){return r.v}))+'</span></li></ul>':'<p class="muted small">Nenhum.</p>')+
    '<h3 style="margin:16px 0 6px">Tributação exclusiva (JCP)</h3>'+(byT.jcp?'<ul class="calc">'+lst(byT.jcp,function(r){return brl.format(r.v)})+'<li class="tot"><span>Total líquido</span><span class="num">'+brl.format(tot(byT.jcp,function(r){return r.v}))+'</span></li></ul><p class="note">Valor líquido, como caiu na conta. O informe de rendimentos da corretora traz o valor bruto, que é o que vai na declaração.</p>':'<p class="muted small">Nenhum.</p>')+
    (byT.ext?'<h3 style="margin:16px 0 6px">Dividendos do exterior</h3><ul class="calc">'+lst(byT.ext,function(r){return brl.format(r.b)+' bruto · '+brl.format(r.ir)+' retido nos EUA'})+'</ul><p class="note">Declarados na ficha de aplicações no exterior. O imposto retido nos EUA (30%) é maior que os 15% do Brasil, então normalmente não sobra nada a pagar aqui.</p>':'')+
    '</div>';
  h+='<p class="note exp" style="margin:0 4px">Regras usadas: ações à vista com isenção para vendas de até R$ 20 mil no mês e 15% acima disso; FIIs sem isenção, 20%; prejuízo descontado de lucros futuros do mesmo tipo. O custo inclui as taxas da B3 das notas (somadas na compra e descontadas na venda), como pede a Receita. Os informes da Nubank e do Inter valem como fonte oficial. Isto é um apoio, não substitui um contador.</p>';
  setHtml(el,h);
}
