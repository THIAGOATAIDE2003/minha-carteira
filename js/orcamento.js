/* Orçamento (piloto 1.47.0): Mais > Orçamento. Salário, extras, gastos fixos e variáveis, meta de gasto, aporte do mês e dinheiro parado na conta.
   Dados em S.orc (sincronizado como cfg 'orc' no repositório privado). Não mexe em compute(): o "aportado" vem das compras do próprio mês
   e o dinheiro da conta fica só aqui (não entra no Patrimônio do Início). Tudo manual; os gastos fixos se repetem sozinhos todo mês.
   S.orc = {sal, meta, apo, conta, fixos:[{id,n,v}], m:{'AAAA-MM':{sal (recebido, null = usa o previsto), ex:[{id,n,v}], g:{categoria:valor}, fx:{idDoFixo:valor deste mês}}}} */
var ORM='',ORCATS=['Mercado','Transporte','Lazer','Saúde','Outros'];
function orcO(){if(!S.orc||typeof S.orc!=='object')S.orc={sal:0,meta:0,apo:0,conta:0,fixos:[],m:{}};var o=S.orc;if(!Array.isArray(o.fixos))o.fixos=[];if(!o.m||typeof o.m!=='object')o.m={};return o}
function orcMes(ym){var o=orcO(),m=o.m[ym];if(!m)m=o.m[ym]={sal:null,ex:[],g:{},fx:{}};if(!Array.isArray(m.ex))m.ex=[];if(!m.g||typeof m.g!=='object')m.g={};if(!m.fx||typeof m.fx!=='object')m.fx={};return m}
function orcSave(){S.pend=S.pend||[];S.pend.push({t:'cfg',k:'orc',v:S.orc});save();try{ghSync()}catch(e){}}
function orcId(){return 'o'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)}
/* quanto você realmente aportou no mês: compras de ações (com taxas, EUA pelo dólar da compra) e renda fixa */
function orcAportado(ym,trades){var s=0;(trades||S.trades||[]).forEach(function(t){if(!t.date||t.date.slice(0,7)!==ym)return;
  if(t.side==='buy')s+=t.qty*ePx(t)*(t.market==='US'?(t.fx||0):1);else if(t.side==='rf')s+=t.price||0});return s}
function orcCalc(ym,trades){var o=orcO(),m=o.m[ym]||{sal:null,ex:[],g:{},fx:{}},prev=+o.sal||0,sal=m.sal!=null?+m.sal:prev,ex=0,fx=0,vr=0;
  (m.ex||[]).forEach(function(x){ex+=+x.v||0});o.fixos.forEach(function(x){fx+=orcFxV(x,m)});Object.keys(m.g||{}).forEach(function(k){vr+=+m.g[k]||0});
  var ent=sal+ex,gas=fx+vr,apo=orcAportado(ym,trades),pc=function(v){return sal>0?v/sal:null};
  return {pFx:pc(fx),pVr:pc(vr),pApo:pc(apo),pGas:pc(gas),pSobra:pc(sal-gas-apo),prev:prev,sal:sal,recebido:m.sal!=null,ex:ex,ent:ent,fx:fx,vr:vr,gas:gas,apo:apo,sobra:ent-gas-apo,livre:ent-gas,meta:+o.meta||0,apoPl:+o.apo||0}}
/* valor de um fixo no mês: o que você digitou para aquele mês, senão o valor normal */
function orcFxV(x,m){var ov=m&&m.fx&&m.fx[x.id];return ov!=null&&isFinite(ov)?+ov:(+x.v||0)}
function orcP(v){return v==null?'':Math.round(v*100)+'%'}
function orcLabel(ym){var d=new Date(+ym.slice(0,4),+ym.slice(5,7)-1,1),t=d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});return t.charAt(0).toUpperCase()+t.slice(1)}
function orcShift(ym,n){var d=new Date(+ym.slice(0,4),+ym.slice(5,7)-1+n,1);return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)}
function orcBar(p,cls){return '<div class="orb"><i class="'+cls+'" style="width:'+Math.max(2,Math.min(100,p*100)).toFixed(0)+'%"></i></div>'}
function orcIn(f,v,ph){return '<input class="orin" inputmode="decimal" data-orf="'+f+'" value="'+(v!=null&&v!==''&&isFinite(v)&&+v!==0?String(+(+v).toFixed(2)).replace('.',','):'')+'" placeholder="'+esc(ph||'0,00')+'" autocomplete="off">'}
function orcList(kind,arr){return arr.length?'<ul class="orl">'+arr.map(function(x){return '<li><span>'+esc(x.n||'—')+'</span><span class="num">'+brl.format(+x.v||0)+'</span><button type="button" class="orx" data-ordel="'+kind+':'+esc(x.id)+'" aria-label="Apagar">✕</button></li>'}).join('')+'</ul>':''}
function orcFxList(o,m,sal){return o.fixos.length?'<ul class="orl">'+o.fixos.map(function(x){var ov=m.fx&&m.fx[x.id],v=orcFxV(x,m);
  return '<li><span>'+esc(x.n||'—')+(sal>0?' <small class="muted">'+Math.round(v/sal*100)+'%</small>':'')+'</span><input class="orin orm2" inputmode="decimal" data-orf="fx:'+esc(x.id)+'" value="'+(ov!=null&&isFinite(ov)?String(+(+ov).toFixed(2)).replace('.',','):'')+'" placeholder="'+esc(String(+(+x.v||0).toFixed(2)).replace('.',','))+'" autocomplete="off"><button type="button" class="orx" data-ordel="fx:'+esc(x.id)+'" aria-label="Apagar">✕</button></li>'}).join('')+'</ul>':''}
