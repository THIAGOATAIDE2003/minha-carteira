/* Aporte · js/atualizacao.js — busca automática de preços, horários das bolsas e faixa de cotações.
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
/* atualização automática (só funciona fora do Claude, em site próprio) */
function getJSON(url){
  var c=new AbortController(),to=setTimeout(function(){c.abort()},8000);
  return fetch(url,{signal:c.signal}).then(function(r){clearTimeout(to);if(!r.ok)throw new Error(r.status);return r.json()});
}
var RF={busy:false,last:0,err:''};
function loadFxHistory(){
  return getJSON('https://economia.awesomeapi.com.br/json/daily/USD-BRL/400').then(function(a){
    var ser={};(a||[]).forEach(function(d){var r=parseFloat(d.bid),t=parseInt(d.timestamp,10);if(r>3&&r<10&&t){var dt=new Date(t*1000-3*3600000).toISOString().slice(0,10);if(!ser[dt])ser[dt]=r}});
    if(Object.keys(ser).length>5){ingestFx({series:ser,source:'AwesomeAPI'});try{localStorage.setItem(LS+'-fxh',JSON.stringify({at:Date.now(),ser:ser}))}catch(e){}}
  }).catch(function(){});
}
/* bolsa: 10h às 18h15 (Brasília), dias úteis. Fora disso, o preço não muda e não gasto a cota grátis do brapi. */
function brt(){var d=new Date(Date.now()-3*3600000);return {wd:d.getUTCDay(),min:d.getUTCHours()*60+d.getUTCMinutes(),d:d}}
/* feriados da B3: fixos + Carnaval, Sexta-feira Santa e Corpus Christi (pela Páscoa) */
var HOLC={};
function b3Hol(ymd){var y=+ymd.slice(0,4);if(!HOLC[y]){var a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=(h+l-7*m+114)%31+1;
  var ea=Date.UTC(y,mo-1,da),o={},add=function(t){o[new Date(t).toISOString().slice(0,10)]=1};
  [-48,-47,-2,60].forEach(function(n){add(ea+n*864e5)});
  ['01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-24','12-25','12-31'].forEach(function(md){o[y+'-'+md]=1});HOLC[y]=o}
  return !!HOLC[y][ymd]}
function bDay(d){var w=d.getUTCDay();return w>=1&&w<=5&&!b3Hol(d.toISOString().slice(0,10))}
/* bolsas abertas ou fechadas no topo: B3 (10h às 18h de Brasília) e EUA (NYSE 9h30 às 16h de Nova York, com feriados) */
var USHC={};
function usHol(ymd){var y=+ymd.slice(0,4);if(!USHC[y]){var o={},f=function(m,d){return y+'-'+(m<10?'0':'')+m+'-'+(d<10?'0':'')+d},nth=function(m,wd,n){var d=new Date(Date.UTC(y,m-1,1)),c=0;while(true){if(d.getUTCDay()===wd&&++c===n)return d.toISOString().slice(0,10);d=new Date(d.getTime()+864e5)}},last=function(m,wd){var d=new Date(Date.UTC(y,m,0));while(d.getUTCDay()!==wd)d=new Date(d.getTime()-864e5);return d.toISOString().slice(0,10)},obs=function(m,dd){var d=new Date(Date.UTC(y,m-1,dd)),w=d.getUTCDay();if(w===6)d=new Date(d.getTime()-864e5);else if(w===0)d=new Date(d.getTime()+864e5);o[d.toISOString().slice(0,10)]=1};
  obs(1,1);obs(6,19);obs(7,4);obs(12,25);o[nth(1,1,3)]=1;o[nth(2,1,3)]=1;o[last(5,1)]=1;o[nth(9,1,1)]=1;o[nth(11,4,4)]=1;
  var a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,g0=Math.floor((b+8)/25),g=Math.floor((b-g0+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=(h+l-7*m+114)%31+1;
  o[new Date(Date.UTC(y,mo-1,da)-2*864e5).toISOString().slice(0,10)]=1;USHC[y]=o}return !!USHC[y][ymd]}
function nyNow(){try{var p={};new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});
  var d=new Date(Date.UTC(+p.year,+p.month-1,+p.day));return {d:d,min:(+p.hour%24)*60+ +p.minute}}catch(e){return null}}
