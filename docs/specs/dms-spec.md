# Especificação - Document Management System

## 1. Objetivo

Permitir que usuários enviem, consultem e baixem documentos armazenados no filesystem local da aplicação, com metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Envio de um documento por requisição.
- Listagem dos documentos recebidos pelo processo atual do backend.
- Download de um documento pelo identificador.
- Atribuição opcional de um rótulo de proprietário (`owner`), sem autenticação ou controle de acesso nesta fase.
- Armazenamento dos arquivos exclusivamente em `backend/storage`, usando Multer com `diskStorage`.
- Metadados mantidos em memória durante a execução do backend.

### Fora do escopo

- Armazenamento externo ou em nuvem.
- Banco de dados ou persistência durável de metadados.
- Autenticação, autorização ou isolamento de documentos por usuário.
- Exclusão, versionamento, busca, paginação ou upload de múltiplos arquivos.
- Antivírus, conversão, edição ou pré-visualização de documentos.

> Os endpoints de upload, listagem e download são o comportamento-alvo desta especificação; não são considerados implementados no seed atual. O endpoint `GET /health` existente é apenas de infraestrutura.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O sistema deve aceitar um arquivo no campo multipart `file` em cada requisição de upload. |
| RF-02 | O sistema deve rejeitar upload sem arquivo, arquivo vazio, tipo não permitido ou tamanho superior a 10 MiB, retornando um erro documentado. |
| RF-03 | O sistema deve gravar cada arquivo aceito em `backend/storage` usando Multer `diskStorage` e um nome interno gerado pelo sistema, sem sobrescrever arquivos existentes. |
| RF-04 | O sistema deve gerar um identificador único para cada documento e registrar seus metadados em memória após o arquivo ser gravado com sucesso. |
| RF-05 | O sistema deve aceitar `owner` opcional como campo de texto do multipart. Deve remover espaços nas extremidades, usar `anonymous` se ausente ou vazio e rejeitar valor com mais de 100 caracteres ou caracteres de controle. Esse valor é apenas descritivo e não identifica uma sessão autenticada. |
| RF-06 | O sistema deve listar todos os documentos registrados na memória do processo, do mais recente para o mais antigo. A listagem não deve expor caminhos nem nomes internos do filesystem. |
| RF-07 | O sistema deve permitir o download pelo `id`, retornando o conteúdo binário e o nome original seguro no cabeçalho `Content-Disposition`. |
| RF-08 | O sistema deve retornar `404` para identificador inexistente ou cujo arquivo não esteja disponível. |
| RF-09 | Se uma falha ocorrer após a criação do arquivo, o sistema deve remover o arquivo parcial ou órfão e não registrar metadados incompletos. |
| RF-10 | O endpoint `GET /health` deve continuar respondendo com o estado de saúde do backend. |

### Tipos de arquivo aceitos

O upload deve permitir apenas os pares de extensão e tipo MIME declarados abaixo. A extensão deve ser comparada sem distinção entre maiúsculas e minúsculas e deve corresponder ao MIME declarado pelo cliente. Essa validação de entrada não é uma verificação antivírus nem uma garantia de que o conteúdo seja seguro; varredura de malware está fora do escopo.

