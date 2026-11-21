/* Nuvem: simula a API do GitHub (carteira.json) e testa salvar, conflito (409), queda de rede, chave errada, JSON ruim, tese/metas/alvos sincronizando e dados desconhecidos preservados.
   Uso: node tests/nuvem.js */
const { chromium } = require('playwright'); const path = require('path'), APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
let falhas = 0; const ok = (c, m) => { if (!c) { falhas++; console.log('✗', m); } else console.log('✓', m); };
const b64 = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64');
(async () => {
  const b = await chromium.launch(); const er = [];
  async function novo(srv) {
    const p = await b.newPage({ viewport: { width: 400, height: 860 } });
    p.on('pageerror', e => er.push(e.message + ' @ ' + String(e.stack || '').split('\n')[1]));
    srv.puts = []; srv.gets = 0;
    await p.route('**/*', async r => { const u = r.request().url(), m = r.request().method();
      if (u.startsWith('file:')) return r.continue();
      if (u.includes('api.github.com') && u.includes('carteira.json')) {
        if (srv.modo === 'rede') return r.abort();
        if (srv.modo === '401') return r.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Bad credentials"}' });
        if (m === 'GET') { srv.gets++; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 's' + srv.ver, content: srv.ruim ? b64('{lixo') : b64(srv.dados) }) }); }
        if (m === 'PUT') { const body = JSON.parse(r.request().postData()); srv.puts.push(body);
          if (srv.conflitos > 0) { srv.conflitos--; srv.ver++; srv.dados = Object.assign({}, srv.dados, { trades: (srv.dados.trades || []).concat([{ id: 'remoto' + srv.ver, date: '2025-01-01', ticker: 'XXXX3', side: 'buy', qty: 1, price: 1, market: 'BR' }]) }); return r.fulfill({ status: 409, contentType: 'application/json', body: '{}' }); }
          srv.dados = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8')); srv.ver++; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: { sha: 's' + srv.ver } }) }); }
      } return r.abort(); });
    await p.addInitScript(() => { window.__APORTE_TESTE__ = true; });
    await p.goto(APP); await p.waitForFunction(() => window.__aporte); await p.waitForTimeout(300);
    return p;
  }
  const base = () => ({ ver: 1, conflitos: 0, modo: 'ok', dados: { versao: 1, trades: [], cambio: [], campoDesconhecido: { x: [1, 2, 3] }, perfil: { obj: 'renda' }, teses: { BBSE3: { papel: 'antigo' } } } });
  // 1) salvar tese + meta + trade novo e preservar o desconhecido
  let srv = base(), p = await novo(srv);
  await p.evaluate(() => { S.keys.gh = 'tok'; S.ghInit = true; S.pend = []; S.teses = { BBSE3: { papel: 'novo', res: 'r' }, RF: { papel: 'reserva' } }; S.pend.push({ t: 'cfg', k: 'teses', v: S.teses }); S.metas = { pat: { valor: 100000 } }; S.pend.push({ t: 'cfg', k: 'metas', v: S.metas }); S.trades.push({ id: 'nx1', date: '2025-05-05', ticker: 'ABCD3', side: 'buy', qty: 10, price: 5, market: 'BR' }); S.pend.push({ t: 'add', tr: S.trades[S.trades.length - 1] }); ghSync(true); });
  await p.waitForTimeout(1200);
  ok(srv.puts.length === 1, 'salva com 1 PUT (' + srv.puts.length + ')');
  ok(srv.dados.teses && srv.dados.teses.BBSE3.papel === 'novo' && srv.dados.teses.RF, 'teses gravadas na nuvem');
  ok(srv.dados.metas && srv.dados.metas.pat.valor === 100000, 'metas gravadas');
  ok(srv.dados.campoDesconhecido && srv.dados.campoDesconhecido.x.length === 3 && srv.dados.perfil.obj === 'renda', 'campos que o app não conhece foram preservados');
  ok((srv.dados.trades || []).some(t => t.id === 'nx1'), 'lançamento novo gravado');
  ok(await p.evaluate(() => S.pend.length === 0), 'fila de pendências zerada');
  await p.close();
  // 2) conflito 409 uma vez: tenta de novo e não perde nem duplica nada
  srv = base(); srv.conflitos = 1; p = await novo(srv);
  await p.evaluate(() => { S.keys.gh = 'tok'; S.ghInit = true; S.pend = []; S.trades.push({ id: 'nx2', date: '2025-05-05', ticker: 'ABCD3', side: 'buy', qty: 1, price: 5, market: 'BR' }); S.pend.push({ t: 'add', tr: S.trades[S.trades.length - 1] }); ghSync(true); });
  await p.waitForTimeout(4500);
  const ids = (srv.dados.trades || []).map(t => t.id);
  ok(ids.filter(i => i === 'nx2').length === 1, 'após conflito, o lançamento aparece 1 vez');
  ok(ids.some(i => /^remoto/.test(i)), 'após conflito, o que veio do outro aparelho foi mantido');
  await p.close();
  // 3) rede cai / chave errada / JSON ruim: não apaga nada local, mostra aviso, sem erro de JS
  for (const [nome, cfg] of [['sem rede', { modo: 'rede' }], ['chave 401', { modo: '401' }], ['JSON ruim', { ruim: true }]]) {
    srv = Object.assign(base(), cfg); p = await novo(srv);
    await p.evaluate(() => { S.keys.gh = 'tok'; S.ghInit = true; S.pend = []; S.trades.push({ id: 'nx3', date: '2025-05-05', ticker: 'ABCD3', side: 'buy', qty: 1, price: 5, market: 'BR' }); S.pend.push({ t: 'add', tr: S.trades[S.trades.length - 1] }); ghSync(true); });
    await p.waitForTimeout(1500);
    const st = await p.evaluate(() => ({ t: S.trades.some(x => x.id === 'nx3'), pend: S.pend.length, err: GH.err || '' }));
    ok(st.t && st.pend === 1, nome + ': lançamento local e fila mantidos');
    ok(srv.puts.length === 0, nome + ': nada gravado na nuvem');
    await p.close();
  }
  // 4) nuvem remota com formato maluco não derruba
  for (const d of [{ trades: null, cambio: 'x', teses: 5, metas: [], watch: 'a', idx: 3 }, {}, { trades: [null, 1, { id: 'a' }] }]) {
    srv = base(); srv.dados = d; p = await novo(srv);
    await p.evaluate(() => { S.keys.gh = 'tok'; S.ghInit = true; S.pend = []; ghSync(true); }); await p.waitForTimeout(1000);
    const vivo = await p.evaluate(() => { try { render(); showTab('ativos'); render(); return true } catch (e) { return e.message } });
    ok(vivo === true, 'nuvem com formato estranho ' + JSON.stringify(d).slice(0, 40) + ': app vivo' + (vivo === true ? '' : ' (' + vivo + ')'));
    await p.close();
  }
  ok(er.length === 0, 'nenhum erro de página' + (er.length ? ': ' + Array.from(new Set(er)).join(' | ') : ''));
  await b.close(); if (falhas) { console.log('✗ Nuvem:', falhas, 'falha(s)'); process.exit(1); } console.log('✓ Nuvem: tudo certo');
})();
