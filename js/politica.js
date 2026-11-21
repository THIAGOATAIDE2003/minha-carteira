/* ===== Riscos e política (1.30.0): manchetes de risco, fatos relevantes da CVM e temas de política, feitos pelo robô (MD.d.risk) ===== */
var RISKSK=LS+'-riseen';
function riD(){return MD.d&&MD.d.risk||null}
function riDt(d){return d?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):''}
function riAge(d){if(!d)return 999;return Math.floor((Date.parse(today())-Date.parse(d.slice(0,10)))/864e5)}
var RITEMA={gov:['Governo e impostos',['Bancos','Varejo e consumo','Energia e saneamento','Petróleo e gás','Outros']],cong:['Congresso',['Bancos','Energia e saneamento','Petróleo e gás','Varejo e consumo']],bc:['Banco Central',['Bancos','Varejo e consumo','Imóveis e construção','Outros']],fisc:['Contas públicas',['Bancos','Imóveis e construção','Varejo e consumo']],trump:['Trump e tarifas',['Mineração e siderurgia','Agro','Exterior']],fed:['Fed e juros dos EUA',['Exterior','Tecnologia']],china:['China',['Mineração e siderurgia','Petróleo e gás','Agro']],petro:['Petrobras e governo',['Petróleo e gás']],ener:['Energia elétrica',['Energia e saneamento']]};
/* temas que valem para uma ação: pelo setor dela (rkSect) + temas gerais */
function riTemas(tk){var us=!isBR(tk),sc=['',''];try{sc=rkSect(tk,us)}catch(e){}var g=sc[0]||'',s=sc[1]||'',o=[];
  if(s==='Intermediários Financeiros'||g==='Financeiro')o=['gov','bc','fisc','cong'];
  else if(g==='Petróleo e gás')o=['petro','gov','fisc'];
  else if(g==='Utilidade pública')o=['ener','gov','cong'];
  else if(g==='Materiais básicos')o=['china','trump'];
  else if(g==='Consumo cíclico'||g==='Consumo não cíclico'||s==='Comércio')o=['bc','fisc','gov'];
  else if(g==='Fundos imobiliários')o=['bc','fisc'];
  else if(us)o=['fed','trump'];
  else o=['gov','bc'];
  if(us){['fed','trump'].forEach(function(k){if(o.indexOf(k)<0)o.push(k)})}
  return o.slice(0,4)}
function riAc(tk){var r=riD();return r&&r.ac&&r.ac[tk]||[]}
function riDir(tk){var r=riD();return r&&r.dir&&r.dir[tk]||[]}
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
  var dr=riDir(tk);
  h+='<div class="panel"><h2>O que a diretoria diz '+bal('Manchetes dos últimos 90 dias em que o presidente, o diretor financeiro ou a diretoria da empresa falam de projeções, metas, investimentos ou dividendos. É o que o jornal publicou: pode estar resumido ou fora de contexto, e promessa de diretoria não garante resultado.')+'</h2>'+(dr.length?'<ul class="rsn">'+dr.map(function(x){return riLi(x,0)}).join('')+'</ul>':'<p class="muted small" style="margin:0">Nenhuma fala de projeção da diretoria nas manchetes dos últimos 90 dias.</p>')+'<p class="note">Só manchetes: a teleconferência de resultados completa não está disponível de graça.</p></div>';
  h+='<div class="panel"><h2>Fatos relevantes (CVM) '+bal('Documentos que a própria empresa entrega à CVM: fatos relevantes, comunicados ao mercado e avisos sobre diretoria ou controle. É a fonte oficial, mas a CVM nem sempre publica no mesmo dia.')+'</h2>'+
    (ft.length?'<ul class="rsn">'+ft.map(function(x){return riLi(x,1)}).join('')+'</ul>':'<p class="muted small" style="margin:0">Nenhum fato relevante nos últimos 45 dias.</p>')+
    '<p class="note">Fonte: dados abertos da CVM. Reuniões fechadas e conversas privadas não aparecem em lugar nenhum.</p></div>';
  return h}
