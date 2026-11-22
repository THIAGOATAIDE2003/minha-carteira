/* Aporte · js/mercado-visao.js — Mercado: resumo do mercado, futuros, resultados trimestrais e relatório (parte 3 de 4). Faz parte do antigo mercado.js (mesmo escopo global, ordem de carga importa). */
/* ===== Market Overview: resumo do mercado no topo dos Índices ===== */
/* Futuros e pré-mercado (Worker /q e /x): futuros dos EUA, bolsas da Europa e o pré/pós-mercado das suas ações americanas */
var FUT={d:{},x:{},at:0,busy:false,ok:false};
var FUTL=[['ES=F','S&P 500'],['NQ=F','Nasdaq'],['YM=F','Dow Jones'],['RTY=F','Russell 2000']],EURL=[['^FTSE','Inglaterra'],['^FCHI','França'],['^GDAXI','Alemanha'],['^IBEX','Espanha'],['FTSEMIB.MI','Itália']];
function futLoad(){var u=pxBase();if(!u||FUT.busy||Date.now()-FUT.at<60000)return;FUT.busy=true;FUT.at=Date.now();
  var syms=FUTL.concat(EURL).map(function(f){return f[0]}).concat(['EWZ']).join(','),us=[],seen={};
  compute().held.forEach(function(x){if(x.p.market==='US')us.push(x.p.ticker)});wlist().forEach(function(t){if(!isBR(t)&&t.charAt(0)!=='^')us.push(t)});
  us.push('EWZ');us=us.filter(function(t){if(seen[t])return false;seen[t]=1;return true}).slice(0,20);
  Promise.all([getJSON(u+'/q?s='+encodeURIComponent(syms)).catch(function(){return null}),us.length?getJSON(u+'/x?s='+encodeURIComponent(us.join(','))).catch(function(){return null}):Promise.resolve({})]).then(function(r){
    FUT.busy=false;if(r[0]){FUT.d=r[0];FUT.ok=true}if(r[1])FUT.x=r[1];FUT.at=Date.now();
    var a=document.activeElement;if(MKV==='idx'&&!(a&&a.id==='mk-q'))try{renderMkt()}catch(e){}})}
/* "ao vivo" se a última negociação é recente; senão mostra de quando é (fim de semana, feriado, pausa) */
function futEstado(q){if(!q||!(q.t>0))return '';var m=(Date.now()/1000-q.t)/60;if(m<=20)return 'ao vivo';var d=new Date(q.t*1000),h=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),hoje=d.toDateString()===new Date().toDateString();return 'fechado · último negócio '+(hoje?'hoje '+h:d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})+' '+h)}
function futCard(n,q,k){var pc=q&&q.prev>0?(q.p/q.prev-1)*100:null,es=futEstado(q);
  return '<div class="idx"'+(k?' data-idxo="'+esc(k)+'" role="button" tabindex="0"':'')+'><small>'+esc(n)+'</small><b>'+(q&&q.p>0?num(q.p,2):'—')+'</b>'+(pc!=null?'<span class="num '+cls(pc)+'">'+sg0(pc)+pf.format(Math.abs(pc))+'%</span>':'<span class="small muted">sem dado</span>')+(es?'<span class="small muted" style="display:block;font-size:11px">'+esc(es)+'</span>':'')+'</div>'}
