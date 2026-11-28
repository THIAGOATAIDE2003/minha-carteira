/* Testes da 1.88.0: tela Orçamento removida, dados (S.orc) mantidos.
   Uso: node tests/remover-orcamento.js | --mutantes | --gravar (SÓ na árvore 1.87.1: APORTE_APP_DIR=<pasta>)
   Sintética: tickers inventados; nada da carteira real vai para este repositório. */
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { chromium } = require('playwright');
const V = require('./valor-dolar.js'), { abrir, RAIZ, DADOS, arg, val } = V;
const ESP = path.join(__dirname, 'esperado-remover-orcamento.json');
const ORC = { v: 2, inicio: '2026-01', sal: 3900, meta: 2000, apo: 1000, conta: 500, fixos: [{ id: 'a', n: 'Aluguel', v: 800 }], cats: [{ id: 'k1', n: 'Mercado', lim: 600 }], m: { '2026-06': { sal: 4100, g: { Lazer: 120 }, l: [{ id: 'x1', c: 'k1', v: 80, n: 'feira', d: '2026-06-10' }] } } };
/* retrato da tela: só HTML das seções (sem a barra de Mais), chaves do localStorage e estilos do "Organizar abas" */
const SNAP = async (pg) => pg.evaluate((orc) => {
  const h = s => { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return (x >>> 0).toString(16) };
  const sec = () => [...document.querySelectorAll('section[data-tab]')].filter(e => !e.hidden).map(e => e.innerHTML).join('|');
  S.orc = JSON.parse(JSON.stringify(orc)); save(); const lsOrc = h(localStorage.getItem('minha-carteira-v1'));
  const T = {}; for (const t of ['resumo', 'ativos', 'proventos', 'mercado', 'cambio', 'imposto', 'ajustes']) { showTab(t); render(); T[t] = h(sec()) }
  showTab('resumo'); orgAbre('#carseg'); const sh = document.getElementById('orgsh'), est = {};
  ['.orgl', '.orgr', '.orgr label', '.orgm', '.orgm button'].forEach(s => { const e = sh.querySelector(s); if (e) { const c = getComputedStyle(e); est[s] = ['display', 'margin', 'padding', 'borderBottom', 'justifyContent', 'alignItems', 'gap', 'listStyle', 'flex'].map(k => c[k]).join('/') } });
  return { T: T, lsOrc: lsOrc, org: est, orgHtml: h(sh.querySelector('.orgc').innerHTML), keys: Object.keys(localStorage).sort().join(',') };
}, ORC);
module.exports = { ORC, SNAP };
if (require.main === module) (async () => {
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }); let total = 0, falhas = 0;
  const ok = (n, c, d) => { total++; if (!c) { falhas++; console.log('✗ ' + n, d === undefined ? '' : JSON.stringify(d).slice(0, 300)) } else console.log('✓ ' + n) };
  if (arg.includes('--mutantes')) { await b.close(); process.exit(mutantes() ? 1 : 0) }
  const pg = await abrir(b), snap = await SNAP(pg);
  if (arg.includes('--gravar')) { fs.writeFileSync(ESP, JSON.stringify(snap, null, 1) + '\n'); console.log('gravado', ESP); await b.close(); return }
  const esp = JSON.parse(fs.readFileSync(ESP, 'utf8')), src = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
  const bar = await pg.evaluate(() => [...document.querySelectorAll('#maisseg button')].map(x => x.getAttribute('data-mais') + ':' + x.textContent.trim()));
  ok('R1 barra de Mais: Câmbio · Imposto · Ajustes (3 botões, sem Orçamento)', JSON.stringify(bar) === JSON.stringify(['cambio:Câmbio', 'imposto:Imposto', 'ajustes:Ajustes']), bar);
  ok('R2 sem a seção #orctab no HTML', !(await pg.evaluate(() => !!document.getElementById('orctab'))) && !/orctab|orcamento/i.test(src('index.html')));
  ok('R3 nenhum script/cache do Orçamento: index.html, sw.js e js/ (arquivo apagado)', !/orcamento\.js/.test(src('index.html')) && !/orcamento\.js/.test(src('sw.js')) && !fs.existsSync(path.join(RAIZ, 'js/orcamento.js')));
  ok('R4 nenhum nome do Orçamento sobrou no código (renderOrc, orcCalc, orcField, data-or*)', !fs.readdirSync(path.join(RAIZ, 'js')).some(f => /renderOrc|orcCalc|orcField|orcAportado|data-orld|data-orq/.test(src('js/' + f))));
  const pf = await abrir(b), ab = await pf.evaluate(() => { showTab('mais'); return [MAISV, (function () { var e = document.querySelector('[data-sub="cambio"]'); return !!e && !e.hidden })()] });
  ok('R5 Mais abre em Câmbio (aparelho recém-aberto)', ab[0] === 'cambio' && ab[1] === true, ab); await pf.close();
  const rt = await pg.evaluate(() => { showTab('orcamento'); var a = [document.querySelector('.tabs .on,.tabs [aria-selected="true"]') && document.querySelector('.tabs .on,.tabs [aria-selected="true"]').getAttribute('data-tab'), vlTab('orcamento'), vlTab('cambio'), vlTab('#orcamento')]; return a });
  ok('R6 showTab("orcamento") cai no Início e vlTab("orcamento") não vira Mais (sem rota fantasma)', pg.__erros.length === 0 && rt[1] !== 'mais' && rt[2] === 'mais' && rt[3] !== 'mais', [rt, pg.__erros]);
  const pg2 = await b.newPage({ viewport: { width: 360, height: 780 } }); pg2.__erros = []; pg2.on('pageerror', e => pg2.__erros.push(e.message));
  await pg2.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  await pg2.addInitScript(() => { window.__APORTE_TESTE__ = true });
  await pg2.goto('file://' + path.join(RAIZ, 'index.html') + '#orcamento'); await pg2.waitForFunction(() => window.__aporte, null, { timeout: 15000 }); await pg2.waitForTimeout(500);
  const h2 = await pg2.evaluate(() => [location.hash, [...document.querySelectorAll('section[data-tab]')].filter(e => !e.hidden).map(e => e.getAttribute('data-tab'))]);
  ok('R7 abrir o link antigo #orcamento: sem erro e cai no Início', pg2.__erros.length === 0 && h2[1].indexOf('resumo') >= 0 && h2[1].indexOf('mais') < 0, [h2, pg2.__erros]); await pg2.close();
  const dados = await pg.evaluate(() => { var a = JSON.parse(localStorage.getItem('minha-carteira-v1')).orc; return [a && a.sal, a && a.m && a.m['2026-06'] && a.m['2026-06'].l[0].v, typeof applyCfg === 'function' && JSON.stringify(applyCfg({ orc: { sal: 1 } }, [], 'orc')), JSON.stringify(applyCfg({}, [{ t: 'cfg', k: 'orc', v: { sal: 2 } }], 'orc'))] });
  ok('R8 dados do Orçamento continuam no aparelho (S.orc em minha-carteira-v1) e a nuvem ainda aplica a configuração "orc"', dados[0] === 3900 && dados[1] === 80 && dados[2] === '{"sal":1}' && dados[3] === '{"sal":2}' && /applyCfg\(d,S\.pend\|\|\[\],'orc'\)/.test(src('js/nuvem.js')) && /k:'orc'|'orc'/.test(src('js/nuvem.js')), dados);
  const pg3 = await abrir(b, {}); await pg3.evaluate(orc => { S.orc = JSON.parse(JSON.stringify(orc)); save() }, ORC); const antes = await pg3.evaluate(() => localStorage.getItem('minha-carteira-v1'));
  await pg3.evaluate(() => { for (const t of ['resumo', 'ativos', 'proventos', 'mercado', 'cambio', 'imposto', 'ajustes']) { showTab(t); render() } }); await pg3.waitForTimeout(300);
  const depois = await pg3.evaluate(() => localStorage.getItem('minha-carteira-v1')), orcDepois = JSON.parse(depois).orc;
  ok('R9 percorrer todas as abas não muda nem apaga S.orc (com Orçamento preenchido)', !!orcDepois && JSON.stringify(orcDepois) === JSON.stringify(ORC) && JSON.parse(antes).orc.sal === 3900, [orcDepois && orcDepois.sal]);
  ok('R10 chaves do localStorage idênticas à 1.87.1 (nenhuma criada ou apagada)', snap.keys === esp.keys, [snap.keys, esp.keys]);
  ok('R11 localStorage com S.orc idêntico à 1.87.1', snap.lsOrc === esp.lsOrc, [snap.lsOrc, esp.lsOrc]);
  for (const t of Object.keys(esp.T)) ok('R12 HTML da aba ' + t + ' idêntico à 1.87.1', snap.T[t] === esp.T[t], [t, snap.T[t], esp.T[t]]);
  ok('R13 "Organizar abas": estilos (.orgl .orgr .orgm) e lista da Carteira idênticos à 1.87.1', JSON.stringify(snap.org) === JSON.stringify(esp.org) && snap.orgHtml === esp.orgHtml && Object.keys(esp.org).length >= 3, [snap.org, esp.org]);
  ok('R14 versão 1.88.x', await pg.evaluate(() => /^1\.88\.\d+$/.test(VERSAO)));
  ok('R15 sem erros de JS na página', pg.__erros.length === 0, pg.__erros);
  console.log(falhas ? '✗ remover-orcamento: ' + falhas + ' falha(s) de ' + total : '✓ Tudo certo: ' + total + ' conferências'); await b.close(); process.exit(falhas ? 1 : 0);
})();
function mutantes() {
  const ARQ = path.join(__dirname, 'remover-orcamento.js'), M = [
    ['a: deixa renderOrc em abas.js', 'js/abas.js', null, "\nif(false){try{renderOrc()}catch(e){}}"],
    ['b: apaga S.orc no carregamento', 'js/abas.js', null, "\ntry{delete S.orc;save()}catch(e){}"],
    ['c: tira applyCfg(orc) da nuvem', 'js/nuvem.js', "applyCfg(d,S.pend||[],'orc')", "null"],
    ['d: apaga .orgl/.orgr/.orgm do Organizar', 'style-extras.css', '.orgl{', '.orgxx{'],
    ['e: deixa orcamento na regex do Voltar', 'js/voltar.js', 'imposto|mais', 'imposto|orcamento|mais'],
    ['f: script do Orçamento de volta no sw.js', 'sw.js', "'js/nucleo.js',", "'js/nucleo.js','js/orcamento.js',"],
    ['g: botão Orçamento de volta', 'index.html', '<button type="button" data-mais="cambio">', '<button type="button" data-mais="orcamento">Orçamento</button><button type="button" data-mais="cambio">'],
    ['h: Mais volta a abrir noutra sub-aba', 'js/abas.js', null, "\ntry{MAISV='imposto'}catch(e){}"]];
  let vivos = 0;
  M.forEach(m => {
    const d = '/tmp/mut-ro'; cp.execSync('rm -rf ' + d + ' && mkdir -p ' + d + ' && cp -r ' + RAIZ + '/. ' + d + '/ && rm -rf ' + d + '/.git ' + d + '/node_modules');
    const f = path.join(d, m[1]), t = fs.readFileSync(f, 'utf8');
    if (m[2] !== null && !t.includes(m[2])) { console.log('? sem alvo:', m[0]); vivos++; return }
    fs.writeFileSync(f, m[2] === null ? t + m[3] : t.replace(m[2], m[3]));
    let morto = false; try { cp.execSync('APORTE_APP_DIR=' + d + ' node ' + ARQ, { stdio: 'pipe', cwd: RAIZ }) } catch (e) { morto = true }
    console.log((morto ? '✓ pego: ' : '✗ VIVO: ') + m[0]); if (!morto) vivos++;
  });
  console.log(vivos ? '✗ ' + vivos + ' mutante(s) vivo(s)' : '✓ os ' + M.length + ' mutantes foram pegos'); return vivos;
}
