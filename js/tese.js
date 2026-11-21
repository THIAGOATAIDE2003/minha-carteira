/* Aba Tese da página da ação: a tese do próprio usuário (por que tem, o que acompanha, o que quebraria), com os números de hoje ao lado.
   Fica em S.teses (sincronizada como cfg 'teses' no repositório privado); o app NUNCA diz se a tese está certa, só mostra os fatos. */
var THE=null;
function thOf(tk){return S.teses&&S.teses[tk]||null}
function thLn(s){return String(s||'').split('\n').map(function(x){return x.replace(/^[\s•\-–]+/,'').trim()}).filter(Boolean)}
function thSave(tk,o){S.teses=S.teses||{};if(o)S.teses[tk]=o;else delete S.teses[tk];S.pend=S.pend||[];S.pend.push({t:'cfg',k:'teses',v:S.teses});save();try{OPC={}}catch(e){}try{ghSync()}catch(e){}}
/* números de hoje ligados ao que a tese diz acompanhar (só fatos do app, sem veredito) */
function thChk(tk){var L=[],F=isBR(tk)?fundOf(tk):null,q=isBR(tk)?cvmQ(tk):null,t=q?qTtm(q):null,T=q?trLeit(q):null,C=csD(tk),
    g=function(v){return (v>=0?'+':'−')+pf.format(Math.abs(v*100))+'%'};
  if(t&&t.g!=null)L.push(['Lucro dos últimos 12 meses',qfmt(t.a),g(t.g)+' contra os 12 meses anteriores',t.g>=0?'gain':'loss']);
  if(T)L.push(['Trimestres (contra o ano anterior)',T.t,T.tx,T.k==='bom'?'gain':T.k==='mau'?'loss':'muted']);
  if(F){if(F.roe!=null)L.push(['ROE',pf.format(F.roe)+'%','retorno sobre o patrimônio','']);if(F.dy!=null)L.push(['Dividendos (DY)',pf.format(F.dy)+'%','últimos 12 meses','']);if(F.divpl!=null)L.push(['Dívida / patrimônio',num(F.divpl,2),'','']);if(F.ml!=null)L.push(['Margem líquida',pf.format(F.ml)+'%','','']);if(F.cr5!=null)L.push(['Crescimento da receita (5 anos)',pf.format(F.cr5)+'%','por ano, média','']);}
  if(C&&C.rk!=null){var rk=C.rk,rot=rk<=1.5?'Compra forte':rk<=2.5?'Compra':rk<=3.5?'Manter':rk<=4.5?'Venda':'Venda forte';L.push(['Analistas',rot,(C.n?C.n+' analistas':''),'']);}
  return L}
