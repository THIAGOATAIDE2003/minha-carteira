/* Orçamento (piloto): Mais > Orçamento. Salário, extras, gastos fixos, ENVELOPES de gasto variável (limite por categoria + cada gasto lançado), meta de gasto,
   aporte do mês e dinheiro parado na conta. Dados em S.orc (sincronizado como cfg 'orc' no repositório privado). Não mexe em compute(): o "aportado" vem
   das compras do próprio mês e o dinheiro da conta fica só aqui (não entra no Patrimônio do Início). Tudo manual; os gastos fixos se repetem sozinhos.
   Cada mês é o mês de REFERÊNCIA (as contas de dezembro entram em dezembro, mesmo que o salário caia em janeiro).
   S.orc = {v:2, inicio:'AAAA-MM' (primeiro mês do orçamento; meses antes ficam de fora), sal, meta, apo, conta, fixos:[{id,n,v}], cats:[{id,n,lim}],
            m:{'AAAA-MM':{sal (recebido, null = usa o previsto), ex:[{id,n,v}], fx:{idDoFixo:valor deste mês}, l:[{id,c:idDaCategoria,v,n,d:'AAAA-MM-DD',f:'d|c|p|m'|''}]}}} */
var ORM='',ORV='mes',ORE='mes',ORINI='2026-11',ORCATS=['Mercado','Transporte','Lazer','Saúde','Outros'],ORO={},ORF={d:'débito',c:'crédito',p:'Pix',m:'dinheiro'};
function orcId(){return 'o'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)}
function orcO(){if(!S.orc||typeof S.orc!=='object')S.orc={sal:0,meta:0,apo:0,conta:0,fixos:[],m:{},inicio:ORINI};var o=S.orc,chg=0;if(!Array.isArray(o.fixos))o.fixos=[];if(!o.m||typeof o.m!=='object')o.m={};
  if(!Array.isArray(o.cats))o.cats=ORCATS.map(function(n,i){return {id:'c'+i,n:n,lim:0}});
  if(o.v!==2){/* versão 1 guardava um total por categoria no mês (m.g): vira um gasto lançado, sem perder nada */
    Object.keys(o.m).forEach(function(ym){var m=o.m[ym];if(m&&m.g){Object.keys(m.g).forEach(function(k){var c=o.cats.filter(function(x){return x.n===k})[0];if(c&&+m.g[k]>0){m.l=m.l||[];m.l.push({id:orcId(),c:c.id,v:+m.g[k],n:'Total lançado antes',d:ym+'-01',f:''})}});delete m.g}});o.v=2}
  /* o orçamento começa em novembro/2026: o que estava lançado antes disso (testes) é apagado, uma vez só */
  if(o.inicio===undefined){o.inicio=ORINI;Object.keys(o.m).forEach(function(ym){if(ym<o.inicio)delete o.m[ym]});chg=1}
  if(o.inicio==='2026-12'){o.inicio=ORINI;chg=1}/* 1.49.0 começava em dezembro: agora novembro */
  if(chg){try{orcSave()}catch(e){}}
  return o}
function orcDef(){var t=today().slice(0,7),i=orcO().inicio;return t<i?i:t}
function orcMes(ym){var o=orcO(),m=o.m[ym];if(!m)m=o.m[ym]={sal:null,ex:[],fx:{},l:[]};if(!Array.isArray(m.ex))m.ex=[];if(!m.fx||typeof m.fx!=='object')m.fx={};if(!Array.isArray(m.l))m.l=[];return m}
function orcSave(){S.pend=S.pend||[];S.pend.push({t:'cfg',k:'orc',v:S.orc});save();try{ghSync()}catch(e){}}
/* quanto você realmente aportou no mês: compras de ações (com taxas, EUA pelo dólar da compra) e renda fixa */
function orcAportado(ym,trades){var s=0;(trades||S.trades||[]).forEach(function(t){if(!t.date||t.date.slice(0,7)!==ym)return;
  if(t.side==='buy')s+=t.qty*ePx(t)*(t.market==='US'?(t.fx||0):1);else if(t.side==='rf')s+=t.price||0});return s}
