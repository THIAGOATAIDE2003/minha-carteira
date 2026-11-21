/* Aporte · js/risco.js — Carteira → Risco.
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
/* ===== Risco da carteira (estilo Portfolio Risk Management): tudo calculado sozinho com o histórico semanal do robô ===== */
var RSIM={f:'ibov',s:-20},RKC={k:'',r:null};
var RFAC={ibov:['Ibovespa','ibov'],usd:['Dólar','usd'],SPY:['S&P 500','SPY'],brent:['Petróleo','brent'],iron:['Minério de ferro','iron'],GLD:['Ouro','GLD']};
function rkWk(d){return Math.floor((d+3)/7)}
function rkSer(a){var m={};(a||[]).forEach(function(p){if(p&&p[1]>0)m[rkWk(p[0])]=p[1]});return m}
function rkRet(m){var ks=Object.keys(m).map(Number).sort(function(a,b){return a-b}),o={};for(var i=1;i<ks.length;i++){if(ks[i]-ks[i-1]>2)continue;o[ks[i]]=m[ks[i]]/m[ks[i-1]]-1}return o}
function rkMean(a){return a.reduce(function(s,x){return s+x},0)/(a.length||1)}
function rkStd(a){var m=rkMean(a);return Math.sqrt(a.reduce(function(s,x){return s+(x-m)*(x-m)},0)/Math.max(1,a.length-1))}
function rkPair(ra,rb){var a=[],b=[];for(var k in ra)if(k in rb){a.push(ra[k]);b.push(rb[k])}if(a.length<26)return null;
  var ma=rkMean(a),mb=rkMean(b),cv=0,va=0,vb=0;for(var i=0;i<a.length;i++){cv+=(a[i]-ma)*(b[i]-mb);va+=(a[i]-ma)*(a[i]-ma);vb+=(b[i]-mb)*(b[i]-mb)}
  return {b:vb?cv/vb:0,c:va&&vb?cv/Math.sqrt(va*vb):0,n:a.length}}
/* regressão com dois fatores (Ibovespa e dólar) para cenários combinados */
function rkTwo(r,f1,f2){var y=[],x1=[],x2=[];for(var k in r)if(k in f1&&k in f2){y.push(r[k]);x1.push(f1[k]);x2.push(f2[k])}if(y.length<26)return null;
  var my=rkMean(y),m1=rkMean(x1),m2=rkMean(x2),s11=0,s22=0,s12=0,s1y=0,s2y=0;
  for(var i=0;i<y.length;i++){var a=x1[i]-m1,b=x2[i]-m2,c=y[i]-my;s11+=a*a;s22+=b*b;s12+=a*b;s1y+=a*c;s2y+=b*c}
  var det=s11*s22-s12*s12;if(Math.abs(det)<1e-12)return null;return {b1:(s22*s1y-s12*s2y)/det,b2:(s11*s2y-s12*s1y)/det}}
var RKSG={'Financeiro':['Intermediários Financeiros','Previdência e Seguros','Serviços Financeiros Diversos','Holdings Diversificadas','Exploração de Imóveis'],'Utilidade pública':['Energia Elétrica','Água e Saneamento','Gás'],'Comunicações':['Telecomunicações','Mídia'],'Materiais básicos':['Mineração','Siderurgia e Metalurgia','Madeira e Papel','Químicos','Embalagens','Materiais Diversos'],'Petróleo e gás':['Petróleo, Gás e Biocombustíveis'],'Bens industriais':['Máquinas e Equipamentos','Material de Transporte','Transporte','Serviços','Construção e Engenharia','Comércio'],'Consumo cíclico':['Construção Civil','Tecidos, Vestuário e Calçados','Utilidades Domésticas','Diversos','Viagens e Lazer','Automóveis e Motocicletas','Hoteis e Restaurantes'],'Consumo não cíclico':['Alimentos Processados','Bebidas','Comércio e Distribuição','Agropecuária','Produtos de Uso Pessoal e de Limpeza','Fumo'],'Saúde':['Medicamentos e Outros Produtos','Serv.Méd.Hospit. Análises e Diagnósticos','Equipamentos','Comércio e Distribuição de Medicamentos'],'Tecnologia':['Programas e Serviços','Computadores e Equipamentos']};
function rkSect(tk,us){if(us)return ['Ações do mundo (ETF)','Exterior'];var s=MD.d&&MD.d.sect&&MD.d.sect[tk];
  if(s){var g=Object.keys(RKSG).filter(function(k){return RKSG[k].indexOf(s[0])>=0})[0];return [g||s[0],s[0]]}
  if(FIIS[tk])return ['Fundos imobiliários','FII'];
  var m={ITUB4:'Financeiro',BBAS3:'Financeiro',BBDC4:'Financeiro',BBSE3:'Financeiro',B3SA3:'Financeiro',SANB11:'Financeiro',BPAC11:'Financeiro',CXSE3:'Financeiro',SBSP3:'Utilidade pública',CMIG4:'Utilidade pública',EGIE3:'Utilidade pública',SAPR11:'Utilidade pública',ALUP11:'Utilidade pública',AXIA3:'Utilidade pública',TAEE11:'Utilidade pública',PETR4:'Petróleo e gás',PRIO3:'Petróleo e gás',VALE3:'Materiais básicos',WEGE3:'Bens industriais',VIVT3:'Comunicações',TIMS3:'Comunicações',JHSF3:'Consumo cíclico'};
  return [m[tk]||'Outros','']}
