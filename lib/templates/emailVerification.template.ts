export function emailVerificationTemplate(verifyUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verificá tu cuenta — ALMA</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #6d4c8e; padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; }
    .body { padding: 32px 24px; color: #333333; }
    .body p { line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; margin: 24px 0; padding: 14px 32px; background: #6d4c8e; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; }
    .footer { padding: 16px 24px; background: #f0ebe8; text-align: center; font-size: 12px; color: #888888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ALMA Rosario</h1>
    </div>
    <div class="body">
      <p>¡Hola! Gracias por registrarte en la plataforma de ALMA.</p>
      <p>Para activar tu cuenta, hacé clic en el botón de abajo. Este enlace es válido por 24 horas.</p>
      <a href="${verifyUrl}" class="btn">Verificar mi cuenta</a>
      <p>Si el botón no funciona, copiá y pegá el siguiente enlace en tu navegador:</p>
      <p style="word-break:break-all; font-size:13px; color:#555;">${verifyUrl}</p>
      <p>Si no creaste una cuenta en ALMA, podés ignorar este email.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ALMA — Asociación de Lucha contra el Mal de Alzheimer, Rosario</p>
    </div>
  </div>
</body>
</html>`
}
