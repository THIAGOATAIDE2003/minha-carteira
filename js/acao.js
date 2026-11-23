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
  var DP=DEPS[tk];if(DP){var hp=MD.d&&MD.d.hist&&MD.d.hist[DP],lp=livePx(DP),Pp=lp&&lp.p>0?lp.p:(hp&&hp.last)||0,mp=Pp?anMom(DP,Pp):null,qp=null;try{qp=qTtm(cvmQ(DP))}catch(e){}
    var dq=mp&&((mp.m6!=null&&mp.m6<=-0.15)||(mp.m3!=null&&mp.m3<=-0.10)),dl=qp&&qp.g!=null&&qp.g<=-0.1;
    if(dq||dl){neg.push(['Depende de '+DP,'Essa empresa está ligada à '+DP+', que '+(dq?'caiu '+pf.format(Math.abs((mp.m6!=null&&mp.m6<=-0.15?mp.m6:mp.m3)*100))+'% na bolsa'+(mp.m6!=null&&mp.m6<=-0.15?' em 6 meses':' em 3 meses'):'')+(dq&&dl?' e ':'')+(dl?'teve o lucro dos últimos 12 meses '+pf.format(Math.abs(qp.g*100))+'% menor':'')+'. O que afeta '+DP+' tende a afetar essa também.',1]);alr.push(neg[neg.length-1].slice(0,2))}}
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
/* concentração: quanto da carteira já está no mesmo setor ou no mesmo grupo de empresas (BB e BB Seguridade andam juntas) */
var GRPS={'Grupo Banco do Brasil':['BBAS3','BBSE3'],'Grupo Itaú':['ITUB3','ITUB4','ITSA3','ITSA4'],'Grupo Bradesco':['BBDC3','BBDC4'],'Grupo Santander':['SANB3','SANB4','SANB11'],'Petrobras':['PETR3','PETR4']};
var DEPS={BBSE3:'BBAS3',ITSA3:'ITUB3',ITSA4:'ITUB4'},CONC={sec:40,grp:25};
function grpOf(tk){for(var g in GRPS)if(GRPS[g].indexOf(tk)>=0)return g;return ''}
function concFor(tk,R,sf){R=R||compute();sf=sf||rkSect;var T=R.tot,tot=T.value+(T.rfV||0);if(!tot)return null;
  var sec={},grp={};R.held.forEach(function(x){var t=x.p.ticker,s=sf(t,x.p.market==='US')[0];(sec[s]=sec[s]||{v:0,t:[]}).v+=x.v;sec[s].t.push(t);var g=grpOf(t);if(g){(grp[g]=grp[g]||{v:0,t:[]}).v+=x.v;grp[g].t.push(t)}});
  var s0=sf(tk,false)[0],a=sec[s0],g0=grpOf(tk),b=g0&&grp[g0],sp=a?a.v/tot*100:0,gp=b?b.v/tot*100:0,hs=sp>=CONC.sec,hg=gp>=CONC.grp;
  var msg='';if(a&&sp>=1)msg='Você já tem <b>'+pf.format(sp)+'%</b> da carteira em '+esc(s0.toLowerCase())+' ('+a.t.map(esc).join(', ')+')';
  if(b&&gp>=1)msg+=(msg?' e ':'Você já tem ')+'<b>'+pf.format(gp)+'%</b> no '+esc(g0.replace('Grupo ','grupo '))+' ('+b.t.map(esc).join(', ')+')';
  return {sec:s0,sp:sp,gp:gp,grp:g0,alta:hs||hg,msg:msg}}
function anFit(tk,d,A){var R=compute(),r=null;try{r=riskData(R)}catch(e){}if(!r)return '';
  var a=r.as.filter(function(x){return x.tk===tk})[0],T=r.tot,out=[],sec=A.sec[0];
  var bsv=0,bt=0;r.as.forEach(function(x){if(x.us)return;var s=(x.sect||rkSect(x.tk,x.us))[0];bt+=x.v;if(s===sec)bsv+=x.v});
  if(a){out.push('Pesa <b>'+pf.format(a.w*100)+'%</b> do seu patrimônio ('+brl.format(a.v)+').');
    if(!A.us&&bt)out.push('Seu setor '+esc(sec.toLowerCase())+' soma <b>'+pf.format(bsv/bt*100)+'%</b> das suas ações do Brasil.');}
  else if(!A.us&&bt){var nv=1000;out.push('Se você comprar R$ 1.000, o setor '+esc(sec.toLowerCase())+' passa de <b>'+pf.format(bsv/bt*100)+'%</b> para <b>'+pf.format((bsv+nv)/(bt+nv)*100)+'%</b> das suas ações do Brasil.')}
  if(!A.us){var CC=null;try{CC=concFor(tk,R)}catch(e){}if(CC&&CC.msg)out.push(CC.msg+'.'+(CC.alta?' <b>Isso já é concentração alta</b>: um problema nesse setor pesa muito no seu patrimônio.':''))}
  var h=MD.d&&MD.d.hist&&MD.d.hist[tk];if(h&&h.w&&r.P&&r.P.r){var ra=rkRet(rkSer(h.w));if(A.us){var u=rkSer(MD.d.idx.usd&&MD.d.idx.usd.w),m=rkSer(h.w),mb={};for(var k in m)if(u[k])mb[k]=m[k]*u[k];ra=rkRet(mb)}
    var pr=r.P.r;if(a){pr={};var aw=a.w;for(var k2 in r.P.r)if(k2 in ra)pr[k2]=(r.P.r[k2]-aw*ra[k2])/Math.max(0.01,1-aw)}
    var c=rkPair(ra,pr);if(c)out.push('Correlação com '+(a?'o resto da ':'a sua ')+'carteira: <b>'+num(c.c,2)+'</b>. '+(c.c<0.3?'Anda bem diferente do resto, então ajuda a diversificar.':c.c<0.6?'Anda parecido com o resto em parte.':'Anda muito junto com o resto: diversifica pouco.'))}
  return out.length?'<div class="panel anp"><h2>Na sua carteira '+bal('Mostra se essa ação combina com o que você já tem: quanto ela pesa, quanto o setor dela soma e se ela anda junto ou diferente do resto (ajuda ou não a diversificar).')+'</h2><ul class="anl">'+out.map(function(t){return '<li>'+t+'</li>'}).join('')+'</ul></div>':''}
/* veredito de entrada: preço contra o preço justo (margem de segurança), preço contra lucro e entrada em partes */
var ENT={mg:25,al:5,n:3};try{var _e=JSON.parse(localStorage.getItem(LS+'-ent')||'null');if(_e&&_e.mg>0&&_e.al>0&&_e.n>=1)ENT=_e}catch(e){}