/* texto para a IA (assistente, relatório de risco, plano); cita fonte e data */
function riCtx(tks,full){var r=riD();if(!r)return '';var L=['=== RISCOS E POLÍTICA [fonte: manchetes do Google Notícias e documentos da CVM, buscados pelo robô em '+asDt(Date.parse(r.at))+'. Manchete NÃO é confirmação; só cite o que está aqui, com fonte e data]'];
  (tks||[]).forEach(function(tk){var a=riAc(tk).slice(0,full?4:2),f=riFt(tk).slice(0,full?3:1);
    a.forEach(function(x){L.push('- '+tk+' ('+(x.g?'GRAVE, ':'')+'manchete): '+x.t+' ['+x.s+', '+riDt(x.d)+']')});
    riDir(tk).slice(0,full?3:1).forEach(function(x){L.push('- '+tk+' (fala da diretoria, manchete): '+x.t+' ['+x.s+', '+riDt(x.d)+']')});
    f.forEach(function(x){L.push('- '+tk+' ('+(x.g?'GRAVE, ':'')+'CVM '+x.c+'): '+x.a+' ['+riDt(x.d)+']')})});
  var ts={};(tks||[]).forEach(function(tk){riTemas(tk).forEach(function(k){ts[k]=1})});
  Object.keys(ts).slice(0,full?6:3).forEach(function(k){var p=riPol(k);if(p&&p.it)p.it.slice(0,full?3:2).forEach(function(x){L.push('- Tema '+(p.n||k)+': '+x.t+' ['+x.s+', '+riDt(x.d)+']')})});
  return L.length>1?L.join('\n'):''}
function riCtxCart(){var tks=[],a='',b='';try{tks=riHeld()}catch(e){}try{a=riCtx(tks,!ASCMP)}catch(e){}try{b=vtCtx(tks)}catch(e){}return [a,b].filter(Boolean).join('\n')}
/* painel curto em Carteira → Risco: graves dos últimos 14 dias nas suas ações */
function riPanel(){var r=riD(),vt='';try{vt=vtCart()}catch(e){}if(!r)return vt;var g=riGraves(riHeld(),14);
  return vt+'<div class="panel"><h2>Riscos nas suas ações '+bal('Notícias e documentos da CVM dos últimos 14 dias, com palavra grave, nas ações que você tem. É um aviso para você ir olhar, não uma conclusão.')+'</h2>'+(g.length?'<ul class="rsn">'+g.slice(0,8).map(function(x){return '<li><a href="'+esc(safeUrl(x.l))+'" target="_blank" rel="noopener noreferrer"><b>'+esc(x.tk)+' · '+esc(x.t)+'</b><span class="muted">'+esc(x.s)+' · '+riDt(x.d)+'</span></a></li>'}).join('')+'</ul>':'<p class="muted small" style="margin:0">Nada grave nas manchetes nem na CVM nos últimos 14 dias.</p>')+'</div>'}

/* ===== Vento do setor (1.31.0): regras simples ligando juros, dólar, petróleo, minério, PIB e inflação (números do app) ao setor ===== */
function vtVar(k,n){var D=MD.d&&MD.d.idx&&MD.d.idx[k];if(!D||!D.d||!D.d.length)return null;var l=D.d[D.d.length-1],day=l[0],b=null;(D.w||[]).concat(D.d).forEach(function(p){if(p[0]<=day-n&&(b==null||p[0]>b[0]))b=p});return b&&b[1]?(l[1]/b[1]-1)*100:null}
function vtFoc(k,off){try{var y=String(new Date().getFullYear()+off),e=BC.d&&BC.d.ind&&BC.d.ind[k]&&BC.d.ind[k].y[y];return e&&e.now?e.now.med:null}catch(x){return null}}
function vtF(){var se=bcSelicNow(),sf=vtFoc('Selic',1);return {selic:se,selicF:sf,usd:vtVar('usd',365),brent:vtVar('brent',365),iron:vtVar('iron',365),pib:vtFoc('PIB Total',1)!=null?vtFoc('PIB Total',1):vtFoc('PIB Total',0),ipca:vtFoc('IPCA',0)}}
function vtRegras(g,s){var r=[],has=function(a){return a.indexOf(s)>=0};
  if(s==='Construção Civil'||s==='Construção e Engenharia'||s==='Exploração de Imóveis'||g==='Fundos imobiliários')r.push('juros','pibf','selicq');
  else if(s==='Intermediários Financeiros'||g==='Financeiro')r.push('jurosb','pibf');
  else if(has(['Comércio','Tecidos, Vestuário e Calçados','Utilidades Domésticas','Diversos','Comércio e Distribuição'])||g==='Consumo cíclico')r.push('juros','ipca','pibf');
  else if(g==='Utilidade pública')r.push('juros','selicq');
  else if(g==='Petróleo e gás')r.push('brent','usdx');
  else if(g==='Materiais básicos')r.push('iron','usdx');
  else if(has(['Agropecuária']))r.push('usdx');
  else if(has(['Viagens e Lazer']))r.push('usdc','brentc');
  else if(g==='Tecnologia')r.push('juros');
  return r}
