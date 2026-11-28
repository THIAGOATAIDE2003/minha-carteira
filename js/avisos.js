/* Aporte · js/avisos.js — avisos de ideias e balanços no sininho (1.81.0, E8). Só LÊ opData(): não muda lista, ordem, nota, potencial, margem, confiança nem faixa.
   Compara o estado de agora com o último estado guardado (<LS>-avi, só neste aparelho): celular fechado por dias = aviso do resultado líquido, sem perda nem duplicata.
   Só define funções e estado; nada roda na carga (os gatilhos ficam no fim de abas.js). Tudo em try/catch: se falhar, a gaveta mostra os avisos antigos como antes. */
var AVSK=LS+'-avi',AV={st:null,rd:0,ok:0,at:0,md:0,busy:0,dirty:0,why:''},AVJ=3*864e5,AVE=7*864e5,AVJAN=14*864e5,AVH=0.01,AVMAXL=6,AVMAXG=3,
  AVPL={abaixo:'Abaixo da faixa',dentro:'Dentro da faixa',acima:'Acima da faixa'},
  AVTY={nova:1,saiu:1,faixa:1,nota:1,bal:1,ini:1,gnova:1,gsaiu:1,gfaixa:1,gnota:1,gbal:1};
function avNum(v){return typeof v==='number'&&isFinite(v)}
function avTs(v){return avNum(v)&&v>0&&v<4e12?v:0}
function avStr(v,n){return typeof v==='string'?v.slice(0,n):''}
/* limpa o que veio do aparelho: tipo errado, campo faltando ou lixo viram null/vazio; estado sem forma de estado = null (semeia de novo, sem avisos) */
function avNorm(o){var s,ok=function(x){return x&&typeof x==='object'&&!Array.isArray(x)};
  if(!ok(o)||o.v!==1||!ok(o.t)||!Array.isArray(o.log)||!ok(o.ck)||!avTs(o.at))return null;
  s={v:1,ini:avStr(o.ini,10),at:avTs(o.at),cand:avNum(o.cand)&&o.cand>0?o.cand:0,t:{},log:[],ck:{}};
  Object.keys(o.t).slice(0,400).forEach(function(tk){var e=o.t[tk],c;if(!ok(e)||!/^[A-Za-z0-9.\-]{1,12}$/.test(tk))return;c=ok(e.c)?e.c:{};
    s.t[tk]={l:avStr(e.l,6).replace(/[^WMD]/g,''),p:e.p==='abaixo'||e.p==='dentro'||e.p==='acima'?e.p:null,n:avNum(e.n)?e.n:null,b:avNum(e.b)?e.b:null,
      f:Array.isArray(e.f)&&avNum(e.f[0])&&avNum(e.f[1])?[e.f[0],e.f[1]]:null,r:avTs(e.r),c:{p:avTs(c.p),n:avTs(c.n),l:avTs(c.l)}}});
  o.log.slice(-150).forEach(function(x){if(!ok(x)||!avStr(x.k,80)||!AVTY[x.ty]||!avTs(x.ts))return;
    s.log.push({k:avStr(x.k,80),ty:x.ty,tk:avStr(x.tk,12),g:x.g===0||x.g===1||x.g===2?x.g:2,gv:avNum(x.gv)?x.gv:5,ts:x.ts,tx:avStr(x.tx,120),sub:avStr(x.sub,260),
      n:avNum(x.n)?x.n:0,tks:Array.isArray(x.tks)?x.tks.filter(function(t){return typeof t==='string'}).slice(0,8).map(function(t){return t.slice(0,12)}):[]})});
  Object.keys(o.ck).slice(0,600).forEach(function(k){if(avTs(o.ck[k]))s.ck[k]=o.ck[k]});return s}
/* leitura segura: lixo guarda a string em <LS>-avi-ruim (uma vez, se couber) e devolve null; nada quebra */
function avLer(){if(AV.rd)return AV.st;var raw=null,s=null;try{raw=localStorage.getItem(AVSK)}catch(e){}
  if(raw!=null){try{if(raw.length<3e5)s=avNorm(JSON.parse(raw))}catch(e){s=null}
    if(!s){try{if(raw.length<2e5&&localStorage.getItem(AVSK+'-ruim')==null)localStorage.setItem(AVSK+'-ruim',raw)}catch(e){}}}
  AV.st=s;AV.rd=1;return s}
