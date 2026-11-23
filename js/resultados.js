/* Aba Resultados da página da ação: como vêm os trimestres (CVM), se superou o esperado e o consenso dos analistas (Yahoo, via robô) */
function csD(tk){var c=MD.d&&MD.d.cons&&MD.d.cons.d;return c&&c[tk]||null}
function csPc(v){return v==null?'—':sg0(v)+pf.format(Math.abs(v))+'%'}
function csAt(C){var a=C&&C.at||(MD.d&&MD.d.cons&&MD.d.cons.at)||'';return String(a).slice(0,10).split('-').reverse().join('/')}
function csTri(q){var m=/^(\d{4})-(\d{2})/.exec(q||'');return m?Math.ceil(+m[2]/3)+'º tri '+m[1]:(q||'—')}
/* leitura dos trimestres por regras: compara cada trimestre com o mesmo do ano anterior */
function trLeit(q){if(!q||q.length<5)return null;var yoy=function(x,ix){var p=null;q.forEach(function(y){if(y[0]===x[0]-1&&y[1]===x[1])p=y});return p&&p[ix]!=null&&p[ix]>0&&x[ix]!=null?x[ix]/p[ix]-1:null};
  var ult=q.slice(-4).map(function(x){return {q:x,l:yoy(x,3),r:yoy(x,2)}}),ls=ult.map(function(u){return u.l}).filter(function(v){return v!=null}),rs=ult.map(function(u){return u.r}).filter(function(v){return v!=null});
  if(ls.length<2)return null;var l2=ls.slice(-2),bom=l2.every(function(v){return v>=.1}),mau=l2.every(function(v){return v<=-.1}),acel=ls.length>=3&&ls[ls.length-1]>ls[ls.length-2]&&ls[ls.length-2]>ls[ls.length-3];
  var mg=function(x){return x[2]>0&&x[3]!=null?x[3]/x[2]:null},m1=mg(q[q.length-1]),m0=null;q.forEach(function(y){if(y[0]===q[q.length-1][0]-1&&y[1]===q[q.length-1][1])m0=mg(y)});
  var k=bom?'bom':mau?'mau':'misto',t=bom?'Vindo bem':mau?'Vindo mal':'Irregular',tx=bom?'O lucro cresceu pelo menos 10% contra o mesmo trimestre do ano anterior nos dois últimos balanços.':mau?'O lucro caiu pelo menos 10% contra o mesmo trimestre do ano anterior nos dois últimos balanços.':'O lucro não seguiu um rumo claro: alguns trimestres melhores e outros piores que os do ano anterior.';
  var ex=[];if(acel)ex.push('o crescimento do lucro está acelerando nos últimos 3 trimestres');if(m1!=null&&m0!=null&&Math.abs(m1-m0)>=.02)ex.push('a margem líquida '+(m1>m0?'subiu':'caiu')+' de '+pf.format(m0*100)+'% para '+pf.format(m1*100)+'% contra o mesmo trimestre do ano anterior');
  var rl=rs.length?rs[rs.length-1]:null;if(rl!=null&&ls.length&&Math.abs(rl)>=.05&&(rl>0)!==(ls[ls.length-1]>0))ex.push('receita e lucro foram em direções opostas no último trimestre');
  return {k:k,t:t,tx:tx,ex:ex,ult:ult}}
