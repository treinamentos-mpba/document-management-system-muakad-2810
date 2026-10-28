const express = require('express');
const multer = require('multer');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const AppError = require('../errors/AppError');
const documentController = require('../controllers/documentController');
const storageDirectory = require('../config/storage');

const router = express.Router();
const allowedTypes = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.txt': 'text/plain',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, storageDirectory),
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

const uploadFile = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 1,
    fieldSize: 400,
    parts: 3,
  },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedTypes[extension] !== file.mimetype) {
      callback(new AppError(415, 'UNSUPPORTED_FILE_TYPE', 'Tipo de arquivo não permitido.'));
      return;
    }

    callback(null, true);
  },
}).single('file');

router.post('/upload', uploadFile, documentController.upload);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', documentController.download);

module.exports = router;