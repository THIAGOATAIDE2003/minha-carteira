/* Aporte · js/parecer.js — Parecer da IA em cada ideia (1.70.0). Botão "Ver parecer", sob demanda (nunca automático).
   A IA só recebe o pacote JSON de parPacote() (números que o app já calculou) e só interpreta. O texto passa por parValida() (js/parecer-nucleo.js):
   se algum número não existir no pacote, o parecer é descartado e aparece "Parecer indisponível". Cache por ação + data do último balanço + versão do modelo de valuation. */
var PARTEMP=0.2,PARMS=25000,PAR={busy:null,err:{},open:{}};
var PARON=true; /* o botão só aparece quando for true (ligado depois do teste de consistência) */
var PARORD='groq'; /* 'gem' ou 'groq' força a ordem dos provedores; null = a escolha do app (S.asia) */
function parMod(){return 'fx:'+FXW.join('/')+':'+FXTOL+':'+FXMC+':'+FXPAY+':'+FXN+'|sd:'+[SDPL,SDLL,SDCOB,SDEB,SDEBL,SDMAXS].join('/')+'|bk:'+[BKMIN,BKROEMAX,BKGMAX,BKPREM,BKPISO,SGMIN,SGPLMIN,SGPLMAX].join('/')+'|p4'}
function parKey(o,D){var u=D&&D.t&&D.t.length?D.t[D.t.length-1].ref:'sem-balanco';return o.tk+'|'+u+'|'+parMod()}
function parLer(){try{return JSON.parse(localStorage.getItem(LS+'-parecer')||'{}')||{}}catch(e){return {}}}
function parGravar(tk,k,v){var c=parLer();c[tk]=Object.assign({k:k},v);var ks=Object.keys(c);if(ks.length>40){ks.sort(function(a,b){return (c[a].at||0)-(c[b].at||0)}).slice(0,ks.length-40).forEach(function(x){delete c[x]})}try{localStorage.setItem(LS+'-parecer',JSON.stringify(c))}catch(e){}}
var parR=function(v,d){return v==null||!isFinite(v)?null:Math.round(v*Math.pow(10,d))/Math.pow(10,d)},parMi=function(v){return v==null||!isFinite(v)?null:Math.round(v/1e6)};
function parDmy(d){var a=String(d||'').split('-');return a.length===3?a[2]+'/'+a[1]+'/'+a[0]:''}
function parCmp(c){if(!c)return null;return {de:c.de,para:c.para,tendencia:c.tend||'poucos dados',itens:(c.itens||[]).map(function(it){var nome=HIN[it.c]||it.c;if(it.ch==null)return {item:nome,resultado:it.s>0?'melhorou':it.s<0?'piorou':'igual'};
  return it.c==='ml'?{item:nome,variacao_pp:parR(it.ch,1)}:{item:nome,variacao_pct:parR(it.ch*100,1)}})}}
