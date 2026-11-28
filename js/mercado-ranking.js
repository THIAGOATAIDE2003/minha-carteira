/* Mercado → Análise → Ranking (1.60.0): as 100 maiores empresas da bolsa por valor de mercado, com receita e margem líquida. Dados: `rank` do robô (scripts/ranking.py). */
var RKS='mc';try{var rk0=localStorage.getItem(LS+'-rks');if(rk0==='rec'||rk0==='ml')RKS=rk0}catch(e){}
function rkNome(r){var n=nomeEmp(r[0]);if(n)return n;return String(r[1]||'').replace(/\s+S\.?\s?\/?\s?A\.?.*$/i,'').toLowerCase().replace(/(^|[\s.])(\S)/g,function(m,a,b){return a+b.toUpperCase()})}
/* preço e variação do dia: o preço do app (livePx, já zerado fora do pregão) quando existe; senão o do robô (r[5] preço, r[6] variação) */
function rkDia(r){var l=null;try{l=livePx(r[0])}catch(e){}var p=l&&l.p>0?l.p:r[5],c=l&&l.p>0&&l.pct!=null&&isFinite(l.pct)?l.pct:(r[6]!=null&&isFinite(r[6])?r[6]:null);
  var v=c==null?'':'<span class="rkv2 num '+(Math.abs(c)<0.005?'muted':cls(c))+'">'+sg0(c)+pf.format(Math.abs(c))+'%'+(Math.abs(c)<0.005?'':' <i class="rka">'+(c>0?'▲':'▼')+'</i>')+'</span>';
  return p>0||v?'<small>'+(p>0?'<span class="num">'+brl.format(p)+'</span>':'')+(p>0&&v?' · ':'')+v+'</small>':''}
function rankHtml(){
  var K=MD.d&&MD.d.rank,seg=anSeg();
  if(!K||!K.d||!K.d.length)return seg+'<div class="panel"><p class="muted">O ranking chega com o robô. Volte em alguns minutos.</p></div>';
  var mine={};try{compute().held.forEach(function(x){mine[x.p.ticker]=1})}catch(e){}
  var ix={mc:2,rec:3,ml:4}[RKS],L=K.d.slice().sort(function(a,b){var x=a[ix],y=b[ix];if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return y-x});
  var ch='<div class="chips rkch">'+[['mc','Valor de mercado'],['rec','Receita'],['ml','Margem líquida']].map(function(c){return '<button type="button" data-rks="'+c[0]+'" aria-pressed="'+(RKS===c[0])+'">'+c[1]+'</button>'}).join('')+'</div>';
  var rows=L.map(function(r,i){var ml=r[4];
    return '<li><button type="button" class="str rkrow" data-stk="'+esc(r[0])+'"><span class="rkn">'+(i+1)+'</span>'+tkLogo(r[0],false)+'<span class="cct"><b>'+esc(r[0])+(mine[r[0]]?' <span class="tag">sua</span>':'')+'</b><small>'+esc(rkNome(r))+'</small>'+rkDia(r)+'</span>'+
      '<span class="rkv"><b class="num">'+qfmt(r[2])+'</b><small>Receita <span class="num">'+qfmt(r[3])+'</span></small><small>Margem <span class="num '+(ml==null?'muted':cls(ml))+'">'+(ml==null?'—':pf.format(ml)+'%')+'</span></small></span></button></li>'}).join('');
  return seg+'<div class="panel"><div class="grp"><h2>Maiores empresas '+bal('As 100 maiores empresas da bolsa brasileira pelo valor de mercado (o que todas as ações dela valem juntas). Receita = o que a empresa vendeu nos últimos 12 meses. Margem líquida = quanto sobrou de lucro para cada R$ 100 vendidos. Bancos e seguradoras não têm esses dados no Fundamentus: usei os balanços da CVM (para banco, a receita inclui os juros que ele cobra). Holdings, que ganham mais com participações em outras empresas, ficam sem margem. Entra só a ação mais negociada de cada empresa. Os valores atualizam a cada 15 minutos com a bolsa aberta e duas vezes por dia fora dela; receita e margem só mudam quando sai balanço.')+'</h2><span class="det">'+rsWhen(K.at)+'</span></div>'+ch+'<ul class="rkl2">'+rows+'</ul></div>'}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-rks]');if(!b)return;RKS=b.getAttribute('data-rks');try{localStorage.setItem(LS+'-rks',RKS)}catch(x){}renderMkt()});
