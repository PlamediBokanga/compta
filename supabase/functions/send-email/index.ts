import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  from_name?: string;
}

function buildCorsHeaders(req: Request) {
  const requestOrigin = req.headers.get('Origin') ?? '';
  const configuredOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? Deno.env.get('APP_URL') ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigin = configuredOrigins.includes(requestOrigin)
    ? requestOrigin
    : configuredOrigins[0] ?? 'http://localhost:5173';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
    Vary: 'Origin',
  };
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse(req, { error: 'Missing bearer token' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(req, { error: 'Server is not configured for email sending' }, 500);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse(req, { error: 'Unauthorized' }, 401);
    }

    const { to, subject, html, from_name } = (await req.json()) as EmailRequest;

    if (!to || !subject || !html) {
      return jsonResponse(req, { error: 'Missing required fields: to, subject, html' }, 400);
    }

    if (subject.length > 200 || html.length > 200000) {
      return jsonResponse(req, { error: 'Payload too large' }, 400);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await serviceClient.from('email_queue').insert({
      user_id: user.id,
      to_email: to,
      subject,
      html_body: html,
      from_name: from_name || 'Tenzo',
      status: 'pending',
    });

    if (error) {
      console.warn('email_queue insert failed:', error.message);
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${from_name || 'Tenzo'} <noreply@tenzo.fr>`,
          to: [to],
          subject,
          html,
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        return jsonResponse(req, { error: `Resend error: ${errBody}` }, 502);
      }

      const data = await resp.json();
      return jsonResponse(req, { success: true, id: data.id });
    }

    return jsonResponse(req, {
      success: true,
      queued: true,
      message: 'Email queued. Configure RESEND_API_KEY to send.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse(req, { error: message }, 500);
  }
});