function usBDay(d){var w=d.getUTCDay();return w>=1&&w<=5&&!usHol(d.toISOString().slice(0,10))}
function hfm(m){var h=Math.floor(m/60),n=m%60;return h+'h'+(n?(n<10?'0':'')+n:'')}
function dur(m){return m<60?m+' min':hfm(m)}
var DSEM=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
function nextOpen(d,ok){var x=new Date(d.getTime()+864e5),k=0;while(!ok(x)&&k<15){x=new Date(x.getTime()+864e5);k++}return x}
/* mercados do mundo: horário local, feriados (com nome) e estado agora; Brasília é a referência de leitura */
function zNow(tz){try{var p={};new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});return {d:new Date(Date.UTC(+p.year,+p.month-1,+p.day)),min:(+p.hour%24)*60+ +p.minute}}catch(e){return null}}
function ymdS(t){return new Date(t).toISOString().slice(0,10)}
function easterMs(y){var a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);return Date.UTC(y,Math.floor((h+l-7*m+114)/31)-1,(h+l-7*m+114)%31+1)}
function nthD(y,m,wd,n){var t=Date.UTC(y,m-1,1),c=0;while(true){if(new Date(t).getUTCDay()===wd&&++c===n)return ymdS(t);t+=864e5}}
function lastD(y,m,wd){var t=Date.UTC(y,m,0);while(new Date(t).getUTCDay()!==wd)t-=864e5;return ymdS(t)}
var HNC={};
function holNames(mk,y){var k=mk+y;if(HNC[k])return HNC[k];var o={},e=easterMs(y),ad=function(n,nm){o[ymdS(e+n*864e5)]=nm},F=function(md,nm){o[y+'-'+md]=nm},obs=function(m,d,nm,sat){var t=new Date(Date.UTC(y,m-1,d)),w=t.getUTCDay();if(w===6&&sat)t=new Date(t.getTime()-864e5);else if(w===6)t=new Date(t.getTime()+2*864e5);else if(w===0)t=new Date(t.getTime()+864e5);o[ymdS(t)]=nm};
  if(mk==='br'){F('01-01','Confraternização Universal');ad(-48,'Segunda de Carnaval');ad(-47,'Terça de Carnaval');ad(-2,'Sexta-feira Santa');F('04-21','Tiradentes');F('05-01','Dia do Trabalho');ad(60,'Corpus Christi');F('09-07','Independência');F('10-12','Nossa Senhora Aparecida');F('11-02','Finados');F('11-15','Proclamação da República');F('11-20','Consciência Negra');F('12-24','Véspera de Natal');F('12-25','Natal');F('12-31','Véspera de Ano Novo')}
  else if(mk==='us'){obs(1,1,'Ano Novo',1);o[nthD(y,1,1,3)]='Dia de Martin Luther King';o[nthD(y,2,1,3)]='Dia dos Presidentes';ad(-2,'Sexta-feira Santa');o[lastD(y,5,1)]='Memorial Day';obs(6,19,'Juneteenth',1);obs(7,4,'Independência dos EUA',1);o[nthD(y,9,1,1)]='Dia do Trabalho';o[nthD(y,11,4,4)]='Ação de Graças';obs(12,25,'Natal',1)}
  else if(mk==='uk'){obs(1,1,'Ano Novo');ad(-2,'Sexta-feira Santa');ad(1,'Segunda-feira de Páscoa');o[nthD(y,5,1,1)]='Feriado de maio';o[lastD(y,5,1)]='Feriado de primavera';o[lastD(y,8,1)]='Feriado de verão';var w=new Date(Date.UTC(y,11,25)).getUTCDay();if(w===6){F('12-27','Natal (compensado)');F('12-28','Boxing Day (compensado)')}else if(w===0){F('12-27','Natal (compensado)');F('12-26','Boxing Day')}else if(w===5){F('12-25','Natal');F('12-28','Boxing Day (compensado)')}else{F('12-25','Natal');F('12-26','Boxing Day')}}
  else if(mk==='de'){F('01-01','Ano Novo');ad(-2,'Sexta-feira Santa');ad(1,'Segunda-feira de Páscoa');F('05-01','Dia do Trabalho');F('12-24','Véspera de Natal');F('12-25','Natal');F('12-26','Segundo dia de Natal');F('12-31','Véspera de Ano Novo')}
  else if(mk==='fr'){F('01-01','Ano Novo');ad(-2,'Sexta-feira Santa');ad(1,'Segunda-feira de Páscoa');F('05-01','Dia do Trabalho');F('12-25','Natal');F('12-26','Segundo dia de Natal')}
  else if(mk==='jp'){F('01-01','Ano Novo');F('01-02','Ano Novo');F('01-03','Ano Novo');o[nthD(y,1,1,2)]='Dia da Maioridade';F('02-11','Fundação do Estado');F('02-23','Aniversário do Imperador');F('03-'+Math.floor(20.8431+.242194*(y-1980)-Math.floor((y-1980)/4)),'Equinócio de primavera');F('04-29','Dia Showa');F('05-03','Dia da Constituição');F('05-04','Dia do Verde');F('05-05','Dia das Crianças');o[nthD(y,7,1,3)]='Dia do Mar';F('08-11','Dia da Montanha');o[nthD(y,9,1,3)]='Respeito aos Idosos';F('09-'+Math.floor(23.2488+.242194*(y-1980)-Math.floor((y-1980)/4)),'Equinócio de outono');o[nthD(y,10,1,2)]='Dia do Esporte';F('11-03','Dia da Cultura');F('11-23','Agradecimento ao Trabalho');F('12-31','Fim de ano')}
  else if(mk==='hk'){F('01-01','Ano Novo');ad(-2,'Sexta-feira Santa');ad(-1,'Sábado de Páscoa');ad(1,'Segunda-feira de Páscoa');F('05-01','Dia do Trabalho');F('07-01','Dia da Região Administrativa');F('10-01','Dia Nacional da China');F('12-25','Natal');F('12-26','Dia seguinte ao Natal')}
  else if(mk==='cn'){F('01-01','Ano Novo');for(var i=1;i<=5;i++)F('05-0'+i,'Feriado do Dia do Trabalho');for(i=1;i<=7;i++)F('10-0'+i,'Semana de Ouro (Dia Nacional)')}
  return HNC[k]=o}
