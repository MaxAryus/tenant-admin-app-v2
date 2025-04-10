import React, { useRef } from 'react';
import { 
  X, 
  Building2, 
  Home, 
  Calendar, 
  Image as ImageIcon, 
  AlertCircle, 
  CheckCircle2,
  Download,
  FileText,
  Loader2
} from 'lucide-react';
import { Ticket, useTickets } from '../store/ticketStore';
import { supabase } from '../lib/supabase';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface TicketModalProps {
  ticket: Ticket;
  onClose: () => void;
}

const TicketModal: React.FC<TicketModalProps> = ({ ticket, onClose }) => {
  const [imageUrls, setImageUrls] = React.useState<Record<string, string>>({});
  const [imageLoadingStates, setImageLoadingStates] = React.useState<Record<string, boolean>>({});
  const [generatingPdf, setGeneratingPdf] = React.useState(false);
  const [updatingStatus, setUpdatingStatus] = React.useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { toggleTicketStatus } = useTickets();

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleToggleStatus = async () => {
    setUpdatingStatus(true);
    try {
      await toggleTicketStatus(ticket.id);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getImageUrl = async (path: string) => {
    const cleanPath = path.replace(/^damage_reports\//, '');
    
    const { data, error } = await supabase.storage
      .from('damage_reports')
      .createSignedUrl(cleanPath, 3600);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    
    return data.signedUrl;
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const generatePDF = async () => {
    if (!contentRef.current) return;
    
    setGeneratingPdf(true);
    try {
      const content = contentRef.current;
      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      
      pdf.save(`Schadensmeldung-${ticket.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setGeneratingPdf(false);
    }
  };

  React.useEffect(() => {
    const loadImageUrls = async () => {
      if (ticket.images) {
        const initialLoadingStates = ticket.images.reduce((acc, image) => {
          acc[image.id] = true;
          return acc;
        }, {} as Record<string, boolean>);
        setImageLoadingStates(initialLoadingStates);

        const urlPromises = ticket.images.map(async (image) => {
          const url = await getImageUrl(image.file_url);
          return { id: image.id, url };
        });

        const urls = await Promise.all(urlPromises);
        const urlMap = urls.reduce((acc, { id, url }) => {
          if (url) acc[id] = url;
          return acc;
        }, {} as Record<string, string>);

        setImageUrls(urlMap);
      }
    };

    loadImageUrls();
  }, [ticket.images]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl m-4 md:my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X size={24} />
        </button>

        <div className="p-6" ref={contentRef}>
          <div className="mb-6 pt-4">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm ${
                ticket.is_open 
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {ticket.is_open ? 'Offen' : 'Geschlossen'}
              </span>
              {ticket.damage_type_info && (
                <span className="text-sm text-gray-600">
                  {ticket.damage_type_info.name}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">{ticket.subject}</h2>
          </div>

          <div className="space-y-6">
            {/* Location Information */}
            {ticket.apartment && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Standort</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 className="h-5 w-5" />
                    <span>{ticket.apartment.object.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Home className="h-5 w-5" />
                    <span>{ticket.apartment.name}</span>
                  </div>
                  <div className="pl-7 text-gray-600">
                    <p>{ticket.apartment.object.street}</p>
                    {ticket.apartment.object.zip_code && (
                      <p>{ticket.apartment.object.zip_code}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Message Content */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Beschreibung</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{ticket.message}</p>
            </div>

            {/* Images */}
            {ticket.images && ticket.images.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Bilder</h3>
                  <button
                    onClick={() => {
                      Object.entries(imageUrls).forEach(([id, url]) => {
                        const image = ticket.images?.find(img => img.id.toString() === id);
                        if (image) {
                          const filename = image.file_url.split('/').pop() || `image-${id}.jpg`;
                          downloadImage(url, filename);
                        }
                      });
                    }}
                    className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <Download size={16} />
                    Alle herunterladen
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {ticket.images.map((image) => (
                    <div 
                      key={image.id} 
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group"
                    >
                      {imageUrls[image.id] ? (
                        <>
                          <img 
                            src={imageUrls[image.id]} 
                            alt={`Schadensbild ${image.id}`}
                            className="w-full h-full object-cover"
                            onLoad={() => {
                              setImageLoadingStates(prev => ({
                                ...prev,
                                [image.id]: false
                              }));
                            }}
                            style={{ display: imageLoadingStates[image.id] ? 'none' : 'block' }}
                          />
                          {imageLoadingStates[image.id] && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const filename = image.file_url.split('/').pop() || `image-${image.id}.jpg`;
                                downloadImage(imageUrls[image.id], filename);
                              }}
                              className="text-white p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 transition-colors"
                            >
                              <Download size={20} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meta Information */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Erstellt am {new Date(ticket.created_at).toLocaleDateString('de-DE')}</span>
              </div>
              {ticket.images && (
                <div className="flex items-center gap-1">
                  <ImageIcon className="h-4 w-4" />
                  <span>{ticket.images.length} Bilder</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 rounded-b-lg border-t border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={generatePDF}
              disabled={generatingPdf}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generatingPdf ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  PDF wird erstellt...
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5" />
                  Als PDF speichern
                </>
              )}
            </button>
            <button 
              onClick={handleToggleStatus}
              disabled={updatingStatus}
              className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                ticket.is_open
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {updatingStatus ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : ticket.is_open ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Als erledigt markieren
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5" />
                  Wieder öffnen
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;