/* valor de um fixo no mês: o que você digitou para aquele mês, senão o valor normal */
function orcFxV(x,m){var ov=m&&m.fx&&m.fx[x.id];return ov!=null&&isFinite(ov)?+ov:(+x.v||0)}
function orcCalc(ym,trades){var o=orcO(),m=o.m[ym]||{sal:null,ex:[],fx:{},l:[]},prev=+o.sal||0,sal=m.sal!=null?+m.sal:prev,ex=0,fx=0,vr=0,por={};
  (m.ex||[]).forEach(function(x){ex+=+x.v||0});o.fixos.forEach(function(x){fx+=orcFxV(x,m)});(m.l||[]).forEach(function(x){var v=+x.v||0;vr+=v;por[x.c]=(por[x.c]||0)+v});
  var ent=sal+ex,gas=fx+vr,apo=orcAportado(ym,trades),pc=function(v){return sal>0?v/sal:null},lims=0,res=0,fut=ym>=today().slice(0,7);o.cats.forEach(function(k){lims+=+k.lim||0;if(fut)res+=Math.max(0,(+k.lim||0)-(por[k.id]||0))});/* res: o que ainda resta nos envelopes do mês atual/futuros — já está "gasto" na cabeça, então sai da sobra */
  return {pFx:pc(fx),pVr:pc(vr),pApo:pc(apo),pGas:pc(gas),pSobra:pc(sal-gas-res-apo),res:res,pRes:pc(res),pLim:pc(lims),lims:lims,por:por,prev:prev,sal:sal,recebido:m.sal!=null,ex:ex,ent:ent,fx:fx,vr:vr,gas:gas,apo:apo,sobra:ent-gas-res-apo,livre:ent-gas-res,meta:+o.meta||0,apoPl:+o.apo||0}}
function orcP(v){return v==null?'':Math.round(v*100)+'%'}
function orcLabel(ym){var d=new Date(+ym.slice(0,4),+ym.slice(5,7)-1,1),t=d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});return t.charAt(0).toUpperCase()+t.slice(1)}
function orcShift(ym,n){var d=new Date(+ym.slice(0,4),+ym.slice(5,7)-1+n,1),r=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2),i=orcO().inicio;return r<i?i:r}
function orcBar(p,cls){return '<div class="orb"><i class="'+cls+'" style="width:'+Math.max(2,Math.min(100,p*100)).toFixed(0)+'%"></i></div>'}
function orcNum(v){return v!=null&&v!==''&&isFinite(v)&&+v!==0?String(+(+v).toFixed(2)).replace('.',','):''}
function orcIn(f,v,ph){return '<input class="orin" inputmode="decimal" data-orf="'+f+'" value="'+orcNum(v)+'" placeholder="'+esc(ph||'0,00')+'" autocomplete="off">'}
function orcList(kind,arr){return arr.length?'<ul class="orl">'+arr.map(function(x){return '<li><span>'+esc(x.n||'—')+'</span><span class="num">'+brl.format(+x.v||0)+'</span><button type="button" class="orx" data-ordel="'+kind+':'+esc(x.id)+'" aria-label="Apagar">✕</button></li>'}).join('')+'</ul>':''}
function orcFxList(o,m,sal){return o.fixos.length?'<ul class="orl">'+o.fixos.map(function(x){var ov=m.fx&&m.fx[x.id],v=orcFxV(x,m);
  return '<li><span>'+esc(x.n||'—')+(sal>0?' <small class="muted">'+Math.round(v/sal*100)+'%</small>':'')+'</span><input class="orin orm2" inputmode="decimal" data-orf="fx:'+esc(x.id)+'" value="'+(ov!=null&&isFinite(ov)?orcNum(ov)||'0':'')+'" placeholder="'+esc(orcNum(x.v)||'0')+'" autocomplete="off"><button type="button" class="orx" data-ordel="fx:'+esc(x.id)+'" aria-label="Apagar">✕</button></li>'}).join('')+'</ul>':''}
