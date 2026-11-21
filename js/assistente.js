/* Aporte · js/assistente.js — assistente de IA (Groq e Gemini).
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
/* ----- assistente como analista: reconhece a empresa pelo nome e manda tudo que o app sabe dela, com a fonte de cada número ----- */
function asNorm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}
function asDt(ms){if(!ms)return '?';var d=new Date(ms);return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
var ASAL={magalu:'MGLU3','magazine luiza':'MGLU3',itau:'ITUB4','banco do brasil':'BBAS3','bb seguridade':'BBSE3',petrobras:'PETR4',ambev:'ABEV3',bradesco:'BBDC4',santander:'SANB11',eletrobras:'AXIA3',axia:'AXIA3',copel:'CPLE6',gerdau:'GGBR4',usiminas:'USIM5',suzano:'SUZB3',klabin:'KLBN11',embraer:'EMBJ3',localiza:'RENT3',raia:'RADL3','raia drogasil':'RADL3','rede dor':'RDOR3',hapvida:'HAPV3',natura:'NATU3',taesa:'TAEE11','isa cteep':'ISAE4',cteep:'ISAE4',btg:'BPAC11','btg pactual':'BPAC11',tim:'TIMS3',vivo:'VIVT3',telefonica:'VIVT3','caixa seguridade':'CXSE3',b3:'B3SA3',weg:'WEGE3',vale:'VALE3',engie:'EGIE3',cemig:'CMIG4',sabesp:'SBSP3',sanepar:'SAPR11',copasa:'CSMG3',alupar:'ALUP11',jbs:'JBSS3',marfrig:'MRFG3',brf:'BRFS3',cosan:'CSAN3',rumo:'RAIL3',ultrapar:'UGPA3',vibra:'VBBR3',prio:'PRIO3',petrorio:'PRIO3',braskem:'BRKM5',assai:'ASAI3',carrefour:'CRFB3',renner:'LREN3',arezzo:'AZZA3',azzas:'AZZA3',cyrela:'CYRE3',mrv:'MRVE3',direcional:'DIRR3',tenda:'TEND3',jhsf:'JHSF3',multiplan:'MULT3',iguatemi:'IGTI11',irani:'RANI3','porto seguro':'PSSA3',totvs:'TOTS3',equatorial:'EQTL3',energisa:'ENGI11',neoenergia:'NEOE3','cpfl':'CPFE3',auren:'AURE3',csn:'CSNA3',fleury:'FLRY3',grendene:'GRND3'};
var ASSTOP={banco:1,bco:1,cia:1,companhia:1,energia:1,energetica:1,brasil:1,brasileira:1,centrais:1,empresa:1,grupo:1,industrias:1,industria:1,petroleo:1,saneamento:1,concessionaria:1,construtora:1,fundo:1,telecomunicacoes:1,investimentos:1,servicos:1,comercio:1,participacoes:1,holding:1,sao:1,minas:1,estado:1,santa:1,nova:1,novo:1,gerais:1,metalurgica:1,acoes:1,acao:1,lojas:1,mineracao:1,alimentos:1,seguros:1,tecnologia:1,saude:1,educacao:1,transmissao:1,distribuidora:1,geracao:1,cosmeticos:1,eletrica:1,eletricas:1,paulista:1,sul:1,norte:1,rio:1,global:1,capital:1,rede:1,casa:1,ouro:1,mais:1,grande:1,alta:1,cidade:1,total:1,plano:1,marca:1,uniao:1,vida:1,boa:1,bem:1,forte:1,primeira:1,todos:1};
var ASIX={k:'',m:null};
/* índice nome → ticker mais negociado da empresa */
function asIdx(){var ck=MD.d&&MD.d.ts;if(ASIX.k===ck&&ASIX.m)return ASIX.m;var f=MD.d&&MD.d.fund&&MD.d.fund.d||{},nm={},m={};
  var put=function(tk,n){if(n&&!nm[tk])nm[tk]=n};var cv=MD.d&&MD.d.cvm&&MD.d.cvm.nomes||{};Object.keys(cv).forEach(function(tk){put(tk,cv[tk])});
  var H=MD.d&&MD.d.hist||{};Object.keys(H).forEach(function(tk){put(tk,H[tk].name)});var rs=MD.d&&MD.d.res&&MD.d.res.acoes||{};Object.keys(rs).forEach(function(tk){put(tk,rs[tk].nome)});
  var liq=function(tk){var x=fundOf(tk);return x&&x.liq2m||0};
  var add=function(key,tk){if(!key||key.length<3)return;var o=m[key];if(!o||liq(tk)>liq(o))m[key]=tk};
  Object.keys(nm).forEach(function(tk){if(!f[tk]&&!H[tk])return;var n=asNorm(nm[tk]),parts=n.split(' - ');
    parts.forEach(function(pt,i){var w=pt.replace(/\b(s\.?a\.?|s\/a|cia\.?|companhia|holding|participacoes|brasileira|inc\.?|corp\.?|ltda)(?=[\s,.]|$)/g,' ').replace(/[^a-z0-9& ]/g,' ').split(/\s+/).filter(function(x){return x&&['do','da','de','dos','das','e'].indexOf(x)<0});
      if(!w.length)return;if(w.length>=2)add(w.slice(0,2).join(' '),tk);if(w.length>=3)add(w.slice(0,3).join(' '),tk);if(w[0].length>=4&&!ASSTOP[w[0]])add(w[0],tk);if(i>0&&w.length===1)add(w[0],tk)})});
  Object.keys(ASAL).forEach(function(k){if(ASAL[k])m[k]=ASAL[k]});
  ASIX={k:ck,m:m};return m}
/* acha as empresas citadas na pergunta: pelo código (SBSP3) ou pelo nome (Sabesp, Itaú, Weg) */
function asFind(q){var out=[],add=function(tk){if(tk&&out.indexOf(tk)<0)out.push(tk)};
  (String(q||'').toUpperCase().match(/\b[A-Z]{4}\d{1,2}\b/g)||[]).forEach(add);
  var n=' '+asNorm(q).replace(/vale a pena|vale mais|vale menos|vale muito|vale o|vale ter|quanto vale|vale comprar|vale investir/g,' ').replace(/[^a-z0-9& ]/g,' ').replace(/\s+/g,' ')+' ',m=asIdx(),ks=Object.keys(m).sort(function(a,b){return b.length-a.length}),used=[];
  ks.forEach(function(k){var p=n.indexOf(' '+k+' ');if(p<0)return;if(used.some(function(u){return p>=u[0]&&p<u[1]}))return;used.push([p,p+k.length+2]);add(m[k])});
  return out.slice(0,3)}
/* tudo que o app sabe de uma empresa, com a origem de cada número */
var ASSC=1;function asBi(v){return v==null||v===0?'não informado':qfmt(v*ASSC)}
/* variação do preço e dividendos por ação, do histórico que o robô baixa (Yahoo) */
function asPxHist(tk,P){var h=MD.d&&MD.d.hist&&MD.d.hist[tk];if(!h||!P)return null;var day=Math.floor(Date.now()/864e5),at=function(a,dd){if(!a||!a.length)return null;var best=null;for(var i=0;i<a.length;i++){if(a[i][0]<=day-dd)best=a[i][1];else break}return best};
  var src=function(dd){return dd<=360?at(h.d,dd)||at(h.w,dd):at(h.w,dd)},o={},ps=[[30,'1 mês'],[91,'3 meses'],[182,'6 meses'],[365,'12 meses'],[1095,'3 anos'],[1825,'5 anos']];
  o.v=ps.map(function(p){var b=src(p[0]);return b?p[1]+' '+asP((P/b-1)*100,1):null}).filter(Boolean);
  var dv=h.div||[],d12=0,d24=0,n12=0;dv.forEach(function(x){var a=day-x[0];if(a<=365){d12+=x[1];n12++}else if(a<=730)d24+=x[1]});
  var b12=src(365);if(b12){o.tot=(P+d12)/b12-1;o.px=P/b12-1}o.d12=d12;o.d24=d24;o.n12=n12;return o}
/* commodity que mais mexe com o setor */
function asCmd(sec){var k=/Minera|Siderur/i.test(sec)?'iron':/Petr[oó]leo/i.test(sec)?'brent':null;if(!k)return '';var D=MD.d&&MD.d.idx&&MD.d.idx[k],x=idxDef(k);if(!D||!D.d||!D.d.length)return '';
  var l=D.d[D.d.length-1],day=l[0],b=null;(D.w||[]).concat(D.d).forEach(function(p){if(p[0]<=day-365&&(b==null||p[0]>b[0]))b=p});b=b&&b[1];
  return 'Commodity ligada ao setor: '+x.n+' US$ '+num(l[1],2)+(b?' ('+asP((l[1]/b-1)*100,1)+' em 12 meses)':'')+' [fonte: Yahoo, contrato futuro, robô].'}
function asEmp(tk,held){var F=fundOf(tk),lv=livePx(tk),d=opD(tk),h=MD.d&&MD.d.hist&&MD.d.hist[tk],e=rsOf(tk),robo=MD.d&&MD.d.ts?asDt(MD.d.ts*1000):'?',L=[],falta=[],aviso=[];
  var nm=(MD.d&&MD.d.cvm&&MD.d.cvm.nomes&&MD.d.cvm.nomes[tk])||(h&&h.name)||(e&&e.nome)||'',v1=function(v,dd,suf){return v!=null?num(v,dd)+(suf||''):'?'};
  L.push('=== EMPRESA '+tk+(nm?' — '+nm:'')+(held?' (está na carteira do Thiago)':' (fora da carteira)'));
  if(!F&&!d){L.push('O app não tem dados dessa ação (só tem indicadores das ações da B3; ações americanas só têm o preço quando estão na lista).');return L.join('\n')}
  var sec=d&&d.cur!=='USD'?rkSect(tk):['',''];if(sec[0])L.push('Setor: '+sec[0]+(sec[1]&&sec[1]!==sec[0]?' / '+sec[1]:'')+' [fonte: Fundamentus].');
  if(sec[0]==='Financeiro')L.push('TIPO DE EMPRESA: financeira ('+(sec[1]||'banco/seguradora')+'). Para bancos e seguradoras, dívida, EBIT, EBITDA, margem EBIT e margem líquida NÃO se leem como em empresas comuns (a "receita" de banco inclui juros recebidos; dívida faz parte do negócio). Use ROE, P/L, P/VP, DY e a evolução do lucro. Índice de Basileia, inadimplência e índice combinado de seguros não estão no app.');
  if(d){L.push('Preço: '+(d.cur==='USD'?'US$ ':'R$ ')+num(d.price,2)+(d.pct!=null?' ('+asP(d.pct,2)+' no dia)':'')+' [fonte: cotação '+(lv&&lv.at?'de '+asDt(lv.at):'do robô em '+robo)+']'+(d.k&&d.k.hi?'. Máxima de 12 meses '+num(d.k.hi,2)+', mínima '+num(d.k.lo,2):'')+'.');
    var ph=asPxHist(tk,d.price);if(ph){if(ph.v.length)L.push('Variação só da cotação: '+ph.v.join('; ')+' [fonte: histórico Yahoo, robô].');else falta.push('histórico de preços');
      if(ph.tot!=null)L.push('Retorno total em 12 meses (cotação + proventos recebidos por ação): '+asP(ph.tot*100,1)+', sendo cotação '+asP(ph.px*100,1)+' [cálculo do app, histórico Yahoo].');
      if(ph.d12||ph.d24)L.push('Proventos por ação: R$ '+num(ph.d12,2)+' nos últimos 12 meses ('+ph.n12+' pagamentos) contra R$ '+num(ph.d24,2)+' nos 12 meses anteriores [fonte: Yahoo, data-com; não diz se foram extraordinários].')}
    else falta.push('histórico de preços e de proventos por ação (o robô só baixa para carteira e lista)')}
  if(F){L.push('Múltiplos e margens dos últimos 12 meses [fonte: Fundamentus, robô em '+robo+']: P/L '+v1(F.pl,1)+'; P/VP '+v1(F.pvp,2)+'; P/EBIT '+v1(F.pebit,1)+'; EV/EBIT '+v1(F.evebit,1)+'; EV/EBITDA '+v1(F.evebitda,1)+'; P/receita (PSR) '+v1(F.psr,2)+'; DY '+v1(F.dy,1,'%')+'; ROE '+v1(F.roe,1,'%')+'; ROIC '+v1(F.roic,1,'%')+'; margem EBIT (operacional) '+v1(F.mebit,1,'%')+'; margem líquida '+v1(F.ml,1,'%')+'; dívida bruta/patrimônio '+v1(F.divpl,2)+'; liquidez corrente '+v1(F.lc,2)+'; crescimento da receita em 5 anos '+v1(F.cr5,1,'% ao ano')+'; negociação média R$ '+(F.liq2m!=null?num(F.liq2m/1e6,1)+' mi/dia':'?')+'.');
    if(F.divpl==null)falta.push('dívida bruta/patrimônio');
    var B0=MD.d.bal&&MD.d.bal[tk],B=null;if(B0){B={};for(var bk in B0)B[bk]=B0[bk]===0?null:B0[bk]}if(B){ASSC=F.pl_r&&B.pl>0?Math.pow(10,Math.round(Math.log(F.pl_r/B.pl)/Math.LN10)):1;var dle=B.divl!=null&&B.divb!=null&&B.ebit>0?B.divl/B.ebit:null;L.push('Balanço [fonte: Fundamentus, página da empresa; valores em reais; receita, EBIT e lucro são dos últimos 12 meses]: dívida bruta '+asBi(B.divb)+'; caixa '+asBi(B.disp)+'; dívida líquida '+asBi(B.divl)+'; patrimônio '+asBi(B.pl)+'; receita '+asBi(B.rec)+'; EBIT '+asBi(B.ebit)+'; lucro líquido '+asBi(B.ll)+(dle!=null?'; dívida líquida/EBIT '+num(dle,2)+' vezes':'')+'.')}
    else falta.push('dívida e caixa em reais (o robô só baixa o balanço da carteira e da lista)');
    if(F.mebit!=null&&F.ml!=null&&F.mebit>=8&&F.ml<F.mebit*0.3)aviso.push('LUCRO DISTORCIDO: margem EBIT '+num(F.mebit,1)+'% contra margem líquida '+num(F.ml,1)+'%. A operação lucra, mas algo depois dela (resultado financeiro, impostos, câmbio ou itens extraordinários) consumiu o lucro. Os dados do app NÃO dizem qual foi a causa. Enquanto isso, P/L, ROE e os métodos de preço justo baseados em lucro (Graham, P/L do setor, fluxo descontado) não são confiáveis; prefira EV/EBIT, EV/EBITDA, P/EBIT e margem EBIT.');
    var pe=anPeers(tk);if(pe&&pe.n){var cf=pe.n<4?'pouco confiável (menos de 4 empresas)':pe.n<8?'confiança média':'boa base';
      L.push('Concorrentes do setor '+pe.name+' — mediana de '+pe.n+' empresas ('+cf+'; uma ação por empresa) [fonte: Fundamentus]: P/L '+v1(pe.pl,1)+'; P/VP '+v1(pe.pvp,2)+'; EV/EBIT '+v1(pe.evebit,1)+'; EV/EBITDA '+v1(pe.evebitda,1)+'; DY '+v1(pe.dy,1,'%')+'; ROE '+v1(pe.roe,1,'%')+'; ROIC '+v1(pe.roic,1,'%')+'; margem EBIT '+v1(pe.mebit,1,'%')+'; margem líquida '+v1(pe.ml,1,'%')+' ("?" = mediana não calculada: não compare esse item com o setor). Quem entrou: '+pe.t.slice(0,10).map(function(t){var n=MD.d.cvm&&MD.d.cvm.nomes&&MD.d.cvm.nomes[t];return t+(n?' ('+n.split(' ').slice(0,3).join(' ')+')':'')}).join(', ')+'. Veja se são mesmo comparáveis (mesmo negócio) antes de concluir.')}
    else falta.push('comparação com concorrentes (setor não encontrado ou menos de 3 empresas)')}
  else falta.push('indicadores do Fundamentus');
  if(sec[0]){var cm=asCmd(sec.join(' '));if(cm)L.push(cm)}
  /* resultados trimestrais */
  var Q=cvmQ(tk);if(Q&&Q.length){var cv=MD.d.cvm.ts?asDt(MD.d.cvm.ts*1000):'?',yo=function(x,ix){var p=Q.filter(function(y){return y[0]===x[0]-1&&y[1]===x[1]})[0];return p&&p[ix]>0&&x[ix]!=null?' ('+asP((x[ix]/p[ix]-1)*100,0)+' vs '+p[1]+'T'+String(p[0]).slice(2)+')':''};
    L.push('Resultados trimestrais [fonte: balanços entregues à CVM (ITR/DFP), consolidado; 4º tri = ano − 9 meses; é o lucro contábil, que pode diferir do lucro ajustado ou recorrente citado na imprensa; atualizado pelo robô em '+cv+']:');
    var temE=false;Q.slice(ASCMP?-5:-8).forEach(function(x){var e1=x[4]!=null;if(e1)temE=true;L.push('- '+x[1]+'T'+String(x[0]).slice(2)+': receita '+qfmt(x[2])+yo(x,2)+(e1?'; EBIT (lucro da operação) '+qfmt(x[4])+(x[2]>0?' = margem EBIT '+num(x[4]/x[2]*100,1)+'%':''):'')+(x[5]!=null?'; resultado financeiro (juros e outros) '+qfmt(x[5]):'')+(x[6]!=null?'; impostos sobre o lucro '+qfmt(x[6]):'')+'; lucro líquido '+qfmt(x[3])+yo(x,3)+(x[2]>0&&x[3]!=null?' = margem líquida '+num(x[3]/x[2]*100,1)+'%':''))});
    if(!temE)falta.push(MD.d.cvm.q[tk]&&MD.d.cvm.q[tk].slice(-1)[0].length>=7?'EBIT e resultado financeiro por trimestre (o balanço de bancos, seguradoras e holdings não separa esses itens do mesmo jeito)':'EBIT, resultado financeiro e impostos por trimestre (chegam na próxima atualização dos balanços da CVM)');
    var T=qTtm(Q);if(T)L.push('Lucro dos últimos 12 meses (4 trimestres) '+qfmt(T.a)+' contra '+qfmt(T.b)+' nos 12 meses anteriores'+(T.g!=null?' ('+asP(T.g*100,1)+')':'')+' [fonte: CVM, soma dos trimestres].');
    var l=Q[Q.length-1],ag=Date.now()-Date.UTC(l[0],l[1]*3,1);if(ag>200*864e5)falta.push('o último balanço na base é do '+l[1]+'º tri de '+l[0]+' (pode haver um mais novo)')}
  else falta.push('resultados trimestrais da CVM (o robô só baixa para ações da carteira e da lista de acompanhamento)');
  /* análise automática do app */
  if(d&&d.cur!=='USD'){try{var A=stkAna(tk,d);if(!A.etf){var t=function(a){return a.map(function(x){return x[0]+' ('+asTxt(x[1])+')'}).join('; ')};
    L.push('Análise automática do app [regras fixas do Aporte sobre os números acima, não é IA]: nota '+(A.score!=null?num(A.score,1)+'/10':'?')+'; '+A.chips.map(function(c){return c[0]+' '+c[1]}).join(', ')+'.'+(A.pos.length?' Pontos positivos: '+t(A.pos)+'.':'')+(A.neg.length?' Pontos de atenção: '+t(A.neg)+'.':'')+(A.inf.length?' Vale saber: '+t(A.inf)+'.':''));
    var V=anValCalc(tk,d,A),DS={'Graham':'usa lucro e patrimônio por ação; feito para empresas estáveis, falha quando o lucro está anormal','Bazin (preço-teto)':'usa só os dividendos dos últimos 12 meses ÷ '+(V&&V.y)+'%; supõe que o dividendo se repete, falha com dividendo extraordinário ou cíclico','P/L do setor':'lucro por ação × P/L mediano das concorrentes; depende do lucro e de as concorrentes serem comparáveis','Fluxo de caixa descontado':'versão simples que usa o lucro no lugar do caixa; muito sensível às premissas'};
    if(V&&V.ms&&V.ms.length){var mx=Math.max.apply(null,V.vs),mn=Math.min.apply(null,V.vs);
      L.push('Preço justo do app — métodos independentes, cada um com sua lógica [cálculo do Aporte; premissas: lucro crescendo '+V.g+'% ao ano por 5 anos e depois 3%, desconto de '+V.r+'% ao ano (Selic + prêmio), retorno mínimo de '+V.y+'% em dividendos para o Bazin]:');
      V.ms.forEach(function(m){L.push('- Método '+m[0]+': R$ '+num(m[1],2)+(ASCMP?'':' — '+(DS[m[0]]||'')))});
      L.push('Mediana dos métodos (o "preço justo" que o app mostra): R$ '+num(V.med,2)+' ('+asP(V.up*100,0)+' em relação ao preço atual). '+(mx>mn*2.5?'Os métodos DISCORDAM MUITO (de R$ '+num(mn,2)+' a R$ '+num(mx,2)+'): explique por que antes de concluir, e não escolha só o que confirma uma ideia.':'Os métodos estão relativamente próximos.'))}
    else falta.push('preço justo (precisa de lucro e patrimônio positivos)')}}catch(x){}}
  if(held&&!ASCMP){try{var fit=asTxt(String(anFit(tk,d,stkAna(tk,d))||'').replace(/<button[^>]*class="bal"[\s\S]*?<\/button>/g,'').replace(/<\/(p|li|div|h\d)>/g,'. ').replace(/<br>/g,' ')).replace(/\.\s*\./g,'.');if(fit)L.push('Na carteira [cálculo do app]: '+fit.slice(0,400))}catch(x){}}
  /* notícias */
  if(e&&e.ai){var a=e.ai;L.push('Resumo das notícias [IA do robô ('+(e.mod||'?')+') em '+(e.aiAt?asDt(Date.parse(e.aiAt)):'?')+', feito a partir das manchetes abaixo; pode errar]: '+(ASCMP?asTxt(a.resumo).slice(0,300):asTxt(a.resumo))+' Tom: '+a.sentimento+'.'+(a.eventos&&a.eventos.length?' Eventos: '+a.eventos.slice(0,4).map(function(v){return v.titulo+' ('+v.direcao+', impacto '+v.impacto+')'}).join('; ')+'.':''))}
  if(e&&e.news&&e.news.length)L.push('Manchetes [fonte: Google Notícias, buscadas pelo robô em '+(MD.d.res.at?asDt(Date.parse(MD.d.res.at)):'?')+']: '+e.news.slice(0,ASCMP?3:6).map(function(n){return n.t+' ('+(n.s||'?')+(n.d?', '+fmtDate(n.d):'')+')'}).join(' | '));
  else falta.push('notícias (o robô só busca para ações da carteira e da lista de acompanhamento)');
  falta.push('custo de produção, volumes, fluxo de caixa livre, investimentos (capex) e projeções da empresa — o app não tem essas fontes');
  if(aviso.length)L.push(aviso.join('\n'));
  try{if(isBR(tk)){var vte=vtCtx([tk]);if(vte)L.push(vte)}}catch(e){}
  try{var tz=thCtx(tk);if(tz)L.push(tz)}catch(e){}
  try{if(isBR(tk)){var rxe=riCtx([tk],true);if(rxe)L.push(rxe.replace('=== RISCOS E POLÍTICA','RISCOS E POLÍTICA DESTA EMPRESA'))}}catch(e){}
  L.push('NÃO DISPONÍVEL NO APP: '+falta.join('; ')+'.');
  return L.join('\n')}
/* ===== Assistente: conversa com a IA sobre a sua carteira (Groq rápido, Gemini de reserva) ===== */
var AS={m:[],busy:false,ab:null,mod:'',err:'',hist:false,id:''};
/* vários chats: cada conversa guardada é {id,t (título),at (última mensagem),m (mensagens)}; AS.m é sempre a conversa aberta */
var ASC=[];try{ASC=JSON.parse(localStorage.getItem(LS+'-aschats')||'null')}catch(e){ASC=null}
if(!Array.isArray(ASC)){ASC=[];try{var asOld=JSON.parse(localStorage.getItem(LS+'-assist')||'[]');if(asOld&&asOld.length)ASC.push({id:'c'+Date.now().toString(36),t:'',at:Date.now(),m:asOld})}catch(e){}}
ASC=ASC.filter(function(c){return c&&c.id&&Array.isArray(c.m)&&c.m.length}).sort(function(a,b){return (b.at||0)-(a.at||0)});
function asNewId(){return 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)}
function asCur(){for(var i=0;i<ASC.length;i++)if(ASC[i].id===AS.id)return ASC[i];return null}
function asTitulo(m){var u=m.filter(function(x){return x.r==='u'})[0],t=u?String(u.t).replace(/\s+/g,' ').trim():'';return t?(t.length>48?t.slice(0,47)+'…':t):'Nova conversa'}
function asPersist(){try{localStorage.setItem(LS+'-aschats',JSON.stringify(ASC))}catch(e){}}
function asNovo(){if(AS.busy)return;AS.hist=false;if(AS.m.length){AS.id=asNewId();AS.m=[]}asRender()}
function asAbrir(id){if(AS.busy)return;for(var i=0;i<ASC.length;i++)if(ASC[i].id===id){AS.id=id;AS.m=ASC[i].m.slice();AS.hist=false;break}asRender()}
function asApagar(id){if(AS.busy)return;ASC=ASC.filter(function(c){return c.id!==id});asPersist();if(AS.id===id){AS.id=asNewId();AS.m=[]}asRender()}
ASC.forEach(function(c){if(!c.t)c.t=asTitulo(c.m)});
if(ASC.length){AS.id=ASC[0].id;AS.m=ASC[0].m.slice()}else AS.id=asNewId();
