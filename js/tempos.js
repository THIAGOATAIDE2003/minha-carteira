/* Aporte · js/tempos.js — medidor de tempos (1.83.9, etapa 0 do plano de velocidade). SÓ OBSERVA: mede e mostra em Ajustes > Dados (quadro atualizado ao tocar, nunca dentro de render); não muda nenhum cálculo, nenhum dado e nenhuma chave existente do localStorage.
   Mede: abertura até o esqueleto (primeira pintura), abertura até a tela pronta (fim do carregamento), duração e quantidade dos redesenhos (render) e o tempo de abrir uma página de ação.
   Guarda só as últimas TMN aberturas na chave nova LS+'-tempos' (gravada ao sair do app, fora da nuvem); nada sai do aparelho e nenhuma medição usa temporizador ou rede. Qualquer erro aqui é engolido: o app segue igual.
   Carregado logo antes de abas.js (precisa de render, stkOpen e stkRender já definidos). */
var TMK=LS+'-tempos',TMN=20,TMH=[],TM={t:Date.now(),v:VERSAO,esq:null,uti:null,rn:0,ra:0,rt:0,rm:0,ac:[]},TMD=0,TMAC=null;
function tmNow(){try{return performance.now()}catch(e){return 0}}
try{var tm0=JSON.parse(localStorage.getItem(TMK)||'[]');TMH=Array.isArray(tm0)?tm0.filter(function(x){return x&&typeof x==='object'}).slice(-TMN):[]}catch(e){TMH=[]}
/* esqueleto: primeira pintura do navegador */
function tmEsq(){try{if(TM.esq==null){var p=performance.getEntriesByName('first-contentful-paint')[0];if(p)TM.esq=Math.round(p.startTime)}}catch(e){}return TM.esq}
try{if(window.PerformanceObserver)new window.PerformanceObserver(function(l){try{l.getEntries().forEach(function(p){if(p.name==='first-contentful-paint'&&TM.esq==null)TM.esq=Math.round(p.startTime)})}catch(e){}}).observe({type:'paint',buffered:true})}catch(e){}
/* tela pronta: scripts e primeiro desenho terminaram */
try{window.addEventListener('load',function(){try{TM.uti=Math.round(tmNow());tmEsq();tmDesenha()}catch(e){}})}catch(e){}
/* redesenhos: embrulha render() sem mudar o que ela faz (nem o que devolve) */
try{var tmRender0=window.render;window.render=function(){var t=tmNow(),r;TMD++;try{r=tmRender0.apply(this,arguments)}finally{TMD--;try{if(!TMD&&typeof BOOT!=='undefined'&&BOOT){var d=tmNow()-t;TM.rn++;TM.rt+=d;if(d>TM.rm)TM.rm=d;if(t<5000)TM.ra++}}catch(e){}}return r}}catch(e){}
/* página de ação: do toque até o primeiro desenho com dados */
try{var tmOpen0=window.stkOpen;window.stkOpen=function(tk){try{TMAC={tk:tk,t:tmNow()}}catch(e){}return tmOpen0.apply(this,arguments)}}catch(e){}
try{var tmSR0=window.stkRender;window.stkRender=function(){var r=tmSR0.apply(this,arguments);try{if(TMAC&&STK&&STK.tk===TMAC.tk&&STK.d){if(TM.ac.length<10)TM.ac.push(Math.round(tmNow()-TMAC.t));TMAC=null;tmDesenha()}}catch(e){}return r}}catch(e){}
/* gravação: só ao sair do app (nenhum custo durante o uso); as últimas TMN aberturas */
function tmSalva(){try{var a=TMH.concat([TM]).slice(-TMN),o=[];a.forEach(function(x){o.push({t:x.t,v:x.v,esq:x.esq,uti:x.uti,rn:x.rn,ra:x.ra,rt:Math.round(x.rt),rm:Math.round(x.rm),ac:x.ac})});localStorage.setItem(TMK,JSON.stringify(o))}catch(e){}}
try{document.addEventListener('visibilitychange',function(){if(document.hidden)tmSalva()});window.addEventListener('pagehide',tmSalva)}catch(e){}
/* texto em português simples */
function tmMs(v){return v==null||!isFinite(v)?'—':v>=1000?(Math.round(v/100)/10).toString().replace('.',',')+' s':Math.round(v)+' ms'}
function tmMed(a){a=a.filter(function(x){return x!=null&&isFinite(x)}).sort(function(x,y){return x-y});if(!a.length)return null;var m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2}
function tmLinhas(){var all=TMH.concat([TM]).slice(-TMN),md=function(k){return tmMed(all.map(function(x){return x[k]}))},ac=[];all.forEach(function(x){(x.ac||[]).forEach(function(v){ac.push(v)})});tmEsq();
  var med=TM.rn?TM.rt/TM.rn:null;
  return [['Esqueleto da tela (nesta abertura)',tmMs(TM.esq)],['Tela pronta para usar (nesta abertura)',tmMs(TM.uti)],
    ['Redesenhos nesta abertura',TM.rn+' (média '+tmMs(med)+', o maior '+tmMs(TM.rm)+'; '+TM.ra+' nos primeiros 5 s)'],
    ['Abrir página de ação (última)',TM.ac.length?tmMs(TM.ac[TM.ac.length-1]):(ac.length?tmMs(ac[ac.length-1]):'—')],
    ['Mediana ('+all.length+(all.length===1?' abertura':' aberturas')+'): esqueleto / pronta',tmMs(md('esq'))+' / '+tmMs(md('uti'))],
    ['Mediana da página de ação ('+ac.length+(ac.length===1?' vez':' vezes')+')',tmMs(tmMed(ac))]]}
