/* E7 · Histórico do método (js/metodo.js): backup antes de migrar, mescla sem perda, leitura segura (histórico corrompido de 6 formas+), aparelho zerado,
   falhas de rede/GitHub, compatibilidade com a 1.79.0, painel "Esse método já acertou?", foto com ibov, privacidade. Dados 100% sintéticos; GitHub simulado.
   Uso: node tests/metodo.js */
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..'), APP = 'file://' + path.join(ROOT, 'index.html');
let falhas = 0, total = 0; const ok = (c, m, x) => { total++; if (!c) { falhas++; console.log('✗', m, x === undefined ? '' : JSON.stringify(x).slice(0, 300)); } };
const b64 = s => Buffer.from(typeof s === 'string' ? s : JSON.stringify(s)).toString('base64'), de64 = s => Buffer.from(s, 'base64').toString('utf8');
const sha = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const OPP = { AAAA3: [['2026-11-20', 7, 10, 9], ['2026-11-21', 7.5, 10.5, 9.5]], BBBB3: [['2026-11-21', 6, null, 5], ['2026-11-22', 6.5, 8, 5.2]] };
const GAR = { r: { '2026-11-21': { i: 150000, l: [['AAAA3', 9, 7, 10], ['BBBB3', 5, 6, null]] }, '2026-11-22': { i: 151000, l: [['AAAA3', 9.4, 7, 10]] } } };
const OPPS = JSON.stringify(OPP), GARS = JSON.stringify(GAR);
const NUV_OPP = { AAAA3: [['2026-11-18', 7, 10, 8.5], ['2026-11-20', 7, 10, 9]], CCCC3: [['2026-11-19', 5, 6, 4]] };
const NUV_GAR = { r: { '2026-11-19': { i: 149000, l: [['CCCC3', 4, 5, 6]] }, '2026-11-21': { i: 150000, l: [['AAAA3', 9, 7, 10]] } } };
const nuv = (o, g) => ({ v: 1, quando: 'x', versao: '1.80.0', opp: o, gar: g });
(async () => {
  const b = await chromium.launch(); const er = [];
  const URLS = { estado: 'dados/metodo/estado.json' };
  /* servidor falso: arquivos em srv.files; modo por tipo (backup | estado | resultado) ou geral (all) */
  const srvNovo = (estado) => { const s = { files: {}, log: [], modo: {}, e409: 0, e422: 0, puts: [] }; if (estado !== undefined) s.files[URLS.estado] = { sha: 'e1', content: b64(estado) }; return s; };
  async function novo(srv, seed, vp) {
    const p = await b.newPage({ viewport: vp || { width: 400, height: 860 } });
    p.on('pageerror', e => er.push(e.message + ' @ ' + String(e.stack || '').split('\n')[1]));
    await p.route('**/*', async r => { const u = r.request().url(), m = r.request().method();
      if (u.startsWith('file:')) return r.continue();
      if (!u.includes('api.github.com')) return r.abort();
      const pt = decodeURIComponent(u.split('/contents/')[1].split('?')[0]), kind = /backup-local/.test(pt) ? 'backup' : /estado\.json$/.test(pt) ? 'estado' : /resultado\.json$/.test(pt) ? 'resultado' : 'outro';
      if (kind === 'backup' || kind === 'estado') srv.log.push(m + ' ' + kind); const mo = srv.modo[kind] || srv.modo.all || 'ok';
      if (mo === 'rede') return r.abort();
      if (/^\d+$/.test(mo)) return r.fulfill({ status: +mo, contentType: 'application/json', body: '{"message":"erro simulado"}' });
      const f = srv.files[pt];
      if (m === 'GET') { if (!f) return r.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"Not Found"}' });
        let c = f.content; if (mo === 'ruim') c = b64('{lixo'); if (mo === 'trunca') { const d = JSON.parse(de64(c)); d.opp = (d.opp || '') + ' '; c = b64(d); }
        return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: f.sha, content: c }) }); }
      if (m === 'PUT') { const body = JSON.parse(r.request().postData()); srv.puts.push({ pt, kind, body });
        if (kind === 'estado' && srv.e409 > 0) { srv.e409--; return r.fulfill({ status: 409, contentType: 'application/json', body: '{"message":"conflito"}' }); }
        if (kind === 'estado' && srv.e422 > 0) { srv.e422--; return r.fulfill({ status: 422, contentType: 'application/json', body: '{"message":"422"}' }); }
        if (f && !body.sha) return r.fulfill({ status: 422, contentType: 'application/json', body: '{"message":"sha wasn\'t supplied"}' });
        if (f && body.sha !== f.sha) return r.fulfill({ status: 409, contentType: 'application/json', body: '{"message":"sha errado"}' });
        srv.files[pt] = { sha: 's' + srv.puts.length, content: body.content }; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: { sha: srv.files[pt].sha } }) }); }
      return r.abort(); });
    await p.addInitScript(s => { window.__APORTE_TESTE__ = true; if (s) Object.keys(s).forEach(k => { if (s[k] != null) localStorage.setItem('minha-carteira-v1-' + k, s[k]); }); }, seed || null);
    await p.goto(APP); await p.waitForFunction(() => window.__aporte); await p.waitForTimeout(250);
    return p;
  }
  const ciclo = p => p.evaluate(async () => { S.keys.gh = 'tok'; await metCiclo(); });
  const ls = (p, k) => p.evaluate(k => localStorage.getItem('minha-carteira-v1-' + k), k);
  const estadoDe = srv => srv.files[URLS.estado] ? JSON.parse(de64(srv.files[URLS.estado].content)) : null;
  const cnt = (p, o) => p.evaluate(o => metCnt(o), o);

  /* ---------- M1 mescla pura ---------- */
  { const p = await novo(srvNovo());
    const r = await p.evaluate(({ OPP, GAR }) => { const a = { opp: OPP, gar: GAR }, bb = { opp: { AAAA3: [['2026-11-22', 7, 10, 9.7]], CCCC3: [['2026-11-22', 6, null, 5]] }, gar: { r: { '2026-11-22': { i: 1, l: [['AAAA3', 9, 7, 10], ['XXXX3', 5, 5, 5]] }, '2026-11-23': { i: 2, l: [] } } } }, o = {};
      o.comut = metCan(metMescla(a, bb)) === metCan(metMescla(bb, a)); o.idem = metCan(metMescla(a, a)) === metCan(metMescla(a, {})); o.vazio = metCan(metMescla({}, {})) === metCan({ opp: {}, gar: { r: {} } });
      const m = metMescla(a, bb); o.c = metCnt(m); o.dia22 = m.gar.r['2026-11-22'].l.length; o.opp22 = m.opp.AAAA3.length;
      o.ilegivel = metCan(metMescla(a, { opp: 'x', gar: null })) === metCan(metMescla(a, {})); o.ilegivel2 = metMescla({ opp: 'lixo', gar: [] }, {}).x >= 1;
      const ruim = metMescla({ opp: { AAAA3: [['31/12/2026', 1, 1, 1], ['2026-13-xx', 1, 1, 1], ['2026-01-01', 'a', 1, 1], ['2026-01-02', 1, 1, 1]] }, gar: { r: { '2026-1-1': { i: 1, l: [] }, '2026-02-02': { i: 1, l: [['A', 1, 1, 1], 7] } } } }, {}); o.ruim = [metCnt(ruim).l, metCnt(ruim).i, ruim.x];
      const big = {}; big.A = []; for (let i = 0; i < 250; i++) big.A.push([new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10), 5, 5, 5]); const gb = { r: {} }; for (let i = 0; i < 500; i++) gb.r[new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10)] = { i: 1, l: [['A', 1, 1, 1]] };
      const mn = metMescla({ opp: big, gar: gb }, {}), md = metMescla({ opp: big, gar: gb }, {}, { opp: 60, gar: 420 }); o.cortes = [mn.opp.A.length, Object.keys(mn.gar.r).length, md.opp.A.length, Object.keys(md.gar.r).length, md.opp.A[59][0] === big.A[249][0]];
      o.mesmaData = metMescla({ opp: { A: [['2026-01-01', 5, 5, 5]] } }, { opp: { A: [['2026-01-01', 7, null, 5]] } }).opp.A[0][1]; return o; }, { OPP, GAR });
    ok(r.comut && r.idem && r.vazio, 'M1: mescla é comutativa, idempotente e aceita vazio', r);
    ok(r.c.a === 3 && r.c.l === 6 && r.c.d === 3 && r.c.i === 4, 'M1: nenhuma entrada some (3 ações/6 linhas; 3 dias/4 ideias na união)', r.c);
    ok(r.dia22 === 2 && r.opp22 === 3, 'M1: mesma data com conteúdo diferente fica com o registro com mais itens', [r.dia22, r.opp22]);
    ok(r.ilegivel && r.ilegivel2, 'M1: lado ilegível é ignorado e contado', r);
    ok(JSON.stringify(r.ruim) === '[1,1,6]' || (r.ruim[0] === 1 && r.ruim[1] === 1 && r.ruim[2] >= 4), 'M1: datas e itens inválidos são descartados e contados (sem apagar os válidos)', r.ruim);
    ok(r.cortes[0] === 200 && r.cortes[1] === 500 && r.cortes[2] === 60 && r.cortes[3] === 420 && r.cortes[4], 'M1: cortes (nuvem 200/1100; aparelho 60/420, ficam os mais recentes)', r.cortes);
    ok(r.mesmaData === 5 || r.mesmaData === 7, 'M1: desempate determinístico', r.mesmaData);
    await p.close(); }

  /* ---------- M2 ordem do backup + conferência; falha = zero escritas ---------- */
  { const srv = srvNovo(), p = await novo(srv, { opp: OPPS, gar: GARS });
    await ciclo(p);
    ok(srv.log.join('|') === 'PUT backup|GET backup|GET estado|PUT estado', 'M2: ordem PUT backup → GET → (só então) estado.json', srv.log);
    const bk = srv.puts[0]; const doc = JSON.parse(de64(bk.body.content));
    ok(doc.opp === OPPS && doc.gar === GARS && doc.sha256.opp === sha(OPPS) && doc.sha256.gar === sha(GARS) && /backup-local-\d{4}-\d\d-\d\d-\d{4}\.json$/.test(bk.pt), 'M2: backup guarda as strings BRUTAS com SHA256 certo', [bk.pt, doc.sha256]);
    ok(await ls(p, 'met-mig') === 'ok', 'M2: marca de migração só depois da conferência'); await p.close();
    const s2 = srvNovo(); s2.modo.backup = 'trunca'; const p2 = await novo(s2, { opp: OPPS, gar: GARS }); await ciclo(p2);
    ok(!s2.log.includes('GET estado') && !s2.puts.some(x => x.kind === 'estado'), 'M2: cópia diferente ⇒ nenhum passo seguinte (nada no estado.json)', s2.log);
    ok(await ls(p2, 'met-mig') === null && await ls(p2, 'opp') === OPPS && await ls(p2, 'gar') === GARS, 'M2: cópia diferente ⇒ zero escritas no aparelho');
    ok(/idêntica/.test(await p2.evaluate(() => metTxt())), 'M2: aviso diz que a cópia não ficou idêntica'); await p2.close(); }

  /* ---------- M3 histórico corrompido (6 formas + 2) ---------- */
  const huge = 'x'.repeat(600000);
  const FORMAS = [['lixo', 'lixo', 'lixo'], ['[]', '[]', '[]'], ['null', 'null', 'null'], ['"x"', '"x"', '"x"'], ['tipo errado', '{"AAAA3":"x","BBBB3":5}', '{"r":[1,2]}'], ['enorme ilegível', huge, huge]];
  for (const [nome, o, g] of FORMAS) {
    const srv = srvNovo(nuv(NUV_OPP, NUV_GAR)), p = await novo(srv, { opp: o, gar: g });
    await p.evaluate(() => { metParse('opp'); metParse('gar'); });
    const antes = { ro: await ls(p, 'opp-ruim'), rg: await ls(p, 'gar-ruim') };
    ok(antes.ro === o && antes.rg === g, 'M3 [' + nome + ']: a string ruim foi guardada em -ruim, igual ao original');
    ok(await p.evaluate(() => metTrava('opp') && metTrava('gar')), 'M3 [' + nome + ']: gravação fica parada até tentar restaurar');
    const g1 = await p.evaluate(() => [metGrava('opp', { Z: [['2026-01-01', 1, 1, 1]] }), metGrava('gar', { r: {} })]);
    ok(!g1[0] && !g1[1] && await ls(p, 'opp') === o && await ls(p, 'gar') === g, 'M3 [' + nome + ']: nada é sobrescrito antes de tentar restaurar');
    ok(await p.evaluate(() => { try { garHist(); opHist(); garLoad(); return true } catch (e) { return false } }), 'M3 [' + nome + ']: o app lê sem erro');
    await ciclo(p);
    const lc = await p.evaluate(() => metCnt(metLocal())), cl = await cnt(p, nuv(NUV_OPP, NUV_GAR));
    ok(lc.a === cl.a && lc.l === cl.l && lc.d === cl.d && lc.i === cl.i, 'M3 [' + nome + ']: restaurou da nuvem', [lc, cl]);
    ok(await ls(p, 'opp-ruim') === o && await ls(p, 'gar-ruim') === g, 'M3 [' + nome + ']: a cópia do dado ruim continua guardada');
    const bd = JSON.parse(de64(srv.files[srv.puts[0].pt].content)); ok(bd.opp === o && bd.gar === g && bd.oppRuim === o, 'M3 [' + nome + ']: o backup na nuvem tem a string ruim bruta');
    ok(srv.puts.filter(x => x.kind === 'estado').length === 0, 'M3 [' + nome + ']: nuvem não foi sobrescrita (já tinha tudo)');
    await p.close(); }
  { const seed = { opp: '{"AAAA3":[["31/12/2026",1,1,1],["2026-01-02",1,1,1],["2026-01-03",1e999,1,1]]}', gar: JSON.stringify({ r: { '2026-1-1': { i: 1, l: [] }, '2026-02-02': { i: 1, l: [['A', 1, 1, 1], 7] } } }) }, srv = srvNovo(), p = await novo(srv, seed); await p.evaluate(() => { metParse('opp'); metParse('gar'); });
    ok(await ls(p, 'opp-ruim') === seed.opp && await ls(p, 'gar-ruim') === seed.gar, 'M3 [datas inválidas e valor enorme]: cópia bruta guardada');
    const c = await p.evaluate(() => metCnt(metLocal())); ok(c.l === 1 && c.d === 1 && c.i === 1, 'M3 [datas inválidas]: só os itens válidos são lidos', c); await p.close(); }

  /* ---------- M4 aparelho zerado com nuvem cheia ---------- */
  { const srv = srvNovo(nuv(NUV_OPP, NUV_GAR)), p = await novo(srv, {}); await ciclo(p);
    const r = await p.evaluate(() => ({ l: metCan(metLocal()), o: localStorage.getItem('minha-carteira-v1-opp'), g: localStorage.getItem('minha-carteira-v1-gar') }));
    const canon = JSON.stringify({ opp: JSON.parse(JSON.stringify(NUV_OPP)), gar: NUV_GAR });
    ok(sha(r.l) === sha(canon), 'M4: aparelho zerado ⇒ restauração fiel (SHA256 do conteúdo canônico igual ao da nuvem)', [r.l.slice(0, 80)]);
    ok(r.o && r.g && !srv.puts.some(x => x.kind === 'estado'), 'M4: não escreveu de volta na nuvem o que já estava lá'); await p.close(); }

  /* ---------- M5 nada perdido ---------- */
  { const srv = srvNovo(), p = await novo(srv, { opp: OPPS, gar: GARS }); const c0 = await cnt(p, { opp: OPP, gar: GAR }); await ciclo(p);
    ok(await ls(p, 'opp') === OPPS && await ls(p, 'gar') === GARS, 'M5: originais do aparelho com os MESMOS bytes depois da migração');
    const e = estadoDe(srv), c1 = await cnt(p, e); ok(c1.a === c0.a && c1.l === c0.l && c1.d === c0.d && c1.i === c0.i, 'M5: contagem na nuvem = contagem no aparelho (nada perdido)', [c0, c1]);
    ok(/salvo na nuvem/.test(await p.evaluate(() => metTxt())) && /cópia de segurança feita/.test(await p.evaluate(() => metTxt())), 'M5: Ajustes diz "salvo na nuvem" e "cópia de segurança feita"');
    const bkDoc = JSON.parse(de64(srv.puts[0].body.content)); const guardado = { o: bkDoc.opp, g: bkDoc.gar };
    await p.close();
    /* restauração a partir do backup-local: colar as strings brutas num aparelho zerado */
    const p2 = await novo(srvNovo(), { opp: guardado.o, gar: guardado.g }); const c2 = await p2.evaluate(() => metCnt(metLocal()));
    ok(guardado.o === OPPS && guardado.g === GARS && c2.l === c0.l && c2.i === c0.i && await ls(p2, 'opp') === OPPS, 'M5: restaurar do backup-local-*.json devolve o histórico idêntico'); await p2.close();
    /* nuvem maior × aparelho diferente: união nos dois sentidos */
    const s3 = srvNovo(nuv(NUV_OPP, NUV_GAR)), p3 = await novo(s3, { opp: OPPS, gar: GARS }); await ciclo(p3);
    const u = await p3.evaluate(() => metCnt(metLocal())), ce = estadoDe(s3), cc = await cnt(p3, ce);
    ok(u.a === 3 && cc.a === 3 && u.d === 3 && cc.d === 3 && cc.l >= 6 && cc.i >= 4, 'M5: união aparelho+nuvem em ambos os lados (3 ações, 3 dias)', [u, cc]);
    ok(await ls(p3, 'opp-ruim') === null, 'M5: dado bom não gera cópia -ruim'); await p3.close();
    /* nunca grava menos do que a nuvem tem */
    const s4 = srvNovo(nuv(NUV_OPP, NUV_GAR)), p4 = await novo(s4, { opp: '{}', gar: '{"r":{}}' }); await ciclo(p4);
    ok(!s4.puts.some(x => x.kind === 'estado'), 'M5: aparelho vazio não sobrescreve a nuvem com algo menor'); await p4.close(); }

  /* ---------- M6 falhas de sincronização ---------- */
  const MSG = { '401': /permissão/, '403': /permissão/, '404': /não encontrado/, '500': /recusou \(erro 500\)/, rede: /sem conexão/ };
  async function falha(nome, cfg, seed, esperaTxt, esperaPuts) {
    const srv = srvNovo(cfg.estado); Object.assign(srv.modo, cfg.modo || {}); srv.e409 = cfg.e409 || 0; srv.e422 = cfg.e422 || 0; const p = await novo(srv, seed);
    if (cfg.semToken) await p.evaluate(async () => { await metCiclo(); }); else await ciclo(p);
    const n = srv.log.length; await p.evaluate(async () => { await metCiclo(); await metCiclo(); }); await p.waitForTimeout(500);
    ok(srv.log.length === n, 'M6 [' + nome + ']: sem laço (repetir na hora não faz novos pedidos; espera 10 min)', [n, srv.log.length]);
    ok(esperaTxt.test(await p.evaluate(() => metTxt())), 'M6 [' + nome + ']: mensagem em Ajustes', await p.evaluate(() => metTxt()));
    if (cfg.estado) { const l = await p.evaluate(() => metCnt(metLocal())), c0 = await cnt(p, { opp: JSON.parse(seed.opp), gar: JSON.parse(seed.gar) }); ok(l.l >= c0.l && l.i >= c0.i && l.a >= c0.a && l.d >= c0.d, 'M6 [' + nome + ']: aparelho nunca fica com menos do que tinha', [c0, l]); } else ok(await ls(p, 'opp') === seed.opp && await ls(p, 'gar') === seed.gar, 'M6 [' + nome + ']: originais do aparelho intactos');
    if (cfg.estado) { const cc = await cnt(p, estadoDe(srv)), c0 = await cnt(p, cfg.estado); ok(cc.l >= c0.l && cc.i >= c0.i && cc.a >= c0.a && cc.d >= c0.d, 'M6 [' + nome + ']: nuvem nunca fica menor', [c0, cc]); }
    if (esperaPuts !== undefined) ok(srv.puts.filter(x => x.kind === 'estado').length === esperaPuts, 'M6 [' + nome + ']: pedidos de gravação do estado = ' + esperaPuts, srv.puts.length);
    await p.close(); return srv;
  }
  const SD = { opp: OPPS, gar: GARS };
  await falha('sem token', { semToken: true }, SD, /sem token do GitHub/, 0);
  for (const c of ['401', '403', '404', '500', 'rede']) await falha(c, { modo: { all: c } }, SD, MSG[c], 0);
  await falha('backup recusa 500, estado ok', { modo: { backup: '500' } }, SD, /recusou/, 0);
  await falha('estado ilegível na nuvem', { estado: nuv(NUV_OPP, NUV_GAR), modo: { estado: 'ruim' } }, SD, /ilegível/, 0);
  const s409 = await falha('conflito 409 persistente', { estado: nuv(NUV_OPP, NUV_GAR), e409: 99 }, SD, /recusou \(erro 409\)/, 4);
  const s422 = await falha('422 uma vez e depois ok', { estado: nuv(NUV_OPP, NUV_GAR), e422: 1 }, SD, /salvo na nuvem/, 2);
  await falha('estado 500 depois do backup', { modo: { estado: '500' } }, SD, /recusou/, 0);

  /* ---------- M7 compatibilidade de reversão: código da 1.79.0 lê o localStorage da 1.80.0 ---------- */
  { const srv = srvNovo(), p = await novo(srv, { opp: OPPS, gar: GARS }); await ciclo(p);
    const dump = await p.evaluate(() => { const o = {}; Object.keys(localStorage).forEach(k => { if (k.indexOf('minha-carteira-v1-') === 0) o[k.slice(18)] = localStorage.getItem(k); }); return o; }); await p.close();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v179-')); let tem179 = true; try { cp.execSync('git archive 5352854ba768939db8d7db1352863650c73a6fe6 | tar -x -C ' + dir, { cwd: ROOT, stdio: 'pipe' }); } catch (e) { tem179 = false; console.log('(M7 pulado: a 1.79.0 não está neste clone; rode com o histórico completo)'); }
    if (tem179) {
    const p2 = await b.newPage(); p2.on('pageerror', e => er.push('v1.79.0: ' + e.message)); await p2.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
    await p2.addInitScript(s => { window.__APORTE_TESTE__ = true; Object.keys(s).forEach(k => localStorage.setItem('minha-carteira-v1-' + k, s[k])); }, dump);
    await p2.goto('file://' + path.join(dir, 'index.html')); await p2.waitForFunction(() => window.__aporte); await p2.waitForTimeout(250);
    const r = await p2.evaluate(() => ({ v: VERSAO, h: garHist(), oh: Object.keys(opHist()).length, gl: Object.keys(garLoad().r).length, ok: (typeof opAlerts) }));
    ok(r.v === '1.79.0' && r.oh === 2 && r.gl === 2 && typeof r.h === 'string' && r.h.indexOf('NaN') < 0 && r.ok === 'function', 'M7: a 1.79.0 abre e lê o histórico gravado pela 1.80.0 sem converter nada', r);
    const o2 = await p2.evaluate(() => localStorage.getItem('minha-carteira-v1-opp')); ok(o2 === OPPS, 'M7: a 1.79.0 não alterou os dados'); await p2.close(); } fs.rmSync(dir, { recursive: true, force: true }); }

  /* ---------- M8 painel ---------- */
  { const p = await novo(srvNovo());
    const R = (n, extra) => Object.assign({ v: 1, gerado: '2027-03-01', nmin: 10, motor: 'faixa-unica', entradas: [{ tk: '<img src=x onerror=alert(1)>', dia: '2026-11-23' }, { tk: 'BBBB3' }], agg: { '90': { total: { n, bI: Math.min(n, 6), bC: Math.min(n, 5), bAmbos: 4, med: 0.042, medI: 0.011, medC: 0.029 }, conf: { Alta: { n: 12, bI: 8, bC: 7 }, 'Média': { n: 6, bI: 3, bC: 3 }, 'Verificação': { n: 5, bI: 2, bC: 1 } }, ms: { neg: { n: 7, bI: 3, bC: 3 }, '0-20': { n: 5, bI: 2, bC: 2 }, '20+': { n: 2, bI: 1, bC: 1 } }, fora: { semSaida: 2, split: 1, semDiv: 0, semFoto: 0 }, datas: 9, prox: '2027-02-23' }, '180': { total: { n: 0 } }, '365': { total: { n: 0 } } } }, extra || {});
    const h = await p.evaluate(({ r0, r1, r9, r10 }) => { const o = {}; METRT = Date.now() + 1e9; S.keys.gh = 'tok'; const g = r => { METR = r === 'sem' ? null : r === 'ilegivel' ? { ok: false, m: 'arquivo ilegível' } : { ok: true, r: r }; return metHtml(); };
      o.vazio = g('sem'); o.ilegivel = g('ilegivel'); o.n0 = g(r0); o.n1 = g(r1); o.n9 = g(r9); METOPEN = true; o.n9a = g(r9); o.n10 = g(r10); METH = 180; o.h180 = g(r10); METH = 90;
      o.fechado = (METOPEN = false, g(r10)); o.mentira = g(Object.assign({}, r9, { agg: Object.assign({}, r9.agg, { '90': Object.assign({}, r9.agg['90'], { total: { n: 5, bI: 5, bC: 5, bAmbos: 5, concl: true } }) }) }));
      o.lixo = [{ ok: true, r: { v: 1, agg: { '90': { total: { n: NaN, bI: 'x', med: Infinity } } }, entradas: [] } }, { ok: true, r: { v: 1, agg: { '90': null }, entradas: [] } }, { ok: true, r: { v: 2 } }, { ok: true, r: null }].map(x => { METR = x; return metHtml(); }); return o; },
      { r0: R(0), r1: R(1), r9: R(9), r10: R(10) });
    const txt = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    ok(/Esse método já acertou\?/.test(h.fechado) && /aria-expanded="false"/.test(h.fechado) && /aria-controls="metd"/.test(h.fechado) && /id="metd" hidden/.test(h.fechado), 'M8: fechado por padrão (aria-expanded=false, aria-controls, área oculta)');
    ok(/aria-expanded="true"/.test(h.n9a) && !/id="metd" hidden/.test(h.n9a), 'M8: aberto (aria-expanded=true)');
    ok(/Histórico ainda não disponível/.test(h.vazio) && /Histórico ainda não disponível/.test(h.ilegivel), 'M8: sem resultado.json / ilegível ⇒ "Histórico ainda não disponível"');
    for (const [k, v] of [['n0', h.n0], ['n1', h.n1], ['n9', h.n9a]]) ok(/Poucos dados para concluir/.test(v) && !/\(\d+%\)/.test(txt(v)) && !/Bateram/.test(txt(v)), 'M8: ' + k + ' ⇒ "poucos dados" e nenhum %', txt(v).slice(0, 200));
    ok(/Poucos dados para concluir · 0 de 10/.test(h.n0) && /Primeira medição.*23\/02\/2027/.test(txt(h.n0)), 'M8: n=0 mostra "0 de 10" e a data da primeira medição');
    ok(/Bateram o Ibovespa.*6 de 10 \(60%\)/.test(txt(h.n10)) && /Bateram o CDI.*5 de 10 \(50%\)/.test(txt(h.n10)) && /Bateram os dois.*4 de 10/.test(txt(h.n10)), 'M8: n=10 conclui (6 de 10 / 5 de 10 / 4 de 10)', txt(h.n10).slice(0, 400));
    ok(/\+4,20%/.test(txt(h.n10)) && /com dividendos, antes de imposto/.test(txt(h.n10)), 'M8: mediana e rótulo "com dividendos, antes de imposto"');
    ok(/Alta\s*12\s*8 de 12 bateram o Ibov · 7 de 12 o CDI/.test(txt(h.n10)) && /Média\s*6\s*poucos dados/.test(txt(h.n10)) && /Em verificação\s*5\s*poucos dados \(controle\)/.test(txt(h.n10)), 'M8: grupo só mostra "x de y" com n ≥ 10 dele mesmo; os demais "poucos dados" (total ≥ 10)', txt(h.n10).slice(0, 700));
    ok(/Negativa\s*7\s*poucos dados/.test(txt(h.n10)) && /Fora da conta: 2 sem preço de saída, 1 desdobramento/.test(txt(h.n10)), 'M8: margem por grupo e "fora da conta"');
    ok(!/entraram em 9 datas|poucas datas/.test(txt(h.n10)) || /entraram em 9 datas/.test(txt(h.n10)), 'M8: datas distintas');
    ok(/poucas datas diferentes/.test(h.n10.replace(/entraram em 9/, '')) === false, 'M8: sem aviso de datas com 9 datas');
    ok(!/\(\d+%\)/.test(txt(h.mentira)) && !/Bateram/.test(txt(h.mentira)) && /Poucos dados/.test(h.mentira), 'M8: o app recalcula n ≥ 10 mesmo se o arquivo disser concl:true com n=5');
    ok(/aria-pressed="true"[^>]*>6 meses|data-methz="180"[^>]*aria-pressed="true"/.test(h.h180) || /data-methz="180" aria-pressed="true"/.test(h.h180), 'M8: troca de prazo marca 6 meses');
    for (const k of ['vazio', 'ilegivel', 'n0', 'n1', 'n9', 'n9a', 'n10', 'h180', 'fechado', 'mentira']) ok(!/NaN|undefined|Infinity|\[object/.test(h[k]), 'M8: sem NaN/undefined em ' + k);
    h.lixo.forEach((x, i) => ok(!/NaN|undefined|Infinity|\[object/.test(x) && /Esse método já acertou\?/.test(x), 'M8: resultado.json estragado #' + i + ' não quebra nem mostra NaN'));
    ok(!/<img/i.test(h.n10) && !/onerror/i.test(h.n10), 'M8: tk com <img onerror> nunca chega ao painel');
    ok(await p.evaluate(() => !window.__xss), 'M8: nada executou');
    /* visual: 320 e 360 px, fonte ×1,3, três temas, alvos ≥ 44 px */
    for (const w of [320, 360]) for (const tema of ['azul', 'branco', 'preto']) for (const fs_ of [1, 1.3]) {
      await p.setViewportSize({ width: w, height: 800 });
      const r = await p.evaluate(({ r10, tema, fs_ }) => { setTema(tema); document.documentElement.style.fontSize = (16 * fs_) + 'px'; METR = { ok: true, r: r10 }; METOPEN = true; METH = 90; let d = document.getElementById('mtbox'); if (!d) { d = document.createElement('div'); d.id = 'mtbox'; d.style.cssText = 'position:fixed;inset:0;overflow:auto;background:var(--bg);z-index:99999;padding:8px'; document.body.appendChild(d); }
        setHtml(d, metHtml(), 'add'); const t = [].slice.call(d.querySelectorAll('.metb,.metzb')).map(e => Math.round(e.getBoundingClientRect().height)); const o = { sw: d.scrollWidth, cw: d.clientWidth, doc: document.documentElement.scrollWidth <= window.innerWidth, h: Math.min.apply(null, t) }; d.remove(); document.documentElement.style.fontSize = ''; return o; }, { r10: R(10), tema, fs_ });
      ok(r.sw <= r.cw && r.doc && r.h >= 44, 'M8: ' + w + ' px, tema ' + tema + ', fonte ×' + fs_ + ': sem rolagem horizontal e alvos ≥ 44 px', r); }
    await p.evaluate(() => setTema('azul')); await p.close(); }

  /* ---------- M9 foto traz ibov; leitor antigo ignora ---------- */
  { const p = await novo(srvNovo());
    const r = await p.evaluate(() => { const old = fotoLinha; fotoLinha = function (o, s) { return { tk: o.tk, st: s }; }; const d = fotoMontar({ D: [{ tk: 'AAAA3', fx: { ok: true } }], X: [] }, '2026-11-23'); fotoLinha = old; return d && { tem: 'ibov' in d, ibov: d.ibov, motor: d.regra.motor, ig: garIbov() }; });
    ok(r && r.tem && r.ibov === r.ig && r.motor === 'faixa-unica', 'M9: foto nova traz o campo ibov (e o motor)', r); await p.close(); }

  /* ---------- M10/M11/M12 regressões simples, CSP e privacidade ---------- */
  { const src = fs.readFileSync(path.join(ROOT, 'js', 'mercado-oportunidades.js'), 'utf8'); const h = sha(src.match(/function opData\(\)\{[\s\S]*?return OPC\.r\}/)[0]);
    ok(h === '9e54e5e4be571bf93998d65f91eede584276a34b77bd0e6887b78b80e246138a', 'M10: opData byte a byte igual ao da 1.79.0 (hash)', h);
    const mj = fs.readFileSync(path.join(ROOT, 'js', 'metodo.js'), 'utf8'), ih = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), swj = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    ok(!/https?:\/\//.test(mj) && /api\.github\.com/.test(ih), 'M11: metodo.js não cita domínio novo (CSP inalterada)');
    ok(/js\/metodo\.js/.test(swj) && /js\/metodo\.js/.test(ih) && ih.indexOf('js/foto.js') < ih.indexOf('js/metodo.js') && ih.indexOf('js/metodo.js') < ih.indexOf('js/abas.js'), 'M11: metodo.js está no index.html (antes de abas.js) e no precache');
    ok(!/innerHTML\s*=|insertAdjacentHTML|outerHTML\s*=/.test(mj) && !/\son[a-z]+=/.test(mj.replace(/addEventListener/g, '')), 'M11: sem innerHTML nem atributos de evento no código novo');
    ok(fs.statSync(path.join(ROOT, 'js', 'metodo.js')).size < 25000, 'M11: metodo.js < 25 KB', fs.statSync(path.join(ROOT, 'js', 'metodo.js')).size);
    const real = path.join(ROOT, '..', 'minha-carteira-dados', 'carteira.json');
    if (fs.existsSync(real)) { const c = JSON.parse(fs.readFileSync(real, 'utf8')), tks = [...new Set((c.trades || []).map(t => t.ticker).filter(t => t && t.length >= 5))]; const novos = [mj, fs.readFileSync(__filename, 'utf8')].join('\n');
      ok(tks.length > 3 && !tks.some(t => new RegExp('\\b' + t + '\\b').test(novos)), 'M12: nenhum ticker da carteira real nos arquivos novos (' + tks.length + ' conferidos)'); }
    else console.log('(M12 com dados reais pulado: repositório privado não está ao lado)'); }

  ok(er.length === 0, 'nenhum erro de JavaScript (pageerror) em todos os cenários', er.slice(0, 3));
  await b.close(); console.log(falhas ? '✗ ' + falhas + ' falha(s) em ' + total + ' conferências' : '✓ Método: ' + total + ' conferências ok'); process.exit(falhas ? 1 : 0);
})();
