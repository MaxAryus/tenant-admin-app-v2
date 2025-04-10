import React, { useState, useEffect } from 'react';
import { X, Search, Building2, Download, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../store/companyStore';
import { downloadAllTokens } from '../services/tokenService';

interface Object {
  id: string;
  name: string;
}

interface DownloadCodesModalProps {
  onClose: () => void;
}

interface ProgressState {
  current: number;
  total: number;
  phase: 'tokens' | 'pdfs' | 'zip';
}

const DownloadCodesModal: React.FC<DownloadCodesModalProps> = ({ onClose }) => {
  const { company } = useCompany();
  const [objects, setObjects] = useState<Object[]>([]);
  const [selectedObjectIds, setSelectedObjectIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);

  useEffect(() => {
    fetchObjects();
  }, []);

  const fetchObjects = async () => {
    try {
      if (!company) return;

      const { data, error } = await supabase
        .from('objects')
        .select('id, name')
        .eq('company_id', company.id)
        .order('name');

      if (error) throw error;
      setObjects(data || []);
    } catch (error: any) {
      console.error('Error fetching objects:', error);
      setError('Fehler beim Laden der Objekte');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !downloading) {
      onClose();
    }
  };

  const toggleObjectSelection = (objectId: string) => {
    const newSelection = new Set(selectedObjectIds);
    if (newSelection.has(objectId)) {
      newSelection.delete(objectId);
    } else {
      newSelection.add(objectId);
    }
    setSelectedObjectIds(newSelection);
  };

  const getProgressText = (progress: ProgressState) => {
    switch (progress.phase) {
      case 'tokens':
        return 'Erstelle Einladungscodes...';
      case 'pdfs':
        return 'Generiere PDFs...';
      case 'zip':
        return 'Erstelle ZIP-Datei...';
      default:
        return 'Wird verarbeitet...';
    }
  };

  const handleDownload = async () => {
    if (selectedObjectIds.size === 0) {
      setError('Bitte wählen Sie mindestens ein Objekt aus');
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      // Download codes for each selected object
      for (const objectId of selectedObjectIds) {
        await downloadAllTokens(objectId, (progress) => {
          setProgress(progress);
        });
      }
      onClose();
    } catch (error: any) {
      console.error('Error downloading codes:', error);
      setError(error.message || 'Fehler beim Herunterladen der Codes');
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  };

  const filteredObjects = searchTerm.length >= 2
    ? objects.filter(obj => 
        obj.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : objects;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md m-4">
        {!downloading && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        )}

        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Download className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Einladungscodes herunterladen
            </h2>
          </div>

          {downloading && progress ? (
            <div className="space-y-4">
              <div className="text-center text-gray-600">
                {getProgressText(progress)}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
              <div className="text-center text-sm text-gray-500">
                {progress.current} von {progress.total}
                {progress.phase === 'zip' ? '%' : ''}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Objekte suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-200">
                {filteredObjects.map((object) => (
                  <label
                    key={object.id}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedObjectIds.has(object.id)}
                      onChange={() => toggleObjectSelection(object.id)}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                    />
                    <div className="ml-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-900">{object.name}</span>
                    </div>
                  </label>
                ))}
                {filteredObjects.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    Keine Objekte gefunden
                  </div>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  disabled={downloading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDownload}
                  disabled={downloading || selectedObjectIds.size === 0}
                  className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Wird heruntergeladen...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      <span>Herunterladen</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DownloadCodesModal;