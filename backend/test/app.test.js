const { after, before, test } = require('node:test');
const assert = require('node:assert');
const { once } = require('node:events');
const app = require('../src/app');
const documentRepository = require('../src/repositories/documentRepository');
const localFileRepository = require('../src/repositories/localFileRepository');

let server;
let baseUrl;
const createdDocumentIds = [];

before(async () => {
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await Promise.all(createdDocumentIds.map(async (id) => {
    const document = documentRepository.remove(id);
    if (document) {
      await localFileRepository.remove(document.storageFilename);
    }
  }));
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('faz upload, lista e baixa um documento', async () => {
  const form = new FormData();
  form.append('owner', '  equipe  ');
  form.append('file', new Blob(['conteudo de teste'], { type: 'text/plain' }), 'relatorio.txt');

  const uploadResponse = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
  assert.strictEqual(uploadResponse.status, 201);
  const { document } = await uploadResponse.json();
  createdDocumentIds.push(document.id);
  assert.strictEqual(document.owner, 'equipe');
  assert.strictEqual(document.originalName, 'relatorio.txt');
  assert.strictEqual(document.size, Buffer.byteLength('conteudo de teste'));
  assert.strictEqual(document.mimeType, 'text/plain');
  assert.ok(!Object.hasOwn(document, 'storageFilename'));

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(listResponse.status, 200);
  const listBody = await listResponse.json();
  assert.ok(listBody.documents.some((item) => item.id === document.id));

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
  assert.strictEqual(downloadResponse.status, 200);
  assert.match(downloadResponse.headers.get('content-disposition'), /filename=["]relatorio\.txt["]/);
  assert.strictEqual(await downloadResponse.text(), 'conteudo de teste');
});

test('rejeita tipo não permitido, owner inválido e documento inexistente', async () => {
  const invalidTypeForm = new FormData();
  invalidTypeForm.append('file', new Blob(['x'], { type: 'application/octet-stream' }), 'arquivo.bin');
  const invalidTypeResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: invalidTypeForm,
  });
  assert.strictEqual(invalidTypeResponse.status, 415);
  assert.strictEqual((await invalidTypeResponse.json()).error.code, 'UNSUPPORTED_FILE_TYPE');

  const invalidOwnerForm = new FormData();
  invalidOwnerForm.append('owner', 'x'.repeat(101));
  invalidOwnerForm.append('file', new Blob(['x'], { type: 'text/plain' }), 'arquivo.txt');
  const invalidOwnerResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: invalidOwnerForm,
  });
  assert.strictEqual(invalidOwnerResponse.status, 400);
  assert.strictEqual((await invalidOwnerResponse.json()).error.code, 'INVALID_OWNER');

  const missingResponse = await fetch(`${baseUrl}/documents/unknown/download`);
  assert.strictEqual(missingResponse.status, 404);
  assert.strictEqual((await missingResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');
});

test('rejeita campos inesperados, arquivo ausente, vazio e acima do limite', async () => {
  const unexpectedFieldForm = new FormData();
  unexpectedFieldForm.append('unexpected', 'value');
  unexpectedFieldForm.append('file', new Blob(['x'], { type: 'text/plain' }), 'arquivo.txt');
  const unexpectedFieldResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: unexpectedFieldForm,
  });
  assert.strictEqual(unexpectedFieldResponse.status, 400);
  assert.strictEqual((await unexpectedFieldResponse.json()).error.code, 'INVALID_UPLOAD');

  const missingFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: new FormData(),
  });
  assert.strictEqual(missingFileResponse.status, 400);
  assert.strictEqual((await missingFileResponse.json()).error.code, 'FILE_REQUIRED');

  const emptyFileForm = new FormData();
  emptyFileForm.append('file', new Blob([], { type: 'text/plain' }), 'vazio.txt');
  const emptyFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: emptyFileForm,
  });
  assert.strictEqual(emptyFileResponse.status, 400);
  assert.strictEqual((await emptyFileResponse.json()).error.code, 'FILE_EMPTY');

  const oversizedFileForm = new FormData();
  oversizedFileForm.append(
    'file',
    new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'text/plain' }),
    'grande.txt',
  );
  const oversizedFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: oversizedFileForm,
  });
  assert.strictEqual(oversizedFileResponse.status, 413);
  assert.strictEqual((await oversizedFileResponse.json()).error.code, 'FILE_TOO_LARGE');
});
