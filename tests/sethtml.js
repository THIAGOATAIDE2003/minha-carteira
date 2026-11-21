/* setHtml(): a única porta de HTML montado em texto. Confere que tira o perigoso e deixa passar o que o app usa.
   Uso: node tests/sethtml.js (precisa do playwright) */
const { chromium } = require('playwright');
const path = require('path'), APP = 'file://' + path.resolve(__dirname, '..', 'index.html');
(async () => {
  const b = await chromium.launch(), pg = await b.newPage(), er = [];
  pg.on('pageerror', e => er.push('PAGEERR ' + e.message));
  await pg.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  await pg.addInitScript(() => { window.__APORTE_TESTE__ = true; window.__x = 0; });
  await pg.goto(APP); await pg.waitForFunction(() => window.__aporte);
  const falhas = await pg.evaluate(() => {
    var f = [], d = document.createElement('div'); document.body.appendChild(d);
    function t(n, h, fn, modo) { try { setHtml(d, h, modo); if (!fn(d)) f.push(n + ' -> ' + d.innerHTML.slice(0, 120)); } catch (e) { f.push(n + ' EXC ' + e.message); } }
    var q = function (s) { return d.querySelector(s) };
    t('script some', '<p id=a>ok</p><script>window.__x=1</script>', function () { return q('#a') && !q('script') && window.__x === 0 });
    t('onclick some', '<button id=b onclick="window.__x=2" onmouseover=x>b</button>', function () { return q('#b') && ![].some.call(q('#b').attributes, function (a) { return /^on/.test(a.name) }) });
    t('img onerror some', '<img id=i src=x onerror="window.__x=3">', function () { return q('#i') && !q('#i').hasAttribute('onerror') });
    t('iframe/object/embed/link/style/meta', '<iframe src=a></iframe><object data=a></object><embed src=a><link rel=stylesheet href=a><style>*{}</style><meta http-equiv=refresh content=0><b id=k>k</b>', function () { return q('#k') && !q('iframe,object,embed,link,style,meta') });
    t('javascript: href', '<a id=l href="javascript:alert(1)">x</a><a id=l2 href=" JaVa\nScRiPt:alert(1)">y</a>', function () { return !q('#l').hasAttribute('href') && !q('#l2').hasAttribute('href') });
    t('data:text/html src', '<img id=i src="data:text/html,<script>1</script>">', function () { return !q('#i').hasAttribute('src') });
    t('svg: script/foreignObject/animate/xlink', '<svg id=s viewBox="0 0 10 10"><script>1</script><foreignObject><div>x</div></foreignObject><a xlink:href="javascript:1"><text>t</text></a><set attributeName=href to="javascript:1"/><circle cx=1 cy=1 r=1 onclick=1 /></svg>', function () { return q('#s') && q('circle') && !q('script,foreignObject,set') && !q('a').hasAttribute('xlink:href') && !q('circle').hasAttribute('onclick') });
    t('style perigoso', '<i id=a style="width:expression(alert(1))">a</i><i id=b style="background:url(javascript:1)">b</i><i id=c style="width:50%;color:red">c</i>', function () { return !q('#a').hasAttribute('style') && !q('#b').hasAttribute('style') && q('#c').getAttribute('style') === 'width:50%;color:red' });
    t('legítimo passa igual', '<a class=ndi href="https://x.com/a?b=1" target="_blank">n</a><a id=m href="mailto:a@b.c">m</a><a id=r href="#x">r</a><img id=i src="https://icons.brapi.dev/a.png" alt=""><img id=d src="data:image/png;base64,AAAA"><input id=v value="1,5" data-k="z" checked><svg><path d="M0 0L1 1" stroke="red"/></svg>', function () { return q('.ndi').getAttribute('href') === 'https://x.com/a?b=1' && /noopener/.test(q('.ndi').rel) && q('#m').hasAttribute('href') && q('#r').hasAttribute('href') && q('#i').getAttribute('src') && q('#d').getAttribute('src') && q('#v').getAttribute('data-k') === 'z' && q('#v').checked && q('path').getAttribute('d') === 'M0 0L1 1' });
    t('tr/li/option sem contexto', '<tr><td id=t>1</td></tr>', function () { return !!q('#t') });
    var ul = document.createElement('ul'); setHtml(ul, '<li>a</li><li>b</li>'); if (ul.children.length !== 2) f.push('li');
    var sel = document.createElement('select'); setHtml(sel, '<option value="1">a</option><option value="2">b</option>'); if (sel.options.length !== 2) f.push('option');
    var tb = document.createElement('tbody'); setHtml(tb, '<tr><td>1</td></tr><tr><td>2</td></tr>'); if (tb.rows.length !== 2) f.push('tr');
    t('troca conteúdo anterior', '<p id=n>novo</p>', function () { return d.children.length === 1 && q('#n') });
    t('add acrescenta', '<p id=m2>mais</p>', function () { return d.children.length === 2 && q('#m2') }, 'add');
    var w = document.createElement('div'); w.id = 'sh-w'; d.appendChild(w); var nn = setHtml(w, '<section id=sh-n>x</section><script>1</script>', 'troca'); if (document.getElementById('sh-w') || !document.getElementById('sh-n') || nn.id !== 'sh-n') f.push('troca');
    setHtml(d, null); if (d.innerHTML !== '') f.push('null'); setHtml(d, 0); if (d.textContent !== '0') f.push('zero'); if (setHtml(null, 'x') !== null) f.push('el nulo');
    return f;
  });
  await b.close();
  if (falhas.length || er.length) { console.log('FALHOU\n' + falhas.concat(er).join('\n')); process.exit(1); }
  console.log('setHtml OK');
})();