function orcAdd(kind,ph){return '<div class="orr"><input class="orin" id="or-'+kind+'-n" maxlength="30" placeholder="'+esc(ph)+'" autocomplete="off"><input class="orin orv" id="or-'+kind+'-v" inputmode="decimal" placeholder="R$" autocomplete="off"><button type="button" class="btn small" data-oradd="'+kind+'">+</button></div>'}
function orcPanel(c){if(!(c.sal>0))return '';var tot=c.gas+c.res+c.apo,d=Math.max(c.sal,tot),w=function(v){return Math.max(0,v/d*100).toFixed(1)},sb=c.sal-tot,
  rows=[['fx','Gastos fixos',c.fx,c.pFx],['vr','Gastos variáveis',c.vr,c.pVr],['rs','Reservado nos envelopes',c.res,c.pRes],['ap','Aporte',c.apo,c.pApo],['sb',sb<0?'Passou do salário':'Sobra do salário',sb,c.pSobra]];
  return '<section class="panel"><h2>Para onde vai o salário'+bal('Tudo em % do salário do mês (o que caiu, ou o previsto). Extras não entram na conta. Gastos = fixos + variáveis + o que ainda resta nos envelopes (reservado: já conta como gasto).')+'</h2><p class="orbig"><b class="num '+((c.pGas+(c.pRes||0))>1?'loss':'')+'">'+orcP(c.pGas+(c.pRes||0))+'</b> vai em gastos'+(c.res>0?' (com o reservado)':'')+'</p>'+
    '<div class="orsk"><i class="fx" style="width:'+w(c.fx)+'%"></i><i class="vr" style="width:'+w(c.vr)+'%"></i><i class="rs" style="width:'+w(c.res)+'%"></i><i class="ap" style="width:'+w(c.apo)+'%"></i>'+(sb>0?'<i class="sb" style="width:'+w(sb)+'%"></i>':'')+'</div>'+
    '<ul class="orl">'+rows.map(function(r){return '<li><span><i class="ord '+r[0]+'"></i>'+r[1]+'</span><span class="num">'+brl.format(Math.abs(r[2]))+'</span><b class="num'+(r[0]==='sb'?' '+cls(r[2]):'')+'" style="min-width:48px;text-align:right">'+(r[0]==='sb'&&r[2]<0?'−':'')+orcP(Math.abs(r[3]))+'</b></li>'}).join('')+'</ul></section>'}