function trHtml(tk){var q=cvmQ(tk);if(!q||q.length<2)return '<div class="panel"><h2>Como vêm os trimestres</h2><p class="muted">Ainda não há balanços trimestrais dessa empresa no app (a CVM só cobre empresas do Brasil, e o robô traz os de quem está na carteira ou na lista).</p></div>';
  var L=trLeit(q),rows=q.slice(-4).reverse().map(function(x){var p=null;q.forEach(function(y){if(y[0]===x[0]-1&&y[1]===x[1])p=y});var g=function(ix){return p&&p[ix]>0&&x[ix]!=null?x[ix]/p[ix]-1:null},gl=g(3),gr=g(2),c=function(v){return v==null?'<span class="muted">—</span>':'<span class="num '+cls(v*100)+'">'+csPc(v*100)+'</span>'};
    return '<tr><td>'+x[1]+'º tri '+x[0]+'</td><td class="num">'+qfmt(x[2])+'</td><td>'+c(gr)+'</td><td class="num">'+qfmt(x[3])+'</td><td>'+c(gl)+'</td></tr>'}).join('');
  return '<div class="panel"><h2>Como vêm os trimestres '+bal('Os últimos balanços da empresa (CVM) comparados com o mesmo trimestre do ano anterior, que é a comparação justa porque tira a sazonalidade. A leitura é feita por regras, não por IA.')+'</h2>'+
    (L?'<p class="anv" style="margin:4px 0"><b class="'+(L.k==='bom'?'gain':L.k==='mau'?'loss':'muted')+'">'+L.t+'.</b> '+L.tx+(L.ex.length?' Também: '+L.ex.join('; ')+'.':'')+'</p>':'')+
    '<div class="atsc"><table class="tb"><thead><tr><th>Trimestre</th><th>Receita</th><th>no ano</th><th>Lucro</th><th>no ano</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="note">Balanços consolidados entregues à CVM. "No ano" compara com o mesmo trimestre do ano anterior. Os gráficos de cada trimestre estão mais abaixo.</p></div>'}
function csSup(C){var ph=C&&C.ph||[];if(!ph.length)return '';var bat=0,mis=0;
  var rows=ph.slice().reverse().map(function(x){var sp=x[2]?(x[1]-x[2])/Math.abs(x[2])*100:(x[3]!=null?x[3]*100:null);if(sp!=null){if(sp>=1)bat++;else if(sp<=-1)mis++}
    var k=sp==null?'':sp>=1?'gain':sp<=-1?'loss':'muted',lb=sp==null?'—':sp>=1?'Superou':sp<=-1?'Ficou abaixo':'Em linha';
    return '<tr><td>'+esc(csTri(x[0]))+'</td><td class="num">'+pf.format(x[1])+'</td><td class="num">'+pf.format(x[2])+'</td><td><span class="num '+k+'">'+lb+(sp!=null?' ('+csPc(sp)+')':'')+'</span></td></tr>'}).join('');
  return '<div class="panel"><h2>Superou o que o mercado esperava? '+bal('Compara o lucro por ação que a empresa de fato teve em cada trimestre com a média do que os analistas esperavam antes do balanço. Fonte: Yahoo Finance.')+'</h2><p class="anv" style="margin:4px 0">Nos últimos '+ph.length+' trimestres com dado: <b class="gain">'+bat+' acima</b>'+(mis?' e <b class="loss">'+mis+' abaixo</b>':'')+' do esperado.</p>'+
    '<div class="atsc"><table class="tb"><thead><tr><th>Trimestre</th><th>Lucro/ação</th><th>Esperado</th><th>Resultado</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="note">Lucro por ação em reais (ou dólares, nas ações dos EUA). Superou/abaixo = diferença de pelo menos 1% contra a média dos analistas. Fonte: Yahoo Finance, em '+csAt(C)+'.</p></div>'}
function csEsp(C,tk,us){var E=C&&C.est||{};if(!Object.keys(E).length)return '';var F=us?usd:brl,nm={'0q':'Trimestre atual','+1q':'Próximo trimestre','0y':'Este ano','+1y':'Ano que vem'},rows=['0q','+1q','0y','+1y'].filter(function(k){return E[k]}).map(function(k){var e=E[k];
    return '<tr><td>'+nm[k]+'</td><td class="num">'+(e[0]!=null?pf.format(e[0]):'—')+'</td><td>'+(e[1]!=null?'<span class="num '+cls(e[1]*100)+'">'+csPc(e[1]*100)+'</span>':'<span class="muted">—</span>')+'</td><td class="num">'+(e[2]!=null?qfmt(e[2]).replace('R$ ',us?'US$ ':'R$ '):'—')+(e[3]!=null?'<br><small class="'+cls(e[3]*100)+'">'+csPc(e[3]*100)+'</small>':'')+'</td></tr>'}).join('');
  var y1=E['+1y'],y0=E['0y'],lei=y1&&y1[1]!=null?(y1[1]>=.1?'Os analistas esperam o lucro por ação crescendo '+csPc(y1[1]*100)+' no ano que vem.':y1[1]<=-.05?'Os analistas esperam o lucro por ação caindo '+csPc(y1[1]*100)+' no ano que vem.':'Os analistas esperam o lucro por ação quase estável no ano que vem ('+csPc(y1[1]*100)+').'):y0&&y0[1]!=null?'Para este ano, os analistas esperam o lucro por ação '+csPc(y0[1]*100)+'.':'';
  return '<div class="panel"><h2>O que esperar e projeções '+bal('Estimativa média dos analistas para o lucro por ação e a receita nos próximos períodos. É a opinião deles, não garantia: costuma ser revista a cada balanço. O Yahoo só informa este ano e o próximo.')+'</h2>'+(lei?'<p class="anv" style="margin:4px 0">'+lei+'</p>':'')+
    '<div class="atsc"><table class="tb"><thead><tr><th>Período</th><th>Lucro/ação</th><th>cresc.</th><th>Receita</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="note">Estimativas médias dos analistas (Yahoo Finance, '+csAt(C)+'). Projeções além do ano que vem não estão disponíveis de graça.</p></div>'}
