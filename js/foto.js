/* Aporte · js/foto.js — Foto diária das Ideias (1.66.0).
   Uma vez por dia, quando a lista de Ideias está completa (faixa calculada, sem "calculando"), o app grava no repositório privado de dados o arquivo
   dados/ideias/AAAA-MM-DD.json com data, ação, preço, faixa, confiança e motivo. Serve para medir depois como cada ideia se saiu em 3, 6 e 12 meses.
   Precisa do token do GitHub (o mesmo da nuvem). Um arquivo por dia: nunca sobrescreve (se já existe, só marca como feito). */
var FOTOQ=false,FOTOE=0;
function fotoKey(){return LS+'-foto'}
/* aviso discreto em Ajustes (#fotost): nada de falha silenciosa */
function fotoStLer(){try{return JSON.parse(localStorage.getItem(fotoKey()+'-st')||'null')}catch(e){return null}}
function fotoDmy(d){var a=String(d||'').split('-');return a.length===3?a[2]+'/'+a[1]:''}
function fotoTxt(){var s=fotoStLer();if(!s)return 'Foto diária das ideias: ainda não gravada (abra Mercado → Ideias).';
  return s.ok?'Última foto: '+fotoDmy(s.dia)+' ✓':'Foto não gravada: '+s.motivo+' ('+fotoDmy(s.dia)+')'}
function fotoMostra(){try{var e=document.getElementById('fotost');if(e)e.textContent=fotoTxt()}catch(x){}}
function fotoSt(ok,motivo,dia){var ant=fotoStLer();if(ok&&ant&&ant.ok&&ant.dia===dia)return;if(!ok&&ant&&!ant.ok&&ant.motivo===motivo&&ant.dia===dia)return;try{localStorage.setItem(fotoKey()+'-st',JSON.stringify({ok:ok,dia:dia,motivo:motivo||''}))}catch(e){}fotoMostra()}
function fotoFeita(){try{return localStorage.getItem(fotoKey())}catch(e){return null}}
function fotoMarca(d){try{localStorage.setItem(fotoKey(),d)}catch(e){}}
var fotoN=function(v){return v==null||!isFinite(v)?null:Math.round(v*100)/100};
function fotoLinha(o,st){var f=o.fx;return {tk:o.tk,st:st,preco:fotoN(o.d.price),cons:fotoN(f.cons),cen:fotoN(f.cen),oti:fotoN(f.oti),esp:fotoN(f.esp),ms:fotoN(f.ms*100),est:f.est,armadilha:f.trap||null,tipo:f.bank?'banco':f.seg?f.kind:null,
  ref:f.bank?{roe:fotoN(f.nm.med),custo:f.r,pvp_hoje:fotoN(f.pvpHoje),pvp_justo:fotoN(f.pr[1].pvp)}:f.seg?{pl_alvo:fotoN(f.pr[1].pl),pl_hoje:f.plHoje!=null?fotoN(f.plHoje):null,payout:f.pay!=null?fotoN(f.pay*100):null}:null,
  conf:o.cf?o.cf.n:null,qual:o.ql?{ap:o.ql.ap,ps:o.ql.ps}:null,nota:o.score!=null?fotoN(o.score):null,saude:o.sd?o.sd.mot:[],aviso:o.cf&&o.cf.aviso||null,motivo:st==='verificacao'&&o.cf?o.cf.w.slice(0,3):null}}
/* r = resultado de opData(); só monta se nada está pendente */
function fotoMontar(r,dia){if(!r||!r.D||!r.X)return null;
  var pend=r.D.concat(r.X).some(function(o){return o.fx&&o.fx.pend});if(pend)return null;
  var L=r.D.filter(function(o){return o.fx&&o.fx.ok}).map(function(o){return fotoLinha(o,'ideia')}).concat(r.X.filter(function(o){return o.fx&&o.fx.ok}).map(function(o){return fotoLinha(o,'verificacao')}));
  if(!L.length)return null;
  return {v:1,dia:dia,versao:VERSAO,gravado:new Date().toISOString(),regra:{motor:'faixa-unica',conservador:'margem p25 + múltiplo '+FXMC+'×',pesos:FXW,tolerancia:FXTOL,banco:'ROE p25; P/VP justo = (ROE − g) ÷ (custo − g); custo = média(Selic, Focus 2-3 anos) + '+BKPREM,seguradora:'lucro p25 × P/L p25 (histórico da ação)'},ideias:L}}
function fotoSalvar(r){var dia=today();if(FOTOQ||fotoFeita()===dia||Date.now()-FOTOE<6e5)return;
  var doc=fotoMontar(r,dia);if(!doc){if(r&&r.D&&r.X&&!r.D.concat(r.X).some(function(o){return o.fx&&o.fx.pend})){var st=fotoStLer();if(!st||st.dia!==dia)fotoSt(false,'não há ideias com faixa calculada hoje',dia)}return}
  if(!S.keys.gh){fotoSt(false,'sem token do GitHub (cole em Ajustes, na nuvem)',dia);return}
  FOTOQ=true;
  var c=new AbortController(),to=setTimeout(function(){c.abort()},15000);
  fetch('https://api.github.com/repos/'+ghRepo()+'/contents/dados/ideias/'+dia+'.json',{method:'PUT',signal:c.signal,cache:'no-store',headers:{'Authorization':'Bearer '+S.keys.gh,'Accept':'application/vnd.github+json'},
    body:JSON.stringify({message:'Foto das ideias '+dia,content:b64enc(JSON.stringify(doc))})})
    .then(function(x){clearTimeout(to);FOTOQ=false;if(x.ok||x.status===422||x.status===409){fotoMarca(dia);fotoSt(true,'',dia)}else{FOTOE=Date.now();fotoSt(false,x.status===401||x.status===403?'o token do GitHub não tem permissão (erro '+x.status+')':x.status===404?'repositório de dados não encontrado (erro 404)':'o GitHub recusou (erro '+x.status+')',dia);logErro('foto das ideias','HTTP '+x.status)}},
      function(e){clearTimeout(to);FOTOQ=false;FOTOE=Date.now();fotoSt(false,'sem conexão com o GitHub; tenta de novo em 10 minutos',dia);logErro('foto das ideias',errMsg(e,15))})}
fotoMostra();