/* um envelope: limite, quanto já saiu, quanto resta, quanto dá por dia e os gastos lançados */
function orcEnv(k,m,ym,cur,sal){var ls=(m.l||[]).filter(function(x){return x.c===k.id}),sp=0;ls.forEach(function(x){sp+=+x.v||0});
  var lim=+k.lim||0,p=lim>0?sp/lim:0,cl=p>1?'bad':p>=.85?'warn':'ok',rest=lim-sp,dim=new Date(+ym.slice(0,4),+ym.slice(5,7),0).getDate(),dl=cur?dim-(+today().slice(8,10))+1:0,i=esc(k.id),
      info=lim>0?(rest>=0?'<b class="'+(cl==='warn'?'warnc':'gain')+'">resta '+brl.format(rest)+'</b>'+(cur&&dl>0&&rest>0?' · dá '+brl.format(rest/dl)+' por dia até o fim do mês':''):'<b class="loss">passou '+brl.format(-rest)+'</b>'):'';
  ls=ls.slice().sort(function(a,b){return a.d<b.d?1:a.d>b.d?-1:0});
  return '<div class="ore"><div class="oreh"><b>'+esc(k.n)+(sal>0&&sp>0?' <small class="muted">'+Math.round(sp/sal*100)+'%</small>':'')+'</b><span class="num">'+brl.format(sp)+(lim>0?' <small class="muted">de '+brl.format(lim)+'</small>':'')+'</span><button type="button" class="orx" data-orcdel="'+i+'" aria-label="Apagar categoria">✕</button></div>'+
    (lim>0?orcBar(p,cl)+'<p class="orm">'+info+'</p>':'')+
    '<div class="orr"><input class="orin orv" id="or-lv-'+i+'" inputmode="decimal" placeholder="R$" autocomplete="off"><input class="orin" id="or-ln-'+i+'" maxlength="30" placeholder="Anotação (opcional)" autocomplete="off"></div>'+
    '<div class="orr"><select class="orin" id="or-lf-'+i+'" aria-label="Forma de pagamento"><option value="">Forma</option>'+Object.keys(ORF).map(function(f){return '<option value="'+f+'">'+ORF[f]+'</option>'}).join('')+'</select><button type="button" class="btn small orgo" data-orl="'+i+'">+ gasto</button></div>'+
    (ls.length?'<details class="ord2" data-ork="'+i+'"'+(ORO[k.id]?' open':'')+'><summary>Ver gastos ('+ls.length+')</summary><ul class="orl">'+ls.map(function(x){return '<li><span>'+fmtDate(x.d).slice(0,5)+(x.n?' · '+esc(x.n):'')+(x.f&&ORF[x.f]?' <small class="muted">'+ORF[x.f]+'</small>':'')+'</span><span class="num">'+brl.format(+x.v||0)+'</span><button type="button" class="orx" data-orld="'+esc(x.id)+'" aria-label="Apagar gasto">✕</button></li>'}).join('')+'</ul></details>':'')+
    '<label class="orlb orlim">Limite do mês'+orcIn('lim:'+k.id,k.lim)+'</label></div>'}
/* ===== Análise: onde o dinheiro vai, no mês e no ano ===== */
/* meses do ano que contam: do início do orçamento até o mês de hoje, mais os futuros que já têm lançamento */
function orcMesesAno(ym){var o=orcO(),y=ym.slice(0,4),t=today().slice(0,7),out=[];for(var i=1;i<=12;i++){var q=y+'-'+('0'+i).slice(-2);if(q<o.inicio)continue;var m=o.m[q],tem=m&&((m.l&&m.l.length)||(m.ex&&m.ex.length)||m.sal!=null||(m.fx&&Object.keys(m.fx).length));if(q<=t||tem)out.push(q)}return out}
function orcAna(ms,trades){var o=orcO(),A={n:ms.length,ent:0,sal:0,ex:0,gas:0,apo:0,fx:0,vr:0,it:{},fm:{}};
  ms.forEach(function(q){var c=orcCalc(q,trades),m=o.m[q]||{};A.ent+=c.ent;A.sal+=c.sal;A.ex+=c.ex;A.gas+=c.gas;A.apo+=c.apo;A.fx+=c.fx;A.vr+=c.vr;
    o.fixos.forEach(function(x){var v=orcFxV(x,m);if(v){var a=A.it['f:'+x.id]||(A.it['f:'+x.id]={n:x.n,v:0,t:'fixo'});a.v+=v}});
    o.cats.forEach(function(k){var v=c.por[k.id]||0;if(v){var a=A.it['v:'+k.id]||(A.it['v:'+k.id]={n:k.n,v:0,t:'variável'});a.v+=v}});
    (m.l||[]).forEach(function(x){var f=x.f||'';A.fm[f]=(A.fm[f]||0)+(+x.v||0)})});
  A.rank=Object.keys(A.it).map(function(k){return A.it[k]}).sort(function(a,b){return b.v-a.v});A.guard=A.ent-A.gas;return A}
/* lucro dos investimentos no ano: o Lucro total de hoje (ou do fim do ano) menos o do fim do ano anterior */
function orcLucroAno(yr){try{var rows=evoData(),T=compute().tot,fim=yr===today().slice(0,4)?T.gain:null,pv=0,ant=rows.filter(function(r){return r.m<yr+'-01'}).pop();if(ant)pv=ant.lucro;
  if(fim==null){var f=rows.filter(function(r){return r.m<=yr+'-12'}).pop();if(!f)return null;fim=f.lucro}return fim-pv}catch(e){return null}}
