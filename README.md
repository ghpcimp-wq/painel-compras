# Painel de Compras

Painel estático (GitHub Pages) com indicadores de compras. A base é o arquivo
`data/relatorio.xlsx`; sempre que ele muda, o site se atualiza sozinho (a página
aberta confere a cada 5 minutos).

```
index.html                 aplicação
vendor/xlsx.full.min.js    leitor de planilhas (SheetJS 0.18.5)
data/relatorio.xlsx        relatório de compras mais recente
data/meta.json             data da última atualização
apps-script/Code.gs        automação Gmail → GitHub (não é usada pelo site)
```

## 1. Publicar no GitHub Pages

1. Crie um repositório (ex.: `painel-compras`) e envie todo o conteúdo desta pasta
   para a branch `main` (pelo site: **Add file → Upload files**; inclua o arquivo `.nojekyll`).
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   branch `main`, pasta `/ (root)`.
3. Em 1 a 2 minutos o painel abre em `https://SEU_USUARIO.github.io/painel-compras/`.

Atenção: o site e os dados ficam públicos para quem tiver o link.

## 2. Atualização automática pelo e-mail (Gmail)

A automação roda na sua conta Google (Google Apps Script), não no site.

1. **Token do GitHub** — github.com → Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → Generate new token.
   - Repository access: *Only select repositories* → o repositório do painel.
   - Permissions → Repository permissions → **Contents: Read and write**.
   - Copie o token (começa com `github_pat_`). Nunca o coloque no repositório.
2. **Script** — acesse script.google.com com a conta que recebe o relatório →
   Novo projeto → cole o conteúdo de `apps-script/Code.gs`.
3. Preencha `CFG`: `GITHUB_OWNER`, `GITHUB_REPO` e `GMAIL_QUERY` (remetente e assunto
   do e-mail; teste a mesma busca na caixa de pesquisa do Gmail).
4. **Configurações do projeto → Propriedades do script** → adicione
   `GITHUB_TOKEN` com o token do passo 1.
5. Execute `testarConfiguracao` (autorize o acesso ao Gmail quando solicitado) e
   confira o log: deve encontrar o e-mail e responder `HTTP 200 (ok)`.
6. Execute `instalarGatilho`. A partir daí o script verifica a caixa a cada 10 minutos.

Na primeira autorização o Google mostra o aviso "app não verificado" porque o script
é seu: Avançado → Acessar o projeto.

## Formato esperado do relatório

Primeira aba, com as colunas: EMPRESA, TIPO DE OPERAÇÃO, CÓDIGO PRODUTO,
REFERÊNCIA PRODUTO, QTD. COMPRADA, PREÇO UNITÁRIO, PREÇO TOTAL, NRO. NOTA,
DATA DA COMPRA (dd/mm/aaaa hh:mm:ss), CÓDIGO DO FORNECEDOR, CÓDIGO DO COMPRADOR (A).
Cada relatório substitui a base anterior por completo.
