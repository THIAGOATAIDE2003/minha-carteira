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
function ntUnread(){var n=0;ntItems().forEach(function(x){if(ntImp(x)&&x.d*1000>NT.seen)n++});return n}
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
function ntRender(){
  var it=ntItems().slice().sort(function(a,b){return b.d-a.d}),sc=$('nt-p0'),nw=$('nt-p1');if(!sc||!nw)return;
  var imp=it.filter(function(x){return ntImp(x)&&x.d*1000>Date.now()-36*3600000});
  sc.innerHTML=(imp.length?'<p class="muted small ntn">Notícias importantes das últimas 36 horas. As novas têm uma barrinha colorida.</p>'+imp.map(ntCard).join(''):'<p class="muted ntmsg">'+(NT.d?'Nada importante novo por enquanto.':(S.keys.gh?(NT.err||'Carregando...'):'Conecte seus dados da nuvem em Ajustes para ver as notícias.'))+'</p>');
  var cats=[['imp','Importantes'],['all','Todas'],['BR','Brasil'],['EX','Exterior'],['mine','Minhas ações']],ter=NT.cat==='mine'?ntTerms():[],lst=it.filter(function(x){return NT.cat==='all'?1:NT.cat==='imp'?ntImp(x):NT.cat==='mine'?ter.some(function(t){return ntNorm(x.t).indexOf(t)>=0}):x.c===NT.cat});
  nw.innerHTML='<div class="ntch">'+cats.map(function(c){return '<button type="button" data-ntc="'+c[0]+'" aria-pressed="'+(NT.cat===c[0])+'">'+c[1]+'</button>'}).join('')+'</div>'+
    (lst.length?lst.slice(0,80).map(ntCard).join(''):'<p class="muted ntmsg">'+(NT.d?(NT.cat==='mine'?'Nenhuma notícia das suas ações agora.':'Nenhuma notícia nessa lista.'):(S.keys.gh?(NT.err||'Carregando...'):'Conecte seus dados da nuvem em Ajustes para ver as notícias.'))+'</p>')+
    (NT.d?'<p class="muted small ntn">Atualizado '+ntAgo(NT.d.at)+'. Manchetes dos próprios jornais; toque para ler no site.</p>':'')}
function ntPane(i,smooth){NT.pane=i;var p=$('ntp');if(p)p.scrollTo({left:i*p.clientWidth,behavior:smooth?'smooth':'auto'});[].forEach.call(document.querySelectorAll('[data-ntp]'),function(b){b.setAttribute('aria-pressed',String(+b.getAttribute('data-ntp')===i))})}
function ntOpen(){var u=ntUnread();$('nt').hidden=false;document.body.style.overflow='hidden';ntRender();ntPane(u?0:1,false);loadNews(true);if(u){NT.seen=Date.now();try{localStorage.setItem(NTS,String(NT.seen))}catch(e){}setTimeout(function(){ntBadge()},1500)}}
function ntClose(){$('nt').hidden=true;document.body.style.overflow='';ntBadge();ntRender()}
document.addEventListener('click',function(e){var t=e.target;if(!t||!t.closest)return;
  var o=t.closest('[data-nt]');if(o){if(o.getAttribute('data-nt')==='close')ntClose();else ntOpen();return}
  var c=t.closest('[data-ntc]');if(c){NT.cat=c.getAttribute('data-ntc');ntRender();return}
  var p=t.closest('[data-ntp]');if(p){ntPane(+p.getAttribute('data-ntp'),true)}});
document.addEventListener('scroll',function(e){var p=e.target;if(!p||p.id!=='ntp')return;var i=Math.round(p.scrollLeft/Math.max(1,p.clientWidth));if(i!==NT.pane){NT.pane=i;[].forEach.call(document.querySelectorAll('[data-ntp]'),function(b){b.setAttribute('aria-pressed',String(+b.getAttribute('data-ntp')===i))})}},true);