/* o pacote: só números já calculados pelo app, já arredondados e na unidade que a IA deve usar */
function parPacote(o){var D=fxDoc(o.tk),f=o.fx,sd=o.sd,m=sd&&sd.m,cf=o.cf,lim=[],last=D&&D.t&&D.t.length?D.t[D.t.length-1]:null,mo=o.d.cur==='USD'?'US$':'R$';
  var verif=!!(o.fxDem||(cf&&(cf.n==='Baixa'||cf.ext)));
  var pk={ativo:o.tk,moeda:mo,preco:parR(o.d.price,2),setor:setorOf(o.tk).k||null,nota:{valor:parR(o.score,1),minimo:0,maximo:10},situacao:verif?'em verificação (ainda não é ideia)':'ideia',
    balanco:last?{ultimo:hiQ(last),data:parDmy(last.ref)}:null};
  if(o.fxDem)lim.push('em verificação: '+o.fxDem);
  if(f&&f.ok){var nm=f.nm;pk.faixa={conservador:parR(f.cons,2),central:parR(f.cen,2),otimista:parR(f.oti,2),preco_hoje_frente_ao_conservador:f.est==='abaixo'?'abaixo do conservador':f.est==='perto'?'muito perto do conservador':'acima do conservador',
    margem_de_seguranca_pct:parR(f.ms*100,1),retorno_esperado_pct:parR(f.espPct*100,1),pesos_dos_cenarios_pct:FXW,armadilha_de_valor:f.trap==='margem'?'margem caindo 3 trimestres seguidos':f.trap==='lucro'?'lucro caindo 3 trimestres seguidos':f.trap==='ROE'?'ROE caindo 3 trimestres seguidos':null,
    premissas:f.bank?f.pr.map(function(c){return {cenario:c.n,roe_pct:parR(c.roe,1),crescimento_pct:c.g,custo_de_capital_pct:c.r,pvp_justo:parR(c.pvp,2)}}):f.seg?f.pr.map(function(c){return {cenario:c.n,lucro_por_acao:parR(c.L,2),pl_alvo:parR(c.pl,1)}}):f.pr.map(function(c){return {cenario:c.n,crescimento_pct:c.g,retorno_exigido_pct:c.r,multiplo_lucro:c.m,margem_liquida_pct:c.ml!=null?parR(c.ml,1):null}})};
    if(nm.anual!=null)pk.faixa.lucro_normalizado={trimestres_usados:nm.usados,trimestres_no_historico:nm.n,por_trimestre_milhoes:parMi(nm.med),por_ano_milhoes:parMi(nm.anual),ultimos_12_meses_milhoes:parMi(nm.last12),trimestres_atipicos_de_fora:nm.excl};
    if(f.bank||f.seg){pk.financeira=parFin(o,f);pk.nao_avaliado=finNao(o.tk).concat(f.pay==null?['payout']:[])}
  }else if(f&&!f.pend)lim.push(f.banco?'valuation desta financeira ainda não existe':'faixa de preço justo indisponível: '+f.motivo);
  if(!D)lim.push('sem histórico de balanços da CVM para esta empresa');
  if(D&&D.nr&&D.nr.length)var u4=D.t.slice(-4).map(hiQ);pk.lucros_atipicos=D.nr.slice(-4).map(function(n){return {trimestre:n.q,recente:u4.indexOf(n.q)>=0,tipo:n.tipo==='alto'?'lucro acima do normal':'lucro abaixo do normal',lucro_milhoes:parMi(n.luc),mediana_milhoes:parMi(n.med)}});
  if(D&&D.cmp)pk.tendencias={ano_contra_ano:parCmp(D.cmp.yoy),trimestre_contra_trimestre:parCmp(D.cmp.qoq)};
  if(sd&&(sd.bank||sd.seg)){pk.saude_financeira={testes_reprovados_de_3:sd.n,motivos:sd.mot,limites:{}};if(sd.n>=2)lim.push('2 ou mais alertas de saúde')}
  else if(sd){pk.saude_financeira={testes_reprovados_de_3:sd.n,motivos:sd.mot,regra_de_divida:m&&m.regra==='ebitda'?'dívida líquida sobre EBITDA (setor de dívida estrutural)':'dívida líquida sobre patrimônio e sobre lucro',
    divida_liquida_sobre_patrimonio:m&&m.dlpl!=null?parR(m.dlpl,2):null,divida_liquida_sobre_lucro_anual:m&&m.dll!=null?parR(m.dll,1):null,divida_liquida_sobre_ebitda:m&&m.dleb!=null?parR(m.dleb,1):null,
    cobertura_de_juros:m&&m.cob!=null?parR(m.cob,1):null,caixa_operacional_12_meses_milhoes:m&&m.fco!=null?parMi(m.fco):null,caixa_maior_que_a_divida:!!(m&&m.caixa),limites:{divida_patrimonio:SDPL,divida_lucro_anual:SDLL,cobertura_juros:SDCOB,divida_ebitda:m&&m.regra==='ebitda'?m.lim:null}};if(sd.n>=2)lim.push('2 ou mais testes de saúde financeira reprovados')}
  try{var r=riscosFor(o);if(r.length)pk.riscos_calculados=r}catch(e){}
  var vm=macroVento(o.tk);if(vm){var mc=macroGet();pk.vento_macro={resultado:vm.n,razao:vm.w,regime_da_selic:mc.regime.r,selic_meta_pct:mc.selic.meta,dolar_nivel:mc.dolar&&mc.dolar.nivel||null}}
  if(cf){pk.confianca={nivel:cf.n,motivos:cf.w,aviso:cf.aviso||null};if(cf.n==='Baixa'||cf.ext)lim.push('confiança baixa nos dados'+(cf.w.length?': '+cf.w.join('; '):''))}
  pk.limitacoes=lim;return pk}
