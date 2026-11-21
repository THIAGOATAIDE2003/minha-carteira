/* Aporte · js/perfil.js — perfil do investidor.
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
/* ===== Perfil do investidor: objetivo, prazo, quanto aguenta cair... usado no Risco, no assistente, no garimpo e no Aporte ===== */
var PFQ=[
  ['obj','Qual é o seu objetivo principal?',[['renda','Viver de renda','receber dividendos todo mês'],['cresc','Crescer o patrimônio','ver o dinheiro multiplicar'],['ambos','Os dois','um pouco de cada']]],
  ['prazo','Quando pretende usar esse dinheiro?',[['5','Em até 5 anos'],['10','De 5 a 10 anos'],['20','De 10 a 20 anos'],['30','Daqui a mais de 20 anos']]],
  ['reac','Se a carteira cair 20% em um mês, você...',[['vende','Vende para não perder mais'],['espera','Espera passar'],['compra','Aproveita para comprar mais']]],
  ['queda','Quanto aceita ver a carteira cair, no pior momento, sem perder o sono?',[['10','Até 10%'],['20','Até 20%'],['30','Até 30%'],['40','Mais de 30%']]],
  ['ext','Quanto quer ter no exterior (em dólar)?',[['15','Pouco (até 20%)'],['30','Médio (20 a 40%)'],['50','Bastante (40 a 60%)'],['65','Muito (mais de 60%)']]],
  ['rf','Quanto quer ter em renda fixa?',[['0','Nada'],['10','Uns 10%'],['20','Uns 20%'],['35','30% ou mais']]],
  ['res','Já tem reserva de emergência (uns 6 meses de gastos guardados)?',[['sim','Sim, completa'],['parcial','Uma parte'],['nao','Ainda não']]]];
var PFD=null;
function pfOk(){var p=S.perfil;return p&&p.obj&&p.prazo&&p.queda?p:null}
function pfOpt(k,v){var q=PFQ.filter(function(x){return x[0]===k})[0];if(!q)return null;var o=q[2].filter(function(x){return x[0]===String(v)})[0];return o?o[1]:null}
/* nível de risco que combina com as respostas */
function pfTipo(p){p=p||pfOk();if(!p)return null;var s=0;s+=p.prazo==='5'?0:p.prazo==='10'?1:p.prazo==='20'?2:3;s+=p.reac==='vende'?0:p.reac==='espera'?1.5:3;s+=+p.queda<=10?0:+p.queda<=20?1:+p.queda<=30?2:3;
  return s<=3?['Conservador','prefere segurança, aceita ganhar menos para cair pouco']:s<=6?['Moderado','aceita algumas quedas para ganhar mais no longo prazo']:['Arrojado','aguenta quedas fortes em troca de mais retorno no longo prazo']}
function pfAlvo(p){p=p||pfOk();if(!p)return null;var us=+p.ext||0,rf=+p.rf||0;if(us+rf>100)us=100-rf;return {BR:100-us-rf,US:us,RF:rf}}
function pfResumo(p){var t=pfTipo(p),a=pfAlvo(p);return [['Perfil',t?t[0]:'—'],['Objetivo',pfOpt('obj',p.obj)],['Prazo',pfOpt('prazo',p.prazo)],['Se cair 20%',pfOpt('reac',p.reac)],['Aceita cair',pfOpt('queda',p.queda)],['Aporte por mês',p.ap>0?brl.format(p.ap):'—'],['Divisão ideal',a?'Brasil '+a.BR+'% · exterior '+a.US+'% · renda fixa '+a.RF+'%':'—'],['Reserva',pfOpt('res',p.res)]]}
function pfBox(){var el=$('perfbox');if(!el)return;var p=pfOk(),t=pfTipo(p);
  setHtml(el,'<h2>Seu perfil de investidor '+bal('Suas respostas sobre objetivo, prazo e quanto aceita perder. O app usa isso para dizer se o risco da carteira combina com você, para o assistente responder pensando no seu objetivo, para ordenar o garimpo e para sugerir a divisão do aporte.')+'</h2>'+
    (p?'<div class="pfhd"><b>'+t[0]+'</b><span>'+t[1]+'</span></div><dl class="pfdl">'+pfResumo(p).slice(1).map(function(r){return '<div><dt>'+r[0]+'</dt><dd>'+esc(r[1]||'—')+'</dd></div>'}).join('')+'</dl><button type="button" class="btn small" data-pf="open">Refazer perfil</button>'
      :'<p class="muted" style="margin:0 0 12px">Responda 8 perguntas rápidas (uns 2 minutos). Assim o app compara o risco da carteira com o que você aguenta e o assistente responde pensando no seu objetivo.</p><button type="button" class="btn" data-pf="open">Responder perfil</button>'))}
