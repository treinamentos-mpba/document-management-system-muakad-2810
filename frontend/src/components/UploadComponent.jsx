import { useRef, useState } from 'react';
import { MAX_UPLOAD_BYTES } from '../services/documentApi.js';
import { formatFileSize } from '../utils/formatFileSize.js';

const acceptedFiles = '.pdf,.png,.jpg,.jpeg,.txt,.docx';

export default function UploadComponent({ onUpload }) {
  const formRef = useRef(null);
  const [file, setFile] = useState(null);
  const [owner, setOwner] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0] ?? null;
    setError('');

    if (selectedFile && selectedFile.size > MAX_UPLOAD_BYTES) {
      setFile(null);
      setError('O arquivo deve ter no máximo 10 MiB.');
      event.target.value = '';
      return;
    }

    if (selectedFile && selectedFile.size === 0) {
      setFile(null);
      setError('O arquivo selecionado está vazio.');
      event.target.value = '';
      return;
    }

    setFile(selectedFile);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!file) {
      setError('Selecione um arquivo para continuar.');
      return;
    }

    if (owner.trim().length > 100) {
      setError('O nome do proprietário deve ter no máximo 100 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpload(file, owner.trim());
      setFile(null);
      setOwner('');
      formRef.current?.reset();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="upload-form" ref={formRef} onSubmit={handleSubmit}>
      <label className={`file-picker${file ? ' has-file' : ''}`} htmlFor="document-file">
        <span className="picker-symbol" aria-hidden="true">+</span>
        <span className="picker-title">{file ? 'Arquivo selecionado' : 'Escolher documento'}</span>
        <span className="picker-detail">
          {file ? `${file.name} · ${formatFileSize(file.size)}` : 'PDF, PNG, JPG, TXT ou DOCX'}
        </span>
        <input
          className="visually-hidden"
          id="document-file"
          name="file"
          type="file"
          accept={acceptedFiles}
          onChange={handleFileChange}
        />
      </label>

      <label className="field-label" htmlFor="document-owner">Proprietário <span>OPCIONAL</span></label>
      <input
        className="text-input"
        id="document-owner"
        name="owner"
        type="text"
        maxLength={100}
        value={owner}
        onChange={(event) => setOwner(event.target.value)}
        placeholder="Padrão: anonymous"
      />

      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Enviando...' : 'Enviar documento'}
      </button>
      <p className="upload-limit">LIMITE POR ARQUIVO <strong>10 MiB</strong></p>
    </form>
  );
}