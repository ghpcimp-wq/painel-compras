/**
 * Painel de Compras — automação Gmail → GitHub Pages
 *
 * A cada 10 minutos procura o e-mail do relatório de compras na caixa de entrada.
 * Quando encontra um e-mail novo, publica o anexo .xlsx em relatorio.xlsx
 * no repositório do painel. O site lê esse arquivo e se atualiza sozinho.
 *
 * Configuração (uma única vez):
 *  1. Preencha CFG abaixo.
 *  2. Configurações do projeto → Propriedades do script → adicione GITHUB_TOKEN.
 *  3. Execute testarConfiguracao() e depois instalarGatilho().
 */
const CFG = {
  GITHUB_OWNER: 'SEU_USUARIO',          // dono do repositório
  GITHUB_REPO: 'painel-compras',        // nome do repositório
  BRANCH: 'main',
  // Busca do Gmail que identifica o e-mail do relatório. Ajuste remetente e assunto.
  GMAIL_QUERY: 'from:remetente@empresa.com.br subject:"Relatório de Compras" has:attachment filename:xlsx newer_than:3d',
  ARQUIVO_DESTINO: 'relatorio.xlsx',
  META_DESTINO: 'meta.json'
};

function verificarRelatorio() {
  const props = PropertiesService.getScriptProperties();
  const achado = buscarUltimoAnexo_();
  if (!achado) return;                                   // nenhum e-mail do relatório
  if (achado.id === props.getProperty('ULTIMO_ID')) return; // já publicado

  const bytes = achado.anexo.getBytes();
  publicar_(CFG.ARQUIVO_DESTINO, Utilities.base64Encode(bytes),
            'Relatório de compras ' + formatar_(achado.data));
  const meta = {
    atualizadoEm: new Date().toISOString(),
    fonte: 'e-mail automático',
    arquivo: achado.anexo.getName(),
    emailRecebidoEm: achado.data.toISOString()
  };
  publicar_(CFG.META_DESTINO,
            Utilities.base64Encode(JSON.stringify(meta), Utilities.Charset.UTF_8),
            'Atualiza meta ' + formatar_(achado.data));
  props.setProperty('ULTIMO_ID', achado.id);
  console.log('Publicado: ' + achado.anexo.getName() + ' (' + bytes.length + ' bytes)');
}

/** Mensagem mais recente que casa com a busca e tem anexo .xlsx. */
function buscarUltimoAnexo_() {
  const threads = GmailApp.search(CFG.GMAIL_QUERY, 0, 10);
  let melhor = null;
  threads.forEach(function (t) {
    t.getMessages().forEach(function (m) {
      const anexos = m.getAttachments({ includeInlineImages: false })
        .filter(function (a) { return /\.xlsx?$/i.test(a.getName()); });
      if (!anexos.length) return;
      if (!melhor || m.getDate() > melhor.data) {
        melhor = { id: m.getId(), data: m.getDate(), anexo: anexos[0] };
      }
    });
  });
  return melhor;
}

/** Cria ou substitui um arquivo no repositório pela API do GitHub. */
function publicar_(caminho, conteudoBase64, mensagem) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('Propriedade GITHUB_TOKEN não configurada.');
  const url = 'https://api.github.com/repos/' + CFG.GITHUB_OWNER + '/' + CFG.GITHUB_REPO +
              '/contents/' + caminho;
  const headers = {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  let sha = null;
  const atual = UrlFetchApp.fetch(url + '?ref=' + encodeURIComponent(CFG.BRANCH),
                                  { headers: headers, muteHttpExceptions: true });
  if (atual.getResponseCode() === 200) sha = JSON.parse(atual.getContentText()).sha;
  else if (atual.getResponseCode() !== 404) {
    throw new Error('GitHub (leitura) ' + atual.getResponseCode() + ': ' + atual.getContentText());
  }
  const corpo = { message: mensagem, content: conteudoBase64, branch: CFG.BRANCH };
  if (sha) corpo.sha = sha;
  const resp = UrlFetchApp.fetch(url, {
    method: 'put', headers: headers, contentType: 'application/json',
    payload: JSON.stringify(corpo), muteHttpExceptions: true
  });
  if (resp.getResponseCode() >= 300) {
    throw new Error('GitHub (gravação) ' + resp.getResponseCode() + ': ' + resp.getContentText());
  }
}

function formatar_(d) {
  return Utilities.formatDate(d, 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
}

/** Rode uma vez: confere a busca do Gmail e o acesso ao repositório, sem publicar nada. */
function testarConfiguracao() {
  const achado = buscarUltimoAnexo_();
  console.log(achado
    ? 'E-mail encontrado: ' + achado.anexo.getName() + ' recebido em ' + formatar_(achado.data)
    : 'Nenhum e-mail encontrado com a busca: ' + CFG.GMAIL_QUERY);
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) { console.log('GITHUB_TOKEN não configurado.'); return; }
  const r = UrlFetchApp.fetch('https://api.github.com/repos/' + CFG.GITHUB_OWNER + '/' + CFG.GITHUB_REPO, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
    muteHttpExceptions: true
  });
  console.log('Acesso ao repositório: HTTP ' + r.getResponseCode() +
              (r.getResponseCode() === 200 ? ' (ok)' : ' — confira dono, nome e token'));
}

/** Rode uma vez: agenda a verificação a cada 10 minutos. */
function instalarGatilho() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'verificarRelatorio') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('verificarRelatorio').timeBased().everyMinutes(10).create();
  console.log('Gatilho instalado: verificarRelatorio a cada 10 minutos.');
}

/** Força a republicação do último e-mail (útil para testes). */
function republicarUltimo() {
  PropertiesService.getScriptProperties().deleteProperty('ULTIMO_ID');
  verificarRelatorio();
}
