/* Aporte · js/cartao.js — cartão limpo das Ideias e barra da faixa (1.79.0, E6). Só apresentação: não muda lista, ordem, nota, potencial nem margem.
   Linha 1 (ticker abre a ação, preço, nota, potencial, estrela) + botão de baixo (barra Conservador–Otimista, UMA etiqueta, confiança em texto, ⚠ n, seta) + detalhes escondidos (nada é apagado).
   A etiqueta nunca depende só de cor; a cor existe só no ponto (variáveis --op-* em style-cartao.css). Só define funções e estado; nada roda na carga (menos ler o filtro salvo). */
var OPOPEN={},OPF='todas',OPFN={todas:'Todas',div:'Dividendos',risco:'Menor risco'},OPSTAT='',
  OPTX={div:'DY dos últimos 12 meses entre 6% e 15%; não garante dividendos futuros.',risco:'Mede só saúde financeira, dívida, qualidade dos lucros e confiança do dado; não mede volatilidade. Depende do perfil que você respondeu.',
  faixa:'A barra mostra o valor estimado da ação: de um cenário mais cauteloso (Conservador) até um mais otimista. O círculo é o preço de hoje e o traço no meio é o valor central. Estar dentro da faixa não é indicação de compra.',
  fin:' Para bancos e seguradoras a faixa usa outro modelo (lucro e patrimônio).'};
try{OPF=localStorage.getItem(LS+'-opf')||'todas'}catch(e){}if(!OPFN[OPF])OPF='todas';
function opOk(v){return typeof v==='number'&&isFinite(v)&&v>0}
function opFin(o){return !!((o.sd&&(o.sd.bank||o.sd.seg))||(o.fx&&(o.fx.bank||o.fx.seg)))}
function opMoeda(F,v){return typeof v==='number'&&isFinite(v)&&v>=0?F.format(v):'—'}
function opId(tk){return 'opd-'+String(tk).replace(/[^A-Za-z0-9]/g,'')}
/* uma etiqueta: preço de hoje contra [conservador, otimista] */
function opEtiq(o){var f=o&&o.fx,px=o&&o.d&&o.d.price;if(f&&f.pend)return {t:'Calculando…',c:'nd'};
  if(!f||!f.ok||!opOk(f.cons)||!opOk(f.oti)||!opOk(px))return {t:'Faixa indisponível',c:'nd'};
  return px<f.cons?{t:'Abaixo da faixa',c:'abaixo',r:'abaixo da faixa'}:px>f.oti?{t:'Acima da faixa',c:'acima',r:'acima da faixa'}:{t:'Dentro da faixa',c:'dentro',r:'dentro da faixa'}}
/* pura: posições em % (1 a 99) na barra; domínio = conservador..otimista e o preço, com folga de 4% */
function opBarra(f,px){var c=f.cons,o=f.oti,m=f.cen,lo=Math.min(c,px),hi=Math.max(o,px),sp=hi-lo,W,P,r;
  if(!(sp>0)){lo=hi*0.975;hi=hi*1.025}else{lo-=sp*0.04;hi+=sp*0.04}W=hi-lo;
  P=function(v){return Math.max(1,Math.min(99,Math.round((v-lo)/W*1000)/10))};
  r={c:P(c),o:P(o),m:opOk(m)?P(m):null,p:P(px),lado:px<c?'abaixo':px>o?'acima':'dentro',fio:null};
  if(r.lado==='abaixo')r.fio=[r.p,r.c];else if(r.lado==='acima')r.fio=[r.o,r.p];return r}
function opBarraHtml(o){if(opEtiq(o).c==='nd')return '';var f=o.fx,F=f.F||brl,b=opBarra(f,o.d.price),L=function(v){return v.toFixed(1)};
  return '<span class="opbw" aria-hidden="true"><span class="opbn"><span>Conservador<b>'+esc(F.format(f.cons))+'</b></span><span>Otimista<b>'+esc(F.format(f.oti))+'</b></span></span>'+
    '<span class="opbb"><i class="opbf" style="left:'+L(b.c)+'%;width:'+L(b.o-b.c)+'%"></i>'+(b.fio?'<i class="opbl" style="left:'+L(b.fio[0])+'%;width:'+L(b.fio[1]-b.fio[0])+'%"></i>':'')+(b.m!=null?'<i class="opbc" style="left:'+L(b.m)+'%"></i>':'')+'<i class="opbm" style="left:'+L(b.p)+'%"></i></span></span>'}