function csRec(C,tk,d,us){if(!C||!(C.rec||C.alvo))return '';var F=us?usd:brl,r=C.rec,tot=r?r.reduce(function(a,b){return a+b},0):0,lv=livePx(tk),px=lv?lv.p:d.price,
    cmp=r?r[0]+r[1]:0,man=r?r[2]:0,ven=r?r[3]+r[4]:0,rk=C.rk,rot=rk==null?null:rk<=1.5?'Compra forte':rk<=2.5?'Compra':rk<=3.5?'Manter':rk<=4.5?'Venda':'Venda forte',rk2=rot==='Compra forte'||rot==='Compra'?'gain':rot==='Manter'?'muted':rot?'loss':'muted';
  var seg=function(n,c,l){return n?'<span style="flex:'+n+';background:'+c+'" title="'+l+': '+n+'"></span>':''};
  var h='<div class="panel"><h2>O que os analistas recomendam '+bal('Quantos analistas recomendam comprar, manter ou vender a ação, e o preço que eles acham justo (preço-alvo médio). É a opinião de bancos e casas de análise reunida pelo Yahoo Finance. Não é recomendação do app.')+'</h2>';
  if(r&&tot){h+='<p class="anv" style="margin:4px 0">'+(rot?'Consenso: <b class="'+rk2+'">'+rot+'</b> · ':'')+tot+' analistas'+'</p><div style="display:flex;height:14px;border-radius:7px;overflow:hidden;margin:8px 0;gap:2px">'+seg(cmp,'var(--gain)','Compra')+seg(man,'var(--muted)','Manter')+seg(ven,'var(--loss)','Venda')+'</div>'+
    '<div class="small" style="display:flex;justify-content:space-between"><span class="gain">'+cmp+' compra</span><span class="muted">'+man+' manter</span><span class="loss">'+ven+' venda</span></div>'}
  if(C.alvo&&C.alvo[0]){var up=px?C.alvo[0]/px-1:null;h+='<p class="anv" style="margin:10px 0 2px">Preço-alvo médio: <b>'+F.format(C.alvo[0])+'</b>'+(up!=null?' ('+csPc(up*100)+' contra o preço de hoje)':'')+'</p>'+(C.alvo[1]&&C.alvo[2]?'<p class="small muted" style="margin:0">Mais otimista '+F.format(C.alvo[1])+' · mais pessimista '+F.format(C.alvo[2])+'</p>':'')}
  return h+'<p class="note">Fonte: Yahoo Finance, em '+csAt(C)+'. Opinião de analistas, que erram e costumam seguir o preço; use como mais uma informação.</p></div>'}
function resHtml(tk,d){var us=d.cur==='USD',C=csD(tk),h=us?'':trHtml(tk);try{h+=thLembra(tk)}catch(e){}
  if(C){h+=csRec(C,tk,d,us)+csSup(C)+csEsp(C,tk,us)}
  else h+='<div class="panel"><h2>Consenso dos analistas</h2><p class="muted">Sem cobertura de analistas para essa ação'+(MD.d&&MD.d.cons?' no Yahoo Finance (comum em empresas menores).':': o robô ainda não trouxe esses dados. Eles chegam na próxima rodada completa.')+'</p></div>';
  if(!us)h+=qHtml(tk);
  return h}