function thHtml(tk,d){var T=thOf(tk),h='';
  if(THE===tk)return thForm(tk,T);
  if(!T)return '<div class="panel"><h2>Minha tese '+bal('Escreva por que você tem essa ação, o que vai acompanhar e o que faria você rever a decisão. Quando o preço cair ou o balanço vier ruim, a tese está aqui para você decidir sem pressa.')+'</h2><p class="muted">Você ainda não escreveu a tese desta ação.</p><button type="button" class="btn" data-th="edit">Escrever minha tese</button></div>';
  var dias=T.at?Math.round((Date.parse(today())-Date.parse(T.at))/864e5):null,ls=function(a){return a&&a.length?'<ul class="thq">'+a.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>':''};
  h+='<div class="panel"><div class="grp"><h2>Minha tese '+bal('Escrita por você. O app só mostra os números de hoje ao lado, para você conferir. Ele não diz se a tese está certa ou errada: isso é leitura sua.')+'</h2><button type="button" class="btn small ghost" data-th="edit">Editar</button></div>'+
    (T.papel?'<p class="anv" style="margin:2px 0 6px"><b>Papel na carteira:</b> '+esc(T.papel)+'</p>':'')+
    (T.res?'<p class="anv" style="margin:6px 0">'+esc(T.res)+'</p>':'')+
    (T.por?'<h3 class="rkh3">Por que eu tenho</h3><p class="anv" style="margin:2px 0">'+esc(T.por)+'</p>':'')+
    (T.acomp&&T.acomp.length?'<h3 class="rkh3">O que eu acompanho</h3>'+ls(T.acomp):'')+
    (T.quebra&&T.quebra.length?'<h3 class="rkh3">O que me faria rever</h3>'+ls(T.quebra):'')+
    (T.nota?'<h3 class="rkh3">Anotação</h3><p class="anv" style="margin:2px 0">'+esc(T.nota)+'</p>':'')+
    '<p class="note">'+(T.at?'Escrita/revisada em '+esc(T.at.split('-').reverse().join('/'))+(dias>=180?' · <b class="loss">há '+dias+' dias: vale rever</b>':''):'')+'</p></div>';
  var K=thChk(tk);
  if(K.length)h+='<div class="panel"><h2>Os números de hoje '+bal('Dados do app ligados ao que a sua tese manda acompanhar. São só fatos, com fonte e data nas outras abas. Quem decide se a tese continua de pé é você.')+'</h2><ul class="thck">'+K.map(function(r){return '<li><span>'+r[0]+(r[2]?'<small>'+esc(r[2])+'</small>':'')+'</span><b class="'+r[3]+'">'+esc(r[1])+'</b></li>'}).join('')+'</ul><p class="note">Fontes: CVM (balanços), Fundamentus (indicadores) e Yahoo Finance (analistas). Veja detalhes nas abas Resultados e Indicadores.</p></div>';
  return h}
function thForm(tk,T){T=T||{};var ta=function(id,lb,v,rows,ph){return '<label class="small muted" for="'+id+'" style="display:block;margin:10px 0 4px">'+lb+'</label><textarea id="'+id+'" rows="'+rows+'" placeholder="'+(ph||'')+'" style="width:100%;box-sizing:border-box">'+esc(v||'')+'</textarea>'};
  return '<div class="panel"><h2>Minha tese · '+esc(tk)+'</h2>'+
    ta('th-papel','Papel na carteira (uma linha)',T.papel,1,'ex.: principal geradora de dividendos')+ta('th-res','Resumo da tese',T.res,5)+ta('th-por','Por que eu tenho',T.por,4)+
    ta('th-acomp','O que eu acompanho (um item por linha)',(T.acomp||[]).join('\n'),6)+ta('th-quebra','O que me faria rever (um item por linha)',(T.quebra||[]).join('\n'),5)+ta('th-nota','Anotação livre',T.nota,3)+
    '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button type="button" class="btn" data-th="save">Salvar</button><button type="button" class="btn ghost" data-th="cancel">Cancelar</button>'+(T.res||T.por?'<button type="button" class="btn ghost" data-th="del">Apagar tese</button>':'')+'</div></div>'}
/* lembrete da tese quando o trimestre vem ruim, dentro da aba Resultados */
function thLembra(tk){var T=thOf(tk);if(!T||!T.quebra||!T.quebra.length)return '';var q=isBR(tk)?cvmQ(tk):null,L=q?trLeit(q):null;if(!L||L.k!=='mau')return '';
  return '<div class="panel"><h2>Sua tese diz</h2><p class="anv" style="margin:4px 0">Os últimos balanços estão fracos. Antes de decidir, releia o que você escreveu que faria você rever a posição:</p><ul class="thq">'+T.quebra.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul><p class="note">Um trimestre ruim isolado não quebra uma tese. O que conta é saber se o motivo é passageiro ou estrutural.</p></div>'}
/* a renda fixa não é ação: o papel dela fica em S.teses.RF e aparece no grupo Renda fixa da carteira */
function thRF(){var T=thOf('RF');return T&&(T.papel||T.res)?'<p class="note" style="margin:8px 0 0"><b>Para que serve:</b> '+esc(T.res||T.papel)+'</p>':''}
function thPapeis(){var o=[];Object.keys(S.teses||{}).forEach(function(k){var T=S.teses[k];if(T&&(T.papel||(k==='RF'&&T.res)))o.push((k==='RF'?'Renda fixa':k)+': '+(T.papel||T.res))});return o.length?'PAPEL DE CADA PARTE DA CARTEIRA (escrito pelo usuário): '+o.join('; ')+'.':''}
/* contexto do assistente */
function thCtx(tk){var T=thOf(tk);if(!T)return '';var a=function(x){return (x||[]).join('; ')};
  return 'TESE ESCRITA PELO USUÁRIO ('+tk+', '+(T.at||'sem data')+'): '+(T.papel?'papel: '+T.papel+'. ':'')+(T.res||'')+(T.acomp&&T.acomp.length?' ACOMPANHA: '+a(T.acomp)+'.':'')+(T.quebra&&T.quebra.length?' REVER SE: '+a(T.quebra)+'.':'')+' (Compare os números do app com isso, sem decidir pelo usuário.)'}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-th]');if(!b||!STK.tk)return;var k=b.getAttribute('data-th'),tk=STK.tk,v=function(id){var el=document.getElementById(id);return el?el.value:''};
  if(k==='edit')THE=tk;else if(k==='cancel')THE=null;
  else if(k==='del'){if(!window.confirm('Apagar a tese de '+tk+'?'))return;thSave(tk,null);THE=null}
  else if(k==='save'){var o={papel:v('th-papel').trim(),res:v('th-res').trim(),por:v('th-por').trim(),acomp:thLn(v('th-acomp')),quebra:thLn(v('th-quebra')),nota:v('th-nota').trim(),at:today()};if(o.papel||o.res||o.por||o.acomp.length||o.quebra.length||o.nota)thSave(tk,o);else thSave(tk,null);THE=null}
  stkRender()});
