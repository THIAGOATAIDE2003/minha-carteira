/* Notícias e notificações (sino no topo). Manchetes reais dos grandes jornais, buscadas pelo robô (noticias.json no repo de dados):
   sem IA e sem resumo; tocar abre a matéria direto no site do jornal. Notificação = notícia importante nova desde a última vez que você abriu. */
var NT={d:null,etag:'',at:0,busy:false,err:'',cat:'imp',pane:1,seen:0},NTK=LS+'-nt',NTS=LS+'-ntseen';
try{var nt0=JSON.parse(localStorage.getItem(NTK)||'null');if(nt0&&nt0.d){NT.d=nt0.d;NT.etag=nt0.etag||'';NT.at=nt0.at||0}NT.seen=+(localStorage.getItem(NTS)||0);if(!NT.seen){NT.seen=Date.now();localStorage.setItem(NTS,String(NT.seen))}}catch(e){}
function ntImp(x){return x.sc>=8||x.n>=2}
function ntAgo(d){var m=Math.round((Date.now()/1000-d)/60);if(m<1)return 'agora';if(m<60)return 'há '+m+' min';var h=Math.round(m/60);if(h<24)return 'há '+h+(h===1?' hora':' horas');var dd=Math.round(h/24);return dd===1?'ontem':'há '+dd+' dias'}
function ntNorm(s){return String(s||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase()}
function ntTerms(){var out=[],GEN={companhia:1,cia:1,banco:1,grupo:1,holding:1,brasil:0,participacoes:1,brasileira:1,industrias:1,industria:1};
  try{compute().held.forEach(function(x){var tk=x.p.ticker;out.push(ntNorm(tk));var h=MD.d&&MD.d.hist&&MD.d.hist[tk],nm=h&&h.name?ntNorm(h.name).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(function(w){return w.length>=4&&!GEN[w]&&['s.a.','sa'].indexOf(w)<0}):[];if(nm.length)out.push(nm.slice(0,2).join(' '));if(nm.length>1)out.push(nm[0])})}catch(e){}
  return out.filter(function(t,i){return t.length>=4&&out.indexOf(t)===i})}
function ntItems(){return (NT.d&&NT.d.itens)||[]}
/* Por que subiu/caiu hoje? (robô: manchetes de hoje e de ontem + IA; só entra quando o ativo mexeu forte e as manchetes explicam) */
function whyOf(key){var w=MD&&MD.d&&MD.d.why,e=w&&w.it&&w.it[key];if(!e)return null;var at=(e.at||0)*1000;if(Date.now()-at>20*36e5)return null;if(e.u!==2&&dzero(e.u===1,at))return null;return e}
function whyHtml(key,pct,nome){var e=whyOf(key);if(!e||pct==null||Math.abs(pct)<0.005)return '';var up=pct>0;
  return '<details class="why"><summary><span class="'+(up?'gain':'loss')+'">'+(up?'↗':'↘')+'</span> Por que '+esc(nome)+(up?' sobe':' cai')+' hoje?</summary><div class="whyb"><p>'+esc(e.t)+'</p>'+
    (e.ok&&e.n&&e.n.length?'<div class="whyn">'+e.n.map(function(x){return '<a href="'+esc(safeUrl(x.l))+'" target="_blank" rel="noopener noreferrer">'+esc(x.t)+'<span class="muted"> · '+esc(x.s||'')+'</span></a>'}).join('')+'</div>':'')+
    '<p class="muted small">Resumo feito por IA só com as manchetes de hoje e de ontem; pode errar. Não é recomendação de compra ou venda.</p></div></details>'}
function whyMine(){var w=MD&&MD.d&&MD.d.why,o=[];if(!w||!w.it)return o;var mine={};try{compute().held.forEach(function(x){if(x.p.qty>0)mine[x.p.ticker]=1})}catch(e){}
  (S.watch||[]).forEach(function(t){mine[t]=1});idxSel().forEach(function(k){mine[k]=1});
  Object.keys(w.it).forEach(function(k){if(mine[k]){var e=whyOf(k);if(e)o.push({k:k,e:e})}});o.sort(function(a,c){return Math.abs(c.e.p)-Math.abs(a.e.p)});return o}
function whyNome(k){var d=idxDef(k);return d?d.n:k}
/* Avisos de proventos das suas ações: anúncio novo, data-com chegando (até 3 dias) e pagamento chegando; guarda o que já viu para só avisar de novo anúncio */
var DVSK=LS+'-dvseen';
function dvAlerts(){var o=[],it;try{it=pvItems().filter(function(x){return x.st!=='rec'&&x.tk})}catch(e){return o}
  if(!it.length)return o;var st=null;try{st=JSON.parse(localStorage.getItem(DVSK)||'null')}catch(e){}
  var seed=!st,td=today(),now=Date.now(),ch=seed,d0=new Date();st=st||{};d0.setHours(0,0,0,0);var day0=d0.getTime(),dd=function(d){return d?d.slice(8,10)+'/'+d.slice(5,7):''};
  it.forEach(function(x){var k=x.tk+'|'+(x.dc||'')+'|'+(x.pay||'')+'|'+x.tipo+'|'+Math.round((x.r||0)*1e6);if(st[k]==null){st[k]=seed?0:now;ch=1}
    var base=x.tk+' · '+x.tipo,val=x.liq>0?' · você recebe cerca de '+brl.format(x.liq):'';
    if(st[k]>0&&now-st[k]<7*864e5)o.push({tk:x.tk,ts:st[k],tx:'Novo provento anunciado',sub:base+(x.r?' · '+brl.format(x.r)+' por ação':'')+(x.dc?' · data-com '+dd(x.dc):'')+(x.pay?' · pagamento '+dd(x.pay):' · pagamento ainda a definir')+val});
    if(x.dc&&x.dc>=td){var n=dayDiff(td,x.dc);if(n<=3)o.push({tk:x.tk,ts:day0,tx:n===0?'Data-com é hoje':n===1?'Data-com é amanhã':'Data-com em '+n+' dias',sub:base+' · quem tem a ação até '+dd(x.dc)+' recebe'+val})}
    if(x.pay&&x.pay>=td){var m=dayDiff(td,x.pay);if(m<=3)o.push({tk:x.tk,ts:day0,tx:m===0?'Pagamento hoje':m===1?'Pagamento amanhã':'Pagamento em '+m+' dias',sub:base+(x.liq>0?' · '+brl.format(x.liq)+' líquidos':'')})}});
  Object.keys(st).forEach(function(k){if(st[k]>0&&now-st[k]>400*864e5){delete st[k];ch=1}});/* proventos antigos saem do registro: ele não cresce para sempre */
  if(ch)try{localStorage.setItem(DVSK,JSON.stringify(st))}catch(e){}
  o.sort(function(a,c){return c.ts-a.ts});return o}
/* avisos de entrada: ativos da carteira (Brasil) e da lista que entraram na faixa confortável (preço bem abaixo do justo) */
var ENTSK=LS+'-entz',ENC={k:'',r:[]};
function entAlerts(){
  if(!(MD.d&&MD.d.fund&&MD.d.fund.d))return [];
  var R=compute(),tks=wlist().slice();R.held.forEach(function(x){if(x.p.market!=='US'&&tks.indexOf(x.p.ticker)<0)tks.push(x.p.ticker)});
  var key=MD.d.ts+'|'+tks.join(',')+'|'+ENT.mg+'|'+Math.floor(Date.now()/9e5)+'|'+OPC.k;if(ENC.k===key)return ENC.r;
  var st={};try{st=JSON.parse(localStorage.getItem(ENTSK)||'{}')||{}}catch(e){}var now=Date.now(),ch=0,o=[];
  tks.forEach(function(tk){var ev=null,E=null;try{ev=opEval(tk);E=ev&&ev.V?entInfo(tk,ev.d,ev.A,ev.V):null}catch(e){}if(!E)return;
    var s0=st[tk];if(!s0||(s0.z==='conf')!==(E.z==='conf')){s0=st[tk]={z:E.z,ts:E.z==='conf'?now:0};ch=1}else if(s0.z!==E.z){s0.z=E.z;ch=1}
    if(E.z==='conf'&&now-s0.ts<7*864e5&&!avFaixaOk(tk))o.push({tk:tk,ts:s0.ts,tx:'Entrou na faixa confortável',sub:tk+' · preço '+E.F.format(E.P)+', '+pf.format(E.mg*100)+'% abaixo do preço justo ('+E.F.format(E.V.med)+')'+(E.lu&&E.lu[0]==='al'?' · atenção: '+E.lu[1]:'')})});
  if(ch)try{localStorage.setItem(ENTSK,JSON.stringify(st))}catch(e){}
  o.sort(function(a,c){return c.ts-a.ts});ENC={k:key,r:o};return o}
function ntUnread(){var n=0;ntItems().forEach(function(x){if(ntImp(x)&&x.d*1000>NT.seen)n++});try{whyMine().forEach(function(m){if(m.e.at*1000>NT.seen)n++})}catch(e){}try{dvAlerts().forEach(function(a){if(a.ts>NT.seen)n++})}catch(e){}try{entAlerts().forEach(function(a){if(a.ts>NT.seen)n++})}catch(e){}try{riAlerts().forEach(function(a){if(a.ts>NT.seen)n++})}catch(e){}try{avAlertas().forEach(function(a){if(a.ts>NT.seen)n++})}catch(e){}return n}
function ntBadge(){var b=$('bellb');if(!b)return;var n=ntUnread();b.hidden=!n;b.textContent=n>99?'99+':String(n)}
function loadNews(force){
  if(!S.keys.gh||NT.busy)return Promise.resolve();if(!force&&Date.now()-NT.at<8*60000&&NT.d)return Promise.resolve();
  NT.busy=true;var c=new AbortController(),to=setTimeout(function(){c.abort()},15000),h={'Authorization':'Bearer '+S.keys.gh,'Accept':'application/vnd.github.raw'};if(NT.etag&&NT.d)h['If-None-Match']=NT.etag;
  return fetch('https://api.github.com/repos/'+ghRepo()+'/contents/noticias.json?ref=main',{headers:h,signal:c.signal,cache:'no-store'}).then(function(r){clearTimeout(to);
    if(r.status===304){NT.at=Date.now();return null}if(r.status===404){NT.err='O robô ainda não buscou as notícias.';return null}if(!r.ok)throw new Error(r.status);
    var et=r.headers.get('ETag')||'';return r.json().then(function(j){NT.d=j;NT.etag=et;NT.at=Date.now();NT.err='';try{localStorage.setItem(NTK,JSON.stringify({d:j,etag:et,at:NT.at}))}catch(e){}})})
    .catch(function(e){NT.err='Não consegui carregar as notícias agora.'}).then(function(){NT.busy=false;ntBadge();if($('nt')&&!$('nt').hidden)ntRender()});
}
function ntCard(x){var fav='https://www.google.com/s2/favicons?sz=32&domain='+encodeURIComponent((x.l.match(/^https?:\/\/([^\/]+)/)||[])[1]||'');
  return '<a class="ntc'+(x.d*1000>NT.seen&&ntImp(x)?' nw':'')+'" href="'+esc(safeUrl(x.l))+'" target="_blank" rel="noopener noreferrer">'+(x.i?'<span class="nti"><img src="'+esc(x.i)+'" alt="" loading="lazy" referrerpolicy="no-referrer"></span>':'')+
    '<b class="ntt">'+esc(x.t)+'</b><span class="ntm"><img class="ntf" src="'+esc(fav)+'" alt="" width="16" height="16" loading="lazy"><span>'+esc(x.s)+'</span><span class="muted">'+ntAgo(x.d)+(x.n>1?' · '+x.n+' jornais':'')+'</span></span></a>'}
function ntEmpty(){return '<p class="muted ntmsg">'+(NT.d?'':(S.keys.gh?(NT.err||'Carregando...'):'Conecte seus dados da nuvem em Ajustes para ver as notícias.'))}
/* tela de Notícias (ícone de jornal): só tocar, sem abas */
function ntRender(){
  var b=$('nt-b');if(!b)return;
  var it=ntItems().slice().sort(function(a,c){return c.d-a.d}),cats=[['imp','Importantes'],['all','Todas'],['BR','Brasil'],['EX','Mundo'],['mine','Minhas ações']],ter=NT.cat==='mine'?ntTerms():[],
      lst=it.filter(function(x){return NT.cat==='all'?1:NT.cat==='imp'?ntImp(x):NT.cat==='mine'?ter.some(function(t){return ntNorm(x.t).indexOf(t)>=0}):x.c===NT.cat});
  setHtml(b,'<div class="ntch">'+cats.map(function(c){return '<button type="button" data-ntc="'+c[0]+'" aria-pressed="'+(NT.cat===c[0])+'">'+c[1]+'</button>'}).join('')+'</div>'+
    (lst.length?lst.slice(0,80).map(ntCard).join(''):(NT.d?'<p class="muted ntmsg">'+(NT.cat==='mine'?'Nenhuma notícia das suas ações agora.':'Nenhuma notícia nessa lista.')+'</p>':ntEmpty()))+
    (NT.d?'<p class="muted small ntn">Atualizado '+ntAgo(NT.d.at)+'. Manchetes dos próprios jornais; toque para ler no site.</p>':''))}
function ntOpen(){$('nt').hidden=false;document.body.style.overflow='hidden';ntRender();loadNews(true)}
function ntClose(){$('nt').hidden=true;document.body.style.overflow='';ntBadge()}
/* gaveta de Notificações (sininho ou puxar a tela para o lado): notícias importantes novas */
function ndRender(){
  var b=$('nd-b');if(!b)return;var imp=ntItems().filter(function(x){return ntImp(x)&&x.d*1000>Date.now()-36*3600000}).sort(function(a,c){return c.d-a.d});
  var wm=[],dv=[],en=[];try{wm=whyMine()}catch(e){}try{dv=dvAlerts()}catch(e){}try{en=entAlerts()}catch(e){}
  var wh=wm.length?'<p class="muted small ntn">Movimentos fortes de hoje nos seus ativos, com o motivo.</p>'+wm.map(function(m){var p=m.e.p;return '<div class="ndi ndw'+(m.e.at*1000>NT.seen?' nw':'')+'" data-ndw="'+esc(m.k)+'"><b><span class="'+(p>0?'gain':'loss')+'">'+(p>0?'▲':'▼')+'</span> '+esc(whyNome(m.k))+' '+(p>0?'+':'−')+pf.format(Math.abs(p))+'%</b><span class="muted">'+esc(m.e.t)+'</span></div>'}).join(''):'';
  var dh=dv.length?'<p class="muted small ntn">Proventos das suas ações: anúncios, data-com e pagamento.</p>'+dv.map(function(a){return '<div class="ndi ndw'+(a.ts>NT.seen?' nw':'')+'" data-ndw="'+esc(a.tk)+'"><b>'+esc(a.tx)+' · '+esc(a.tk)+'</b><span class="muted">'+esc(a.sub)+'</span></div>'}).join(''):'';var eh=en.length?'<p class="muted small ntn">Preço confortável para entrar: abaixo do preço justo, com a sua margem de segurança.</p>'+en.map(function(a){return '<div class="ndi ndw'+(a.ts>NT.seen?' nw':'')+'" data-ndw="'+esc(a.tk)+'"><b>'+esc(a.tx)+' · '+esc(a.tk)+'</b><span class="muted">'+esc(a.sub)+'</span></div>'}).join(''):'';var rh='';try{var rk=riAlerts();rh=rk.length?'<p class="muted small ntn">Algo grave nas suas ações: notícias de risco e fatos relevantes da CVM. Só manchetes e documentos: confira antes de decidir.</p>'+rk.map(function(a){return '<div class="ndi ndw'+(a.ts>NT.seen?' nw':'')+'" data-ndw="'+esc(a.tk)+'"><b>'+esc(a.tx)+' · '+esc(a.tk)+'</b><span class="muted">'+esc(a.sub)+'</span></div>'}).join(''):''}catch(e){}var ah='';try{ah=avHtml()}catch(e){}wh=rh+ah+eh+dh+wh;
  setHtml(b,wh+(imp.length||wh?'':'')+(imp.length?'<p class="muted small ntn">Notícias importantes das últimas 36 horas. As novas têm a barrinha colorida.</p>'+imp.map(function(x){return '<a class="ndi'+(x.d*1000>NT.seen?' nw':'')+'" href="'+esc(safeUrl(x.l))+'" target="_blank" rel="noopener noreferrer"><b>'+esc(x.t)+'</b><span class="muted">'+esc(x.s)+' · '+ntAgo(x.d)+(x.n>1?' · '+x.n+' jornais':'')+'</span></a>'}).join(''):(wh?'':(NT.d?'<p class="muted ntmsg">Nada importante novo por enquanto.</p>':ntEmpty()))))}
function ndOpen(){var u=ntUnread();ndRender();$('nd').hidden=false;document.body.style.overflow='hidden';requestAnimationFrame(function(){$('nd').classList.add('on')});loadNews(true);
  if(u){setTimeout(function(){NT.seen=Date.now();try{localStorage.setItem(NTS,String(NT.seen))}catch(e){}ntBadge()},2500)}}
function ndClose(){var d=$('nd');if(!d||d.hidden)return;d.classList.remove('on');document.body.style.overflow='';setTimeout(function(){d.hidden=true},250);if(NT.seen){ntBadge();ndRender()}}
document.addEventListener('click',function(e){var t=e.target;if(!t||!t.closest)return;
  var o=t.closest('[data-nt]');if(o){if(o.getAttribute('data-nt')==='close')ntClose();else ntOpen();return}
  var n=t.closest('[data-nd]');if(n){if(n.getAttribute('data-nd')==='close')ndClose();else ndOpen();return}
  var c=t.closest('[data-ntc]');if(c){NT.cat=c.getAttribute('data-ntc');ntRender()}});
/* puxar a tela para a direita (a partir da borda esquerda ou do topo) abre a gaveta; puxar para a esquerda fecha */
(function(){var sx=0,sy=0,tr=false;
  document.addEventListener('touchstart',function(e){var t=e.touches[0];sx=t.clientX;sy=t.clientY;tr=e.touches.length===1&&(sx<36||sy<64)},{passive:true});
  document.addEventListener('touchend',function(e){var t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy,d=$('nd');
    if(d&&!d.hidden){if(dx<-70&&Math.abs(dy)<50)ndClose();return}
    if(!tr||dx<80||Math.abs(dy)>45||Math.abs(dx)<Math.abs(dy)*2)return;var sh=document.querySelector('.sheet:not([hidden])');if(sh)return;ndOpen()},{passive:true});
})();

document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('[data-ndw]');if(!t)return;var k=t.getAttribute('data-ndw');ndClose();setTimeout(function(){if(idxDef(k))idxOpen(k);else stkOpen(k)},260)});
