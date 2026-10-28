const API_PREFIX = '/api';
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

async function getError(response) {
  try {
    const body = await response.json();
    return body.error?.message || 'Não foi possível concluir a solicitação.';
  } catch {
    return 'Não foi possível concluir a solicitação.';
  }
}

async function ensureSuccess(response) {
  if (!response.ok) {
    const message = await getError(response);
    throw new Error(message);
  }
  return response;
}

export async function listDocuments(signal) {
  const response = await ensureSuccess(await fetch(`${API_PREFIX}/documents`, { signal }));
  const body = await response.json();
  return body.documents;
}

export async function uploadDocument(file, owner = '') {
  const form = new FormData();
  form.append('file', file);
  if (owner) form.append('owner', owner);

  const response = await ensureSuccess(await fetch(`${API_PREFIX}/upload`, {
    method: 'POST',
    body: form,
  }));
  const body = await response.json();
  return body.document;
}

export async function downloadDocument(id) {
  const response = await ensureSuccess(await fetch(
    `${API_PREFIX}/documents/${encodeURIComponent(id)}/download`,
  ));
  return response.blob();
}