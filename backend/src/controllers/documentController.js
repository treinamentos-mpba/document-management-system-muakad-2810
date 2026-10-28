const documentService = require('../services/documentService');

async function upload(req, res) {
  const document = await documentService.create(req.file, req.body);
  res.status(201).json({ document });
}

function list(req, res) {
  res.json({ documents: documentService.list() });
}

async function download(req, res, next) {
  const { document, filePath } = await documentService.getDownload(req.params.id);
  res.set('Cache-Control', 'no-store');
  res.download(filePath, document.originalName, {
    headers: { 'Content-Type': document.mimeType },
  }, (error) => {
    if (!error) {
      return;
    }

    if (res.headersSent) {
      res.destroy(error);
      return;
    }

    if (error.code === 'ENOENT') {
      res.status(404).json({
        error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
      });
      return;
    }

    next(error);
  });
}

module.exports = { upload, list, download };