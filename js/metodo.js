/* Aporte · js/metodo.js — Histórico confiável do método (1.80.0, E7).
   PEÇA A (guardar): copia o histórico do aparelho (-opp e -gar) para o repositório privado (dados/metodo/), com backup bruto conferido ANTES de qualquer escrita.
   Os originais nunca são apagados nem renomeados; a nuvem só acrescenta (união por data); sem token ou com falha, tudo segue só no aparelho.
   Leitura segura: dado ilegível não é mais zerado em silêncio (a string ruim vai para -opp-ruim / -gar-ruim e o app tenta restaurar da nuvem antes de gravar algo novo).
   PEÇA C (mostrar): painel "Esse método já acertou?" lê dados/metodo/resultado.json (calculado pelo robô) e só conclui com n ≥ 10. */
var MTK='dados/metodo/',MTQ=false,MTE=0,MTN=0,MTBAD={},MTREST=false,MTLOG={},METOPEN=false,METH=90,METR=null,METRQ=false,METRT=0,METD=/^\d{4}-\d{2}-\d{2}$/;
function metK(s){return LS+'-'+s}
function metRaw(n){try{return localStorage.getItem(metK(n))}catch(e){return null}}
function metPlain(o){return !!o&&typeof o==='object'&&!Array.isArray(o)}
function metNum(x){return x===null||(typeof x==='number'&&isFinite(x))}
function metNn(a){return a.filter(function(v){return v!==null}).length}
/* ---- limpeza e mescla (funções puras) ---- */
function metRow(a){return Array.isArray(a)&&a.length>=4&&typeof a[0]==='string'&&METD.test(a[0])&&metNum(a[1])&&metNum(a[2])&&metNum(a[3])}
function metPick(a,b){var x=metNn(a),y=metNn(b);if(x!==y)return x>y?a:b;return JSON.stringify(a)<=JSON.stringify(b)?a:b}
function metOpp(o){var d={},x=0;if(!metPlain(o))return {d:d,x:0};
  Object.keys(o).sort().forEach(function(tk){var a=o[tk];if(!Array.isArray(a)){x++;return}var m={};
    a.forEach(function(r){if(metRow(r)){r=r.slice(0,4);m[r[0]]=m[r[0]]?metPick(m[r[0]],r):r}else x++});
    var ks=Object.keys(m).sort();if(ks.length)d[tk]=ks.map(function(k){return m[k]})});return {d:d,x:x}}
function metEnt(e){return Array.isArray(e)&&typeof e[0]==='string'&&!!e[0]}
function metGar(g){var r={},x=0;if(!metPlain(g)||(g.r!==undefined&&!metPlain(g.r)))return {d:{r:r},x:g==null?0:1};
  Object.keys(g.r||{}).sort().forEach(function(d){var y=g.r[d];if(!METD.test(d)||!metPlain(y)||!Array.isArray(y.l)){x++;return}
    var l=y.l.filter(function(e){var k=metEnt(e);if(!k)x++;return k}).map(function(e){return e.slice(0,4)});
    r[d]={i:typeof y.i==='number'&&isFinite(y.i)?y.i:null,l:l}});return {d:{r:r},x:x}}
function metPickD(a,b){if(a.l.length!==b.l.length)return a.l.length>b.l.length?a:b;var x=a.i===null?0:1,y=b.i===null?0:1;if(x!==y)return x>y?a:b;return JSON.stringify(a)<=JSON.stringify(b)?a:b}
/* união por data, nunca remove; cap = limite por ação (opp) e de dias (gar): nuvem 200/1100, aparelho 60/420; x = itens inválidos descartados */
function metMescla(a,b,cap){cap=cap||{opp:200,gar:1100};var A=metOpp(a&&a.opp),B=metOpp(b&&b.opp),GA=metGar(a&&a.gar),GB=metGar(b&&b.gar),opp={},gr={},t={},ds={};
  Object.keys(A.d).concat(Object.keys(B.d)).forEach(function(k){t[k]=1});
  Object.keys(t).sort().forEach(function(tk){var m={};(A.d[tk]||[]).concat(B.d[tk]||[]).forEach(function(r){m[r[0]]=m[r[0]]?metPick(m[r[0]],r):r});var ks=Object.keys(m).sort();if(ks.length>cap.opp)ks=ks.slice(ks.length-cap.opp);opp[tk]=ks.map(function(k){return m[k]})});
  Object.keys(GA.d.r).concat(Object.keys(GB.d.r)).forEach(function(k){ds[k]=1});
  Object.keys(ds).sort().forEach(function(d){var p=GA.d.r[d],q=GB.d.r[d];gr[d]=p&&q?metPickD(p,q):(p||q)});
  var gk=Object.keys(gr);if(gk.length>cap.gar)gk.slice(0,gk.length-cap.gar).forEach(function(k){delete gr[k]});
  return {opp:opp,gar:{r:gr},x:A.x+B.x+GA.x+GB.x}}
