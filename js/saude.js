/* Aporte · js/saude.js — Saúde financeira e "O que pode dar errado" das Ideias (1.65.0).
   Usa só o histórico da CVM (dados/cvm/<TK>.json, baixado por fxDoc em faixa.js). Contas feitas por código, sem IA.
   Três testes: dívida (líquida ÷ patrimônio e ÷ lucro anual), cobertura de juros (EBIT ÷ resultado financeiro negativo, 12 meses) e caixa operacional de 12 meses positivo.
   2 ou mais falhas: a ação vai para Em verificação; 1 falha: continua com aviso amarelo. Bancos e seguradoras não passam por aqui. */
var SDPL=1.5,SDLL=4,SDCOB=2,SDEB=4,SDEBL=5,SDMAXS=3,SDCX=1,
  SDSELIC=/construção|incorpora|imóveis|comércio|varejo|vestuário|domésticas|automóveis|viagens|aluguel de carros|educacion|shopping/i,
  SDESTR=/aluguel de carros|energia el|saneamento|^gás|rodovia|ferrovi|aeroport|portu|concess/i;
/* mesmo formato do rkSect ([grupo, setor]), mas com o catálogo da B3 do robô: para as ações que o app não acompanha o rkSect devolvia "Outros" (1.68.0) */
function setorRk(tk,us){if(us||(typeof FIIS!=='undefined'&&FIIS[tk]))return rkSect(tk,us);if(MD.d&&MD.d.sect&&MD.d.sect[tk])return rkSect(tk,false);
  var st=setorOf(tk);if(!st.g||st.g==='Outros')return rkSect(tk,false);var g=Object.keys(RKSG).filter(function(k){return RKSG[k].indexOf(st.g)>=0})[0];return [g||st.g,st.g]}
/* setor de uma ação: o catálogo da B3 do robô (MD.d.cat) cobre todas; sem ele, o setor que o app já conhecia (MD.d.sect). g = setor, s = subsetor */
function setorOf(tk){var c=MD.d&&MD.d.cat,p=c&&c.a&&c.a[tk],g=p&&p[1]!=null&&c.n?(c.n[String(p[1])]||''):'',sb=p&&p[2]||'';
  if(!g&&!sb){var q=MD.d&&MD.d.sect&&MD.d.sect[tk];if(q){g=q[0]||'';sb=q[1]||''}}return {g:g,s:sb,k:sb||g}}
function sdSum(t,k){if(t.length<4||!t.every(function(r){return r[k]!=null}))return null;return t.reduce(function(s,r){return s+r[k]},0)}
function sdX(v){return num(v,1).replace(/,0$/,'')+'×'}
/* métricas e testes de uma empresa a partir do arquivo do histórico */
function saudeCalc(D,ctx){if(!D||!D.t||D.t.length<4)return null;ctx=ctx||{};var t4=D.t.slice(-4),u=t4[3],luc=sdSum(t4,'luc'),fco=sdSum(t4,'fco'),ebit=sdSum(t4,'ebit'),rf=sdSum(t4,'rf'),
    dl=u.dl,pl=u.pl,dlpl=dl!=null&&pl>0?dl/pl:null,dll=dl!=null&&luc>0?dl/luc:null,cob=ebit!=null&&rf!=null&&rf<0?ebit/(-rf):null,
    eb=ctx.estr&&ctx.k>0&&ebit!=null?ebit*ctx.k:null,regra=ctx.estr&&eb!=null?'ebitda':'padrao',lim=ctx.lim||SDEB,dleb=dl!=null&&eb>0?dl/eb:null,
    m={dl:dl,pl:pl,dlpl:dlpl,dll:dll,cob:cob,ebit:ebit,rf:rf,fco:fco,luc:luc,caixa:dl!=null&&dl<=0,regra:regra,ebitda:eb,dleb:dleb,lim:lim,estr:!!ctx.estr,setor:ctx.setor||''},f=[],mot=[];
  /* setores de dívida estrutural (locadoras, elétricas, saneamento, concessões): dívida líquida ÷ EBITDA; nos demais, ÷ patrimônio e ÷ lucro */
  var alta=regra==='ebitda'?dl!=null&&dl>0&&(eb<=0||dleb>lim):dl!=null&&dl>0&&((dlpl!=null&&dlpl>SDPL)||(dll!=null&&dll>SDLL)||(luc!=null&&luc<=0&&pl>0));
  if(alta)f.push('divida'),mot.push('dívida alta');
  if(ebit!=null&&rf!=null&&rf<0&&(ebit<=0||cob<SDCOB))f.push('juros'),mot.push('cobertura de juros baixa');
  if(fco!=null&&fco<=0)f.push('caixa'),mot.push('caixa operacional negativo');
  return {m:m,f:f,mot:mot,n:f.length,desc:[dl==null||(dlpl==null&&dll==null)?'dívida':null,ebit==null||rf==null?'juros':null,fco==null?'caixa':null].filter(Boolean)}}