/* avisos por gravidade: armadilha, saúde, vento contra, confiança, avisos da análise, ideia rara */
function opRiscos(o){if(!(o&&o.fx&&o.fx.ok))return [];try{return riscosFor(o,1)||[]}catch(e){return []}}
function opAlNeg(o,R){var f=o.fx;return (o.al||[]).filter(function(a){return a[0]!=='ok'&&!(f&&f.ok&&/cenário conservador|cenário otimista/.test(a[1]))&&!(R.length&&/^Caiu .* da máxima do ano/.test(a[1])&&R.some(function(r){return /^o preço já caiu/.test(r)}))})}
function opAvisos(o){var L=[],f=o.fx,sd=o.sd,cf=o.cf,A=o.A||{},R=opRiscos(o);
  if(f&&f.ok&&f.trap)L.push(['Armadilha de valor','o '+f.trap+' caiu 3 trimestres seguidos; o cenário central foi rebaixado.']);
  if(sd&&sd.n>=1&&sd.mot&&sd.mot.length)L.push(['Saúde financeira',sd.mot.join(', ')+'.']);
  if(o.vento&&o.vento.length)L.push(['Vento contra',o.vento.map(function(x){return x[1]}).join('; ')+'.']);
  if(cf&&(cf.n==='Baixa'||cf.aviso))L.push(['Confiança',cf.aviso?cf.aviso.charAt(0).toUpperCase()+cf.aviso.slice(1)+'.':'confiança baixa no dado.']);
  R.forEach(function(r){L.push(['O que pode dar errado',r.charAt(0).toUpperCase()+r.slice(1)+'.'])});
  (A.alr||[]).forEach(function(a){L.push([a[0],typeof a[1]==='string'?a[1].replace(/<[^>]*>/g,''):''])});
  opAlNeg(o,R).forEach(function(a){L.push([a[1],String(a[2]||'').replace(/<[^>]*>/g,'')])});
  if(o.rara)L.push(['Ideia rara','quebra a regra de concentração (você já tem muito neste setor ou grupo).']);return L}
