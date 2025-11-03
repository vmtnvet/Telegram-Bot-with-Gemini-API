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
  const models = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];
  
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: message
            }]
          }]
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          return data.candidates[0].content.parts[0].text;
        }
      }
      
      if (response.status === 429) {
        continue;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`${model} Error:`, response.status, errorText);
        continue;
      }
      
    } catch (error) {
      console.error(`${model} failed:`, error);
      continue;
    }
  }
  
  return '抱歉，所有模型都暂时不可用，请稍后再试或检查API配额';
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