function saudeFor(o){if(o&&opBanco(o))return o.fx&&o.fx.seg?sgSaude(o):bkSaude(o);if(!o)return null;var D=fxDoc(o.tk);if(!D)return null;
  try{var st=setorOf(o.tk),F=fundOf(o.tk),estr=SDESTR.test(st.s+' '+st.g);return saudeCalc(D,{estr:estr,k:F&&F.evebit>0&&F.evebitda>0?F.evebit/F.evebitda:null,lim:/aluguel de carros/i.test(st.s)?SDEBL:SDEB,setor:st.k})}catch(e){return null}}
/* os 2 maiores riscos calculados (gravidade ≥ 0,5; 1 = risco claro) */
function riscosFor(o,qual){if(o&&o.fx&&o.fx.ok&&o.fx.bank)return bkRiscos(o);if(o&&o.fx&&o.fx.ok&&o.fx.seg)return sgRiscos(o);var D=o&&fxDoc(o.tk),R=[];if(!D||!D.t)return R;var sd=o.sd||saudeFor(o),m=sd&&sd.m,pr=function(v){return pf.format(Math.abs(v))};
  if(m&&m.dl>0){if(m.regra==='ebitda'){var se=m.dleb!=null?m.dleb/m.lim:2;if(se>=0.5)R.push([se,m.dleb!=null?'dívida líquida de '+sdX(m.dleb)+' o EBITDA (limite do setor: '+sdX(m.lim)+')':'o EBITDA não cobre a dívida'])}
    else{var sv=Math.max(m.dlpl!=null?m.dlpl/SDPL:0,m.dll!=null?m.dll/SDLL:0);if(sv>=0.5)R.push([sv,'dívida líquida de '+(m.dlpl!=null?sdX(m.dlpl)+' o patrimônio':'')+(m.dlpl!=null&&m.dll!=null?' e ':'')+(m.dll!=null?sdX(m.dll)+' o lucro anual':'')])}}
  if(m&&m.cob!=null&&m.cob<3)R.push([3/Math.max(m.cob,0.3),'o lucro da operação cobre só '+sdX(m.cob)+' os juros'+(m.cob<SDCOB?' (abaixo de '+SDCOB+'×)':'')]);
  var it=((D.cmp&&D.cmp.yoy&&D.cmp.yoy.itens)||[]).filter(function(x){return x.c==='ml'})[0],tr=fxTrap(D);
  if(tr==='margem')R.push([1.5,'a margem líquida caiu 3 trimestres seguidos']);else if(it&&it.ch!=null&&it.ch<=-1)R.push([Math.abs(it.ch)/3,'a margem líquida caiu '+num(Math.abs(it.ch),1)+' p.p. em um ano']);
  if(tr==='lucro')R.push([1.5,'o lucro caiu 3 trimestres seguidos']);
  var ult=D.t.slice(-4).map(hiQ),at=(D.nr||[]).filter(function(n){return n.tipo==='alto'&&ult.indexOf(n.q)>=0})[0];
  if(at)R.push([1.2,'o lucro recente tem um trimestre acima do normal ('+at.q+'), que pode não se repetir']);
  var ql=qual?qualFor(o):null;if(ql&&ql.ap>=5&&ql.ps<=QLRISCO)R.push([1,'só '+ql.ps+' de '+ql.ap+' testes de qualidade do lucro passaram (não passaram: '+qlFalhas(ql).join(', ')+')']);
  var st=setorOf(o.tk);if(SDSELIC.test(st.s+' '+st.g))R.push([0.9,'setor sensível à Selic ('+st.k.toLowerCase()+'): juros altos pesam nas vendas e na dívida']);
  if(o.d&&o.d.k&&o.d.k.hi){var dd=o.d.price/o.d.k.hi-1;if(dd<=-0.15)R.push([Math.abs(dd)/0.3,'o preço já caiu '+Math.round(Math.abs(dd*100))+'% da máxima do ano: pode estar barato por um motivo'])}
  return R.filter(function(r){return r[0]>=0.5}).sort(function(a,b){return b[0]-a[0]}).slice(0,2).map(function(r){return r[1]})}
