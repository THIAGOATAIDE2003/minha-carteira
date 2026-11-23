/* Aporte · js/qualidade.js — "Por que apareceu" e Qualidade dos lucros das Ideias (1.78.0, E5).
   Só lê o histórico da CVM que o app já baixou (fxDoc, em faixa.js) e números já calculados em o.fx, o.sd e o.A. Contas por código, sem IA, sem rede, sem custo.
   Não muda nota, lista, ordem nem ranking: é só texto na linha (Por que apareceu) e nas Premissas (Qualidade dos lucros; risco só quando é ruim).
   6 testes simples dos últimos 12 meses contra os 12 anteriores (trimestres seguidos). Dado faltando = null ("não aplicável"), nunca "passou".
   Bancos: só lucro e ROE; seguradoras: só lucro; bolsa (B3SA3) e não financeiras: os 6. Só define funções e constantes (nada roda na carga). */
var QLMIN=4,QLRISCO=2,QLNOME=['Lucro','Caixa','Margem','Dívida','ROE','Receita'],
  QLMOT={2:'caixa de banco ou seguradora não mede a qualidade do lucro',3:'receita de banco ou seguradora não é comparável ao lucro',4:'dívida líquida não existe para esta empresa',5:'o patrimônio não é o motor do lucro de uma seguradora',6:'receita de banco ou seguradora não é comparável ao lucro'};
function qlTipo(tk){return bkIs(tk)?'banco':sgKind(tk)==='seguradora'?'seg':'nf'}
function qlSeq(t){for(var i=1;i<t.length;i++)if(t[i].a*4+t[i].t!==t[i-1].a*4+t[i-1].t+1)return false;return true}
function qlSum(t,k){var s=0,i;for(i=0;i<t.length;i++){if(t[i][k]==null)return null;s+=t[i][k]}return s}
/* pura (testável no Node): D = arquivo do histórico (D.t com a, t, rec, luc, pl, fco, dl); tipo = 'nf' | 'banco' | 'seg' */
function qlCalc(D,tipo){var T=D&&D.t||[],n=T.length,pc=function(v){return pf.format(v*100)+'%'},
  u4=n>=4?T.slice(-4):null,ok4=!!u4&&qlSeq(u4),w8=n>=8?T.slice(-8):null,ok8=!!w8&&qlSeq(w8),cur=ok8?w8.slice(4):u4,ant=ok8?w8.slice(0,4):null,w5=n>=5?T.slice(-5):null,ok5=!!w5&&qlSeq(w5),
  luc=ok4?qlSum(u4,'luc'):null,lucP=ok8?qlSum(ant,'luc'):null,rec=ok8?qlSum(cur,'rec'):null,recP=ok8?qlSum(ant,'rec'):null,fco=ok4?qlSum(u4,'fco'):null,
  plU=ok8?w8[7].pl:null,plP=ok8?w8[3].pl:null,dl=ok5?w5[4].dl:null,dl4=ok5?w5[0].dl:null,
  R=[],i,r,tx,na='não aplicável (dados insuficientes)';
  for(i=1;i<=6;i++){r=null;tx=na;
    var vale=tipo==='nf'||(tipo==='banco'&&(i===1||i===5))||(tipo==='seg'&&i===1);
    if(!vale)tx='não se aplica: '+QLMOT[i];
    else if(i===1&&luc!=null){r=luc>0;tx='lucro dos últimos 12 meses de '+qfmt(luc)}
    else if(i===2&&luc!=null&&luc>0&&fco!=null){r=fco>=luc;tx='caixa operacional de '+qfmt(fco)+' contra lucro de '+qfmt(luc)}
    else if(i===2&&luc!=null&&luc<=0)tx='não aplicável (lucro de 12 meses não positivo)';
    else if(i===3&&luc!=null&&lucP!=null&&rec>0&&recP>0){var m1=luc/rec,m0=lucP/recP;r=m1>=m0;tx='margem líquida de '+pc(m1)+' contra '+pc(m0)+' nos 12 meses anteriores'}
    else if(i===4&&dl!=null&&dl4!=null){r=dl<dl4;tx='dívida líquida de '+qfmt(dl)+' contra '+qfmt(dl4)+' um ano atrás'}
    else if(i===5&&luc!=null&&lucP!=null&&plU>0&&plP>0){var e1=luc/plU,e0=lucP/plP;r=e1>e0;tx='ROE (lucro de 12 meses ÷ patrimônio) de '+pc(e1)+' contra '+pc(e0)}
    else if(i===6&&rec!=null&&recP!=null){r=rec>recP;tx='receita de '+qfmt(rec)+' contra '+qfmt(recP)}
    R.push({k:'T'+i,n:QLNOME[i-1],r:r,tx:tx})}
  var ap=R.filter(function(x){return x.r!==null}).length,ps=R.filter(function(x){return x.r===true}).length,
    ult=u4?u4.map(hiQ):[],at=u4?(D.nr||[]).filter(function(x){return x.tipo==='alto'&&ult.indexOf(x.q)>=0})[0]:null;
  return {tipo:tipo,t:R,ap:ap,ps:ps,ress:at?'o lucro de '+at.q+' ficou acima do normal e está nos 12 meses (pode não se repetir); o resultado dos testes não muda por causa disso':null}}