function holOf(mk,ymd){var y=+ymd.slice(0,4);if(mk==='br')return b3Hol(ymd)?(holNames('br',y)[ymd]||'Feriado'):'';if(mk==='us')return usHol(ymd)?(holNames('us',y)[ymd]||'Feriado'):'';return holNames(mk,y)[ymd]||''}
var MKS=[{id:'br',n:'Brasil',s:'B3',tz:'America/Sao_Paulo',ses:[[600,1080]],p:1},{id:'us',n:'Estados Unidos',s:'NYSE e Nasdaq',tz:'America/New_York',ses:[[570,960]],p:1},
  {id:'uk',n:'Reino Unido',s:'Londres',tz:'Europe/London',ses:[[480,990]]},{id:'de',n:'Alemanha',s:'Frankfurt',tz:'Europe/Berlin',ses:[[540,1050]]},{id:'fr',n:'França',s:'Paris',tz:'Europe/Paris',ses:[[540,1050]]},
  {id:'jp',n:'Japão',s:'Tóquio',tz:'Asia/Tokyo',ses:[[540,690],[750,930]],ap:1},{id:'hk',n:'Hong Kong',s:'HKEX',tz:'Asia/Hong_Kong',ses:[[570,720],[780,960]],ap:1},{id:'cn',n:'China',s:'Xangai',tz:'Asia/Shanghai',ses:[[570,690],[780,900]],ap:1}];