/* bloco próprio das financeiras: só números já calculados em banco.js / seguradora.js */
function parFin(o,f){var P=function(v){return parR(v,2)};
  if(f.bank){var nm=f.nm,mr=f.mx.l[1].c;return {tipo:'banco',roe_sustentavel_pct:parR(nm.med,1),roe_conservador_pct:parR(nm.p25,1),roe_otimista_pct:parR(nm.p75,1),roe_ultimo_pct:nm.ult!=null?parR(nm.ult,1):null,trimestres_com_roe:nm.usados,
    custo_de_capital_pct:f.r,crescimento_pct:f.pr[0].g,pvp_hoje:parR(f.pvpHoje,2),pvp_justo_conservador:parR(f.pr[0].pvp,2),pvp_justo_central:parR(f.pr[1].pvp,2),pvp_justo_otimista:parR(f.pr[2].pvp,2),
    payout_pct:f.pay!=null?Math.round(f.pay*100):null,preco_justo_central_com_custo_menor:{custo_pct:f.mx.rs[0],preco:P(mr[0].v)},preco_justo_central_com_custo_maior:{custo_pct:f.mx.rs[2],preco:P(mr[2].v)}}}
  var m=f.mx;return {tipo:f.kind,pl_hoje:f.plHoje!=null?parR(f.plHoje,1):null,pl_alvo_conservador:parR(f.pr[0].pl,1),pl_alvo_central:parR(f.pr[1].pl,1),pl_alvo_otimista:parR(f.pr[2].pl,1),origem_do_pl:f.fonte==='historico'?'histórico da própria ação':'pares do mesmo subsetor',
    lucro_por_acao_conservador:P(f.pr[0].L),lucro_por_acao_central:P(f.pr[1].L),dividendo_por_acao:f.dps!=null?P(f.dps):null,payout_pct:f.pay!=null?Math.round(f.pay*100):null,dividendo_sustentavel_por_acao:f.divSust!=null?P(f.divSust):null,
    rendimento_sustentavel_pct:f.ySust!=null?parR(f.ySust*100,1):null,preco_justo_com_pl_conservador:P(m.l[1].c[0].v)}}
