/* Aporte · js/macro.js — Macro simples (1.69.0).
   O robô (repositório de dados) grava macro.json com Selic, IPCA 12 meses, dólar (PTAX) e Focus de Selic, e o app lê a cópia em MD.d.macro.
   Aqui o app só LÊ esses números e descreve o momento. Nada de previsão. Tudo é regra fixa de código, sem IA.
   Se o macro estiver faltando ou velho (macroOk() falso), o app funciona igual e esconde tudo do "vento macro". */
var MCPEN=12,       /* pontos tirados do ranking quando o vento é contrário (a ideia perde posição, mas não sai da lista) */
    MCDIAS=7,       /* macro com coleta mais velha que isso é escondido */
    MCCONC=0.5,MCMIN=3; /* aviso de concentração: mais de 50% das ideias (mínimo 3) dependem da mesma variável */
/* TABELA DE SENSIBILIDADE (editável). Cada linha: [texto que casa com "Setor|Subsetor" da B3, efeito da Selic CAINDO, efeito do dólar ALTO, motivo da Selic, motivo do dólar].
   Efeito: 1 = beneficiado, 0 = neutro, -1 = prejudicado. A primeira linha que casar vale; o que não casa é neutro. */
var MCTAB=[
  [/Incorpora|Construção Civil|Produtos para Construção|Intermediação Imobiliária/,1,0,'financiamento mais barato e mais vendas',''],
  [/Exploração de Imóveis/,1,0,'juro menor valoriza imóveis e reduz a dívida',''],
  [/Aluguel de carros/,1,0,'frota é comprada com dívida; juro menor ajuda a margem',''],
  [/Tecidos, Vestuário|Calçados|Eletrodomésticos|Produtos Diversos|Móveis|Utilidades Domésticas|Comércio\|/,1,0,'varejo vende mais a prazo e paga menos juros',''],
  [/Serviços Educacionais/,1,0,'juro menor ajuda o financiamento e a dívida',''],
  [/Energia Elétrica|Água e Saneamento|Gás\|Gás|Exploração de Rodovias/,1,0,'setor de dívida alta e fluxo estável; juro menor alivia',''],
  [/Previdência e Seguros|Seguradoras/,-1,0,'seguradoras ganham mais com a Selic alta',''],
  /* bancos: efeito misto, por isso neutro no ranking; o texto (6º e 7º itens) explica os dois lados */
  [/Intermediários Financeiros|Bancos/,0,0,'','','favorece o crédito e reduz o custo de captação, mas pode comprimir a margem','o contrário: encarece o crédito e a captação, mas pode ampliar a margem'],
  [/Serviços Financeiros Diversos/,1,0,'juro menor atrai investidores para a bolsa e aumenta o volume negociado',''],
  [/Mineração|Minerais Metálicos|Siderurgia|Papel e Celulose|Madeira/,0,1,'','vende em dólar e gasta em reais'],
  [/Petróleo, Gás|Exploração, Refino/,0,1,'','vende em dólar e gasta em reais'],
  [/Agropecuária|Agricultura|Carnes e Derivados|Açucar e Alcool/,0,1,'','exporta e recebe em dólar'],
  [/Material Aeronáutico/,0,1,'','exporta e recebe em dólar'],
  [/Transporte Aéreo|Viagens e Turismo/,0,-1,'','custos (combustível, leasing) em dólar'],
  [/Medicamentos e Outros|Computadores e Equipamentos/,0,-1,'','compra insumos e produtos em dólar'],
  [/Fertilizantes e Defensivos/,0,-1,'','importa insumos em dólar']
];
function macroDias(d){if(!d)return 9999;var a=new Date(d+'T12:00:00Z').getTime(),b=new Date(today()+'T12:00:00Z').getTime();return isFinite(a)?Math.round((b-a)/864e5):9999}
function macroGet(){var m=MD.d&&MD.d.macro;return m&&m.regime&&m.regime.r&&m.selic&&m.selic.meta!=null&&m.coleta?m:null}
/* macro utilizável? precisa existir e ter sido coletado nos últimos MCDIAS dias */
function macroOk(){var m=macroGet();return !!m&&macroDias(m.coleta)<=MCDIAS&&macroDias(m.coleta)>=-1}
function macroSens(tk){var s=setorOf(tk),t=(s.g||'')+'|'+(s.s||'');for(var i=0;i<MCTAB.length;i++)if(MCTAB[i][0].test(t))return {selic:MCTAB[i][1],dolar:MCTAB[i][2],rs:MCTAB[i][3],rd:MCTAB[i][4],nq:MCTAB[i][5]||'',na:MCTAB[i][6]||'',setor:s.k||s.g||''};return {selic:0,dolar:0,rs:'',rd:'',setor:s.k||s.g||''}}
/* dependências do setor: de que a Selic caia / o dólar suba ou caia */
function macroDep(tk){var x=macroSens(tk),d=[];if(x.selic>0)d.push('selic-queda');if(x.selic<0)d.push('selic-alta');if(x.dolar>0)d.push('dolar-alto');if(x.dolar<0)d.push('dolar-baixo');return d}
var MCDN={'selic-queda':'queda da Selic','selic-alta':'Selic alta','dolar-alto':'dólar alto','dolar-baixo':'dólar baixo'};
/* vento macro de uma ação: soma do efeito da Selic (pelo regime) e do dólar (pelo nível); >0 favorável, <0 contrário, 0 neutro */
function macroVento(tk){if(!macroOk())return null;var m=macroGet(),x=macroSens(tk),r=m.regime.r,nv=m.dolar&&m.dolar.nivel,
    es=r==='caindo'?x.selic:r==='subindo'?-x.selic:0,ed=nv==='alto'?x.dolar:nv==='baixo'?-x.dolar:0,v=es+ed,p=[];
  /* o motivo da tabela descreve um lado só (Selic: o lado que ajuda; dólar: o efeito do dólar ALTO); no cenário oposto o texto diz "o contrário de ..." */
  var CT='o contrário de: ';
  if(es)p.push((r==='caindo'?'Selic em queda':'Selic em alta')+(es>0?' ajuda':' pesa')+': '+((x.selic>0?r==='caindo':r==='subindo')?'':CT)+x.rs);
  if(ed)p.push('dólar '+nv+(ed>0?' ajuda':' pesa')+': '+(nv==='alto'?'':CT)+x.rd);
  if(!es&&(x.nq||x.na)&&(r==='caindo'||r==='subindo'))p.push((r==='caindo'?'Selic em queda tem efeito misto: ':'Selic em alta tem efeito misto: ')+(r==='caindo'?x.nq:x.na));
  if(!p.length)p.push(x.selic||x.dolar?'o cenário atual (Selic '+r.replace('estavel','estável')+', dólar '+(nv||'normal')+') não mexe com este setor':'setor sem sensibilidade clara à Selic ou ao dólar');
  return {v:v>0?1:v<0?-1:0,n:v>0?'favorável':v<0?'contrário':'neutro',w:p.join('; ')+'.',setor:x.setor}}
