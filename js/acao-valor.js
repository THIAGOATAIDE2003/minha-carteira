/* Aporte · js/acao-valor.js — continuação do antigo acao.js (parte 2 de 3). Mesmo escopo global; a ordem de carga importa. */
function entInfo(tk,d,A,V,Cx){
  if(!A||A.etf)return null;if(!V)V=anValCalc(tk,d,A);if(!V||!V.ms||!V.ms.length)return null;
  var P=d.price,qc=A.chips.filter(function(c){return c[0]==='Qualidade'})[0],fraca=(qc&&qc[1]==='Baixa')||(A.score!=null&&A.score<4.5),z;
  if(V.mg>=ENT.mg/100)z=fraca?'cuid':'conf';else if(V.mg>=-0.10)z='just';else z='caro';
  var mo=anMom(tk,P),caiu=!!(mo&&((mo.m6!=null&&mo.m6<=-0.15)||(mo.m3!=null&&mo.m3<=-0.10))),mot=(A.alr||[]).filter(function(x){return x[0]!=='Preço em queda'});
  if(z==='conf'||z==='just'||z==='cuid'){if(mot.length)z='motivo';else if(caiu&&z!=='cuid')z='semmotivo'}
  var C=Cx||null,rara=false;if(!C&&d.cur!=='USD')try{C=concFor(tk)}catch(e){}
  if(z==='conf'&&C&&C.alta){if(V.mg>=0.4&&A.score!=null&&A.score>=8)rara=true;else z='conc'}
  var vt=[],vf=0;if(d.cur!=='USD'&&isBR(tk))try{var vs=vtSetor(rkSect(tk,false));vt=vs.filter(function(x){return x[0]==='contra'});vf=vs.filter(function(x){return x[0]==='favor'}).length}catch(e){}
  var vcontra=vt.length>vf;if(z==='conf'&&vcontra&&!rara)z='vento';
  var lu=null,q=null;try{q=qTtm(cvmQ(tk))}catch(e){}
  if(mo&&mo.m6!=null&&q&&q.g!=null){var m=mo.m6,g=q.g;
    if(m>=0.2&&g>=0.1)lu=['ok','O preço subiu '+pf.format(m*100)+'% em 6 meses e o lucro dos últimos 12 meses cresceu '+pf.format(g*100)+'%: a alta tem lucro por trás.'];
    else if(m>=0.2&&g<0.05)lu=['al','O preço subiu '+pf.format(m*100)+'% em 6 meses, mas o lucro dos últimos 12 meses '+(g<0?'caiu '+pf.format(Math.abs(g)*100)+'%':'quase não mudou ('+(g>=0?'+':'')+pf.format(g*100)+'%')+'. Alta sem lucro que justifique: pode ser euforia.'];
    else if(m<=-0.15&&g<=-0.1)lu=['al','O preço caiu '+pf.format(Math.abs(m)*100)+'% em 6 meses e o lucro caiu '+pf.format(Math.abs(g)*100)+'%: a queda tem motivo, não é desconto por si só.'];
    else if(m<=-0.15&&g>=-0.05)lu=['ok','O preço caiu '+pf.format(Math.abs(m)*100)+'% em 6 meses, mas o lucro dos últimos 12 meses '+(g>=0.005?'cresceu '+pf.format(g*100)+'%':'se manteve')+'. Queda sem motivo claro nos números: pode ser oportunidade, confira as notícias.']}
  return {z:z,V:V,P:P,F:V.F,lu:lu,mg:V.mg,mot:mot,caiu:caiu,C:C,rara:rara,vt:vcontra?vt:[]}
}
function entHtml(tk,d,A){
  var E=null;try{E=entInfo(tk,d,A)}catch(e){}if(!E)return '';
  var T={conf:['Confortável para entrar','gain'],cuid:['Barato, mas a empresa está fraca','loss'],just:['Perto do justo: dá para esperar um preço melhor','muted'],conc:['Barato, mas você já tem muito nesse setor','loss'],vento:['Barato, mas o setor está com vento contra','loss'],motivo:[E.caiu?'Caiu e tem motivo: espere':'Tem aviso na empresa: espere','loss'],semmotivo:['Caiu sem motivo claro nos números: confira antes de entrar','muted'],caro:['Não está num valor confortável para entrar','loss']}[E.z];
  var h='<div class="panel anp"><h2>Dá para entrar agora? '+bal('Compara o preço de hoje com o preço justo da aba Preço justo. Se o preço está pelo menos '+ENT.mg+'% abaixo do justo (a sua margem de segurança), ele fica confortável. Também confere se a alta ou a queda do preço tem o lucro da empresa por trás. É uma regra de conta, não uma recomendação, e o preço justo é uma estimativa simples.')+'</h2>'+
    '<p class="anv" style="margin:6px 0 0"><b class="'+T[1]+'">'+T[0]+'</b></p>'+
    '<p class="note" style="margin:6px 0 0">Preço '+E.F.format(E.P)+', preço justo '+E.F.format(E.V.med)+(E.mg>=0?' ('+pf.format(E.mg*100)+'% abaixo do justo)':' (o preço está '+pf.format(Math.abs(E.V.up)*100)+'% acima do justo)')+'. Sua margem de segurança: '+ENT.mg+'%.'+(E.z==='cuid'?' A nota da empresa está baixa, então o preço baixo pode ser armadilha.':'')+'</p>';
  if(E.z==='conc'||E.rara)h+='<p class="note" style="margin:8px 0 0"><b class="loss">Concentração:</b> '+E.C.msg+'. '+(E.rara?'Mesmo assim é uma ideia rara (preço bem abaixo do justo e nota alta), então a regra pode ser quebrada, sabendo que o risco do setor continua.':'Um problema nesse setor pesaria muito no seu patrimônio. Só vale entrar aqui se for uma oportunidade muito rara; o normal é olhar outro setor.')+'</p>';
  if(E.vt&&E.vt.length)h+='<p class="note" style="margin:8px 0 0"><b class="loss">Vento do setor:</b> '+E.vt.map(function(x){return x[1]+' ('+x[2]+')'}).map(esc).join('; ')+'. '+(E.z==='vento'?'Mesmo com o preço abaixo do justo, o cenário pesa contra o setor agora: o preço justo usa o lucro passado e pode estar alto demais. Pode valer esperar.':'Fica o aviso: o cenário pesa contra o setor.')+'</p>';
  if(E.z==='motivo')h+='<p class="note" style="margin:8px 0 0"><b class="loss">O que está pesando:</b> '+E.mot.map(function(x){return x[0]+' ('+String(x[1]).replace(/<[^>]*>/g,'')+')'}).join('; ')+'. O preço justo usa o lucro que a empresa já teve; se o lucro vem piorando, ele fica alto demais e a ação parece mais barata do que é.</p>';
  if(E.z==='semmotivo')h+='<p class="note" style="margin:8px 0 0">O preço caiu, mas não achei nos números do último trimestre nem nas notícias do app um motivo claro. Isso pode ser oportunidade ou algo que o app não enxerga: leia as notícias da ação antes de decidir.</p>';
  if(E.z==='conf')h+='<p class="note" style="margin:8px 0 0">Lembrete: o preço justo usa o lucro passado. Se você souber de algo que vai derrubar o lucro, ele está alto demais.</p>';
  if(E.lu)h+='<p class="note" style="margin:8px 0 0"><b class="'+(E.lu[0]==='ok'?'gain':'loss')+'">Preço e lucro:</b> '+E.lu[1]+'</p>';
  if(E.z==='conf'){var R=compute(),tot=R.tot.value+(R.tot.rfV||0),x=R.held.filter(function(z){return z.p.ticker===tk})[0],fx=E.F===usd?((fxToday()||{}).rate||0):1,pu=E.P*fx,w=x&&tot?x.v/tot*100:0;
    if(pu>0&&tot){if(w>=ENT.al)h+='<p class="note" style="margin:8px 0 0"><b>Entrada:</b> você já tem '+pf.format(w)+'% da carteira nela, acima do alvo de '+ENT.al+'%.</p>';
      else{var falta=(ENT.al-w)/100*tot,pt=falta/ENT.n,qn=Math.floor(pt/pu);h+='<p class="note" style="margin:8px 0 0"><b>Entrada em partes:</b> para chegar em '+ENT.al+'% da carteira (hoje '+pf.format(w)+'%) faltam cerca de '+brl.format(falta)+'. Em '+ENT.n+' partes de '+brl.format(pt)+(qn>0?' (cerca de '+qn+(qn>1?' ações':' ação')+' cada, ao preço de hoje)':' (menos de 1 ação por parte ao preço de hoje)')+', espaçadas no tempo.</p>'}}}
  h+='<details style="margin-top:10px"><summary>Ajustar a regra</summary><div class="alv" style="grid-template-columns:1fr;margin-top:8px"><label class="muted small">Margem de segurança (% abaixo do justo)<input data-ent="mg" inputmode="decimal" value="'+ENT.mg+'"></label><label class="muted small">Quanto da carteira quer ter nela (%)<input data-ent="al" inputmode="decimal" value="'+ENT.al+'"></label><label class="muted small">Entrar em quantas partes<input data-ent="n" inputmode="numeric" value="'+ENT.n+'"></label></div></details></div>';
  return h}