function metCnt(m){var o=metOpp(m&&m.opp).d,g=metGar(m&&m.gar).d.r,c={a:0,l:0,d:0,i:0};Object.keys(o).forEach(function(k){c.a++;c.l+=o[k].length});Object.keys(g).forEach(function(k){c.d++;c.i+=g[k].l.length});return c}
function metCan(m){return JSON.stringify({opp:m.opp,gar:m.gar})}
/* ---- leitura segura do que está no aparelho ---- */
function metRuim(n,s){if(metRaw(n+'-ruim')==null){try{localStorage.setItem(metK(n+'-ruim'),s)}catch(e){logErro('histórico do método','não consegui guardar a cópia do dado ilegível ('+n+')')}}
  if(!MTLOG[n]){MTLOG[n]=1;logErro('histórico do método',n+': dado ilegível ou com itens inválidos; guardei uma cópia (-ruim)')}}
function metParse(n){var raw=metRaw(n),r={d:n==='opp'?{}:{r:{}},raw:raw,ruim:0,x:0};if(raw==null||raw==='')return r;var o,c=null;
  try{o=JSON.parse(raw)}catch(e){o=undefined}
  if(n==='opp'){if(metPlain(o))c=metOpp(o)}else if(metPlain(o)&&(o.r===undefined||metPlain(o.r)))c=metGar(o);
  if(!c){r.ruim=1;MTBAD[n]=1;metRuim(n,raw);return r}
  r.d=c.d;r.x=c.x;if(c.x)metRuim(n,raw);return r}
/* gravação: fica parada enquanto o dado ilegível ainda não teve chance de ser restaurado da nuvem */
function metTrava(n){return !!MTBAD[n]&&!MTREST}
function metGrava(n,obj,forca){if(!forca&&metTrava(n))return false;try{localStorage.setItem(metK(n),JSON.stringify(obj));return true}catch(e){logErro('histórico do método','não consegui gravar '+n+' (armazenamento cheio?)');return false}}
/* ---- backup bruto + espelho na nuvem ---- */
function metSha(s){try{return window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(s))).then(function(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return (x<16?'0':'')+x.toString(16)}).join('')})}catch(e){return Promise.reject(e)}}
function metHttp(s){return s===401||s===403?'o token do GitHub não tem permissão (erro '+s+')':s===404?'repositório de dados não encontrado (erro 404)':'o GitHub recusou (erro '+s+')'}
function metStamp(){var d=new Date(Date.now()-3*36e5),z=function(n){return (n<10?'0':'')+n};return d.getUTCFullYear()+'-'+z(d.getUTCMonth()+1)+'-'+z(d.getUTCDate())+'-'+z(d.getUTCHours())+z(d.getUTCMinutes())}
function metRuimMarca(){return (metRaw('opp-ruim')||'').length+':'+(metRaw('gar-ruim')||'').length}
function metBackup(){var op=metRaw('opp'),ga=metRaw('gar'),ro=metRaw('opp-ruim'),rg=metRaw('gar-ruim');
  if(!op&&!ga&&!ro&&!rg)return Promise.resolve({ok:true,vazio:true});
  var doc={v:1,quando:new Date().toISOString(),versao:VERSAO,tam:{opp:(op||'').length,gar:(ga||'').length},opp:op,gar:ga,oppRuim:ro,garRuim:rg},p=MTK+'backup-local-'+metStamp()+'.json';
  return Promise.all([metSha(op||''),metSha(ga||'')]).then(function(h){doc.sha256={opp:h[0],gar:h[1]};
    return ghReq('PUT',{message:'Cópia de segurança do histórico do método',content:b64enc(JSON.stringify(doc))},p).then(function(x){
      if(!(x.ok||x.status===422||x.status===409))return {ok:false,motivo:metHttp(x.status),st:x.status};
      return ghReq('GET',null,p).then(function(g){if(!g.ok)return {ok:false,motivo:metHttp(g.status),st:g.status};var r;
        try{r=JSON.parse(b64dec(g.j.content))}catch(e){return {ok:false,motivo:'a cópia na nuvem ficou ilegível; não mudei nada'}}
        return Promise.all([metSha(r.opp||''),metSha(r.gar||'')]).then(function(h2){
          var igual=r.opp===op&&r.gar===ga&&r.oppRuim===ro&&r.garRuim===rg&&h2[0]===h[0]&&h2[1]===h[1]&&metRaw('opp')===op&&metRaw('gar')===ga;
          return igual?{ok:true,caminho:p,sha:h}:{ok:false,motivo:'a cópia na nuvem não ficou idêntica; não mudei nada'}})})})})}
