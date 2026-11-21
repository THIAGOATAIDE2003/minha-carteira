/* Aporte · js/ui.js — balões, toque nos gráficos e desenhos (linha, rosca, barras).
   Faz parte do app dividido em vários arquivos (veja a ordem em index.html): todos compartilham as mesmas variáveis e funções. */
/* balão pequeno: toca num item com data-bal e aparece a explicação; toca fora e some */
function bal(txt,inner){return '<button type="button" class="bal" data-bal="'+esc(txt)+'">'+(inner||'<span class="bi">i</span>')+'</button>'}
/* explicação (ⓘ) automática para todo título de seção que ainda não tem balão: o que é, o que faz e como ler */
var BALT={'Relatório de risco da carteira':'Uma IA lê os números do app e explica os riscos com o porquê. Não inventa probabilidade e não é recomendação.','Classes da empresa':'Mesma empresa, ações de tipos diferentes, cada uma com o seu preço. ON (final 3) dá direito a voto. PN (final 4) tem prioridade nos dividendos. Unit (final 11) junta os dois tipos. Toque numa para abrir.','Futuros e pré-mercado':'Futuros são contratos que negociam quase 24 horas e mostram para onde as bolsas devem abrir. A Europa já está aberta quando o Brasil abre. O pré-mercado é o preço das suas ações dos EUA antes da abertura e depois do fechamento.',
'Distribuição':'Mostra como o seu patrimônio está dividido. Deslize para os lados para trocar a visão: por tipo (ações, ETFs, renda fixa), todos os ativos, só ações do Brasil, ETFs internacionais e renda fixa. Toque numa fatia para ver o nome, a porcentagem e o valor em reais. Serve para perceber se você está concentrado demais em um lugar só.',
'Ativos':'Tabela de tudo que você tem hoje. Total % é quanto cada ativo subiu ou caiu desde a compra e Dia % é a variação de hoje (toque na pílula para ver o valor em reais). Toque no código do ativo para abrir a página dele. Role a tabela para o lado para ver preço médio, preço atual e valor. Os filtros mostram só Brasil ou só EUA, e tocar no cabeçalho ordena. Tudo é só pelo preço; o VT entra pelo dólar de hoje.',
'Renda fixa':'Suas aplicações em CDB, LCI e parecidos. O valor mostrado já é o líquido: o app calcula o rendimento com o CDI diário do Banco Central desde o dia da aplicação e desconta o IOF (nos primeiros 30 dias) e o IR regressivo, quando existem.',
'Encerradas':'Posições que você vendeu por completo. Mostra o lucro ou prejuízo que ficou de cada uma (preço de venda menos o seu preço médio). Elas não entram no patrimônio de hoje, mas contam no lucro total.',
'Evolução do patrimônio':'Uma barra por mês. A parte de baixo é o valor aplicado (o que você colocou, com o dólar daquele mês) e a de cima é o ganho de capital (valor menos custo; se for prejuízo, desce abaixo do zero). Use Filtros para escolher o período e o tipo (Brasil, EUA, renda fixa). Toque numa barra para ver os números. Onde faltou preço histórico o app usa o preço médio e marca com *.',
'Sua divisão ideal':'Aqui você diz quanto por cento quer em cada classe (Brasil, EUA, renda fixa) e em cada ação do Brasil. O app compara com o que você tem hoje e usa isso para sugerir onde colocar o próximo aporte: sempre no que está mais abaixo da meta. Ele nunca manda vender nada.',
'Quanto vai aportar?':'Digite o valor que vai investir neste mês. O app divide entre os ativos e classes que estão mais abaixo da sua divisão ideal, sem vender nada, e mostra quanto vai para cada um. Dá para preencher o valor com o aporte mensal do seu perfil de investidor.',
'Tudo que você já lucrou':'Soma de tudo que a carteira já te deu: variação de preço, efeito do dólar, ganhos de vendas, proventos recebidos, menos as taxas. Rendimento simples é o lucro dividido pelo que você investiu; o XIRR é o ganho ao ano, levando em conta a data de cada aporte. Toque em Lucro total, Preço ou Dólar para ver o gráfico de cada um.',
'Sua carteira contra o CDI':'Compara o que a sua carteira rendeu com o que teria rendido se cada aporte tivesse ido para uma aplicação de 100% do CDI nas mesmas datas. Mostra se compensou correr o risco da bolsa em vez de ficar na renda fixa.',
'Sua carteira contra o mercado':'Compara o seu resultado com o do mercado: o app repete as suas compras e vendas no BOVA11 (Ibovespa) e no IVVB11 (S&P 500) nas mesmas datas, separado por Brasil e EUA. Do seu lado entram também os proventos. Mostra se você está ganhando ou perdendo para quem só comprasse o índice.',
'Carteira hoje':'Retrato de agora: quanto vale cada parte da carteira, quanto você pagou nela e a diferença, só pelo preço (sem câmbio e sem vendas). Toque nos balõezinhos das linhas para ver como cada número foi calculado.',
'Quanto você investiu':'Quanto saiu do seu bolso: o total aplicado, o que já voltou em vendas e o que ainda está investido. É a base para calcular o rendimento da carteira.',
'Extrato':'Lista de todos os seus lançamentos: compras, vendas, proventos, renda fixa e dólar. É aqui que você adiciona, edita ou apaga um lançamento. Os totais já consideram as taxas das corretoras.',
'Evolução de proventos':'Barras por mês com os proventos que você recebeu e, em outra cor, os anunciados que ainda vão cair (até 6 meses à frente). Toque numa barra para ver os valores. O botão de filtro muda o período, mensal ou anual, o tipo e o ativo.',
'Proventos por ativo':'Mostra quanto cada ativo já te pagou em proventos, em rosca e em barras. Use os seletores para trocar o período ou o tipo. Ajuda a ver quais ativos mais colocam dinheiro na sua conta.',
'Meus proventos':'Lista de cada provento: ativo, tipo (dividendo, JCP ou rendimento), data-com, data de pagamento e valor líquido de IR. Os anunciados e ainda não pagos aparecem como a receber. Use os filtros para escolher período, tipo e ativo, e toque numa linha para ver os detalhes.',
'Quanto cada ativo paga':'Para cada ativo, compara os proventos recebidos com o que você pagou nele (rendimento sobre o custo) e com o valor de hoje. Mostra quais ativos rendem mais dividendos para o dinheiro que você colocou.',
'Minhas ações':'Suas ações e ETFs com o preço, a variação do dia e os indicadores principais: P/L (preço sobre lucro), P/VP (preço sobre patrimônio) e DY (dividendos em 12 meses). Fora do horário de negociação a variação fica zerada e cinza. Toque numa ação para ver gráfico, análise e proventos.',
'Acompanhando':'Sua lista de ações para observar sem ter. Use a busca acima para achar uma ação e toque na estrela para colocá-la aqui. O app avisa na aba Análise quando alguma da lista fica barata ou muda de nota.',
'Índices':'Os termômetros do mercado que você escolheu: bolsas, dólar, juros, commodities e criptomoedas. Toque num card para ver o gráfico. Em Editar você remove cards, e na busca acima você adiciona outros.',
'Relatório da carteira · IA':'Texto escrito por inteligência artificial uma vez por dia, juntando as notícias das empresas que você tem e os números do mercado. Traz o que merece destaque, os riscos e o que acompanhar. É um resumo de apoio, não recomendação de compra ou venda.',
'Vendas de ações em':'Total que você vendeu de ações neste mês. Se vendeu até R$ 20 mil no mês, o lucro das ações é isento de IR; acima disso, paga 15% sobre o lucro. Fundos imobiliários não têm essa isenção (20%). Prejuízos de meses anteriores são abatidos.',
'DARF a pagar':'A guia de imposto do mês, quando teve lucro tributável. Vence no último dia útil do mês seguinte à venda. O valor é a alíquota sobre o lucro, depois de abater prejuízos guardados de meses anteriores.',
'Mês a mês':'Histórico mensal do imposto: quanto vendeu, o lucro ou prejuízo, se ficou dentro da isenção, o imposto devido e o prejuízo que fica guardado para abater nos próximos meses, separado entre ações e FIIs.',
'Declaração de IR':'Resumo para preencher a declaração anual do ano mostrado: Bens e Direitos, rendimentos isentos, tributação exclusiva e dividendos do exterior. Os números estão prontos para copiar nas fichas do programa da Receita.',
'Bens e Direitos':'O custo de cada ativo em 31/12, que é o valor que se declara (e não o preço de mercado). O app usa o preço médio com as taxas incluídas, como a Receita pede. Ativos vendidos até essa data não entram.',
'Rendimentos isentos (dividendos)':'Dividendos recebidos no ano. São isentos de IR e vão na ficha Rendimentos Isentos e Não Tributáveis, separados por empresa.',
'Tributação exclusiva (JCP)':'Juros sobre capital próprio (JCP) chegam com 15% de IR já descontado na fonte. Por isso vão na ficha Tributação Exclusiva, pelo valor líquido recebido.',
'Dividendos do exterior':'Proventos dos ativos americanos (como o VT). Mostra o valor bruto, os 30% retidos nos EUA e o líquido que chegou, em dólar e em reais.',
'Aparência':'Escolha o tema do app: Azul (padrão), Branco ou Cinza escuro. A escolha vale só neste aparelho.',
'Status das fontes de dados':'Mostra se cada fonte do app está funcionando: cotações, dólar, CDI, robô diário, catálogo da B3 e outras. Verde é normal, amarelo é aviso (usando o último dado salvo) e vermelho é falha. O botão Tentar de novo agora força uma nova busca.',
'Seus dados na nuvem':'Guarda seus lançamentos num repositório privado seu no GitHub, usando o seu token, para você abrir em outro aparelho. O que você altera sem internet fica numa fila e sobe quando a conexão volta. O token fica só neste aparelho.',
'Preços automáticos':'Aqui ficam as chaves das fontes de cotação: brapi (ações do Brasil), Finnhub (EUA) e Alpha Vantage (histórico e dividendos dos EUA), além do servidor de cotações opcional. Sem elas o app funciona com os preços salvos. As chaves ficam só neste aparelho.',
'Assistente':'Escolha a IA que responde no botão Assistente (Groq ou Gemini) e cole a sua chave gratuita. A chave fica só neste aparelho e a IA usa os números do próprio app para responder.',
'Custo do câmbio':'Quanto você pagou a mais do que o dólar de referência custaria, somando todas as compras de dólar (spread, tarifas e IOF). A porcentagem compara esse custo com o valor de referência.',
'Cada compra de dólar':'Lista de cada compra de dólar: quanto pagou em reais, o dólar de referência do dia e quanto custou a mais. Serve para ver quais compras saíram mais caras.',
'Resumo':'Os números principais lado a lado: preço agora, quanto variou em 1 e 5 anos, máxima e mínima de 1 ano e a distância da máxima. Em ETF, é a explicação de que a análise de empresa não se aplica.',
'Sua posição':'O que você tem dessa ação: quantidade, preço médio, quanto vale hoje e o lucro ou prejuízo em reais e em porcentagem.',
'Pontos positivos':'O que está bom nessa empresa, segundo as regras do app (lucro, dívida, rentabilidade, dividendos, preço comparado ao setor...). Cada ponto positivo aumenta a nota.',
'Pontos de atenção':'O que preocupa nessa empresa: indicadores fracos, lucro ou receita caindo, preço em queda, notícias ruins. Os que valem em dobro pesam mais na nota.',
'Vale saber':'Detalhes que não são bons nem ruins por si só, mas ajudam a entender a empresa, como sazonalidade ou liquidez.',
'Como cada um é calculado':'Cada método de preço justo com o seu resultado, o quanto ele está acima ou abaixo do preço de hoje e o que ele supõe: Graham, Bazin (preço-teto de dividendos), P/L do setor e fluxo de caixa simples.',
'Últimos proventos':'Os últimos dividendos e JCP pagos por essa empresa, por ação, com as datas.'
};
function balAuto(){[].forEach.call(document.querySelectorAll('h2,h3'),function(h){
  if(h.querySelector('.bal')||h.closest('.sheet,.sbox'))return;var n=h.firstChild;if(!n||n.nodeType!==3)return;
  var t=n.textContent.replace(/\s+/g,' ').trim();if(!t)return;var tx=BALT[t];
  if(!tx){var k=Object.keys(BALT);for(var i=0;i<k.length;i++){if(k[i]==='Vendas de ações em'&&t.indexOf(k[i])===0){tx=BALT[k[i]];break}}}
  if(!tx)return;var w=document.createElement('span');w.innerHTML=bal(tx);var b=w.firstChild;n.textContent=n.textContent.replace(/\s+$/,'')+' ';
  h.insertBefore(b,n.nextSibling)})}
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
  if(d.g){b.className='tipb gtip';b.innerHTML='<b>'+esc(best.v)+'</b><span>'+esc(best.t)+'</span>';b.hidden=false;var gw=b.offsetWidth,gl=cx-gw/2;gl=Math.max(0,Math.min(r.width-gw,gl));b.style.left=gl+'px';c.classList.add('tipon');return}
  b.className='tipb';b.innerHTML='<b>'+esc(best.t)+'</b>'+best.r.map(function(w){var sub=/^\s/.test(w[1]);return '<div><span'+(sub?' class="sub"':'')+'>'+(w[0]?'<i style="background:'+w[0]+'"></i>':'')+esc(w[1].trim())+'</span><b class="'+(w[3]||'')+'">'+esc(w[2])+'</b></div>'}).join('');
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
