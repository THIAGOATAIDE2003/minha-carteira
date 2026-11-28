/* Aporte · js/assistente-calculos.js — contas feitas pelo app (não pela IA) que entram no contexto da GA: cenários de dólar/bolsa, motor de aporte (splitNeed), payout e texto por tipo de empresa financeira. Mesmo escopo global; só usa funções de outros arquivos dentro de funções (a ordem de carga importa só no uso). */

/* ---------- 1. cenários determinísticos ---------- */
var ASCEN_RE=/cenari|simul|estress|stress|adverso|\be se (o|a|os|as) (dolar|bolsa|ibov|mercado|acoes|juros|selic)|se o dolar|se a bolsa|se o ibov|dolar (cair|cai|caia|caindo|subir|sobe|suba|subindo)|bolsa (cair|cai|caia|caindo|despenc)/;
/* lê da pergunta "dólar cair 15% e a bolsa 20%" → {d,b,u} em % com sinal (d = dólar, b = ações do Brasil, u = ações dos EUA em dólar); null = não citado */
function asCenParse(q){var n=asNorm(q),p={d:null,b:null,u:null},last=0,pend=[],cl=n.split(/ e |,|;| mas |\?|!/);
  var dn=/cair|cai\b|caia|caindo|queda|recu|despenc|desvaloriz|baixa\b|perd|derret|tomb|desab/,up=/subir|sobe\b|suba|subindo|alta\b|dispar|valoriz|avanc|aument|sobem/;
  cl.forEach(function(c){var m=/(\d+(?:[.,]\d+)?)\s*(%|por ?cento)/.exec(c),t=[];
    if(dn.test(c))last=-1;else if(up.test(c))last=1;
    if(/dolar|usd|cambio/.test(c))t.push('d');
    if(/\beua\b|americana|s&p|sp500|nasdaq|wall street|\bvt\b|exterior|internacional/.test(c))t.push('u');
    if(/bolsa|ibov|bovespa|acoes|\bb3\b|brasil/.test(c)&&t.indexOf('u')<0)t.push('b');
    if(!m){if(!dn.test(c)&&!up.test(c))t.forEach(function(k){if(pend.indexOf(k)<0)pend.push(k)});return}
    var v=parseFloat(m[1].replace(',','.'));pend.forEach(function(k){if(t.indexOf(k)<0)t.push(k)});pend=[];
    if(!last||!(v>=0))return;t.forEach(function(k){if(p[k]==null)p[k]=last*v})});
  return p}
/* o patrimônio depois do cenário: dólar mexe só nos ativos em dólar; "bolsa Brasil" nas ações/FIIs do Brasil; renda fixa e caixa não mudam; custo e dividendos ficam fora */
function asCenario(q){var n=asNorm(q);if(!ASCEN_RE.test(n))return '';
  var R=compute(),T=R.tot,pat=T.value+T.cash,p=asCenParse(q),def=false,fx=T.fxNow||0,r10=function(f){var s=0;R.held.forEach(function(x){s+=f(x)*0.1});return s};
  var sens='Sensibilidade (a cada 10%): dólar ±10% = '+asR(r10(function(x){return x.p.market==='US'?x.v:0}))+' (só os ativos em dólar); ações do Brasil ±10% = '+asR(r10(function(x){return x.p.market==='US'?0:x.v}))+'; bolsa dos EUA em dólar ±10% = '+asR(r10(function(x){return x.p.market==='US'?x.v:0}))+'.';
  if(p.d==null&&p.b==null&&p.u==null){if(!/adverso|estress|stress/.test(n))return 'CENÁRIO (conta do app): a pergunta não trouxe percentuais, então o app não montou um cenário. '+sens+' Peça ou assuma percentuais antes de concluir.';p={d:-15,b:-20,u:null};def=true}
  var d=p.d||0,b=p.b||0,u=p.u||0,rows=[],fin=0,sv=0,ed=0,eb=0,eu=0;
  R.held.forEach(function(x){var us=x.p.market==='US',m=us?(1+d/100)*(1+u/100):1+b/100,nv=x.v*m;fin+=nv;sv+=x.v;if(us){ed+=x.v*d/100*(1+u/100);eu+=x.v*u/100}else eb+=x.v*b/100;rows.push([x.p.ticker,x.v,nv])});
  var dl=fin-sv,pc=pat?dl/pat*100:0,sg=function(v){return (v>0?'+':'')+num(v,1)+'%'};
  var hip=[];if(p.d!=null||def)hip.push('dólar '+sg(d)+(fx?' (R$ '+num(fx,2)+' → R$ '+num(fx*(1+d/100),2)+')':''));if(p.b!=null||def)hip.push('ações do Brasil '+sg(b));if(p.u!=null)hip.push('ações dos EUA em dólar '+sg(u));
  var L='CENÁRIO CALCULADO PELO APP (conta exata do app, não estimativa da IA' +(def?'; os percentuais são o cenário adverso padrão do app, a pergunta não trouxe números':'')+'). Hipótese: '+hip.join(' e ')+'. Patrimônio '+asR(pat)+' → '+asR(pat+dl)+' ('+(dl<0?'−':'+')+'R$ '+num(Math.abs(dl),0)+', '+sg(pc)+'). ';
  var mv=rows.filter(function(r){return Math.abs(r[2]-r[1])>=0.5}),pa=rows.filter(function(r){return Math.abs(r[2]-r[1])<0.5}).map(function(r){return r[0]});
  L+='Por ativo (hoje → no cenário): '+mv.sort(function(a,c){return c[1]-a[1]}).map(function(r){var df=r[2]-r[1];return r[0]+' '+asR(r[1])+' → '+asR(r[2])+' ('+(df<0?'−':'+')+'R$ '+num(Math.abs(df),0)+', '+sg(r[1]?df/r[1]*100:0)+')'}).join('; ')+(pa.length?'; sem variação: '+pa.join(', '):'')+'. ';
  L+='Efeito separado: dólar '+asR(ed)+'; ações do Brasil '+asR(eb)+(p.u!=null?'; bolsa dos EUA '+asR(eu):'')+'. Lucro total desde o início: '+asR(T.gain)+' → '+asR(T.gain+dl)+' (o custo não muda); ativos − custo: '+asR(T.value-T.cost)+' → '+asR(T.value-T.cost+dl)+'. ';
  L+='Suposições: todas as ações do Brasil variam o mesmo percentual (beta 1); o preço do ativo em dólar só muda se a bolsa dos EUA for citada; renda fixa e caixa não mudam; dividendos, impostos e spread de câmbio ficam fora. Com o dólar caindo, ativos em dólar valem MENOS em reais. '+sens;
  return L}

