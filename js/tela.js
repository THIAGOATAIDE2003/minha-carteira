/* Aporte · js/tela.js — render() central, formulário de lançamento, tema e cliques gerais.
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
function render(){
  if(!BOOT)return;
  try{tapeMerge()}catch(e){}
  var R=compute();
  try{renderTape()}catch(e){}
  renderBanner();if(!($('metasbox')&&$('metasbox').contains(document.activeElement)))renderSummary(R);renderPositions(R);renderPerf(R);try{renderRisk(R)}catch(e){}renderMkt();renderTrades();renderFx();renderEvo();renderIR();if(!($('apotab').contains(document.activeElement)))renderApo();
  pvRedraw();
  if(document.activeElement!==$('c-fx'))$('c-fx').value=S.fx&&S.fx.rate&&S.fx.src!=='auto'?String(S.fx.rate).replace('.',','):'';
  $('c-fx').placeholder=S.fx&&S.fx.src==='auto'?String(S.fx.rate).replace('.',','):(MK.fxLatest?String(MK.fxLatest).replace('.',','):'5,35');
  var ft=fxToday();
  $('fx-src').textContent=ft?(ft.src==='auto'?'R$ '+num(ft.rate,4)+', automático das '+new Date(ft.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'. Digite ao lado só se quiser usar outro valor.':ft.src==='manual'?'digitado por você (apague para usar o online)':'online · fechamento de '+fmtDate(ft.date)):'sem dado online, digite o valor';
  var si=$('srcinfo');
  if(si){
    var hhm=function(t){return new Date(t).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})};
    var fl=RF.fails||[],R1=compute(),hasBR=R1.held.some(function(x){return x.p.market==='BR'}),hasUS=R1.held.some(function(x){return x.p.market==='US'});
    var brF=fl.filter(function(f){return R1.held.some(function(x){return x.p.market==='BR'&&f.indexOf(x.p.ticker)===0})}),usF=fl.filter(function(f){return R1.held.some(function(x){return x.p.market==='US'&&f.indexOf(x.p.ticker)===0})});
    var row=function(name,st,txt){return '<li><span><b>'+name+'</b><br><span class="muted small">'+txt+'</span></span><span class="stt '+st+'">'+(st==='ok'?'Funcionando':st==='err'?'Com problema':st==='wait'?'Aguardando':'Desligado')+'</span></li>'};
    var rows=[];
    rows.push(row('Dólar (AwesomeAPI)',!RF.last?'wait':fl.indexOf('dólar')>-1?'err':'ok',RF.last?(fl.indexOf('dólar')>-1?'Não respondeu na última busca.':'Atualizado às '+hhm(RF.last)+'.'):'Busca ao abrir o app.'));
    if(hasBR)rows.push(row('Ações do Brasil (brapi)',!S.keys.brapi?'off':!RF.last?'wait':brF.length?'err':'ok',!S.keys.brapi?'Falta o token brapi abaixo.':brF.length?'Sem preço para '+esc(brF.join(', ')):!mktOpen()?'Bolsa fechada: mostrando o preço de fechamento. Volta a atualizar às 10h do próximo dia útil.':RF.last?'Atualizado às '+hhm(RF.last)+'.':'Busca ao abrir o app.'));
    if(hasUS)rows.push(row('Ações dos EUA (Finnhub)',!S.keys.finnhub?'off':!RF.last?'wait':usF.length?'err':'ok',!S.keys.finnhub?'Falta a chave Finnhub abaixo.':usF.length?'Sem preço para '+esc(usF.join(', ')):RF.last?'Atualizado às '+hhm(RF.last)+'.':'Busca ao abrir o app.'));
    rows.push(row('Notícias e resumo da IA (robô)',!(MD.d&&MD.d.res)?'wait':MD.d.res.ia?(MD.d.res.err&&MD.d.res.err.length?'err':'ok'):'off',!(MD.d&&MD.d.res)?'Esperando o robô rodar.':MD.d.res.ia?(MD.d.res.err&&MD.d.res.err.length?esc(MD.d.res.err[0]):'Notícias e IA conferidas em '+rsWhen(MD.d.res.at)+'.'):'Manchetes funcionando. Para o resumo da IA, guarde a chave do Gemini no GitHub como segredo GEMINI_KEY.'));
    rows.push(row('Proventos anunciados (robô)',MD.d&&MD.d.prov?'ok':'wait',MD.d&&MD.d.prov?'Fundamentus, de '+Object.keys(MD.d.prov).length+' ações que você já comprou, inclusive as vendidas. Atualiza 2 vezes por dia.':'Esperando o robô rodar.'));
    rows.push(row('Proventos automáticos (brapi)',!S.keys.brapi?'off':DV.err?'err':DV.at?'ok':'wait',!S.keys.brapi?'Falta o token brapi.':DV.err?esc(DV.err):DV.at?'Conferidos às '+hhm(DV.at)+'. Lança sozinho os pagos a partir de '+fmtDate(S.divFrom)+'.':'Confere de hora em hora.'));
    if(hasUS)rows.push(row('Dividendos do VT (Alpha Vantage)',!S.keys.av?'off':DU.err?'err':DU.at?'ok':'wait',!S.keys.av?'Falta a chave da Alpha Vantage.':DU.err?esc(DU.err):DU.at?'Conferidos às '+hhm(DU.at)+'. '+(DU.up.length?DU.up.length+' anunciado'+(DU.up.length>1?'s':'')+' a receber.':'Nenhum anunciado agora.')+' Lança sozinho no dia do pagamento.':'Confere 2 vezes por dia.'));
    rows.push(row('Indicadores e gráficos (robô diário)',!S.keys.gh?'off':MD.err&&!MD.d?'err':MD.d?(MD.d.err&&MD.d.err.length?'err':'ok'):'wait',!S.keys.gh?'Precisa da chave do GitHub.':MD.d?'Atualizado em '+new Date(MD.d.at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+' ('+Object.keys(MD.d.hist||{}).length+' ativos, '+Object.keys((MD.d.fund||{}).d||{}).length+' ações com indicadores).'+(MD.d.err&&MD.d.err.length?' Falhou: '+esc(MD.d.err.join('; ').slice(0,160)):''):esc(MD.err||'Buscando...')));
    rows.push(row('Histórico de preços (brapi)',!S.keys.brapi?'off':HI.err&&!Object.keys(HI.px).length?'err':HI.at?(HI.err?'err':'ok'):'wait',!S.keys.brapi?'Falta o token brapi.':HI.err?esc(HI.err)+' Esses meses usam o preço médio na Evolução.':HI.at?'Preços de fechamento de '+Object.keys(HI.px).length+' ativos para a Evolução.':'Busca uma vez por dia.'));
    rows.push(row('Ibovespa e S&P 500 (brapi)',!S.keys.brapi?'off':BX.err?'err':BX.at?'ok':'wait',!S.keys.brapi?'Falta o token brapi.':BX.err?esc(BX.err):BX.at?'BOVA11 e IVVB11, atualizados 2 vezes por dia.':'Busca ao abrir o app.'));
    rows.push(row('CDI (Banco Central)',CDI.err&&!CDI.dates.length?'err':CDI.dates.length?(CDI.err?'err':'ok'):'wait',CDI.dates.length?CDI.dates.length+' dias úteis, até '+fmtDate(CDI.dates[CDI.dates.length-1])+'.'+(CDI.err?' '+esc(CDI.err):''):(CDI.err?esc(CDI.err):'Busca ao abrir o app.')));
    rows.push(row('Nuvem (GitHub)',!S.keys.gh?'off':GH.err?'err':GH.last?'ok':'wait',!S.keys.gh?'Falta a chave do GitHub acima.':GH.err?esc(GH.err):GH.last?'Sincronizado às '+hhm(GH.last)+'.':'Conectando...'));
    si.innerHTML='<ul class="calc stl">'+rows.join('')+'</ul><p class="note exp">Preços e dólar se atualizam sozinhos ao abrir o app e a cada 15 minutos. Ações do Brasil só são consultadas com a bolsa aberta (10h às 18h15, dias úteis), para não gastar a cota grátis do brapi; proventos são conferidos 2 vezes por dia e o histórico 1 vez por dia. O app abre mesmo sem internet, com os últimos dados salvos.</p>'}
  pfBox();$('k-asia').value=S.asia==='gem'?'gem':'groq';if(document.activeElement!==$('k-gq'))$('k-gq').value=S.keys.gq||'';if(document.activeElement!==$('k-gem'))$('k-gem').value=S.keys.gem||'';$('k-fh').value=S.keys.finnhub||'';$('k-br').value=S.keys.brapi||'';$('k-av').value=S.keys.av||'';if(document.activeElement!==$('k-gh'))$('k-gh').value=S.keys.gh||'';if(document.activeElement!==$('k-repo'))$('k-repo').value=S.keys.repo||'';renderSync();
  markTema();foldNotes();
  syncForm();
}

/* formulário */
var fxCustom=false,EDIT=null;
function newId(){return EDIT||Date.now().toString(36)+Math.random().toString(36).slice(2,5)}
function dropEdit(){if(!EDIT)return;var id=EDIT;S.trades=S.trades.filter(function(x){return x.id!==id});S.pend.push({t:'del',id:id})}
function endEdit(){EDIT=null;$('f-submit').textContent='Lançar';$('f-cancel').hidden=true;$('newbox').querySelector('summary').textContent='Novo lançamento'}
function startEdit(id){
  var t=S.trades.filter(function(x){return x.id===id})[0];if(!t)return;
  EDIT=id;var bx=$('newbox');bx.open=true;bx.querySelector('summary').textContent='Editar lançamento';
  $('f-market').value=t.market==='RF'?'RF':t.market;$('f-side').value=t.side==='rf'?'buy':t.side;
  $('f-ticker').value=t.ticker;$('f-date').value=t.date;$('f-qty').value=String(t.qty).replace('.',',');$('f-price').value=String(t.price).replace('.',',');$('f-taxa').value=t.taxa?String(t.taxa).replace('.',','):'';
  if(t.side==='rf'){$('f-pct').value=String(t.pct).replace('.',',');$('f-venc').value=t.venc||'';$('f-isento').checked=!!t.isento}
  fxCustom=t.market==='US';if(fxCustom)$('f-fx').value=String(t.fx).replace('.',',');
  $('f-submit').textContent='Salvar alteração';$('f-cancel').hidden=false;$('formmsg').textContent='';
  syncForm();bx.scrollIntoView({block:'start'});
}
$('tr-q').addEventListener('input',function(){renderTrades()});
$('apotab').addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.id==='apo-v'){e.preventDefault();apoCalc()}});
$('f-cancel').addEventListener('click',function(){endEdit();$('f-ticker').value='';$('f-qty').value='';$('f-price').value='';$('f-taxa').value='';$('f-pct').value='';fxCustom=false;$('f-fx').value='';syncForm()});
function syncForm(){
  var mk=$('f-market').value,isRF=mk==='RF';
  $('o-div').disabled=isRF;if(isRF&&$('f-side').value==='div')$('f-side').value='buy';
  var side=$('f-side').value,rf=isRF&&side==='buy',rs=isRF&&side==='sell',ot=side==='out',dv=side==='div'||ot||isRF;
  var us=!isRF&&mk==='US';
  $('w-fx').hidden=!us;$('w-qty').hidden=dv;$('w-taxa').hidden=dv||us;
  ['w-pct','w-venc','w-isento','w-rfhint'].forEach(function(k){$(k).hidden=!rf});$('w-isento').style.display=rf?'flex':'none';
  $('w-rfsel').hidden=!rs;
  $('l-ticker').textContent=rf?'Nome do investimento':'Ticker';$('f-ticker').placeholder=rf?'CDB Banco X':'AAPL ou PETR4';$('f-ticker').autocapitalize=rf?'sentences':'characters';
  var tl=$('f-ticker').closest('label');tl.hidden=ot||rs;$('f-ticker').required=!(ot||rs);$('f-price').required=!rs;
  if(rf){$('l-price').textContent='Valor aplicado (R$)';return}
  if(rs){
    var R0=compute(),op=(R0.rfs||[]).filter(function(c){return !c.rs}),cur=$('f-rfsel').value;
    $('f-rfsel').innerHTML=op.length?op.map(function(c){return '<option value="'+esc(c.t.id)+'">'+esc(c.t.ticker)+' · '+brl.format(c.t.price)+' em '+fmtDate(c.t.date)+'</option>'}).join(''):'<option value="">Nenhuma aplicação em aberto</option>';
    if(cur&&op.some(function(c){return c.t.id===cur}))$('f-rfsel').value=cur;
    var sel=op.filter(function(c){return c.t.id===$('f-rfsel').value})[0];
    $('l-price').textContent='Valor que caiu na conta (R$)';
    $('f-price').placeholder=sel?String(Math.round(sel.liq*100)/100).replace('.',','):'';
    return}
  $('l-price').textContent=ot?(us?'Valor retirado (US$)':'Valor retirado (R$)'):dv?(us?'Valor recebido (US$)':'Valor recebido (R$)'):(us?'Preço (US$)':'Preço (R$)');
  var d=$('f-date').value||today();
  var look=fxOn(d),ft=fxToday();
  var auto=look?{rate:look.rate,date:look.date}:(ft?{rate:ft.rate,date:null}:null);
  if(!fxCustom&&auto)$('f-fx').value=String(auto.rate).replace('.',',');
  var open=fxCustom||!auto;
  $('fx-box').hidden=!open;$('fx-edit').hidden=open;
  var txt='não informado';
  if(auto){txt='R$ '+num(auto.rate,4)+(auto.date?(auto.date===d?' (fechamento do dia)':' (fechamento de '+fmtDate(auto.date)+')'):' (o de hoje; se a operação foi em outra data, toque em "usar outro")')}
  $('fx-show').textContent=txt;
}
$('f-date').value=today();
$('f-market').addEventListener('change',syncForm);
$('f-side').addEventListener('change',syncForm);
$('f-rfsel').addEventListener('change',function(){$('f-price').value='';syncForm()});
$('f-date').addEventListener('change',syncForm);
$('fx-edit').addEventListener('click',function(){fxCustom=true;syncForm();$('f-fx').focus()});
document.addEventListener('input',function(e){if(e.target&&e.target.id==='mk-q')mkSearch(e.target.value)});
document.addEventListener('submit',function(e){var f=e.target;
  if(f.id==='cmpf'){e.preventDefault();var ca=String($('cmp-a').value||'').trim().toUpperCase(),cb=String($('cmp-b').value||'').trim().toUpperCase();if(ca&&cb){CMP=[ca,cb];renderMkt()}return}
  if(f.id==='wadd'){e.preventDefault();var tk=String($('w-tk').value||'').trim().toUpperCase().replace(/[^A-Z0-9^.]/g,'');if(!tk)return;var W=wlist().slice();if(W.indexOf(tk)<0){W.push(tk);watchSet(W)}$('w-tk').value='';renderMkt();loadMkt(true)}},true);
