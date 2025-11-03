import { GoogleGenerativeAI } from '@google/generative-ai';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleWebhook(request, env);
    }
    
    if (url.pathname === '/setWebhook' && request.method === 'GET') {
      return setWebhook(env);
    }
    
    return new Response('Bot is running', { status: 200 });
  }
};

async function handleWebhook(request, env) {
  try {
    const update = await request.json();
    
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const userMessage = update.message.text;
      
      if (userMessage === '/start') {
        await sendMessage(env.BOT_TOKEN, chatId, '你好！我是AI助手，有什么可以帮你的吗？');
        return new Response('OK', { status: 200 });
      }
      
      const aiResponse = await getGeminiResponse(env.GEMINI_API_KEY, userMessage);
      await sendMessage(env.BOT_TOKEN, chatId, aiResponse);
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error:', error);
    return new Response('Error', { status: 500 });
  }
}

async function getGeminiResponse(apiKey, message) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();
    
    return text || '抱歉，我现在无法回答';
  } catch (error) {
    console.error('Gemini API Error:', error);
    return '抱歉，AI服务暂时不可用';
  }
}

async function sendMessage(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    })
  });
}

async function setWebhook(env) {
  const webhookUrl = `${env.WEBHOOK_URL}/webhook`;
  const url = `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl })
  });
  
  const result = await response.json();
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
}
