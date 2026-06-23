import { ConfigManager } from './ConfigManager'

interface Message {
  role: string
  content: string
}

const history: Message[] = []

export async function askLLM(userMessage: string, imageBase64?: string): Promise<string> {
  const cfg = ConfigManager.getConfig()

  history.push({ role: 'user', content: userMessage })

  let response = ''
  if (cfg.llm_provider === 'anthropic') {
    response = await callAnthropic(cfg.system_prompt, imageBase64)
  } else {
    response = await callOpenAI(cfg.system_prompt, imageBase64)
  }

  if (response) {
    history.push({ role: 'assistant', content: response })
    trimHistory(cfg.max_conversation_history)
  }

  return response || '...'
}

async function callOpenAI(systemPrompt: string, imageBase64?: string): Promise<string> {
  const cfg = ConfigManager.getConfig()
  if (!cfg.openai_api_key) throw new Error('OpenAI key not configured')

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-cfg.max_conversation_history * 2),
  ]

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.openai_api_key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI error: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || '...'
}

async function callAnthropic(systemPrompt: string, imageBase64?: string): Promise<string> {
  const cfg = ConfigManager.getConfig()
  if (!cfg.anthropic_api_key) throw new Error('Anthropic key not configured')

  const messages = history.slice(-cfg.max_conversation_history * 2).map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.anthropic_api_key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      messages,
      system: systemPrompt,
      max_tokens: 500,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic error: ${err}`)
  }

  const data = await res.json()
  const textBlock = data.content?.find((b: any) => b.type === 'text')
  return textBlock?.text || data.content || '...'
}

function trimHistory(max: number) {
  while (history.length > max * 2) {
    history.shift()
  }
}

export function clearHistory() {
  history.length = 0
}
