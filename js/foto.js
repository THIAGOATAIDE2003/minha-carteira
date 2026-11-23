/* Aporte · js/foto.js — Foto diária das Ideias (1.66.0).
   Uma vez por dia, quando a lista de Ideias está completa (faixa calculada, sem "calculando"), o app grava no repositório privado de dados o arquivo
   dados/ideias/AAAA-MM-DD.json com data, ação, preço, faixa, confiança e motivo. Serve para medir depois como cada ideia se saiu em 3, 6 e 12 meses.
   Precisa do token do GitHub (o mesmo da nuvem). Um arquivo por dia: nunca sobrescreve (se já existe, só marca como feito). */
var FOTOQ=false,FOTOE=0;
function fotoKey(){return LS+'-foto'}
function fotoFeita(){try{return localStorage.getItem(fotoKey())}catch(e){return null}}
function fotoMarca(d){try{localStorage.setItem(fotoKey(),d)}catch(e){}}
var fotoN=function(v){return v==null||!isFinite(v)?null:Math.round(v*100)/100};
function fotoLinha(o,st){var f=o.fx;return {tk:o.tk,st:st,preco:fotoN(o.d.price),cons:fotoN(f.cons),cen:fotoN(f.cen),oti:fotoN(f.oti),esp:fotoN(f.esp),ms:fotoN(f.ms*100),est:f.est,armadilha:f.trap||null,
  conf:o.cf?o.cf.n:null,nota:o.score!=null?fotoN(o.score):null,saude:o.sd?o.sd.mot:[],aviso:o.cf&&o.cf.aviso||null,motivo:st==='verificacao'&&o.cf?o.cf.w.slice(0,3):null}}
/* r = resultado de opData(); só monta se nada está pendente */
function fotoMontar(r,dia){if(!r||!r.D||!r.X)return null;
  var pend=r.D.concat(r.X).some(function(o){return o.fx&&o.fx.pend});if(pend)return null;
  var L=r.D.filter(function(o){return o.fx&&o.fx.ok}).map(function(o){return fotoLinha(o,'ideia')}).concat(r.X.filter(function(o){return o.fx&&o.fx.ok}).map(function(o){return fotoLinha(o,'verificacao')}));
  if(!L.length)return null;
  return {v:1,dia:dia,versao:VERSAO,gravado:new Date().toISOString(),regra:{conservador:'margem p25 + múltiplo '+FXMC+'×',pesos:FXW,tolerancia:FXTOL},ideias:L}}
function fotoSalvar(r){var dia=today();if(FOTOQ||!S.keys.gh||fotoFeita()===dia||Date.now()-FOTOE<6e5)return;
  var doc=fotoMontar(r,dia);if(!doc)return;FOTOQ=true;
  var c=new AbortController(),to=setTimeout(function(){c.abort()},15000);
  fetch('https://api.github.com/repos/'+ghRepo()+'/contents/dados/ideias/'+dia+'.json',{method:'PUT',signal:c.signal,cache:'no-store',headers:{'Authorization':'Bearer '+S.keys.gh,'Accept':'application/vnd.github+json'},
    body:JSON.stringify({message:'Foto das ideias '+dia,content:b64enc(JSON.stringify(doc))})})
    .then(function(x){clearTimeout(to);FOTOQ=false;if(x.ok||x.status===422||x.status===409)fotoMarca(dia);else{FOTOE=Date.now();logErro('foto das ideias','HTTP '+x.status)}},
      function(e){clearTimeout(to);FOTOQ=false;FOTOE=Date.now();logErro('foto das ideias',errMsg(e,15))})}
