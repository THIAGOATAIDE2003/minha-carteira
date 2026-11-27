/* ===== 1.83.6: variação do dia do DÓLAR e do EURO com UMA base só =====
   Faixa, cartão do Mercado, página (1D, "Fech. ant.", linha pontilhada) e gráfico de câmbio do Início usam a mesma base: o último ponto de 5 min até 17:00 (Brasília)
   do último dia ÚTIL brasileiro anterior ao de hoje (segunda e depois de feriado: o último dia útil). Fuso fixo −3 h. Só vale com ponto das 16:00 em diante.
   Sem base: só o preço, sem percentual; NUNCA cai na barra diária, em S.fx.prev, no pctChange da AwesomeAPI nem no prev do arquivo. Mercado de câmbio parado: 0,00% como antes.
   Libra, bitcoin, ethereum, ouro e Brent ficam como estavam. Nada roda ao carregar. */
var CXT={};
function cxK(s){return s==='BRL=X'||s==='usd'||s==='DÓLAR'?'BRL=X':s==='EURBRL=X'||s==='eur'||s==='EURO'?'EURBRL=X':''}
/* base (preço) de um par ou null */
function cxBase(sym,now){var c=FIN['intra/'+sym],p=c&&c.d&&c.d.p,n=(now||Date.now())-10800000,d=Math.floor(n/864e5)*864e5,i=0,b=null,bm=-1,l,m;
  if(!p||!p.length)return null;
  do{d-=864e5;i++}while(i<10&&!bDay(new Date(d)));
  for(i=0;i<p.length;i++){l=p[i][0]-10800;if(Math.floor(l/86400)*86400!==d/1000)continue;m=(l-d/1000)/60;if(m<=1020&&m>bm&&p[i][1]>0){bm=m;b=p[i][1]}}
  return bm>=960&&isFinite(b)?b:null}
/* {pct,abs,base} para o preço mostrado; parado = 0,00%; sem base = pct nulo */
function cxVar(k,pr){var s=cxK(k),b=s&&cxBase(s);if(!s||!(pr>0))return null;
  if(fxParado())return {pct:0,abs:0,base:b>0?b:null};
  return b>0?{pct:(pr/b-1)*100,abs:pr-b,base:b}:{pct:null,abs:null,base:null}}
/* faixa: base em preço (a faixa calcula v/base); null = sem percentual */
function cxTape(l,v){var r=cxVar(l,v);return r&&r.pct!=null?(r.pct===0?v:r.base):null}
/* página (1D) de dólar e euro; senão null */
function cxPagIdx(rg,rate,x,fv,fo,last){var s=cxK(x.k);if(rg!=='1d'||rate||!s||!fv||fv.st!=='ok'||!fo)return null;
  var v=cxVar(s,last)||{pct:null,abs:null,base:null};return {pct:v.pct,abs:v.abs,fo:vdFo(fo,v.base),ant:v.base}}
/* os dois arquivos de 5 min chegam depois do primeiro desenho; a faixa se refaz uma vez quando chegam */
function cxPrefetch(){['BRL=X','EURBRL=X'].forEach(function(s){if(Date.now()-(CXT[s]||0)<240000)return;CXT[s]=Date.now();
  finGet('intra',s).then(function(){render()}).catch(function(){})})}
