const fs = require('node:fs');
const path = require('node:path');
const storageDirectory = require('../config/storage');

function getPath(storageFilename) {
  if (!storageFilename || path.basename(storageFilename) !== storageFilename) {
    throw new Error('Nome de armazenamento inválido.');
  }

  const filePath = path.resolve(storageDirectory, storageFilename);
  if (!filePath.startsWith(`${storageDirectory}${path.sep}`)) {
    throw new Error('Caminho de armazenamento inválido.');
  }

  return filePath;
}

async function exists(storageFilename) {
  try {
    await fs.promises.access(getPath(storageFilename), fs.constants.R_OK);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function remove(storageFilename) {
  try {
    await fs.promises.unlink(getPath(storageFilename));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

module.exports = { storageDirectory, getPath, exists, remove };