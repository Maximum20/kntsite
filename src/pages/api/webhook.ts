import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    // --- НАЛАШТУВАННЯ (ЗМІНИ ТІЛЬКИ ТУТ) ---
    const REPO_OWNER = "Maximum20"; // Наприклад: maks-pavlenko
    const REPO_NAME = "kntsite";           // Назва твого репозиторію
    // ---------------------------------------

    const body = await request.json();

    // Перевіряємо, чи це повідомлення з текстом
    if (body.message && body.message.text) {
      const tgText = body.message.text;
      const githubToken = process.env.GITHUB_TOKEN;

      // Створюємо назву файлу на основі часу (щоб не повторювались)
      const fileName = `news-${Date.now()}.md`;

      // Формуємо вміст Markdown-файлу
      const fileContent = `---
title: "Новина з Telegram"
date: "${new Date().toISOString().split('T')[0]}"
image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118"
description: "${tgText.substring(0, 100)}..."
---
${tgText}`;

      // GitHub API вимагає контент у форматі Base64
      const base64Content = Buffer.from(fileContent).toString('base64');

      // Відправляємо запит до GitHub API
      const response = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/content/news/${fileName}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Astro-Webhook',
          },
          body: JSON.stringify({
            message: `New post from Telegram: ${fileName}`,
            content: base64Content,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('GitHub API Error:', errorData);
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
  } catch (err) {
    console.error('Webhook Error:', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};