/* itens [direção ('contra'|'favor'|'misto'), título, porque] do setor, com o número usado */
function vtSetor(sc){var g=sc[0]||'',s=sc[1]||'',F=vtF(),o=[],p1=function(n){return pf.format(n)};
  vtRegras(g,s).forEach(function(k){
    if(k==='juros'&&F.selic!=null&&F.selic>=12)o.push(['contra','Juros altos','Selic em '+p1(F.selic)+'% ao ano: crédito e financiamento caros, venda mais difícil e a renda fixa concorre com a bolsa.']);
    if(k==='juros'&&F.selic!=null&&F.selic<=9)o.push(['favor','Juros baixos','Selic em '+p1(F.selic)+'% ao ano: crédito mais barato ajuda o setor.']);
    if(k==='jurosb'&&F.selic!=null&&F.selic>=12)o.push(['misto','Juros altos','Selic em '+p1(F.selic)+'%: a margem do banco melhora, mas crédito caro aumenta a inadimplência e segura os empréstimos.']);
    if(k==='selicq'&&F.selic!=null&&F.selicF!=null&&F.selicF<=F.selic-1)o.push(['favor','Juros devem cair','O Focus espera Selic de '+p1(F.selicF)+'% no fim do ano que vem (hoje '+p1(F.selic)+'%). Se acontecer, ajuda o setor.']);
    if(k==='pibf'&&F.pib!=null&&F.pib<1.5)o.push(['contra','Economia fraca','O Focus espera crescimento de só '+p1(F.pib)+'% do PIB: menos demanda, mais calote.']);
    if(k==='ipca'&&F.ipca!=null&&F.ipca>4.5)o.push(['contra','Inflação alta','O Focus espera IPCA de '+p1(F.ipca)+'% neste ano: o consumidor compra menos.']);
    if(k==='brent'&&F.brent!=null&&Math.abs(F.brent)>=10)o.push([F.brent>0?'favor':'contra','Petróleo '+(F.brent>0?'subiu':'caiu'),'O Brent '+(F.brent>0?'subiu ':'caiu ')+p1(Math.abs(F.brent))+'% em 12 meses.']);
    if(k==='iron'&&F.iron!=null&&Math.abs(F.iron)>=10)o.push([F.iron>0?'favor':'contra','Minério '+(F.iron>0?'subiu':'caiu'),'O minério de ferro '+(F.iron>0?'subiu ':'caiu ')+p1(Math.abs(F.iron))+'% em 12 meses.']);
    if(k==='usdx'&&F.usd!=null&&Math.abs(F.usd)>=8)o.push([F.usd>0?'favor':'contra','Dólar '+(F.usd>0?'subiu':'caiu'),'O dólar '+(F.usd>0?'subiu ':'caiu ')+p1(Math.abs(F.usd))+'% em 12 meses: a empresa vende lá fora e recebe em dólar.']);
    if(k==='usdc'&&F.usd!=null&&F.usd>=8)o.push(['contra','Dólar alto','O dólar subiu '+p1(F.usd)+'% em 12 meses: passagens, aluguéis e peças dolarizadas ficam mais caros.']);
    if(k==='brentc'&&F.brent!=null&&F.brent>=10)o.push(['contra','Petróleo alto','O Brent subiu '+p1(F.brent)+'% em 12 meses: combustível mais caro.'])});
  return o}
function vtHtml(tk){var us=!isBR(tk),sc;try{sc=rkSect(tk,us)}catch(e){return ''}if(us||!sc||!sc[0]||sc[0]==='Outros')return '';var it=vtSetor(sc),ic={contra:'al',favor:'ok',misto:'at'};
  return '<div class="panel"><h2>Vento do setor '+bal('Regras simples que ligam juros, dólar, petróleo, minério, crescimento e inflação esperados ao setor da empresa. Cada linha mostra o número usado. Não prevê o preço: é o contexto. Confiança e crise política não são medidas pelo app, só o que está nas manchetes.')+'</h2>'+
    (it.length?'<ul class="rkl">'+it.map(function(x){return '<li>'+rkLvl(ic[x[0]])+'<div><b>'+esc(x[1])+'</b><p style="margin:2px 0 0;color:var(--fg)">'+esc(x[2])+'</p></div></li>'}).join('')+'</ul>':'<p class="muted small" style="margin:0">Hoje nenhum fator forte (juros, dólar, petróleo, minério, PIB, inflação) pesa claramente a favor ou contra o setor '+esc(sc[1]||sc[0])+'.</p>')+
    '<p class="note">Setor: '+esc(sc[1]||sc[0])+'. Fatores: Selic e dólar do app, Focus e histórico do robô.</p></div>'}