document.addEventListener('change',function(e){var t=e.target,k=t&&t.getAttribute&&t.getAttribute('data-ent');if(!k)return;var v=parseFloat(String(t.value).replace(',','.'));if(!(v>0))return;
  if(k==='mg')v=Math.min(80,v);else if(k==='al')v=Math.min(100,v);else v=Math.min(12,Math.max(1,Math.round(v)));
  ENT[k]=v;try{localStorage.setItem(LS+'-ent',JSON.stringify(ENT))}catch(e2){}try{ENC.k=''}catch(e3){}if(STK.tk)stkRender();try{ntBadge()}catch(e4){}});
function anResumo(tk,d){var A=stkAna(tk,d);
  if(A.etf)return '<div class="panel anp"><h2>Resumo</h2><p class="muted" style="margin:0">É um ETF, um fundo com várias empresas dentro. A análise de empresa (lucro, dívida, preço justo) não se aplica. Veja o risco dele em Carteira → Risco.</p></div>'+anFit(tk,d,{sec:['Exterior'],us:1});
  if(!A.pos.length&&!A.neg.length&&!A.inf.length)return '<div class="panel anp"><p class="muted" style="margin:0">Ainda não tenho os indicadores dessa ação. Eles chegam com o robô diário.</p></div>';
  var verd=[];var C={};A.chips.forEach(function(c){C[c[0]]=c[1]});
  if(C['Qualidade']==='Alta'&&C['Preço']==='Barata')verd.push('Empresa de qualidade negociando barato pelos indicadores');else if(C['Qualidade']==='Alta'&&C['Preço']==='Cara')verd.push('Empresa de qualidade, mas o preço já está alto');else if(C['Qualidade']==='Baixa'&&C['Preço']==='Barata')verd.push('Parece barata, mas os números da empresa são fracos: cuidado com armadilha de valor');else if(C['Qualidade']==='Baixa')verd.push('Os números da empresa estão fracos');else verd.push('Empresa '+(C['Qualidade']==='Alta'?'de boa qualidade':'mediana')+', com preço '+({Barata:'baixo',Justa:'justo',Cara:'alto'}[C['Preço']]||'sem comparação')+' pelos indicadores');
  if(C['Dividendos']==='Altos')verd.push('boa pagadora de dividendos');
  var pl=function(a){return a.map(function(x){return String(x[0]).replace(/<[^>]*>/g,'')+' (peso '+(x[2]||1)+')'})},tot=(A.wp||0)+(A.wn||0);
  var nwhy='Nota '+(A.score!=null?num(A.score,1):'')+' de 10 = peso dos pontos positivos ÷ peso total × 10. Aqui: '+(A.wp||0)+' a favor e '+(A.wn||0)+' contra, de '+tot+' no total. '+
    (A.neg.length?'Puxam para baixo: '+pl(A.neg).slice(0,4).join('; ')+'. ':'')+(A.pos.length?'Puxam para cima: '+pl(A.pos).slice(0,4).join('; ')+'. ':'')+'Veja a lista completa em "Como essa nota foi calculada", logo abaixo.';
  var h='<div class="panel anp"><div class="anh"><div><span class="lbl">Análise automática '+bal('O app lê sozinho os indicadores da empresa, compara com as concorrentes do mesmo setor e dá uma nota de 0 a 10, com pontos positivos e de atenção. É para estudar, não é recomendação.')+'</span><p class="anv">'+verd.join(', ')+'.</p></div>'+(A.score!=null?'<div class="ans '+(A.score>=7?'g':A.score>=4.5?'m':'l')+'"><b>'+num(A.score,1)+'</b><small>de 10 '+bal(nwhy)+'</small></div>':'')+'</div>'+
    '<div class="anc">'+A.chips.map(function(c){return '<div><span>'+c[0]+'</span><b class="'+c[2]+'">'+c[1]+'</b></div>'}).join('')+'</div>'+
    (A.pe&&A.pe.n?'<p class="note" style="margin:10px 0 0">Comparada com '+A.pe.n+' empresas do setor '+esc(String(A.pe.name).toLowerCase())+' com negociação na bolsa.</p>':'')+'</div>';
  var li=function(a,c){return a.map(function(x){return '<li>'+rkLvl(c)+'<div><b>'+x[0]+(x[2]>1?' <span class="tag">vale em dobro</span>':'')+'</b><p>'+x[1]+'</p></div></li>'}).join('')};
  if(A.alr&&A.alr.length)h+='<div class="panel alr"><h2>Atenção agora '+bal('O que piorou recentemente nessa empresa: último trimestre, notícias e queda do preço. Isso também reduz a nota, em dobro. Mesmo com nota alta, vale ler antes de comprar.')+'</h2><ul class="rkl">'+li(A.alr.map(function(x){return [x[0],x[1]]}),'al')+'</ul></div>';
  h+=entHtml(tk,d,A);try{h+=vtHtml(tk)}catch(e){}
  var VJ=null;try{VJ=anValCalc(tk,d,A)}catch(e){}
  if(VJ&&VJ.ms&&VJ.ms.length&&A.score!=null&&A.score>=7&&VJ.up<=-0.3)h+='<div class="panel alr"><h2>Nota alta, mas o preço está acima do justo</h2><p class="anv" style="margin:6px 0 0">A nota ('+num(A.score,1)+') mede a qualidade da empresa pelos números. Já o preço justo dos métodos é '+VJ.F.format(VJ.med)+', '+pf.format(Math.abs(VJ.up*100))+'% abaixo do preço de hoje. Esses métodos costumam dar valor baixo para empresas que lucram muito e distribuem quase tudo, então confira a aba Preço justo antes de decidir.</p></div>';
  if(A.score!=null)h+='<details class="panel info"><summary>Como essa nota foi calculada</summary><p class="anv" style="margin:8px 0 0">Nota = pontos positivos ÷ (positivos + pontos de atenção) × 10. Aqui são <b>'+A.wp+'</b> de peso nos positivos e <b>'+A.wn+'</b> nos de atenção. O que aconteceu no último trimestre, as notícias e o preço em queda valem em dobro (ou peso 1, no caso do preço). A nota não é uma previsão: ela mostra o quanto a empresa se saiu bem nas regras do app.</p>'+(A.pos.length?'<p class="lbl" style="margin:10px 0 2px">A favor (somam '+A.wp+')</p><ul class="rkl">'+A.pos.map(function(x){return '<li>'+rkLvl('ok')+'<div><b>'+x[0]+'</b> <span class="tag">peso '+(x[2]||1)+'</span></div></li>'}).join('')+'</ul>':'')+(A.neg.length?'<p class="lbl" style="margin:10px 0 2px">Contra (somam '+A.wn+')</p><ul class="rkl">'+A.neg.map(function(x){return '<li>'+rkLvl('al')+'<div><b>'+x[0]+'</b> <span class="tag">peso '+(x[2]||1)+'</span></div></li>'}).join('')+'</ul>':'')+'<p class="note" style="margin:10px 0 0">Os indicadores são comparados com a mediana das empresas do mesmo setor. Cada regra dá um ponto a favor ou contra conforme o resultado.</p></details>';
  if(A.pos.length)h+='<div class="panel"><h2>Pontos positivos</h2><ul class="rkl">'+li(A.pos,'ok')+'</ul></div>';
  if(A.neg.length)h+='<div class="panel"><h2>Pontos de atenção</h2><ul class="rkl">'+li(A.neg,'al')+'</ul></div>';
  if(A.inf.length)h+='<div class="panel"><h2>Vale saber</h2><ul class="rkl">'+li(A.inf,'at')+'</ul></div>';
  return h+anFit(tk,d,A)}
