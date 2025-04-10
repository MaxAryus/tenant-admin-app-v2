// Using a simpler QR code implementation that doesn't require external network requests
import { QRCode } from "npm:qrcode-generator@1.4.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Generate QR code
    const qr = QRCode(0, 'L');
    qr.addData(token);
    qr.make();

    // Convert to data URL with higher resolution for better quality
    const moduleCount = qr.getModuleCount();
    const cellSize = 10; // Increased cell size for better resolution
    const margin = 4;
    const size = moduleCount * cellSize + 2 * margin;

    // Create a data URL string manually
    let dataUrl = '';
    dataUrl += `data:image/svg+xml;base64,`;
    
    // Create SVG content
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="100%" height="100%" fill="white"/>
      ${Array.from({ length: moduleCount }, (_, row) =>
        Array.from({ length: moduleCount }, (_, col) =>
          qr.isDark(row, col)
            ? `<rect x="${col * cellSize + margin}" y="${row * cellSize + margin}" width="${cellSize}" height="${cellSize}" fill="black"/>`
            : ''
        ).join('')
      ).join('')}
    </svg>`;

    // Convert SVG to base64
    const base64 = btoa(svg);
    dataUrl += base64;

    return new Response(
      JSON.stringify({ qrDataUrl: dataUrl }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('QR Generation Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});