# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Aporte" (formerly "Minha Carteira"; repo and localStorage keys keep the old name) is a personal investment-portfolio PWA (pt-BR UI, BRL/USD, Brazilian + US holdings). It is a static site hosted on GitHub Pages (`.nojekyll`); the repo holds only code — user data lives in the browser (localStorage) and in the private repo described under Cloud sync.

There is no build system or package manager (Playwright and ESLint are only installed on demand with `npm install --no-save`). To develop, edit the files and open `index.html` in a browser (or serve the directory with any static server, e.g. `python3 -m http.server`).

## Files, version and lint

- `index.html` = markup only. `tema.js` = tiny script that applies the saved theme before first paint (loaded plain in `<head>`, no defer). `style.css` = all CSS. `js/*.js` = all the logic, split by subject (list below). `sw.js` = service worker. A new local file referenced by `index.html` must also go in the precache list of `sw.js` (the test fails if it is missing).
- **How `js/` works**: plain classic scripts, no IIFE and no modules, loaded in the order of the `<script>` tags in `index.html`. Every file shares the same global scope (like the old single file did), so functions and `var`s are visible across files. Order: `nucleo` (state, helpers, `compute()`), `proventos` (Proventos tab), `ui` (balões, gráficos), `grafico` (gráfico estilo Google), `inicio` (Início tab), `mercado` (Mercado tab, oportunidades, notícias), `acao` (stock page, análise, preço justo), `risco`, `carteira` (hoje/desempenho/posições/extrato), `tela` (`render()`, lançamento form, tema, global clicks), `metas-aporte-imposto`, `evolucao`, `dados` (proventos automáticos, CDI, renda fixa, benchmark), `nuvem` (GitHub sync), `atualizacao` (quotes refresh, B3/EUA hours, tape), `perfil`, `assistente`, `abas` (tabs + boot). A new file goes in `index.html` and in `sw.js`.
- **Load-order rules** (the scripts run one after another, and promises/timers can fire in between): (1) at load time a file may only call things from itself or from files **above** it; functions from later files are only safe inside event handlers/callbacks. (2) `render()` does nothing until `BOOT` is true (set in `abas.js`, the last file), so an early `.then(render)` is harmless. (3) Every `setTimeout`/`setInterval` kickoff lives at the end of `abas.js`; do not start timers in other files. (4) `window.__aporte` (test hook) is built at the end of `abas.js`.
- **Split files**: `mercado`, `acao` and `assistente` are each split into consecutive parts (`mercado-oportunidades/visao/setores`, `acao-valor/pagina`, `assistente-chat/relatorio`) and `style.css` into `style-proventos.css` and `style-extras.css`. They are the same script/stylesheet cut in order (same global scope, order in `index.html` and `sw.js` must match). Keep new files under ~25 KB; cut at top-level boundaries.
- **Version**: `VERSAO` at the top of `js/nucleo.js` (`MAJOR.MINOR.PATCH`, shown in Ajustes). It is the single source: the app registers `sw.js?v=VERSAO` and `sw.js` names its offline cache `aporte-v<VERSAO>`, so a new version drops the old cache. **Bump `VERSAO` on every change the user can see** (patch for small fixes, minor for new features).
- **Lint**: `node tests/lint.js` (needs `npm install --no-save eslint@9`; it joins `js/*.js` in load order and lints the whole, so an undefined name across files is caught; config `eslint.config.js`: only real-error rules such as undefined variables, duplicate keys, unreachable code; style is not enforced). Run it with the tests before every push; CI runs it too.

## Tests (run before every push)

