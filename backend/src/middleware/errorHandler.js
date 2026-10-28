const multer = require('multer');
const AppError = require('../errors/AppError');

function getErrorResponse(error) {
  if (error instanceof AppError) {
    return { status: error.status, code: error.code, message: error.message };
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return { status: 413, code: 'FILE_TOO_LARGE', message: 'O arquivo excede o limite de 10 MiB.' };
    }

    if (error.code === 'LIMIT_FIELD_VALUE') {
      return { status: 400, code: 'INVALID_OWNER', message: 'O campo owner deve ter no máximo 100 caracteres.' };
    }

    return { status: 400, code: 'INVALID_UPLOAD', message: 'Os campos do upload são inválidos.' };
  }

  return { status: 500, code: 'INTERNAL_ERROR', message: 'Ocorreu um erro interno.' };
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const response = getErrorResponse(error);
  res.status(response.status).json({
    error: { code: response.code, message: response.message },
  });
}

module.exports = errorHandler;