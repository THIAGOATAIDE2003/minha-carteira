/* Aporte · js/nuvem.js — sincronização com o repositório privado no GitHub.
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
/* sincronização com o repositório privado no GitHub */
var GH={busy:false,last:0,err:'',again:false};
function ghRepo(){return (S.keys.repo||'THIAGOATAIDE2003/minha-carteira-dados').replace(/^https?:\/\/github\.com\//,'').replace(/\/+$/,'').trim()}
function b64dec(x){var b=atob(String(x).replace(/\s/g,'')),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new TextDecoder().decode(u)}
function b64enc(x){var u=new TextEncoder().encode(x),b='';for(var i=0;i<u.length;i+=8192)b+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(b)}
function ghReq(method,body,path){
  var c=new AbortController(),to=setTimeout(function(){c.abort()},15000);
  return fetch('https://api.github.com/repos/'+ghRepo()+'/contents/'+(path||'carteira.json')+(method==='GET'?'?ref=main&_='+Date.now():''),{method:method,signal:c.signal,cache:'no-store',
    headers:{'Authorization':'Bearer '+S.keys.gh,'Accept':'application/vnd.github+json'},body:body?JSON.stringify(body):undefined})
    .then(function(r){clearTimeout(to);return r.json().then(function(j){return {ok:r.ok,status:r.status,j:j}},function(){return {ok:r.ok,status:r.status,j:{}}})})
    .then(function(x){if(!x.ok&&x.status!==404&&x.status!==409)logErro('nuvem GitHub','HTTP '+x.status+(x.j&&x.j.message?' '+x.j.message:''));return x},function(e){clearTimeout(to);logErro('nuvem GitHub',errMsg(e,15));throw e});
}
function applyOps(trades,ops){
  var out=trades.filter(function(x){return x&&typeof x==='object'&&x.id&&x.date});
  ops.forEach(function(o){
    if(o.t==='add'&&o.tr&&!out.some(function(x){return x.id===o.tr.id}))out.push(o.tr);
    else if(o.t==='del')out=out.filter(function(x){return x.id!==o.id});
  });
  return out;
}
function applyPx(f,ops){var o=JSON.parse(JSON.stringify(f||{}));ops.forEach(function(x){if(x.t==='px'){(o[x.tk]=o[x.tk]||{})[x.m]=x.p}});return o}
function applyCfg(d,ops,k){k=k||'alvos';var a=d[k]||null;ops.forEach(function(x){if(x.t==='cfg'&&x.k===k)a=x.v});return a}
function ghAdopt(d){
  S.mclose=applyPx(d.fechamentos,S.pend||[]);var na=applyCfg(d,S.pend||[]);if(na)S.alvos=na;var nm2=applyCfg(d,S.pend||[],'metas');if(nm2)S.metas=nm2;var nw2=applyCfg(d,S.pend||[],'watch');if(nw2)S.watch=nw2;var ni2=applyCfg(d,S.pend||[],'idx');if(ni2)S.idxSel=ni2;var np2=applyCfg(d,S.pend||[],'perfil');if(np2)S.perfil=np2;var nt3=applyCfg(d,S.pend||[],'teses');if(nt3)S.teses=nt3;var no3=applyCfg(d,S.pend||[],'orc');if(no3)S.orc=no3;
  var tr=applyOps(Array.isArray(d.trades)?d.trades:[],S.pend||[]);
  var before=JSON.stringify([S.trades,S.cambio||[]]);
  S.trades=tr;if(Array.isArray(d.cambio))S.cambio=d.cambio;save();
  if(JSON.stringify([S.trades,S.cambio||[]])!==before){render();loadCDI()}
}
function ghRound(attempt){
  return ghReq('GET').then(function(r){
    var remote,sha=null;
    if(!r.ok)throw {status:r.status};
    GH.readOk=true;
    remote=JSON.parse(b64dec(r.j.content||''));sha=r.j.sha;
    if(!S.ghInit){
      var ids={};(remote.trades||[]).forEach(function(x){ids[x.id]=1});
      S.trades.forEach(function(x){if(!ids[x.id]&&!/^n\d{3}$/.test(x.id)&&!S.pend.some(function(o){return o.tr&&o.tr.id===x.id}))S.pend.push({t:'add',tr:x})});
      S.ghInit=true;save();
    }
    var pend=(S.pend||[]).slice();
    if(!pend.length){ghAdopt(remote);return}
    var data=Object.assign({},remote,{versao:1,atualizadoEm:new Date().toISOString(),trades:applyOps(remote.trades||[],pend),fechamentos:applyPx(remote.fechamentos,pend)});var a2=applyCfg(remote,pend);if(a2)data.alvos=a2;var m2=applyCfg(remote,pend,'metas');if(m2)data.metas=m2;var w2=applyCfg(remote,pend,'watch');if(w2)data.watch=w2;var i2=applyCfg(remote,pend,'idx');if(i2)data.idx=i2;var p2=applyCfg(remote,pend,'perfil');if(p2)data.perfil=p2;var t3=applyCfg(remote,pend,'teses');if(t3)data.teses=t3;var o3=applyCfg(remote,pend,'orc');if(o3)data.orc=o3;
    var body={message:'App: '+pend.length+(pend.length>1?' alterações':' alteração'),content:b64enc(JSON.stringify(data,null,1)+'\n'),sha:sha,branch:'main'};
    return ghReq('PUT',body).then(function(w){
      if((w.status===409||w.status===422)&&attempt<3)return new Promise(function(r){setTimeout(r,1500*(attempt+1))}).then(function(){return ghRound(attempt+1)});
      if(!w.ok)throw {status:w.status};
      S.pend=(S.pend||[]).slice(pend.length);save();ghAdopt(data);
    });
  });
}
function ghSync(manual){
  if(!S.keys.gh){renderSync();return}
  if(GH.busy){GH.again=true;return}
  GH.busy=true;renderSync();
  ghRound(0).then(function(){GH.last=Date.now();GH.err='';GH.hard=false;GH.retry=0},function(e){
    var st=e&&e.status,jsErr=!st&&e&&e.message&&e.name!=='AbortError'&&!/fetch|network|Load failed|NetworkError/i.test(e.message);
    GH.hard=st===401||st===403||st===404||!!jsErr;
    GH.err=st===401?'A chave do GitHub não foi aceita (errada ou vencida). Crie outra e cole em Ajustes.':st===403||(st===404&&GH.readOk)?'A chave do GitHub só tem permissão de leitura. No GitHub, edite a chave e mude "Conteúdo" para "Leitura e gravação".':st===404?'Não achei o repositório '+ghRepo()+' com essa chave. Confira o nome e se a chave dá acesso a ele.':'Sem conexão com o GitHub agora. Suas alterações ficam guardadas aqui e eu tento de novo.';
    if(jsErr)GH.err='O app teve um erro ao salvar na nuvem ('+String(e.message).slice(0,120)+'). Me mande um print desta mensagem.';
    if(!GH.hard&&(GH.retry||0)<6){GH.retry=(GH.retry||0)+1;setTimeout(function(){ghSync()},20000*GH.retry)}
    if(manual)warnIn(GH.err);
  }).then(function(){GH.busy=false;render();if(GH.again){GH.again=false;ghSync()}});
}
function renderSync(){
  var n=(S.pend||[]).length,hm=function(t){return new Date(t).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})},txt,bar='';
  if(!S.keys.gh){txt='Seus dados estão só neste aparelho. Cole a chave do GitHub para salvar tudo na nuvem automaticamente.';bar=''}
  else if(GH.busy){txt='Sincronizando com '+esc(ghRepo())+'...';bar=''}
  else if(GH.err){txt=esc(GH.err)+(n?' ('+n+(n>1?' alterações esperando':' alteração esperando')+')':'');bar=!n&&!GH.hard?'':'⚠ '+(n?n+(n>1?' alterações não salvas na nuvem':' alteração não salva na nuvem'):'Nuvem desconectada')}
  else if(GH.last){txt='Tudo salvo na nuvem ('+esc(ghRepo())+'). Última sincronização às '+hm(GH.last)+'. Lançou ou excluiu, salva sozinho.';bar=''}
  else{txt='Conectando...';bar=''}
  if(!bar&&typeof saudeProblemas==='function'){var sp=saudeProblemas();if(sp.length)bar='⚠ '+sp[0]+(sp.length>1?' +'+(sp.length-1):'')}
  if($('syncinfo'))setHtml($('syncinfo'),txt);
  if($('syncbar')){$('syncbar').textContent=bar;$('syncbar').className='pill'+(bar?' perr':'')}
}
try{if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('sw.js?v='+VERSAO)}catch(e){}
document.addEventListener('visibilitychange',function(){if(!document.hidden&&Date.now()-GH.last>60000)ghSync()});
