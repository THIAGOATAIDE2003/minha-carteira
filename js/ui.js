/* Aporte · js/ui.js — balões, toque nos gráficos e desenhos (linha, rosca, barras).
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
/* balão pequeno: toca num item com data-bal e aparece a explicação; toca fora e some */
function bal(txt,inner){return '<button type="button" class="bal" data-bal="'+esc(txt)+'">'+(inner||'<span class="bi">i</span>')+'</button>'}
function balHide(){var b=$('balpop');if(b)b.hidden=true}
function balShow(el){var b=$('balpop');if(!b){b=document.createElement('div');b.id='balpop';b.setAttribute('role','tooltip');document.body.appendChild(b)}
  b.textContent=el.getAttribute('data-bal');b.hidden=false;
  var r=el.getBoundingClientRect(),bw=b.offsetWidth,vw=document.documentElement.clientWidth,lf=Math.min(Math.max(12,r.left+r.width/2-bw/2),vw-bw-12);
  var top=r.bottom+8,up=top+b.offsetHeight>window.innerHeight-90;if(up)top=r.top-8-b.offsetHeight;
  b.style.left=lf+'px';b.style.top=(top+window.scrollY)+'px';b.className=up?'up':''}
document.addEventListener('click',function(e){var el=e.target.closest&&e.target.closest('.bal');var b=$('balpop');
  if(el){e.stopPropagation();if(b&&!b.hidden&&b._el===el){balHide();return}balShow(el);$('balpop')._el=el}else if(b&&!b.hidden){balHide();b._el=null}},true);
window.addEventListener('scroll',function(){balHide()},{passive:true});
window.addEventListener('online',function(){if(GH.err)ghSync()});
/* toque e arraste nos gráficos: mostra o mês embaixo do dedo */
function tipAttr(o){return ' data-tip="'+esc(JSON.stringify(o))+'"'}
var TIPA=null;
function tipShow(c,x){
  var d=c._tip;if(!d){try{d=c._tip=JSON.parse(c.getAttribute('data-tip'))}catch(e){return}}if(!d||!d.pts||!d.pts.length)return;
  var r=c.getBoundingClientRect(),sl=Math.floor((x-r.left)/r.width*d.n),best=d.pts[0];
  d.pts.forEach(function(p){if(Math.abs(p.i-sl)<Math.abs(best.i-sl))best=p});
  var g=c.querySelector('.tipg'),b=c.querySelector('.tipb');
  if(!g){g=document.createElement('i');g.className='tipg';c.appendChild(g);b=document.createElement('div');b.className='tipb';c.appendChild(b)}
  var cx=(best.i+.5)/d.n*r.width;g.style.left=cx+'px';g.hidden=false;
  var dt=c.querySelector('.tipd');if(best.y!=null){if(!dt){dt=document.createElement('i');dt.className='tipd';c.appendChild(dt)}dt.style.left=cx+'px';dt.style.top=(best.y*100)+'%';dt.style.background=best.c||'var(--accent)';dt.hidden=false}else if(dt)dt.hidden=true;
  b.innerHTML='<b>'+esc(best.t)+'</b>'+best.r.map(function(w){var sub=/^\s/.test(w[1]);return '<div><span'+(sub?' class="sub"':'')+'>'+(w[0]?'<i style="background:'+w[0]+'"></i>':'')+esc(w[1].trim())+'</span><b class="'+(w[3]||'')+'">'+esc(w[2])+'</b></div>'}).join('');
  b.hidden=false;var bw=b.offsetWidth,lf=cx+14;if(lf+bw>r.width)lf=cx-14-bw;if(lf<0)lf=Math.max(0,Math.min(r.width-bw,cx-bw/2));b.style.left=lf+'px';
  [].forEach.call(c.querySelectorAll('[data-slot]'),function(e){e.classList.toggle('on',+e.getAttribute('data-slot')===best.i)});
  c.classList.add('tipon');
}
function tipHide(){[].forEach.call(document.querySelectorAll('.tipc.tipon'),function(c){c.classList.remove('tipon');[].forEach.call(c.querySelectorAll('.tipg,.tipb,.tipd'),function(e){e.hidden=true});[].forEach.call(c.querySelectorAll('[data-slot].on'),function(e){e.classList.remove('on')})})}
document.addEventListener('pointerdown',function(e){var c=e.target.closest&&e.target.closest('.tipc');
  var dn=e.target.closest&&e.target.closest('.dnt circle');
  [].forEach.call(document.querySelectorAll('.dwrap.sel'),function(w){w.classList.remove('sel');var q=w.querySelector('.dc');if(q.getAttribute('data-o'))q.innerHTML=q.getAttribute('data-o');[].forEach.call(w.querySelectorAll('circle'),function(x){x.style.opacity=''})});
  if(dn){var w=dn.closest('.dwrap'),q0=w.querySelector('.dc');if(!q0.getAttribute('data-o'))q0.setAttribute('data-o',q0.innerHTML);w.classList.add('sel');[].forEach.call(w.querySelectorAll('circle'),function(x){x.style.opacity=x===dn?'':'.3'});q0.innerHTML='<b class="num">'+esc(dn.getAttribute('data-p'))+'</b><span>'+esc(dn.getAttribute('data-n'))+'</span>';return}
  if(!c){tipHide();TIPA=null;return}TIPA=c;tipHide();tipShow(c,e.clientX)});
