import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { parse } from 'npm:csv-parse@5.5.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface ImportRow {
  Objekt: string;
  Top: string;
  Nachname: string;
  Vorname: string;
  'E-Mail': string;
  Telefonnummer: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { csvContent, companyId } = await req.json();

    if (!csvContent || !companyId) {
      throw new Error('Missing required fields');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse CSV content
    const records: ImportRow[] = await new Promise((resolve, reject) => {
      const results: ImportRow[] = [];
      const parser = parse(csvContent, {
        columns: true,
        delimiter: ';',
        skip_empty_lines: true,
      });

      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          results.push(record);
        }
      });

      parser.on('error', (err) => {
        reject(err);
      });

      parser.on('end', () => {
        resolve(results);
      });

      // Write the CSV content to the parser
      parser.write(csvContent);
      parser.end();
    });

    // Group records by object
    const objectGroups = records.reduce((acc, record) => {
      if (!acc[record.Objekt]) {
        acc[record.Objekt] = [];
      }
      acc[record.Objekt].push(record);
      return acc;
    }, {} as Record<string, ImportRow[]>);

    const results = {
      objects: 0,
      apartments: 0,
      invitations: 0,
    };

    // Process each object
    for (const [objectName, records] of Object.entries(objectGroups)) {
      // Extract street and zip code from object name
      const street = objectName.replace(/\s*\d+$/, '').trim();
      const zipMatch = objectName.match(/\d+$/);
      const zipCode = zipMatch ? parseInt(zipMatch[0]) : null;

      // Create or get object
      const { data: objectData, error: objectError } = await supabase
        .from('objects')
        .upsert({
          name: objectName,
          street: street,
          zip_code: zipCode,
          company_id: companyId,
        })
        .select()
        .single();

      if (objectError) throw objectError;
      results.objects++;

      // Process apartments for this object
      for (const record of records) {
        if (!record.Top) continue;

        // Create apartment
        const { data: apartmentData, error: apartmentError } = await supabase
          .from('apartments')
          .upsert({
            name: record.Top,
            object_id: objectData.id,
          })
          .select()
          .single();

        if (apartmentError) throw apartmentError;
        results.apartments++;

        // Create invitation token
        const { error: invitationError } = await supabase
          .from('invitation_tokens')
          .insert({
            company_id: companyId,
            apartment_id: apartmentData.id,
          });

        if (invitationError) throw invitationError;
        results.invitations++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        status: 400,
      }
    );
  }
});