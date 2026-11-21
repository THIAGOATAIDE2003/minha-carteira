/* Aporte · js/assistente-voz.js — voz do assistente: ditar a pergunta (microfone) e ouvir a resposta. Usa o reconhecimento e a voz do próprio navegador/celular: grátis, sem chave. Mesmo escopo global; a ordem de carga importa. */
var ASV={rec:null,on:false,txt:'',err:'',byVoice:false,read:0,fala:-1};
try{ASV.read=localStorage.getItem(LS+'-asvoz')==='1'?1:0}catch(e){}
function asvSR(){return window.SpeechRecognition||window.webkitSpeechRecognition}
/* tira o markdown e deixa o valor em reais falável */
function asvTexto(t){return String(t||'').replace(/\*\*|`|_{2}/g,'').replace(/^\s*#{1,4}\s+/gm,'').replace(/^\s*(?:[-•*]|\d+[.)])\s+/gm,'').replace(/R\$\s*([\d.,]+)/g,'$1 reais').replace(/\s*\n+\s*/g,'. ').replace(/\.\s*\./g,'.')}
function asvParar(){try{if(window.speechSynthesis)window.speechSynthesis.cancel()}catch(e){}if(ASV.on&&ASV.rec){try{ASV.rec.abort()}catch(e){}}ASV.fala=-1;asvUI()}
/* fala em pedaços de frase (o Chrome corta falas muito longas) */
function asvFalar(t){if(!window.speechSynthesis)return;try{window.speechSynthesis.cancel()}catch(e){}
  var ps=asvTexto(t).match(/[^.!?;:]+[.!?;:]*\s*/g)||[],blocos=[],cur='';ps.forEach(function(p){if((cur+p).length>180&&cur){blocos.push(cur);cur=''}cur+=p});if(cur)blocos.push(cur);
  blocos.forEach(function(b,i){var u=new window.SpeechSynthesisUtterance(b.trim());u.lang='pt-BR';u.rate=1.05;if(i===blocos.length-1)u.onend=u.onerror=function(){ASV.fala=-1;asvUI()};try{window.speechSynthesis.speak(u)}catch(e){}})}
function asvOuvir(i){var x=AS.m[i];if(!x||!x.t)return;if(ASV.fala===i){asvParar();return}asvParar();ASV.fala=i;asvFalar(x.t);asvUI()}
/* depois de uma resposta: lê em voz alta se a pergunta foi falada ou se "ler respostas" está ligado */
function asvFim(a){var voz=ASV.byVoice||ASV.read;ASV.byVoice=false;if(voz&&a&&a.t&&!a.e){ASV.fala=AS.m.indexOf(a);asvFalar(a.t);asvUI()}}
function asvToggle(){ASV.read=ASV.read?0:1;try{localStorage.setItem(LS+'-asvoz',String(ASV.read))}catch(e){}if(!ASV.read)asvParar();asvUI()}
function asvMic(){var SR=asvSR();if(!SR||AS.busy)return;if(ASV.on){try{ASV.rec.stop()}catch(e){}return}
  try{if(window.speechSynthesis)window.speechSynthesis.cancel()}catch(e){}
  var r=new SR(),q=$('as-q');r.lang='pt-BR';r.interimResults=true;r.continuous=false;r.maxAlternatives=1;ASV.txt='';ASV.err='';ASV.rec=r;
  r.onresult=function(e){var s='';for(var i=0;i<e.results.length;i++)s+=e.results[i][0].transcript;ASV.txt=s;q.value=s;q.dispatchEvent(new Event('input'))};
  r.onerror=function(e){ASV.err=e&&e.error||'erro'};
  r.onend=function(){ASV.on=false;var t=ASV.txt.trim(),er=ASV.err;asvUI();
    if(t&&(!er||er==='no-speech'||er==='aborted')){ASV.byVoice=true;asAsk(q.value);q.value='';q.style.height='';return}
    if(er==='not-allowed'||er==='service-not-allowed'){q.placeholder='Libere o microfone nas permissões do navegador';setTimeout(asvUI,4000)}
    else if(er&&er!=='aborted'&&er!=='no-speech'){q.placeholder='Não consegui ouvir. Tente de novo.';setTimeout(asvUI,3000)}};
  ASV.on=true;asvUI();try{r.start()}catch(e){ASV.on=false;asvUI()}}
function asvUI(){var m=$('as-mic'),v=$('as-v'),q=$('as-q');
  if(m){m.hidden=!asvSR();m.classList.toggle('on',ASV.on);m.setAttribute('aria-label',ASV.on?'Parar de ouvir':'Falar')}
  if(v){v.hidden=!window.speechSynthesis;v.classList.toggle('on',!!ASV.read);v.setAttribute('aria-pressed',ASV.read?'true':'false')}
  if(q)q.placeholder=ASV.on?'Ouvindo…':'Pergunte sobre sua carteira'}
asvUI();