function macroRow(o){var v=o&&o.tk?macroVento(o.tk):null;if(!v)return '';
  return '<div class="fql"><span><b>Vento macro:</b> <b class="mv'+(v.v>0?'g':v.v<0?'l':'m')+'">'+v.n+'</b> <small class="muted">'+esc(v.w)+(v.v<0?' (perde pontos no ranking)':'')+'</small></span></div>'}
/* aviso no topo: mais de 50% das ideias dependem da mesma variável */
function macroConc(L){if(!macroOk()||!L||L.length<MCMIN)return null;var c={};L.forEach(function(o){macroDep(o.tk).forEach(function(k){c[k]=(c[k]||0)+1})});
  var best=null;Object.keys(c).forEach(function(k){if(c[k]/L.length>MCCONC&&(!best||c[k]>best.n))best={k:k,n:c[k],t:L.length}});return best}
function macroConcHtml(L){var b=macroConc(L);if(!b)return '';
  return '<p class="note mcw"><b>Atenção:</b> '+b.n+' de '+b.t+' ideias dependem de '+(b.k==='selic-queda'?'queda da Selic':MCDN[b.k])+'. Se isso não acontecer, várias podem ir mal juntas.</p>'}
function macroPt(v){return (+v).toFixed(2).replace('.',',')}
function macroDmy(d){var a=String(d||'').split('-');return a.length===3?a[2]+'/'+a[1]+'/'+a[0].slice(2):''}
/* painel curto com o cenário, e o balão com "como foi decidido" */
function macroPanel(){if(!macroOk())return '';var m=macroGet(),s=m.selic,rg=m.regime,rn={caindo:'caindo',subindo:'subindo',estavel:'estável'}[rg.r]||rg.r,
    nv=m.dolar&&m.dolar.nivel,F=m.focus&&m.focus.fim,y=String(new Date().getFullYear()),
    como=(rg.como||[]).join(' ')+' Fonte: '+(m.fonte||'Banco Central')+'. Dados de '+macroDmy(m.coleta)+'.';
  return '<div class="mcp"><div><b>Cenário macro</b> '+bal(como)+' <small class="muted">Banco Central, '+macroDmy(m.coleta)+'</small></div>'+
    '<div class="mcl"><span>Selic <b>'+macroPt(s.meta)+'%</b> <small>('+rn+')</small></span>'+(m.ipca12?'<span>IPCA 12m <b>'+macroPt(m.ipca12.v)+'%</b></span>':'')+(m.dolar?'<span>Dólar <b>R$ '+macroPt(m.dolar.v)+'</b> <small>('+esc(nv||'')+')</small></span>':'')+
    (F&&F[y]!=null?'<span>Focus fim de '+y+' <b>'+macroPt(F[y])+'%</b></span>':'')+(F&&F[String(+y+1)]!=null?'<span>fim de '+(+y+1)+' <b>'+macroPt(F[String(+y+1)])+'%</b></span>':'')+'</div></div>'}
function macroKey(){var m=macroOk()?macroGet():null;return m?m.coleta+m.regime.r+(m.dolar&&m.dolar.nivel||''):'-'}
