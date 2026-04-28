// src/pages/api/chats.ts
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import type { APIRoute } from 'astro';

const google = createGoogleGenerativeAI({
  apiKey: import.meta.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const POST: APIRoute = async ({ request }) => {
  const { messages } = await request.json();

  // Пріоритетний список моделей: спочатку найкраща, потім безлімітні
  const models = [
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite-preview', // Перевір цей ID через "Get Code"!
    'gemini-2.0-flash-lite'         // Остання надія (Unlimited у твоїй таблиці)
  ];

  for (const modelId of models) {
    try {
      console.log(`Спроба запиту до: ${modelId}`);
      
      const result = await streamText({
        model: google(modelId),
        system: `Ти — помічник Центру променевої терапії. Описуй обладнання та послуги.`,
        messages,
      });

      return result.toTextStreamResponse();
      
    } catch (error: any) {
      // Якщо помилка 429 (ліміт) або 404 (модель не знайдена) — йдемо до наступної моделі
      if (error?.statusCode === 429 || error?.statusCode === 404 || error?.statusCode === 503) {
        console.warn(`Модель ${modelId} недоступна, пробую наступну...`);
        continue; 
      }
      // Якщо інша помилка — виходимо
      return new Response("Помилка API", { status: 500 });
    }
  }

  return new Response("Всі моделі перевантажені", { status: 503 });
};