function avGravar(s){AV.st=s;AV.rd=1;try{localStorage.setItem(AVSK,JSON.stringify(s));AV.dirty=0;return true}catch(e){AV.dirty=1;return false}}
/* pura: posição na faixa com margem de 1%: só muda de posição se o preço passar do limite em pelo menos 1% (mesma regra de opEtiq, que não é alterada) */
function avPos(prev,px,cons,oti){if(!(px>0&&cons>0&&oti>0))return prev||null;
  var raw=px<cons?'abaixo':px>oti?'acima':'dentro',ab=px<cons*(1-AVH),ac=px>oti*(1+AVH);if(!prev||prev===raw)return raw;
  if(prev==='dentro')return ab?'abaixo':ac?'acima':'dentro';
  if(prev==='abaixo')return ac?'acima':px>=cons*(1+AVH)?'dentro':'abaixo';
  return ab?'abaixo':px<=oti*(1-AVH)?'dentro':'acima'}
/* último balanço (ano, trimestre) que o robô já recolheu da CVM; período menor que o guardado é ignorado em avCalc */
function avQ(tk){var q=null,m=0,a=0,t=0;try{q=cvmQ(tk)}catch(e){}if(!q)return null;
  q.forEach(function(x){var k=Array.isArray(x)&&avNum(x[0])&&avNum(x[1])?x[0]*10+x[1]:0;if(k>m){m=k;a=x[0];t=x[1]}});return m?{k:m,a:a,t:t}:null}
/* por que uma ideia saiu: só quando é por critério (verificação, preço acima do limite, nota/qualidade); sem motivo conhecido (corte de 12, setor, concentração, dado faltando) = null: não avisa e guarda a ideia como "ainda conta" */
function avMotivo(tk,mp){var x=mp.X[tk],o,f,m='';
  if(x){try{m=opMotivo(x)}catch(e){}return {tx:'Passou para Em verificação'+(m?' ('+m+')':'')}}
  if(mp.M[tk])return {tx:''};o=mp.W[tk];if(!o)return null;f=o.fx;
  if(f&&f.ok&&!f.opp)return {tx:'Preço acima do limite para ser ideia'};
  try{if(!opPorta(o))return {tx:'Não passa mais nos critérios'}}catch(e){}return null}
