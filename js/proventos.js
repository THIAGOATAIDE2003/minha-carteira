/* Aporte · js/proventos.js — aba Proventos: cartões, evolução, por ativo e lista.
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
var DVY=null,MESES=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],MESL=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
var hm=function(t){return new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})};
var DVV='mes';
/* ===== Proventos (estilo Investidor10): cartões, evolução, por ativo, meus proventos ===== */
var PVD={ep:'12',ex:'m',et:'all',ea:'all',ap:'12',ag:'tk',lp:'',lt:'all',la:'all',more:0};
var PV=(function(){var o={};try{o=JSON.parse(localStorage.getItem(LS+'-pv')||'null')||{};if(typeof o!=='object'||Array.isArray(o))o={}}catch(e){o={}}for(var k in PVD)if(!(k in o))o[k]=PVD[k];return o})();
var PCI=0,PVS=null,PVLY=null;
function pvSave(){try{localStorage.setItem(LS+'-pv',JSON.stringify(PV))}catch(e){}}
function pvMatch(t){var k=t.ticker+'|',best=null;
  if(PVX[k+t.date])return PVX[k+t.date];
  Object.keys(PVX).forEach(function(x){if(x.indexOf(k)!==0)return;var u=PVX[x];if(!u.pay||Math.abs(dayDiff(u.pay,t.date))>5)return;if(Math.abs(u.val-t.price)<=Math.max(0.1,t.price*0.1))best=u});return best}
function pvItems(){
  var out=[];
  S.trades.forEach(function(t){if(t.side!=='div')return;var us=t.market==='US',fx=us?(t.fx||1):1,m=t.pq?{q:t.pq,r:t.pr,dc:''}:(us?null:pvMatch(t));
    var br=us?(t.bruto?t.bruto*fx:null):(m?m.q*m.r:null);
    out.push({tk:t.ticker,us:us,tipo:t.tipo||'Dividendo',dc:m&&m.dc||'',pay:t.date,q:m?m.q:null,r:m?m.r:null,br:br,liq:t.price*fx,st:'rec'})});
  DV.up.forEach(function(u){var f=u.us&&u.usd?u.val/u.usd:1;out.push({tk:u.tk,us:!!u.us,tipo:u.tipo,dc:u.dc||'',pay:u.pay||'',q:u.q,r:u.r||null,br:u.us?(u.brU?u.brU*f:null):(u.br||null),liq:u.val,st:u.pay?'up':'def'})});
  return out;
}
function mAdd(m,k){var y=+m.slice(0,4),mo=+m.slice(5,7)-1+k;y+=Math.floor(mo/12);mo=((mo%12)+12)%12;return y+'-'+(mo<9?'0':'')+(mo+1)}
function pvTipoOk(it,t,a){return (t==='all'||(t==='US')===it.us)&&(a==='all'||it.tk===a)}
var PVPN={'12':'Últimos 12 meses',ano:'Ano atual','5a':'Últimos 5 anos',all:'Desde o início'};
var PVLN={ano:'Ano atual','30':'Últimos 30 dias','12':'Últimos 12 meses','5a':'Últimos 5 anos',mes:'Mês atual',prox:'Próximo mês',fut:'Futuros',rec:'Recebidos',all:'Todos'};
function pvIn(it,p){var td=today(),d=it.pay,cm=td.slice(0,7);
  if(p==='fut')return it.st!=='rec';if(p==='rec')return it.st==='rec';if(p==='all')return true;
  if(!d)return false;
  if(p.indexOf('m:')===0)return d.slice(0,7)===p.slice(2);
  if(p==='ano')return d.slice(0,4)===td.slice(0,4);if(p==='mes')return d.slice(0,7)===cm;if(p==='prox')return d.slice(0,7)===mAdd(cm,1);
  var back={'30':30,'12':365,'5a':1826}[p];if(back)return d<=td&&dayDiff(d,td)<=back;return true}
