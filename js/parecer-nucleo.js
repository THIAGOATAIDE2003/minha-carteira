/* Aporte · js/parecer-nucleo.js — Parecer da IA, parte pura (1.70.0).
   Aqui ficam só o pedido para a IA e o VALIDADOR de números. Não usa tela nem estado do app, para rodar igual no navegador e no Node (teste de consistência).
   Regra: a IA interpreta, não calcula. Todo número do texto precisa existir no pacote que o app mandou (com arredondamento); senão o parecer é descartado. */
var PARFIM='Material para estudo, não é recomendação de compra.';
var PARTIT=['Resumo','O que está a favor','O que preocupa','O que me faria estar errado','O que acompanhar no próximo balanço'];
var PARLEI=['a favor','equilibrada','com cautela'];
var PARSYS='Você escreve um parecer curto e honesto sobre UMA ação brasileira para um investidor iniciante, em português simples.\n'+
'Você recebe um PACOTE em JSON com os números que o app já calculou. Use SÓ o que está no pacote.\n'+
'REGRAS DURAS:\n'+
'- Não invente nem calcule nenhum número. Não some, não divida, não converta (nada de bilhões a partir de milhões, nada de porcentagem nova). Copie os números do pacote, na mesma unidade (valores em milhões continuam em milhões), com vírgula decimal. Escreva todos os números com dígitos.\n'+
'- Não use número que não esteja no pacote, nem exemplos numéricos, nem datas além das do pacote. Prefira poucos números e bem escolhidos.\n'+
'- Não preveja preço, não dê probabilidade e não diga para comprar ou vender.\n'+
'- Se "limitacoes" tiver itens, ou a confiança for baixa, ou faltar dado, a PRIMEIRA frase do Resumo diz isso (por exemplo "A confiança nos dados é baixa: ...") e você não tira conclusão forte; a Leitura deve ser "equilibrada" ou "com cautela".\n'+
'- Seja o advogado do diabo: em "O que preocupa", tente derrubar a tese com o que o próprio pacote mostra.\n'+
'FORMATO FIXO (exatamente estes 5 títulos, nesta ordem, cada um numa linha começando com ##):\n'+
'## Resumo\n(2 linhas. Na última linha, escreva exatamente "Leitura: a favor", "Leitura: equilibrada" ou "Leitura: com cautela".)\n'+
'## O que está a favor\n(2 a 3 itens curtos começando com "- ")\n'+
'## O que preocupa\n(2 a 3 itens curtos começando com "- ")\n'+
'## O que me faria estar errado\n(1 a 2 itens curtos começando com "- ")\n'+
'## O que acompanhar no próximo balanço\n(2 a 3 itens curtos começando com "- ")\n'+
'No máximo 230 palavras no total. Não escreva mais nada depois do último item (a frase final é acrescentada pelo app).';
/* --- números --- */
function parNums(txt){var s=String(txt==null?'':txt).replace(/[−–]/g,'-'),m=s.match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?/g)||[];
  return m.map(function(x){var d=0,v;if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(x)){var p=x.split(',');d=p[1]?p[1].length:0;v=parseFloat(p[0].replace(/\./g,'')+(p[1]?'.'+p[1]:''))}
    else{var q=x.split(/[.,]/);d=q[1]?q[1].length:0;v=parseFloat(x.replace(',','.'))}return {v:v,d:d,s:x}})}
/* todos os números do pacote: valores numéricos e números dentro dos textos */
function parColeta(x,out){if(x==null)return out;if(typeof x==='number'){if(isFinite(x))out.push(x)}else if(typeof x==='string')parNums(x).forEach(function(n){out.push(n.v)});else if(Array.isArray(x))x.forEach(function(y){parColeta(y,out)});else if(typeof x==='object')Object.keys(x).forEach(function(k){parColeta(x[k],out)});return out}
function parPermitidos(pk){return parColeta(pk,[]).map(Math.abs)}
function parAchou(n,perm){for(var i=0;i<perm.length;i++){var p=perm[i];if(Math.abs(+p.toFixed(n.d)-n.v)<1e-9)return true;if(n.d===0&&Math.abs(Math.round(p)-n.v)<1e-9)return true}return false}
/* tira a frase final e o espaço extra; o app acrescenta PARFIM sozinho */
function parLimpa(txt){var t=String(txt||'').replace(/\r/g,'').trim();t=t.replace(/\s*Material para estudo[^\n]*$/i,'').trim();return t}
/* devolve {ok, motivo, extras:[números fora do pacote], leitura} */
function parValida(txt,pk){var t=parLimpa(txt);if(!t)return {ok:false,motivo:'resposta vazia',extras:[]};
  var hs=t.split('\n').filter(function(l){return /^##\s/.test(l)}).map(function(l){return l.replace(/^##\s*/,'').trim()});
  if(hs.length!==PARTIT.length||PARTIT.some(function(x,i){return hs[i]!==x}))return {ok:false,motivo:'estrutura fora do formato (títulos)',extras:[]};
  var lm=t.match(/Leitura:\s*(a favor|equilibrada|com cautela)/i);if(!lm)return {ok:false,motivo:'faltou a linha "Leitura:"',extras:[]};
  var perm=parPermitidos(pk),ext=[];parNums(t.replace(/Leitura:\s*(a favor|equilibrada|com cautela)/i,'')).forEach(function(n){if(!parAchou(n,perm))ext.push(n.s)});
  if(ext.length)return {ok:false,motivo:'número fora do pacote: '+ext.slice(0,4).join(', '),extras:ext};
  if(/\b(compre|comprar agora|venda tudo|vender tudo)\b/i.test(t))return {ok:false,motivo:'linguagem de recomendação',extras:[]};
  var lim=pk&&pk.limitacoes&&pk.limitacoes.length||(pk&&pk.confianca&&pk.confianca.nivel==='Baixa');
  if(lim){var ini=t.split('## O que está a favor')[0];if(!/(confian[çc]a|limita|falta|faltam|indispon|dado|verifica)/i.test(ini))return {ok:false,motivo:'confiança baixa ou dado faltando não foi avisado no início',extras:[]};if(lm[1].toLowerCase()==='a favor')return {ok:false,motivo:'conclusão forte com confiança baixa',extras:[]}}
  return {ok:true,motivo:'',extras:[],leitura:lm[1].toLowerCase(),texto:t+'\n\n'+PARFIM}}
