/* ===== Riscos e política (1.30.0): manchetes de risco, fatos relevantes da CVM e temas de política, feitos pelo robô (MD.d.risk) ===== */
var RISKSK=LS+'-riseen';
function riD(){return MD.d&&MD.d.risk||null}
function riDt(d){return d?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):''}
function riAge(d){if(!d)return 999;return Math.floor((Date.parse(today())-Date.parse(d.slice(0,10)))/864e5)}
var RITEMA={gov:['Governo e impostos',['Bancos','Varejo e consumo','Energia e saneamento','Petróleo e gás','Outros']],cong:['Congresso',['Bancos','Energia e saneamento','Petróleo e gás','Varejo e consumo']],bc:['Banco Central',['Bancos','Varejo e consumo','Imóveis e construção','Outros']],fisc:['Contas públicas',['Bancos','Imóveis e construção','Varejo e consumo']],trump:['Trump e tarifas',['Mineração e siderurgia','Agro','Exterior']],fed:['Fed e juros dos EUA',['Exterior','Tecnologia']],china:['China',['Mineração e siderurgia','Petróleo e gás','Agro']],petro:['Petrobras e governo',['Petróleo e gás']],ener:['Energia elétrica',['Energia e saneamento']]};
/* temas que valem para uma ação: pelo setor dela (rkSect) + temas gerais */
function riTemas(tk){var us=!isBR(tk),sc='';try{sc=rkSect(tk,us)[0]||''}catch(e){}var o=[];
  Object.keys(RITEMA).forEach(function(k){var ss=RITEMA[k][1];if(ss.indexOf(sc)>=0||(ss.indexOf('Outros')>=0&&!sc))o.push(k)});
  if(us){['fed','trump'].forEach(function(k){if(o.indexOf(k)<0)o.push(k)})}
  if(!o.length)o=['gov','bc'];return o.slice(0,4)}
function riAc(tk){var r=riD();return r&&r.ac&&r.ac[tk]||[]}
function riFt(tk){var r=riD();return r&&r.fatos&&r.fatos[tk]||[]}
function riPol(k){var r=riD();return r&&r.pol&&r.pol[k]||null}
/* itens graves e recentes das ações que o usuário tem */
function riGraves(tks,dias){var o=[];(tks||[]).forEach(function(tk){
  riAc(tk).forEach(function(x){if(x.g&&riAge(x.d)<=dias)o.push({tk:tk,d:x.d,t:x.t,s:x.s,l:x.l,k:'n'})});
  riFt(tk).forEach(function(x){if(x.g&&riAge(x.d)<=dias)o.push({tk:tk,d:x.d,t:x.a,s:'CVM · '+x.c,l:x.l,k:'f'})})});
  o.sort(function(a,b){return a.d<b.d?1:-1});return o}
function riHeld(){var R=compute(),o=[];R.held.forEach(function(x){if(x.p.market!=='US'&&o.indexOf(x.p.ticker)<0)o.push(x.p.ticker)});return o}
/* avisos do sino: algo grave nas ações que você tem (3 dias); a 1ª vez marca tudo como já visto */
function riAlerts(){var o=[],st=null,tks;try{tks=riHeld()}catch(e){return o}if(!riD())return o;
  try{st=JSON.parse(localStorage.getItem(RISKSK)||'null')}catch(e){}var seed=!st,now=Date.now(),ch=seed;st=st||{};
  riGraves(tks,3).forEach(function(x){var k=x.tk+'|'+x.k+'|'+x.d+'|'+x.t.slice(0,40);if(st[k]==null){st[k]=seed?0:now;ch=1}
    if(st[k]>0&&now-st[k]<4*864e5)o.push({tk:x.tk,ts:st[k],tx:(x.k==='f'?'Fato relevante':'Notícia de risco'),sub:x.t+' · '+x.s+' · '+riDt(x.d)})});
  if(ch)try{localStorage.setItem(RISKSK,JSON.stringify(st))}catch(e){}
  o.sort(function(a,c){return c.ts-a.ts});return o}
