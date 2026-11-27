/* Aporte · js/precos.js — E1 (1.82.0): um preço só para o app inteiro, com a hora do MERCADO (não a hora em que o app buscou).
   Só define funções e uma tabela em memória; nada roda ao carregar. livePx() (mercado-setores.js) chama pxPick(). Nada daqui vai para o localStorage:
   as cotações guardadas continuam com o mesmo formato de sempre (S.quotes {price,prev,at,src}, MKT.q {price,pct,cur,name,at}). */
var PXM={};            /* só na memória: hora do mercado e fonte da última cotação gravada de cada papel {p,t,via,est} */
var PXEST=15*60000;    /* hora estimada (robô: hora da rodada) perde 15 min contra uma hora real do mercado */
var PXAGE=20*60000;    /* com o pregão aberto, cotação com mais de 20 min é "atrasada" */
var PXVIA={worker:'servidor de cotações (Yahoo)',brapi:'brapi',finnhub:'Finnhub',robo:'robô (Yahoo, a cada 15 min)',app:'busca do app'};
/* hora e fonte de uma cotação guardada: da memória se o preço confere; senão deduz (igual à rodada do robô = robô) */
function pxInfo(tk,price,at){var m=PXM[tk];if(m&&m.p===price)return m;var t=MD.d&&MD.d.tape;if(t&&at&&at===t.ts*1000)return {p:price,t:at,via:'robo',est:true};return {p:price,t:at||0,via:'app',est:false}}
function pxT(i){var n=Date.now();return i.t>n+120000?n:i.t}
function pxEff(i){return pxT(i)-(i.est?PXEST:0)}
/* fechamento anterior que o robô trouxe na faixa (para a variação do dia quando a fonte escolhida não traz o dela) */
var PXTI={o:null,m:{}};
function pxTapePrev(tk){var t=MD.d&&MD.d.tape;if(!t||!t.it)return 0;if(PXTI.o!==t){PXTI={o:t,m:{}};t.it.forEach(function(x){if(tpStk(x)&&x[2]>0)PXTI.m[x[0]]=x[2]})}return PXTI.m[tk]||0}
/* fechamento do último pregão dos EUA (16h de Nova York) */
function pxLcUS(){var n=nyNow();if(!n)return 0;var d=new Date(n.d.getTime()),k=0;if(!(usBDay(d)&&n.min>=960)){do{d.setUTCDate(d.getUTCDate()-1);k++}while(!usBDay(d))}return Date.now()-(n.min-960)*60000-k*864e5}
/* ao-vivo | atrasado | fechamento | velho (preço do meio de um pregão que já passou: nunca vale como "agora") */
function pxFase(tk,at){if(!at||tk.charAt(0)==='^')return '';var us=!isBR(tk),open,n;
  if(us){n=nyNow();open=!!n&&usBDay(n.d)&&n.min>=570&&n.min<960}else open=mktOpen();
  if(open)return Date.now()-at>PXAGE?'atrasado':'ao-vivo';
  return at>=(us?pxLcUS():lastClose())-30*60000?'fechamento':'velho'}
/* o único jeito de gravar cotação automática. kind 'S' = S.quotes (grava sempre, como antes); kind 'M' = MKT.q (só se for mais nova pela hora do mercado;
   se o papel já tem cotação automática na carteira, ela acompanha, para carteira = faixa = página). q.via/q.name/q.cur são só do chamador. */
function pxPut(tk,kind,q,via,t,est){var pr=q.price;if(!(pr>0))return false;var ni={p:pr,t:t||q.at||Date.now(),via:via||q.via||'app',est:!!est};
  if(kind==='S'){S.quotes[tk]={price:pr,prev:q.prev>0?q.prev:null,at:q.at||Date.now(),src:'auto'};PXM[tk]=ni;return true}
  var cur=MKT.q[tk];if(cur&&cur.price>0&&pxEff(pxInfo(tk,cur.price,cur.at))>pxEff(ni))return false;
  MKT.q[tk]={price:pr,pct:q.pct,cur:q.cur,name:q.name||'',at:q.at||t||Date.now()};PXM[tk]=ni;
  var s=S.quotes[tk];if(s&&s.src==='auto'&&s.price>0&&pxEff(pxInfo(tk,s.price,s.at))<pxEff(ni)){var pv=isFinite(q.pct)&&q.pct>-100?pr/(1+q.pct/100):s.prev;S.quotes[tk]={price:pr,prev:pv>0?pv:null,at:q.at||t||Date.now(),src:'auto'}}
  return true}