function opAtencao(o){return opAvisos(o).length}
function opConfTxt(o){var cf=o.cf;return cf?'Confiança '+cf.n.toLowerCase()+(cf.n==='Baixa'||cf.ext||cf.fx?' ⚠':''):''}
function opMotivo(o){var s=String(o.fxDem||(o.fx&&o.fx.motivo)||(o.cf&&o.cf.w&&o.cf.w[0])||'').replace(/^em verificação:\s*/i,'').replace(/^faixa indisponível:\s*/i,'');s=s.split(':')[0].split(';')[0].trim();if(s.length>40)s=s.slice(0,39).replace(/\s+\S*$/,'')+'…';return s}
function opPrev(o){var m=/Previsão:[^;]*?(\d{2}\/\d{2}\/\d{4})/.exec(String(o.fxDem||''));return m?'previsão '+m[1]:''}
function opSpeak(v,cur){var i=Math.floor(v),c=Math.round((v-i)*100);return i+(cur==='USD'?(i===1?' dólar':' dólares'):(i===1?' real':' reais'))+' e '+c+(c===1?' centavo':' centavos')}
function opPot(o){var f=o.fx;return f&&f.ok&&typeof f.espPct==='number'&&isFinite(f.espPct)?f.espPct*100:null}
function opPotTxt(p){if(p==null)return '—';var a=Math.abs(p);return a<0.05?'0,0%':a>999?(p>0?'>999%':'<−999%'):(p>0?'+':'−')+num(a,1)+'%'}
function opCartao(o,add,ver){var cur=o.d.cur,F=cur==='USD'?usd:brl,sc=o.score,e=opEtiq(o),open=!!OPOPEN[o.tk],av=opAvisos(o),n=av.length,inW=wlist().indexOf(o.tk)>=0,f=o.fx,id=opId(o.tk),tk=esc(o.tk),
    pu=opPot(o),scT=sc!=null?num(sc,1):'—',cft=opConfTxt(o),nd=e.c==='nd',mot=nd&&e.t==='Faixa indisponível'?opMotivo(o):'',prev=nd?opPrev(o):'',bar=!ver&&!nd,tr=f&&f.ok&&f.trap,
    lb=o.tk+', '+(nd?e.t.toLowerCase().replace('…',''):'preço '+e.r)+(mot?': '+mot:'')+'. '+(tr?'Armadilha de valor. ':'')+(opOk(o.d.price)?'Preço '+opSpeak(o.d.price,cur)+'. ':'Preço indisponível. ')+(!nd&&bar?'Faixa de '+num(f.cons,2)+' a '+num(f.oti,2)+(cur==='USD'?' dólares':' reais')+(opOk(f.cen)?', central '+num(f.cen,2):'')+'. ':'')+(cft?cft.replace(' ⚠','')+'. ':'')+(n?n+(n>1?' pontos':' ponto')+' de atenção. ':'')+'Toque duas vezes para '+(open?'fechar':'abrir')+' os detalhes.',
    avH=av.length?'<div class="opav"><b>⚠ '+n+(n>1?' pontos':' ponto')+' de atenção</b><ul>'+av.map(function(a){return '<li><b>'+esc(a[0])+':</b> '+esc(a[1])+'</li>'}).join('')+'</ul></div>':'',
    cfH=o.cf?'<p class="fql opq2"><b>Confiança '+esc(o.cf.n.toLowerCase())+'</b>'+(o.cf.w.length?': '+esc(o.cf.w.join('; '))+'.':(o.gq?': '+esc(o.gq.t):''))+'</p>':'',
    alH=o.al&&o.al.length?'<ul class="opal">'+o.al.filter(function(a){return a[0]==='ok'&&!(f&&f.ok&&/cenário conservador|cenário otimista/.test(a[1]))}).slice(0,3).map(function(a){return '<li>'+rkLvl(a[0])+'<span><b>'+a[1]+'</b> '+a[2]+'</span></li>'}).join('')+'</ul>':'';
  return '<div class="opk'+(ver?' ver':'')+'"><div class="opk1"><button type="button" class="opt" data-stk="'+tk+'" aria-label="Abrir a página da ação '+tk+'">'+tkLogo(o.tk,cur==='USD')+'<span><b>'+tk+'<i aria-hidden="true">&nbsp;›</i></b><small>'+esc(opMoeda(F,o.d.price))+'</small></span></button>'+
    '<span class="opn"><span aria-hidden="true"><b>'+scT+'</b><small>nota</small></span><span class="sr">'+(sc!=null?'Nota '+scT+' de 10':'Nota indisponível')+'</span></span>'+
    '<span class="opu"><span aria-hidden="true"><b>'+opPotTxt(pu)+'</b><small>potencial</small></span><span class="sr">'+(pu==null?'Potencial indisponível':'Potencial de '+(pu<0?'baixa':'alta')+' de '+num(Math.abs(pu),1)+' por cento')+'</span></span>'+
    (add?'<button type="button" class="opa" data-wtog="'+tk+'" aria-label="'+(inW?'Parar de acompanhar ':'Acompanhar ')+tk+'">'+(inW?'★':'☆')+'</button>':'<span></span>')+'</div>'+
    '<button type="button" class="opx" data-opx="'+tk+'" aria-expanded="'+open+'" aria-controls="'+id+'" aria-label="'+esc(lb)+'">'+(bar?opBarraHtml(o):'')+
    '<span class="opx3"><span class="opl"><span class="opet"><i class="opdt d-'+(e.c==='abaixo'||e.c==='acima'?e.c:'dentro')+'" aria-hidden="true"></i><b>'+esc(e.t)+'</b></span>'+(mot?'<span class="opmu">'+esc(mot)+'</span>':'')+(tr?'<b class="opar">Armadilha de valor</b>':'')+(cft?'<span class="opmu opcf'+(o.cf&&(o.cf.n==='Baixa'||o.cf.ext||o.cf.fx)?' warn':'')+'">'+esc(cft)+'</span>':'')+(prev?'<span class="opmu">'+esc(prev)+'</span>':'')+'</span>'+
    '<span class="opend" aria-hidden="true">'+(n?'<span class="opwn">⚠ '+n+'</span>':'')+'<span class="opch">⌄</span></span></span></button>'+
    '<div class="opd" id="'+id+'"'+(open?'':' hidden')+'>'+avH+fxRow(o)+porqueRow(o)+saudeRow(o,opRiscos(o).length>0)+cfH+macroRow(o)+parRow(o)+alH+'</div></div>'}