function orcPanel(c){if(!(c.sal>0))return '';var tot=c.gas+c.apo,d=Math.max(c.sal,tot),w=function(v){return Math.max(0,v/d*100).toFixed(1)},sb=c.sal-tot,
  rows=[['fx','Gastos fixos',c.fx,c.pFx],['vr','Gastos variáveis',c.vr,c.pVr],['ap','Aporte',c.apo,c.pApo],['sb',sb<0?'Passou do salário':'Sobra do salário',sb,c.pSobra]];
  return '<section class="panel"><h2>Para onde vai o salário'+bal('Tudo em % do salário do mês (o que caiu, ou o previsto). Extras não entram na conta. Gastos = fixos + variáveis.')+'</h2><p class="orbig"><b class="num '+(c.pGas>1?'loss':'')+'">'+orcP(c.pGas)+'</b> vai em gastos</p>'+
    '<div class="orsk"><i class="fx" style="width:'+w(c.fx)+'%"></i><i class="vr" style="width:'+w(c.vr)+'%"></i><i class="ap" style="width:'+w(c.apo)+'%"></i>'+(sb>0?'<i class="sb" style="width:'+w(sb)+'%"></i>':'')+'</div>'+
    '<ul class="orl">'+rows.map(function(r){return '<li><span><i class="ord '+r[0]+'"></i>'+r[1]+'</span><span class="num">'+brl.format(Math.abs(r[2]))+'</span><b class="num'+(r[0]==='sb'?' '+cls(r[2]):'')+'" style="min-width:48px;text-align:right">'+(r[0]==='sb'&&r[2]<0?'−':'')+orcP(Math.abs(r[3]))+'</b></li>'}).join('')+'</ul></section>'}