/* linhas da ideia: aviso de saúde (se falhou em 1) e "O que pode dar errado" */
function saudeRow(o,semR){var h='';if(o.sd&&o.sd.bank)return bkSaudeRow(o,semR);if(o.sd&&o.sd.seg)return sgSaudeRow(o,semR);if(o.sd&&o.sd.n>=1)h+='<div class="fql"><b class="opw">⚠ Saúde financeira: '+esc(o.sd.mot.join(', '))+'</b> <small class="muted">('+o.sd.n+' de 3 testes'+(o.sd.n>=2?' — por isso está em verificação':'')+')</small></div>';
  if(o.fx&&o.fx.ok&&!semR){var r=riscosFor(o,1);h+='<div class="fql"><span><b>O que pode dar errado:</b> '+(r.length?esc(r.join('; '))+'.':'<span class="muted">nenhum risco forte nos números (confira as notícias).</span>')+'</span></div>'}
  return h}
/* testes ao abrir as premissas */
function saudePrem(o){var s=o.sd;if(!s)return '';if(s.bank)return bkSaudePrem(o);if(s.seg)return sgSaudePrem(o);var m=s.m,q=function(ok,t){return '<li>'+rkLvl(ok===null?'at':ok?'ok':'al')+'<div><p style="margin:0;color:var(--fg)">'+t+'</p></div></li>'};
  var dv=m.dl==null?null:m.dl<=0?true:s.f.indexOf('divida')<0,jr=m.rf==null||m.ebit==null?null:m.rf>=0?true:s.f.indexOf('juros')<0,cx=m.fco==null?null:s.f.indexOf('caixa')<0;
  return (m.estr?'<p class="note muted" style="margin:0 0 6px"><small>Regra de dívida: '+(m.regra==='ebitda'?'dívida líquida ÷ EBITDA, limite '+sdX(m.lim)+' (setor de dívida estrutural: '+esc(m.setor)+')':'regra padrão (EBITDA indisponível para '+esc(o.tk)+')')+'.</small></p>':'')+'<ul class="rkl fqs"><li><b>Saúde financeira (últimos 12 meses)</b></li>'+
    q(dv,'Dívida: '+(m.dl==null?'sem dado':m.dl<=0?'caixa maior que a dívida':m.regra==='ebitda'?sdX(m.dleb)+' o EBITDA':(m.dlpl!=null?sdX(m.dlpl)+' o patrimônio':'')+(m.dll!=null?' · '+sdX(m.dll)+' o lucro anual':''))+(m.regra==='ebitda'?' (alta acima de '+sdX(m.lim)+' o EBITDA). Regra usada: dívida líquida ÷ EBITDA, porque '+esc(m.setor)+' é setor de dívida estrutural. EBITDA estimado: EBIT de 12 meses × (EV/EBIT ÷ EV/EBITDA).':' (alta acima de '+sdX(SDPL)+' o patrimônio ou '+sdX(SDLL)+' o lucro anual). Regra usada: dívida líquida ÷ patrimônio e ÷ lucro'+(m.estr?' (sem EBITDA disponível)':'')+'.'))+
    q(jr,'Cobertura de juros: '+(m.rf==null||m.ebit==null?'sem dado':m.rf>=0?'resultado financeiro positivo':m.cob!=null?sdX(m.cob)+' (baixa abaixo de '+sdX(SDCOB)+')':'—'))+
    q(cx,'Caixa operacional: '+(m.fco==null?'sem dado':qfmt(m.fco)))+'</ul>'}
/* regras que tiram uma ideia da lista e mandam para Em verificação (devolvem o motivo) */
function opGate(o){if(!o||!o.fx||!o.fx.ok||!o.fx.opp||!o.sd)return null;
  if(o.sd.n>=2)return 'saúde financeira: '+o.sd.mot.join(', ');
  if(o.sd.f.indexOf('caixa')>=0&&o.fx.espPct>SDCX)return 'caixa operacional negativo nos últimos 12 meses e potencial acima de '+Math.round(SDCX*100)+'%';
  return null}
/* trava de concentração: no máximo SDMAXS ideias por setor (subsetor da B3), as de melhor posição ficam */
function opCapSetor(L){var c={},skip=0,D=L.filter(function(x){var k=setorOf(x.tk).k||x.tk;c[k]=(c[k]||0)+1;if(c[k]>SDMAXS){skip++;return false}return true});return {D:D,skip:skip}}