function orcAnaHtml(){var o=orcO(),ym=ORM,ano=ORE==='ano',yr=ym.slice(0,4),ms=ano?orcMesesAno(ym):[ym],A=orcAna(ms),h='';
  h+='<div class="seg orsw2"><button type="button" data-ore="mes" aria-pressed="'+(!ano)+'">'+esc(orcLabel(ym))+'</button><button type="button" data-ore="ano" aria-pressed="'+ano+'">Acumulado '+yr+'</button></div>';
  if(!A.n||(!A.ent&&!A.gas&&!A.apo))return h+'<section class="panel"><p class="muted" style="margin:0">Ainda sem dados nesse período. Lance o salário e os gastos na aba Mês e a análise aparece aqui.</p></section>';
  var gp=A.ent>0?A.guard/A.ent:null;
  h+='<section class="panel orh"><small class="muted">'+(ano?'Guardado em '+yr:'Guardado no mês')+bal('Tudo que entrou (salário + extras) menos o que você gastou. É o que virou aporte ou ficou parado na conta.')+'</small><b class="num '+cls(A.guard)+'">'+sgn(A.guard)+'</b>'+(gp!=null?'<p class="orm muted" style="margin:0">'+orcP(gp)+' do que entrou</p>':'')+
    '<div class="orn"><div><small>Entrou</small><span class="num">'+brl.format(A.ent)+'</span></div><div><small>Gastou</small><span class="num">'+brl.format(A.gas)+'</span></div><div><small>Aportou</small><span class="num">'+brl.format(A.apo)+'</span></div></div>'+
    (ano&&A.n>1?'<p class="orm muted" style="margin:10px 0 0">Média por mês: gasta <span class="num">'+brl.format(A.gas/A.n)+'</span> · entra <span class="num">'+brl.format(A.ent/A.n)+'</span> ('+A.n+' meses)</p>':'')+'</section>';
  if(!ano){var pv=orcShift(ym,-1);if(pv<ym&&pv>=o.inicio){var pg=orcCalc(pv).gas;if(pg>0&&A.gas>0){var df=A.gas-pg;h+='<p class="orm" style="margin:-4px 4px 12px"><b class="'+(df>0?'loss':'gain')+'">'+(df>0?'+':'−')+brl.format(Math.abs(df))+' ('+(df>0?'+':'−')+orcP(Math.abs(df)/pg)+')</b> nos gastos em relação a '+esc(orcLabel(pv).split(' de ')[0].toLowerCase())+'</p>'}}}
  if(A.gas>0){var top=A.rank[0],mx=top.v;
    h+='<section class="panel"><h2>Onde mais gasto'+bal('Fixos e variáveis juntos, do maior para o menor, em % do total gasto.')+'</h2><p class="orbig"><b>'+esc(top.n)+'</b><br>'+orcP(top.v/A.gas)+' dos gastos · '+brl.format(top.v)+'</p>'+
      A.rank.slice(0,8).map(function(r){return '<div class="orrk"><div class="orrh"><span>'+esc(r.n)+' <small class="muted">'+r.t+'</small></span><span class="num">'+brl.format(r.v)+'</span><b class="num" style="min-width:44px;text-align:right">'+orcP(r.v/A.gas)+'</b></div>'+orcBar(r.v/mx,'ac')+'</div>'}).join('')+
      (A.rank.length>8?'<p class="muted small" style="margin:6px 0 0">e mais '+(A.rank.length-8)+' menores</p>':'')+
      '<p class="orm muted" style="margin:10px 0 0">Fixos <span class="num">'+orcP(A.fx/A.gas)+'</span> · Variáveis <span class="num">'+orcP(A.vr/A.gas)+'</span> dos gastos</p></section>';
    var fk=Object.keys(A.fm).filter(function(k){return A.fm[k]>0}),tf=0;fk.forEach(function(k){tf+=A.fm[k]});
    if(fk.length&&fk.some(function(k){return k!==''})){h+='<section class="panel"><h2>Gastos variáveis por forma de pagamento</h2><ul class="orl">'+fk.sort(function(a,b){return A.fm[b]-A.fm[a]}).map(function(k){return '<li><span>'+(k&&ORF[k]?ORF[k].charAt(0).toUpperCase()+ORF[k].slice(1):'Sem forma')+'</span><span class="num">'+brl.format(A.fm[k])+'</span><b class="num" style="min-width:44px;text-align:right">'+orcP(A.fm[k]/tf)+'</b></li>'}).join('')+'</ul></section>'}}
  if(ano){var lu=orcLucroAno(yr);h+='<section class="panel"><h2>Investimentos em '+yr+bal('Lucro total da carteira (preço, dólar, vendas e proventos, menos taxas) desde 1º de janeiro: o Lucro total de hoje menos o que ele era no fim do ano anterior.')+'</h2><div class="orn"><div><small>Lucro no ano</small><span class="num '+(lu==null?'muted':cls(lu))+'">'+(lu==null?'—':sgn(lu))+'</span></div><div><small>Aportado no ano</small><span class="num">'+brl.format(A.apo)+'</span></div></div></section>'}
  return h}