function pvLblP(p){return p.indexOf('m:')===0?MESL[+p.slice(7,9)-1].replace(/^./,function(c){return c.toUpperCase()})+' de '+p.slice(2,6):PVLN[p]||p}
var PVIC={tot:'<svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></svg>',
  usd:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2"/></svg>',
  cal:'<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
  clk:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'};
function pvCards(items){
  var td=today(),cm=td.slice(0,7),rec=items.filter(function(i){return i.st==='rec'}),fut=items.filter(function(i){return i.st!=='rec'});
  var sm=function(a){return a.reduce(function(s,i){return s+i.liq},0)};
  var d0=S.trades.map(function(t){return t.date}).sort()[0]||td,y1=new Date(Date.now()-365*864e5).toISOString().slice(0,10),from=d0>y1?d0:y1;
  var r12=sm(rec.filter(function(i){return i.pay>=y1})),nM=Math.max(1,Math.min(12,Math.round(dayDiff(from,td)/30.44))),med=r12/nM;
  var mes=sm(rec.filter(function(i){return i.pay.slice(0,7)===cm})),mesF=sm(fut.filter(function(i){return i.pay&&i.pay.slice(0,7)===cm}));
  var nx=fut.filter(function(i){return i.pay}).sort(function(a,b){return a.pay<b.pay?-1:1})[0],nDef=fut.filter(function(i){return !i.pay}).length;
  var tUS=sm(rec.filter(function(i){return i.us})),meta=S.metas&&S.metas.renda&&S.metas.renda.valor>0?S.metas.renda.valor:0;
  var card=function(ic,tit,info,main,sub){return '<div class="hc"><div class="hct"><span class="hci">'+ic+'</span><span>'+tit+'</span>'+bal(info)+'</div>'+main+'<div class="hcs">'+sub+'</div></div>'};
  var big=function(v,c){return '<div class="hcm"><b class="num'+(c?' '+c:'')+'">'+brl.format(v)+'</b></div>'};
  var ring='';if(meta){var f=Math.min(1,med/meta),C=2*Math.PI*20;ring='<svg class="pvring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20"/><circle class="f" cx="24" cy="24" r="20" stroke-dasharray="'+(f*C).toFixed(1)+' '+C.toFixed(1)+'" transform="rotate(-90 24 24)"/><text x="24" y="28">'+Math.round(f*100)+'%</text></svg>'}
  var cards=[
    card(PVIC.tot,'Total de proventos recebidos','Tudo que já caiu na conta desde a primeira compra, líquido de IR. O VT entra em reais pelo dólar do dia em que pagou.',big(sum0(rec)),'<div><small>Brasil</small><span class="num">'+brl.format(sum0(rec)-tUS)+'</span></div>'+(tUS?'<div><small>VT</small><span class="num">'+brl.format(tUS)+'</span></div>':'')+'<div><small>Pagamentos</small><span class="num">'+rec.length+'</span></div>'),
    card(PVIC.usd,'Recebidos (12 meses)','Proventos que caíram na conta nos últimos 12 meses.',big(r12),'<div><small>Média por mês</small><span class="num">'+brl.format(med)+'</span></div>'),
    card(PVIC.cal,'Recebidos este mês','Proventos que já caíram em '+MESL[+cm.slice(5,7)-1]+'. A receber são os anunciados com pagamento ainda neste mês.',big(mes),'<div><small>A receber este mês</small><span class="num">'+brl.format(mesF)+'</span></div>'),
    card(PVIC.clk,'Proventos provisionados','Já anunciados pelas empresas e garantidos para você, porque tinha a ação na data-com, mesmo que já tenha vendido depois. Ainda não caíram na conta.',big(sm(fut),'pvb'),(nx?'<div><small>Próximo</small><span class="num">'+esc(nx.tk)+' em '+fmtDate(nx.pay)+'</span></div>':'')+(nDef?'<div><small>Sem data</small><span class="num">'+nDef+'</span></div>':'')),
    card(meta?'<b class="pvpct">'+Math.round(Math.min(1,med/meta)*100)+'%</b>':PVIC.usd,'Média mensal ('+(nM<12?nM+(nM>1?' meses':' mês'):'últ. 12 meses')+')','Quanto você recebe por mês em média'+(nM<12?', desde a primeira compra':' nos últimos 12 meses')+'.'+(meta?' A porcentagem é quanto isso já cobre da sua meta de renda.':' Defina uma meta de renda em Início → Metas para ver o progresso.'),
      '<div class="hcm pvmm">'+ring+'<b class="num">'+brl.format(med)+'</b></div>',meta?'<div><small>Meta de renda</small><span class="num">'+brl.format(meta)+' por mês</span></div>':'<div><small>Meta de renda</small><span>não definida</span></div>')];
  return '<div class="hcw"><div class="hcards" id="pcards">'+cards.join('')+'</div><div class="hdots">'+cards.map(function(c,i){return '<i data-pci="'+i+'"'+(i===PCI?' class="on"':'')+'></i>'}).join('')+'</div></div>';
}
function sum0(a){return a.reduce(function(s,i){return s+i.liq},0)}
function pvEvo(items){
  var td=today(),cm=td.slice(0,7),its=items.filter(function(i){return i.pay&&pvTipoOk(i,PV.et,PV.ea)});
  var lastF=its.filter(function(i){return i.st!=='rec'}).map(function(i){return i.pay.slice(0,7)}).sort().pop()||cm;
  var end=lastF>cm?(lastF>mAdd(cm,6)?mAdd(cm,6):lastF):cm,st;
  if(PV.ep==='ano'){st=td.slice(0,4)+'-01';if(end<td.slice(0,4)+'-12')end=td.slice(0,4)+'-12'}else if(PV.ep==='12')st=mAdd(cm,-11);else if(PV.ep==='5a')st=mAdd(cm,-59);else st=(its.map(function(i){return i.pay.slice(0,7)}).sort()[0])||cm;
  var keys=[],an=PV.ex==='a';
  if(an){for(var y=+st.slice(0,4);y<=+end.slice(0,4);y++)keys.push(String(y))}else{for(var m=st;m<=end;m=mAdd(m,1))keys.push(m)}
  var slot={};keys.forEach(function(k){slot[k]={r:0,p:0,tr:{},tp:{}}});
  its.forEach(function(i){var k=an?i.pay.slice(0,4):i.pay.slice(0,7);var o=slot[k];if(!o||i.pay.slice(0,7)<st||i.pay.slice(0,7)>end)return;if(i.st==='rec'){o.r+=i.liq;o.tr[i.tk]=(o.tr[i.tk]||0)+i.liq}else{o.p+=i.liq;o.tp[i.tk]=(o.tp[i.tk]||0)+i.liq}});
  while(keys.length>1&&!slot[keys[0]].r&&!slot[keys[0]].p)keys.shift();
  var n=keys.length,P=keys.map(function(k){return slot[k]}),tr=0,tp=0;P.forEach(function(o){tr+=o.r;tp+=o.p});
  var lbl=function(k){return an?k:k.slice(5,7)+'/'+k.slice(0,4)};
  var hi=Math.max.apply(null,P.map(function(o){return o.r+o.p}))||1,stp=niceStep(hi/4||1),top=Math.ceil(hi/stp)*stp;
  var H=220,PT=10,PB=48,ph=H-PT-PB,yv=function(v){return PT+(top-v)/top*ph},W=300,bw=W/n,grid='',ax='',bars='',xl='';
  for(var v=0;v<=top+1e-6;v+=stp){var yy=yv(v).toFixed(1);grid+='<line x1="0" x2="'+W+'" y1="'+yy+'" y2="'+yy+'" stroke="var(--line)" stroke-width="1"/>';ax+='<text x="54" y="'+(+yy+4)+'" text-anchor="end">'+kfmt(v)+'</text>'}
  var ev=Math.max(1,Math.ceil(n/6));
  P.forEach(function(o,i){var w=Math.min(bw*.66,34),x=i*bw+(bw-w)/2;
    bars+='<g data-slot="'+i+'"><rect x="'+x.toFixed(1)+'" y="'+PT+'" width="'+w.toFixed(1)+'" height="'+ph+'" fill="transparent"/>'+(o.r?'<rect x="'+x.toFixed(1)+'" y="'+yv(o.r).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(1,yv(0)-yv(o.r)).toFixed(1)+'" rx="3" fill="var(--c1)"/>':'')+
      (o.p?'<rect x="'+x.toFixed(1)+'" y="'+yv(o.r+o.p).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(1,yv(o.r)-yv(o.r+o.p)).toFixed(1)+'" rx="3" fill="var(--c1)" fill-opacity=".38"/>':'')+'</g>';
    if(i%ev===0)xl+='<span style="left:'+((i*bw+bw/2)/W*100).toFixed(2)+'%;top:'+(H-PB+6)+'px">'+lbl(keys[i])+'</span>'});
  var light='color-mix(in srgb,var(--c1) 40%,transparent)';
  var tip={n:n,pts:P.map(function(o,i){var rr=[[light,'A receber',brl.format(o.p)]];Object.keys(o.tp).sort(function(a,b){return o.tp[b]-o.tp[a]}).forEach(function(tk){rr.push(['','  '+tk,brl.format(o.tp[tk])])});
    rr.push(['var(--c1)','Recebidos',brl.format(o.r)]);Object.keys(o.tr).sort(function(a,b){return o.tr[b]-o.tr[a]}).forEach(function(tk){rr.push(['','  '+tk,brl.format(o.tr[tk])])});return {i:i,t:lbl(keys[i]),r:rr}})};
  var flt=(PV.et!=='all'?(PV.et==='US'?'ETFs Intern.':'Ações'):'')+(PV.ea!=='all'?(PV.et!=='all'?' · ':'')+PV.ea:'');
  var h='<div class="panel evp"><h2>Evolução de proventos</h2><div class="pvbt"><button type="button" class="evfbtn" data-pvo="pvsheet">'+PVIC.cal+'<span>'+PVPN[PV.ep]+'</span><i>▾</i></button><button type="button" class="evfbtn" data-pvo="pvsheet"><svg viewBox="0 0 24 24"><path d="M4 7h16M7 12h10M10 17h4"/></svg><span>'+(flt?esc(flt):'Filtros')+'</span><i>▾</i></button></div>'+
    '<div class="dvleg evlg pvlg"><span class="r">Recebidos</span><span class="p">A receber</span></div>';
  if(!tr&&!tp)h+='<p class="muted" style="margin:14px 0 4px">Nenhum provento nesse período.</p>';
  else h+='<div class="evch"><svg class="evax" viewBox="0 0 58 '+H+'" width="58" height="'+H+'" aria-hidden="true">'+ax+'</svg><div class="tipc evpl"'+tipAttr(tip)+'><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" width="100%" height="'+H+'" role="img" aria-label="Proventos por '+(an?'ano':'mês')+'">'+grid+'<line x1="0" x2="'+W+'" y1="'+yv(0).toFixed(1)+'" y2="'+yv(0).toFixed(1)+'" stroke="var(--muted)" stroke-width="1.2"/>'+bars+'</svg><div class="evxl" aria-hidden="true">'+xl+'</div></div></div>'+
    '<p class="pvhint">Toque nas barras para ver os detalhes de cada '+(an?'ano':'mês')+'.</p>'+
    '<div class="split pvsum"><div><span class="lbl">Recebidos no período</span><span class="num gain">'+brl.format(tr)+'</span></div><div><span class="lbl">A receber</span><span class="num">'+brl.format(tp)+'</span></div></div>';
  var acc=0;if(n&&(tr||tp))h+='<details class="evtb"><summary>Ver tabela '+(an?'ano a ano':'mês a mês')+'</summary><div style="overflow-x:auto"><table class="dvtab"><thead><tr><th>'+(an?'Ano':'Mês')+'</th><th>Recebido</th><th>A receber</th><th>Acumulado</th></tr></thead><tbody>'+
    P.map(function(o,i){acc+=o.r+o.p;return '<tr'+(o.r||o.p?'':' class="muted"')+'><td>'+lbl(keys[i])+'</td><td class="'+(o.r?'gain':'')+'">'+(o.r?brl.format(o.r):'—')+'</td><td>'+(o.p?brl.format(o.p):'—')+'</td><td>'+(acc?brl.format(acc):'—')+'</td></tr>'}).join('')+
    '<tr class="tot"><td>Total</td><td class="gain">'+brl.format(tr)+'</td><td>'+brl.format(tp)+'</td><td>'+brl.format(tr+tp)+'</td></tr></tbody></table></div></details>';
  h+='</div>';
  var tks={},hasUS=false,hasBR=false;items.forEach(function(i){tks[i.tk]=i.us;if(i.us)hasUS=true;else hasBR=true});
  h+=pvSheet('pvsheet','Filtros de proventos','<h3>Período</h3>'+['12','ano','5a','all'].map(function(k){return '<label class="rad"><input type="radio" name="pvep" value="'+k+'"'+(PV.ep===k?' checked':'')+'><span>'+PVPN[k]+'</span></label>'}).join('')+
    '<h3>Exibição</h3><div class="seg pvseg"><button type="button" data-pvx="m" aria-pressed="'+(PV.ex!=='a')+'">Mensal</button><button type="button" data-pvx="a" aria-pressed="'+(PV.ex==='a')+'">Anual</button></div>'+
    pvTA('pve',PV.et,PV.ea,tks,hasBR&&hasUS),'<div class="sft"><button type="button" class="link" data-pvf="ereset">Restaurar padrão</button><button type="button" class="btn" data-pvf="esave">Salvar</button></div>');
  return h;
}
function pvTA(nm,t,a,tks,both){
  return (both?'<h3>Tipos de ativo</h3><div class="chips">'+[['all','Todos os tipos'],['BR','Ações'],['US','ETFs Intern.']].map(function(x){return '<button type="button" data-pvt="'+nm+'" data-v="'+x[0]+'" aria-pressed="'+(t===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>':'')+
    '<h3>Ativos</h3><label class="rad"><input type="radio" name="'+nm+'a" value="all"'+(a==='all'?' checked':'')+'><span>Todos os ativos</span></label>'+Object.keys(tks).sort().map(function(k){return '<label class="rad"><input type="radio" name="'+nm+'a" value="'+esc(k)+'"'+(a===k?' checked':'')+'><span>'+esc(k)+'</span></label>'}).join('')}
function pvSheet(id,tit,body,foot,big){return '<div class="sheet" id="'+id+'"'+(PVS===id?'':' hidden')+'><div class="sbox'+(big?' big':'')+'" role="dialog" aria-label="'+esc(tit)+'"><div class="shd"><b>'+tit+'</b><button type="button" class="shx" data-pvc="1" aria-label="Fechar">✕</button></div><div class="sbd">'+body+'</div>'+(foot||'')+'</div></div>'}
function pvAtivos(items){
  var cs=['var(--c1)','var(--c6)','var(--c2)','var(--c5)','var(--c4)','var(--c3)'];
  var its=items.filter(function(i){return i.st==='rec'&&pvIn(i,PV.ap==='12'?'12':PV.ap)}),g={};
  its.forEach(function(i){var k=PV.ag==='cl'?(i.us?'ETFs Intern.':'Ações'):PV.ag==='pv'?(i.tipo==='JCP'?'JCP':'Dividendos'):i.tk;g[k]=(g[k]||0)+i.liq});
  var rows=Object.keys(g).map(function(k){return {n:k,v:g[k]}}).sort(function(a,b){return b.v-a.v}),tot=rows.reduce(function(s,x){return s+x.v},0);
  rows.forEach(function(x,i){x.c=cs[i%cs.length]});
  var sel=function(k,opts){return '<select class="pvsel" data-pvs="'+k+'" aria-label="'+(k==='ap'?'Período':'Agrupar')+'">'+opts.map(function(o){return '<option value="'+o[0]+'"'+(PV[k]===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select>'};
  var h='<div class="panel"><h2>Proventos por ativo</h2><div class="pvbt">'+sel('ap',[['12','Últimos 12 meses'],['ano','Ano atual'],['all','Desde o início']])+sel('ag',[['tk','Por ativo'],['cl','Por tipo de ativo'],['pv','Dividendo ou JCP']])+'</div>';
  if(!tot)return h+'<p class="muted" style="margin:14px 0 4px">Nenhum provento recebido nesse período.</p></div>';
  var r=70,C=2*Math.PI*r,off=0,seg=rows.map(function(i){var f=i.v/tot,l=Math.max(0,f*C-(rows.length>1?2:0)),o='<circle class="dsl" data-n="'+esc(i.n)+'" data-p="'+pf.format(f*100)+'%" data-v="'+brl.format(i.v)+'" r="'+r+'" cx="100" cy="100" fill="none" stroke="'+i.c+'" stroke-width="44" stroke-dasharray="'+l.toFixed(2)+' '+(C-l).toFixed(2)+'" stroke-dashoffset="'+(-off).toFixed(2)+'" transform="rotate(-90 100 100)"/>';off+=f*C;return o}).join('');
  var mx=rows[0].v,show=PV.more?rows:rows.slice(0,5);
  h+='<div class="dwr2"><svg viewBox="0 0 200 200" class="dnt2" role="img" aria-label="Proventos por ativo">'+seg+'</svg></div><p class="pvtot">'+brl.format(tot)+' recebidos</p>';
  h+='<ul class="pvar">'+show.map(function(x){return '<li><b>'+esc(x.n)+'</b><span class="num">'+pf.format(x.v/tot*100)+'%</span><span class="num muted small">'+brl.format(x.v)+'</span><i><em style="width:'+Math.max(3,x.v/mx*100).toFixed(1)+'%;background:'+x.c+'"></em></i></li>'}).join('')+'</ul>';
  if(rows.length>5)h+='<button type="button" class="pvmore" data-pvm="1">'+(PV.more?'Mostrar menos ▴':'Mostrar tudo ('+rows.length+') ▾')+'</button>';
  return h+'</div>';
}
function pvSort(a,p){var fut=p==='fut'||p==='prox';return a.sort(function(x,y){var dx=x.pay||(fut?'9999':'0000'),dy=y.pay||(fut?'9999':'0000');return fut?(dx<dy?-1:dx>dy?1:0):(dx<dy?1:dx>dy?-1:0)})}
var PVST={rec:['Recebido','ok'],up:['A receber','up'],def:['Provisionado','df']};
function pvList(items){
  var tks={},hasUS=false,hasBR=false;items.forEach(function(i){tks[i.tk]=i.us;if(i.us)hasUS=true;else hasBR=true});
  var LP=PV.lp||(items.some(function(i){return i.st!=='rec'})?'fut':'12');
  var its=pvSort(items.filter(function(i){return pvIn(i,LP)&&pvTipoOk(i,PV.lt,PV.la)}),LP),tot=sum0(its);
  var flt=(PV.lt!=='all'?(PV.lt==='US'?'ETFs Intern.':'Ações'):'')+(PV.la!=='all'?(PV.lt!=='all'?' · ':'')+PV.la:'');
  var vps=function(i){return i.r!=null?(i.us?usd.format(i.r):'R$ '+num(i.r,i.r<0.1?4:2)):'—'};
  var h='<div class="panel"><h2>Meus proventos</h2><div class="pvbt"><button type="button" class="evfbtn" data-pvo="pvlsheet">'+PVIC.cal+'<span>'+esc(pvLblP(LP))+'</span><i>▾</i></button><button type="button" class="evfbtn" data-pvo="pvfsheet"><svg viewBox="0 0 24 24"><path d="M4 7h16M7 12h10M10 17h4"/></svg><span>'+(flt?esc(flt):'Filtros')+'</span><i>▾</i></button></div>'+
    '<div class="pvtl"><b>Total de proventos:</b><b class="num gain">'+brl.format(tot)+'</b></div>';
  if(!its.length)h+='<p class="muted" style="margin:10px 0 4px">Nenhum provento nesse período.</p>';
  else h+='<div class="pvl"><div class="pvr pvh"><span>Ativo</span><span>Valor</span><span>Líquido</span><span>Status</span></div>'+its.slice(0,6).map(function(i){var s=PVST[i.st];
    return '<div class="pvr"><span class="pva" data-stk="'+esc(i.tk)+'">'+tkLogo(i.tk,i.us)+'<span><b>'+esc(i.tk)+'</b><small>'+(i.pay?fmtDate(i.pay):'A definir')+'</small></span></span><span class="num"><b class="gain">'+vps(i)+'</b><small>'+(i.q!=null?num(i.q,i.us?2:0):'')+'</small></span><b class="num gain">'+brl.format(i.liq)+'</b><span><em class="pst '+s[1]+'">'+s[0]+'</em></span></div>'}).join('')+'</div>'+
    '<button type="button" class="evfbtn pvdet" data-pvo="pvdsheet">Ver detalhes'+(its.length>6?' ('+its.length+')':'')+'</button>';
  h+='</div>';
  var yy=PVLY||today().slice(0,4),cy=+today().slice(0,4);
  h+=pvSheet('pvlsheet','Filtrar período','<h3>Período</h3>'+['ano','30','12','5a','mes','prox','fut','rec','all'].map(function(k){return '<label class="rad"><input type="radio" name="pvlp" value="'+k+'"'+(LP===k?' checked':'')+'><span>'+PVLN[k]+(k==='ano'?' <em class="tag">'+cy+'</em>':k==='all'?' <em class="tag">Recebidos e futuros</em>':'')+'</span></label>'}).join('')+
    '<h3>Filtro mensal</h3><div class="pvyr"><button type="button" data-pvy="-1" aria-label="Ano anterior">‹</button><b>'+yy+'</b><button type="button" data-pvy="1" aria-label="Próximo ano">›</button></div>'+
    [11,10,9,8,7,6,5,4,3,2,1,0].map(function(m){var k='m:'+yy+'-'+(m<9?'0':'')+(m+1);return '<label class="rad"><input type="radio" name="pvlp" value="'+k+'"'+(LP===k?' checked':'')+'><span>'+MESL[m].replace(/^./,function(c){return c.toUpperCase()})+'</span></label>'}).join(''));
  h+=pvSheet('pvfsheet','Filtros',pvTA('pvl',PV.lt,PV.la,tks,hasBR&&hasUS),'<div class="sft"><button type="button" class="link" data-pvf="lreset">Restaurar padrão</button><button type="button" class="btn" data-pvf="lsave">Salvar</button></div>');
  var ir=function(i){return i.br!=null&&i.br-i.liq>0.009?brl.format(i.br-i.liq):'—'};
  h+=pvSheet('pvdsheet','Detalhes de proventos','<p class="evsub" style="margin:4px 0 10px">'+esc(pvLblP(LP))+(flt?' · '+esc(flt):'')+' · '+its.length+' proventos</p><div class="atsc"><table class="pvdt"><thead><tr><th>Ativo</th><th>Tipo</th><th>Data com</th><th>Pagamento</th><th>Quantidade</th><th>Valor/ação</th><th>Valor bruto</th><th>IR</th><th>Líquido</th><th>Status</th></tr></thead><tbody>'+
    its.map(function(i){var s=PVST[i.st];return '<tr><td><span class="pva">'+tkLogo(i.tk,i.us)+'<b>'+esc(i.tk)+'</b></span></td><td><span class="tag">'+esc(i.tipo)+'</span></td><td>'+(i.dc?fmtDate(i.dc):'—')+'</td><td>'+(i.pay?fmtDate(i.pay):'A definir')+'</td><td>'+(i.q!=null?num(i.q,i.us?4:0):'—')+'</td><td>'+vps(i)+'</td><td>'+(i.br!=null?brl.format(i.br):'—')+'</td><td>'+ir(i)+'</td><td class="gain">'+brl.format(i.liq)+'</td><td><em class="pst '+s[1]+'">'+s[0]+'</em></td></tr>'}).join('')+
    '</tbody></table></div><p class="note" style="margin-top:12px">Arraste a tabela para o lado para ver as outras colunas. Valor bruto e IR aparecem quando o app sabe o valor por ação; no VT o IR é a retenção de 30% nos EUA.</p>','<div class="sft"><b>Total</b><b class="num gain">'+brl.format(tot)+'</b></div>',1);
  return h;
}
function renderDivPanel(){
  var items=pvItems();if(!items.length)return '';
  var h=pvCards(items)+pvEvo(items)+pvAtivos(items)+pvList(items)+divPorAtivo();
  h+='<p class="note exp" style="margin:0 4px"><b>Recebidos</b> são os proventos que já caíram na conta, do Brasil e do VT (em reais), já líquidos de IR. <b>A receber</b> e <b>provisionados</b> são os já anunciados das ações que você tinha na data-com, inclusive das que vendeu depois; provisionado é quando a empresa ainda não marcou a data de pagamento. Os anúncios do Brasil vêm do robô diário (Fundamentus) e do brapi, os do VT da Alpha Vantage. No dia do pagamento, o app lança sozinho no Extrato.</p>';
  return h;
}
document.addEventListener('scroll',function(e){var c=e.target;if(!c||c.id!=='pcards')return;var i=Math.round(c.scrollLeft/Math.max(1,c.clientWidth));if(i!==PCI){PCI=i;[].forEach.call(c.parentNode.querySelectorAll('.hdots i'),function(d){d.classList.toggle('on',+d.getAttribute('data-pci')===i)})}},true);
function pvRedraw(){var el=$('divtab');if(!el)return;el.innerHTML=renderDivPanel()||'<div class="panel"><p class="muted">Nenhum provento ainda. Quando cair o primeiro, ele aparece aqui.</p></div>';var pc=$('pcards');if(pc&&PCI)pc.scrollLeft=PCI*pc.clientWidth;if(PVS)document.body.style.overflow='hidden'}
function pvClose(){PVS=null;[].forEach.call(document.querySelectorAll('#divtab .sheet'),function(s){s.hidden=true});document.body.style.overflow=''}
document.addEventListener('click',function(e){var t=e.target;if(!t.closest||!$('divtab').contains(t))return;var x;
  if((x=t.closest('[data-pci]'))){var pc=$('pcards');if(pc)pc.scrollTo({left:+x.getAttribute('data-pci')*pc.clientWidth,behavior:'smooth'});return}
  if((x=t.closest('[data-pvo]'))){PVS=x.getAttribute('data-pvo');if(PVS==='pvlsheet')PVLY=(PV.lp||'').indexOf('m:')===0?PV.lp.slice(2,6):today().slice(0,4);var sh=$(PVS);if(PVS==='pvlsheet'){pvRedraw()}else if(sh){sh.hidden=false;document.body.style.overflow='hidden'}return}
  if(t.closest('[data-pvc]')||(t.classList.contains('sheet')&&t.closest('#divtab'))){pvClose();return}
  if((x=t.closest('[data-pvx]'))){[].forEach.call(x.parentNode.children,function(b){b.setAttribute('aria-pressed',String(b===x))});return}
  if((x=t.closest('[data-pvt]'))){var nm=x.getAttribute('data-pvt');[].forEach.call(document.querySelectorAll('[data-pvt="'+nm+'"]'),function(b){b.setAttribute('aria-pressed',String(b===x))});return}
  if((x=t.closest('[data-pvy]'))){PVLY=String(+(PVLY||today().slice(0,4))+ +x.getAttribute('data-pvy'));pvRedraw();return}
  if((x=t.closest('[data-pvm]'))){PV.more=PV.more?0:1;pvSave();pvRedraw();return}
  if((x=t.closest('[data-pvf]'))){var ac=x.getAttribute('data-pvf'),g=function(n){var r=document.querySelector('input[name='+n+']:checked');return r?r.value:'all'},ct=function(n){var b=document.querySelector('[data-pvt="'+n+'"][aria-pressed=true]');return b?b.getAttribute('data-v'):'all'};
    if(ac==='ereset'){PV.ep='12';PV.ex='m';PV.et='all';PV.ea='all'}
    else if(ac==='esave'){var ep=document.querySelector('input[name=pvep]:checked'),ex=document.querySelector('[data-pvx][aria-pressed=true]');PV.ep=ep?ep.value:'12';PV.ex=ex?ex.getAttribute('data-pvx'):'m';PV.et=ct('pve');PV.ea=g('pvea')}
    else if(ac==='lreset'){PV.lt='all';PV.la='all'}else if(ac==='lsave'){PV.lt=ct('pvl');PV.la=g('pvla')}
    pvSave();PVS=null;document.body.style.overflow='';pvRedraw();return}
});
document.addEventListener('change',function(e){var t=e.target;if(!t||!t.closest||!$('divtab').contains(t))return;
  if(t.name==='pvlp'){PV.lp=t.value;pvSave();PVS=null;document.body.style.overflow='';pvRedraw();return}
  var k=t.getAttribute('data-pvs');if(k){PV[k]=t.value;pvSave();pvRedraw()}});


function divPorAtivo(){
  var R=compute(),from=new Date(Date.now()-365*864e5).toISOString().slice(0,10),d0=S.trades.map(function(t){return t.date}).sort()[0]||from,full=d0<=from;
  var rec={},up={},sold=0;S.trades.forEach(function(t){if(t.side==='div'&&t.date>=from)rec[t.ticker]=(rec[t.ticker]||0)+t.price*(t.market==='US'?t.fx:1)});
  DV.up.forEach(function(u){up[u.tk]=(up[u.tk]||0)+u.val});
  var held={};R.held.forEach(function(x){held[x.p.ticker]=x});
  Object.keys(rec).forEach(function(k){if(!held[k])sold+=rec[k]});
  var rows=R.held.map(function(x){var r=rec[x.p.ticker]||0;return {tk:x.p.ticker,r:r,yc:x.p.cB?r/x.p.cB:0,dy:x.v?r/x.v:0,up:up[x.p.ticker]||0}}).sort(function(a,b){return b.yc-a.yc});
  if(!rows.length)return '';
  var tr=rows.reduce(function(a,x){return a+x.r},0),tc=R.held.reduce(function(a,x){return a+x.p.cB},0),tv=R.held.reduce(function(a,x){return a+x.v},0);
  var mesesH=Math.max(1,Math.round(dayDiff(full?from:d0,today())/30.44));
  return '<div class="panel"><h2>Quanto cada ativo paga</h2><p class="note" style="margin:0 0 10px">Proventos '+(full?'dos últimos 12 meses':'desde '+fmtDate(d0)+' ('+mesesH+' meses)')+' comparados com o que você pagou (rendimento sobre o custo) e com o valor de hoje.</p>'+
    '<div style="overflow-x:auto"><table class="dvtab"><thead><tr><th>Ativo</th><th>Recebido</th><th>Sobre o custo</th><th>Sobre o valor</th></tr></thead><tbody>'+
    rows.map(function(x){return '<tr><td><b>'+esc(x.tk)+'</b>'+(x.up?'<br><span class="small muted">+'+brl.format(x.up)+' a receber</span>':'')+'</td><td class="'+(x.r?'gain':'')+'">'+(x.r?brl.format(x.r):'—')+'</td><td>'+(x.r?pf.format(x.yc*100)+'%':'—')+'</td><td>'+(x.r?pf.format(x.dy*100)+'%':'—')+'</td></tr>'}).join('')+
    '<tr class="tot"><td>Carteira</td><td class="gain">'+brl.format(tr)+'</td><td>'+pf.format(tc?tr/tc*100:0)+'%</td><td>'+pf.format(tv?tr/tv*100:0)+'%</td></tr></tbody></table></div>'+
    (sold>0.005?'<p class="note">Mais '+brl.format(sold)+' de ações que você já vendeu, que não entram na tabela.</p>':'')+
    '<p class="note">Renda estimada por ano, no ritmo atual: <b>'+brl.format(tr/mesesH*12)+'</b> ('+brl.format(tr/mesesH)+' por mês).'+(full?'':' Com menos de 12 meses de carteira, os percentuais ainda estão abaixo do que seria um ano inteiro, e um mês de provento grande puxa a média para cima.')+'</p></div>';
}