function metLocal(){return {opp:metParse('opp').d,gar:metParse('gar').d}}
/* lê estado.json, mescla (união), restaura no aparelho o que faltar e acrescenta na nuvem; nunca grava menos do que a nuvem já tem */
function metSync(n){var p=MTK+'estado.json';
  return ghReq('GET',null,p).then(function(g){var cloud={opp:{},gar:{r:{}}},sha=null,d;
    if(g.status!==404){if(!g.ok)return Promise.reject({m:metHttp(g.status),st:g.status});
      try{d=JSON.parse(b64dec(g.j.content));if(!metPlain(d)||d.v!==1)throw 0;cloud={opp:d.opp,gar:d.gar};sha=g.j.sha}catch(e){return Promise.reject({m:'o arquivo da nuvem está ilegível: não alterei nada',fatal:1})}}
    var loc=metLocal(),c0=metMescla(cloud,{}),m=metMescla(cloud,loc),dev=metMescla(cloud,loc,{opp:60,gar:420}),lc=metCnt(loc),dc=metCnt(dev),cc=metCnt(c0),mc=metCnt(m);
    if(dc.l>lc.l||dc.a>lc.a){if(metGrava('opp',dev.opp,1))MTBAD.opp=0}
    if(dc.i>lc.i||dc.d>lc.d){if(metGrava('gar',dev.gar,1))MTBAD.gar=0}
    if(metCan(m)===metCan(c0))return {ok:1};
    if(mc.a<cc.a||mc.l<cc.l||mc.d<cc.d||mc.i<cc.i)return Promise.reject({m:'não vou gravar na nuvem algo menor do que ela já tem',fatal:1});
    var body={message:'Histórico do método '+today(),content:b64enc(JSON.stringify({v:1,quando:new Date().toISOString(),versao:VERSAO,opp:m.opp,gar:m.gar}))};if(sha)body.sha=sha;
    return ghReq('PUT',body,p).then(function(x){if(x.ok)return {ok:1};if((x.status===409||x.status===422)&&n>0)return metSync(n-1);return Promise.reject({m:metHttp(x.status),st:x.status})})})}
function metSt(ok,motivo){try{localStorage.setItem(metK('met-st'),JSON.stringify({ok:ok,dia:today(),motivo:motivo||'',bk:metRaw('met-mig')==='ok'}))}catch(e){}metMostra()}
function metStLer(){try{return JSON.parse(metRaw('met-st')||'null')}catch(e){return null}}
function metTxt(){var s=metStLer();if(!s)return 'Histórico do método: ainda não salvo na nuvem'+(S.keys&&S.keys.gh?'.':' (cole a chave do GitHub em Ajustes).');
  return s.ok?'Histórico do método: salvo na nuvem '+fotoDmy(s.dia)+' ✓'+(s.bk?' · cópia de segurança feita ✓':''):'Histórico do método não salvo: '+s.motivo+' ('+fotoDmy(s.dia)+')'}
function metMostra(){try{var e=document.getElementById('metst');if(e)e.textContent=metTxt()}catch(x){}}
function metMarca(){return today()+'|'+(metRaw('opp')||'').length+'|'+(metRaw('gar')||'').length}
function metCiclo(){if(MTQ||Date.now()-MTE<6e5||MTN>=6)return Promise.resolve();
  if(!(S.keys&&S.keys.gh)){MTREST=true;metSt(false,'sem token do GitHub (cole em Ajustes, na nuvem)');return Promise.resolve()}
  metParse('opp');metParse('gar');var ok=metRaw('met-mig')==='ok';
  if(ok&&metRaw('met-ok')===metMarca()&&!MTBAD.opp&&!MTBAD.gar&&metRaw('met-bkr')===metRuimMarca())return Promise.resolve();
  MTQ=true;
  return (ok&&metRaw('met-bkr')===metRuimMarca()?Promise.resolve({ok:true}):metBackup()).then(function(b){
    if(!b.ok)return Promise.reject({m:b.motivo,st:b.st});
    try{localStorage.setItem(metK('met-mig'),'ok');localStorage.setItem(metK('met-bkr'),metRuimMarca())}catch(e){return Promise.reject({m:'não consegui gravar a marca da cópia (armazenamento cheio)',fatal:1})}
    return metSync(3)}).then(function(){MTQ=false;MTREST=true;MTN=0;try{localStorage.setItem(metK('met-ok'),metMarca())}catch(e){}metSt(true)},
    function(e){MTQ=false;MTREST=true;MTE=Date.now();var st=e&&e.st,fim=e&&(e.fatal||st===401||st===403||st===404);if(fim)MTN=9;else MTN++;
      var msg=e&&e.m?e.m:'sem conexão com o GitHub';metSt(false,msg+(fim?'':'; tenta de novo em 10 minutos'));logErro('histórico do método',msg)})}
