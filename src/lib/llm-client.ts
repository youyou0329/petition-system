// LLM 客户端 - 兼容 Vercel 部署
// 支持 Coze API 或直接使用 DeepSeek/OpenAI API

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  success: boolean;
  error?: string;
}

async function callCozeAPI(messages: LLMMessage[]): Promise<LLMResponse> {
  const token = process.env.COZE_API_TOKEN;
  
  if (!token) {
    return { content: '', success: false, error: 'COZE_API_TOKEN 未配置' };
  }

  try {
    // 调用 Coze API (豆包模型)
    const response = await fetch('https://api.coze.cn/v3/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bot_id: process.env.COZE_BOT_ID || 'default',
        user_id: 'petition-user',
        stream: false,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { content: '', success: false, error: `API 错误: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.data?.content || '';
    
    return { content, success: true };
  } catch (error) {
    return { content: '', success: false, error: `请求失败: ${error}` };
  }
}

async function callDeepSeekAPI(messages: LLMMessage[]): Promise<LLMResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    return { content: '', success: false, error: 'DEEPSEEK_API_KEY 未配置' };
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { content: '', success: false, error: `API 错误: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    return { content, success: true };
  } catch (error) {
    return { content: '', success: false, error: `请求失败: ${error}` };
  }
}

// 统一的 LLM 调用接口
export async function callLLM(
  systemPrompt: string,
  userMessage: string,
  provider: 'coze' | 'deepseek' = 'deepseek'
): Promise<LLMResponse> {
  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  if (provider === 'coze') {
    return callCozeAPI(messages);
  } else {
    return callDeepSeekAPI(messages);
  }
}

// 检查 LLM 配置是否有效
export function checkLLMConfig(): { configured: boolean; provider: string; error?: string } {
  if (process.env.COZE_API_TOKEN) {
    return { configured: true, provider: 'Coze (豆包)' };
  }
  if (process.env.DEEPSEEK_API_KEY) {
    return { configured: true, provider: 'DeepSeek' };
  }
  return { 
    configured: false, 
    provider: '', 
    error: '请配置 COZE_API_TOKEN 或 DEEPSEEK_API_KEY 环境变量' 
  };
}
