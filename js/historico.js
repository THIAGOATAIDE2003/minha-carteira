/* Histórico de 12 trimestres da empresa (1.63.0): balanço, fluxo de caixa, comparações e tendência.
   Os números vêm prontos do robô (scripts/cvm.py -> dados/cvm/<TICKER>.json no repositório privado); o app só baixa o arquivo da ação aberta e mostra. */
var HIL={};
function hiDoc(tk){var c=FIN['cvm/'+tk];if(c&&c.d!==undefined&&!c.p)return c.d;
  if(!HIL[tk]){HIL[tk]=1;finGet('cvm',tk).then(function(){try{if(STK.tk===tk&&STV==='tri')stkRender()}catch(e){}})}
  return undefined}
function hiQ(r){return r.t+'T'+String(r.a).slice(2)}
function hiPp(v){return (v>0?'+':v<0?'−':'')+pf.format(Math.abs(v))+' p.p.'}
var HIN={rec:'Receita',luc:'Lucro',ml:'Margem líquida',fco:'Caixa operacional',dl:'Dívida líquida'};
function hiItem(it){var k=it.s==null?'muted':it.s>0?'gain':it.s<0?'loss':'muted',t;
  if(it.ch==null){if(it.s==null)return '';t=it.s>0?'melhorou':it.s<0?'piorou':'igual'}else t=it.c==='ml'?hiPp(it.ch):csPc(it.ch*100);
  return '<span class="hii"><span class="muted">'+HIN[it.c]+'</span> <b class="num '+k+'">'+t+'</b></span>'}
function hiCmp(c,tit){if(!c)return '';var k=c.tend==='melhorando'?'gain':c.tend==='piorando'?'loss':'muted',its=(c.itens||[]).map(hiItem).filter(Boolean).join('');
  return '<div class="hic"><p class="anv" style="margin:8px 0 2px">'+esc(c.para)+' contra '+esc(c.de)+' '+tit+': '+(c.tend?'<b class="'+k+'">'+c.tend.charAt(0).toUpperCase()+c.tend.slice(1)+'</b>':'<span class="muted">poucos dados</span>')+'</p>'+(its?'<div class="hil">'+its+'</div>':'')+'</div>'}
function hiNr(D){var ult=(D.t||[]).slice(-8).map(hiQ);
  return (D.nr||[]).filter(function(n){return ult.indexOf(n.q)>=0}).map(function(n){
    return '<p class="note hiw">⚠ <b>'+esc(n.q)+'</b>: o lucro de '+qfmt(n.luc)+' foge do padrão dos trimestres anteriores (perto de '+qfmt(n.med)+'). Pode ter sido algo que não se repete'+(n.tipo==='alto'?', como venda de ativo, ganho contábil ou efeito de imposto':', como baixa contábil, provisão ou efeito de imposto')+'. Não conte com esse valor como normal.</p>'}).join('')}
function hiHtml(tk){var D=hiDoc(tk),tt='Histórico de trimestres '+bal('Até 12 trimestres da empresa, vindos dos balanços entregues à CVM (ITR e DFP). Receita, lucro, caixa e dívida são do balanço; margem, dívida líquida (dívida menos caixa), ROE dos últimos 12 meses e as comparações são calculadas por regras, não por IA. A tendência olha receita, lucro, margem, caixa operacional e dívida líquida: melhorando, estável ou piorando.');
  if(D===undefined)return '<div class="panel"><h2>'+tt+'</h2><p class="muted">Carregando o histórico…</p></div>';
  if(!D||!D.t||!D.t.length)return '';
  var rows=D.t.slice(-8).reverse().map(function(r){var m=function(v){return v==null?'<span class="muted">—</span>':qfmt(v)};
    return '<tr><td>'+hiQ(r)+'</td><td class="num">'+m(r.rec)+'</td><td class="num">'+m(r.luc)+'</td><td class="num">'+(r.ml==null?'<span class="muted">—</span>':pf.format(r.ml)+'%')+'</td><td class="num">'+m(r.dl)+'</td><td class="num">'+(r.roe==null?'<span class="muted">—</span>':pf.format(r.roe)+'%')+'</td><td class="num">'+m(r.fco)+'</td></tr>'}).join('');
  var C=D.cmp||{};
  return '<div class="panel"><h2>'+tt+'</h2>'+hiCmp(C.yoy,'(mesmo trimestre do ano passado)')+hiCmp(C.qoq,'(trimestre anterior)')+hiNr(D)+
    '<div class="atsc"><table class="tb"><thead><tr><th>Tri</th><th>Receita</th><th>Lucro</th><th>Margem</th><th>Dív. líq.</th><th>ROE 12m</th><th>Caixa op.</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
    '<p class="note">Fonte: '+esc(D.fonte||'CVM')+'. Referência: '+esc(fmtDate(D.ref))+' · coletado em '+esc(fmtDate(D.coleta))+'. Dívida líquida = empréstimos e financiamentos menos caixa e aplicações (não se aplica a bancos). Caixa op. = caixa das atividades operacionais. A comparação com o mesmo trimestre do ano passado é a mais justa, porque tira a sazonalidade.</p></div>'}