`node tests/lint.js`, `node tests/sethtml.js` (unit test of `setHtml`) and `node tests/teste.js` (needs Playwright; install both together: `npm install --no-save playwright eslint@9`) opens `index.html` offline with a frozen clock, loads the example portfolio in the file and checks the money math against values computed by hand in the test (preço médio without fees, realized/unrealized, câmbio, proventos, taxas, CDB/LCI with CDI + IOF + IR, IR mensal with the R$ 20 mil exemption, FII 20%, carried losses, DARF date, Bens e Direitos, XIRR, splitNeed, B3 holidays), then compares everything with the snapshot `tests/esperado-exemplo.json` and clicks through every tab (any JS error fails). `node tests/teste.js --real ../minha-carteira-dados/testes/foto-real.json` does the same with a frozen copy of the user's real trades + quotes, kept only in the private data repo (never copy it here). `--gravar` rewrites a snapshot: only do it when a number changed on purpose, and say what changed. The app exposes its functions to the test only when `window.__APORTE_TESTE__` is set (end of `js/abas.js`). `.github/workflows/teste.yml` runs lint + the example test on every push. `node tests/mercado-aberto.js` (Playwright) simulates a market-open Monday with the real Worker code (`../minha-carteira-dados/worker/worker.js`, optional path argument) against a fake Yahoo, with no brapi/Finnhub/GitHub keys; run it after touching quotes, `pxQuotes`/`pxOne`, intraday or stale/suspicious-price code (it is not in CI because it needs the private repo's Worker).

## Architecture

Static PWA: `index.html` + `style.css` + `js/*.js` + `sw.js` (cache-first, whole version precached atomically; requests with `_v=` or `no-store` go to the network; never touches API calls). Code is dense ES5 (`var`, `function`, no modules) — keep that style when editing. State `S` is persisted in `localStorage` key `minha-carteira-v1` via `save()`; `compute()` in `nucleo.js` is the core calculation; `render()` in `tela.js` rebuilds HTML strings (always escape with `esc()`). **All HTML strings reach the DOM only through `setHtml(el, html[, 'add'|'troca'])` in `nucleo.js`** (parses in an inert `<template>`, strips script/iframe/object/style/on*/javascript: URLs, then inserts); never assign `.innerHTML`/`.outerHTML` or call `insertAdjacentHTML` (reading `.innerHTML` is fine; `tests/lint.js` fails on writes). `esc()` stays mandatory: `setHtml` is the safety net, not a replacement.

**The per-feature details (tabs, charts, robot, notícias, assistente, risco, análise, cabeçalho, preços...) live in `docs/arquitetura.md`. Read only the section for the area you are changing (`grep -n` for the function name), and update that file — not this one — when you change a feature.**

## User rules (never break)

- Início never mixes câmbio/vendas into its numbers; câmbio and lucro total live in Desempenho.
- One price per asset everywhere (`livePx`); dólar and US assets refresh every 5 min, BR every 15 min.
- Day variation is zeroed outside the session (`dzero`), zero is always gray and unsigned (`cls()` + `sg0()`).
- Proventos always net (líquido), no tax text. UI words in Portuguese; prefer ⓘ balloons (`bal()`, `BALT`) over visible explanatory text.
- Zero cost: free APIs only; no scheduled Claude tasks. Data repo stays private; never copy real data here.
- Bump `VERSAO` on every user-visible change.

## Content-Security-Policy (check on every change that touches the network)

`index.html` has a `<meta http-equiv="Content-Security-Policy">` right after `<meta charset>` that lists every external domain the app may talk to. The browser silently blocks anything not listed, so a new API, image host, font or script source **must be added to the CSP in the same change**, or the feature just stops loading (shows up only as a "Refused to connect" console error):

- `connect-src`: every `fetch`/`getJSON` host (APIs: brapi, Finnhub, AwesomeAPI, BCB, Alpha Vantage, GitHub, Groq, Gemini).
- `img-src`: logo/image hosts (icons.brapi.dev, financialmodelingprep.com).
- `style-src` / `font-src`: Google Fonts.
- `script-src` is `'self'` only: **no inline `<script>` and no `onclick=`/`onerror=`-style attributes** (the browser would block them). Put code in `js/*.js`/`tema.js` and use `addEventListener` (for `error` on images use the capture listener already in `js/nucleo.js`). Inline `style=` attributes are still allowed.
- Links built from outside data (news from the robot) go through `safeUrl()` so only http(s) opens.
- Removing an API? Drop its domain too.

Check with `grep -ohE "https?://[a-zA-Z0-9.-]+" index.html js/*.js style.css | sort -u` against the CSP. If the user reports that something "parou de carregar do nada", suspect the CSP first.
