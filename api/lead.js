// package.json: { "type": "module" }

import { Buffer } from 'buffer';

const WEBHOOK_URL = 'https://app597875.1capp.net/1SUpravleniye-nashey-firmoy-8/hs/landing_webhook/lead/v1';
const USERNAME = 'Landing_tilda_connect';        // ← замените на реальный логин
const PASSWORD = 'e1uoijdBak3LdRwb4JYq'; // ← замените на реальный пароль

// Опционально: если используется X-Api-Key
// const API_KEY = 'ваш_секретный_ключ';

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const body = await req.json();

    // Проверка: Tilda может присылать данные в виде полей формы, а не JSON
    // Если вы используете "Отправлять как JSON" в Tilda — ок.
    // Иначе нужно парсить URL-encoded данные.

    const leadData = {
      packageHeader: {
        exchangePlan: "LandingLead",
        from: "landing-tilda",
        to: "1C-UNF"
      },
      lead: {
        childFullName: body.childFullName?.trim(),
        childGender: body.childGender?.toUpperCase(),
        childBirthDate: body.childBirthDate,
        parentFullName: body.parentFullName?.trim(),
        parentPhone: body.parentPhone?.replace(/\D/g, ''), // оставить только цифры
        parentEmail: body.parentEmail?.trim(),
        landingPageAddress: "https://heroes.aricamp.ru/",
        createdAt: new Date().toISOString()
      }
    };

    // Валидация (минимальная)
    if (!leadData.lead.childFullName || !leadData.lead.parentFullName || !leadData.lead.parentPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Нормализуем телефон под +7XXXXXXXXXX
    let phone = leadData.lead.parentPhone;
    if (phone.startsWith('8')) phone = '7' + phone.slice(1);
    if (!phone.startsWith('7')) phone = '7' + phone;
    leadData.lead.parentPhone = '+' + phone;

    const auth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${auth}`,
        // 'X-Api-Key': API_KEY, // раскомментировать, если нужен
        'Idempotency-Key': crypto.randomUUID(), // защита от дублей
      },
      body: JSON.stringify(leadData),
    });

    const result = await response.json();
    console.log('1C response:', result);

    if (response.ok) {
      res.status(200).json({ success: true, data: result.data });
    } else {
      res.status(response.status).json({ error: result.error?.message || '1C error' });
    }
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