function avN(v){return v.toFixed(1).replace('.',',')}
function avCap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
/* pura: r = resultado de opData() (só leitura), st = estado guardado (ou null), now = hora. Devolve {d:motivo} se o dado está incompleto (nada é gravado), ou {st,ev,seed} */
function avCalc(r,st,now){var all,i,s,seed=!st,ev=[],mp={W:{},M:{},D:{},X:{}},tks={},gap,day=Math.floor(now/864e5),out=[],grp={};
  if(!r||!r.W||!r.M||!r.D||!r.X)return {d:'sem dados'};
  all=r.W.concat(r.M,r.D,r.X);for(i=0;i<all.length;i++)if(all[i]&&all[i].fx&&all[i].fx.pend)return {d:'faixa calculando'};
  if(st&&st.cand>0&&r.cand<st.cand/2)return {d:'dados incompletos'};
  s=st?JSON.parse(JSON.stringify(st)):{v:1,ini:'',at:0,cand:0,t:{},log:[],ck:{}};gap=!seed&&st.at&&now-st.at>36*36e5;
  ['W','M','D','X'].forEach(function(L){r[L].forEach(function(o){if(o&&o.tk)mp[L][o.tk]=o})});
  ['W','M','D'].forEach(function(L){Object.keys(mp[L]).forEach(function(k){tks[k]=1})});
  var add=function(ty,tk,g,gv,tx,sub,det){ev.push({k:ty+'|'+tk+'|'+det+'|'+day,ty:ty,tk:tk,g:g,gv:gv,ts:now,tx:tx,sub:sub+(gap?' · desde a sua última abertura':''),n:0,tks:[]})};
  Object.keys(tks).forEach(function(tk){var o=mp.W[tk]||mp.M[tk]||mp.D[tk],inW=!!mp.W[tk],inM=!!mp.M[tk],inD=!!mp.D[tk],g=inM?0:inW?1:2,px=o.d&&o.d.price,f=o.fx,
      fok=!!(f&&f.ok&&f.cons>0&&f.oti>0&&px>0),F=(f&&f.F)||brl,e=s.t[tk],prevD,np,sc=o.score,q,ck,m,pf0,et,pt;
    if(!e)e=s.t[tk]={l:'',p:null,n:null,b:null,f:null,r:0,c:{p:0,n:0,l:0}};prevD=e.l.indexOf('D')>=0||e.r>0;
    if(inD){e.r=0;if(!prevD&&!seed&&now-e.c.l>=AVE){et=null;try{et=opEtiq(o)}catch(x){}pt=[];if(o.cf&&o.cf.n)pt.push('confiança '+String(o.cf.n).toLowerCase());if(avNum(sc))pt.push('nota '+avN(sc));if(et&&et.c!=='nd')pt.push(et.t);
      add('nova',tk,g,5,'Nova ideia',avCap(pt.join(' · ')),'');e.c.l=now}}
    else if(prevD){m=avMotivo(tk,mp);
      if(m){if(m.tx&&inW&&!seed&&now-e.c.l>=AVE){add('saiu',tk,g,2,'Saiu das ideias',m.tx,'');e.c.l=now}e.r=0}
      else if(!e.r)e.r=now;else if(now-e.r>30*864e5)e.r=0}
    if(fok){np=avPos(e.p,px,f.cons,f.oti);
      if(e.p==null)e.p=np;
      else if(np!==e.p){if(np==='dentro')e.p=np;else if(!seed&&now-e.c.p>=AVJ){add('faixa',tk,g,np==='acima'?1:4,'Passou para '+AVPL[np],'Preço '+F.format(px)+' · antes: '+AVPL[e.p],np);e.c.p=now;e.p=np}}}
    if(avNum(sc)){if(inW||inM){if(e.n==null)e.n=sc;
      else if(Math.abs(Math.round(sc*10)-Math.round(e.n*10))>=10&&!seed&&now-e.c.n>=AVJ){add('nota',tk,g,sc>e.n?6:3,sc>e.n?'Nota subiu':'Nota caiu','De '+avN(e.n)+' para '+avN(sc),String(Math.round(sc*10)));e.c.n=now;e.n=sc}}
      else e.n=sc}
    q=avQ(tk);
    if(q){if(e.b==null)e.b=q.k;
      else if(q.k>e.b){ck=tk+'|'+q.a+'-'+q.t;
        if(!s.ck[ck]){if(!seed){pf0=e.f;add('bal',tk,g,0,'Balanço novo ('+q.t+'T'+String(q.a).slice(2)+')',
          pf0&&fok?(Math.abs(f.cons/pf0[0]-1)<0.01&&Math.abs(f.oti/pf0[1]-1)<0.01?'Faixa quase igual':'Faixa de '+F.format(pf0[0])+' a '+F.format(pf0[1])+' para '+F.format(f.cons)+' a '+F.format(f.oti)):fok?'Faixa agora '+F.format(f.cons)+' a '+F.format(f.oti):'Faixa de preço justo ainda indisponível',q.a+'-'+q.t)}s.ck[ck]=now}
        e.b=q.k}}
    if(fok)e.f=[Math.round(f.cons*1e4)/1e4,Math.round(f.oti*1e4)/1e4];
    e.l=(inW?'W':'')+(inM?'M':'')+(inD?'D':'')});
  Object.keys(s.t).forEach(function(tk){var e,m;if(tks[tk])return;e=s.t[tk];
    if(e.l.indexOf('D')>=0||e.r>0){m=avMotivo(tk,mp);if(m)e.r=0;else if(!e.r)e.r=now;else if(now-e.r>30*864e5)e.r=0}
    e.l='';if(!(e.r>0)&&now-Math.max(e.c.p,e.c.n,e.c.l)>=30*864e5)delete s.t[tk]});
  /* mais de 3 do mesmo tipo e do mesmo grupo (carteira, lista, ideias) na mesma verificação viram uma linha */
  ev.forEach(function(x){var k=x.ty+'|'+x.g;(grp[k]=grp[k]||[]).push(x)});
  Object.keys(grp).forEach(function(k){var L=grp[k],x=L[0],nm={faixa:' mudaram de posição na faixa',nova:' são novas ideias',saiu:' saíram das ideias',nota:' mudaram de nota',bal:' têm balanço novo'},tk;
    if(L.length<=AVMAXG){L.forEach(function(y){out.push(y)});return}
    tk=L.map(function(y){return y.tk});out.push({k:'g'+x.ty+'|'+x.g+'|'+tk.join(',')+'|'+day,ty:'g'+x.ty,tk:'',g:x.g,gv:Math.min.apply(null,L.map(function(y){return y.gv})),ts:now,
      tx:L.length+' ações'+nm[x.ty],sub:tk.slice(0,4).join(', ')+(tk.length>4?' e mais '+(tk.length-4):'')+' · toque para ver'+(gap?' · desde a sua última abertura':''),n:L.length,tks:tk.slice(0,8)})});
  if(seed)out=[{k:'ini|'+day,ty:'ini',tk:'',g:0,gv:9,ts:now,tx:'Os avisos começam a aparecer a partir de agora.',sub:'',n:0,tks:[]}];
  out.forEach(function(x){if(!s.log.some(function(y){return y.k===x.k}))s.log.push(x)});
  s.log=s.log.filter(function(x){return now-x.ts<30*864e5}).slice(-60);
  var ks=Object.keys(s.ck);if(ks.length>500){ks.sort(function(a,b){return s.ck[a]-s.ck[b]}).slice(0,ks.length-500).forEach(function(k){delete s.ck[k]})}
  s.at=now;if(r.cand>0)s.cand=r.cand;if(!s.ini)s.ini=String(new Date(now).toISOString()).slice(0,10);
  return {st:s,ev:out,seed:seed}}
