/* Linter do Aporte: só regras que pegam erro de verdade (variável que não existe, chave repetida,
   código que nunca roda...). Estilo não é cobrado: o código é denso de propósito (ES5, sem módulos).
   Rodar: npx eslint@9 */
const js = require('@eslint/js');

const navegador = {
  window: 'readonly', document: 'readonly', navigator: 'readonly', location: 'readonly', localStorage: 'readonly',
  sessionStorage: 'readonly', history: 'readonly', fetch: 'readonly', URL: 'readonly', URLSearchParams: 'readonly',
  AbortController: 'readonly', Intl: 'readonly', Promise: 'readonly', Blob: 'readonly', FileReader: 'readonly',
  TextDecoder: 'readonly', TextEncoder: 'readonly', MutationObserver: 'readonly', ResizeObserver: 'readonly',
  IntersectionObserver: 'readonly', CSS: 'readonly', console: 'readonly', setTimeout: 'readonly',
  clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly', getComputedStyle: 'readonly', matchMedia: 'readonly', atob: 'readonly',
  btoa: 'readonly', alert: 'readonly', confirm: 'readonly', prompt: 'readonly', Event: 'readonly',
  CustomEvent: 'readonly', Element: 'readonly', HTMLElement: 'readonly', Node: 'readonly', Image: 'readonly',
  screen: 'readonly', performance: 'readonly', caches: 'readonly', self: 'readonly', clients: 'readonly',
  skipWaiting: 'readonly', Notification: 'readonly', DOMParser: 'readonly', XMLSerializer: 'readonly'
};

const regras = Object.assign({}, js.configs.recommended.rules, {
  'no-empty': 'off',            /* catch(e){} vazio é de propósito: o app tem que seguir funcionando offline */
  'no-unused-vars': 'off',
  'no-redeclare': 'off',        /* var repetido é comum neste estilo */
  'no-useless-escape': 'off',
  'no-inner-declarations': 'off',
  'no-cond-assign': 'off',
  'no-constant-condition': 'off',
  'no-prototype-builtins': 'off',
  'no-control-regex': 'off',
  'no-fallthrough': 'off'
});

module.exports = [
  { ignores: ['node_modules/**', 'tests/**'] },
  { files: ['app.js', 'sw.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: navegador }, rules: regras },
  { files: ['eslint.config.js', 'tests/**/*.js'], languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { require: 'readonly', module: 'writable', __dirname: 'readonly', process: 'readonly', console: 'readonly', window: 'readonly', document: 'readonly' } }, rules: {} }
];
