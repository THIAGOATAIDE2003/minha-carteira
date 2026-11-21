/* Aporte · js/assistente-memoria.js — a assistente lembra o que você pede ("lembre que…", "anote…", "minha tese…") e usa junto com os dados atuais; também: descrição do investidor sempre atual no prompt e botão "Tentar de novo" em respostas com erro ou interrompidas. Mesmo escopo global; a ordem de carga importa. */
var ASM=[];try{ASM=JSON.parse(localStorage.getItem(LS+'-asmem')||'[]')||[]}catch(e){ASM=[]}
function asmSave(){try{localStorage.setItem(LS+'-asmem',JSON.stringify(ASM.slice(0,40)))}catch(e){}}
/* salva só frases afirmativas (pergunta com "?" nunca vira memória) */
var ASMRE=/\b(lembre|lembra|anote|anota|guarde|guarda|memorize|registre|nao esqueca)\b|minha tese|minha regra|meu objetivo|vou vender se|vou comprar se/;
function asmNota(q){q=String(q||'').trim();if(!q||/\?/.test(q)||!ASMRE.test(asNorm(q)))return;
  q=q.slice(0,400);ASM=ASM.filter(function(n){return n.t!==q});ASM.unshift({id:'m'+Date.now().toString(36),t:q,at:Date.now(),tk:asFind(q)});ASM=ASM.slice(0,40);asmSave()}
/* memórias da empresa citada + as gerais; tudo se a pergunta fala em tese/decisão */
function asmCtxT(q){if(!ASM.length)return '';var n=asNorm(q),tks=asFind(q),all=/tese|lembr|decid|anotei|combinamos|minha regra|objetivo/.test(n),
  rel=ASM.filter(function(m){return all||!m.tk.length||m.tk.some(function(t){return tks.indexOf(t)>=0})}).slice(0,8);if(!rel.length)return '';
  var tot=0,L=rel.map(function(m){var d=new Date(m.at);return '- ['+fmtDate(d.toISOString().slice(0,10))+'] '+m.t}).filter(function(l){tot+=l.length;return tot<2000});
  return '\n\nMEMÓRIAS DO THIAGO (ele pediu para a assistente lembrar; use junto com os dados atuais e diga se algo mudou ou contradiz):\n'+L.join('\n')}
function asmHtml(){if(!ASM.length)return '<p class="asi" style="margin-top:16px">Memória vazia. Escreva, por exemplo, "lembre que minha tese de BBSE3 é dividendos" e eu guardo aqui.</p>';
  return '<div class="ashl" style="margin-top:18px"><b style="font-size:14px">Memória da assistente</b>'+ASM.map(function(m){var d=new Date(m.at);return '<div class="ashi"><div class="asho"><b style="white-space:normal;font-weight:500">'+esc(m.t)+'</b><small>'+d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+'</small></div><button type="button" class="asdel" data-asmdel="'+esc(m.id)+'" aria-label="Apagar memória">✕</button></div>'}).join('')+'</div>'}
function asmApagar(id){ASM=ASM.filter(function(m){return m.id!==id});asmSave();asRender()}
function asRetry(){if(AS.busy)return;var i=AS.m.length-1;if(i<1||AS.m[i].r!=='a'||AS.m[i-1].r!=='u')return;var q=AS.m[i-1].t;AS.m.splice(i-1,2);asAsk(q)}
/* descrição do investidor sempre atual (em vez de um texto fixo) + regra das memórias */
var ASSYS0=ASSYS;
function asSysAtual(){var d='investidor pessoa física no Brasil';try{var R=compute(),tk=R.held.map(function(x){return x.p.ticker}).slice(0,15);d+=tk.length?', com esta carteira hoje: '+tk.join(', ')+(R.held.length>15?' e outros':'')+(R.tot.rfV?' e renda fixa':''):(R.tot.rfV?', com renda fixa':'')}catch(e){}
  ASSYS=ASSYS0.replace('(investidor pessoa física no Brasil, com ações da B3, o ETF VT nos EUA e renda fixa)','('+d+')')+'\n\nMEMÓRIAS: se o contexto tiver MEMÓRIAS DO THIAGO, trate como o que ele pensa e decidiu (teses, regras, objetivos). Compare com os dados atuais e diga com clareza se algo mudou ou contradiz a tese. Se ele acabou de pedir para lembrar algo, confirme em uma frase o que foi anotado. Nunca invente memórias.';return ASSYS}
