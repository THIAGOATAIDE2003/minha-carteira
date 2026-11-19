# Aporte

App pessoal de carteira de investimentos, feito para usar no celular. Acompanha ações do Brasil e dos EUA, ETFs, renda fixa (CDB/LCI a % do CDI), câmbio, proventos e imposto de renda.

> O app se chama **Aporte**. O repositório e as chaves do navegador ainda usam o nome antigo, `minha-carteira`, para não perder dados já salvos.

## O que ele faz

- **Início:** patrimônio total, variação do dia, valorização e distribuição da carteira.
- **Carteira:** ativos, evolução mês a mês, desempenho contra Ibovespa/S&P 500/CDI, risco e extrato.
- **Proventos:** recebidos e a receber (com data-com), mês a mês e por ativo, sempre em valor líquido.
- **Mercado:** cotações, índices, análise de ações, preço justo e oportunidades.
- **Mais:** câmbio (spread e IOF separados), imposto (IR mensal, DARF, Bens e Direitos) e ajustes.

Os preços atualizam sozinhos: dólar e ativos dos EUA a cada 5 minutos, ações do Brasil a cada 15.

## Como usar

O app é um site estático publicado pelo GitHub Pages. Abra o endereço no celular e use "Adicionar à tela inicial" para instalar. Ele também abre sem internet, com os últimos dados salvos.

Em **Mais → Ajustes**, cole as chaves (todas grátis):

| Chave | Para quê |
|---|---|
| brapi | Cotações e proventos das ações do Brasil |
| Finnhub | Cotações dos EUA |
| Alpha Vantage | Histórico e dividendos dos EUA (opcional) |
| GitHub (token fine-grained) | Salvar os dados no repositório privado |

## Onde ficam os dados

- **Este repositório é público e tem só o código.** Nenhum dado nem chave fica aqui.
- As chaves ficam apenas no navegador do aparelho.
- Os lançamentos são salvos no navegador e sincronizados com um repositório **privado** (`minha-carteira-dados`), que também roda o robô diário de dados de mercado.

## Desenvolvimento

Não tem build nem dependências: o app é `index.html` (tela), `style.css` (visual) e `app.js` (lógica). Para testar localmente:

```sh
python3 -m http.server
```

Testes das contas (rodam também no GitHub Actions a cada push):

```sh
npm install --no-save playwright eslint@9 && npx playwright install chromium
npx eslint app.js sw.js   # erros de código (variável que não existe etc.)
node tests/teste.js       # contas e abas
```

Detalhes da arquitetura estão em [`CLAUDE.md`](CLAUDE.md).

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Estrutura da tela |
| `style.css` | Visual |
| `app.js` | Toda a lógica (e o número da versão, `VERSAO`) |
| `sw.js` | Service worker (funciona offline; o cache leva o número da versão) |
| `eslint.config.js` | Regras do linter |
| `manifest.webmanifest`, `icon.svg` | Instalação como app |
| `tests/` | Testes das contas e foto esperada |
| `.github/workflows/teste.yml` | Roda os testes a cada push |