function vtCart(){var R=compute(),tot=R.tot.value+(R.tot.rfV||0),sec={};if(!tot)return '';
  R.held.forEach(function(x){if(x.p.market==='US')return;var sc=rkSect(x.p.ticker,false),k=sc[0]+'|'+sc[1];(sec[k]=sec[k]||{sc:sc,v:0,t:[]}).v+=x.v;sec[k].t.push(x.p.ticker)});
  var rows=Object.keys(sec).map(function(k){var e=sec[k];return {e:e,it:vtSetor(e.sc)}}).filter(function(r){return r.it.length&&r.e.sc[0]!=='Outros'}).sort(function(a,b){return b.e.v-a.e.v});
  return '<div class="panel"><h2>Vento nos seus setores '+bal('Para cada setor que você tem, o que está a favor ou contra hoje (juros, dólar, petróleo, minério, PIB, inflação). Regras simples, com o número usado. Não é previsão.')+'</h2>'+
    (rows.length?'<ul class="rkl">'+rows.map(function(r){var c=r.it.filter(function(x){return x[0]==='contra'}).length,f=r.it.filter(function(x){return x[0]==='favor'}).length;
      return '<li>'+rkLvl(c>f?'al':f>c?'ok':'at')+'<div><b>'+esc(r.e.sc[1]||r.e.sc[0])+' · '+pf.format(r.e.v/tot*100)+'% da carteira ('+r.e.t.map(esc).join(', ')+')</b>'+r.it.map(function(x){return '<p style="margin:2px 0 0;color:var(--fg)">'+(x[0]==='contra'?'▼ ':x[0]==='favor'?'▲ ':'● ')+esc(x[1])+': '+esc(x[2])+'</p>'}).join('')+'</div></li>'}).join('')+'</ul>':'<p class="muted small" style="margin:0">Nenhum fator forte pesa nos setores que você tem agora.</p>')+'</div>'}
function vtCtx(tks){var L=[],seen={};(tks||[]).forEach(function(tk){if(!isBR(tk))return;var sc;try{sc=rkSect(tk,false)}catch(e){return}var k=sc[0]+'|'+sc[1];if(seen[k]||sc[0]==='Outros')return;seen[k]=1;var it=vtSetor(sc);if(it.length)L.push('- '+(sc[1]||sc[0])+' ('+tk+'): '+it.map(function(x){return (x[0]==='contra'?'CONTRA':x[0]==='favor'?'A FAVOR':'MISTO')+' — '+x[1]+': '+x[2]}).join(' | '))});
  return L.length?'VENTO DOS SETORES [regras do app com números do app (Selic, Focus, histórico do robô): contexto, não previsão de preço]:\n'+L.join('\n'):''}

/* ===== Sobre a empresa (1.32.0): setor logo abaixo do nome e um resumo do que ela faz (cadastro da CVM, pelo robô: MD.d.sobre) ===== */
function sobOf(tk){var s=MD.d&&MD.d.sobre;if(!s||!s.t||!s.e)return null;var c=s.t[tk];return c&&s.e[c]||null}
/* setor curto para o cabeçalho: subsetor da B3 (Fundamentus) ou do catálogo; para o exterior, o do Finnhub */
function sobSetor(tk){if(!isBR(tk))return '';var o='';try{var sc=rkSect(tk,false);o=sc[1]||(sc[0]!=='Outros'?sc[0]:'')}catch(e){}
  if(!o)try{o=catSetorNome(tk)}catch(e){}
  if(!o){var e=sobOf(tk);o=e&&e.s||''}return o}
function sobHtml(tk,d){if(!isBR(tk)||tk.charAt(0)==='^')return '';var e=sobOf(tk),sc='',gr='',nome='';try{var s=rkSect(tk,false);sc=s[1]||'';gr=s[0]!=='Outros'?s[0]:''}catch(x){}
  try{nome=nomeEmp(tk)||''}catch(x){}
  if(!e&&!sc&&!gr)return '';
  var li=function(k,v){return v?'<div><span>'+k+'</span><b>'+esc(v)+'</b></div>':''};
  return '<div class="panel"><h2>Sobre a empresa '+bal('Resumo oficial do cadastro da empresa na CVM (formulário cadastral): o que ela faz, quando foi fundada e quem controla. É o texto que a própria empresa entrega, então pode ser mais formal e não traz a história completa nem opinião.')+'</h2>'+
    (e&&e.a?'<p class="anv" style="margin:0 0 10px">'+esc(e.a)+'</p>':'<p class="muted small" style="margin:0 0 10px">O cadastro da CVM dessa empresa ainda não chegou ao app. Chega com o robô.</p>')+
    '<div class="anc">'+li('Setor',[gr,sc].filter(function(x,i,a){return x&&a.indexOf(x)===i}).join(' · '))+li('Fundada em',e&&e.f)+li('Controle',e&&e.c)+li('Nome oficial',nome)+'</div>'+
    (e&&e.w?'<p class="note"><a href="'+esc(safeUrl(/^https?:/i.test(e.w)?e.w:'https://'+e.w))+'" target="_blank" rel="noopener noreferrer">Site da empresa</a> · Fonte: cadastro da CVM.</p>':'<p class="note">Fonte: cadastro da CVM.</p>')+'</div>'}