function parHtml(t){var h='',ul=false;String(t||'').split('\n').forEach(function(l){l=l.trim();if(!l){if(ul){h+='</ul>';ul=false}return}
  if(/^##\s/.test(l)){if(ul){h+='</ul>';ul=false}h+='<h4 class="parh">'+esc(l.replace(/^##\s*/,''))+'</h4>'}else if(/^[-•]\s/.test(l)){if(!ul){h+='<ul class="parl">';ul=true}h+='<li>'+esc(l.replace(/^[-•]\s*/,''))+'</li>'}else{if(ul){h+='</ul>';ul=false}h+='<p class="parp">'+esc(l)+'</p>'}});return h+(ul?'</ul>':'')}
function parRow(o){if(!PARON||!o||!o.fx||o.fx.pend)return '';var D=fxDoc(o.tk),k=parKey(o,D),c=parLer()[o.tk],ok=c&&c.k===k,ab=!!PAR.open[o.tk],bz=PAR.busy===o.tk,er=PAR.err[o.tk];
  var bt='<button type="button" class="fqb" data-par="'+esc(o.tk)+'"'+(PAR.busy?' disabled':'')+'>'+(bz?'Gerando o parecer…':ab&&ok?'Esconder parecer':er?'Tentar de novo':'Ver parecer')+'</button>';
  var h='<div class="fql">'+bt+(er&&!bz?' <span class="opw">'+esc(er)+'</span>':'')+'</div>';
  if(ab&&ok)h+='<div class="fqp parbox">'+parHtml(c.t)+'<p class="note" style="margin:6px 0 0">'+(c.lei?'Leitura definida por regra do app ('+esc(c.reg||'')+(c.mot&&c.mot.length?': '+esc(c.mot.join('; ')):'')+'). ':'')+'Texto escrito pela IA ('+esc(c.mod||'IA')+') em '+rsWhen(c.at)+', com preço de '+esc(c.moeda)+' '+num(c.preco,2)+' e balanço '+esc(c.bal)+'. Só interpreta números do app; pode errar.</p></div>';
  return h}
function parGerar(tk){if(PAR.busy)return;var r=OPC&&OPC.r,all=r?[].concat(r.D||[],r.X||[],r.W||[],r.M||[]):[],o=all.filter(function(x){return x.tk===tk})[0];if(!o||!o.fx)return;
  var D=fxDoc(o.tk),k=parKey(o,D),c=parLer()[tk];if(c&&c.k===k){PAR.open[tk]=!PAR.open[tk];renderMkt();return}
  var gq=S.keys.gq,gm=S.keys.gem;if(!gq&&!gm){PAR.err[tk]='Falta a chave da Groq ou do Gemini em Mais → Ajustes → Assistente.';PAR.open[tk]=false;renderMkt();return}
  var pk=parPacote(o),ent=parEntrada(pk),txt='',ab=window.AbortController?new AbortController():null,sig=ab?ab.signal:undefined,tm=setTimeout(function(){if(ab)ab.abort()},PARMS),errs=[],on=function(t){txt+=t};
  PAR.busy=tk;PAR.err[tk]='';renderMkt();
  var mk=function(){return [{role:'system',content:PARSYS},{role:'user',content:'DADOS:\n'+JSON.stringify(ent.ia)}]},msgs=mk();
  var provs=[];if(gq)provs.push(['Groq',function(){return asGroq(gq,mk,on,sig)}]);if(gm)provs.push(['Gemini',function(){return asGem(gm,msgs,on,sig)}]);
  if((PARORD||S.asia)==='gem')provs.sort(function(a,b){return (b[0]==='Gemini')-(a[0]==='Gemini')});else provs.sort(function(a,b){return (b[0]==='Groq')-(a[0]==='Groq')});
  var run=function(i){txt='';return provs[i][1]().catch(function(e){if(e&&e.name==='AbortError')throw e;errs.push(asErrTxt(e,provs[i][0]));if(i+1<provs.length)return run(i+1);throw e})};
  ASTEMP=PARTEMP;
  run(0).then(function(){var v=parValida(txt,ent);if(v.ok){parGravar(tk,k,{t:v.texto,at:Date.now(),mod:AS.mod,lei:v.leitura,mot:ent.leitura.motivos,reg:ent.leitura.regra,preco:pk.preco,moeda:pk.moeda,bal:pk.balanco?pk.balanco.ultimo:'—'});PAR.open[tk]=true;PAR.err[tk]=''}else{PAR.open[tk]=false;PAR.err[tk]='Parecer indisponível (a IA escreveu algo que não bate com os números do app). Tente de novo.';try{logErro('parecer '+tk,v.motivo)}catch(e){}}})
   .catch(function(e){PAR.open[tk]=false;PAR.err[tk]=e&&e.name==='AbortError'?'A IA não respondeu em '+PARMS/1000+' segundos. Tente de novo mais tarde.':'Parecer indisponível: '+(errs.join(' E ')||'a IA falhou')+'.'})
   .then(function(){ASTEMP=null;clearTimeout(tm);PAR.busy=null;try{renderMkt()}catch(e){}})}
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-par]');if(t)parGerar(t.getAttribute('data-par'))});
