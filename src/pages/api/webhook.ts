import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const tgToken = process.env.TELEGRAM_TOKEN;
    const githubToken = process.env.GITHUB_TOKEN;
    const REPO_OWNER = "maximum20"; 
    const REPO_NAME = "kntsite";

    if (body.callback_query) {
      const chatId = body.callback_query.message.chat.id;
      if (body.callback_query.data === 'new_post') {
        await fetch(`https://api.telegram.org/bot${tgToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: body.callback_query.id })
        });
        await sendTelegram(tgToken, chatId, "👉 Крок 1: Введіть ЗАГОЛОВОК:", { force_reply: true });
      }
      return new Response('ok');
    }

    const msg = body.message;
    if (!msg) return new Response('ok');

    const chatId = msg.chat.id;
    const text = msg.text;
    const replyTo = msg.reply_to_message?.text;

    if (text === '/start') {
      await sendTelegram(tgToken, chatId, "Вітаю! Оберіть дію:", {
        inline_keyboard: [[{ text: "Створити новину ✍️", callback_data: "new_post" }]]
      });
      return new Response('ok');
    }

    if (replyTo) {
      // КРОК 3: Фінальна публікація
      if (replyTo.includes("Крок 3")) {
        // ВИПРАВЛЕНО: додано (l: string) для TypeScript
        const title = replyTo.split('\n').find((l: string) => l.includes('Заголовок:'))?.replace('Заголовок:', '').trim() || "Новина";
        const desc = replyTo.split('\n').find((l: string) => l.includes('Опис:'))?.replace('Опис:', '').trim() || "Опис";

        const slug = title.toLowerCase()
          .replace(/[^a-z0-9а-яіїєґ]/g, '-') 
          .replace(/-+/g, '-')             
          .trim();
          
        const fileName = `${slug}.md`;
        
        // Формуємо вміст файлу (Frontmatter + Текст)
        const fileContent = `---
title: "${title}"
date: "${new Date().toISOString().split('T')[0]}"
description: "${desc}"
---
${text}`;

        const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/content/news/${fileName}`, {
          method: 'PUT',
          headers: { 
            'Authorization': `token ${githubToken}`, 
            'Content-Type': 'application/json',
            'User-Agent': 'Astro-Bot'
          },
          body: JSON.stringify({ 
            message: `Post: ${title}`, 
            content: Buffer.from(fileContent).toString('base64') 
          }),
        });

        if (res.ok) {
          await sendTelegram(tgToken, chatId, "✅ ГОТОВО! Новина вже на сайті та в адмінці.");
        } else {
          const err = await res.json();
          await sendTelegram(tgToken, chatId, "❌ Помилка GitHub: " + err.message);
        }
      } 
      // КРОК 2: Опис -> Текст
      else if (replyTo.includes("Крок 2")) {
        const title = replyTo.split('\n').find((l: string) => l.includes('Заголовок:'))?.replace('Заголовок:', '').trim() || "Новина";
        await sendTelegram(tgToken, chatId, `Заголовок: ${title}\nОпис: ${text}\n\n👉 Крок 3: Введіть ОСНОВНИЙ ТЕКСТ:`, { force_reply: true });
      }
      // КРОК 1: Заголовок -> Опис
      else if (replyTo.includes("Крок 1")) {
        await sendTelegram(tgToken, chatId, `Заголовок: ${text}\n\n👉 Крок 2: Введіть ОПИС (анонс):`, { force_reply: true });
      }
    }

    return new Response('ok');
  } catch (err: any) {
    return new Response('ok');
  }
};

async function sendTelegram(token: string | undefined, chatId: number, text: string, replyMarkup: any = null) {
  const payload: any = {
    chat_id: chatId,
    text: text
  };
  
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}