function qlFalhas(q){return q&&q.t?q.t.filter(function(x){return x.r===false}).map(function(x){return x.n.toLowerCase()}):[]}
/* o.ql é calculado uma vez por montagem da lista; arquivo ainda baixando = sem cálculo (a linha aparece quando chegar) */
function qualFor(o){if(!o)return null;if(o.ql!==undefined)return o.ql;var D=fxDoc(o.tk);if(D===undefined)return null;if(!D||!D.t)return (o.ql=null);try{o.ql=qlCalc(D,qlTipo(o.tk))}catch(e){o.ql=null}return o.ql}
/* bloco das Premissas: 6 itens com símbolo e cor (✓ passou, ✗ não passou, — não aplicável) */
function qlPrem(o){var q=qualFor(o);if(!q)return '';
  var pl=q.ap===0?' · dados insuficientes':(q.tipo==='nf'&&q.ap>=QLMIN)||(q.tipo==='banco'&&q.ap===2)?' · '+q.ps+' de '+q.ap+' passaram':'',
    it=q.t.map(function(x){var s=x.r===null?'—':x.r?'✓':'✗',lb=x.n+': '+(x.r===null?'não aplicável':x.r?'passou':'não passou');
      return '<li aria-label="'+esc(lb)+'">'+rkLvl(x.r===null?'at':x.r?'ok':'al')+'<div><p style="margin:0;color:var(--fg)"><b>'+s+'</b> '+esc(x.n)+': '+esc(x.tx)+'</p></div></li>'}).join('');
  return '<ul class="rkl fqs"><li><b>Qualidade dos lucros (12 meses contra os 12 anteriores)'+pl+'</b> '+bal('Teste simples, ano contra ano, com dados da CVM. Não é nota nem recomendação. Empresa que investe muito pode reprovar em dívida; banco e seguradora têm menos testes porque caixa, dívida e receita não são comparáveis.')+'</li>'+it+(q.ress?'<li>'+rkLvl('at')+'<div><p style="margin:0;color:var(--fg)">⚠ '+esc(q.ress.charAt(0).toUpperCase()+q.ress.slice(1))+'.</p></div></li>':'')+'</ul>'}
/* até 2 frases curtas, por regra, na ordem de prioridade; tudo vem de o.fx, o.sd, o.ql, o.A (sem IA, nada inventado) */
function opPorque(o){var P=[],f=o&&o.fx,add=function(t){if(P.length<2)P.push(t)};if(!o||!f||!f.ok)return P;
  if(f.est==='abaixo')add('abaixo do cenário conservador (margem de '+Math.round(Math.max(0,f.ms*100))+'%)');else if(f.est==='perto'){var ds=Math.max(0,-f.ms*100);add(ds<=3?'muito perto do cenário conservador':'a '+num(ds,1)+'% do cenário conservador')}
  var sd=o.sd;if(sd&&!sd.bank&&!sd.seg&&sd.n===0&&sd.m){if(sd.m.caixa)add('mais caixa que dívida');else if(!(sd.desc||[]).length)add('3 testes de saúde financeira em dia')}
  var D=fxDoc(o.tk),y=D&&D.cmp&&D.cmp.yoy;if(y&&y.tend==='melhorando'){var ch=function(c){var x=(y.itens||[]).filter(function(i){return i.c===c})[0];return x&&x.ch}
    add(ch('luc')>0&&ch('ml')>0?'lucro e margem melhorando':'tendência do último ano melhorando')}
  var q=qualFor(o);if(q&&q.ap>=5&&q.ps>=5)add('lucros de boa qualidade ('+q.ps+' de '+q.ap+' testes)');
  try{var vv=vtSetor(setorRk(o.tk));if(vv.filter(function(x){return x[0]==='favor'}).length>vv.filter(function(x){return x[0]==='contra'}).length)add('vento do setor a favor')}catch(e){}
  var N=o.A&&o.A.N||{};if(N.dy>=6&&N.dy<=15)add('dividendos de '+pf.format(N.dy)+'%');
  if(o.score>=8)add('nota alta ('+num(o.score,1)+')');return P}
function porqueRow(o){if(!o||!o.novo)return '';var P=opPorque(o);if(!P.length)return '';
  return '<div class="fql"><span><b>Por que apareceu:</b> '+esc(P.join(' · '))+'. '+bal('Resumo automático dos números do app; é um ponto de partida para estudar, não recomendação.')+'</span></div>'}