document.addEventListener('pointermove',function(e){if(TIPA&&e.buttons!==0||TIPA&&e.pointerType==='touch')tipShow(TIPA,e.clientX)});
document.addEventListener('pointerup',function(){TIPA=null});
document.addEventListener('pointercancel',function(){TIPA=null});
/* gráficos em SVG */
function spark(rows){
  var n=rows.length;if(n<2)return '';
  var W=320,H=78,all=[];rows.forEach(function(r){all.push(r.pat,r.apl)});
  var mn=Math.min.apply(null,all),mx=Math.max.apply(null,all),pad=(mx-mn)*0.12||mx*0.05||1;mn-=pad;mx+=pad*0.4;
  var x=function(i){return (i/(n-1)*W).toFixed(1)},y=function(v){return (H-2-(v-mn)/(mx-mn)*(H-8)).toFixed(1)};
  var lp=rows.map(function(r,i){return x(i)+','+y(r.pat)}).join(' '),la=rows.map(function(r,i){return x(i)+','+y(r.apl)}).join(' ');
  var lastUp=rows[n-1].pat>=rows[n-1].apl;
  return '<svg class="spk" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" aria-label="Patrimônio mês a mês">'+
    '<defs><linearGradient id="spg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--hero-gain)" stop-opacity=".35"/><stop offset="1" stop-color="var(--hero-gain)" stop-opacity="0"/></linearGradient></defs>'+
    '<polygon points="0,'+H+' '+lp+' '+W+','+H+'" fill="url(#spg)"/>'+
    '<polyline points="'+la+'" fill="none" stroke="var(--hero-muted)" stroke-width="1.5" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>'+
    '<polyline points="'+lp+'" fill="none" stroke="var(--hero-gain)" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>'+
    '<div class="spkl"><span>'+MESES[+rows[0].m.slice(5,7)-1]+'/'+rows[0].m.slice(2,4)+'</span><span class="lg"><i></i>patrimônio <i class="d"></i>aplicado</span><span>hoje</span></div>';
}
function donut(top,tot){
  var r=42,c=2*Math.PI*r,off=0,seg='';
  top.forEach(function(i){var f=i.v/tot,l=Math.max(0,f*c-1.5);seg+='<circle data-n="'+esc(i.n)+'" data-p="'+pf.format(f*100)+'%" r="'+r+'" cx="55" cy="55" fill="none" stroke="'+i.c+'" stroke-width="16" stroke-dasharray="'+l.toFixed(2)+' '+(c-l).toFixed(2)+'" stroke-dashoffset="'+(-off).toFixed(2)+'" transform="rotate(-90 55 55)"/>';off+=f*c});
  return '<svg viewBox="0 0 110 110" class="dnt" role="img" aria-label="Distribuição por ativo">'+seg+'</svg>';
}
function vsBars(a,la,b,lb){var mx=Math.max(Math.abs(a),Math.abs(b),0.0001),w=function(v){return Math.max(2,Math.abs(v)/mx*100).toFixed(1)};
  return '<div class="vsb"><span>'+la+'</span><div><i class="'+(a>=0?'g':'l')+'" style="width:'+w(a)+'%"></i></div><b class="num '+cls(a)+'">'+pct(a)+'</b>'+
    '<span>'+lb+'</span><div><i class="n" style="width:'+w(b)+'%"></i></div><b class="num">'+pct(b)+'</b></div>'}
