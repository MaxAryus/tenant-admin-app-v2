import React, { useState, useCallback } from 'react';
import { X, Upload, FileUp, Loader2 } from 'lucide-react';
import { useCompany } from '../store/companyStore';

interface ImportModalProps {
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Bitte wählen Sie eine CSV-Datei aus');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setError(null);

    try {
      await onImport(selectedFile);
      onClose();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md m-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Upload className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              CSV-Datei importieren
            </h2>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="mx-auto w-12 h-12 mb-4 text-gray-400">
              <FileUp className="w-full h-full" />
            </div>
            
            {selectedFile ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Entfernen
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">
                  Ziehen Sie Ihre CSV-Datei hierher
                </p>
                <p className="text-xs text-gray-500">
                  oder
                </p>
                <label className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <span className="text-sm text-emerald-600 hover:text-emerald-700 cursor-pointer">
                    Durchsuchen
                  </span>
                </label>
              </div>
            )}
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleImport}
              disabled={!selectedFile || importing}
              className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Importiere...</span>
                </>
              ) : (
                <span>Importieren</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;