function mkWhen(z,nb){var dd=Math.round((nb-z.d)/864e5);return dd===1?'amanhã':DSEM[nb.getUTCDay()]+' ('+fmtDate(ymdS(nb)).slice(0,5)+')'}
function mkEval(m){var z=zNow(m.tz),b=zNow('America/Sao_Paulo');if(!z||!b)return null;
  var off=Math.round(((b.min-z.min)+1440)%1440/60)*60;if(off>720)off-=1440;
  var ymd=ymdS(z.d),hol=holOf(m.id,ymd),wd=z.d.getUTCDay(),bd=wd>=1&&wd<=5&&!hol,ses=m.ses,cur=-1,i,first=ses[0][0],last=ses[ses.length-1][1];
  var br=function(mn){return hfm((((mn+off)%1440)+1440)%1440)},isBD=function(d){return d.getUTCDay()>=1&&d.getUTCDay()<=5&&!holOf(m.id,ymdS(d))};
  if(bd)for(i=0;i<ses.length;i++)if(z.min>=ses[i][0]&&z.min<ses[i][1])cur=i;
  var on=cur>=0,pz=false,sub;
  if(on){sub=cur<ses.length-1?'Pausa para o almoço às '+br(ses[cur][1])+' (Brasília), volta às '+br(ses[cur+1][0])+'.':'Fecha às '+br(last)+' (Brasília), daqui a '+dur(last-z.min)+'.'}
  else if(bd&&z.min<first)sub='Abre hoje às '+br(first)+' (Brasília).';
  else if(bd&&z.min<last){pz=true;for(i=0;i<ses.length;i++)if(z.min<ses[i][0]){sub='Pausa para o almoço. Volta às '+br(ses[i][0])+' (Brasília).';break}}
  else{var nb=nextOpen(z.d,isBD);sub=(!bd?(hol?'Feriado: '+hol+'. ':'Fim de semana. '):'Pregão encerrado. ')+'Abre '+mkWhen(z,nb)+' às '+br(first)+' (Brasília).'}
  var hrs=m.p?(br(first)+' às '+br(last)+' (Brasília)'):('Local '+hfm(first)+' às '+hfm(last)+(ses.length>1?' (com pausa)':'')+' · Brasília '+br(first)+' às '+br(last));
  var nf=null;if(m.p){var x=new Date(z.d.getTime()+864e5),k=0,h;while(k<400){h=x.getUTCDay()>=1&&x.getUTCDay()<=5?holOf(m.id,ymdS(x)):'';if(h){nf=h+' ('+fmtDate(ymdS(x)).slice(0,5)+', '+DSEM[x.getUTCDay()]+')';break}x=new Date(x.getTime()+864e5);k++}}
  return {m:m,on:on,pz:pz,st:on?'Aberta':pz?'Pausa':'Fechada',sub:sub,hrs:hrs,nf:nf}}
function mktState(){return MKS.map(mkEval).filter(Boolean)}
function renderMktSt(){var el=$('mktst');if(!el)return;var st=mktState(),on=st.some(function(x){return x.m.p&&x.on});
  el.innerHTML='<button type="button" class="mks'+(on?' on':'')+'" data-mk="open" aria-label="Situação dos mercados"><i></i><b>'+(on?'Mercado aberto':'Mercado fechado')+'</b></button>';
  if($('mk')&&!$('mk').hidden)mkRender(st)}
function mkCard(x){return '<div class="mkc'+(x.on?' on':x.pz?' pz':'')+'"><i></i><div><div class="mkt"><b>'+x.m.n+'</b><span>'+x.m.s+'</span><em>'+x.st+'</em></div><div class="mkd">'+x.sub+'</div><div class="mkh">'+x.hrs+'</div>'+(x.nf?'<div class="mkf">Próximo feriado: '+esc(x.nf)+'</div>':'')+'</div></div>'}
function mkRender(st){st=st||mktState();var el=$('mk-b');if(!el)return;
  el.innerHTML='<div class="mkh2">Principais</div>'+st.filter(function(x){return x.m.p}).map(mkCard).join('')+'<div class="mkh2">Outras bolsas do mundo</div>'+st.filter(function(x){return !x.m.p}).map(mkCard).join('')+'<div class="note muted mkn">Horários e feriados calculados no app, sem consultar a internet. Os horários de verão (EUA e Europa) já entram. Nas bolsas da Ásia só entram os feriados de data certa: feriados lunares (como o Ano Novo Lunar) e dias de ponte podem não estar na lista. Dias de meio período não aparecem.</div>'}
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-mk]');if(!t)return;var o=t.getAttribute('data-mk');if(o==='close'){$('mk').hidden=true;document.body.style.overflow=''}else{$('mk').hidden=false;document.body.style.overflow='hidden';mkRender()}});