/* preço justo por vários métodos */
/* preço justo por vários métodos (usado na aba Valuation e nas Oportunidades) */
function anValCalc(tk,d,A){
  var N=A.N,P=d.price,F=d.cur==='USD'?usd:brl,ms=[];
  var lpa=N.pl>0&&P?P/N.pl:null,vpa=N.pvp>0&&P?P/N.pvp:null,dpa=N.dy>0&&P?P*N.dy/100:null;
  var sel=MD.d&&MD.d.idx&&MD.d.idx.selic&&MD.d.idx.selic.last,cfg=VALP[tk]||{};
  var g=cfg.g!=null?cfg.g:Math.max(0,Math.min(10,N.cr5!=null?Math.round(N.cr5):5)),r=cfg.r!=null?cfg.r:Math.max(12,Math.round((sel||13)+1)),y=cfg.y!=null?cfg.y:6;
  if(lpa&&vpa)ms.push(['Graham',Math.sqrt(22.5*lpa*vpa),'Raiz de 22,5 × lucro por ação ('+F.format(lpa)+') × patrimônio por ação ('+F.format(vpa)+'). Pensado para empresas estáveis.']);
  if(dpa)ms.push(['Bazin (preço-teto)',dpa/(y/100),'Dividendo por ação dos últimos 12 meses ('+F.format(dpa)+') dividido pelo retorno mínimo de '+y+'% ao ano. Para quem compra pensando em renda.']);
  if(lpa&&A.pe&&A.pe.pl)ms.push(['P/L do setor',lpa*A.pe.pl,'Lucro por ação × P/L médio das concorrentes ('+num(A.pe.pl,1)+'). Quanto valeria se o mercado pagasse por ela o mesmo que paga pelo setor.']);
  if(lpa&&r>3){var v=0,e=lpa;for(var i=1;i<=5;i++){e*=1+g/100;v+=e/Math.pow(1+r/100,i)}v+=e*1.03/((r-3)/100)/Math.pow(1+r/100,5);
    ms.push(['Fluxo de caixa descontado',v,'O lucro por ação cresce '+g+'% ao ano por 5 anos e depois 3% para sempre, trazido para hoje com desconto de '+r+'% ao ano (Selic + prêmio). Versão simples: usa o lucro no lugar do caixa.'])}
  if(!ms.length)return {ms:ms};
  var vs=ms.map(function(m){return m[1]}).sort(function(a,b){return a-b}),med=vs.length%2?vs[(vs.length-1)/2]:(vs[vs.length/2-1]+vs[vs.length/2])/2,up=med/P-1,mg=(med-P)/med;
  return {ms:ms,g:g,r:r,y:y,F:F,P:P,med:med,up:up,mg:mg,vs:vs}}
