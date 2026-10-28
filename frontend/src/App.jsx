import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments, uploadDocument } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setIsLoading(true);
    setLoadError('');
    listDocuments(controller.signal)
      .then((items) => {
        if (active) setDocuments(items);
      })
      .catch((error) => {
        if (active && error.name !== 'AbortError') setLoadError(error.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [refreshVersion]);

  async function handleUpload(file, owner) {
    const document = await uploadDocument(file, owner);
    setNotice(`${document.originalName} enviado com sucesso.`);
    setRefreshVersion((version) => version + 1);
  }

  function refreshDocuments() {
    setNotice('');
    setRefreshVersion((version) => version + 1);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>DMS<span className="brand-divider">/</span>ARQUIVO</span>
        </a>
        <div className="service-indicator">
          <span className="service-dot" aria-hidden="true" />
          <span>ARMAZENAMENTO LOCAL</span>
        </div>
      </header>

      <main id="inicio">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">DOCUMENTOS / BIBLIOTECA</p>
            <h1 id="page-title">Arquivo de documentos</h1>
          </div>
          <div className="document-count" aria-live="polite">
            <strong>{documents.length.toString().padStart(2, '0')}</strong>
            <span>{documents.length === 1 ? 'documento' : 'documentos'}</span>
          </div>
        </section>

        {notice && (
          <p className="notice" role="status" aria-live="polite">{notice}</p>
        )}

        <div className="workspace">
          <aside className="upload-section" aria-labelledby="upload-title">
            <div className="section-heading">
              <span className="section-index">01</span>
              <h2 id="upload-title">Adicionar arquivo</h2>
            </div>
            <UploadComponent onUpload={handleUpload} />
          </aside>

          <section className="documents-section" aria-labelledby="documents-title">
            <div className="section-heading document-section-heading">
              <div className="section-title-group">
                <span className="section-index">02</span>
                <h2 id="documents-title">Todos os documentos</h2>
              </div>
              <button
                className="text-button"
                type="button"
                onClick={refreshDocuments}
                disabled={isLoading}
              >
                {isLoading ? 'Atualizando...' : 'Atualizar lista'}
              </button>
            </div>
            <DocumentList
              documents={documents}
              isLoading={isLoading}
              error={loadError}
              onRetry={refreshDocuments}
            />
          </section>
        </div>
      </main>

      <footer className="footer">
        <span>DOCUMENT MANAGEMENT SYSTEM</span>
        <span>METADADOS DA SESSÃO ATUAL</span>
      </footer>
    </div>
  );
}