function orcAdd(kind,ph){return '<div class="orr"><input class="orin" id="or-'+kind+'-n" maxlength="30" placeholder="'+esc(ph)+'" autocomplete="off"><input class="orin orv" id="or-'+kind+'-v" inputmode="decimal" placeholder="R$" autocomplete="off"><button type="button" class="btn small" data-oradd="'+kind+'">+</button></div>'}
function renderOrc(){
  var el=$('orctab');if(!el||el.hidden)return;if(el.contains(document.activeElement)&&/INPUT/.test(document.activeElement.tagName))return;
  if(!ORM)ORM=today().slice(0,7);var o=orcO(),m=orcMes(ORM),c=orcCalc(ORM),cur=ORM===today().slice(0,7),mk=function(n){return n};
  var T=compute().tot,h='<div class="orcm"><button type="button" data-orm="-1" aria-label="Mês anterior">‹</button><b>'+esc(orcLabel(ORM))+'</b><button type="button" data-orm="1" aria-label="Próximo mês">›</button></div>';
  h+='<section class="panel orh"><small class="muted">'+(cur?'Sobra do mês até agora':'Sobra do mês')+bal('Entrou (salário + extras) menos o que você gastou (fixos + variáveis) menos o que você aportou. É o que fica parado na conta.')+'</small><b class="num '+cls(c.sobra)+'">'+sgn(c.sobra)+'</b>'+
    '<div class="orn"><div><small>Entrou</small><span class="num">'+brl.format(c.ent)+'</span></div><div><small>Gastou</small><span class="num">'+brl.format(c.gas)+'</span></div><div><small>Aportou</small><span class="num">'+brl.format(c.apo)+'</span></div></div></section>';
  h+=orcPanel(c);
  var gp=c.meta>0?c.gas/c.meta:0,gc=gp>1?'bad':gp>=.85?'warn':'ok';
  h+='<section class="panel"><h2>Meta de gasto'+bal('O quanto você quer gastar no máximo por mês (fixos + variáveis). Verde: dentro; amarelo: perto do limite (85%); vermelho: passou.')+'</h2>'+
    (c.meta>0?orcBar(gp,gc)+'<p class="orm"><span class="num">'+brl.format(c.gas)+'</span> de <span class="num">'+brl.format(c.meta)+'</span> · '+(c.gas>c.meta?'<b class="loss">passou '+brl.format(c.gas-c.meta)+'</b>':'<b class="'+(gc==='warn'?'warnc':'gain')+'">resta '+brl.format(c.meta-c.gas)+'</b>')+'</p>':'')+
    '<label class="orlb">Meta por mês'+orcIn('meta',o.meta)+'</label></section>';
  h+='<section class="panel"><h2>Receitas</h2><label class="orlb">Salário previsto (todo mês)'+orcIn('sal',o.sal)+'</label>'+
    '<label class="orlb">Salário que caiu em '+esc(orcLabel(ORM).split(' de ')[0].toLowerCase())+bal('Deixe vazio para usar o previsto. Se vier menos (ou mais), digite o valor real: o mês se ajusta.')+orcIn('salrec',m.sal,o.sal?String(o.sal).replace('.',','):'igual ao previsto')+'</label>'+
    '<p class="orsub">Extras do mês'+bal('Dinheiro que entrou além do salário: bônus, venda de algo, freela, presente. Entra na conta do mês.')+'</p>'+orcList('ex',m.ex)+orcAdd('ex','De onde veio')+'</section>';
  h+='<section class="panel"><h2>Gastos</h2><p class="orsub">Fixos (repetem todo mês)'+bal('Aluguel, contas, parcelas... Você cadastra uma vez e eles contam em todos os meses. O número cinza do campo é o valor normal. Se este mês veio diferente (ex.: consórcio), digite o valor real: só este mês muda.')+' <span class="num muted">'+brl.format(c.fx)+'</span></p>'+orcFxList(o,m,c.sal)+orcAdd('fx','Ex.: aluguel')+
    '<p class="orsub">Variáveis deste mês <span class="num muted">'+brl.format(c.vr)+'</span></p>'+ORCATS.map(function(k){return '<label class="orlb"><span>'+esc(k)+(c.sal>0&&m.g[k]>0?' <small class="muted">'+Math.round(m.g[k]/c.sal*100)+'%</small>':'')+'</span>'+orcIn('g:'+k,m.g[k])+'</label>'}).join('')+'</section>';
  var ap=c.apoPl>0?c.apo/c.apoPl:0;
  h+='<section class="panel"><h2>Aporte do mês'+bal('Planejado é o quanto você quer aportar por mês. Aportado é o que o app já viu de compras (ações e renda fixa) neste mês. Livre é o que entrou menos o que você gastou: o máximo que dá para aportar.')+'</h2>'+
    (c.apoPl>0?orcBar(ap,ap>=1?'ok':'warn'):'')+'<div class="orn"><div><small>Planejado</small><span class="num">'+(c.apoPl>0?brl.format(c.apoPl):'—')+'</span></div><div><small>Aportado</small><span class="num">'+brl.format(c.apo)+'</span></div><div><small>Livre</small><span class="num '+cls(c.livre)+'">'+sgn(c.livre)+'</span></div></div>'+
    '<label class="orlb">Aporte planejado por mês'+orcIn('apo',o.apo)+'</label></section>';
  var ct=+o.conta||0;
  h+='<section class="panel"><h2>Dinheiro na conta'+bal('Saldo parado na conta, fora dos investimentos. Fica só aqui: não entra no Patrimônio do Início.')+'</h2><label class="orlb">Saldo hoje'+orcIn('conta',o.conta)+'</label>'+
    '<p class="orm muted">Investimentos + conta: <span class="num">'+brl.format(T.value+T.cash+ct)+'</span></p></section>';
  setHtml(el,h)}
function orcField(f,raw){var o=orcO(),m=orcMes(ORM),v=parseNum(raw);
  if(f==='salrec'){m.sal=isFinite(v)?v:null}else if(f.indexOf('g:')===0){var k=f.slice(2);if(isFinite(v)&&v!==0)m.g[k]=v;else delete m.g[k]}
  else if(f.indexOf('fx:')===0){var id=f.slice(3);if(isFinite(v))m.fx[id]=v;else delete m.fx[id]}
  else if(f==='sal'||f==='meta'||f==='apo'||f==='conta'){o[f]=isFinite(v)?v:0}else return;
  orcSave()}
document.addEventListener('change',function(e){var t=e.target;if(!t||!t.getAttribute)return;var f=t.getAttribute('data-orf');if(!f)return;orcField(f,t.value);if(t.blur)t.blur();renderOrc()});
document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('[data-orm],[data-ordel],[data-oradd]'):null;if(!t)return;
  if(t.hasAttribute('data-orm')){ORM=orcShift(ORM||today().slice(0,7),+t.getAttribute('data-orm'));renderOrc();return}
  var o=orcO(),m=orcMes(ORM||today().slice(0,7));
  if(t.hasAttribute('data-ordel')){var p=t.getAttribute('data-ordel').split(':'),id=p[1];if(p[0]==='fx'){o.fixos=o.fixos.filter(function(x){return x.id!==id});Object.keys(o.m).forEach(function(k){if(o.m[k]&&o.m[k].fx)delete o.m[k].fx[id]})}else m.ex=m.ex.filter(function(x){return x.id!==id});orcSave();renderOrc();return}
  var kd=t.getAttribute('data-oradd'),n=($('or-'+kd+'-n')||{}).value||'',v=parseNum(($('or-'+kd+'-v')||{}).value);if(!isFinite(v)||v<=0)return;
  var it={id:orcId(),n:n.trim().slice(0,30),v:v};if(kd==='fx')o.fixos.push(it);else m.ex.push(it);orcSave();renderOrc()});