/* ---- PEÇA C: painel "Esse método já acertou?" ---- */
function metValida(r){return metPlain(r)&&r.v===1&&metPlain(r.agg)&&Array.isArray(r.entradas)}
function metRepinta(){var p=document.getElementById('metp');if(p)try{setHtml(p,metHtml(),'troca')}catch(e){}}
function metLer(){if(METRQ)return;if(!(S.keys&&S.keys.gh)){if(!METR)METR={ok:false,m:'sem chave do GitHub'};return}
  if(METRT&&Date.now()-METRT<(METR&&METR.ok?216e5:6e5))return;METRQ=true;METRT=Date.now();
  ghReq('GET',null,MTK+'resultado.json').then(function(x){METRQ=false;var r;
    if(x.status===404)METR=METR&&METR.ok?METR:{ok:false,m:'ainda não há resultado'};
    else if(!x.ok)METR=METR&&METR.ok?METR:{ok:false,m:metHttp(x.status)};
    else{try{r=JSON.parse(b64dec(x.j.content))}catch(e){r=null}METR=metValida(r)?{ok:true,r:r}:(METR&&METR.ok?METR:{ok:false,m:'arquivo ilegível'})}
    metRepinta()},function(){METRQ=false;if(!(METR&&METR.ok))METR={ok:false,m:'sem conexão'};metRepinta()})}
function metI(x){return typeof x==='number'&&isFinite(x)&&x>=0?Math.floor(x):0}
function metP(x){return typeof x==='number'&&isFinite(x)?csPc(x*100):'—'}
function metDmy(d){return typeof d==='string'&&METD.test(d)?d.split('-').reverse().join('/'):''}
function metGrupo(g,nm,ctl){var n=metI(g&&g.n),h;
  if(n>=nm&&g&&metI(g.bI)<=n&&metI(g.bC)<=n)h='<b>'+metI(g.bI)+' de '+n+' bateram o Ibov · '+metI(g.bC)+' de '+n+' o CDI</b>';else h='<span class="muted">poucos dados'+(ctl?' (controle)':'')+'</span>';return h}
