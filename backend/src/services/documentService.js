const { randomUUID } = require('node:crypto');
const AppError = require('../errors/AppError');
const documentRepository = require('../repositories/documentRepository');
const localFileRepository = require('../repositories/localFileRepository');

function normalizeOwner(owner) {
  if (owner === undefined || owner === null || owner === '') {
    return 'anonymous';
  }

  if (typeof owner !== 'string' || /[\u0000-\u001f\u007f]/.test(owner)) {
    throw new AppError(400, 'INVALID_OWNER', 'O campo owner é inválido.');
  }

  const normalizedOwner = owner.trim();
  if (normalizedOwner.length > 100) {
    throw new AppError(400, 'INVALID_OWNER', 'O campo owner deve ter no máximo 100 caracteres.');
  }

  return normalizedOwner || 'anonymous';
}

function normalizeOriginalName(originalName) {
  const safeName = String(originalName || '')
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();

  return safeName || 'document';
}

async function create(file, fields = {}) {
  if (!file) {
    throw new AppError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.');
  }

  try {
    if (Object.keys(fields).some((fieldName) => fieldName !== 'owner')) {
      throw new AppError(400, 'INVALID_UPLOAD', 'Os campos do upload são inválidos.');
    }

    if (file.size === 0) {
      throw new AppError(400, 'FILE_EMPTY', 'O arquivo enviado está vazio.');
    }

    const document = {
      id: randomUUID(),
      originalName: normalizeOriginalName(file.originalname),
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner: normalizeOwner(fields.owner),
      mimeType: file.mimetype,
      storageFilename: file.filename,
    };

    return documentRepository.save(document);
  } catch (error) {
    await localFileRepository.remove(file.filename).catch(() => {});
    throw error;
  }
}

function list() {
  return documentRepository.list();
}

async function getDownload(id) {
  const document = documentRepository.findById(id);
  if (!document || !(await localFileRepository.exists(document.storageFilename))) {
    throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  return {
    document: {
      id: document.id,
      originalName: document.originalName,
      size: document.size,
      uploadedAt: document.uploadedAt,
      owner: document.owner,
      mimeType: document.mimeType,
    },
    filePath: localFileRepository.getPath(document.storageFilename),
  };
}

module.exports = { create, list, getDownload };