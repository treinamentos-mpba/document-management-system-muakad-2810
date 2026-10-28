import DownloadButton from './DownloadButton.jsx';
import { formatFileSize } from '../utils/formatFileSize.js';

function formatUploadDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function DocumentList({ documents, isLoading, error, onRetry }) {
  if (error && documents.length === 0) {
    return (
      <div className="list-state list-error" role="alert">
        <p>{error}</p>
        <button className="text-button" type="button" onClick={onRetry}>Tentar novamente</button>
      </div>
    );
  }

  if (isLoading && documents.length === 0) {
    return <p className="list-state" role="status">Carregando documentos...</p>;
  }

  if (!isLoading && documents.length === 0) {
    return (
      <div className="list-state empty-state">
        <span className="empty-mark" aria-hidden="true">—</span>
        <p>Nenhum documento no arquivo.</p>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      {error && <p className="inline-error" role="alert">{error}</p>}
      <table className="document-table">
        <thead>
          <tr>
            <th scope="col">NOME</th>
            <th scope="col">PROPRIETÁRIO</th>
            <th scope="col">TAMANHO</th>
            <th scope="col">ENVIADO EM</th>
            <th scope="col"><span className="visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td>
                <span className="document-name">{document.originalName}</span>
                <span className="document-type">{document.mimeType}</span>
              </td>
              <td>{document.owner}</td>
              <td className="numeric-cell">{formatFileSize(document.size)}</td>
              <td>{formatUploadDate(document.uploadedAt)}</td>
              <td className="action-cell"><DownloadButton document={document} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}