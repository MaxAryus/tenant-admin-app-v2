import React, { useState } from 'react';
import { X, Copy, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../store/companyStore';
import { QRCodeCanvas } from 'qrcode.react';
import { jsPDF } from 'jspdf';

interface InviteModalProps {
  apartmentId: string;
  apartmentName: string;
  objectName: string;
  onClose: () => void;
}

const InviteModal: React.FC<InviteModalProps> = ({ apartmentId, apartmentName, objectName, onClose }) => {
  const { company } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const generateInviteLink = async () => {
    if (!company) {
      setError('Keine Firma ausgewählt');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-invitation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apartmentId,
            companyId: company.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create invitation');
      }

      setInviteToken(data.token);
    } catch (error: any) {
      console.error('Error generating invite:', error);
      setError(error.message || 'Fehler beim Erstellen der Einladung');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!inviteToken) return;

    try {
      await navigator.clipboard.writeText(inviteToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const generatePDF = async () => {
    if (!inviteToken) return;
    
    setGeneratingPdf(true);
    try {
      // Create PDF
      const pdf = new jsPDF();
      
      // Add content
      pdf.setFontSize(16);
      pdf.text('Einladung zur Bewohner-App', 20, 20);
      
      pdf.setFontSize(12);
      pdf.text([
        'Sehr geehrte Bewohner,',
        '',
        'Wir freuen uns, Sie in unserer Bewohner-App begrüßen zu dürfen!',
        '',
        `Objekt: ${objectName}`,
        `Wohnung: ${apartmentName}`,
        '',
        'Anleitung zur Registrierung:',
        '',
        '1. Scannen Sie den QR-Code oder nutzen Sie den Einladungscode',
        '2. Laden Sie die App aus dem Store herunter',
        '3. Registrieren Sie sich mit Ihren Daten',
        '4. Geben Sie den Einladungscode ein',
        '',
        'Einladungscode:',
        inviteToken
      ], 20, 40);

      // Create a temporary canvas element for the QR code
      const qrCanvas = document.createElement('canvas');
      const QRCode = (
        <QRCodeCanvas
          value={inviteToken}
          size={1000} // Large size for better quality
          level="H"
          includeMargin={true}
        />
      );

      // Render QR code to canvas
      const root = document.createElement('div');
      root.style.position = 'absolute';
      root.style.left = '-9999px';
      document.body.appendChild(root);
      
      await new Promise<void>(resolve => {
        const cleanup = () => {
          document.body.removeChild(root);
          resolve();
        };
        
        const ReactDOM = require('react-dom');
        ReactDOM.render(QRCode, root, () => {
          const canvas = root.querySelector('canvas');
          if (canvas) {
            // Add QR code to PDF
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 70, 160, 70, 70);
          }
          cleanup();
        });
      });

      // Save the PDF
      pdf.save(`Einladung_${objectName}_${apartmentName}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Fehler beim Erstellen des PDFs');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="min-h-screen py-8 px-4 flex items-center justify-center w-full">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>

          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Einladung erstellen
            </h2>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  Erstellen Sie einen Einladungslink für:
                </p>
                <p className="font-medium text-gray-900 mt-1">
                  {objectName} - {apartmentName}
                </p>
              </div>

              {!inviteToken ? (
                <button
                  onClick={generateInviteLink}
                  disabled={loading}
                  className="w-full py-2 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Wird erstellt...</span>
                    </>
                  ) : (
                    <span>Einladungslink erstellen</span>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3 pr-12 relative">
                    <p className="text-sm text-gray-600 break-all font-mono">{inviteToken}</p>
                    <button
                      onClick={copyToClipboard}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {copied ? (
                        <Check className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {inviteToken && (
                    <div className="bg-gray-50 rounded-lg p-4 flex justify-center">
                      <QRCodeCanvas
                        value={inviteToken}
                        size={200}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  )}

                  <button
                    onClick={generatePDF}
                    disabled={generatingPdf}
                    className="w-full py-2 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {generatingPdf ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>PDF wird erstellt...</span>
                      </>
                    ) : (
                      <span>Als PDF herunterladen</span>
                    )}
                  </button>

                  <p className="text-sm text-gray-500">
                    Der Code kann nur einmal verwendet werden.
                  </p>

                  <button
                    onClick={generateInviteLink}
                    className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Neuen Code erstellen
                  </button>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;