/* ---------- 2. motor de aporte (splitNeed, aba Próximo aporte) ---------- */
var ASAPO_RE=/aport|alocar|alocac|rebalanc|onde (invest|coloc|aplic)|investir r\$|colocar r\$|dividir r\$|proxim[oa] (compra|aporte)/;
function asAporte(q){var n=asNorm(q);if(!ASAPO_RE.test(n)||typeof splitNeed!=='function')return '';
  var R=compute(),T=R.tot,cur={BR:0,US:0,RF:T.rfV||0};R.held.forEach(function(x){if(x.p.market==='US')cur.US+=x.v;else cur.BR+=x.v});
  var tot=cur.BR+cur.US+cur.RF;if(!tot)return '';
  var A=S.alvos&&S.alvos.classes,pa=null;try{pa=pfAlvo()}catch(e){}
  var tg=A||pa,org=A?'alvo salvo na aba Próximo aporte':'perfil do investidor (não há alvo salvo na aba Próximo aporte)';
  if(!tg)return 'MOTOR DE APORTE: o app não tem divisão ideal (preencha o perfil ou salve o alvo na aba Próximo aporte); não calcule a divisão por conta própria.';
  var sc=(tg.BR||0)+(tg.US||0)+(tg.RF||0);if(!(sc>0))return '';tg={BR:(tg.BR||0)/sc*100,US:(tg.US||0)/sc*100,RF:(tg.RF||0)/sc*100};
  var m=/r\$\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/.exec(n),v=m?parseFloat(m[1].replace(/\./g,'')+(m[2]?'.'+m[2]:'')):0,vo='valor da pergunta';
  if(!(v>0)){v=+(S.perfil&&S.perfil.ap)||0;vo='aporte mensal do perfil';if(!(v>0))return 'MOTOR DE APORTE: a pergunta não traz o valor do aporte e o perfil não tem aporte mensal; peça o valor.'}
  var d=splitNeed(cur,tg,v),ta=tot+v,p1=function(x){return num(x,1)+'%'};
  return 'MOTOR DE APORTE DO APP (conta matemática da aba Próximo aporte: só compras, aproxima a divisão ideal; NÃO é recomendação de investimento e não avalia preço, qualidade nem risco dos ativos). Divisão ideal [origem: '+org+']: Brasil '+p1(tg.BR)+' · exterior '+p1(tg.US)+' · renda fixa '+p1(tg.RF)+'. Divisão atual: Brasil '+p1(cur.BR/tot*100)+' · exterior '+p1(cur.US/tot*100)+' · renda fixa '+p1(cur.RF/tot*100)+'. Para aportar '+asR(v)+' ['+vo+'] a divisão matemática é: Brasil '+asR(d.BR)+', exterior '+asR(d.US)+', renda fixa '+asR(d.RF)+'; depois do aporte: Brasil '+p1((cur.BR+d.BR)/ta*100)+', exterior '+p1((cur.US+d.US)/ta*100)+', renda fixa '+p1((cur.RF+d.RF)/ta*100)+'. A divisão por ação dentro do Brasil não está aqui (a aba Próximo aporte faz). Renda fixa guardada fora do app não aparece nessas contas. Se sugerir algo diferente desta divisão, diga o motivo e deixe claro que é opinião sua, não a conta do app.'}