function anVal(tk,d){var A=stkAna(tk,d);if(A.etf)return '<div class="panel"><p class="muted" style="margin:0">ETF não tem preço justo de empresa: o preço dele é a soma das empresas que tem dentro.</p></div>';
  var C=anValCalc(tk,d,A);
  if(!C.ms.length)return '<div class="panel"><p class="muted" style="margin:0">Sem dados suficientes para calcular o preço justo (a empresa precisa ter lucro e patrimônio positivos).</p></div>';
  var ms=C.ms,g=C.g,r=C.r,y=C.y,F=C.F,P=C.P,med=C.med,up=C.up,mg=C.mg,vs=C.vs;
  var lab=up>=0.2?['Abaixo do preço justo','g']:up<=-0.15?['Acima do preço justo','l']:['Perto do preço justo','m'];
  var mx=Math.max(P,vs[vs.length-1])*1.08,pp=function(v){return Math.max(0,Math.min(100,v/mx*100)).toFixed(1)};
  var h='<div class="panel anp"><span class="lbl">Preço justo (mediana de '+ms.length+' métodos) '+bal('Estimativa de quanto a ação deveria valer, por métodos conhecidos (Graham, Bazin, P/L do setor e fluxo de caixa). Se o preço de hoje está bem abaixo, pode estar barata; bem acima, cara.')+'</span><div class="anvh"><b class="num">'+F.format(med)+'</b><span class="num '+(up>=0?'gain':'loss')+'">'+(up>=0?'+':'−')+pf.format(Math.abs(up*100))+'% de potencial</span></div>'+
    '<p class="anv"><b class="v'+lab[1]+'">'+lab[0]+'</b>. Preço de hoje: '+F.format(P)+'. '+(mg>0?'Margem de segurança de <b>'+pf.format(mg*100)+'%</b>.':'Sem margem de segurança pelos métodos.')+'</p>'+(A.inf.some(function(x){return /^Lucro líquido bem abaixo/.test(x[0])})?'<p class="note" style="margin:8px 0 0;color:var(--fg)"><b>Cuidado:</b> o lucro líquido dos últimos 12 meses está bem abaixo do lucro da operação, então Graham, P/L do setor e fluxo de caixa ficam distorcidos agora. Veja a aba Indicadores (margem EBIT e EV/EBITDA).</p>':'')+(vs[vs.length-1]>vs[0]*2.5?'<p class="small muted" style="margin:6px 0 0">Os métodos discordam muito entre si (de '+F.format(vs[0])+' a '+F.format(vs[vs.length-1])+'): trate o preço justo com cautela.</p>':'')+
    '<div class="vlb">'+ms.map(function(m){return '<div class="vlr"><span>'+m[0]+'</span><i><em style="width:'+pp(m[1])+'%"></em><u style="left:'+pp(P)+'%"></u></i><b class="num">'+F.format(m[1])+'</b></div>'}).join('')+'</div><p class="small muted" style="margin:6px 0 0">A linha branca é o preço de hoje.</p></div>';
  h+='<div class="panel"><h2>Ajuste as premissas '+bal('Os números já vêm preenchidos sozinhos. Mude se quiser testar: crescimento do lucro, taxa de desconto (juros) e o retorno mínimo de dividendos que você aceita.')+'</h2><div class="vlin"><label>Crescimento do lucro (% ao ano)<input type="number" inputmode="decimal" data-valp="g" value="'+g+'" step="1"></label><label>Desconto (% ao ano)<input type="number" inputmode="decimal" data-valp="r" value="'+r+'" step="0.5"></label><label>Retorno mínimo Bazin (%)<input type="number" inputmode="decimal" data-valp="y" value="'+y+'" step="0.5"></label></div></div>';
  h+='<div class="panel"><h2>Como cada um é calculado</h2><ul class="rkl">'+ms.map(function(m){var u2=m[1]/P-1;return '<li>'+rkLvl(u2>=0.15?'ok':u2<=-0.15?'al':'at')+'<div><b>'+m[0]+': '+F.format(m[1])+' <span class="'+(u2>=0?'gain':'loss')+'">('+(u2>=0?'+':'−')+pf.format(Math.abs(u2*100))+'%)</span></b><p>'+m[2]+'</p></div></li>'}).join('')+'</ul>'+
    '<p class="note">Preço justo é uma estimativa com premissas simples e muda quando os números da empresa mudam. Use para comparar e estudar, não como garantia.</p></div>';
  return h}