/* filtros: Todas · Dividendos · Menor risco (pelo perfil). Em verificação nunca é filtrada */
function opDividendos(o){var d=o&&o.A&&o.A.N&&o.A.N.dy;return typeof d==='number'&&isFinite(d)&&d>=6&&d<=15}
function opMenorRisco(o,tipo){tipo=tipo||'Moderado';var sd=o.sd,f=o.fx,cf=o.cf;if(!sd||!f||!f.ok||!cf)return false;if(cf.n!=='Alta'&&cf.n!=='Média')return false;
  var n=sd.n!=null?sd.n:(sd.f||[]).length,m=sd.m||{},q=o.ql||qualFor(o),cx=m.caixa===true;
  if(opFin(o))return tipo!=='Conservador'&&n===0&&!f.trap;
  if(tipo==='Conservador')return n===0&&!(sd.desc&&sd.desc.length)&&(cx||(m.dlpl!=null&&m.dlpl<=0.5))&&!!q&&q.ap>=4&&q.ps>=4&&!f.trap&&!o.vento&&!(o.vm&&o.vm.v<0);
  if(tipo==='Moderado')return n===0&&(cx||(m.dlpl!=null&&m.dlpl<=1))&&!f.trap;
  return n<=1}
function opTipoPerfil(){var t=null;try{if(pfOk())t=pfTipo()}catch(e){}return t&&(t[0]||t)||null}
function opFiltra(D,k){var t=opTipoPerfil()||'Moderado';return k==='div'?D.filter(opDividendos):k==='risco'?D.filter(function(o){return opMenorRisco(o,t)}):D}
function opFiltroHtml(D){var t=opTipoPerfil(),tm=t||'Moderado',c={todas:D.length,div:D.filter(opDividendos).length,risco:D.filter(function(o){return opMenorRisco(o,tm)}).length},
  bt=function(k){return '<button type="button" class="opfb" data-opf="'+k+'" aria-pressed="'+(OPF===k)+'">'+OPFN[k]+' '+c[k]+'</button>'},
  fin=D.some(opFin),lg='';
  if(OPF==='risco')lg='<p class="oplg">Perfil usado: '+(t?esc(t):'Moderado (padrão)')+(t?'':' <button type="button" class="opfb opfp" data-pf="open">Responder o perfil</button>')+(t==='Conservador'&&fin?'<br>Bancos e seguradoras não entram no Conservador porque o app ainda não mede o risco deles.':'')+'</p>';
  return '<div class="opf" role="group" aria-label="Filtrar ideias">'+bt('todas')+bt('div')+bal(OPTX.div,null,'Explicação: dividendos')+bt('risco')+bal(OPTX.risco,null,'Explicação: menor risco')+'</div>'+lg}
function opCartoes(D,add){var L=opFiltra(D,OPF);OPSTAT='Mostrando '+L.length+' de '+D.length+' ideia'+(D.length===1?'':'s');
  return (OPF!=='todas'?'<p class="oplg">'+OPSTAT+'</p>':'')+(L.length?L.map(function(o){return opCartao(o,add)}).join(''):'<p class="muted">Nenhuma das '+D.length+' ideia'+(D.length===1?'':'s')+' passa neste filtro. Toque em Todas.</p>')}
function opAnuncia(){var s=$('opstat');if(!s){s=document.createElement('div');s.id='opstat';s.className='sr';s.setAttribute('role','status');s.setAttribute('aria-live','polite');document.body.appendChild(s)}s.textContent=OPSTAT}
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-opx]'),b=e.target.closest&&e.target.closest('[data-opf]');
  if(t){var tk=t.getAttribute('data-opx'),k=t.closest('.opk'),d=k&&k.querySelector('.opd'),ab=t.getAttribute('aria-expanded')!=='true';if(!d)return;
    if(ab){OPOPEN[tk]=1;d.hidden=false}else{delete OPOPEN[tk];d.hidden=true;if(k.getBoundingClientRect().top<0&&k.scrollIntoView)k.scrollIntoView({block:'nearest'})}
    t.setAttribute('aria-expanded',String(ab));t.setAttribute('aria-label',t.getAttribute('aria-label').replace(/Toque duas vezes para (abrir|fechar)/,'Toque duas vezes para '+(ab?'fechar':'abrir')));return}
  if(b){var v=b.getAttribute('data-opf');if(!OPFN[v])return;OPF=v;try{localStorage.setItem(LS+'-opf',OPF)}catch(x){}renderMkt();opAnuncia()}});
