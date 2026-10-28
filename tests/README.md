# Clavier — testes de caracterização

Rede de segurança para a refatoração. Os testes rodam contra **qualquer endereço** (produção, preview da Vercel, `localhost`) e descrevem o
comportamento do produto como ele é hoje, seção 11 do documento do projeto.

```bash
cd tests
npm install                                   # puppeteer-core, pixelmatch, pngjs
node run.js                                   # produção (https://playclavier.vercel.app)
node run.js --url=https://clavier-git-refactor-danilo-amorims-projects-c65cc695.vercel.app
node run.js --only=layout,colors              # só algumas suítes
node run.js --only=visual                     # só a comparação de imagens
node run.js --only=visual --update            # regrava as imagens-base a partir da página testada
node run.js --strict                          # bugs conhecidos (XFAIL) também reprovam a execução
```

Chrome: usa `CHROME_PATH` ou o Chrome do macOS (`/Applications/Google Chrome.app`). Endereço padrão: `TEST_URL`.

## Resultado de um teste

| Marca | Significado |
|---|---|
| `PASS` | comportamento esperado |
| `FAIL` | regressão: o produto mudou (a execução sai com código 1) |
| `XFAIL` | **bug conhecido**: o teste documenta um defeito ainda aberto e falha de propósito (`knownFailing` no código, com o motivo) |
| `XPASS` | um bug conhecido passou a funcionar: remova a marca `knownFailing` (a execução sai com código 1, para a marca não ficar velha) |

## Suítes

| Arquivo | O que cobre |
|---|---|
| `layout.spec.js` | margens, espaços entre blocos, folga acima da dock, tamanho dos botões em 1920, 1440, 1024, 430, 390, 360 e 320px; breakpoint de 820px ao vivo; dock em uma linha a partir de 393px |
| `colors.spec.js` | os 100 pares do SHUFFLE, tokens do tema padrão, uma só cor de primeiro plano, escolha livre e persistência, valor inválido no `localStorage` |
| `shuffle.spec.js` | o SHUFFLE nunca repete o fundo anterior (inclusive saindo do tema padrão) e alcança os 100 pares |
| `states.spec.js` | sem hover, sem estado pressionado, sem preenchimento, sem tooltip, sem transição nos botões; paleta chapada |
| `info.spec.js` | só as duas frases, Arizona Sans 28/35, bloco centralizado em 4 colunas, abre de uma vez, o endereço nunca muda, X/NEW/`i`, atualizar volta à home, área do texto acima da dock |
| `audio.spec.js` | contexto rodando, recuperação após interrupção simulada, cadeia master do celular (low-pass 3800 Hz → compressor → −4 dB), sem erros de página |
| `ios-keyboard.spec.js` | teclado do iOS com um `visualViewport` falso que nunca dispara evento; raiz travada |
| `share.spec.js` | celular: PNG 1080×1920 entregue na hora ao painel nativo; sem Web Share: copia o link; desktop: copia o link e mostra "Link copied" 40px acima do botão |
| `a11y.spec.js` | teclado de verdade (Tab, Enter, Espaço, Esc), anel só no teclado, `main`/`h1`/rótulos, Info como diálogo modal, ARIA do `+` e do `i`, paleta, `head` vivo |
| `visual.spec.js` | comparação de pixels (pixelmatch) em 7 larguras × 4 estados (home, dock aberta, paleta aberta, Info) |

As imagens-base (`visual/baselines/`) são do código **de onde a refatoração parte**. Qualquer mudança de pixel é uma falha, salvo as
"correções" marcadas no plano; nesse caso regrave com `--update` num commit separado e explique por que na mensagem.

## Acesso ao app pelos testes

Os testes leem `window.__colorUtil`, `window.__colorMap`, `window.Klang` e as classes `tools-open`, `info-open`, `palette-open`, `auto-on` no `<html>`.
Na Fase 2 (zero globais `window.__*`) esse acesso passa para o namespace `window.Clavier`; os testes são atualizados no mesmo commit.

## Bugs conhecidos documentados por testes

Os testes `XFAIL` apontam a fase do plano que os corrige (c, d, f, j). Quando uma correção entra, o teste vira `XPASS`: remova o `knownFailing`.
