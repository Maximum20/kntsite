import type { APIRoute } from 'astro';
import { kv } from '@vercel/kv';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const tgToken = process.env.TELEGRAM_TOKEN;
    const githubToken = process.env.GITHUB_TOKEN;
    
    // Твої дані (вже вписав)
    const REPO_OWNER = "maximum20"; 
    const REPO_NAME = "kntsite";

    // Telegram надсилає дані або в message, або в callback_query (якщо натиснута кнопка)
    const chatId = body.message?.chat.id || body.callback_query?.message.chat.id;
    const text = body.message?.text;
    const data = body.callback_query?.data;

    if (!chatId) return new Response('no chat id', { status: 200 });

    // --- ЛОГІКА БОТА ---

    // 1. Команда /start - Скидаємо все і пропонуємо почати
    if (text === '/start') {
      await kv.set(`state:${chatId}`, 'IDLE');
      await sendTelegram(tgToken, chatId, "Вітаю, Максе! 🏥\nБажаєте опублікувати нову новину на сайт?", [
        [{ text: "Так, розпочати! ✍️", callback_data: "start_news" }]
      ]);
      return new Response('ok');
    }

    // Отримуємо поточний стан користувача
    const state = await kv.get(`state:${chatId}`);

    // 2. Натиснули кнопку "Розпочати"
    if (data === 'start_news') {
      await kv.set(`state:${chatId}`, 'AWAIT_TITLE');
      await sendTelegram(tgToken, chatId, "🟢 **Крок 1:**\nНапишіть заголовок новини:");
    } 

    // 3. Отримали заголовок -> Питаємо опис
    else if (state === 'AWAIT_TITLE' && text) {
      await kv.set(`news:${chatId}:title`, text);
      await kv.set(`state:${chatId}`, 'AWAIT_DESC');
      await sendTelegram(tgToken, chatId, "🟡 **Крок 2:**\nТепер напишіть короткий опис (анонс для головної сторінки):");
    }

    // 4. Отримали опис -> Питаємо основний текст
    else if (state === 'AWAIT_DESC' && text) {
      await kv.set(`news:${chatId}:desc`, text);
      await kv.set(`state:${chatId}`, 'AWAIT_BODY');
      await sendTelegram(tgToken, chatId, "🔵 **Крок 3:**\nНапишіть основний зміст новини:");
    }

    // 5. Отримали текст -> ФІНАЛ (Пушимо в GitHub)
    else if (state === 'AWAIT_BODY' && text) {
      const title = await kv.get(`news:${chatId}:title`);
      const desc = await kv.get(`news:${chatId}:desc`);
      
      const fileName = `news-${Date.now()}.md`;
      
      // Формуємо файл
      const fileContent = `---
title: "${title}"
date: "${new Date().toLocaleDateString('uk-UA')}"
description: "${desc}"
---
${text}`;

      const base64Content = Buffer.from(fileContent).toString('base64');

      // Відправка на GitHub через API
      const ghResponse = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/content/news/${fileName}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Astro-Bot',
          },
          body: JSON.stringify({
            message: `New post: ${title}`,
            content: base64Content,
          }),
        }
      );

      if (ghResponse.ok) {
        await sendTelegram(tgToken, chatId, `✅ **Успіх!**\nНовина "${title}" опублікована.\n\nЗа 30 секунд вона з'явиться на сайті.`);
        // Очищуємо пам'ять бота
        await kv.del(`state:${chatId}`);
        await kv.del(`news:${chatId}:title`);
        await kv.del(`news:${chatId}:desc`);
      } else {
        await sendTelegram(tgToken, chatId, "❌ Помилка GitHub. Можливо, токен застарів або немає прав.");
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
  } catch (err: any) {
    console.error('Webhook Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

// Функція-помічник для відправки повідомлень у Telegram
async function sendTelegram(token: string | undefined, chatId: number, text: string, buttons: any = null) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body: any = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
  };
  if (buttons) {
    body.reply_markup = { inline_keyboard: buttons };
  }

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}