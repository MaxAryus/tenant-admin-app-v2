import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabase';
import { QRCodeCanvas } from 'qrcode.react';
import React from 'react';
import ReactDOM from 'react-dom/client';

interface Apartment {
  id: string;
  name: string;
  object: {
    name: string;
    street: string;
    zip_code: number | null;
    company_id: string;
  };
}

interface ProgressCallback {
  (progress: { current: number; total: number; phase: 'tokens' | 'pdfs' | 'zip' }): void;
}

async function generateQRCodeDataURL(token: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary canvas element
      const tempDiv = document.createElement('div');
      document.body.appendChild(tempDiv);
      
      // Create a root for React
      const root = ReactDOM.createRoot(tempDiv);
      
      // Render QR code
      root.render(
        React.createElement(QRCodeCanvas, {
          value: token,
          size: 1000, // Large size for better quality
          level: "H",
          includeMargin: true
        })
      );
      
      // Give React time to render the canvas
      setTimeout(() => {
        try {
          const renderedCanvas = tempDiv.querySelector('canvas');
          if (!renderedCanvas) {
            document.body.removeChild(tempDiv);
            reject(new Error('Failed to generate QR code canvas'));
            return;
          }
          
          // Get data URL from canvas
          const dataURL = renderedCanvas.toDataURL('image/png');
          
          // Clean up
          root.unmount();
          document.body.removeChild(tempDiv);
          
          resolve(dataURL);
        } catch (err) {
          document.body.removeChild(tempDiv);
          reject(err);
        }
      }, 100); // Short timeout to ensure rendering is complete
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateTokenPDF(token: string, apartment: Apartment, multiple = false): Promise<Uint8Array | null> {
  // Create a new PDF instance - use A4 format with portrait orientation
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Calculate page dimensions
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20; // margin in mm
  const contentWidth = pageWidth - (2 * margin);
  
  // Start y position
  let y = 20;
  
  // Add content
  pdf.setFontSize(16);
  const title = 'Sehr geehrte Eigentümer:Innen, sehr geehrte Bewohner!';
  pdf.text(title, margin, y);
  
  y += 10;
  
  pdf.setFontSize(11); // Slightly smaller font for more compact layout
  const text = [
    'Wie bereits im Zuge der letzten Eigentümerversammlung angekündigt, dürfen wir Sie nun',
    'herzlich einladen, mit Ihrem individuellen Zugang die neue Bewohner-App zu nutzen.',
    'An 365 Tagen rund um die Uhr geöffnet - wir bieten Ihnen diesen exklusiven Service',
    'mit unserer neuen digitalen APP-Lösung an.',
    '',
    'Diese App bietet für Sie wesentliche Vorteile in der Übersicht und der Kommunikation mit',
    'der Hausverwaltung. Wichtige Informationen erhalten Sie tagesaktuell, Schadenmeldungen',
    'können Sie über die App jederzeit an uns melden und zusätzlich können Sie unterwegs auf',
    'die wichtigsten Kontakte im Notfall zugreifen.',
    '',
    'Haben Sie die Wohnung vermietet, oder besitzen mehrere Wohnungen, bietet die App auch',
    'den Vorteil, dass Sie Ihre Wohnungen in Ihrem persönlichen Portal koppeln können, der',
    'jeweilige Mieter wird nur für die gewünschte Wohnung freigeschaltet.',
    '',
    'Wir halten ausdrücklich fest, dass für dieses Tool der Eigentümergemeinschaft keinerlei',
    'Kosten anfallen. Die Kosten, sowohl für die Entwicklung als auch für den laufenden',
    'Betrieb, werden durch die Hausverwaltung finanziert.',
  ];

  text.forEach(line => {
    pdf.text(line, margin, y);
    y += 6; // Reduced line height for more compact layout
  });
  
  // Add registration instructions - with slightly more space before
  y += 2;
  pdf.setFontSize(12);
  pdf.text('Anleitung zur Registrierung:', margin, y);
  y += 8;
  
  pdf.setFontSize(11);
  const instructions = [
    '1. Laden Sie die App aus dem App-Store herunter',
    '2. Registrieren Sie sich mit Ihren Daten',
    '3. Geben Sie den Einladungscode ein',
    '4. Bitte akzeptieren Sie bei der Registrierung die Datenschutzverordnung und erlauben',
    '   Sie Push-Nachrichten, damit Sie keine individuellen und wichtigen Informationen',
    '   verpassen!',
  ];
  
  instructions.forEach(line => {
    pdf.text(line, margin, y);
    y += 6;
  });
  
  y += 4;
  
  // Add apartment-specific information
  pdf.text([
    `Objekt: ${apartment.object.name}`,
    `Wohnung: ${apartment.name}`,
    `Adresse: ${apartment.object.street}${apartment.object.zip_code ? `, ${apartment.object.zip_code}` : ''}`,
  ], margin, y);
  
  y += 20;
  
  // Define token box dimensions
  const tokenBoxHeight = 40;
  const leftColumnWidth = 100; // Width for token box
  const spacing = 10; // Spacing between token box and QR code
  
  // Create layout for token and QR code side by side
  const tokenBoxX = margin;
  const tokenBoxY = y;
  
  // Draw the box with rounded corners
  pdf.setDrawColor(229, 231, 235); // gray-200
  pdf.setFillColor(249, 250, 251); // gray-50
  pdf.roundedRect(tokenBoxX, tokenBoxY, leftColumnWidth, tokenBoxHeight, 3, 3, 'FD');
  
  // Calculate vertical centering for text in box
  // Font heights for label and token (approximate)
  const labelFontHeight = 3.5; // in mm, for 12pt font
  const tokenFontHeight = 3.5; // in mm, for 12pt font
  const textTotalHeight = labelFontHeight + tokenFontHeight + 5; // 5mm spacing between label and token
  
  // Calculate vertical positions for centered text
  const verticalPadding = (tokenBoxHeight - textTotalHeight) / 2;
  const labelY = tokenBoxY + verticalPadding + labelFontHeight;
  const tokenY = labelY + 5 + tokenFontHeight; // 5mm spacing after label
  
  // Define horizontal position (30px = ~10mm to the left compared to previous version)
  // Standard padding was 10mm, now we'll use 20mm from the left edge of the box
  const textX = tokenBoxX + 4;
  
  // Add "Einladungscode:" label
  pdf.setFontSize(12);
  pdf.setTextColor(107, 114, 128); // gray-500
  pdf.text('Einladungscode:', textX, labelY);
  
  // Add the token in monospace font and larger size
  pdf.setFontSize(12); // Slightly smaller font for token to ensure it fits
  pdf.setTextColor(17, 24, 39); // gray-900
  pdf.setFont('courier', 'normal');
  pdf.text(token, textX, tokenY);
  
  // Reset font settings
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  
  // Add QR code to the right of the token box
  try {
    const qrCodeImageUrl = await generateQRCodeDataURL(token);
    const qrCodeX = margin + leftColumnWidth + spacing;
    const qrCodeY = tokenBoxY;
    const qrCodeSize = tokenBoxHeight; // Make QR code exactly the same height as token box
    
    pdf.addImage(qrCodeImageUrl, 'PNG', qrCodeX, qrCodeY, qrCodeSize, qrCodeSize);
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Continue without QR code if there's an error
  }
  
  // Add footer text below both token box and QR code
  y += tokenBoxHeight + 15;
  
  pdf.text([
    'Sollten Sie weitere Unterstützungen oder Informationen benötigen - wir helfen Ihnen',
    'gerne!',
    '',
    'Ihr Hausverwaltungsteam'
  ], margin, y);
  
  if (!multiple) {
    pdf.save(`Registrierung_${apartment.object.name}_${apartment.name}.pdf`);
    return null;
  }
  
  return pdf.output('arraybuffer');
}

// Process tokens in parallel with a limit
async function processTokens(
  tokens: Array<{ token: string; apartment: Apartment }>,
  onProgress?: ProgressCallback
) {
  const CONCURRENT_LIMIT = 3;
  const results: (Uint8Array | null)[] = new Array(tokens.length);
  
  for (let i = 0; i < tokens.length; i += CONCURRENT_LIMIT) {
    const batch = tokens.slice(i, i + CONCURRENT_LIMIT);
    const batchResults = await Promise.all(
      batch.map(({ token, apartment }) => generateTokenPDF(token, apartment, true))
    );
    results.splice(i, batchResults.length, ...batchResults);
    
    if (onProgress) {
      onProgress({
        current: Math.min(i + CONCURRENT_LIMIT, tokens.length),
        total: tokens.length,
        phase: 'pdfs'
      });
    }
  }
  
  return results;
}

export async function downloadAllTokens(objectId: string, onProgress?: ProgressCallback) {
  try {
    const { data: apartments, error: apartmentsError } = await supabase
      .from('apartments')
      .select(`
        id,
        name,
        object:objects!inner (
          id,
          name,
          street,
          zip_code,
          company_id
        )
      `)
      .eq('object_id', objectId);

    if (apartmentsError) throw apartmentsError;
    if (!apartments || apartments.length === 0) {
      throw new Error('Keine Wohnungen gefunden');
    }

    // Create tokens for all apartments
    const tokens = [];
    for (let i = 0; i < apartments.length; i++) {
      const apartment = apartments[i];
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
              apartmentId: apartment.id,
              companyId: apartment.object.company_id,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to create invitation');
        }

        const data = await response.json();
        tokens.push({
          token: data.token,
          apartment
        });
      } catch (error) {
        console.error(`Error creating token for apartment ${apartment.name}:`, error);
        // We'll continue with other apartments even if one fails
        continue;
      }

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: apartments.length,
          phase: 'tokens'
        });
      }
    }

    if (tokens.length === 0) {
      throw new Error('Keine Tokens konnten generiert werden');
    }

    // Process all tokens
    const pdfs = await processTokens(tokens, onProgress);

    // Create ZIP file
    const zip = new JSZip();
    tokens.forEach(({ apartment }, index) => {
      const pdfData = pdfs[index];
      if (pdfData) {
        const filename = `Registrierung_${apartment.object.name}_${apartment.name}.pdf`;
        zip.file(filename, pdfData);
      }
    });

    if (onProgress) {
      onProgress({
        current: 0,
        total: 100,
        phase: 'zip'
      });
    }

    // Generate ZIP and trigger download
    const zipContent = await zip.generateAsync({ 
      type: 'blob',
      onUpdate: (metadata) => {
        if (onProgress) {
          onProgress({
            current: metadata.percent,
            total: 100,
            phase: 'zip'
          });
        }
      }
    });

    const url = URL.createObjectURL(zipContent);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Registrierungscodes_${apartments[0].object.name}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error: any) {
    console.error('Error downloading tokens:', error);
    throw error;
  }
}