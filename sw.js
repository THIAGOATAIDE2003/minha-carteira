/* Aporte: abre sem internet. Página: rede primeiro, cópia salva se estiver offline. Fontes: cache. APIs nunca passam por aqui.
   A versão vem do app (sw.js?v=...): cada versão nova usa um cache novo e apaga os antigos. */
var V=new URL(self.location.href).searchParams.get('v')||'0',C='aporte-v'+V;
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(['./','index.html','style.css','tema.js','js/nucleo.js','js/proventos.js','js/ui.js','js/grafico.js','js/inicio.js','js/mercado.js','js/acao.js','js/risco.js','js/carteira.js','js/tela.js','js/metas-aporte-imposto.js','js/evolucao.js','js/dados.js','js/nuvem.js','js/atualizacao.js','js/perfil.js','js/assistente.js','js/noticias.js','js/bc.js','js/plano.js','js/politica.js','js/empresa.js','js/abas.js','manifest.webmanifest','icon.svg'])}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==C}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){
  var r=e.request,u=new URL(r.url);if(r.method!=='GET')return;
  if(u.origin===location.origin){
    var bu=new URL(r.url);bu.searchParams.set('_t',String(Math.floor(Date.now()/60000)));/* o GitHub Pages segura arquivos por até 10 min; o parâmetro muda a cada minuto e fura esse cache */
    e.respondWith(fetch(new Request(bu.href,{cache:'no-cache',credentials:r.credentials,mode:r.mode==='navigate'?'same-origin':r.mode})).then(function(res){if(res.ok){var cp=res.clone();caches.open(C).then(function(c){c.put(r,cp)})}return res}).catch(function(){return caches.match(r,{ignoreSearch:true}).then(function(m){return m||caches.match('index.html')})}));
  }else if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.match(r).then(function(m){return m||fetch(r).then(function(res){var cp=res.clone();caches.open(C).then(function(c){c.put(r,cp)});return res})}));
  }
});
