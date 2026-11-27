/* ===== 1.83.2: variação do dia com UMA base só =====
   Faixa preta, cartão do Mercado, página (1D) e "Fech. ant." mostram o mesmo número, com base no fechamento diário do pregão anterior
   (nunca o último ponto de 5 min de ontem, que deixa o leilão de fechamento de fora). Só B3 (.SA, ^BVSP) e ações/ETFs dos EUA;
   dólar, euro, commodities, bitcoin e juros ficam como estavam. Nada roda ao carregar. Ordem das fontes: 1) a da faixa (livePx / idxVal);
   2) última barra diária com dia anterior ao do pregão mostrado; 3) nada ("Variação do dia indisponível"). */
function vdEscopo(sym){return typeof sym==='string'&&(sym==='^BVSP'||/\.SA$/.test(sym)||/^[A-Z][A-Z0-9]{0,4}([.-][A-Z])?$/.test(sym))}
/* dia do pregão mostrado no gráfico (número do dia no fuso do mercado); sem gráfico, hoje */
function vdDiaSessao(fv,fo){var h=fv&&fv.hist,off=fo&&fo.off!=null?fo.off:-10800,t=Date.now(),i;
  if(h&&h.length){t=h[h.length-1].t;for(i=h.length-1;i>=0;i--)if(!h[i].x){t=h[i].t;break}}
  return Math.floor((t/1000+off)/86400)}
/* último fechamento de uma lista [dia, ..., fechamento] com dia ANTERIOR ao do pregão (a barra do próprio pregão, parcial, nunca vale).
   Se essa última barra tem fechamento inválido (zero, vazio) ou é velha demais (mais de VDIDADE dias corridos antes do pregão), não há base: nunca pula para uma barra mais antiga. */
var VDIDADE=5;
function vdBarra(rows,ci,dia){var bd=-1,bv=null,i,r;if(!rows)return null;
  for(i=0;i<rows.length;i++){r=rows[i];if(r&&r[0]<dia&&r[0]>bd){bd=r[0];bv=r[ci]}}
  return bd>=0&&dia-bd<=VDIDADE&&bv>0&&isFinite(bv)?bv:null}
function vdBase(sym,k,dia,idx){var c=FIN['dia/'+sym],v=vdBarra(c&&c.d&&c.d.d,4,dia),M=MD.d,h;
  if(v==null){h=M&&(idx?M.idx&&M.idx[k]:M.hist&&M.hist[k]);v=vdBarra(h&&h.d,1,dia)}
  return v}
/* ação/ETF: {pct,abs,base} ou null */
function vdAtivo(tk,sym,fv,fo,preco){var lv=livePx(tk),r,b;
  if(lv&&lv.p>0&&lv.pct!=null&&isFinite(lv.pct)){r=lv.pr!=null?lv.pr:lv.pct;if(isFinite(r)&&r>-100){b=lv.p/(1+r/100);return {pct:lv.pct,abs:lv.pr!=null?0:lv.p-b,base:b}}}
  b=vdBase(sym,tk,vdDiaSessao(fv,fo),0);return b>0&&preco>0?{pct:(preco/b-1)*100,abs:preco-b,base:b}:null}
/* índice (mesmo cartão da faixa) */
function vdIdx(x,sym,fv,fo,preco,D){var o=idxVal(x),b;
  if(o&&o.v>0&&isFinite(o.v)&&o.p!=null&&isFinite(o.p)&&o.p>-100){if(o.p!==0){b=o.v/(1+o.p/100);return {pct:o.p,abs:o.v-b,base:b}}return {pct:0,abs:0,base:vdBase(sym,x.k,vdDiaSessao(fv,fo),1)}}
  b=vdBase(sym,x.k,vdDiaSessao(fv,fo),1);return b>0&&preco>0?{pct:(preco/b-1)*100,abs:preco-b,base:b}:null}
/* cópia do gráfico com a linha pontilhada no fechamento certo (ou sem ela) e a marca fa (legenda "fechamento anterior"); nunca mexe no objeto guardado em FIN */
function vdFo(fo,b){var n={},k;for(k in fo)n[k]=fo[k];if(b>0)n.prev=b;else delete n.prev;n.fa=1;return n}
/* ligações das duas páginas: só em 1D, com pontos de 5 min e dentro do escopo; senão null (a página segue como antes) */
function vdPagAcao(tk,rg,fv,fo,preco){var s=ySym(tk);if(rg!=='1d'||!fv||fv.st!=='ok'||!fo||!vdEscopo(s))return null;
  var v=vdAtivo(tk,s,fv,fo,preco)||{pct:null,abs:null,base:null};return {pct:v.pct,abs:v.abs,fo:vdFo(fo,v.base),ant:v.base}}
function vdPagIdx(rg,rate,same,sym,fv,fo,x,last,D,dp){if(rg!=='1d'||rate||!fv||fv.st!=='ok'||!fo||!vdEscopo(sym))return null;
  var v=same?vdIdx(x,sym,fv,fo,last,D):{pct:dp,abs:dp!=null&&last!=null?last-last/(1+dp/100):null,base:vdBase(sym,x.k,vdDiaSessao(fv,fo),1)};
  v=v||{pct:null,abs:null,base:null};return {pct:v.pct,abs:v.abs,fo:vdFo(fo,v.base),ant:v.base}}
/* aviso "indisponível" logo abaixo do preço (depois do bloco do preço, antes da linha de hora); sem aviso devolve o cabeçalho como veio */
function vdPon(vd,h){var n=vd&&vd.pct==null?'<p class="muted small" style="margin:2px 0 6px">Variação de hoje indisponível</p>':'',i=h.indexOf('</div>');return n&&i>=0?h.slice(0,i+6)+n+h.slice(i+6):h}
/* "Fech. ant." das estatísticas: o fechamento certo (vd) ou, fora do escopo, o do arquivo de 5 min como antes */
function vdAnt(vd,st){return vd?(vd.ant>0?pf.format(vd.ant):null):st&&st.prev!=null?pf.format(st.prev):null}
/* base do dia da carteira (G2): por papel, a MESMA conta do cartão "Variação de hoje" do Início (S.quotes: preço e fechamento anterior; fora do pregão a base é o próprio preço, como no cartão).
   Papel sem preço ou sem fechamento anterior da faixa fica de fora (não aparece no resultado). c = base em R$, a = valor de agora em R$, pz = preço, at = hora do preço. */
function vdCart(hs,fx){var o={};hs.forEach(function(x){var tk=x.p.ticker,q=S.quotes[tk],us=x.p.market==='US',F=us?fx:1,a;
  if(!q||!(q.prev>0)||q.src!=='auto'||!(q.price>0))return;a=x.p.qty*q.price*F;o[tk]={c:dzero(us,q.at)?a:x.p.qty*q.prev*F,a:a,pz:q.price,at:q.at||0}});return o}