/* o preço do papel para o app inteiro: {p,pct,pr?,at (hora do mercado),via,est,fase,sus}. pct usa o fechamento anterior da mesma fonte; se faltar, o da outra */
function pxPick(tk){var q=S.quotes[tk],m=MKT.q[tk],a=null,b=null,i,r,o;
  if(q&&q.src==='auto'&&q.price>0){i=pxInfo(tk,q.price,q.at||0);a={p:q.price,pct:q.prev?(q.price/q.prev-1)*100:null,at:pxT(i),eff:pxEff(i),via:i.via,est:i.est}}
  if(m&&m.price>0){i=pxInfo(tk,m.price,m.at||0);b={p:m.price,pct:m.pct,at:pxT(i),eff:pxEff(i),via:i.via,est:i.est}}
  if(a)a.fase=pxFase(tk,a.at);if(b)b.fase=pxFase(tk,b.at);
  r=a&&b?((a.fase==='velho')!==(b.fase==='velho')?(a.fase==='velho'?b:a):(b.eff>a.eff?b:a)):a||b;
  var hh=MD.d&&MD.d.hist&&MD.d.hist[tk],lc=hh&&hh.last>0?hh.last:0;
  if(r){o=r===a?b:a;
    if(r.pct==null||!isFinite(r.pct)){var pv=0;if(o&&o.pct!=null&&isFinite(o.pct)&&o.pct>-100)pv=o.p/(1+o.pct/100);if(!(pv>0))pv=pxTapePrev(tk);if(pv>0)r.pct=(r.p/pv-1)*100}
    r.sus=(a&&b&&Math.abs(a.p/b.p-1)>.05&&Math.abs(a.at-b.at)<30*60000)?'duas fontes de preço diferem '+pf.format(Math.abs(a.p/b.p-1)*100)+'%':(lc&&Math.abs(r.p/lc-1)>.35)?'muito diferente do último fechamento ('+pf.format((r.p/lc-1)*100)+'%)':''}
  if(r&&r.pct!=null&&tk.charAt(0)!=='^'&&dzero(!isBR(tk),r.at))r={p:r.p,pct:0,pr:r.pct,at:r.at,sus:r.sus,via:r.via,est:r.est,fase:r.fase};
  return r}
function pxHora(at){return new Date(at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})}
function pxDia(at){return new Date(at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',timeZone:'America/Sao_Paulo'})}
/* complemento da linha de hora na página da ação: fonte e situação do preço */
function pxTag(r){if(!r||!r.at)return '';var f=r.fase,v=PXVIA[r.via]?PXVIA[r.via].replace(/ \(.*/,''):'';
  return (v?' · '+v:'')+(f==='fechamento'?' · fechamento':f==='velho'?' · último preço de '+pxDia(r.at):'')}
/* texto do ⓘ (1.82.2): curto, em português simples; cada frase só aparece quando vale */
function pxWhy(r){if(!r||!r.at)return '';var f=r.fase;
  return 'Preço das '+pxHora(r.at)+' de '+pxDia(r.at)+'. Fonte: '+(PXVIA[r.via]||PXVIA.app)+'. É a hora em que a ação foi negociada, não a hora em que o app buscou.'+(r.est?' A atualização automática vem a cada 15 min: o preço pode ter até 15 min.':'')+
    (f==='atrasado'?' Atrasado: o mercado está aberto e este preço tem mais de 20 min.':f==='velho'?' É de um pregão que já passou, não é o preço de agora.':f==='fechamento'?' É o preço de fechamento do último pregão.':'')+' Ainda não conferido com outra fonte.'}
/* linha de hora da página da ação (1.82.2): nunca diz "ao vivo"; depois do fechamento nunca diz "atualizado há"; acima de 24 h mostra a data em vez de horas */
function pxLinha(r){if(!r||!r.at)return '';var f=r.fase,v=PXVIA[r.via]?PXVIA[r.via].replace(/ \(.*/,''):'',m=Math.max(0,Math.round((Date.now()-r.at)/60000)),dh=pxDia(r.at)+', '+pxHora(r.at),fo=v?' · '+v:'';
  if(f==='fechamento')return 'Fechamento de '+dh+fo;
  if(f==='velho')return 'Último preço de '+dh+fo+' (não é de agora)';
  if(f==='atrasado')return m>=1440?'Atrasado: preço de '+dh+fo:'Atrasado ('+(m>=120?Math.round(m/60)+' h':m+' min')+') · preço das '+pxHora(r.at)+fo;
  return dh+' · atualizado há '+(m<1?'menos de 1':m)+' min'+fo}
/* aviso da faixa preta para leitor de tela e toque longo: o que quer dizer o item apagado */
function pxNota(tk){var r=livePx(tk);return !r?'':r.fase==='atrasado'?'preço atrasado':r.fase==='velho'?'último preço de '+pxDia(r.at):''}
