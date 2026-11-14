# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Aporte" (formerly "Minha Carteira"; repo and localStorage keys keep the old name) is a personal investment-portfolio PWA (pt-BR UI, BRL/USD, Brazilian + US holdings). It is a static site hosted on GitHub Pages (`.nojekyll`); the repo holds only code — user data lives in the browser (localStorage) and in the private repo described under Cloud sync.

There is no build system, package manager, test suite or linter. To develop, edit the files and open `index.html` in a browser (or serve the directory with any static server, e.g. `python3 -m http.server`).

## Architecture

Everything is in a single `index.html` (~1200 lines: inline CSS, markup, then one IIFE `<script>`). `manifest.webmanifest`, `icon.svg` and `sw.js` (service worker: network-first for the app's own files, cache fallback so it opens offline; never touches API calls) make it installable. Code is written in dense ES5 style (`var`, `function`, no modules) — keep that style when editing.

Key pieces inside the script:

- **State `S`** (persisted to `localStorage` key `minha-carteira-v1` via `save()`): `trades`, `cambio`, `quotes` (auto price cache), `fx`, `keys` (Finnhub, brapi and GitHub tokens), `pend` (cloud ops queue), `mclose`, `divFrom`. A separate key `minha-carteira-v1-fxh` caches the USD-BRL daily series (refetched after 6h).
- **Market data `MK`**: `ingestFx` loads the FX series; `getQuote(tk)` reads `S.quotes`; `fxOn(date)`/`fxToday()` resolve exchange rates.
- **`compute()`**: the core calculation. Sorts trades by date, builds per-ticker positions (qty, cost basis, realized P/L, dividends via `side==='div'`), converts US trades with each trade's `fx`, builds cash-flow list for `xirr()`.
- **Tabs**: bottom nav `resumo` (Início), `ativos` (Carteira, sub-views `pos`/`evo`/`apo` via `data-sub2`/`CARV`, hashes `#evolucao`/`#aporte`), `proventos`, `lancamentos` (Extrato), `mais` (sub-views `cambio`/`imposto`/`ajustes` via `data-sub` and `MAISV`); `showTab` accepts the old hashes.
- **Rendering**: `render()` calls `renderSummary`, `renderPositions`, `renderTrades`, `renderBanner`, `renderFx` — all rebuild HTML strings (escape with `esc()`); tabs switch via `showTab`. Form handling is in `syncForm`.
- **Live refresh `doRefresh()`**: every 15 min fetches USD-BRL from AwesomeAPI, US quotes from Finnhub (needs user key) and BR quotes from brapi.dev (needs user token, sequential with retry; skipped while B3 is closed once the closing price is cached, see `mktOpen`/`needQuote`). Uses `getJSON` with an 8s abort timeout.
- **Renda fixa**: trades with `side:'rf'` (aplicação: `price` = valor aplicado, `pct` = % do CDI, `isento`, `venc`) and `side:'rfout'` (resgate, `ref` = aplicação id, `price` = valor recebido), `market:'RF'`. `rfCalc()` compounds the BCB SGS série 12 daily CDI (`loadCDI`, cached in `minha-carteira-v1-cdi`) from the aplicação date up to (not including) today/resgate, then applies IOF (<30 dias) and IR regressivo on (rendimento − IOF).
- **Cloud sync**: `ghSync()` reads/writes `carteira.json` in the private repo `THIAGOATAIDE2003/minha-carteira-dados` via the GitHub contents API with the user's fine-grained token (`S.keys.gh`); local edits queue in `S.pend` (add/del ops) and are replayed on the latest remote on conflict.
- **Evolução**: `evoData()` replays trades up to each month end; prices come from brapi daily history (`loadHist`, cached in `minha-carteira-v1-hist`) or `fechamentos` in the cloud file (month closes; the app records the current month's auto quotes as `px` ops, once a day), falling back to average cost (marked *).
- **Aporte**: `S.alvos` `{classes:{BR,US,RF}, br:{ticker:%}}` synced as a `cfg` op (`applyCfg`); `splitNeed` sends new money to what is furthest below target, never sells.
- **Metas**: `S.metas` `{pat:{valor,data}, renda:{valor}}` synced as a `cfg` op; `metasHtml` (Início) shows progress, the monthly contribution needed at the CDI rate, and time to goal at the recent contribution pace.
- **Imposto**: `irData()` replays BR buys/sells (average cost) per month: ações isentas até R$ 20 mil de vendas no mês, senão 15%; FIIs (`FIIS` list) 20%; prejuízo carried per category. `bensEm(date)` gives Bens e Direitos cost at 31/12; proventos split by `tipo` (JCP/Dividendo) and exterior (`bruto`, `irExt`).

Keep user data and API keys out of the repo; the app must keep working offline from `localStorage` when network calls fail.