function futHtml(){
  if(!pxBase())return '<div class="panel"><div class="grp"><h2>Futuros e pré-mercado</h2></div><p class="note">Para ver os futuros, preencha o servidor de cotações em Ajustes.</p></div>';
  var d=FUT.d||{},x=FUT.x||{},pre=Object.keys(x).filter(function(t){return t!=='EWZ'&&x[t]&&x[t].ref>0}),ew=x.EWZ&&x.EWZ.ref>0?x.EWZ:null,ep=ew?(ew.p/ew.ref-1)*100:null;
  var h='<div class="panel"><div class="grp"><h2>Futuros e pré-mercado</h2><span class="det">'+(FUT.busy&&!FUT.ok?'carregando...':FUT.at?'às '+new Date(FUT.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'')+'</span></div>';
  h+='<p class="muted small" style="margin:0 0 6px">Futuros dos EUA</p><div class="idxg">'+FUTL.map(function(f){return futCard(f[1]+' fut.',d[f[0]],f[0])}).join('')+'</div>';
  h+='<p class="muted small" style="margin:10px 0 6px">Brasil nos EUA (no lugar do Ibovespa futuro)</p><div class="idxg">'+futCard('EWZ · Brasil em dólar',d.EWZ,'EWZ')+(ew?'<div class="idx" data-stk="EWZ" role="button" tabindex="0"><small>EWZ · '+(ew.fase==="pre"?'pré':'pós')+'</small><b>'+usd.format(ew.p)+'</b><span class="num '+cls(ep)+'">'+sg0(ep)+pf.format(Math.abs(ep))+'%</span></div>':'')+'</div>';
  h+='<p class="muted small" style="margin:10px 0 6px">Europa</p><div class="idxg">'+EURL.map(function(f){return futCard(f[1],d[f[0]],f[0])}).join('')+'</div>';
  if(pre.length)h+='<p class="muted small" style="margin:10px 0 6px">Pré-mercado e após o fechamento (suas ações dos EUA)</p><div class="idxg">'+pre.map(function(t){var e=x[t],pc=(e.p/e.ref-1)*100;
    return '<div class="idx" data-stk="'+esc(t)+'" role="button" tabindex="0"><small>'+esc(t)+' · '+(e.fase==='pre'?'pré':'pós')+'</small><b>'+usd.format(e.p)+'</b><span class="num '+cls(pc)+'">'+sg0(pc)+pf.format(Math.abs(pc))+'%</span></div>'}).join('')+'</div>';
  return h+'</div>'}
/* ===== Resultados trimestrais (CVM) na página da ação ===== */
function cvmQ(tk){var c=MD.d&&MD.d.cvm&&MD.d.cvm.q,q=c&&c[tk];return Array.isArray(q)?q.map(function(x){var y=x.slice();y[2]=x[2]?x[2]:null;return y}):null}
function qfmt(v){if(v==null)return '—';var a=Math.abs(v),s=v<0?'−':'';return s+'R$ '+(a>=1e9?num(a/1e9,a>=1e10?1:2)+' bi':num(a/1e6,0)+' mi')}
function qTtm(q){if(!q||q.length<8)return null;var s=function(a,i){var t=0;for(var k=0;k<4;k++){var v=a[a.length-1-i-k][3];if(v==null)return null;t+=v}return t},a=s(q,0),b=s(q,4);return a==null||b==null?null:{a:a,b:b,g:b>0?a/b-1:null}}
function qChart(q,ix,tit){var vs=q.map(function(x){return x[ix]}),ok=vs.filter(function(v){return v!=null});if(ok.length<2)return '';
  var mx=Math.max.apply(null,ok.concat([0])),mn=Math.min.apply(null,ok.concat([0])),rg=mx-mn||1,H=120,n=q.length,W=300,bw=W/n,y0=H*(mx/rg);
  var bars=q.map(function(x,i){var v=x[ix];if(v==null)return '';var hh=Math.abs(v)/rg*H,yy=v>=0?y0-hh:y0;return '<g data-slot="'+i+'"><rect x="'+(i*bw+bw*.18).toFixed(1)+'" y="'+yy.toFixed(1)+'" width="'+(bw*.64).toFixed(1)+'" height="'+Math.max(1,hh).toFixed(1)+'" rx="3" fill="'+(v<0?'var(--loss)':ix===2?'var(--c1)':'var(--c6)')+'"/></g>'}).join('');
  var tip={n:n,pts:q.map(function(x,i){var p=null;for(var j=0;j<i;j++)if(q[j][0]===x[0]-1&&q[j][1]===x[1])p=q[j];var g=p&&p[ix]&&x[ix]!=null&&p[ix]>0?x[ix]/p[ix]-1:null;return {i:i,t:x[1]+'º tri de '+x[0],r:[['',tit,qfmt(x[ix])]].concat(g!=null?[['','vs mesmo tri do ano antes',(g>=0?'+':'−')+pf.format(Math.abs(g*100))+'%',g>=0?'gain':'loss']]:[])}})};
  return '<h3 class="rkh3">'+tit+' por trimestre</h3><div class="tipc evpl qch"'+tipAttr(tip)+'><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" width="100%" height="'+H+'" role="img" aria-label="'+tit+' por trimestre"><line x1="0" x2="'+W+'" y1="'+y0.toFixed(1)+'" y2="'+y0.toFixed(1)+'" stroke="var(--line)"/>'+bars+'</svg></div>'+
    '<div class="qlb">'+q.map(function(x){return '<span>'+x[1]+'T'+String(x[0]).slice(2)+'</span>'}).join('')+'</div>'}
function qHtml(tk){var q=cvmQ(tk);if(!q||q.length<2)return '';var l=q[q.length-1],t=qTtm(q),p=null;q.forEach(function(x){if(x[0]===l[0]-1&&x[1]===l[1])p=x});
  var gl=p&&p[3]>0&&l[3]!=null?l[3]/p[3]-1:null,gr=p&&p[2]>0&&l[2]!=null?l[2]/p[2]-1:null,sg=function(g){return '<b class="'+(g>=0?'gain':'loss')+'">'+(g>=0?'+':'−')+pf.format(Math.abs(g*100))+'%</b>'};
  return '<div class="panel"><h2>Resultados trimestrais '+bal('Receita e lucro de cada trimestre, tirados dos balanços oficiais que a empresa entrega à CVM. Mostra se ela está crescendo ou piorando.')+'</h2><p class="anv" style="margin:4px 0 0">No '+l[1]+'º tri de '+l[0]+': '+(l[2]!=null?'receita de <b>'+qfmt(l[2])+'</b>'+(gr!=null?' ('+sg(gr)+' no ano)':'')+' e ':'')+'lucro de <b>'+qfmt(l[3])+'</b>'+(gl!=null?' ('+sg(gl)+' no ano)':'')+'.'+(t?' Lucro dos últimos 12 meses: <b>'+qfmt(t.a)+'</b>'+(t.g!=null?' ('+sg(t.g)+' contra os 12 meses anteriores)':'')+'.':'')+'</p>'+
    qChart(q,2,'Receita')+qChart(q,3,'Lucro')+'<p class="note">Balanços entregues à CVM (consolidado). O 4º trimestre é o ano inteiro menos os 9 primeiros meses. Toque nas barras para ver cada trimestre.</p></div>'}

var ANV='rel';try{var av0=localStorage.getItem(LS+'-anv');if(av0==='rel'||av0==='opp'||av0==='cls'||av0==='set'||av0==='cmp')ANV=av0}catch(e){}
function anSeg(){var on=0;try{var od=opData();on=od?od.n:0}catch(e){}
  return '<div class="seg anseg" id="anseg">'+[['rel','Relatório'],['opp','Ideias'+(on?' <i class="mkb">'+on+'</i>':'')],['cls','Classificação'],['set','Setores'],['cmp','Comparar']].map(function(v){return '<button type="button" data-anv="'+v[0]+'" aria-pressed="'+(ANV===v[0])+'">'+v[1]+'</button>'}).join('')+'</div>'}
/* Relatório da carteira (IA): aba própria, sempre aberta, com a data de quando foi escrito logo no topo; o texto de economia (macro) não aparece mais */
function rsRel(){var c=MD.d&&MD.d.res&&MD.d.res.cart;if(!c||!c.ai)return '<div class="panel"><h2>Relatório da carteira · IA</h2><p class="muted">O relatório chega com o robô, uma vez por dia. Volte em alguns minutos.</p></div>';var a=c.ai;
  var lst=function(t,arr,cl){return arr&&arr.length?'<h3 class="rkh3">'+t+'</h3><ul class="rkl">'+arr.map(function(x){return '<li>'+rkLvl(cl)+'<div><p style="margin:0;color:var(--fg)">'+esc(x)+'</p></div></li>'}).join('')+'</ul>':''};
  return '<div class="panel rscart"><div class="grp"><h2>Relatório da carteira '+bal('Uma vez por dia a IA junta as notícias das suas empresas e os números e escreve o que importa para a sua carteira: destaques, riscos e o que acompanhar.')+'</h2><span class="det">'+rsWhen(c.at)+'</span></div>'+
    '<p class="small muted" style="margin:2px 0 8px">Escrito pela IA ('+esc(c.mod||'Gemini')+') em '+rsWhen(c.at)+'. Pode errar e não é recomendação.</p>'+
    (a.titulo?'<b class="rstit">'+esc(a.titulo)+'</b>':'')+lst('Destaques',a.destaques,'ok')+lst('Riscos',a.riscos,'al')+lst('Para acompanhar',a.atencao,'at')+'</div>'}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-anv]');if(!b)return;ANV=b.getAttribute('data-anv');try{localStorage.setItem(LS+'-anv',ANV)}catch(x){}renderMkt()});
