/* Foto das Ideias antes/depois (E3). Os dados reais ficam só no repositório privado: este script apenas lê a pasta que você indicar.
 * Gravar:    node tests/snap-ideias.js --dados ../minha-carteira-dados --saida ../minha-carteira-dados/testes/ideias-e3-antes.json [--app pasta-do-app]
 * Comparar:  node tests/snap-ideias.js --comparar antes.json depois.json
 * Relógio travado em 23/11/2026 15h (Brasília), sem internet; histórico da CVM lido de <dados>/dados/cvm. */
const path = require('path'), fs = require('fs');
const arg = process.argv.slice(2), val = k => arg.includes(k) ? arg[arg.indexOf(k) + 1] : null;

function comparar(fa, fb) {
  const A = JSON.parse(fs.readFileSync(fa, 'utf8')), B = JSON.parse(fs.readFileSync(fb, 'utf8'));
  const L = o => o.lista === 'ideia' ? 'Ideia' : o.lista === 'verificacao' ? 'Em verificação' : 'fora';
  const lin = [], n = { entrou: 0, saiu: 0, perm: 0, mudou: 0 };
  const dentro = o => o && o.lista !== 'fora';
  Object.keys(B.itens).sort().forEach(tk => {
    const a = A.itens[tk], b = B.itens[tk]; if (!a || !b) return;
    if (!dentro(a) && !dentro(b)) return;
    let ev;
    if (!dentro(a) && dentro(b)) { ev = 'ENTROU'; n.entrou++; }
    else if (dentro(a) && !dentro(b)) { ev = 'SAIU'; n.saiu++; }
    else if (a.lista !== b.lista) { ev = 'MUDOU DE LISTA'; n.mudou++; }
    else { ev = 'PERMANECEU'; n.perm++; }
    lin.push({ tk, ev, antes: a, depois: b });
  });
  const f1 = x => x == null ? '—' : (Math.round(x * 10) / 10).toString().replace('.', ',');
  const desc = (o, rot) => rot + ': ' + L(o) + (o.pos ? ' #' + o.pos : '') + (o.nota != null ? ', nota ' + f1(o.nota) : '') + (o.potencial != null ? ', potencial ' + f1(o.potencial) + '%' : '') + (o.ms != null ? ', margem ' + f1(o.ms) + '%' : '') + (o.conf ? ', confiança ' + o.conf.toLowerCase() : '') + ' — ' + o.motivo;
  ['ENTROU', 'SAIU', 'MUDOU DE LISTA', 'PERMANECEU'].forEach(ev => {
    const g = lin.filter(x => x.ev === ev); console.log('\n== ' + ev + ' (' + g.length + ') ==');
    g.forEach(x => { console.log(x.tk); console.log('   ' + desc(x.antes, 'antes ')); console.log('   ' + desc(x.depois, 'depois')); });
  });
  const cont = (S, lst) => Object.values(S.itens).filter(o => o.lista === lst).length;
  const acima = S => Object.values(S.itens).filter(o => o.lista !== 'fora' && o.est === 'acima').length;
  console.log('\n== RESUMO ==');
  console.log('Ideias novas: ' + cont(A, 'ideia') + ' → ' + cont(B, 'ideia') + ' | Em verificação: ' + cont(A, 'verificacao') + ' → ' + cont(B, 'verificacao'));
  console.log('Entraram ' + n.entrou + ' | saíram ' + n.saiu + ' | mudaram de lista ' + n.mudou + ' | permaneceram ' + n.perm);
  console.log('Ações ACIMA da faixa dentro de Ideias ou Em verificação: antes ' + acima(A) + ' → depois ' + acima(B));
  process.exit(acima(B) ? 1 : 0);
}
if (arg.includes('--comparar')) { const i = arg.indexOf('--comparar'); comparar(arg[i + 1], arg[i + 2]); return; }