| Extensão | Tipo MIME esperado |
| --- | --- |
| `.pdf` | `application/pdf` |
| `.png` | `image/png` |
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.txt` | `text/plain` |
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | O armazenamento binário deve permanecer local em `backend/storage`, implementado com Multer `diskStorage`. Não devem ser usados provedores externos. |
| RNF-02 | Metadados devem permanecer em memória nesta fase. Reiniciar o processo perde o catálogo; arquivos físicos já gravados podem permanecer sem metadados e não devem ser reindexados automaticamente. |
| RNF-03 | O backend deve ler a porta HTTP da variável de ambiente `PORT`, usando o valor padrão definido pelo projeto quando ela não estiver configurada. |
| RNF-04 | O backend deve limitar o tamanho de cada arquivo a 10 MiB (10.485.760 bytes) e processar apenas um arquivo por requisição. |
| RNF-05 | O nome original do arquivo não deve ser usado como caminho de gravação. O nome interno deve ser gerado pelo sistema e o caminho deve permanecer dentro de `backend/storage`. |
| RNF-06 | Respostas de erro não devem revelar stack traces, caminhos absolutos ou detalhes internos do filesystem. |
| RNF-07 | Datas devem usar ISO 8601 em UTC; endpoints JSON devem responder com `Content-Type: application/json; charset=utf-8`. |
| RNF-08 | O backend deve seguir a separação `routes -> controllers -> services -> repositories`, sem dependências de camadas internas em direção às externas. O backend usa CommonJS e JavaScript. |
| RNF-09 | O frontend deve consumir a API por `fetch` sob o prefixo `/api`, conforme o proxy do Vite, e usar componentes funcionais React. |

## 5. Modelo de dados (metadados do documento)

### Metadados públicos

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | sim | Identificador único, gerado pelo backend (UUID v4). |
| `originalName` | string | sim | Nome original fornecido no upload, tratado como texto e nunca como caminho. |
| `size` | number | sim | Tamanho do arquivo em bytes, validado como maior que zero e no máximo 10.485.760. |
| `uploadedAt` | string | sim | Instante em que o upload foi concluído, em ISO 8601 UTC. |
| `owner` | string | sim | Rótulo opcional recebido no multipart; valor padrão `anonymous`. Não representa identidade autenticada. |
| `mimeType` | string | sim | Tipo MIME aceito e associado ao arquivo; incluído nas respostas JSON. |

### Dados internos de armazenamento

O repositório mantém também um nome de armazenamento gerado e seguro, associado ao documento. O caminho absoluto pode ser derivado do diretório `backend/storage` e desse nome. Esses dados são internos: não devem aparecer em respostas da API nem ser derivados diretamente da entrada do usuário.

Os metadados públicos e internos são voláteis e existem apenas enquanto o processo do backend estiver ativo. A perda do catálogo após reinício é comportamento esperado nesta fase, não uma garantia de persistência.

## 6. Contratos de API

### Convenções

- As rotas abaixo são relativas à API do backend. No frontend, o proxy do Vite usa o prefixo `/api`; por exemplo, `fetch('/api/documents')` é encaminhado à rota backend `GET /documents`.
- JSON de erro usa o formato `{"error":{"code":"ERROR_CODE","message":"Descrição legível."}}`.
- O backend não aplica autenticação nesta fase. `owner` é apenas um rótulo, e `GET /documents` retorna todos os documentos em memória.

### `POST /upload`

- **Content-Type:** `multipart/form-data`
- **Campos:** `file` (obrigatório, um arquivo); `owner` (opcional, texto).
- **Sucesso:** `201 Created`, `Content-Type: application/json; charset=utf-8`.
- **Corpo de sucesso:**

```json
{
  "document": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "uploadedAt": "2026-10-28T15:30:00.000Z",
    "owner": "anonymous",
    "mimeType": "application/pdf"
  }
}
```

- **Erros:** `400` (`FILE_REQUIRED`, `FILE_EMPTY` ou `INVALID_OWNER`); `413` (`FILE_TOO_LARGE`); `415` (`UNSUPPORTED_FILE_TYPE`); `500` (`INTERNAL_ERROR`).
- Arquivos devem ser descartados se a validação ou o registro dos metadados falhar. Nenhum caminho interno deve ser retornado.

### `GET /documents`

- **Entrada:** sem parâmetros ou corpo.
- **Sucesso:** `200 OK`, `Content-Type: application/json; charset=utf-8`.
- **Corpo de sucesso:** lista ordenada por `uploadedAt` decrescente; se houver empate, a ordem deve ser determinística.

```json
{
  "documents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-10-28T15:30:00.000Z",
      "owner": "anonymous",
      "mimeType": "application/pdf"
    }
  ]
}
```

- Sem documentos, deve retornar `200 OK` com `{"documents":[]}`.
- **Erro:** `500` (`INTERNAL_ERROR`).

### `GET /documents/:id/download`

- **Entrada:** `id` na URL.
- **Sucesso:** `200 OK`, corpo binário, `Content-Type` correspondente ao MIME do documento e `Content-Disposition: attachment` com o nome original codificado de forma segura conforme RFC 5987.
- `Content-Length` deve refletir o tamanho do arquivo quando disponível. O nome original deve ser sanitizado para impedir injeção de cabeçalhos; nunca deve ser interpretado como caminho.
- **Erros:** `404` (`DOCUMENT_NOT_FOUND`) quando o ID não existir ou o arquivo não estiver disponível; `500` (`INTERNAL_ERROR`) para falha inesperada de leitura.

### `GET /health` (infraestrutura existente)

- **Sucesso:** `200 OK`, `Content-Type: application/json; charset=utf-8`.
- **Corpo:** `{"status":"ok"}`.
- Este endpoint não substitui verificações de disponibilidade do armazenamento nem faz parte dos fluxos de documentos.

## 7. Decisões arquiteturais

- **Rotas (`routes/`):** declaram os caminhos e encaminham as requisições aos controllers.
- **Controllers (`controllers/`):** validam a forma básica da entrada HTTP e traduzem resultado/erro para status, cabeçalhos e corpos HTTP.
- **Services (`services/`):** coordenam regras de negócio, validação do documento e consistência entre arquivo e metadados.
- **Repositories (`repositories/`):** encapsulam o catálogo de metadados em memória e o acesso ao arquivo local. O acesso ao filesystem deve ficar atrás dessa fronteira.
- **Upload:** Multer com `diskStorage` grava exclusivamente em `backend/storage`; nomes internos são gerados pelo servidor. Nenhum controller ou resposta expõe o caminho local.
- **Metadados:** catálogo em memória, sem banco de dados e sem reconstrução automática após reinício.
- **Frontend:** páginas e componentes React usam um serviço baseado em `fetch` para chamar `/api`; erros de rede e HTTP devem ser apresentados ao usuário em português.
- **Estado do seed:** manter o endpoint `/health` existente; implementar upload, listagem e download será trabalho futuro conforme o plano abaixo.

## 8. Plano de execução

As etapas abaixo descrevem trabalho futuro orientado por esta especificação. Nesta tarefa, o único artefato a produzir é este documento; não executar as etapas nem criar ou alterar arquivos de backend ou frontend.

1. **Preparação do backend:** definir configuração do limite de upload e do diretório permitido; configurar Multer `diskStorage` com nome interno gerado, allowlist e limite de 10 MiB. Manter a gravação restrita a `backend/storage`.
2. **Regras e catálogo:** implementar modelo/repositório em memória e serviço de documentos; assegurar geração de ID, normalização do `owner`, metadados e limpeza do arquivo em caso de falha.
3. **API:** implementar controllers e rotas para upload, listagem e download, com os contratos, status, cabeçalhos e formato de erro desta especificação. Preservar `GET /health`.
4. **Testes de backend:** cobrir sucesso e validações de upload, arquivo vazio, limite e tipo de arquivo, listagem vazia/ordenada, download, ID inexistente, falhas de filesystem e ausência de exposição do caminho interno. Usar diretório temporário de teste e limpá-lo ao final.
5. **Frontend:** criar serviço de API e interface de upload unitário, feedback de validação/erro e listagem com ação de download. Consumir a API pelo prefixo `/api` e não simular autenticação.
6. **Validação integrada:** executar testes do backend e verificações disponíveis do frontend; validar upload, listagem e download através do proxy do Vite, inclusive erros e limite de tamanho. Atualizar documentação de execução somente se necessário.

## Critérios de aceite

- A especificação cobre todas as oito seções do modelo.
- Os contratos HTTP são coerentes com os campos do modelo e não expõem dados internos de armazenamento.
- Arquivos são especificados apenas para armazenamento local via Multer; metadados são explicitamente voláteis em memória.
- O plano ordena as etapas futuras sem executá-las nesta entrega.
- Nenhum arquivo de backend ou frontend é criado ou alterado como parte desta tarefa.