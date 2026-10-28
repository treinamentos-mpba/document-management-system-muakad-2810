const documents = new Map();

function toPublicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
    mimeType: document.mimeType,
  };
}

function save(document) {
  documents.set(document.id, document);
  return toPublicDocument(document);
}

function findById(id) {
  return documents.get(id) || null;
}

function list() {
  return [...documents.values()]
    .sort((left, right) => {
      const dateDifference = Date.parse(right.uploadedAt) - Date.parse(left.uploadedAt);
      return dateDifference || left.id.localeCompare(right.id);
    })
    .map(toPublicDocument);
}

function remove(id) {
  const document = findById(id);
  documents.delete(id);
  return document;
}

module.exports = { save, findById, list, remove };