function pfSheet(){var d=PFD,n=PFQ.filter(function(q){return d[q[0]]!=null}).length+(d.ap>0?1:0),tot=PFQ.length+1;
  var h='<div class="sheet" id="pfsheet"><div class="sbox big" role="dialog" aria-label="Perfil do investidor"><div class="shd"><b>Perfil do investidor</b><button type="button" class="shx" data-pf="close" aria-label="Fechar">✕</button></div><div class="sbd">'+
    '<div class="pfpr"><i style="width:'+Math.round(n/tot*100)+'%"></i></div>'+
    (function(){var c=0;return PFQ.map(function(q){var x='<h3>'+(++c)+'. '+q[1]+'</h3><div class="pfop">'+q[2].map(function(o){return '<button type="button" data-pf="'+q[0]+':'+o[0]+'" aria-pressed="'+(String(d[q[0]])===o[0])+'"><b>'+o[1]+'</b>'+(o[2]?'<small>'+o[2]+'</small>':'')+'</button>'}).join('')+'</div>';
      if(q[0]==='queda')x+='<h3>'+(++c)+'. Quanto pretende investir por mês?</h3><input id="pf-ap" inputmode="decimal" placeholder="1.000,00" value="'+(d.ap>0?String(d.ap).replace('.',','):'')+'" aria-label="Aporte por mês em reais">';return x}).join('')})()+
    (d.ext!=null&&d.rf!=null?'<p class="note" style="margin-top:14px">Divisão ideal pelas suas respostas: <b>Brasil '+pfAlvo(d).BR+'%</b>, <b>exterior '+pfAlvo(d).US+'%</b> e <b>renda fixa '+pfAlvo(d).RF+'%</b>. Dá para ajustar depois em Carteira → Aporte.</p>':'')+
    '<p class="msg" id="pf-msg"></p></div><div class="sft"><button type="button" class="link" data-pf="close">Cancelar</button><button type="button" class="btn" data-pf="save">Salvar perfil</button></div></div></div>';
  var o=$('pfsheet');if(o)setHtml(o,h,'troca');else setHtml(document.body,h,'add')}
function pfOpen(){PFD=Object.assign({},S.perfil||{});pfSheet();document.body.style.overflow='hidden'}
function pfClose(){var o=$('pfsheet');if(o)o.remove();PFD=null;document.body.style.overflow=''}
function pfReadAp(){var i=$('pf-ap');if(!i||!PFD)return;var r=String(i.value||'').trim(),v=/^\d{1,3}(\.\d{3})+$/.test(r)?parseFloat(r.replace(/\./g,'')):parseNum(r);PFD.ap=v>0?v:0}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-pf]');if(!b)return;var k=b.getAttribute('data-pf');
  if(k==='open'){pfOpen();return}if(k==='close'){pfClose();return}
  if(k==='save'){pfReadAp();var miss=PFQ.filter(function(q){return PFD[q[0]]==null});if(miss.length){var m=$('pf-msg');m.className='msg err';m.textContent=miss.length===1?'Falta responder a pergunta: '+miss[0][1]:'Faltam '+miss.length+' perguntas para responder.';return}
    PFD.at=today();if(PFD.ap>0&&!APV)APV=String(PFD.ap).replace('.',',');S.perfil=PFD;S.pend.push({t:'cfg',k:'perfil',v:PFD});save();pfClose();RKC={};OPC={};render();pfBox();ghSync();return}
  var i=k.indexOf(':');if(i<0||!PFD)return;pfReadAp();PFD[k.slice(0,i)]=k.slice(i+1);var sc=document.querySelector('#pfsheet .sbd'),y=sc?sc.scrollTop:0;pfSheet();var sc2=document.querySelector('#pfsheet .sbd');if(sc2)sc2.scrollTop=y});
/* risco x perfil: entra no diagnóstico do Risco */
function pfRisco(P,T,uS){var p=pfOk();if(!p)return [['at','Responda seu perfil de investidor','Assim o app diz se esse risco combina com você. <button type="button" class="link" data-pf="open">Responder agora</button>']];
  var out=[],tol=+p.queda/100,t=pfTipo(p);
  if(P&&P.dd!=null){var dd=Math.abs(P.dd);out.push([dd>tol*1.15?'al':dd>tol*0.85?'at':'ok',dd>tol*1.15?'A carteira já caiu mais do que você aguenta':dd>tol*0.85?'Perto do limite que você aguenta':'Combina com o que você aguenta',
    'Você disse que aceita ver a carteira cair <b>'+(p.queda==='40'?'mais de 30%':'até '+p.queda+'%')+'</b>. Com os ativos de hoje, a pior queda dos últimos anos foi de <b>'+pf.format(dd*100)+'%</b>'+(dd>tol*1.15?'. Se acontecer de novo, pode ser difícil segurar: vale ter mais renda fixa ou ativos mais calmos.':'.')+' Seu perfil: <b>'+t[0].toLowerCase()+'</b>.'])}
  var a=pfAlvo(p);if(a&&uS!=null){var d=uS*100-a.US;if(Math.abs(d)>=15)out.push(['at','Exterior '+(d>0?'acima':'abaixo')+' do que você quer','Hoje <b>'+pf.format(uS*100)+'%</b> está em dólar; no seu perfil você quer uns <b>'+a.US+'%</b>. Dá para ajustar com os próximos aportes (Carteira → Aporte).'])}
  if(p.res==='nao'||p.res==='parcial')out.push([p.res==='nao'?'al':'at','Reserva de emergência '+(p.res==='nao'?'ainda não montada':'incompleta'),'Sem reserva, um imprevisto pode obrigar você a vender ações numa hora ruim. O comum é guardar uns 6 meses de gastos em renda fixa com liquidez diária antes de aumentar o risco.']);
  if(p.prazo==='5'&&P&&P.vol!=null&&P.vol>0.12)out.push(['at','Prazo curto para tanta oscilação','Você pretende usar o dinheiro em até 5 anos, e a carteira oscila uns '+pf.format(P.vol*100)+'% ao ano. Em prazo curto, uma queda pode não dar tempo de voltar.']);
  return out}
function pfCtx(){var p=pfOk();if(!p)return 'PERFIL DO INVESTIDOR: ainda não respondido.';return 'PERFIL DO INVESTIDOR: '+pfResumo(p).map(function(r){return r[0]+': '+r[1]}).join('; ')+'.'}