function tmTexto(){var L=tmLinhas(),all=TMH.concat([TM]).slice(-10),t='Aporte '+VERSAO+' · medidor de tempos · '+new Date().toLocaleString('pt-BR')+'\n'+L.map(function(r){return r[0]+': '+r[1]}).join('\n')+'\nÚltimas aberturas (esqueleto, pronta, redesenhos, ação):';
  all.forEach(function(x){t+='\n'+new Date(x.t).toLocaleString('pt-BR')+' v'+x.v+' · '+tmMs(x.esq)+' · '+tmMs(x.uti)+' · '+x.rn+' · '+((x.ac||[]).map(tmMs).join(', ')||'—')});return t}
function tmDesenha(){try{var el=document.getElementById('tmbox');if(!el||el.hidden)return;var L=tmLinhas();
  setHtml(el,'<h2>Velocidade do app '+bal('Mede quanto tempo o app leva para abrir e para redesenhar a tela, só neste aparelho. Guarda as últimas '+TMN+' aberturas e não envia nada para fora. Use "Copiar resumo" e cole na conversa para eu ver os números do seu celular.')+'</h2><ul class="calc">'+L.map(function(r){return '<li><span>'+esc(r[0])+'</span><b class="num">'+esc(r[1])+'</b></li>'}).join('')+'</ul><div class="row" style="gap:8px;margin-top:10px"><button type="button" class="asclr" id="tm-copia">Copiar resumo</button><button type="button" class="asclr" id="tm-limpa">Limpar medições</button><span class="small muted" id="tm-msg"></span></div>')}catch(e){}}
function tmMsg(t){try{var m=document.getElementById('tm-msg');if(m)m.textContent=t}catch(e){}}
function tmCopia(){var t=tmTexto(),ok=function(){tmMsg('Copiado')},velho=function(){try{var a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0';document.body.appendChild(a);a.select();var r=document.execCommand('copy');document.body.removeChild(a);tmMsg(r?'Copiado':'Não consegui copiar')}catch(e){tmMsg('Não consegui copiar')}};
  try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,velho);else velho()}catch(e){velho()}}
function tmLimpa(){try{TMH=[];TM.rn=0;TM.ra=0;TM.rt=0;TM.rm=0;TM.ac=[];localStorage.removeItem(TMK);tmDesenha();tmMsg('Medições apagadas')}catch(e){}}
var TMRAF=0;
/* o quadro de Ajustes é refeito quando abre (qualquer toque) e nos dois botões; nunca dentro de render() */
try{document.addEventListener('click',function(ev){try{var t=ev.target&&ev.target.closest?ev.target.closest('#tm-copia,#tm-limpa'):null;if(t){if(t.id==='tm-copia')tmCopia();else tmLimpa();return}
  if(!TMRAF&&window.requestAnimationFrame)TMRAF=requestAnimationFrame(function(){TMRAF=0;try{var el=document.getElementById('tmbox');if(el&&el.offsetParent)tmDesenha()}catch(e){}})}catch(e){}})}catch(e){}
