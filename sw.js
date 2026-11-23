/* Aporte: abre na hora e sem internet. Arquivos do app: cópia salva primeiro (a versão inteira é baixada junta, de uma vez só, quando muda).
   Versão nova: o app compara a versão (js/nucleo.js sem cache) e atualiza; a versão vem do app (sw.js?v=...), cada versão usa um cache novo e apaga os antigos.
   Fontes: cache. APIs nunca passam por aqui. */
var V=new URL(self.location.href).searchParams.get('v')||'0',C='aporte-v'+V;
var ARQ=['./','index.html','style.css','style-proventos.css','style-extras.css','style-cartao.css','tema.js','js/nucleo.js','js/proventos.js','js/ui.js','js/grafico.js','js/inicio.js','js/mercado.js','js/mercado-oportunidades.js','js/mercado-visao.js','js/mercado-ranking.js','js/mercado-setores.js','js/acao.js','js/acao-valor.js','js/acao-pagina.js','js/risco.js','js/carteira.js','js/tela.js','js/metas-aporte-imposto.js','js/evolucao.js','js/dados.js','js/nuvem.js','js/atualizacao.js','js/perfil.js','js/assistente.js','js/assistente-chat.js','js/assistente-relatorio.js','js/assistente-ferramentas.js','js/assistente-teste.js','js/assistente-memoria.js','js/assistente-calculos.js','js/assistente-voz.js','js/noticias.js','js/bc.js','js/plano.js','js/politica.js','js/empresa.js','js/resultados.js','js/historico.js','js/faixa.js','js/saude.js','js/qualidade.js','js/cartao.js','js/banco.js','js/seguradora.js','js/macro.js','js/parecer-nucleo.js','js/parecer.js','js/foto.js','js/tese.js','js/orcamento.js','js/organizar.js','js/abas.js','manifest.webmanifest','icon.svg'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return Promise.all(ARQ.map(function(u){return fetch(new Request(u,{cache:'reload'})).then(function(r){if(!r.ok)throw new Error(u+' '+r.status);return c.put(u,r)})}))}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==C}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){
  var r=e.request,u=new URL(r.url);if(r.method!=='GET')return;
  if(u.origin===location.origin){
    if(u.searchParams.has('_v')||r.cache==='no-store'||r.cache==='reload')return;/* conferência de versão e pedidos sem cache vão direto para a rede */
    e.respondWith(caches.match(r,{ignoreSearch:true}).then(function(m){
      if(m)return m;
      if(r.mode==='navigate')return caches.match('index.html').then(function(x){return x||fetch(r)});
      return fetch(r).then(function(res){if(res.ok){var cp=res.clone();caches.open(C).then(function(c){c.put(r,cp)})}return res});
    }));
  }else if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.match(r).then(function(m){return m||fetch(r).then(function(res){var cp=res.clone();caches.open(C).then(function(c){c.put(r,cp)});return res})}));
  }
});