$('addform').addEventListener('submit',function(e){
  e.preventDefault();var m=$('formmsg');m.className='msg';m.textContent='';
  if($('f-market').value==='RF'&&$('f-side').value==='sell'){
    var rid=$('f-rfsel').value,ap=S.trades.filter(function(x){return x.id===rid&&x.side==='rf'})[0],vv=parseNum($('f-price').value||$('f-price').placeholder),dd=$('f-date').value;
    if(!ap){m.className='msg err';m.textContent='Não há aplicação em aberto para resgatar.';return}
    if(!dd||dd<ap.date||!(vv>0)){m.className='msg err';m.textContent='Confira a data e o valor que caiu na conta.';return}
    var rr={id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),side:'rfout',market:'RF',ticker:ap.ticker,ref:rid,date:dd,qty:1,price:vv,fx:1};
    S.trades.push(rr);S.pend.push({t:'add',tr:rr});save();$('f-price').value='';ghSync();
    m.textContent='Resgate de '+ap.ticker+' lançado: '+sgn(vv-ap.price)+' de resultado.';render();syncForm();return;
  }
  if($('f-market').value==='RF'&&$('f-side').value==='buy'){
    var rt={id:newId(),side:'rf',market:'RF',ticker:$('f-ticker').value.trim().slice(0,40),date:$('f-date').value,qty:1,price:parseNum($('f-price').value),fx:1,
      pct:parseNum($('f-pct').value),venc:$('f-venc').value||'',isento:$('f-isento').checked};
    if(!rt.ticker||!rt.date||!(rt.price>0)||!(rt.pct>0)||rt.pct>300){m.className='msg err';m.textContent='Confira: nome, data, valor aplicado e % do CDI (ex.: 110).';return}
    var wasE=!!EDIT;dropEdit();S.trades.push(rt);S.pend.push({t:'add',tr:rt});save();endEdit();
    $('f-ticker').value='';$('f-price').value='';$('f-pct').value='';$('f-venc').value='';$('f-isento').checked=false;
    ghSync();loadCDI(true);m.textContent=wasE?'Aplicação em '+rt.ticker+' alterada.':'Aplicação em '+rt.ticker+' lançada. Veja o rendimento na aba Carteira.';render();return;
  }
  var us=$('f-market').value==='US';
  var t={id:newId(),side:$('f-side').value,market:$('f-market').value,
    ticker:$('f-side').value==='out'?'CAIXA':$('f-ticker').value.toUpperCase().replace(/[^A-Z0-9.\-]/g,''),date:$('f-date').value,
    qty:($('f-side').value==='div'||$('f-side').value==='out')?1:parseNum($('f-qty').value),price:parseNum($('f-price').value),fx:us?parseNum($('f-fx').value):1};
  var tx=parseNum($('f-taxa').value);if(!us&&(t.side==='buy'||t.side==='sell')&&tx>0)t.taxa=Math.round(tx*100)/100;
  if(!t.ticker||!t.date||!(t.qty>0)||!(t.price>0)||(us&&!(t.fx>0))){m.className='msg err';m.textContent='Confira os campos: quantidade, preço e dólar precisam ser números maiores que zero.';return}
  var wasE2=!!EDIT;dropEdit();S.trades.push(t);S.pend.push({t:'add',tr:t});endEdit();
  if(us&&t.date===today()&&fxCustom&&!wasE2)S.fx={rate:t.fx,at:Date.now(),src:'manual'};
  save();
  $('f-ticker').value='';$('f-qty').value='';$('f-price').value='';$('f-taxa').value='';fxCustom=false;$('f-fx').value='';
  ghSync();
  var fem=t.side==='buy'||t.side==='sell';m.textContent=t.side==='out'?'Retirada lançada.':(t.side==='buy'?'Compra':t.side==='sell'?'Venda':'Provento')+' de '+t.ticker+(wasE2?(fem?' alterada.':' alterado.'):(fem?' lançada.':' lançado.'));
  render();
});
syncForm();