/* nomes e setores nas telas de classificação e setores */
function nomeEmp(tk){var n=(MD.d&&MD.d.cvm&&MD.d.cvm.nomes&&MD.d.cvm.nomes[tk])||(MD.d&&MD.d.hist&&MD.d.hist[tk]&&MD.d.hist[tk].name)||'';if(!n)return '';
  n=n.replace(/\s+S\.?\s?\/?\s?A\.?.*$/i,'').replace(/\s+-\s+.*$/,'');var l=n.toLowerCase().replace(/(^|[\s.])(\S)/g,function(m,a,b){return a+b.toUpperCase()});return l.replace(/\b(Do|Da|De|Dos|Das|E)\b/g,function(x){return x.toLowerCase()})}
function catSetorNome(tk){var c=MD.d&&MD.d.cat,p=c&&c.a&&c.a[tk];return p&&p[1]!=null&&c.n?(c.n[String(p[1])]||''):''}
var CLSN=20;
function cMini(l,v){return '<span>'+l+'<b>'+v+'</b></span>'}
function clsHtml(all,sc,W,mine,list){
  var pc=function(v){return v!=null?pf.format(v)+'%':'—'},n2=function(v){return v!=null?num(v,2):'—'},n1=function(v){return v!=null?num(v,1):'—'};
  var big={dy:['dy','DY',pc],qual:['dy','DY',pc],pl:['pl','P/L',n1],roe:['roe','ROE',pc],pvp:['pvp','P/VP',n2]}[sc.k]||['dy','DY',pc];
  var h='<div class="panel"><div class="grp"><h2>Classificação de ações '+bal('Lista as ações da bolsa pelo critério que você escolher (dividendos, mais baratas, mais rentáveis...). Toque numa para ver a análise.')+'</h2><span class="det">'+all.length+' ações</span></div>'+
    '<div class="cchips">'+SCRS.map(function(x){return '<button type="button" data-scr="'+x.k+'" aria-pressed="'+(x.k===sc.k)+'">'+x.n+'</button>'}).join('')+'</div>'+
    '<p class="small muted" style="margin:0 2px 12px">'+sc.d+' Só ações com mais de R$ 1 milhão negociados por dia.</p>';
  h+=list.map(function(F,i){var nm=nomeEmp(F.tk),st=catSetorNome(F.tk),bg=F[big[0]];
    return '<div class="ccd"><button type="button" class="ccm" data-stk="'+esc(F.tk)+'"><i class="ccn">'+(i+1)+'</i>'+tkLogo(F.tk,false)+'<span class="cct"><b>'+esc(F.tk)+(mine[F.tk]?' <span class="tag">sua</span>':W.indexOf(F.tk)>=0?' <span class="tag">★</span>':'')+(catNovo(F.tk)?' <span class="tag">novo</span>':'')+'</b><small>'+esc(nm)+'</small>'+(st?'<small class="sx">'+esc(st)+'</small>':'')+'</span></button>'+
      '<span class="ccv"><b>'+big[2](bg)+'</b><small>'+big[1]+'</small></span><div class="ccg">'+cMini('P/L',n1(F.pl))+cMini('P/VP',n2(F.pvp))+cMini('DY',pc(F.dy))+cMini('ROE',pc(F.roe))+'</div></div>'}).join('');
  if(!list.length)h+='<p class="muted">Nenhuma ação passou nesse critério agora.</p>';
  if(list.length>=CLSN)h+='<button type="button" class="btn ghost" data-clsm="1" style="width:100%">Mostrar mais '+CLSN+'</button>';
  return h+'<p class="note" style="margin-top:10px">Indicadores do Fundamentus, atualizados pelo robô diário. A classificação é ponto de partida para estudar, não recomendação.</p></div>'}