/* seções da aba Notícias da ação */
function riLi(x,fato){return '<li><a href="'+esc(safeUrl(x.l))+'" target="_blank" rel="noopener noreferrer"><b>'+(x.g?'<span class="loss">● </span>':'')+esc(fato?x.a:x.t)+'</b><span class="muted">'+esc(fato?x.c:x.s)+' · '+riDt(x.d)+'</span></a></li>'}
function riHtml(tk){var r=riD();if(!r||isBR(tk)===false)return '';
  var ac=riAc(tk),ft=riFt(tk),h='',tm=riTemas(tk);
  h+='<div class="panel"><h2>Riscos e política '+bal('Manchetes sobre a empresa com palavras de risco (investigação, multa, troca de diretoria, renúncia, processo...) e manchetes dos temas de política e economia que mexem com o setor dela. São só manchetes: não confirmam nada e não trazem discursos inteiros. Ponto vermelho = palavra grave.')+'</h2>'+
    (ac.length?'<ul class="rsn">'+ac.map(function(x){return riLi(x,0)}).join('')+'</ul>':'<p class="muted small" style="margin:0 0 8px">Nenhuma manchete de risco da empresa nos últimos 30 dias.</p>')+
    tm.map(function(k){var p=riPol(k);if(!p||!p.it||!p.it.length)return '';return '<h3 style="margin:12px 0 4px">'+esc(p.n||RITEMA[k][0])+'</h3><ul class="rsn">'+p.it.slice(0,3).map(function(x){return riLi(x,0)}).join('')+'</ul>'}).join('')+
    '<p class="note">Manchetes do Google Notícias, buscadas pelo robô em '+rsWhen(r.at)+'. Toque para abrir a notícia.</p></div>';
  h+='<div class="panel"><h2>Fatos relevantes (CVM) '+bal('Documentos que a própria empresa entrega à CVM: fatos relevantes, comunicados ao mercado e avisos sobre diretoria ou controle. É a fonte oficial, mas a CVM nem sempre publica no mesmo dia.')+'</h2>'+
    (ft.length?'<ul class="rsn">'+ft.map(function(x){return riLi(x,1)}).join('')+'</ul>':'<p class="muted small" style="margin:0">Nenhum fato relevante nos últimos 45 dias.</p>')+
    '<p class="note">Fonte: dados abertos da CVM. Reuniões fechadas e conversas privadas não aparecem em lugar nenhum.</p></div>';
  return h}
/* texto para a IA (assistente, relatório de risco, plano); cita fonte e data */
function riCtx(tks,full){var r=riD();if(!r)return '';var L=['=== RISCOS E POLÍTICA [fonte: manchetes do Google Notícias e documentos da CVM, buscados pelo robô em '+asDt(Date.parse(r.at))+'. Manchete NÃO é confirmação; só cite o que está aqui, com fonte e data]'];
  (tks||[]).forEach(function(tk){var a=riAc(tk).slice(0,full?4:2),f=riFt(tk).slice(0,full?3:1);
    a.forEach(function(x){L.push('- '+tk+' ('+(x.g?'GRAVE, ':'')+'manchete): '+x.t+' ['+x.s+', '+riDt(x.d)+']')});
    f.forEach(function(x){L.push('- '+tk+' ('+(x.g?'GRAVE, ':'')+'CVM '+x.c+'): '+x.a+' ['+riDt(x.d)+']')})});
  var ts={};(tks||[]).forEach(function(tk){riTemas(tk).forEach(function(k){ts[k]=1})});
  Object.keys(ts).slice(0,full?6:3).forEach(function(k){var p=riPol(k);if(p&&p.it)p.it.slice(0,full?3:2).forEach(function(x){L.push('- Tema '+(p.n||k)+': '+x.t+' ['+x.s+', '+riDt(x.d)+']')})});
  return L.length>1?L.join('\n'):''}
function riCtxCart(){var tks=[];try{tks=riHeld()}catch(e){}return riCtx(tks,!ASCMP)}
/* painel curto em Carteira → Risco: graves dos últimos 14 dias nas suas ações */
function riPanel(){var r=riD();if(!r)return '';var g=riGraves(riHeld(),14);
  return '<div class="panel"><h2>Riscos nas suas ações '+bal('Notícias e documentos da CVM dos últimos 14 dias, com palavra grave, nas ações que você tem. É um aviso para você ir olhar, não uma conclusão.')+'</h2>'+(g.length?'<ul class="rsn">'+g.slice(0,8).map(function(x){return '<li><a href="'+esc(safeUrl(x.l))+'" target="_blank" rel="noopener noreferrer"><b>'+esc(x.tk)+' · '+esc(x.t)+'</b><span class="muted">'+esc(x.s)+' · '+riDt(x.d)+'</span></a></li>'}).join('')+'</ul>':'<p class="muted small" style="margin:0">Nada grave nas manchetes nem na CVM nos últimos 14 dias.</p>')+'</div>'}