/* cliques */
/* explicações longas ficam recolhidas em "Entenda" */
function foldNotes(){[].forEach.call(document.querySelectorAll('p.note.exp'),function(p){
  if(p.parentNode&&p.parentNode.classList&&p.parentNode.classList.contains('info'))return;
  var d=document.createElement('details');d.className='info';var su=document.createElement('summary');su.textContent='Entenda';d.appendChild(su);
  var k=p.textContent.slice(0,40);if(INFO[k])d.open=true;d.setAttribute('data-k',k);
  p.parentNode.insertBefore(d,p);p.style.margin='6px 0 0';d.appendChild(p)})}
var INFO={};
try{new MutationObserver(function(){foldNotes()}).observe(document.body,{childList:true,subtree:true})}catch(e){}
document.addEventListener('toggle',function(e){var d=e.target;if(d&&d.classList&&d.classList.contains('info'))INFO[d.getAttribute('data-k')]=d.open},true);
function getTema(){try{return localStorage.getItem(LS+'-tema')||'atual'}catch(e){return 'atual'}}
function setTema(tm){try{localStorage.setItem(LS+'-tema',tm)}catch(e){}
  var r=document.documentElement;if(tm==='atual')r.removeAttribute('data-theme');else r.setAttribute('data-theme',tm);
  var mc=document.querySelector('meta[name="theme-color"]');if(mc)mc.content=tm==='preto'?'#202124':tm==='branco'?'#ffffff':'#0a1017';
  markTema();render()}