/* marca na rota os blocos de cálculo que a pergunta pede (usado pelas rotas do Gemini e da Groq) */
function asXt(q,o){var n=asNorm(q);if(ASCEN_RE.test(n))o.cen=1;if(ASAPO_RE.test(n))o.apo=1;return o}

/* lucro distorcido (margem EBIT alta, margem líquida muito menor): mesmo critério usado em asEmp e nas linhas compactas da carteira */
function asDist(F){return !!(F&&F.mebit!=null&&F.ml!=null&&F.mebit>=8&&F.ml<F.mebit*0.3)}

/* ---------- 3. payout (aproximação) ---------- */
function asPayout(F,ph,d,B){if(!F||!(F.dy>0)||!(F.pl>0))return '';
  var p1=F.dy*F.pl,p2=ph&&ph.d12>0&&d&&d.price>0?ph.d12*F.pl/d.price*100:null;if(p1<70&&!(p2>=70))return '';
  return 'PAYOUT (aproximação do app, não é dado oficial): dividendos de 12 meses ÷ lucro de 12 meses ≈ '+num(p1,0)+'% (DY × P/L, Fundamentus)'+(p2!=null?' e ≈ '+num(p2,0)+'% (proventos do Yahoo, R$ '+num(ph.d12,2)+' por ação, ÷ lucro por ação implícito)':'')+'; bases e janelas diferem, é ordem de grandeza.'+(Math.max(p1,p2||0)>100?' Acima de 100% = distribuiu mais que o lucro do período (o app não diz de onde veio o excedente).':'')+' Payout oficial, lucro distribuível e reservas: o app NÃO tem'+(B&&B.pl?' (o patrimônio de '+asBi(B.pl)+' não mostra a composição)':'')+'. Payout mede quanto do lucro do ano virou dividendo e NÃO diz se há ou não reservas: não afirme nenhuma das duas coisas.'}

/* ---------- 4. empresas financeiras: texto e indicadores por tipo ---------- */
function asTipo(sec){if(!sec||sec[0]!=='Financeiro')return '';var s=sec[1]||'';return /seguro|previd/i.test(s)?'seguro':/intermedi|banco/i.test(s)?'banco':'fin'}
function asFin(tp){return tp==='banco'||tp==='seguro'}
function asTipoTxt(tp,sec,nm){var s=sec[1]||'',base='Leia por ROE, P/L, P/VP, DY e a evolução do lucro. EBIT, EBITDA, dívida e margens operacionais não se aplicam (não os trate como dado faltando). ';
  if(tp==='banco')return 'TIPO DE EMPRESA: banco ('+s+'). '+base+'A "receita" de banco inclui juros recebidos e a dívida faz parte do negócio. '+asFaltaTipo(tp)+' Esses itens não estão no app.';
  if(tp==='seguro')return 'TIPO DE EMPRESA: seguradora/previdência ('+s+'). '+base+'Não aplique a ela inadimplência nem "qualidade do crédito" de banco.'+(/PARTICIPA/i.test(nm||'')?' O nome indica holding de participações: o lucro vem de empresas controladas ou coligadas, e o app não detalha isso.':'')+' '+asFaltaTipo(tp)+' Esses itens não estão no app.';
  return 'TIPO DE EMPRESA: serviços financeiros ('+s+'), não é banco nem seguradora. Margem EBIT e margem líquida podem ser lidas, mas dívida e caixa podem ter outro significado nesse negócio e inadimplência de banco não se aplica. '+asFaltaTipo(tp)+' Esses itens não estão no app.'}
function asFaltaTipo(tp){return tp==='banco'?'Para banco importam e o app NÃO tem: inadimplência, provisões para perdas, índice de Basileia (capital), eficiência (custos ÷ receitas) e carteira de crédito.':tp==='seguro'?'Para seguradora importam e o app NÃO tem: sinistralidade, índice combinado, prêmios, reservas técnicas e resultado financeiro.':'Para esse tipo de negócio o app NÃO tem o detalhe da receita por produto, volumes, fluxo de caixa livre nem investimentos (capex).'}
function asMultFin(F,v1,robo){return 'Múltiplos e indicadores dos últimos 12 meses (janela até o último balanço divulgado; o app não guarda a data exata) [fonte: Fundamentus, robô em '+robo+']: P/L '+v1(F.pl,1)+'; P/VP '+v1(F.pvp,2)+'; DY '+v1(F.dy,1,'%')+'; ROE '+v1(F.roe,1,'%')+(F.cr5!=null?'; crescimento da receita em 5 anos '+v1(F.cr5,1,'% ao ano'):'')+'; negociação média R$ '+(F.liq2m!=null?num(F.liq2m/1e6,1)+' mi/dia':'?')+'. (EBIT, margens, ROIC, dívida e liquidez não se aplicam a banco/seguradora e foram omitidos.)'}
function asBalFin(B){return 'Balanço [fonte: Fundamentus, página da empresa; valores em reais; lucro dos últimos 12 meses]: patrimônio '+asBi(B.pl)+'; lucro líquido '+asBi(B.ll)+'. (Receita, EBIT e dívida de banco/seguradora não se leem como em empresas comuns e foram omitidos.)'}