const { chromium } = require('playwright');
const DADOS = path.resolve(val('--dados') || path.join(__dirname, '..', '..', 'minha-carteira-dados'));
const APP = 'file://' + path.resolve(val('--app') || path.join(__dirname, '..'), 'index.html');
const SAIDA = val('--saida');
const rd = f => JSON.parse(fs.readFileSync(f, 'utf8'));
(async () => {
  const mercado = rd(path.join(DADOS, 'mercado.json')), cart = rd(path.join(DADOS, 'carteira.json')), cvm = {};
  fs.readdirSync(path.join(DADOS, 'dados', 'cvm')).forEach(f => { if (/\.json$/.test(f)) cvm[f.replace(/\.json$/, '')] = rd(path.join(DADOS, 'dados', 'cvm', f)); });
  const estado = Object.assign({}, cart); delete estado.versao; delete estado.atualizadoEm; estado.keys = { finnhub: '', brapi: '', gh: '', repo: '' }; estado.pend = [];
  const NOW = '2026-11-23T15:00:00-03:00';
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 400, height: 900 } }), erros = [];
  pg.on('pageerror', e => erros.push(e.message));
  await pg.clock.setFixedTime(new Date(NOW));
  await pg.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  await pg.addInitScript(o => { window.__APORTE_TESTE__ = true; if (!sessionStorage.getItem('ok')) { localStorage.clear(); localStorage.setItem('minha-carteira-v1', o); sessionStorage.setItem('ok', '1'); } }, JSON.stringify(estado));
  await pg.goto(APP); await pg.waitForFunction(() => window.__aporte, null, { timeout: 15000 }); await pg.waitForTimeout(500);
  const S1 = await pg.evaluate(({ mercado, cvm }) => {
    MD.d = mercado; Object.keys(mercado.fund.d).forEach(tk => { FIN['cvm/' + tk] = { d: cvm[tk] || null, at: Date.now() }; });
    FOTOQ = true; /* não tenta gravar a foto diária */
    const R = compute(), mine = {}; R.held.forEach(x => { mine[x.p.ticker] = 1; });
    const r = opData(), NOVO = typeof opPorta === 'function', itens = {}, pf1 = v => v == null || !isFinite(v) ? null : Math.round(v * 100) / 100;
    const reg = (o, lista, pos) => { const f = o.fx; itens[o.tk] = { lista, pos, nota: pf1(o.score), potencial: f && f.ok ? pf1(f.espPct * 100) : null, ms: f && f.ok ? pf1(f.ms * 100) : null, est: f && f.ok ? f.est : null, conf: o.cf ? o.cf.n : null, qual: o.ql ? { ap: o.ql.ap, ps: o.ql.ps } : null, porque: o.novo ? opPorque(o) : null,
      vup: o.V ? pf1(o.V.up * 100) : null, tipo: f && f.ok ? (f.bank ? 'banco' : f.seg ? 'seguradora' : 'comum') : (o.banco ? 'financeira' : 'comum'), setor: (o.A.sec && o.A.sec[0]) || null,
      motivo: lista === 'ideia' ? 'entrou: ' + (f && f.ok ? 'preço ' + (f.est === 'abaixo' ? 'abaixo' : 'perto') + ' do cenário conservador' : 'faixa calculando') : 'em verificação: ' + ((o.cf && o.cf.w && o.cf.w.join('; ')) || 'dado fraco') }; };
    r.D.forEach((o, i) => reg(o, 'ideia', i + 1)); r.X.forEach((o, i) => reg(o, 'verificacao', i + 1));
    /* motivo de quem ficou de fora: escada de filtros na mesma ordem do motor de cada versão */
    const f = mercado.fund.d, tks = Object.keys(f), seen = {}, candOrd = tks.filter(tk => { const F = fundOf(tk); return F && F.liq2m >= 2e6 && F.pl > 2 && F.roe > 0; }).sort((a, c) => fundOf(c).liq2m - fundOf(a).liq2m);
    const emCand = {}; candOrd.forEach(tk => { emCand[tk] = 1; });
    tks.forEach(tk => {
      if (itens[tk]) return; const F = fundOf(tk); let m;
      const fora = (motivo, o) => { itens[tk] = { lista: 'fora', pos: null, nota: o ? pf1(o.score) : null, potencial: null, ms: null, est: null, conf: null, vup: o && o.V ? pf1(o.V.up * 100) : null, tipo: null, setor: o && o.A.sec ? o.A.sec[0] : null, motivo }; };
      if (mine[tk]) return fora('já está na sua carteira');
      if (!F) return fora('sem dados');
      if (!(F.liq2m >= 2e6)) return fora('pouca liquidez (menos de R$ 2 mi por dia)');
      if (!(F.pl > 2)) return fora('P/L abaixo de 2 (lucro suspeito)');
      if (!(F.roe > 0)) return fora('ROE zero ou negativo');
      const b4 = tk.slice(0, 4); if (!seen[b4]) { const prim = candOrd.find(x => x.slice(0, 4) === b4); seen[b4] = prim; }
      if (seen[b4] !== tk) return fora('outra classe da mesma empresa (' + seen[b4] + ') já representa');
      const o = opEval(tk); if (!o) return fora('sem preço ou é fundo/ETF');
      if (NOVO) { if (!opPorta(o)) return fora(o.score == null ? 'sem nota' : o.score < 6 ? 'nota abaixo de 6' : o.A.chips[0][1] === 'Baixa' ? 'qualidade baixa' : 'dividendo acima de 20% (suspeito)'); }
      else { if (o.score == null) return fora('sem nota'); if (!o.V) return fora(o.banco ? 'banco/financeira: motor antigo não calcula preço justo' : 'sem preço justo do motor antigo'); if (o.A.chips[0][1] === 'Baixa') return fora('qualidade baixa'); if (o.V.up < 0.2) return fora('motor antigo: preço justo com menos de 20% de desconto'); if (o.score < 6) return fora('nota abaixo de 6'); if (o.A.N.dy > 20) return fora('dividendo acima de 20% (suspeito)'); }
      const fx = fxFor(o); o.fx = fx;
      const mg = NOVO ? (fx && fx.ok ? fx.ms : -1) : (o.V ? o.V.mg : -1), rara = mg >= 0.4 && o.score >= 8 && !(o.A.alr && o.A.alr.length);
      if (NOVO && fx && fx.ok && !fx.opp) return fora('acima da faixa de preço justo (' + fx.est + ')', o);
      try { const c = concFor(tk, R, setorRk); if (c && c.alta && !rara) return fora('concentração: você já tem muito desse setor/grupo', o); } catch (e) { }
      try { const vv = vtSetor(setorRk(tk)), vc = vv.filter(x => x[0] === 'contra'), vf = vv.filter(x => x[0] === 'favor').length; if (vc.length > vf && !rara) return fora('setor com vento contra agora', o); } catch (e) { }
      if (!NOVO && fx && fx.ok && !fx.opp) return fora('acima da faixa de preço justo (' + fx.est + ')', o);
      if (fx && !fx.ok && !fx.pend) return fora('faixa indisponível: ' + fx.motivo, o);
      fora('cortada pelo ranking/limite de setor/máximo de ideias', o);
    });
    const dados = { D: r.D.map(o => o.tk), X: r.X.map(o => o.tk) };
    return { versao: VERSAO, novo: NOVO, candidatas: r.cand, skip: { C: r.skipC, V: r.skipV, F: r.skipF, S: r.skipS }, itens, dados };
  }, { mercado, cvm });
  if (erros.length) { console.log('✗ erros de JavaScript:', erros.slice(0, 3)); process.exit(1); }
  const doc = { rotulo: SAIDA ? path.basename(SAIDA) : '', app: S1.versao, motorNovo: S1.novo, relogio: NOW, mercadoTs: mercado.ts, candidatas: S1.candidatas, skip: S1.skip, listas: S1.dados, itens: S1.itens };
  if (SAIDA) { fs.mkdirSync(path.dirname(path.resolve(SAIDA)), { recursive: true }); fs.writeFileSync(SAIDA, JSON.stringify(doc, null, 1)); }
  const dentro = Object.values(S1.itens).filter(o => o.lista !== 'fora');
  console.log('App ' + S1.versao + (S1.novo ? ' (motor novo)' : ' (motor antigo)') + ' | candidatas ' + S1.candidatas + ' | Ideias ' + S1.dados.D.length + ' (' + S1.dados.D.join(', ') + ') | Em verificação ' + S1.dados.X.length + ' (' + S1.dados.X.join(', ') + ')');
  console.log('Cortes: concentração ' + S1.skip.C + ', vento ' + S1.skip.V + ', acima da faixa ' + S1.skip.F + ', teto de setor ' + S1.skip.S);
  console.log('Ações ACIMA da faixa dentro das listas: ' + dentro.filter(o => o.est === 'acima').length + (SAIDA ? ' | gravado em ' + SAIDA : ''));
  await b.close();
})();