/* faixa de cotações no topo: índices e grandes empresas do robô (a cada 30 min no pregão), com os preços ao vivo do app por cima */
var TPK='';
var TPIX={IBOV:1,'S&P 500':1,NASDAQ:1,DOW:1};
function tpStk(x){return x[4]?x[4]==='s':/^[A-Z0-9]{2,6}$/.test(x[0])&&!TPIX[x[0]]}
function tapeItems(){
  var it=[],seen={},R=null,add=function(l,v,p,c,st,ik){if(!(v>0)||!(p>0)||seen[l])return;seen[l]=1;it.push({l:l,v:v,p:(v/p-1)*100,c:c,st:st,ik:ik||''})};
  var t=MD.d&&MD.d.tape&&MD.d.tape.it||[];
  t.forEach(function(x){var l=x[0],v=x[1],p=x[2],c=x[3];
    if(l==='DÓLAR'&&S.fx&&S.fx.src==='auto'&&S.fx.prev){v=S.fx.rate;p=S.fx.prev}
    var st=tpStk(x),tat=(MD.d.tape.ts||0)*1000;if(st){var lv=livePx(l);if(lv&&lv.pct!=null){v=lv.p;p=lv.p/(1+lv.pct/100)}else if(dzero(!isBR(l),tat))p=v}else if(TPIX[l]&&dzero(l!=='IBOV',tat))p=v
    var ik=l==='IBOV'?'ibov':l==='EURO'?'eur':'',mi=ik&&MKT.idx[ik];if(mi&&mi.v>0&&mi.p!=null&&MKT.at>MD.d.tape.ts*1000){v=mi.v;p=mi.v/(1+mi.p/100)}
    add(l,v,p,c,st,x[5])});
  try{R=compute()}catch(e){}
  if(R)R.held.forEach(function(x){var tk=x.p.ticker,lv=livePx(tk);if(lv&&lv.pct!=null)add(tk,lv.p,lv.p/(1+lv.pct/100),x.p.market==='US'?'USD':'BRL',1)});
  if(!seen['DÓLAR']&&S.fx&&S.fx.prev)add('DÓLAR',S.fx.rate,S.fx.prev,'BRL',0,'usd');
  return it}