function riskData(R){
  var H=MD.d&&MD.d.hist||{},I=MD.d&&MD.d.idx||{},key=(MD.d&&MD.d.ts)+'|'+R.held.map(function(x){return x.p.ticker+':'+Math.round(x.v)}).join(',')+'|'+Math.round(R.tot.rfV||0);
  if(RKC.k===key)return RKC.r;
  var usdM=rkSer(I.usd&&I.usd.w),F={};Object.keys(RFAC).forEach(function(k){var D=I[k];if(D&&D.w)F[k]=rkRet(rkSer(D.w))});
  var tot=0,as=[],miss=[];
  R.held.forEach(function(x){var tk=x.p.ticker,us=x.p.market==='US',h=H[tk],v=x.v;tot+=v;
    if(!h||!h.w||h.w.length<30){miss.push(tk);as.push({tk:tk,us:us,v:v,r:null});return}
    var m=rkSer(h.w);if(us){var mb={};for(var k in m)if(usdM[k])mb[k]=m[k]*usdM[k];m=mb}
    as.push({tk:tk,us:us,v:v,r:rkRet(m),sect:rkSect(tk,us)})});
  var rfv=(R.rfs||[]).filter(function(c){return !c.rs}).reduce(function(s,c){return s+(CDI.dates.length?c.liq:c.t.price)},0);tot+=rfv;
  if(!tot)return null;
  as.forEach(function(a){a.w=a.v/tot});
  var cdiA=CDI.dates.length?Math.pow(1+CDI.s[CDI.dates[CDI.dates.length-1]]/100,252)-1:0.13,cdiW=Math.pow(1+cdiA,1/52)-1,wrf=rfv/tot;
  /* por ativo: volatilidade, betas, queda máxima */
  as.forEach(function(a){if(!a.r)return;var rr=Object.keys(a.r).map(function(k){return a.r[k]});a.vol=rkStd(rr)*Math.sqrt(52);a.n=rr.length;
    a.beta={};Object.keys(F).forEach(function(k){var p=rkPair(a.r,F[k]);if(p)a.beta[k]=p});
    a.two=F.ibov&&F.usd?rkTwo(a.r,F.ibov,F.usd):null;
    var ks=Object.keys(a.r).map(Number).sort(function(x,y){return x-y}),c=1,pk=1,dd=0;ks.forEach(function(k){c*=1+a.r[k];if(c>pk)pk=c;dd=Math.min(dd,c/pk-1)});a.dd=dd});
  /* carteira de hoje "rodando" nas semanas passadas (só onde todos os ativos têm preço) */
  var ok=as.filter(function(a){return a.r}),wOk=ok.reduce(function(s,a){return s+a.w},0),ks=null;
  ok.forEach(function(a){var k2=Object.keys(a.r);ks=ks?ks.filter(function(k){return k in a.r}):k2});
  ks=(ks||[]).map(Number).sort(function(a,b){return a-b});
  var pr=ks.map(function(k){var s=0;ok.forEach(function(a){s+=a.w*a.r[k]});return s+wrf*cdiW+(1-wOk-wrf)*0});
  var P={n:pr.length};
  if(pr.length>=26){P.vol=rkStd(pr)*Math.sqrt(52);var c=1,pk=1,pkI=0,dd=0,ddA=0,ddB=0,ser=[{t:(ks[0]-1)*7*864e5,c:1}];
    pr.forEach(function(r,i){c*=1+r;ser.push({t:ks[i]*7*864e5,c:c});if(c>pk){pk=c;pkI=i}if(c/pk-1<dd){dd=c/pk-1;ddA=pkI;ddB=i}});
    var rec=null;for(var j=ddB;j<pr.length;j++){if(ser[j+1].c>=ser[ddA+1].c){rec=j;break}}
    P.dd=dd;P.ddA=ks[ddA];P.ddB=ks[ddB];P.rec=rec!=null?ks[rec]:null;P.ser=ser;P.cum=c-1;P.yrs=pr.length/52;
    P.worstW=Math.min.apply(null,pr);
    var m4=[];for(var i=3;i<pr.length;i++){m4.push((1+pr[i])*(1+pr[i-1])*(1+pr[i-2])*(1+pr[i-3])-1)}m4.sort(function(a,b){return a-b});P.var95=m4.length?m4[Math.floor(m4.length*0.05)]:null;
    var pm={};ks.forEach(function(k,i){pm[k]=pr[i]});P.r=pm;P.beta={};Object.keys(F).forEach(function(k){var p=rkPair(pm,F[k]);if(p)P.beta[k]=p});
    if(F.ibov){var ir=Object.keys(F.ibov).map(function(k){return F.ibov[k]});P.ibVol=rkStd(ir)*Math.sqrt(52)}}
  /* correlação entre os ativos */
  var cor=[];for(var i=0;i<ok.length;i++)for(var j=i+1;j<ok.length;j++){var p=rkPair(ok[i].r,ok[j].r);if(p)cor.push({a:ok[i].tk,b:ok[j].tk,c:p.c})}
  /* composição */
  var sec={},usdV=0;as.forEach(function(a){if(a.us)usdV+=a.v;var s=a.sect||rkSect(a.tk,a.us);sec[s[0]]=(sec[s[0]]||0)+a.v});if(rfv)sec['Renda fixa']=rfv;
  var hhi=as.reduce(function(s,a){return s+a.w*a.w},0)+wrf*wrf;
  var r={as:as,tot:tot,rfv:rfv,wrf:wrf,P:P,cor:cor,sec:sec,usdV:usdV,effN:hhi?1/hhi:0,miss:miss,F:F,cdiA:cdiA};
  RKC={k:key,r:r};return r}