/* linhas da gaveta: janela de 14 dias; as 6 mais recentes; carteira antes da lista e das ideias, depois por gravidade; a frase de "começam a aparecer" só vale 3 dias e some quando há aviso de verdade */
function avAlertas(){var s=avLer(),now=Date.now(),L,real;if(!s)return [];
  L=s.log.filter(function(x){return now-x.ts<(x.ty==='ini'?3*864e5:AVJAN)});real=L.filter(function(x){return x.ty!=='ini'});if(real.length)L=real;
  L.sort(function(a,b){return b.ts-a.ts});L=L.slice(0,AVMAXL);L.sort(function(a,b){return a.g-b.g||a.gv-b.gv||b.ts-a.ts});return L}
function avHtml(){var L=[],h='';try{L=avAlertas()}catch(e){return ''}if(!L.length)return '';
  L.forEach(function(a){var nw=a.ts>NT.seen,t=a.ty==='ini'?a.tx:a.tx+(a.tk?' · '+a.tk:''),lb=(nw?'Novo: ':'')+t+(a.sub?'. '+a.sub:''),at=a.ty==='ini'?'':a.tk?' data-ndw="'+esc(a.tk)+'" role="button" tabindex="0"':' data-ndi="1" role="button" tabindex="0"';
    h+='<div class="ndi'+(a.tk||a.tks.length?' ndw':'')+(nw?' nw':'')+'"'+at+' aria-label="'+esc(lb)+'"><b>'+esc(t)+'</b>'+(a.sub?'<span class="muted">'+esc(a.sub)+'</span>':'')+'</div>'});
  return '<p class="muted small ntn">Ideias e balanços das suas ações. Os novos têm a barrinha colorida.</p><div role="group" aria-label="Ideias e balanços das suas ações">'+h+'</div>'}
/* verdadeiro se a ação já tem faixa nova pronta (entAlerts então não repete o aviso antigo de "faixa confortável") */
function avFaixaOk(tk){var r=OPC&&OPC.r,i,L,j;if(!r)return false;L=['W','M','D'];for(i=0;i<3;i++)for(j=0;j<(r[L[i]]||[]).length;j++){var o=r[L[i]][j];if(o&&o.tk===tk&&o.fx&&o.fx.ok)return true}return false}
/* um ciclo: lê opData (cache de 15 min), compara, grava e atualiza o sininho; dado incompleto = descarta sem gravar e tenta de novo no próximo tique */
function avCiclo(force){var now=Date.now(),r=null,R;if(AV.busy||(!force&&!AV.md)||(typeof MD!=='undefined'&&MD.busy))return;if(!force&&AV.ok&&now-AV.at<15*60000&&!AV.dirty)return;AV.busy=1;
  try{try{r=opData()}catch(e){r=null}R=avCalc(r,avLer(),now);
    if(R.d){AV.ok=0;AV.why=R.d;return}
    AV.ok=1;AV.at=now;AV.why='';avGravar(R.st);try{ntBadge()}catch(e){}var d=$('nd');if(d&&!d.hidden)ndRender()}
  catch(e){AV.ok=0;AV.why='erro'}finally{AV.busy=0}}
/* toque na linha agrupada: Mercado → Análise → Ideias → Ideias novas */
function avIdeias(){MKV='ana';ANV='opp';OPV='gar';try{localStorage.setItem(LS+'-mkv',MKV);localStorage.setItem(LS+'-anv',ANV);localStorage.setItem(LS+'-opv',OPV)}catch(e){}try{vlHash('mercado')}catch(e){}showTab('mercado');renderMkt()}
document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('[data-ndi]');if(!t)return;ndClose();setTimeout(function(){try{avIdeias()}catch(x){}},260)});