function renderOrc(){
  var el=$('orctab');if(!el||el.hidden)return;if(el.contains(document.activeElement)&&/INPUT|SELECT/.test(document.activeElement.tagName))return;
  var o=orcO();if(!ORM||ORM<o.inicio)ORM=orcDef();var m=orcMes(ORM),c=orcCalc(ORM),cur=ORM===today().slice(0,7);
  var T=compute().tot,h='<div class="seg orsw"><button type="button" data-orv="mes" aria-pressed="'+(ORV==='mes')+'">Mês</button><button type="button" data-orv="ana" aria-pressed="'+(ORV==='ana')+'">Análise</button></div><div class="orcm"><button type="button" data-orm="-1" aria-label="Mês anterior"'+(ORM<=o.inicio?' disabled':'')+'>‹</button><b>'+esc(orcLabel(ORM))+'</b><button type="button" data-orm="1" aria-label="Próximo mês">›</button></div>';
  if(ORV==='ana'){setHtml(el,h+orcAnaHtml());return}
  h+='<section class="panel orh"><small class="muted">'+(cur?'Sobra do mês até agora':'Sobra do mês')+bal('Entrou (salário + extras) menos o que você gastou (fixos + variáveis) menos o que ainda resta nos envelopes (reservado) menos o que você aportou. É o que realmente fica livre.')+'</small><b class="num '+cls(c.sobra)+'">'+sgn(c.sobra)+'</b>'+
    '<div class="orn"><div><small>Entrou</small><span class="num">'+brl.format(c.ent)+'</span></div><div><small>Gastou</small><span class="num">'+brl.format(c.gas)+'</span></div>'+(c.res>0?'<div><small>Reservado</small><span class="num">'+brl.format(c.res)+'</span></div>':'')+'<div><small>Aportou</small><span class="num">'+brl.format(c.apo)+'</span></div></div></section>';
  h+=orcPanel(c);
  var gp=c.meta>0?c.gas/c.meta:0,gc=gp>1?'bad':gp>=.85?'warn':'ok';
  h+='<section class="panel"><h2>Meta de gasto'+bal('O quanto você quer gastar no máximo por mês (fixos + variáveis). Verde: dentro; amarelo: perto do limite (85%); vermelho: passou.')+'</h2>'+
    (c.meta>0?orcBar(gp,gc)+'<p class="orm"><span class="num">'+brl.format(c.gas)+'</span> de <span class="num">'+brl.format(c.meta)+'</span> · '+(c.gas>c.meta?'<b class="loss">passou '+brl.format(c.gas-c.meta)+'</b>':'<b class="'+(gc==='warn'?'warnc':'gain')+'">resta '+brl.format(c.meta-c.gas)+'</b>')+'</p>':'')+
    '<label class="orlb">Meta por mês'+orcIn('meta',o.meta)+'</label></section>';
  h+='<section class="panel"><h2>Receitas</h2><label class="orlb">Salário previsto (todo mês)'+orcIn('sal',o.sal)+'</label>'+
    '<label class="orlb">Salário que caiu em '+esc(orcLabel(ORM).split(' de ')[0].toLowerCase())+bal('Deixe vazio para usar o previsto. Se vier menos (ou mais), digite o valor real: o mês se ajusta.')+orcIn('salrec',m.sal,o.sal?String(o.sal).replace('.',','):'igual ao previsto')+'</label>'+
    '<p class="orsub">Extras do mês'+bal('Dinheiro que entrou além do salário: bônus, venda de algo, freela, presente. Entra na conta do mês.')+'</p>'+orcList('ex',m.ex)+orcAdd('ex','De onde veio')+'</section>';
  h+='<section class="panel"><h2>Gastos fixos'+bal('Aluguel, contas, parcelas... Você cadastra uma vez e eles contam em todos os meses. O número cinza do campo é o valor normal. Se este mês veio diferente (ex.: consórcio), digite o valor real: só este mês muda.')+' <span class="num muted" style="margin-left:auto">'+brl.format(c.fx)+'</span></h2>'+orcFxList(o,m,c.sal)+orcAdd('fx','Ex.: aluguel')+'</section>';
  h+='<section class="panel"><h2>Envelopes (gastos variáveis)'+bal('Separe um limite para cada categoria e lance cada gasto (débito, crédito, Pix...). O envelope mostra quanto resta e quanto dá para gastar por dia. A forma de pagamento é só uma etiqueta: o gasto conta no dia em que você fez.')+'</h2>'+
    (c.lims>0?'<p class="orm muted">Limites somam <span class="num">'+brl.format(c.lims)+'</span>'+(c.pLim!=null?' · '+orcP(c.pLim)+' do salário':'')+'</p>':'')+
    o.cats.map(function(k){return orcEnv(k,m,ORM,cur,c.sal)}).join('')+
    '<p class="orsub">Nova categoria</p><div class="orr"><input class="orin" id="or-cat-n" maxlength="24" placeholder="Ex.: Pets" autocomplete="off"><input class="orin orv" id="or-cat-v" inputmode="decimal" placeholder="Limite" autocomplete="off"><button type="button" class="btn small" data-oradd="cat">+</button></div></section>';
  var ap=c.apoPl>0?c.apo/c.apoPl:0;
  h+='<section class="panel"><h2>Aporte do mês'+bal('Planejado é o quanto você quer aportar por mês. Aportado é o que o app já viu de compras (ações e renda fixa) neste mês. Livre é o que entrou menos o que você gastou: o máximo que dá para aportar.')+'</h2>'+
    (c.apoPl>0?orcBar(ap,ap>=1?'ok':'warn'):'')+'<div class="orn"><div><small>Planejado</small><span class="num">'+(c.apoPl>0?brl.format(c.apoPl):'—')+'</span></div><div><small>Aportado</small><span class="num">'+brl.format(c.apo)+'</span></div><div><small>Livre</small><span class="num '+cls(c.livre)+'">'+sgn(c.livre)+'</span></div></div>'+
    '<label class="orlb">Aporte planejado por mês'+orcIn('apo',o.apo)+'</label></section>';
  var ct=+o.conta||0;
  h+='<section class="panel"><h2>Dinheiro na conta'+bal('Saldo parado na conta, fora dos investimentos. Fica só aqui: não entra no Patrimônio do Início.')+'</h2><label class="orlb">Saldo hoje'+orcIn('conta',o.conta)+'</label>'+
    '<p class="orm muted">Investimentos + conta: <span class="num">'+brl.format(T.value+T.cash+ct)+'</span></p></section>';
  setHtml(el,h)}
