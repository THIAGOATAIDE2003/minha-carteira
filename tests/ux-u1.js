/* Testes da etapa U1 (1.84.0): nomes novos, alvos de toque de 44 px, setas ▲/▼ e nada cortado a 360 px. Só texto e CSS. Uso: node tests/ux-u1.js   --mutantes */
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { chromium } = require('playwright');
const RAIZ = process.env.APORTE_APP_DIR || path.resolve(__dirname, '..'), APP = 'file://' + path.join(RAIZ, 'index.html'), arg = process.argv;
let falhas = 0, total = 0;
const ok = (n, c, x) => { total++; if (!c) { falhas++; console.log('✗', n, x === undefined ? '' : JSON.stringify(x).slice(0, 500)); } };
const ler = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const MUTANTES = {
  'volta-BC': ['js/mercado-setores.js', "'Banco Central'", "'BC'"],
  'volta-Acompanhando': ['js/mercado-setores.js', "['min','Minha lista']", "['min','Acompanhando']"],
  'volta-Analise': ['js/mercado-setores.js', "'Ideias e análise'", "'Análise'"],
  'seta-antiga': ['js/grafico.js', "(up?'▲':'▼')", "(up?'↑':'↓')"],
  'balt-sem-Cotacoes': ['js/ui.js', "'Cotações':", "'Cotacoes':"],
  'sem-44px': ['style-extras.css', '.rng button{min-height:44px}', '.rng button{min-height:30px}'],
  'sem-area-invisivel': ['style-extras.css', '.bal::after,', '.balx::after,'],
  'aporte-curto': ['index.html', 'data-cv="apo">Próximo aporte<', 'data-cv="apo">Aporte<'],
  'icone-antigo': ['index.html', '<circle cx="5" cy="12" r="1.9" fill="currentColor"/>', '<circle cx="5" cy="12" r="0"/>'],
};
async function principal(b) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 780 }, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' }), p = await ctx.newPage(), er = [];
  p.on('pageerror', e => er.push(e.message)); await ctx.route(u => !/^(file|data):/.test(u.toString()), r => r.abort());
  await p.addInitScript(() => { window.__APORTE_TESTE__ = true; });
  await p.goto(APP); await p.waitForFunction(() => window.__aporte); await p.waitForTimeout(900);
  const r = await p.evaluate(async () => {
    var tx = function (s) { return [].map.call(document.querySelectorAll(s), function (e) { return e.textContent.trim(); }); };
    var fim = function () { return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); }); };
    var o = {}; o.car = tx('#carseg button'); o.mais = document.querySelector('[data-go="mais"] svg').querySelectorAll('circle[r="1.9"]').length + '/' + document.querySelector('[data-go="mais"]').textContent.trim();
    showTab('mercado'); await fim(); o.mk = tx('#mkseg button'); o.mkh = [].map.call(document.querySelectorAll('#mkseg button'), function (e) { return Math.round(e.getBoundingClientRect().height); });
    var W = document.documentElement.clientWidth; o.estouro = [].some.call(document.querySelectorAll('#mkseg button'), function (e) { var q = e.getBoundingClientRect(); return q.right > W + 1 || q.left < -1; }) || document.documentElement.scrollWidth > W + 1;
    var bi = document.querySelector('[data-mkv="idx"]'); bi && bi.click(); await fim(); o.ix = tx('#ixseg button'); o.h2 = tx('h2'); o.balt = [typeof BALT['Cotações'], typeof BALT['Minha lista'], typeof BALT['Acompanhando'], typeof BALT['Índices']];
    document.querySelector('[data-mkv="min"]').click(); await fim(); o.h2min = tx('h2');
    o.css = [].map.call(document.querySelectorAll('.rng button,.seg button'), function (e) { return e; }).length;
    var t = document.createElement('div'); t.className = 'rng'; t.innerHTML = '<button type="button">1D</button>'; document.body.appendChild(t); o.rng = Math.round(t.firstChild.getBoundingClientRect().height); t.remove();
    return o;
  });
  ok('U1 Carteira: 7º botão "Próximo aporte"', r.car.indexOf('Próximo aporte') === 2 && r.car.indexOf('Aporte') < 0, r.car);
  ok('U1 barra de baixo: ícone de 3 pontos e rótulo "Mais"', r.mais === '3/Mais', r.mais);
  ok('U1 Mercado: Minha lista / Índices / Banco Central / Ideias e análise', JSON.stringify(r.mk) === JSON.stringify(['Minha lista', 'Índices', 'Banco Central', 'Ideias e análise']), r.mk);
  ok('U1 botões do Mercado com pelo menos 44 px de altura', r.mkh.every(h => h >= 44), r.mkh);
  ok('U1 nada cortado nem estourando a largura a 360 px', r.estouro === false, r);
  ok('U1 Mercado › Índices: botões "Cotações" e "Medo e Ganância"; título "Cotações"', r.ix[0] === 'Cotações' && r.ix[1] === 'Medo e Ganância' && r.h2.some(t => /^Cotações/.test(t)) && !r.h2.some(t => /^Índices/.test(t)), [r.ix, r.h2]);
  ok('U1 BALT: chaves novas existem, antigas saíram (o ⓘ acompanha o título)', r.balt[0] === 'string' && r.balt[1] === 'string' && r.balt[2] === 'undefined' && r.balt[3] === 'undefined', r.balt);
  ok('U1 Minha lista: título novo', r.h2min.some(t => /^Minha lista/.test(t)), r.h2min);
  ok('U1 botão de período com 44 px de altura', r.rng >= 44, r.rng);
  const g = ler('js/grafico.js'), bc = ler('js/bc.js');
  ok('U1 cabeçalho de gráfico usa ▲/▼ e não ↑/↓', /'▲':'▼'/.test(g) && !/class="arr">'\+\([^)]*'↑'/.test(g) && !/\?'↑':'↓'/.test(g), 0);
  ok('U1 título do BC sem sigla', /<h2>Banco Central<\/h2>/.test(bc) && !/Banco Central \(BC\)/.test(bc), 0);
  ok('U1 mercado-setores.js dentro do limite de 25.600 bytes', Buffer.byteLength(ler('js/mercado-setores.js')) <= 25600, Buffer.byteLength(ler('js/mercado-setores.js')));
  const c = ler('style-extras.css'); ok('U1 CSS: regra de 44 px, área invisível e seta menor', /\.rng button\{min-height:44px\}/.test(c) && /\.bal::after/.test(c) && /\.gdl \.arr\{font-weight:700;font-size:11px/.test(c), 0);
  ok('sem erro de JavaScript', er.length === 0, er); await ctx.close();
}
(async () => {
  if (arg.includes('--mutantes')) {
    let fraco = 0; const nomes = Object.keys(MUTANTES);
    nomes.forEach(n => {
      const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mutu-')), [f, a, b2] = MUTANTES[n];
      cp.execSync('tar --exclude=node_modules --exclude=.git -cf - . | tar -xf - -C ' + tmp, { cwd: RAIZ, shell: '/bin/bash' }); try { fs.symlinkSync(path.join(RAIZ, 'node_modules'), path.join(tmp, 'node_modules')); } catch (e) { }
      const tx = fs.readFileSync(path.join(tmp, f), 'utf8'); if (!tx.includes(a)) { console.log('✗ trecho não achado:', n); fraco++; return; } fs.writeFileSync(path.join(tmp, f), tx.replace(a, () => b2));
      const r = cp.spawnSync('node', [__filename], { encoding: 'utf8', cwd: RAIZ, timeout: 200000, env: Object.assign({}, process.env, { APORTE_APP_DIR: tmp }) });
      const q = r.status !== 0; console.log((q ? '✓ pego   ' : '✗ ESCAPOU') + ' ' + n); if (!q) fraco++;
    });
    console.log(fraco ? '✗ ' + fraco + ' escaparam' : '✓ Todos os ' + nomes.length + ' defeitos pegos'); process.exit(fraco ? 1 : 0);
  }
  const b = await chromium.launch(); try { await principal(b); } catch (e) { falhas++; console.log('✗ erro:', e.message); } await b.close();
  console.log(falhas ? '✗ UX U1: ' + falhas + ' falha(s) de ' + total : '✓ UX U1: ' + total + ' conferências ok'); process.exit(falhas ? 1 : 0);
})();
