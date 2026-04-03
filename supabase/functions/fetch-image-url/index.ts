import { corsHeaders } from '@supabase/supabase-js/cors'

const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'URL requise' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: 'URL invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return new Response(JSON.stringify({ error: 'Seules les URLs HTTP/HTTPS sont acceptées' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'PaintByNumbers/1.0' },
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Erreur HTTP ${response.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() || '';
    if (!ALLOWED_TYPES.includes(contentType)) {
      return new Response(JSON.stringify({ error: `Format non supporté: ${contentType}. Formats acceptés: PNG, JPG, SVG, WebP` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_SIZE) {
      return new Response(JSON.stringify({ error: `Image trop volumineuse (${(contentLength / 1024 / 1024).toFixed(1)} MB, max 20 MB)` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const blob = await response.blob();
    if (blob.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: 'Image trop volumineuse (max 20 MB)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(blob, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Length': blob.size.toString(),
      },
    });
  } catch (error) {
    console.error('fetch-image-url error:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur lors du téléchargement' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
