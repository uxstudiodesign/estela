import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = 'francesco.gennai@estelashipping.net'

const EVENT_LABELS: Record<string, { label: string; date: string; time: string }> = {
  colazione_29: { label: 'Breakfast Seminar — Safety', date: '29 April 2026', time: '08:00 – 10:30' },
  colazione_30: { label: 'Breakfast Seminar — AI', date: '30 April 2026', time: '08:00 – 10:30' },
  colazione_01: { label: 'Breakfast Seminar — Sustainability', date: '1 May 2026', time: '08:00 – 10:30' },
  sunset_29: { label: 'Sunset Cocktail', date: '29 April 2026', time: '17:00 – 19:00' },
  sunset_30: { label: 'Sunset Cocktail', date: '30 April 2026', time: '17:00 – 19:00' },
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  readonly nome: string
  readonly cognome: string
  readonly email: string
  readonly events: ReadonlyArray<string>
  readonly qrToken: string
}

function buildEmailHtml({ nome, cognome, events, qrToken }: RequestBody): string {
  const confirmationUrl = `https://estela.supasailing.com/events/confirmation?token=${qrToken}`

  const eventRows = events
    .filter((key) => EVENT_LABELS[key])
    .map((key) => {
      const ev = EVENT_LABELS[key]
      return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
            <strong style="color: #1a1a1a;">${ev.label}</strong><br>
            <span style="color: #666; font-size: 14px;">${ev.date} · ${ev.time}</span>
          </td>
        </tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #7B1A2D; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">
                ESTELA PALMA WEEK 2026
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 8px; color: #1a1a1a; font-size: 16px;">
                Dear <strong>${nome} ${cognome}</strong>,
              </p>
              <p style="margin: 0 0 24px; color: #444; font-size: 15px; line-height: 1.5;">
                Your registration for Estela Palma Week 2026 has been confirmed. Below you will find the details of the events you registered for.
              </p>

              <!-- Events -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #7B1A2D;">
                    <strong style="color: #ffffff; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Your Events</strong>
                  </td>
                </tr>
                ${eventRows}
              </table>

              <!-- Location -->
              <p style="margin: 0 0 24px; color: #666; font-size: 14px;">
                📍 <strong>Astilleros de Mallorca</strong>, Palma de Mallorca, Spain
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${confirmationUrl}" style="display: inline-block; background-color: #7B1A2D; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                      View Your QR Code
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 4px; color: #444; font-size: 14px; line-height: 1.5; text-align: center;">
                Present your QR code at the entrance for check-in.
              </p>
              <p style="margin: 0; color: #999; font-size: 13px; text-align: center;">
                You can also save the QR code from the confirmation page.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; background-color: #fafafa; border-top: 1px solid #eee; text-align: center;">
              <p style="margin: 0 0 4px; color: #999; font-size: 12px;">
                Estela Shipping S.A. · Palma de Mallorca
              </p>
              <p style="margin: 0; color: #bbb; font-size: 11px;">
                This is an automated confirmation. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: RequestBody = await req.json()

    const { nome, cognome, email, events, qrToken } = body
    if (!nome || !cognome || !email || !events?.length || !qrToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const html = buildEmailHtml(body)

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Estela Palma Week <${FROM_EMAIL}>`,
        to: [email],
        subject: 'Your Estela Palma Week 2026 Registration is Confirmed',
        html,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend error:', resendData)
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