/* ===== Ideias para estudar (antigo Garimpo): qualidade do dado e histórico do que o app já apontou ===== */
var GHK=LS+'-gar';
function garLoad(){try{var g=JSON.parse(localStorage.getItem(GHK)||'{}')||{};if(!g.r||typeof g.r!=='object')g.r={};Object.keys(g.r).forEach(function(d){var x=g.r[d];if(!x||!Array.isArray(x.l)||!/^\d{4}-\d{2}-\d{2}$/.test(d))delete g.r[d]});return g}catch(e){return {r:{}}}}
function garIbov(){try{var x=IDX.filter(function(i){return i.k==='ibov'})[0],r=x&&idxVal0(x);if(r&&r.v>0)return r.v}catch(e){}var D=MD.d&&MD.d.idx&&MD.d.idx.ibov;return D&&D.d&&D.d.length?D.d[D.d.length-1][1]:null}
/* uma foto por dia das ideias novas: ação, preço, nota e preço justo; o Ibovespa do dia serve de régua */
function garRec(D){if(!D||!D.length)return;var g=garLoad(),td=today();if(g.r[td])return;g.r[td]={i:garIbov(),l:D.map(function(o){return [o.tk,Math.round(o.d.price*100)/100,o.score,o.V?Math.round(o.V.med*100)/100:null]})};
  var ks=Object.keys(g.r).sort();while(ks.length>420)delete g.r[ks.shift()];try{localStorage.setItem(GHK,JSON.stringify(g))}catch(e){}}
function garDias(a,b){return Math.round((Date.parse(b)-Date.parse(a))/864e5)}
/* cada ação conta uma vez, a partir do dia em que apareceu; só entra quem tem ao menos 30 dias de vida */
function garRes(){var g=garLoad(),td=today(),ib=garIbov(),first={},ks=Object.keys(g.r).sort();ks.forEach(function(d){g.r[d].l.forEach(function(x){if(Array.isArray(x)&&x[0]&&!first[x[0]])first[x[0]]={d:d,p:x[1],i:g.r[d].i}})});
  var L=[];Object.keys(first).forEach(function(tk){var f=first[tk],age=garDias(f.d,td),lv=livePx(tk);if(age<30||!lv||!(lv.p>0)||!(f.p>0)||!(f.i>0)||!(ib>0))return;L.push({tk:tk,age:age,r:lv.p/f.p-1,b:ib/f.i-1})});
  if(!L.length)return {n:0,dias:ks.length,desde:ks[0]||null};var bat=L.filter(function(x){return x.r>x.b}).length,ex=L.map(function(x){return x.r-x.b}).sort(function(a,b){return a-b}),med=ex[Math.floor(ex.length/2)],am=L.reduce(function(s,x){return s+x.age},0)/L.length;
  return {n:L.length,bat:bat,med:med,age:Math.round(am),dias:ks.length,desde:ks[0],L:L}}
function garHist(){var R=garRes(),h='<div class="panel"><h2>Esse método já acertou? '+bal('O app guarda todo dia as ideias que apontou, com o preço daquele dia, e compara com o Ibovespa. Assim dá para ver, com o tempo, se o método funciona ou só parece bom. Vale só para este aparelho e não conta dividendos.')+'</h2>';
  if(!R.n)return h+'<p class="muted">Ainda sem histórico: '+(R.dias?'o app começou a guardar as ideias em '+esc(R.desde.split('-').reverse().join('/'))+' ('+R.dias+(R.dias>1?' dias':' dia')+'). ':'')+'É preciso pelo menos 30 dias para a primeira comparação. Até lá, trate as ideias como pontos para estudar, não como sinal.</p></div>';
  return h+'<p class="anv" style="margin:4px 0">Das <b>'+R.n+'</b> ideias com 30 dias ou mais (idade média '+R.age+' dias), <b>'+R.bat+'</b> subiram mais que o Ibovespa desde que apareceram. Diferença mediana: <b class="'+(R.med>=0?'gain':'loss')+'">'+csPc(R.med*100)+'</b>.</p>'+(R.n<10?'<p class="note">São poucos casos (menos de 10): ainda não prova nada, nem a favor nem contra.</p>':'')+'<p class="note">Preço de hoje contra o preço do dia em que a ideia apareceu, sem dividendos. Desde '+esc(R.desde.split('-').reverse().join('/'))+'.</p></div>'}
