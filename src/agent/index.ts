import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionContentPart } from 'openai/resources/chat/completions';

interface AgentInput {
  message: string;
  imageBase64?: string;
  imageMimeType?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface AgentResult {
  response: string;
  actionsTaken: string[];
}

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'Mise Kitchen Assistant',
  },
});

export async function runAgent(input: AgentInput): Promise<AgentResult> {
  const { message, imageBase64, imageMimeType = 'image/jpeg', conversationHistory = [] } = input;

  // System prompt for kitchen assistant
  const systemPrompt = `You are Mise, a helpful kitchen assistant. Your role is to:
- Help users manage their kitchen inventory
- Suggest recipes based on available ingredients
- Provide cooking tips and techniques
- Analyze food from images (receipts, fridge contents, etc.)
- Track expiry dates and food safety

Be friendly, practical, and focused on helping them use their ingredients effectively.`;

  // Build messages array
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    {
      role: 'user' as const,
      content: buildUserContent(message, imageBase64, imageMimeType),
    },
  ];

  try {
    const response = await client.chat.completions.create({
      model: 'x-ai/grok-4.1-fast:free',
      max_tokens: 1024,
      messages,
    });

    const responseContent = response.choices[0]?.message?.content || '';

    return {
      response: responseContent,
      actionsTaken: ['called-grok-4.1-fast:free'],
    };
  } catch (error) {
    console.error('Agent error:', error);
    throw error;
  }
}

function buildUserContent(
  message: string,
  imageBase64?: string,
  imageMimeType: string = 'image/jpeg'
): string | ChatCompletionContentPart[] {
  if (!imageBase64) {
    return message;
  }

  return [
    {
      type: 'text',
      text: message,
    },
    {
      type: 'image_url',
      image_url: {
        url: `data:${imageMimeType};base64,${imageBase64}`,
      },
    },
  ];
}
