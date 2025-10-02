// api/lead.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const body = req.body;

  // Извлекаем поля из Tilda
  const childFullName = (body.name || '').trim();
  const childBirthDate = body.childBirthDate || '2010-01-01';
  const childGender = (body.childGender || 'M').toUpperCase();
  const parentFullName = (body.parentName || '').trim();
  const parentPhone = body.phone || '';
  const parentEmail = body.email || '';

  // Проверка обязательных полей
  if (!childFullName || !parentFullName || !parentPhone || !childBirthDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Генерируем Idempotency-Key
  const idempotencyKey = `${parentPhone}-${childBirthDate}-${Date.now()}`;

  // Формируем payload для 1С
  const payload = {
    packageHeader: {
      exchangePlan: "LandingLead",
      from: "landing-tilda",
      to: "1C-UNF"
    },
    lead: {
      childFullName,
      childGender: ['M', 'F'].includes(childGender) ? childGender : 'M',
      childBirthDate,
      parentFullName,
      parentPhone,
      parentEmail,
      landingPageAddress: "https://heroes.aricamp.ru/",
      createdAt: new Date().toISOString()
    }
  };

  // Basic Auth
  const login = 'Landing_tilda_connect';
  const password = 'e1uoijdBak3LdRwb4JYq';
  const auth = Buffer.from(`${login}:${password}`).toString('base64');

  try {
    const response = await fetch('https://app597875.1capp.net/1SUpravleniye-nashey-firmoy-8/hs/landing_webhook/lead/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${auth}`,
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Успешно отправлено в 1С:', result.data?.leadId);
      return res.status(200).json({ status: 'ok' });
    } else {
      console.error('❌ Ошибка 1С:', result.error?.message || 'Unknown');
      return res.status(400).json({ error: result.error?.message || '1C rejected request' });
    }
  } catch (err) {
    console.error('💥 Ошибка сети:', err.message);
    return res.status(500).json({ error: 'Failed to reach 1C' });
  }
}
