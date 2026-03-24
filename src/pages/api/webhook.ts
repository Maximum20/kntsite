import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const tgToken = process.env.TELEGRAM_TOKEN;
    const githubToken = process.env.GITHUB_TOKEN;
    const REPO_OWNER = "maximum20"; 
    const REPO_NAME = "kntsite";

    const msg = body.message;
    if (!msg) return new Response('ok');

    const chatId = msg.chat.id;
    const text = msg.text;
    const replyTo = msg.reply_to_message?.text;

    // 1. Команда START
    if (text === '/start') {
      await sendTelegram(tgToken, chatId, "Вітаю, Максе! Оберіть дію:", {
        inline_keyboard: [[{ text: "Створити новину ✍️", callback_data: "new_post" }]]
      });
      return new Response('ok');
    }

    // 2. Натиснули кнопку "Створити новину"
    if (body.callback_query?.data === 'new_post') {
      const cId = body.callback_query.message.chat.id;
      await sendTelegram(tgToken, cId, "📌 Напишіть ЗАГОЛОВОК новини:", { force_reply: true });
      return new Response('ok');
    }

    // 3. Обробка відповідей (Логіка за ключовими словами у запитаннях)
    if (replyTo) {
      // Якщо ти відповів на запит заголовка
      if (replyTo.includes("ЗАГОЛОВОК")) {
        await sendTelegram(tgToken, chatId, `Заголовок прийнято: ${text}\n\n📌 Тепер напишіть ОПИС (анонс):`, { force_reply: true });
      } 
      // Якщо ти відповів на запит опису
      else if (replyTo.includes("ОПИС")) {
        const title = replyTo.split(":")[1].trim(); // Дістаємо заголовок з попереднього повідомлення
        await sendTelegram(tgToken, chatId, `Заголовок: ${title}\nОпис: ${text}\n\n📌 Тепер напишіть ОСНОВНИЙ ТЕКСТ:`, { force_reply: true });
      }
      // Якщо ти відповів на запит тексту -> ПУШИМО
      else if (replyTo.includes("ОСНОВНИЙ ТЕКСТ")) {
        const lines = replyTo.split("\n");
        const title = lines[0].split(":")[1].trim();
        const desc = lines[1].split(":")[1].trim();

        const fileName = `news-${Date.now()}.md`;
        const fileContent = `---\ntitle: "${title}"\ndate: "${new Date().toLocaleDateString('uk-UA')}"\ndescription: "${desc}"\n---\n${text}`;

        const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/content/news/${fileName}`, {
          method: 'PUT',
          headers: { 'Authorization': `token ${githubToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `New post: ${title}`, content: Buffer.from(fileContent).toString('base64') }),
        });

        if (res.ok) {
          await sendTelegram(tgToken, chatId, "✅ НОВИНА ОПУБЛІКОВАНА!");
        } else {
          await sendTelegram(tgToken, chatId, "❌ Помилка GitHub.");
        }
      }
    }

    return new Response('ok');
  } catch (err) {
    return new Response('error');
  }
};

async function sendTelegram(token, chatId, text, replyMarkup: any = null) {
  const payload: any = { chat_id: chatId, text: text, parse_mode: 'Markdown' };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}