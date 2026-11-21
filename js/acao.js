/* Aporte · js/acao.js — página da ação: análise, preço justo e gráfico.
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
/* ===== Análise automática da ação (Resumo e Valuation): olha os indicadores, compara com o setor e conclui sozinha ===== */
var STV='res',VALP={};
try{STV=localStorage.getItem(LS+'-stv')||'res'}catch(e){}
function anMed(a){a=a.filter(function(v){return v!=null&&isFinite(v)}).sort(function(x,y){return x-y});if(a.length<3)return null;var m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
var ANPC={k:'',m:{}};
function anPeers(tk){var ck=MD.d&&MD.d.ts;if(ANPC.k!==ck)ANPC={k:ck,m:{}};if(tk in ANPC.m)return ANPC.m[tk];return ANPC.m[tk]=anPeers0(tk)}
/* holdings que só existem por causa de outra empresa da lista (não servem de concorrente dela) */
var ANHOLD={VALE:['BRAP'],ITUB:['ITSA'],BBDC:['BRAP'],PETR:[],SANB:[],ELET:[],CMIG:[],GGBR:['GOAU'],GOAU:['GGBR'],USIM:[],CSNA:['CMIN'],CMIN:['CSNA']};
function anPeers0(tk){var sc=MD.d&&MD.d.sect&&MD.d.sect[tk],P=MD.d&&MD.d.peers||{},sid=sc&&sc[2]!=null?String(sc[2]):null,name=sc?sc[0]:'';
  if(!sid)Object.keys(P).some(function(k){if(P[k].indexOf(tk)>=0){sid=k;return true}return false});
  if(!sid&&!name)return null;
  if(!name)Object.keys(MD.d.sect||{}).some(function(t){var s=MD.d.sect[t];if(String(s[2])===sid){name=s[0];return true}return false});
  var hold=ANHOLD[tk.slice(0,4)]||[],best={};(sid&&P[sid]||[]).forEach(function(t){var f=fundOf(t),r=t.slice(0,4);if(r===tk.slice(0,4)||hold.indexOf(r)>=0||!f||!(f.liq2m>=2e5))return;if(!best[r]||f.liq2m>fundOf(best[r]).liq2m)best[r]=t});
  var ls=Object.keys(best).map(function(r){return best[r]});
  var fs=ls.map(fundOf),col=function(k,pos){return anMed(fs.map(function(f){var v=f[k];return pos&&!(v>0)?null:v}))};
  return {name:name,n:ls.length,t:ls,pl:col('pl',1),pvp:col('pvp',1),dy:col('dy'),roe:col('roe'),ml:col('ml'),evebitda:col('evebitda',1),roic:col('roic'),divpl:col('divpl'),mebit:col('mebit'),evebit:col('evebit',1)}}
/* números da ação numa unidade só (% como 15 = 15%) */
function anNums(tk,d){var F=d.cur==='USD'?null:fundOf(tk),K=d.k||{},x100=function(v){return v==null?null:v*100};
  if(F)return {pl:F.pl,pvp:F.pvp,dy:F.dy,roe:F.roe,roic:F.roic,ml:F.ml,evebitda:F.evebitda,divpl:F.divpl,lc:F.lc,cr5:F.cr5,liq:F.liq2m,mebit:F.mebit,evebit:F.evebit,pebit:F.pebit,psr:F.psr};
  return {pl:K.pl,pvp:K.pvp,dy:x100(K.dy),roe:x100(K.roe),roic:x100(K.roic),ml:x100(K.ml),evebitda:K.evebitda,divpl:K.div!=null&&K.div>5?K.div/100:K.div,lc:K.lc,cr5:x100(K.cr5),liq:null}}
function anVol(tk){var h=MD.d&&MD.d.hist&&MD.d.hist[tk];if(!h||!h.w||h.w.length<30)return null;var r=rkRet(rkSer(h.w)),a=Object.keys(r).map(function(k){return r[k]});return rkStd(a)*Math.sqrt(52)}
function stkAna(tk,d){
  var N=anNums(tk,d),us=d.cur==='USD',sec=us?['Exterior','']:rkSect(tk),fin=sec[0]==='Financeiro',pe=us?null:anPeers(tk),pos=[],neg=[],inf=[],q=[],p=[];
  var etf=us&&N.pl==null&&N.roe==null;
  if(etf)return {etf:1};
  var f1=function(v){return pf.format(v)},has=function(v){return v!=null&&isFinite(v)};
  /* qualidade */
  if(has(N.roe)){if(N.roe<=0){neg.push(['Deu prejuízo nos últimos 12 meses','ROE de '+f1(N.roe)+'%.']);q.push(0)}
    else if(N.roe>=15){pos.push(['Alta rentabilidade','ROE de '+f1(N.roe)+'%: para cada R$ 100 de patrimônio, lucra R$ '+num(N.roe,0)+' por ano'+(pe&&has(pe.roe)?' (setor: '+f1(pe.roe)+'%)':'')+'.']);q.push(2)}
    else if(N.roe<8){neg.push(['Rentabilidade baixa','ROE de '+f1(N.roe)+'%'+(pe&&has(pe.roe)?', contra '+f1(pe.roe)+'% do setor':'')+'.']);q.push(0)}else q.push(1)}
  if(!fin&&has(N.roic)){if(N.roic>=12){pos.push(['Bom retorno sobre o capital','ROIC de '+f1(N.roic)+'%.']);q.push(2)}else if(N.roic<6){neg.push(['Retorno sobre o capital fraco','ROIC de '+f1(N.roic)+'%.']);q.push(0)}else q.push(1)}
  if(!fin&&has(N.ml)){if(N.ml<0)neg.push(['Margem negativa','Gasta mais do que fatura.']);else if(pe&&has(pe.ml)&&N.ml>pe.ml*1.25&&N.ml>=8)pos.push(['Margem acima do setor','Margem líquida de '+f1(N.ml)+'%, contra '+f1(pe.ml)+'% das concorrentes.']);else if(N.ml<5)neg.push(['Margem apertada','Margem líquida de '+f1(N.ml)+'%: sobra pouco do que vende.'])}
  if(!fin&&has(N.divpl)){if(N.divpl<=0.5){pos.push(['Pouca dívida','Dívida bruta de '+num(N.divpl,2)+' vez o patrimônio.']);q.push(2)}else if(N.divpl>=1.5){neg.push(['Empresa endividada','Dívida bruta de '+num(N.divpl,2)+' vezes o patrimônio. Juros altos pesam no lucro.']);q.push(0)}else q.push(1)}
  if(!fin&&has(N.lc)&&N.lc>0&&N.lc<1)neg.push(['Caixa de curto prazo apertado','Liquidez corrente de '+num(N.lc,2)+': tem menos dinheiro de curto prazo do que contas a pagar no ano.']);
  var QQ=us?null:cvmQ(tk),TT=QQ&&qTtm(QQ);if(TT&&TT.g!=null){if(TT.a<0)neg.push(['Prejuízo nos últimos 12 meses','Somando os 4 últimos trimestres, a empresa perdeu '+qfmt(Math.abs(TT.a))+'.']);else if(TT.g>=0.15)pos.push(['Lucro crescendo','Lucro dos últimos 12 meses '+pf.format(TT.g*100)+'% maior que nos 12 meses anteriores ('+qfmt(TT.a)+').']);else if(TT.g<=-0.15)neg.push(['Lucro caindo','Lucro dos últimos 12 meses '+pf.format(Math.abs(TT.g)*100)+'% menor que nos 12 meses anteriores ('+qfmt(TT.a)+').'])}
  if(has(N.cr5)){if(N.cr5>=10)pos.push(['Receita crescendo','Cresceu uns '+f1(N.cr5)+'% ao ano nos últimos 5 anos.']);else if(N.cr5<0)neg.push(['Receita encolhendo','Caiu uns '+f1(Math.abs(N.cr5))+'% ao ano nos últimos 5 anos.'])}
  /* preço */
  if(has(N.pl)&&N.pl>0){if(pe&&has(pe.pl)){if(N.pl<pe.pl*0.8){pos.push(['Mais barata que o setor pelo lucro','P/L de '+num(N.pl,1)+', contra '+num(pe.pl,1)+' das concorrentes.']);p.push(2)}else if(N.pl>pe.pl*1.3){neg.push(['Mais cara que o setor pelo lucro','P/L de '+num(N.pl,1)+', contra '+num(pe.pl,1)+' das concorrentes.']);p.push(0)}else p.push(1)}
    else{if(N.pl<8){pos.push(['Preço baixo pelo lucro','P/L de '+num(N.pl,1)+': o preço equivale a uns '+num(N.pl,0)+' anos de lucro.']);p.push(2)}else if(N.pl>25){neg.push(['Preço alto pelo lucro','P/L de '+num(N.pl,1)+'.']);p.push(0)}else p.push(1)}}
  if(has(N.pvp)&&N.pvp>0){if(N.pvp<1&&has(N.roe)&&N.roe>=10){pos.push(['Abaixo do patrimônio','P/VP de '+num(N.pvp,2)+': o mercado paga menos do que a empresa vale no balanço, e ela ainda dá lucro.']);p.push(2)}else if(N.pvp>3&&has(N.roe)&&N.roe<15){neg.push(['Cara pelo patrimônio','P/VP de '+num(N.pvp,2)+' sem uma rentabilidade que justifique.']);p.push(0)}}
  if(!fin&&has(N.evebitda)&&N.evebitda>0&&pe&&has(pe.evebitda)){if(N.evebitda<pe.evebitda*0.8)p.push(2);else if(N.evebitda>pe.evebitda*1.3)p.push(0)}
  /* dividendos */
  if(has(N.mebit)&&has(N.ml)&&N.mebit>=8&&N.ml<N.mebit*0.3)inf.push(['Lucro líquido bem abaixo do operacional','Margem da operação (EBIT) de '+f1(N.mebit)+'% e margem líquida de '+f1(N.ml)+'%. Algo depois da operação (juros, impostos, câmbio ou itens extraordinários) consumiu o lucro. Enquanto isso durar, o P/L e o preço justo baseado em lucro ficam distorcidos.']);
  var dyL=null;if(has(N.dy)){if(N.dy>15){inf.push(['Dividendos muito altos','DY de '+f1(N.dy)+'%: pode ter pagamento extraordinário que não se repete.']);dyL='Altos'}else if(N.dy>=6){pos.push(['Boa pagadora de dividendos','DY de '+f1(N.dy)+'% nos últimos 12 meses'+(pe&&has(pe.dy)?' (setor: '+f1(pe.dy)+'%)':'')+'.']);dyL='Altos'}else if(N.dy>=3)dyL='Médios';else{dyL='Baixos';if(!us)inf.push(['Paga pouco dividendo','DY de '+f1(N.dy)+'%. Pode ser empresa que reinveste para crescer.'])}}
  /* mercado */
  var hi=d.k&&d.k.hi,lo=d.k&&d.k.lo;if(hi&&d.price){var dd=d.price/hi-1;if(dd<=-0.25)inf.push(['Caiu bastante da máxima','Está '+pf.format(Math.abs(dd*100))+'% abaixo da máxima de 12 meses ('+(us?usd:brl).format(hi)+'). Pode ser oportunidade ou sinal de problema: vale entender o motivo.']);else if(dd>-0.05)inf.push(['Perto da máxima do ano','Está a '+pf.format(Math.abs(dd*100))+'% da máxima de 12 meses.'])}
  if(has(N.liq)&&N.liq<1e6)neg.push(['Pouca negociação','Só uns '+brl.format(N.liq)+' por dia: pode ser difícil comprar ou vender sem mexer no preço.']);
  var vol=anVol(tk),rk=[];if(vol!=null){if(vol>0.4){neg.push(['Oscila muito','Uns '+pf.format(vol*100)+'% ao ano.']);rk.push(2)}else if(vol<0.22)rk.push(0);else rk.push(1)}
  if(!fin&&has(N.divpl))rk.push(N.divpl>=1.5?2:N.divpl<=0.5?0:1);
  /* o que mudou agora (pesa em dobro na nota): último trimestre, notícias e preço em queda; vira aviso em destaque */
  var alr=[];
  if(QQ&&QQ.length>=3){var L=QQ[QQ.length-1],Py=null,Pq=QQ[QQ.length-2],tri=L[1]+'º tri de '+L[0],gy=function(a,b){return a!=null&&b!=null&&b>0?a/b-1:null};
    QQ.forEach(function(x){if(x[0]===L[0]-1&&x[1]===L[1])Py=x});
    var ly=Py?gy(L[3],Py[3]):null,ry=Py?gy(L[2],Py[2]):null,lq=gy(L[3],Pq[3]),fl=0;
    if(L[3]!=null&&L[3]<0&&!(TT&&TT.a<0)){neg.push(['Prejuízo no último trimestre','No '+tri+' a empresa perdeu '+qfmt(Math.abs(L[3]))+'.',2]);alr.push(neg[neg.length-1].slice(0,2));fl=1}
    else if(ly!=null&&ly<=-0.15){neg.push(['Lucro do último trimestre caiu','No '+tri+' o lucro foi de '+qfmt(L[3])+', '+pf.format(Math.abs(ly*100))+'% menor que no mesmo trimestre do ano passado ('+qfmt(Py[3])+').',2]);alr.push(neg[neg.length-1].slice(0,2));fl=1}
    else if(ly!=null&&ly>=0.15)pos.push(['Lucro do último trimestre cresceu','No '+tri+' o lucro foi de '+qfmt(L[3])+', '+pf.format(ly*100)+'% maior que no mesmo trimestre do ano passado.',2]);
    if(ry!=null&&ry<=-0.05){neg.push(['Receita do último trimestre caiu','No '+tri+' a receita foi de '+qfmt(L[2])+', '+pf.format(Math.abs(ry*100))+'% menor que no mesmo trimestre do ano passado. Vendeu menos.',2]);alr.push(neg[neg.length-1].slice(0,2))}
    else if(ry!=null&&ry>=0.10)pos.push(['Receita do último trimestre cresceu','No '+tri+' a receita foi de '+qfmt(L[2])+', '+pf.format(ry*100)+'% maior que no mesmo trimestre do ano passado.',2]);
    if(!fl&&lq!=null&&lq<=-0.2)inf.push(['Lucro caiu contra o trimestre anterior','No '+tri+' o lucro foi '+pf.format(Math.abs(lq*100))+'% menor que no trimestre anterior. Em algumas empresas isso é sazonal: compare com o mesmo trimestre do ano passado.'])}
  var MO=anMom(tk,d.price);if(MO){if(MO.m6!=null&&MO.m6<=-0.2){neg.push(['Preço em queda','A ação caiu '+pf.format(Math.abs(MO.m6*100))+'% em 6 meses'+(MO.m3!=null?' ('+sp0(MO.m3)+' nos últimos 3 meses)':'')+'. Entenda o motivo antes de achar que ficou barata.',1]);alr.push(neg[neg.length-1].slice(0,2))}
    else if(MO.m3!=null&&MO.m3<=-0.15){neg.push(['Preço em queda','A ação caiu '+pf.format(Math.abs(MO.m3*100))+'% nos últimos 3 meses.',1]);alr.push(neg[neg.length-1].slice(0,2))}}
  var RS=us?null:rsOf(tk);if(RS&&RS.ai){var ai=RS.ai;
    if(ai.sentimento==='negativo'){neg.push(['Notícias recentes negativas',(ai.resumo?String(ai.resumo).slice(0,170)+(String(ai.resumo).length>170?'…':'')+' ':'')+'(Leitura da IA das manchetes, em '+rsWhen(RS.aiAt)+'. Pode errar: confira na aba Notícias.)',2]);alr.push(neg[neg.length-1].slice(0,2))}
    (ai.eventos||[]).filter(function(v){return v.direcao==='negativo'&&v.impacto==='alto'}).slice(0,2).forEach(function(v){alr.push(['Pode pesar no preço: '+(v.titulo||''),(v.porque||'')+(v.prazo?' (efeito: '+v.prazo+')':'')])})}
  var avg=function(a){return a.length?a.reduce(function(s,x){return s+x},0)/a.length:null},qa=avg(q),pa=avg(p),ra=avg(rk);
  var chips=[['Qualidade',qa==null?'—':qa>=1.4?'Alta':qa>=0.7?'Média':'Baixa',qa==null?'':qa>=1.4?'g':qa>=0.7?'m':'l'],['Preço',pa==null?'—':pa>=1.4?'Barata':pa>=0.7?'Justa':'Cara',pa==null?'':pa>=1.4?'g':pa>=0.7?'m':'l'],['Dividendos',dyL||'—',dyL==='Altos'?'g':dyL==='Médios'?'m':dyL?'l':''],['Risco',ra==null?'—':ra>=1.4?'Alto':ra>=0.7?'Médio':'Baixo',ra==null?'':ra>=1.4?'l':ra>=0.7?'m':'g']];
  var ws=function(a){return a.reduce(function(t,x){return t+(x[2]||1)},0)},wp=ws(pos),wn=ws(neg),nt=pos.length+neg.length,score=nt>=2?Math.round(wp/(wp+wn)*100)/10:null;
  return {pos:pos,neg:neg,inf:inf,chips:chips,score:score,pe:pe,N:N,fin:fin,sec:sec,us:us,alr:alr,wp:wp,wn:wn}}
function sp0(g){return (g>=0?'+':'−')+pf.format(Math.abs(g*100))+'%'}
/* variação do preço em 3 e 6 meses, pelo histórico do robô */
function anMom(tk,P){var h=MD.d&&MD.d.hist&&MD.d.hist[tk];if(!h||!P)return null;var day=Math.floor(Date.now()/864e5),at=function(a,dd){if(!a||!a.length)return null;var best=null;for(var i=0;i<a.length;i++){if(a[i][0]<=day-dd)best=a[i][1];else break}return best},b6=at(h.d,182)||at(h.w,182),b3=at(h.d,91)||at(h.w,91);return {m3:b3?P/b3-1:null,m6:b6?P/b6-1:null}}
/* a ação dentro da sua carteira */
function anFit(tk,d,A){var R=compute(),r=null;try{r=riskData(R)}catch(e){}if(!r)return '';
  var a=r.as.filter(function(x){return x.tk===tk})[0],T=r.tot,out=[],sec=A.sec[0];
  var bsv=0,bt=0;r.as.forEach(function(x){if(x.us)return;var s=(x.sect||rkSect(x.tk,x.us))[0];bt+=x.v;if(s===sec)bsv+=x.v});
  if(a){out.push('Pesa <b>'+pf.format(a.w*100)+'%</b> do seu patrimônio ('+brl.format(a.v)+').');
    if(!A.us&&bt)out.push('Seu setor '+esc(sec.toLowerCase())+' soma <b>'+pf.format(bsv/bt*100)+'%</b> das suas ações do Brasil.');}
  else if(!A.us&&bt){var nv=1000;out.push('Se você comprar R$ 1.000, o setor '+esc(sec.toLowerCase())+' passa de <b>'+pf.format(bsv/bt*100)+'%</b> para <b>'+pf.format((bsv+nv)/(bt+nv)*100)+'%</b> das suas ações do Brasil.')}
  var h=MD.d&&MD.d.hist&&MD.d.hist[tk];if(h&&h.w&&r.P&&r.P.r){var ra=rkRet(rkSer(h.w));if(A.us){var u=rkSer(MD.d.idx.usd&&MD.d.idx.usd.w),m=rkSer(h.w),mb={};for(var k in m)if(u[k])mb[k]=m[k]*u[k];ra=rkRet(mb)}
    var pr=r.P.r;if(a){pr={};var aw=a.w;for(var k2 in r.P.r)if(k2 in ra)pr[k2]=(r.P.r[k2]-aw*ra[k2])/Math.max(0.01,1-aw)}
    var c=rkPair(ra,pr);if(c)out.push('Correlação com '+(a?'o resto da ':'a sua ')+'carteira: <b>'+num(c.c,2)+'</b>. '+(c.c<0.3?'Anda bem diferente do resto, então ajuda a diversificar.':c.c<0.6?'Anda parecido com o resto em parte.':'Anda muito junto com o resto: diversifica pouco.'))}
  return out.length?'<div class="panel anp"><h2>Na sua carteira '+bal('Mostra se essa ação combina com o que você já tem: quanto ela pesa, quanto o setor dela soma e se ela anda junto ou diferente do resto (ajuda ou não a diversificar).')+'</h2><ul class="anl">'+out.map(function(t){return '<li>'+t+'</li>'}).join('')+'</ul></div>':''}
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
function stkRender(){if(STK.tk&&STK.d&&!STK.idx&&STK.tk.charAt(0)!=='^'){var lv0=livePx(STK.tk);if(lv0&&(!STK.d.at||lv0.at>STK.d.at)){STK.d.price=lv0.p;if(lv0.pct!=null)STK.d.pct=lv0.pr!=null?lv0.pr:lv0.pct}}
  var b=$('stk-b');if(!b||$('stk').hidden)return;var d=STK.d,tk=STK.tk;
  if(!d){b.innerHTML=STK.err?'<p class="warn">'+esc(STK.err)+'</p><button type="button" class="btn ghost" style="margin-top:12px" data-rng="'+STK.rng+'">Tentar de novo</button>':'<p class="muted">Carregando '+esc(tk)+'...</p>';return}
  var F=d.cur==='USD'?usd:brl,K=d.k||{},R=compute(),mine=R.held.filter(function(x){return x.p.ticker===tk})[0],pm=mine?mine.p.cN/mine.p.qty:null;
  var W=wlist(),inW=W.indexOf(tk)>=0;
  var pc=function(v){return v==null?'—':pf.format(v*100)+'%'},nm=function(v,dd){return v==null?'—':num(v,dd==null?2:dd)};
  var big=function(v){return v==null?'—':(d.cur==='USD'?'US$ ':'R$ ')+(v>=1e9?num(v/1e9,1)+' bi':num(v/1e6,0)+' mi')};
  var dyC=K.dy!=null?K.dy:(K.d12&&d.price?K.d12/d.price:null),pvp=K.pvp!=null?K.pvp:(K.vpa&&d.price?d.price/K.vpa:null);
  var hs=rgCut(d.hist,STK.rng),fv=finView(ySym(tk),STK.rng),fo=null,fmsg='',fat=0;if(fv){if(fv.st==='ok'){hs=fv.hist;fo=fv.o;fat=fv.at||0}else{fmsg=fv.msg;hs=STK.rng==='5d'?d.hist.slice(-6):[]}}
  var ch=hs.length>1?hs[hs.length-1].c/((fo&&fo.prev)||hs[0].c)-1:null,lv1=livePx(tk),zd,prv=d.pct!=null?d.price/(1+d.pct/100):null,
    zd=tk.charAt(0)!=='^'&&dzero(!isBR(tk),Math.max(lv1&&lv1.at||0,d.at||0)),perPct=STK.rng==='yr'?(zd?0:d.pct):ch!=null?ch*100:(zd?0:d.pct),perAbs=STK.rng==='yr'||ch==null?(prv!=null?(zd?0:d.price-prv):null):hs[hs.length-1].c-((fo&&fo.prev)||hs[0].c),perRg=STK.rng==='yr'||ch==null?'1d':STK.rng;
  var st=finStat(ySym(tk)),h='<div class="gcard">'+(lv1&&lv1.sus?'<p class="warn" style="margin:0 0 8px">Confira esse preço: '+esc(lv1.sus)+'. Pode estar errado ou atrasado.</p>':'')+gHead(d.name,d.sector,F.format(d.price),perAbs,perPct,perRg,'',gWhen(Math.max(lv1&&lv1.at||0,fat)||d.at,tk))+whyHtml(tk,lv1?lv1.pct:(zd?0:d.pct),tk)+(d.cur==='USD'?extHtml(tk):'')+
    rngBar(STK.rng,d.fast?[]:['max'])+
    (STK.busy?'<p class="muted small">Atualizando...</p>':'')+(d.rgGot!==undefined&&d.rgGot!==rgEff()&&STK.rng!=='yr'&&STK.rng!=='1d'&&STK.rng!=='5d'&&STK.rng!=='max'?'<p class="note" style="margin:0 0 6px">O plano grátis do brapi '+(d.rgGot?'só liberou até '+({'1mo':'1 mês','3mo':'3 meses','6mo':'6 meses','1y':'1 ano'}[d.rgGot]||d.rgGot)+' de gráfico':'não liberou o gráfico')+' para essa ação.</p>':'')+(STK.rng==='yr'?annHtml(annRets(d.hist,d.price)):(fmsg?'<p class="muted small" style="margin:12px 0">'+esc(fmsg)+(STK.rng==='5d'?' Por enquanto, os fechamentos dos últimos dias.':'')+'</p>':'')+(fmsg&&STK.rng!=='5d'?'':lineChart(hs,d.cur,pm,null,fo)));

  var f0=function(v){return v!=null?pf.format(v):null},op=st?st.o:d.o,hh=st?st.h:d.h,ll=st?st.l:d.l;
  h+=gStats([['Abertura',f0(op)],['Alta',f0(hh)],['Baixa',f0(ll)],['Fech. ant.',f0(st&&st.prev!=null?st.prev:prv)],['Alt 52 sem',f0(K.hi)],['Bai 52 sem',f0(K.lo)]])+(tk.charAt(0)!=='^'?'<button type="button" class="gan" data-gan="1">Analisar '+esc(tk)+' ›</button>':'')+'</div>';
  h+=(tk.charAt(0)!=='^'&&d.cur!=='USD'?sibHtml(tk):'')+'<div class="seg stseg" id="stv-top">'+[['res','Resumo'],['val','Preço justo'],['ind','Indicadores'],['news','Notícias']].map(function(x){return '<button type="button" data-stv="'+x[0]+'" aria-pressed="'+(STV===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>';
  var PE=d.cur==='USD'?null:anPeers(tk),sm=function(k,f){return PE&&PE[k]!=null?' <small class="ksec">setor '+f(PE[k])+'</small>':''},sp=function(v){return pf.format(v)+'%'},sn=function(v){return num(v,1)};
  if(STV==='val')h+=anVal(tk,d);
  else if(STV==='news')h+=rsNews(tk);
  else if(STV==='ind'){
  h+=qHtml(tk);
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
  b.innerHTML=h;
}
function watchSet(W){S.watch=W;S.pend.push({t:'cfg',k:'watch',v:W});save();ghSync();clearTimeout(watchSet.t);watchSet.t=setTimeout(function(){loadMD(true)},150000)}
/* assistente de IA removido a pedido do usuário: limpa o que ficou guardado */
try{if(S.keys&&S.keys.gm){delete S.keys.gm;save()}['-aichat','-gemm','-gemm2','-gemm3','-gemth'].forEach(function(k){localStorage.removeItem(LS+k)})}catch(e){}
