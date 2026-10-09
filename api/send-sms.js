export default async function handler(req, res) {
  // Solo permitir peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { phone, raffleNumber } = req.body;

  if (!phone || !raffleNumber) {
    return res.status(400).json({ error: 'Faltan parámetros (phone o raffleNumber)' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  // Formatear el mensaje
  const messageBody = `Politécnico Superior: Registro exitoso. Tu número para la rifa es el ${raffleNumber}. ¡Gracias por tu asistencia!`;

  try {
    // Petición directa a la API de Twilio
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      },
      body: new URLSearchParams({
        To: phone.startsWith('+') ? phone : `+57${phone}`, // Ajusta +57 al código de país
        From: fromNumber,
        Body: messageBody
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al enviar SMS');
    }

    return res.status(200).json({ success: true, messageId: data.sid });
  } catch (error) {
    console.error('Error enviando SMS:', error);
    return res.status(500).json({ error: 'Error al enviar el SMS', details: error.message });
  }
}
