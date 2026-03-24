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
      if (replyTo.includes("Крок 3")) {
        const title = replyTo.split('\n')[0].split(':')[1]?.trim() || "Новина";
        const desc = replyTo.split('\n')[1].split(':')[1]?.trim() || "Опис";

        const fileName = `news-${Date.now()}.md`;
        const fileContent = `---\ntitle: "${title}"\ndate: "${new Date().toISOString().split('T')[0]}"\ndescription: "${desc}"\n---\n${text}`;

        const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/src/content/news/${fileName}`, {
          method: 'PUT',
          headers: { 
            'Authorization': `token ${githubToken}`, 
            'Content-Type': 'application/json',
            'User-Agent': 'Astro-Bot'
          },
          body: JSON.stringify({ message: `Post: ${title}`, content: Buffer.from(fileContent).toString('base64') }),
        });

        if (res.ok) {
          console.log("GitHub OK. Спроба відправити в TG...");
          const tgRes = await sendTelegram(tgToken, chatId, "✅ ГОТОВО! Новина вже на сайті.");
          const tgResult = await tgRes.json();
          if (!tgRes.ok) {
            console.error("Помилка Telegram API:", tgResult);
          } else {
            console.log("Telegram відповів успішно!");
          }
        } else {
          const err = await res.json();
          await sendTelegram(tgToken, chatId, "❌ Помилка GitHub: " + err.message);
        }
      } 
      else if (replyTo.includes("Крок 2")) {
        const title = replyTo.split('\n')[0].split(':')[1]?.trim();
        await sendTelegram(tgToken, chatId, `Заголовок: ${title}\nОпис: ${text}\n\n👉 Крок 3: Введіть ОСНОВНИЙ ТЕКСТ:`, { force_reply: true });
      }
      else if (replyTo.includes("Крок 1")) {
        await sendTelegram(tgToken, chatId, `Заголовок: ${text}\n\n👉 Крок 2: Введіть ОПИС (анонс):`, { force_reply: true });
      }
    }

    return new Response('ok');
  } catch (err: any) {
    console.error("Глобальний збій:", err.message);
    return new Response('ok');
  }
};

async function sendTelegram(token: string | undefined, chatId: number, text: string, replyMarkup: any = null) {
  return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      chat_id: chatId, 
      text: text, 
      reply_markup: replyMarkup 
    })
  });
}