function tapeVal(x){if(/^JUROS/.test(x.l))return pf.format(x.v)+'%';if(TPIX[x.l])return num(x.v,x.v>=1000?0:2);if(x.l==='DÓLAR'||x.l==='EURO')return 'R$ '+num(x.v,4);if(x.c==='USD')return x.v>=1000?'US$ '+num(x.v,0):usd.format(x.v);return brl.format(x.v)}
function tapeIn(x){var c=Math.abs(x.p)<0.005?'z':x.p>0?'g':'l';return [tapeVal(x),c,(c==='z'?'':x.p>0?'▲ ':'▼ ')+pf.format(Math.abs(x.p))+'%']}
function renderTape(){var el=$('tape');if(!el)return;var it=tapeItems();if(it.length<3){el.hidden=true;return}el.hidden=false;
  var key=it.map(function(x){return x.l}).join('|');
  if(key===TPK&&el.firstChild){it.forEach(function(x){var r=tapeIn(x);[].forEach.call(el.querySelectorAll('[data-tp="'+x.l.replace(/"/g,'')+'"]'),function(n){n.querySelector('span').textContent=r[0];var e=n.querySelector('em');e.className=r[1];e.textContent=r[2]})});return}
  TPK=key;var one=it.map(function(x){var r=tapeIn(x),at=x.st?' data-stk="'+esc(x.l)+'"':x.ik&&idxDef(x.ik)?' data-idxo="'+esc(x.ik)+'"':'';
    return '<'+(at?'button type="button"'+at:'span')+' class="tpi" data-tp="'+esc(x.l)+'"><b>'+esc(x.l)+'</b><span>'+r[0]+'</span><em class="'+r[1]+'">'+r[2]+'</em></'+(at?'button':'span')+'>'}).join('');
  el.innerHTML='<div class="tptr" style="--tpd:'+Math.max(30,it.length*5)+'s">'+one+one+'</div>'}

/* variação do dia zerada fora do pregão: antes da abertura (ou fim de semana/feriado) até chegar a primeira cotação do dia */
function dzero(us,at){var now=Date.now(),open;
  if(us){var n=nyNow();if(!n)return false;if(!usBDay(n.d)||n.min<570)return true;open=now-(n.min-570)*60000}
  else{var b=brt();if(!bDay(b.d)||b.min<600)return true;open=now-(b.min-600)*60000}
  return !!at&&at<open-60000}
function mktOpen(){var b=brt();return bDay(b.d)&&b.min>=600&&b.min<1095}
function lastClose(){var b=brt(),d=new Date(b.d.getTime());
  if(!(bDay(b.d)&&b.min>=1095)){do{d.setUTCDate(d.getUTCDate()-1)}while(!bDay(d))}
  d.setUTCHours(18,15,0,0);return d.getTime()+3*3600000}
function needQuote(tk){if(mktOpen())return true;var q=S.quotes[tk];return !q||q.src!=='auto'||!(q.at>=lastClose())}
var USR={at:0};
/* tudo que é americano a cada 5 min: grandes da faixa, lista de acompanhamento e índices pelos ETFs (Finnhub, bem abaixo de 60 por minuto) */
function usRefresh(R){if(!S.keys.finnhub)return Promise.resolve();USR.at=Date.now();USR.tape=!!(MD.d&&MD.d.tape);R=R||compute();{var heldUS={};R.held.forEach(function(x){if(x.p.market==='US')heldUS[x.p.ticker]=1});
    var ex=[],seenU={};var addU=function(tk,ik){if(!tk||heldUS[tk]||seenU[tk+'|'+(ik||'')])return;seenU[tk+'|'+(ik||'')]=1;ex.push({tk:tk,ik:ik})};
    ((MD.d&&MD.d.tape&&MD.d.tape.it)||[]).forEach(function(x){if(x[3]==='USD'&&tpStk(x)&&/^[A-Z]{1,5}$/.test(x[0]))addU(x[0])});
    wlist().forEach(function(tk){if(!isBR(tk)&&tk.charAt(0)!=='^')addU(tk)});
    idxSel().map(idxDef).forEach(function(x){if(x&&x.src==='us')addU(x.s,x.k)});
    return ex.reduce(function(pr,o,i){return pr.then(function(){return i&&ex.length>40?new Promise(function(r){setTimeout(r,1100)}):null}).then(function(){
      return getJSON('https://finnhub.io/api/v1/quote?symbol='+encodeURIComponent(o.tk)+'&token='+encodeURIComponent(S.keys.finnhub)).then(function(d){if(!d||!(d.c>0))return;
        var pc=d.dp!=null?d.dp:(d.pc>0?(d.c/d.pc-1)*100:null),now=Date.now();
        if(o.ik){MKT.idx[o.ik]={v:d.c,p:pc};return}
        var m0=MKT.q[o.tk];MKT.q[o.tk]={price:d.c,pct:pc,cur:'USD',name:m0&&m0.name||'',at:now}}).catch(function(){})})},Promise.resolve());
  }}
function doRefresh(silent){
  var st=$('status'),R=compute();
  if(RF.busy)return;
  if(!R.held.length){if(!silent)st.textContent='Lance uma compra primeiro.';return}
  RF.busy=true;if(!silent){st.className='msg muted';st.textContent='Buscando cotações...'}
  (S.keys.proxy?pxQuotes(R.held.map(function(x){return x.p.ticker})):Promise.resolve({})).then(function(got){
  var jobs=[],fails=[],okc=0;Object.keys(got).forEach(function(){okc++});
  jobs.push(getJSON('https://economia.awesomeapi.com.br/json/last/USD-BRL').then(function(d){var r=parseFloat(d.USDBRL.bid),pc=parseFloat(d.USDBRL.pctChange);if(r>3&&r<10){S.fx={rate:r,at:Date.now(),src:'auto',prev:isFinite(pc)?r/(1+pc/100):null};okc++}else fails.push('dólar')}).catch(function(){fails.push('dólar')}));
  var br=[];
  R.held.forEach(function(x){
    var tk=x.p.ticker;if(got[tk])return;
    if(x.p.market==='US'){
      if(!S.keys.finnhub){fails.push(tk+' (falta a chave Finnhub)');return}
      jobs.push(getJSON('https://finnhub.io/api/v1/quote?symbol='+encodeURIComponent(tk)+'&token='+encodeURIComponent(S.keys.finnhub)).then(function(d){if(d&&d.c>0){S.quotes[tk]={price:d.c,prev:d.pc>0?d.pc:null,at:Date.now(),src:'auto'};okc++}else fails.push(tk)}).catch(function(){fails.push(tk)}));
    }else br.push(tk);
  });
  jobs.push(usRefresh(R));
  var skipped=0,brDue=!silent||!(Date.now()-(RF.lastBr||0)<15*60000-30000);br=brDue?br.filter(function(tk){if(needQuote(tk))return true;skipped++;return false}):[];if(br.length)RF.lastBr=Date.now();RF.closed=skipped>0&&!mktOpen();
  if(br.length&&!S.keys.brapi){br.forEach(function(tk){fails.push(tk+' (falta o token brapi)')});br=[]}
  var wait=function(ms){return new Promise(function(r){setTimeout(r,ms)})};
  var one=function(tk,tries){
    return getJSON('https://brapi.dev/api/quote/'+encodeURIComponent(tk)+'?token='+encodeURIComponent(S.keys.brapi)).then(function(d){var q=d&&d.results&&d.results[0];if(q&&q.regularMarketPrice>0){S.quotes[tk]={price:q.regularMarketPrice,prev:q.regularMarketPreviousClose>0?q.regularMarketPreviousClose:null,at:Date.now(),src:'auto'};okc++}else throw 0})
      .catch(function(){if(tries>0)return wait(1500).then(function(){return one(tk,tries-1)});fails.push(tk)});
  };
  jobs.push(br.reduce(function(p,tk,i){return p.then(function(){return i?wait(700):null}).then(function(){return one(tk,2)})},Promise.resolve()));
  Promise.all(jobs).then(function(){
    RF.fails=fails.slice();RF.okc=okc;
    RF.busy=false;RF.last=Date.now();
    var mo=today().slice(0,7),dd=today(),chg=0;S.mcDay=S.mcDay||{};S.mclose=S.mclose||{};
    Object.keys(S.quotes).forEach(function(tk){var q=S.quotes[tk];if(!q||q.src!=='auto'||Date.now()-q.at>3600000||!R.held.some(function(x){return x.p.ticker===tk}))return;
      if(S.mcDay[tk+'|'+mo]===dd)return;S.mcDay[tk+'|'+mo]=dd;(S.mclose[tk]=S.mclose[tk]||{})[mo]=q.price;S.pend.push({t:'px',tk:tk,m:mo,p:q.price});chg++});
    save();render();if(chg)ghSync();
    if(okc===0){RF.err='Não consegui buscar os preços agora. Confira a internet e as chaves em Ajustes.';if(!silent){st.className='msg err';st.textContent=RF.err}}
    else{RF.err=fails.length?'Sem atualização para: '+fails.join(', '):'';st.className='msg muted';st.textContent=fails.length?'Atualizado, menos: '+fails.join(', ')+'.':''}
  });
  });
}
/* servidor de cotações próprio (Cloudflare Worker, grátis): preço e prévio do Yahoo na hora, sem cota de chave */
function pxBase(){var u=(S.keys.proxy||'').replace(/\/+$/,'');return /^https:\/\/[a-z0-9.-]+\.workers\.dev$/i.test(u)?u:''}
function pxQuotes(tks){var u=pxBase();if(!u||!tks.length)return Promise.resolve({});
  return getJSON(u+'/q?s='+encodeURIComponent(tks.map(ySym).join(','))).then(function(j){var got={};tks.forEach(function(tk){var q=j&&j[ySym(tk)];if(q&&q.p>0){S.quotes[tk]={price:q.p,prev:q.prev>0?q.prev:null,at:Math.min(Date.now(),(q.t||0)*1000)||Date.now(),src:'auto'};got[tk]=1}});return got}).catch(function(){return {}})}
try{var fh=JSON.parse(localStorage.getItem(LS+'-fxh')||'null');if(fh&&fh.ser)ingestFx({series:fh.ser,source:'AwesomeAPI'});if(!fh||Date.now()-fh.at>6*3600000)loadFxHistory().then(function(){render()})}catch(e){loadFxHistory()}
document.addEventListener('visibilitychange',function(){if(!document.hidden&&Date.now()-RF.last>5*60000)doRefresh(true)});