function metPainel(R){var NM=Math.max(10,metI(R&&R.nmin)),H=METH,A=R&&R.agg&&metPlain(R.agg[String(H)])?R.agg[String(H)]:{},T=metPlain(A.total)?A.total:{},n=metI(T.n),A0=R&&metPlain(R.agg&&R.agg['90'])?R.agg['90']:{},n0=metI(A0.total&&A0.total.n),
    E=R&&Array.isArray(R.entradas)?R.entradas:[],ln=function(a,b){return '<div class="metl"><span>'+a+'</span>'+b+'</div>'},conc=n>=NM,sum,h='';
  if(!R)sum='Histórico ainda não disponível';else if(n0>=NM)sum='3 meses: bateram o Ibovespa '+metI(A0.total.bI)+' de '+n0;else sum='Poucos dados para concluir · '+n0+' de '+NM;
  if(!R){h+='<p class="muted">Histórico ainda não disponível: confira a chave do GitHub em Ajustes.</p>'+(METR&&METR.m?'<p class="note">'+esc(METR.m)+'</p>':'')}
  else{
    h+='<div class="metz" role="group" aria-label="Prazo">'+[90,180,365].map(function(z){return '<button type="button" class="metzb" data-methz="'+z+'" aria-pressed="'+(z===H?'true':'false')+'">'+Math.round(z/30)+' meses</button>'}).join('')+'</div>';
    if(!conc){h+='<p class="anv" style="margin:6px 0"><b>Poucos dados para concluir.</b></p>'+ln('Ideias acompanhadas','<b>'+E.length+'</b>')+ln('Já medidas em '+Math.round(H/30)+' meses','<b>'+n+'</b> <span class="muted">(precisa de '+NM+')</span>')+
      (metDmy(A.prox)?ln('Primeira medição','<b>a partir de '+metDmy(A.prox)+'</b>'):ln('Primeira medição','<span class="muted">ainda não há ideias do método atual</span>'))+'<p class="note">Até lá, são pontos para estudar, não sinal.</p>'}
    else{var pc=function(b){return Math.round(100*metI(b)/n)+'%'};
      h+='<p class="anv" style="margin:6px 0"><b>'+n+'</b> ideias medidas'+(metI(A.datas)?' (entraram em '+metI(A.datas)+' datas)':'')+'</p>'+ln('Bateram o Ibovespa','<b>'+metI(T.bI)+' de '+n+' ('+pc(T.bI)+')</b>')+ln('Bateram o CDI','<b>'+metI(T.bC)+' de '+n+' ('+pc(T.bC)+')</b>')+ln('Bateram os dois','<b>'+metI(T.bAmbos)+' de '+n+' ('+pc(T.bAmbos)+')</b>')+
        ln('Retorno mediano','<b>'+metP(T.med)+'</b> <span class="muted">(Ibov '+metP(T.medI)+' · CDI '+metP(T.medC)+')</span>')+'<p class="note">com dividendos, antes de imposto</p>';
      if(metI(A.datas)>0&&metI(A.datas)<5)h+='<p class="note">As ideias entraram em poucas datas diferentes: se parecem entre si, então '+n+' ideias valem menos do que '+n+' casos separados.</p>'}
    var C=metPlain(A.conf)?A.conf:{},M=metPlain(A.ms)?A.ms:{};
    h+='<div class="metg"><b>Por confiança</b>'+[['Alta','Alta'],['Média','Média'],['Verificação','Em verificação']].map(function(k){var g=C[k[0]];return ln(k[1]+' <span class="muted">'+metI(g&&g.n)+'</span>',metGrupo(g,NM,k[0]==='Verificação'))}).join('')+
      '<b>Por margem de segurança</b>'+[['neg','Negativa'],['0-20','0 a 20%'],['20+','20% ou mais']].map(function(k){var g=M[k[0]];return ln(k[1]+' <span class="muted">'+metI(g&&g.n)+'</span>',metGrupo(g,NM,0))}).join('')+'</div>';
    var f=metPlain(A.fora)?A.fora:{},fp=[[f.semSaida,'sem preço de saída'],[f.split,'desdobramento'],[f.semDiv,'sem dividendos conferidos'],[f.semFoto,'sem foto']].filter(function(x){return metI(x[0])>0}).map(function(x){return metI(x[0])+' '+x[1]});
    if(fp.length)h+='<p class="note">Fora da conta: '+fp.join(', ')+'.</p>';
    var s=metStLer();h+='<p class="note">'+esc(s&&s.ok?'Histórico guardado na nuvem ✓':metTxt())+(R.gerado?' · conta de '+esc(metDmy(String(R.gerado).slice(0,10))):'')+'</p>'}
  return {sum:sum,h:h}}
function metHtml(){try{metLer()}catch(e){}var R=METR&&METR.ok?METR.r:null,P=metPainel(R);
  return '<div class="panel metp" id="metp"><div class="meth"><button type="button" class="metb" data-met="1" aria-expanded="'+(METOPEN?'true':'false')+'" aria-controls="metd"><span class="mett">Esse método já acertou?</span><span class="mets">'+esc(P.sum)+'</span></button>'+
    bal('O app guarda as ideias que apontou e, depois de 3, 6 e 12 meses, compara o resultado (preço mais dividendos) com o Ibovespa e o CDI. Só mostra conclusão com 10 ou mais ideias. Não conta imposto nem custos. Ideias que entram no mesmo dia se parecem, então 10 ideias valem menos do que 10 casos separados. Não é promessa.',null,'Explicação: método')+
    '<span class="metc'+(METOPEN?' on':'')+'" data-met="1" aria-hidden="true">⌄</span></div><div class="metd" id="metd"'+(METOPEN?'':' hidden')+'>'+P.h+'</div></div>'}
document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('[data-met],[data-methz]'):null;if(!t)return;
  if(t.hasAttribute('data-methz')){var z=+t.getAttribute('data-methz');if(z===90||z===180||z===365){METH=z;metRepinta()}return}
  var p=document.getElementById('metp'),d=document.getElementById('metd');if(!p||!d)return;METOPEN=!METOPEN;d.hidden=!METOPEN;
  var b=p.querySelector('.metb'),c=p.querySelector('.metc');if(b)b.setAttribute('aria-expanded',METOPEN?'true':'false');if(c)c.classList.toggle('on',METOPEN)});
metMostra();