function markTema(){var tm=getTema();[].forEach.call(document.querySelectorAll('[data-tema]'),function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-tema')===tm))})}
document.addEventListener('click',function(e){
  var t=e.target;
  var hr=t.closest&&t.closest('[data-hero]');if(hr){heroOpen(hr.getAttribute('data-hero'));return}
  var sk=t.closest&&t.closest('[data-stk]');if(sk){var sv=sk.getAttribute('data-stk');if(sv==='close')stkClose();else stkOpen(sv);return}
  var sv=t.closest&&t.closest('[data-stv]');if(sv){STV=sv.getAttribute('data-stv');try{localStorage.setItem(LS+'-stv',STV)}catch(e){}stkRender();return}
  if(t.closest&&t.closest('[data-rmore]')){RMORE=!RMORE;if(STK.hero)heroRender();else if(STK.idx)idxRender();else stkRender();return}
  var rg=t.closest&&t.closest('[data-rng]');if(rg){STK.rng=rg.getAttribute('data-rng');stkLoad();return}
  var wd=t.closest&&t.closest('[data-wdel]');if(wd){var dk=wd.getAttribute('data-wdel');watchSet(wlist().filter(function(x){return x!==dk}));renderMkt();return}
  var wt=t.closest&&t.closest('[data-wtog]');if(wt){var tk2=wt.getAttribute('data-wtog'),W2=wlist().slice();if(W2.indexOf(tk2)>=0)W2=W2.filter(function(x){return x!==tk2});else W2.push(tk2);watchSet(W2);stkRender();renderMkt();if($('mk-q')&&$('mk-q').value)mkSearch($('mk-q').value);if(W2.indexOf(tk2)>=0)loadMkt(true);return}
  var io=t.closest&&t.closest('[data-idxo]');if(io&&!(t.closest('.idxx'))){idxOpen(io.getAttribute('data-idxo'));return}
  var mv=t.closest&&t.closest('[data-mkv]');if(mv){MKV=mv.getAttribute('data-mkv');try{localStorage.setItem(LS+'-mkv',MKV)}catch(e){}if($('mk-q'))$('mk-q').value='';renderMkt();return}
  var sr=t.closest&&t.closest('[data-scr]');if(sr){SCR=sr.getAttribute('data-scr');renderMkt();return}
  var it=t.closest&&t.closest('[data-idxt]');if(it){var ik=it.getAttribute('data-idxt'),A=idxSel().slice();if(A.indexOf(ik)>=0)A=A.filter(function(x){return x!==ik});else A.push(ik);idxSet(A);renderMkt();if($('mk-q')&&$('mk-q').value)mkSearch($('mk-q').value);if(A.indexOf(ik)>=0)loadMkt(true);return}
  if(t.closest&&t.closest('[data-mked]')){MKED=!MKED;renderMkt();return}
  var af=t.closest&&t.closest('[data-atf]');if(af){ATF=af.getAttribute('data-atf');renderPositions(compute());return}
  var as=t.closest&&t.closest('[data-asrt]');if(as){var ak2=as.getAttribute('data-asrt');if(ASRT.k===ak2)ASRT.d=-ASRT.d;else ASRT={k:ak2,d:ak2==='n'?1:-1};renderPositions(compute());return}
  var dd=t.closest&&t.closest('[data-dci]');if(dd){var dcr=$('dcar');if(dcr)dcr.scrollTo({left:+dd.getAttribute('data-dci')*dcr.clientWidth,behavior:'smooth'});return}
  var hd=t.closest&&t.closest('[data-hci]');if(hd){var hcs=$('hcards');if(hcs)hcs.scrollTo({left:+hd.getAttribute('data-hci')*hcs.clientWidth,behavior:'smooth'});return}
  var dvb=t.closest&&t.closest('[data-dvv]');if(dvb){DVV=dvb.getAttribute('data-dvv');render();return}
  var tb=t.closest&&t.closest('[data-tema]');
  if(tb){setTema(tb.getAttribute('data-tema'));return}
  var gb=t.closest&&t.closest('.spkbtn');if(gb)t=gb;
  if(false){}
  else if(t.id==='goimp'){try{location.hash='ajustes'}catch(e){}showTab('ajustes');$('k-gh').scrollIntoView();$('k-gh').focus()}
  else if(t.id==='sync-now'){ghSync(true)}
  else if(t.dataset&&t.dataset.dvy){DVY=t.dataset.dvy;render()}
  else if(t.dataset&&t.dataset.trf){TRF=t.dataset.trf;renderTrades()}
  else if(t.dataset&&t.dataset.edit){startEdit(t.dataset.edit)}
  else if(t.dataset&&t.dataset.cv){var hv=t.dataset.cv==='evo'?'evolucao':t.dataset.cv==='apo'?'aporte':t.dataset.cv==='perf'?'desempenho':t.dataset.cv==='risk'?'risco':t.dataset.cv==='ext'?'extrato':'ativos';try{location.hash=hv}catch(e){}showTab(hv)}
  else if(t.closest&&t.closest('[data-evt]')){var cb=t.closest('[data-evt]');[].forEach.call(document.querySelectorAll('[data-evt]'),function(x){x.setAttribute('aria-pressed',String(x===cb))})}
  else if(t.closest&&t.closest('[data-evf]')){var ac=t.closest('[data-evf]').getAttribute('data-evf'),sh=$('evsheet');
    if(ac==='open'&&sh){sh.hidden=false;document.body.style.overflow='hidden'}
    else if(ac==='close'){sh.hidden=true;document.body.style.overflow=''}
    else if(ac==='reset'||ac==='save'){if(ac==='reset')EVF={p:'all',t:'all'};else{var rp=document.querySelector('input[name=evp]:checked'),ct=document.querySelector('[data-evt][aria-pressed=true]');EVF={p:rp?rp.value:'all',t:ct?ct.getAttribute('data-evt'):'all'}}
      try{localStorage.setItem(LS+'-evof',JSON.stringify(EVF))}catch(e){}document.body.style.overflow='';renderEvo()}}
  else if(t.classList&&t.classList.contains('sheet')){t.hidden=true;document.body.style.overflow=''}
  else if(t.dataset&&t.dataset.iry){IRY=t.dataset.iry;renderIR()}
  else if(t.id==='apo-go'){apoCalc()}
  else if(t.id==='al-save'){alvSave()}
  else if(t.id==='al-pf'){var a=pfAlvo();if(a){['BR','US','RF'].forEach(function(k){var i=$('al-'+k);if(i)i.value=String(a[k])});var m=$('al-msg');if(m){m.className='msg';m.textContent='Preenchi com o seu perfil. Toque em Salvar divisão.'}}}
  else if(t.id==='mt-save'){metasSave()}
  else if(t.dataset&&t.dataset.mais){try{location.hash=t.dataset.mais}catch(e){}showTab(t.dataset.mais)}
  else if(t.dataset&&t.dataset.goto){try{location.hash=t.dataset.goto}catch(e){}showTab(t.dataset.goto)}
  else if(t.dataset&&t.dataset.rfok){
    var rid=t.dataset.rfok,ap=S.trades.filter(function(x){return x.id===rid})[0],dd=$('rfd-'+rid).value,vv=parseNum($('rfv-'+rid).value);
    if(!ap||!dd||!(vv>0)||dd<ap.date){warnIn('Confira a data e o valor do resgate.');return}
    var rr={id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),side:'rfout',market:'RF',ticker:ap.ticker,ref:rid,date:dd,qty:1,price:vv,fx:1};
    S.trades.push(rr);S.pend.push({t:'add',tr:rr});save();render();ghSync();
    $('status').className='msg muted';$('status').textContent='Resgate de '+ap.ticker+' lançado: '+sgn(vv-ap.price)+' de resultado.';
  }
  else if(t.dataset&&t.dataset.del){
    if(t.dataset.arm){var did=t.dataset.del;var gone=S.trades.filter(function(x){return x.id===did||x.ref===did}).map(function(x){return x.id});S.trades=S.trades.filter(function(x){return gone.indexOf(x.id)<0});gone.forEach(function(g){S.pend.push({t:'del',id:g})});save();render();ghSync()}
    else{t.dataset.arm='1';t.textContent='Confirmar exclusão?';setTimeout(function(){if(t.isConnected){delete t.dataset.arm;t.textContent='Excluir'}},3000)}
  }
});
document.addEventListener('change',function(e){
  var t=e.target;
  if(t.dataset&&t.dataset.quote){
    var v=parseNum(t.value);
    var tk=t.dataset.quote,ps=compute().held.filter(function(x){return x.p.ticker===tk})[0];
    if(v>0&&ps&&(v>ps.P0*5||v<ps.P0/5)){warnIn('O preço digitado para '+tk+' ('+num(v,2)+') está muito longe do seu preço médio ('+num(ps.P0,2)+'). Confira a vírgula.');render();return}
    if(v>0){S.quotes[tk]={price:v,at:Date.now(),src:'manual'}}else{delete S.quotes[tk]}
    $('status').textContent='';
    save();render();
  }else if(t.id==='c-fx'){
    var r=parseNum(t.value);
    if(r>0&&(r<3||r>10)){warnIn('O dólar digitado ('+num(r,2)+') parece errado. Confira a vírgula, por exemplo 5,58.');t.value=S.fx&&S.fx.rate?String(S.fx.rate).replace('.',','):'';return}
    S.fx=r>0?{rate:r,at:Date.now(),src:'manual'}:null;save();$('status').textContent='';render();
  }else if(t.id==='k-asia'){S.asia=t.value==='gem'?'gem':'groq';save();
  }else if(t.id==='k-gq'||t.id==='k-gem'){
    S.keys.gq=$('k-gq').value.trim();S.keys.gem=$('k-gem').value.trim();save();
  }else if(t.id==='k-fh'||t.id==='k-br'||t.id==='k-av'){
    var av0=S.keys.av;S.keys.finnhub=$('k-fh').value.trim();S.keys.brapi=$('k-br').value.trim();S.keys.av=$('k-av').value.trim();save();
    if(S.keys.av&&S.keys.av!==av0){DU.at=0;loadDivsUS(true)}
  }else if(t.id==='k-gh'||t.id==='k-repo'){
    var was=S.keys.gh;S.keys.gh=$('k-gh').value.replace(/\s/g,'');S.keys.repo=$('k-repo').value.trim();save();
    if(S.keys.gh&&S.keys.gh!==was)S.ghInit=false;ghSync(true);
  }
});