function orcField(f,raw){var o=orcO(),m=orcMes(ORM),v=parseNum(raw);
  if(f==='salrec'){m.sal=isFinite(v)?v:null}
  else if(f.indexOf('fx:')===0){var id=f.slice(3);if(isFinite(v))m.fx[id]=v;else delete m.fx[id]}
  else if(f.indexOf('lim:')===0){var k=o.cats.filter(function(x){return x.id===f.slice(4)})[0];if(!k)return;k.lim=isFinite(v)&&v>0?v:0}
  else if(f==='sal'||f==='meta'||f==='apo'||f==='conta'){o[f]=isFinite(v)?v:0}else return;
  orcSave()}
document.addEventListener('change',function(e){var t=e.target;if(!t||!t.getAttribute)return;var f=t.getAttribute('data-orf');if(!f)return;orcField(f,t.value);if(t.blur)t.blur();renderOrc()});
document.addEventListener('toggle',function(e){var t=e.target;if(t&&t.getAttribute&&t.getAttribute('data-ork')){var id=t.getAttribute('data-ork');if(t.open)ORO[id]=1;else delete ORO[id]}},true);
document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('[data-orv],[data-ore],[data-orm],[data-ordel],[data-oradd],[data-orl],[data-orld],[data-orcdel]'):null;if(!t)return;
  if(t.hasAttribute('data-orv')){ORV=t.getAttribute('data-orv');renderOrc();return}
  if(t.hasAttribute('data-ore')){ORE=t.getAttribute('data-ore');renderOrc();return}
  if(t.hasAttribute('data-orm')){ORM=orcShift(ORM||orcDef(),+t.getAttribute('data-orm'));renderOrc();return}
  var ym=ORM||orcDef(),o=orcO(),m=orcMes(ym);
  if(t.hasAttribute('data-ordel')){var p=t.getAttribute('data-ordel').split(':'),id=p[1];if(p[0]==='fx'){o.fixos=o.fixos.filter(function(x){return x.id!==id});Object.keys(o.m).forEach(function(k){if(o.m[k]&&o.m[k].fx)delete o.m[k].fx[id]})}else m.ex=m.ex.filter(function(x){return x.id!==id});orcSave();renderOrc();return}
  if(t.hasAttribute('data-orl')){var ci=t.getAttribute('data-orl'),lv=parseNum(($('or-lv-'+ci)||{}).value);if(!isFinite(lv)||lv<=0)return;
    m.l.push({id:orcId(),c:ci,v:lv,n:((($('or-ln-'+ci)||{}).value)||'').trim().slice(0,30),d:ym===today().slice(0,7)?today():ym+'-01',f:(($('or-lf-'+ci)||{}).value)||''});orcSave();ORO[ci]=1;renderOrc();return}
  if(t.hasAttribute('data-orld')){var li=t.getAttribute('data-orld');m.l=m.l.filter(function(x){return x.id!==li});orcSave();renderOrc();return}
  if(t.hasAttribute('data-orcdel')){var cd=t.getAttribute('data-orcdel'),k=o.cats.filter(function(x){return x.id===cd})[0],n=0;if(!k)return;Object.keys(o.m).forEach(function(q){n+=(o.m[q].l||[]).filter(function(x){return x.c===cd}).length});
    if(n&&!confirm('Apagar "'+k.n+'" e os '+n+' gasto'+(n>1?'s':'')+' lançado'+(n>1?'s':'')+' nela?'))return;
    o.cats=o.cats.filter(function(x){return x.id!==cd});Object.keys(o.m).forEach(function(q){o.m[q].l=(o.m[q].l||[]).filter(function(x){return x.c!==cd})});orcSave();renderOrc();return}
  var kd=t.getAttribute('data-oradd'),n2=(($('or-'+kd+'-n')||{}).value||'').trim(),v=parseNum(($('or-'+kd+'-v')||{}).value);
  if(kd==='cat'){if(!n2)return;o.cats.push({id:orcId(),n:n2.slice(0,24),lim:isFinite(v)&&v>0?v:0});orcSave();renderOrc();return}
  if(!isFinite(v)||v<=0)return;m.ex.push({id:orcId(),n:n2.slice(0,30),v:v});orcSave();renderOrc()});
