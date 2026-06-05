/**
 * VaultSpark Studios — Edge Function: upload-investor-doc
 *
 * Accepts multipart/form-data with a file + metadata.
 * Validates the caller is the vaultspark admin, uploads to the
 * 'investor-docs' private storage bucket, then inserts a row
 * into investor_documents.
 *
 * Deploy: supabase functions deploy upload-investor-doc
 *
 * Required env vars (set in Supabase Dashboard → Edge Functions → Secrets):
 *   SUPABASE_URL         — project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service-role key (never in browser)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  'https://vaultsparkstudios.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    // 1. Verify caller JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Verify the user JWT (anon client to decode the token)
    const sbAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } }
      }
    );

    const { data: { user }, error: userErr } = await sbAnon.auth.getUser();
    if (userErr || !user) return json({ error: 'Invalid token' }, 401);

    // 2. Confirm caller is vaultspark admin
    const { data: member } = await sb
      .from('vault_members')
      .select('username_lower')
      .eq('id', user.id)
      .maybeSingle();

    if (member?.username_lower !== 'vaultspark') {
      return json({ error: 'Unauthorized' }, 403);
    }

    // 3. Parse multipart form
    const formData = await req.formData();

    const file            = formData.get('file') as File | null;
    const title           = String(formData.get('title') || '').trim();
    const description     = String(formData.get('description') || '').trim() || null;
    const documentType    = String(formData.get('document_type') || 'general');
    const visibilityScope = String(formData.get('visibility_scope') || 'all_investors');
    const perInvestorId   = String(formData.get('per_investor_id') || '').trim() || null;
    const version         = String(formData.get('version') || '').trim() || null;

    if (!file || !title) {
      return json({ error: 'file and title are required' }, 400);
    }

    // 4. Build storage path
    const ext  = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 60);
    const ts   = Date.now();

    const storagePath = perInvestorId
      ? `per-investor/${perInvestorId}/${slug}-${ts}.${ext}`
      : `shared/${documentType}/${slug}-${ts}.${ext}`;

    // 5. Upload to private bucket
    const arrayBuf = await file.arrayBuffer();
    const { error: uploadErr } = await sb.storage
      .from('investor-docs')
      .upload(storagePath, arrayBuf, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadErr) {
      console.error('Storage upload error:', uploadErr);
      return json({ error: `Upload failed: ${uploadErr.message}` }, 500);
    }

    // 6. Insert metadata row
    const { data: doc, error: insertErr } = await sb
      .from('investor_documents')
      .insert({
        title,
        description,
        document_type:    documentType,
        storage_path:     storagePath,
        visibility_scope: visibilityScope,
        per_investor_id:  perInvestorId,
        version,
        file_size_bytes:  file.size,
        mime_type:        file.type || null,
        uploaded_by:      user.id,
        uploaded_at:      new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertErr) {
      // Attempt to clean up the uploaded file
      await sb.storage.from('investor-docs').remove([storagePath]);
      return json({ error: `Metadata insert failed: ${insertErr.message}` }, 500);
    }

    return json({ ok: true, document_id: doc.id, storage_path: storagePath });

  } catch (err) {
    console.error('upload-investor-doc error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
