/* Aporte · js/periodo.js — período inicial dos gráficos de ações e índices (G1, 1.83.4). Todo gráfico abre no 1D e NÃO lembra a escolha (nada vai para o localStorage).
   ES5; nada roda ao carregar. Sem ponto do dia: nunca inventa, abre no menor período com dado e diz isso numa linha. */
/* índices sem arquivo de 5 min do robô (CDI, Selic, IPCA, minério): sem botões 1D e 5D */
function pdSemIntra(x){return !!x&&(x.src==='cdi'||x.src==='ipca'||x.src==='selic'||x.k==='iron')}
function pdPadrao(x){return x&&pdSemIntra(x)?(x.src==='ipca'?'1y':'1mo'):'1d'}
function pdSkip(x,rate){return (rate?['yr','max']:[]).concat(pdSemIntra(x)?['nointra']:[])}
/* "ainda não há pontos de 5 minutos": troca UMA vez do 1D para o 1M (a marca STK.auto impede de voltar sozinho); true = trocou, a página se desenha de novo */
function pdAuto(fv,rg){if(rg==='1d'&&fv&&fv.st==='none'&&/^Ainda não há pontos/.test(fv.msg||'')&&!STK.auto){STK.auto=1;STK.rng='1mo';return true}return false}
function pdNota(){return STK.auto&&STK.rng==='1mo'?'<p class="muted small" style="margin:8px 0">Sem pontos de hoje; mostrando 1 mês.</p>':''}
/* enquanto o arquivo do dia carrega, o espaço do gráfico fica reservado (a tela não pula quando ele chega) */
function pdMin(fv){return fv&&fv.st==='load'?';min-height:190px':''}
/* fora do pregão o 1D mostra o último pregão: o rótulo vira "pregão de DD/MM" (dia do último ponto, no fuso do próprio mercado) em vez de "hoje" */
function pdRg(per,fv,rg){if(per!=='1d'||rg!=='1d'||!fv||fv.st!=='ok'||!fv.o||!fv.hist||!fv.hist.length)return per;
  var off=fv.o.off==null?-10800:fv.o.off,d=Math.floor((fv.hist[fv.hist.length-1].t/1000+off)/86400);if(d===Math.floor((Date.now()/1000+off)/86400))return per;
  var q=new Date(d*864e5);return 'pregão de '+('0'+q.getUTCDate()).slice(-2)+'/'+('0'+(q.getUTCMonth()+1)).slice(-2)}
function rgEff(){return STK.rng==='yr'||STK.rng==='max'?'5y':STK.rng==='ytd'?'1y':STK.rng==='1d'||STK.rng==='5d'?'1mo':STK.rng}
