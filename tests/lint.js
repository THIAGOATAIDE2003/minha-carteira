/* Linter do Aporte (precisa do eslint: npm install --no-save eslint@9).
   Os arquivos de js/ compartilham as mesmas variáveis e funções, então o linter junta todos na ordem do
   index.html e confere o conjunto (assim ele acha, por exemplo, uma função usada que não existe em arquivo nenhum).
   Os erros saem com o nome do arquivo e a linha de verdade. sw.js e tema.js são conferidos à parte.
   Uso: node tests/lint.js */
const fs = require('fs'), path = require('path');
const { ESLint } = require('eslint');
const raiz = path.resolve(__dirname, '..');

(async () => {
  const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
  const arquivos = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);
  if (!arquivos.length) { console.log('✗ nenhum js/ encontrado no index.html'); process.exit(1); }
  let junto = '';
  const inicios = [];
  for (const f of arquivos) {
    const t = fs.readFileSync(path.join(raiz, f), 'utf8');
    inicios.push({ f, linha: junto.split('\n').length });
    junto += t.endsWith('\n') ? t : t + '\n';
  }
  const eslint = new ESLint({ cwd: raiz });
  const problemas = [];
  /* Nomes globais repetidos em arquivos diferentes: como todos dividem o mesmo escopo, o de baixo apaga o de cima sem aviso. */
  const donos = {};
  for (const f of arquivos)
    for (const l of fs.readFileSync(path.join(raiz, f), 'utf8').split('\n')) {
      const m = l.match(/^(?:function\s+([A-Za-z_$][\w$]*)|var\s+([A-Za-z_$][\w$]*))/);
      if (m) { const n = m[1] || m[2]; (donos[n] = donos[n] || new Set()).add(f); }
    }
  for (const n in donos) if (donos[n].size > 1) problemas.push('global "' + n + '" definido em mais de um arquivo: ' + [...donos[n]].join(', '));
  const dono = n => { let o = inicios[0]; for (const i of inicios) if (i.linha <= n) o = i; return { f: o.f, linha: n - o.linha + 1 }; };
  for (const r of await eslint.lintText(junto, { filePath: path.join(raiz, 'js', '_todos.js') }))
    for (const m of r.messages) { const d = dono(m.line); problemas.push(d.f + ':' + d.linha + '  ' + m.message + (m.ruleId ? '  (' + m.ruleId + ')' : '')); }
  for (const f of ['sw.js', 'tema.js'])
    for (const r of await eslint.lintFiles([f]))
      for (const m of r.messages) problemas.push(f + ':' + m.line + '  ' + m.message + (m.ruleId ? '  (' + m.ruleId + ')' : ''));
  if (problemas.length) { console.log(problemas.join('\n') + '\n\n✗ ' + problemas.length + ' problema(s)'); process.exit(1); }
  console.log('✓ Lint ok: ' + arquivos.length + ' arquivos de js/ + sw.js + tema.js');
})();
