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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: message
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2048
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', response.status, errorText);
      return `API错误 (${response.status})，请检查API密钥是否正确`;
    }
    
    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    }
    
    if (data.error) {
      console.error('Gemini Error:', data.error);
      return `Gemini错误: ${data.error.message}`;
    }
    
    return '抱歉，我现在无法回答';
  } catch (error) {
    console.error('Gemini API Error:', error);
    return `服务错误: ${error.message}`;
  }
}

async function sendMessage(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text
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
