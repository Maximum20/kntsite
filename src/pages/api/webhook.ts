import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const tgToken = process.env.TELEGRAM_TOKEN;
    const githubToken = process.env.GITHUB_TOKEN;
    const REPO_OWNER = "maximum20"; 
    const REPO_NAME = "kntsite";

    // Визначаємо, звідки прийшли дані (повідомлення чи кнопка)
    const msg = body.message || body.callback_query?.message;
    if (!msg) return new Response('ok', { status: 200 });

    const chatId = msg.chat.id;
    const text = body.message?.text;
    const data = body.callback_query?.data;
    const replyTo = body.message?.reply_to_message?.text;

    // 1. Обробка натискання кнопки (Callback)
    if (data === 'new_post') {
      // Відповідаємо Telegram, що ми прийняли клік (щоб кнопка перестала крутитися)
      await fetch(`https://api.telegram.org/bot${tgToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: body.callback_query.id })
      });

      await sendTelegram(tgToken, chatId, "📌 Напишіть ЗАГОЛОВОК новини (використовуйте REPLY/ВІДПОВІДЬ):", { force_reply: true });
      return new Response('ok', { status: 200 });
    }

    // 2. Команда /start
    if (text === '/start') {
      await sendTelegram(tgToken, chatId, "Вітаю, Максе! Оберіть дію:", {
        inline_keyboard: [[{ text: "Створити новину ✍️", callback_data: "new_post" }]]
      });
      return new Response('ok', { status: 200 });
    }

    // 3. Логіка відповідей (якщо є replyTo)
    if (replyTo) {
      if (replyTo.includes("ЗАГОЛОВОК")) {
        await sendTelegram(tgToken, chatId, `Заголовок прийнято: ${text}\n\n📌 Тепер напишіть ОПИС (використовуйте REPLY):`, { force_reply: true });
      } 
      else if (replyTo.includes("ОПИС")) {
        const title = replyTo.split(":")[1]?.trim() || "Без заголовка";
        await sendTelegram(tgToken, chatId, `Заголовок: ${title}\nОпис: ${text}\n\n📌 Тепер напишіть ОСНОВНИЙ ТЕКСТ (REPLY):`, { force_reply: true });
      }
      else if (replyTo.includes("ОСНОВНИЙ ТЕКСТ")) {
        const lines = replyTo.split("\n");
        const title = lines[0]?.split(":")[1]?.trim() || "Новина";
        const desc = lines[1]?.split(":")[1]?.trim() || "Короткий опис";

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
          await sendTelegram(tgToken, chatId, "❌ Помилка GitHub. Перевірте токен.");
        }
      }
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response('error', { status: 200 }); // Завжди 200, щоб TG не засипав запитами
  }
};

async function sendTelegram(token: string | undefined, chatId: number, text: string, replyMarkup: any = null) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown', reply_markup: replyMarkup })
  });
}