/* impacto de um cenário: f = fator, s = choque (ex.: -0.2); usa os betas de cada ativo */
function rkImpact(r,f,s,two){var tot=0,rows=r.as.map(function(a){var d=0;if(a.r){if(two&&a.two)d=a.two.b1*two[0]+a.two.b2*two[1];else if(a.beta[f])d=a.beta[f].b*s}var v=a.v*d;tot+=v;return {tk:a.tk,d:d,v:v}});return {tot:tot,rows:rows}}
function rkLvl(l){return '<i class="rkd '+l+'"></i>'}
function riskHtml(R){
  var r=riskData(R);
  if(!r)return '<div class="panel"><p class="muted">Lance suas compras para ver o risco da carteira.</p></div>';
  if(!(MD.d&&MD.d.hist))return '<div class="panel"><p class="muted">O risco é calculado com o histórico que o robô diário traz. '+(MD.busy?'Buscando...':'Abra de novo em alguns minutos.')+'</p></div>';
  var P=r.P,T=r.tot,sg=function(v){return (v>=0?'+':'−')+pf.format(Math.abs(v*100))+'%'},rs=function(v){return (v>=0?'+':'−')+brl.format(Math.abs(v))};
  var fmtW=function(k){var d=new Date(k*7*864e5);return d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'})};
  var D=[];
  /* 1. dólar */
  var uS=r.usdV/T;if(uS>0.5)D.push(['at','Muito do seu patrimônio depende do dólar','<b>'+pf.format(uS*100)+'%</b> está em dólar (VT). Se o dólar cair 10%, você perde uns <b>'+brl.format(r.usdV*0.1)+'</b> só pelo câmbio. O lado bom: isso protege a carteira quando o Brasil passa por crise e o dólar dispara.']);
  else if(uS>=0.2)D.push(['ok','Boa proteção em dólar',pf.format(uS*100)+'% do patrimônio está no exterior, em dólar. Ajuda a proteger a carteira se o real se desvalorizar.']);
  else D.push(['at','Pouca proteção em dólar','Só '+pf.format(uS*100)+'% está no exterior. Se o Brasil passar por crise, quase tudo sente junto.']);
  /* 2. maior ação */
  var st=r.as.filter(function(a){return !a.us}).sort(function(a,b){return b.v-a.v}),top=st[0];
  if(top){var tw=top.v/T;D.push([tw>0.25?'al':tw>0.15?'at':'ok',tw>0.15?'Uma ação pesa muito':'Nenhuma ação pesa demais','A maior ação é <b>'+esc(top.tk)+'</b>, com <b>'+pf.format(tw*100)+'%</b> do patrimônio'+(tw>0.15?'. Se ela cair 30%, a carteira inteira cai uns '+pf.format(tw*30)+'% (−'+brl.format(top.v*0.3)+').':'. Bem distribuído.')])}
  /* 3. setor (só ações do Brasil) */
  var bsec={},bv=0;st.forEach(function(a){var s=(a.sect||rkSect(a.tk))[0];bsec[s]=bsec[s]||{v:0,t:[]};bsec[s].v+=a.v;bsec[s].t.push(a.tk);bv+=a.v});
  var bs=Object.keys(bsec).sort(function(a,b){return bsec[b].v-bsec[a].v})[0];
  if(bs&&bv){var bw=bsec[bs].v/bv;D.push([bw>0.6?'al':bw>0.45?'at':'ok',bw>0.45?'Concentração em um setor':'Setores bem divididos','<b>'+pf.format(bw*100)+'%</b> das suas ações do Brasil estão no setor <b>'+esc(bs.toLowerCase())+'</b> ('+bsec[bs].t.map(function(t){var q=rkSect(t);return esc(t)+(q[1]&&q[1]!==bs?', '+esc(q[1].toLowerCase()):'')}).join('; ')+')'+(bw>0.45?'. Uma notícia ruim para esse setor (juros, regras do governo) atinge várias ações de uma vez.':'.')])}
  /* 4. correlação */
  var hc=r.cor.filter(function(c){return c.c>=0.55}).sort(function(a,b){return b.c-a.c});
  if(hc.length)D.push(['at','Ações que costumam cair juntas',hc.slice(0,3).map(function(c){return '<b>'+esc(c.a)+'</b> e <b>'+esc(c.b)+'</b> ('+num(c.c,2)+')'}).join(', ')+'. Quando uma cai, a outra costuma cair também, então elas diversificam pouco entre si.']);
  else if(r.cor.length)D.push(['ok','Ativos que se compensam','Nenhum par de ativos anda muito junto (todas as correlações abaixo de 0,55). Isso é boa diversificação.']);
  /* 5. volatilidade e beta */
  if(P.vol!=null){var lv=P.vol<0.1?'Baixo':P.vol<0.18?'Moderado':'Alto';
    D.push([P.vol<0.18?'ok':'at','Oscilação da carteira: '+lv.toLowerCase(),'Sua carteira oscila uns <b>'+pf.format(P.vol*100)+'% ao ano</b>'+(P.ibVol?', contra '+pf.format(P.ibVol*100)+'% do Ibovespa. Ela é '+(P.vol<P.ibVol?'mais calma':'mais agitada')+' que a bolsa brasileira':'')+'.'+(P.beta.ibov?' Se o Ibovespa cair 10%, ela tende a cair uns <b>'+pf.format(Math.abs(P.beta.ibov.b*10))+'%</b>.':'')]);
    D.push([P.dd<-0.25?'al':P.dd<-0.15?'at':'ok','Pior queda em '+num(P.yrs,1)+' anos','Com a carteira de hoje, a maior queda teria sido de <b>'+sg(P.dd)+'</b> (de '+fmtW(P.ddA)+' a '+fmtW(P.ddB)+')'+(P.rec?', e ela se recuperou em '+fmtW(P.rec)+'.':', e ainda não tinha voltado ao topo.')+' Em reais de hoje, seria uns <b>'+brl.format(Math.abs(P.dd)*T)+'</b>.']);
    if(P.var95!=null)D.push(['ok','Perda normal num mês ruim','Em 95% dos meses, a carteira não perdeu mais que <b>'+pf.format(Math.abs(Math.min(0,P.var95))*100)+'%</b> (uns '+brl.format(Math.abs(Math.min(0,P.var95))*T)+'). Um mês pior que isso acontece mais ou menos 1 vez a cada 20.'])}
  /* 6. diversificação */
  D.push([r.effN<3&&!r.as.some(function(a){return a.us})?'at':'ok','Diversificação','Pelo peso de cada ativo, sua carteira equivale a uns <b>'+num(r.effN,1)+' ativos de mesmo tamanho</b>'+(r.as.some(function(a){return a.us})?' (e o VT sozinho já tem milhares de empresas do mundo)':'')+'.']);
  D=pfRisco(P,T,r.usdV/T).concat(D);
  var nAl=D.filter(function(d){return d[0]==='al'}).length,nAt=D.filter(function(d){return d[0]==='at'}).length;
  var grau=P.vol==null?'—':P.vol<0.1?'Baixo':P.vol<0.18?'Moderado':'Alto';
  var main=D.filter(function(d){return d[0]==='al'})[0]||D.filter(function(d){return d[0]==='at'})[0];
  var h='<div class="panel rkhero"><div class="rkg"><div><span class="lbl">Risco da carteira '+bal('Nota geral de risco, calculada sozinha pelo app com 5 anos de preços: baixo, moderado ou alto, pelo quanto a carteira sobe e desce. Serve para você saber se está correndo mais risco do que gostaria.')+'</span><b class="rkgr '+(grau==='Alto'?'l':grau==='Moderado'?'m':'g')+'">'+grau+'</b></div>'+
    '<div class="rkct"><span>'+rkLvl('ok')+(D.length-nAl-nAt)+' ok</span><span>'+rkLvl('at')+nAt+' atenção</span><span>'+rkLvl('al')+nAl+' alerta</span></div></div>'+
    (main?'<p class="rkmain">Ponto principal: <b>'+main[1].toLowerCase()+'</b>.</p>':'<p class="rkmain">Nenhum ponto de atenção agora.</p>')+'</div>';
  h+='<div class="panel"><h2>Diagnóstico '+bal('O app olha sua carteira sozinho e aponta o que está bom (verde), o que merece atenção (amarelo) e o que é alerta (vermelho): dólar, concentração, setor, ações que caem juntas, oscilação e pior queda.')+'</h2><ul class="rkl">'+D.map(function(d){return '<li>'+rkLvl(d[0])+'<div><b>'+d[1]+'</b><p>'+d[2]+'</p></div></li>'}).join('')+'</ul></div>';
  /* cenários */
  var sc=[['Ibovespa cai 20%','ibov',-0.2],['Bolsa americana (S&P 500) cai 20%','SPY',-0.2],['Dólar cai 10%','usd',-0.1],['Dólar sobe 15%','usd',0.15],['Petróleo cai 25%','brent',-0.25],['Crise no Brasil (Ibovespa −25% e dólar +20%)','two',0,[-0.25,0.2]]];
  try{h+=rpHtml()}catch(e){}
  h+='<div class="panel"><h2>Cenários '+bal('E se acontecer isso amanhã? Mostra quanto sua carteira mudaria em situações comuns (bolsa caindo, dólar subindo...), pelo jeito que cada ativo reagiu no passado. Não é previsão.')+'</h2><p class="note" style="margin:0 0 10px">E se acontecer isso amanhã? Quanto sua carteira mudaria, pelo jeito que cada ativo reagiu nos últimos anos.</p><ul class="rksc">'+sc.map(function(s){if(s[1]!=='two'&&!r.F[s[1]])return '';var im=rkImpact(r,s[1],s[2],s[3]);
    var by=im.rows.filter(function(x){return Math.abs(x.v)>=1}).sort(function(a,b){return Math.abs(b.v)-Math.abs(a.v)}).slice(0,3);
    return '<li><div><b>'+s[0]+'</b><small>'+(by.length?'Mais afetados: '+by.map(function(x){return esc(x.tk)+' '+rs(x.v)}).join(', '):'Quase nada muda')+'</small></div><span class="num '+cls(im.tot)+'">'+rs(im.tot)+'<small>'+sg(im.tot/T)+'</small></span></li>'}).join('')+'</ul></div>';
  /* simulador */
  h+='<div class="panel"><h2>Simulador '+bal('Escolha o que muda (Ibovespa, dólar, petróleo...) e arraste a barrinha: o app calcula na hora quanto sua carteira ganharia ou perderia, ação por ação.')+'</h2><div class="rksim"><select class="pvsel" id="rk-f" aria-label="O que muda">'+Object.keys(RFAC).filter(function(k){return r.F[k]}).map(function(k){return '<option value="'+k+'"'+(RSIM.f===k?' selected':'')+'>'+RFAC[k][0]+'</option>'}).join('')+'</select>'+
    '<input type="range" id="rk-s" min="-50" max="50" step="5" value="'+RSIM.s+'" aria-label="Quanto muda"></div><div id="rk-out">'+rkSimOut(r)+'</div></div>';
  /* gráfico */
  if(P.ser&&P.ser.length>2){var base=T/P.ser[P.ser.length-1].c;
    h+='<div class="panel"><h2>Sua carteira de hoje no passado '+bal('Como teriam ido os ativos que você tem hoje, nos mesmos pesos, nos últimos anos. Mostra a pior semana e o tamanho das quedas que essa carteira já enfrentou.')+'</h2><p class="note" style="margin:0 0 8px">Se você tivesse exatamente os ativos de hoje, nos mesmos pesos, nos últimos '+num(P.yrs,1)+' anos. Só preço, com o VT em reais.</p>'+lineChart(P.ser.map(function(p){return {t:p.t,c:p.c*base}}),'BRL',null)+
      '<div class="kpis" style="margin-top:10px"><div><span>No período</span><b class="'+cls(P.cum)+'">'+sg(P.cum)+'</b></div><div><span>Pior semana</span><b class="loss">'+sg(P.worstW)+'</b></div></div></div>'}
  /* composição */
  var sk=Object.keys(r.sec).sort(function(a,b){return r.sec[b]-r.sec[a]}),cs=['var(--c1)','var(--c6)','var(--c2)','var(--c5)','var(--c4)','var(--c3)'];
  h+='<div class="panel"><h2>Onde está o seu dinheiro '+bal('Divisão por setor da economia e por moeda (real ou dólar). Ajuda a ver se você está muito concentrado num lugar só.')+'</h2><h3 class="rkh3">Por setor</h3><ul class="pvar">'+sk.map(function(k,i){var w=r.sec[k]/T;return '<li><b>'+esc(k)+'</b><span class="num">'+pf.format(w*100)+'%</span><span class="num muted small">'+brl.format(r.sec[k])+'</span><i><em style="width:'+Math.max(2,w*100).toFixed(1)+'%;background:'+cs[i%cs.length]+'"></em></i></li>'}).join('')+'</ul>'+
    '<h3 class="rkh3">Por moeda</h3><ul class="pvar"><li><b>Real</b><span class="num">'+pf.format((1-uS)*100)+'%</span><span class="num muted small">'+brl.format(T-r.usdV)+'</span><i><em style="width:'+((1-uS)*100).toFixed(1)+'%;background:var(--c1)"></em></i></li><li><b>Dólar</b><span class="num">'+pf.format(uS*100)+'%</span><span class="num muted small">'+brl.format(r.usdV)+'</span><i><em style="width:'+(uS*100).toFixed(1)+'%;background:var(--c2)"></em></i></li></ul></div>';
  /* por ativo */
  var la=r.as.filter(function(a){return a.r}).sort(function(a,b){return b.v-a.v});
  if(la.length)h+='<div class="panel"><h2>Risco de cada ativo '+bal('Quanto cada ativo costuma oscilar no ano, a maior queda que já teve e quanto ele reage quando o Ibovespa ou o dólar se mexem.')+'</h2><div class="atsc"><table class="pvdt rkt"><thead><tr><th>Ativo</th><th>Peso</th><th>Oscilação/ano</th><th>Pior queda</th><th>Reage ao Ibov</th><th>Reage ao dólar</th></tr></thead><tbody>'+
    la.map(function(a){var bi=a.beta.ibov,bu=a.beta.usd;return '<tr><td><b>'+esc(a.tk)+'</b></td><td>'+pf.format(a.w*100)+'%</td><td>'+pf.format(a.vol*100)+'%</td><td class="loss">'+sg(a.dd)+'</td><td>'+(bi?num(bi.b,2):'—')+'</td><td>'+(bu?num(bu.b,2):'—')+'</td></tr>'}).join('')+'</tbody></table></div>'+
    '<p class="note">"Reage ao Ibov" 1,00 = anda igual ao Ibovespa; 0,50 = metade; negativo = costuma ir para o lado contrário. Mesma ideia para o dólar.</p></div>';
  /* correlação */
  if(la.length>2){var tks=la.map(function(a){return a.tk}),cm={};r.cor.forEach(function(c){cm[c.a+'|'+c.b]=c.c;cm[c.b+'|'+c.a]=c.c});
    h+='<div class="panel"><h2>Quem anda junto '+bal('Correlação: se dois ativos costumam subir e cair juntos (vermelho), eles protegem pouco um ao outro. Perto de zero ou verde é melhor para diversificar.')+'</h2><div class="atsc"><table class="rkcm"><thead><tr><th></th>'+tks.map(function(t){return '<th>'+esc(t)+'</th>'}).join('')+'</tr></thead><tbody>'+
      tks.map(function(a){return '<tr><th>'+esc(a)+'</th>'+tks.map(function(b){var v=a===b?1:cm[a+'|'+b];if(v==null)return '<td>—</td>';var al=Math.min(1,Math.abs(v));return '<td style="background:color-mix(in srgb,'+(v>=0?'var(--loss)':'var(--gain)')+' '+Math.round(al*55)+'%,transparent)">'+num(v,2)+'</td>'}).join('')+'</tr>'}).join('')+'</tbody></table></div>'+
      '<p class="note">Correlação de −1 a 1. Perto de 1 (vermelho) = sobem e caem juntos; perto de 0 = independentes; negativo (verde) = um compensa o outro.</p></div>'}
  h+='<p class="note exp" style="margin:0 4px">Tudo aqui é calculado sozinho pelo app com o histórico semanal de preços (até 5 anos) que o robô traz todo dia, o dólar e os índices. Os cenários mostram o que aconteceria pelo comportamento do passado, não são previsão.'+(r.miss.length?' Sem histórico ainda: '+r.miss.map(esc).join(', ')+'.':'')+' A renda fixa entra como CDI, sem oscilar. Ferramenta de estudo, não recomendação de compra ou venda.</p>';
  return h}
function rkSimOut(r){r=r||RKC.r;if(!r)return '';var s=RSIM.s/100,im=rkImpact(r,RSIM.f,s);
  return '<p class="rksq">Se <b>'+RFAC[RSIM.f][0]+'</b> '+(s>=0?'subir':'cair')+' <b>'+Math.abs(RSIM.s)+'%</b>, sua carteira '+(im.tot>=0?'ganha':'perde')+' uns <b class="'+cls(im.tot)+'">'+brl.format(Math.abs(im.tot))+'</b> ('+(im.tot>=0?'+':'−')+pf.format(Math.abs(im.tot/r.tot*100))+'%).</p>'+
    '<ul class="calc small">'+im.rows.filter(function(x){return Math.abs(x.v)>=0.5}).sort(function(a,b){return a.v-b.v}).map(function(x){return '<li><span>'+esc(x.tk)+' <span class="muted">'+(x.d>=0?'+':'−')+pf.format(Math.abs(x.d*100))+'%</span></span><span class="num '+cls(x.v)+'">'+(x.v>=0?'+':'−')+brl.format(Math.abs(x.v))+'</span></li>'}).join('')+'</ul>'}
function renderRisk(R){var el=$('risktab');if(!el)return;try{el.innerHTML=riskHtml(R||compute())}catch(e){el.innerHTML='<div class="panel"><p class="warn">Não consegui calcular o risco agora.</p></div>'}}
document.addEventListener('input',function(e){var t=e.target;if(t&&t.id==='rk-s'){RSIM.s=+t.value;var o=$('rk-out');if(o)o.innerHTML=rkSimOut()}});
document.addEventListener('change',function(e){var t=e.target;if(t&&t.id==='rk-f'){RSIM.f=t.value;var o=$('rk-out');if(o)o.innerHTML=rkSimOut()}});