/* qualidade do dado de uma ideia: balanço, preço e indicadores que faltam */
/* ===== Confiança do dado das Ideias (1.62.0): separada da nota; a nota (stkAna) não muda ===== */
var OPKS=['pl','pvp','roe','dy','ml','divpl','cr5'];
function opBanco(o){var sc=o&&o.A&&o.A.sec;return !!(o&&o.banco)||!!(sc&&sc[0]==='Financeiro')}
/* indicadores que deveriam existir: para banco/financeira, margem e dívida não se aplicam */
function opKeys(o){var b=opBanco(o);return OPKS.filter(function(k){return !(b&&(k==='ml'||k==='divpl'))})}
function opYmd(ms){return new Date(ms-3*36e5).toISOString().slice(0,10)}
/* dias úteis da B3 entre o dia do preço e hoje: 0 = preço de hoje, 1 = do pregão anterior */
function opDU(ms,now){if(!ms)return null;var a=opYmd(ms),b=opYmd(now||Date.now()),n=0,d=new Date(a+'T00:00:00Z');
  for(var i=0;i<40&&opYmd(d.getTime()+3*36e5)<b;i++){d=new Date(d.getTime()+864e5);if(bDay(d))n++}return n}
/* Alta / Média / Baixa. Baixa = não vira ideia (vai para Em verificação). `now` só existe para o teste. */
function opConf(o,now){var tk=o.tk,N=o.A&&o.A.N||{},pts=0,w=[],blk=false,ks=opKeys(o),miss=ks.filter(function(k){return N[k]==null}).length;
  if(miss>=3){pts+=3;w.push('faltam '+miss+' de '+ks.length+' indicadores')}else if(miss>0){pts+=1;w.push('faltam '+miss+' de '+ks.length+' indicadores')}
  var lv=null;try{lv=livePx(tk)}catch(e){}
  if(!lv||!lv.at){pts+=1;w.push('preço sem data')}
  else{var du=opDU(lv.at,now);if(lv.sus){blk=true;w.push('preço duvidoso')}else if(du>1){blk=true;var dd=opYmd(lv.at).split('-');w.push('preço velho (de '+dd[2]+'/'+dd[1]+')')}}
  var q=cvmQ(tk),l=q&&q.length?q[q.length-1]:null;
  if(!l){pts+=3;w.push('sem balanço da CVM')}else{var vel=((now||Date.now())-Date.UTC(l[0],l[1]*3,0))/864e5;if(vel>400){pts+=3;w.push('balanço de mais de 1 ano')}else if(vel>240){pts+=1;w.push('balanço com mais de 8 meses')}}
  var ev=((o.A&&o.A.pos)||[]).length+((o.A&&o.A.neg)||[]).length;if(ev<4){pts+=1;w.push('poucos sinais para a nota ('+ev+')')}
  var n=blk||pts>=3?'Baixa':pts>=1?'Média':'Alta';
  return {n:n,w:w,f:n==='Alta'?1:n==='Média'?0.8:0}}
function opQual(o){var tk=o.tk,q=cvmQ(tk),l=q&&q.length?q[q.length-1]:null,w=[],N=o.A&&o.A.N||{},ks=['pl','pvp','roe','dy','ml','divpl','cr5'],miss=ks.filter(function(k){return N[k]==null}).length,lb;
  if(!l){lb='sem balanço da CVM';w.push('sem balanço')}else{lb='balanço do '+l[1]+'º tri de '+l[0];var fim=Date.UTC(l[0],l[1]*3,0),vel=(Date.now()-fim)/864e5;if(vel>240){w.push('balanço antigo')}}
  var lv=livePx(tk),pa=lv&&lv.at?Math.round((Date.now()-lv.at)/60000):null,pt=pa==null?'preço sem hora':pa<90?'preço de '+Math.max(1,pa)+' min atrás':pa<2880?'preço de '+Math.round(pa/60)+' h atrás':'preço de '+Math.round(pa/1440)+' dias atrás';
  if(pa!=null&&pa>4320)w.push('preço velho');if(lv&&lv.sus)w.push('preço duvidoso');if(miss>=3)w.push('faltam '+miss+' indicadores');
  return {t:lb+' · '+pt+(miss?' · faltam '+miss+' de '+ks.length+' indicadores':''),fraca:w.length>0,w:w}}