document.addEventListener('change',function(e){var t=e.target;if(!t||!t.getAttribute||!t.getAttribute('data-valp')||!STK.tk)return;var v=parseFloat(String(t.value).replace(',','.'));if(!isFinite(v))return;(VALP[STK.tk]=VALP[STK.tk]||{})[t.getAttribute('data-valp')]=v;stkRender()});

function stkClose(){$('stk').hidden=true;document.body.style.overflow=''}
function pickNum(o,ks){if(!o)return null;for(var i=0;i<ks.length;i++){var v=o[ks[i]];if(v&&typeof v==='object'&&'raw' in v)v=v.raw;if(typeof v==='number'&&isFinite(v))return v}return null}
function stkLoad(){
  if(STK.hero){heroRender();return}
  if(STK.idx){idxRender();return}
  var tk=STK.tk,rg=rgEff(),key=tk+'|'+rg;
  var fast=mdStk(tk,rg);
  if(fast){STK.d=fast;STK.busy=false;STK.err='';stkRender();
    if(fast.cur==='USD'&&S.keys.finnhub&&!STKC['m|'+tk])getJSON('https://finnhub.io/api/v1/stock/metric?symbol='+encodeURIComponent(tk)+'&metric=all&token='+encodeURIComponent(S.keys.finnhub)).then(function(m){var x=m&&m.metric||{};STKC['m|'+tk]={d:x,at:Date.now()};stkUSk(tk,x)}).catch(function(){});
    else if(STKC['m|'+tk])stkUSk(tk,STKC['m|'+tk].d);
    var lv=livePx(tk);if(!lv||Date.now()-lv.at>15*60000)(isBR(tk)?(S.keys.brapi||pxBase()?brQuote(tk):Promise.reject()):usQuote(tk)).then(function(q){MKT.q[tk]=q;try{renderTape()}catch(e){}if(STK.tk===tk){var f2=mdStk(tk,rgEff());if(f2){if(STK.d&&STK.d.k&&STK.d.cur==='USD')f2.k=STK.d.k;STK.d=f2;stkRender()}}}).catch(function(){});
    return}
  if(STKC[key]&&Date.now()-STKC[key].at<30*60000){STK.d=STKC[key].d;stkRender();return}
  STK.busy=true;STK.err='';stkRender();
  var done=function(d){d.at=Date.now();if(d.price>0&&!/^\^/.test(tk)){var m0=MKT.q[tk];if(!m0)MKT.q[tk]={price:d.price,pct:d.pct,cur:d.cur,name:d.name||(m0&&m0.name)||'',at:d.at};try{renderTape()}catch(e){}}STKC[key]={d:d,at:Date.now()};if(STK.tk!==tk||STK.rng!==rg)return;STK.d=d;STK.busy=false;stkRender()};
  var fail=function(msg){if(STK.tk!==tk)return;STK.busy=false;STK.err=msg;stkRender()};
  if(isBR(tk)||tk.charAt(0)==='^'){
    if(!S.keys.brapi)return fail('Falta o token do brapi em Ajustes.');
    var tok='&token='+encodeURIComponent(S.keys.brapi),u0='https://brapi.dev/api/quote/'+encodeURIComponent(tk)+'?';
    var conv=function(x,mods){var hp=(x.historicalDataPrice||[]).filter(function(p){return p&&p.close>0}).map(function(p){return {t:p.date*1000,c:p.close}});
      var ks=x.defaultKeyStatistics||{},fd=x.financialData||{},pr=x.summaryProfile||{},dv=(x.dividendsData&&x.dividendsData.cashDividends)||[];
      var yr=Date.now()-365*864e5,d12=dv.filter(function(c){var t=Date.parse(c.paymentDate||c.lastDatePrior||'');return t>yr&&t<=Date.now()+90*864e5}).reduce(function(a,c){return a+(+c.rate||0)},0);
      var Fd=fundOf(tk);
      return {cur:'BRL',name:x.longName||x.shortName||'',price:x.regularMarketPrice,pct:x.regularMarketChangePercent,o:x.regularMarketOpen>0?x.regularMarketOpen:null,h:x.regularMarketDayHigh>0?x.regularMarketDayHigh:null,l:x.regularMarketDayLow>0?x.regularMarketDayLow:null,hist:hp,sector:pr.sector||pr.industry||'',mods:mods,
        k:{pl:pickNum(x,['priceEarnings']),lpa:pickNum(x,['earningsPerShare']),hi:pickNum(x,['fiftyTwoWeekHigh']),lo:pickNum(x,['fiftyTwoWeekLow']),mc:pickNum(x,['marketCap']),
          pvp:pickNum(ks,['priceToBook']),vpa:pickNum(ks,['bookValue']),dy:pickNum(ks,['dividendYield','trailingAnnualDividendYield']),roe:pickNum(fd,['returnOnEquity']),ml:pickNum(fd,['profitMargins']),
          div:pickNum(fd,['debtToEquity']),evebitda:pickNum(ks,['enterpriseToEbitda']),d12:d12},divs:dv.slice(0,12)}};
    var conv0=conv;conv=function(x,mods){var d=conv0(x,mods),F=fundOf(tk);if(F){var pc=function(v){return v==null?null:v/100},K=d.k;K.pl=K.pl||F.pl;K.pvp=F.pvp;K.dy=pc(F.dy);K.roe=pc(F.roe);K.roic=pc(F.roic);K.ml=pc(F.ml);K.evebitda=F.evebitda;K.div=F.divpl;K.lc=F.lc;K.cr5=pc(F.cr5);d.mods=true}return d};
    var RG=['5y','1y','6mo','3mo','1mo'],cap={};try{cap=JSON.parse(localStorage.getItem(LS+'-brcap')||'{}')||{}}catch(e){}
    var capSave=function(){try{localStorage.setItem(LS+'-brcap',JSON.stringify(cap))}catch(e){}};
    var tries=RG.slice(Math.max(RG.indexOf(rg),cap.max?RG.indexOf(cap.max):0)).concat(['']);
    var q1=function(qs){return getJSON(u0+qs+tok).then(function(d){var x=d&&d.results&&d.results[0];if(!x)throw new Error('0');return x})};
    var i=0,last='';
    var step=function(){if(i>=tries.length)return fail('Não consegui os dados de '+tk+' no brapi'+(last&&last!=='0'?' (código '+last+')':'')+'.');var r=tries[i++];
      q1(r?'range='+r+'&interval='+(r==='5y'?'1wk':'1d'):'').then(function(x){if(!(x.regularMarketPrice>0))throw new Error('0');
        if(r&&r!==rg&&(!cap.max||RG.indexOf(r)>RG.indexOf(cap.max))){cap.max=r;capSave()}
        var ex=[];
        if(cap.mod!==false)ex.push(q1('modules=summaryProfile,defaultKeyStatistics,financialData').then(function(y){['summaryProfile','defaultKeyStatistics','financialData'].forEach(function(k){if(y[k])x[k]=y[k]});cap.mod=true}).catch(function(e){var c=String(e&&e.message);if(c==='400'||c==='401'||c==='403'){cap.mod=false;capSave()}}));
        if(cap.div!==false)ex.push(q1('dividends=true').then(function(y){if(y.dividendsData)x.dividendsData=y.dividendsData;cap.div=true}).catch(function(e){var c=String(e&&e.message);if(c==='400'||c==='401'||c==='403'){cap.div=false;capSave()}}));
        if(r!==rg&&S.keys.av)ex.push(avHist(tk+'.SAO',rg).then(function(hh){if(hh.length>1){x._av=hh}}).catch(function(){}));
        return Promise.all(ex).then(function(){var d=conv(x,!!(x.defaultKeyStatistics||x.financialData));d.rgGot=r;if(x._av){d.hist=x._av;d.rgGot=rg;d.histSrc='Alpha Vantage'}done(d)})},function(e){last=String(e&&e.message);step()})};
    step();
  }else{
    if(!S.keys.finnhub)return fail('Falta a chave Finnhub em Ajustes para ações dos EUA.');
    var fh='&token='+encodeURIComponent(S.keys.finnhub),d={cur:'USD',name:'',hist:[],k:{},divs:[],mods:true};
    Promise.all([usQuote(tk).then(function(q){d.price=q.price;d.pct=q.pct}),
      getJSON('https://finnhub.io/api/v1/stock/profile2?symbol='+encodeURIComponent(tk)+fh).then(function(p){d.name=p.name||'';d.sector=p.finnhubIndustry||''}).catch(function(){}),
      getJSON('https://finnhub.io/api/v1/stock/metric?symbol='+encodeURIComponent(tk)+'&metric=all'+fh).then(function(m){var x=m&&m.metric||{};
        d.k={pl:pickNum(x,['peTTM','peBasicExclExtraTTM']),lpa:pickNum(x,['epsTTM','epsBasicExclExtraItemsTTM']),hi:pickNum(x,['52WeekHigh']),lo:pickNum(x,['52WeekLow']),mc:x.marketCapitalization?x.marketCapitalization*1e6:null,
          pvp:pickNum(x,['pbQuarterly','pbAnnual']),dy:(function(v){return v==null?null:v/100})(pickNum(x,['currentDividendYieldTTM','dividendYieldIndicatedAnnual'])),roe:(function(v){return v==null?null:v/100})(pickNum(x,['roeTTM','roeRfy'])),
          ml:(function(v){return v==null?null:v/100})(pickNum(x,['netProfitMarginTTM'])),div:pickNum(x,['totalDebt/totalEquityQuarterly','totalDebt/totalEquityAnnual'])}}).catch(function(){}),
      S.keys.av?avHist(tk,rg).then(function(hh){d.hist=hh}).catch(function(){}):Promise.resolve()
    ]).then(function(){if(!(d.price>0))throw new Error('0');done(d)}).catch(function(){fail('Não achei '+tk+' no Finnhub. Confira o código.')});
  }
}
