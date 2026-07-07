import { ConfigManager, ConfigManagerClass } from './ConfigManager'
import { logInfo, logError, logWarn } from './LogService'

interface Message {
  role: string
  content: string
}

const history: Message[] = []

export async function askLLM(userMessage: string, imageBase64?: string): Promise<string> {
  const cfg = ConfigManager.getConfig()

  history.push({ role: 'user', content: userMessage })

  logInfo(`LLM [${cfg.llm_provider}] ← "${userMessage.slice(0, 80)}${userMessage.length > 80 ? '…' : ''}"`)

  // Injeta estilo de vocabulário no prompt (sempre atualizado, nunca desatualizado)
  const vocabSuffix = ConfigManagerClass.getVocabularySuffix(cfg.vocabulary_style, cfg.character_gender)
  const systemPrompt = cfg.system_prompt + (vocabSuffix ? '\n\n--- Personalidade ---\n' + vocabSuffix : '')

  let response = ''
  try {
    if (cfg.llm_provider === 'anthropic') {
      response = await callAnthropic(systemPrompt, imageBase64)
    } else if (cfg.llm_provider === 'ollama') {
      response = await callOllama(systemPrompt)
    } else if (cfg.llm_provider === 'gemini') {
      response = await callGemini(systemPrompt)
    } else {
      response = await callOpenAI(systemPrompt, imageBase64)
    }
    logInfo(`LLM [${cfg.llm_provider}] → "${response.slice(0, 80)}${response.length > 80 ? '…' : ''}"`)
  } catch (err: any) {
    logError(`LLM [${cfg.llm_provider}] erro: ${err.message}`)
    throw err
  }

  if (response) {
    history.push({ role: 'assistant', content: response })
    trimHistory(cfg.max_conversation_history)
  }

  return response || '...'
}

async function callOpenAI(systemPrompt: string, imageBase64?: string): Promise<string> {
  const cfg = ConfigManager.getConfig()
  if (!cfg.openai_api_key) throw new Error('OpenAI key não configurada')

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
  if (!cfg.anthropic_api_key) throw new Error('Anthropic key não configurada')

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

async function callOllama(systemPrompt: string): Promise<string> {
  const cfg = ConfigManager.getConfig()
  const baseUrl = (cfg.ollama_url || 'http://localhost:11434').replace(/\/$/, '')
  const model = cfg.ollama_model || 'llama3.2'

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-cfg.max_conversation_history * 2),
  ]

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      temperature: 0.7,
      max_tokens: 500,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ollama error (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || '...'
}

async function callGemini(systemPrompt: string, attempt = 1): Promise<string> {
  const cfg = ConfigManager.getConfig()
  if (!cfg.gemini_api_key) throw new Error('Gemini API key não configurada')

  const model = cfg.gemini_model || 'gemini-3.5-flash'

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-cfg.max_conversation_history * 2),
  ]

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.gemini_api_key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    },
  )

  // Helper: resposta pode ser objeto ou array [{...}]
  function parseGeminiBody(raw: string): any {
    try {
      const p = JSON.parse(raw)
      return Array.isArray(p) ? (p[0] ?? {}) : p
    } catch { return {} }
  }

  // Retry automático em rate limit (429) com delay da resposta
  if (res.status === 429 && attempt <= 3) {
    const rawRetry = await res.text().catch(() => '{}')
    const retryBody = parseGeminiBody(rawRetry)
    const retryInfo = retryBody?.error?.details?.find((d: any) => d['@type']?.includes('RetryInfo'))
    const delaySec = parseFloat(retryInfo?.retryDelay ?? '5') || 5
    logWarn(`Gemini 429 — aguardando ${delaySec}s antes da tentativa ${attempt + 1}/3`)
    await new Promise((r) => setTimeout(r, Math.min(delaySec * 1000, 15000)))
    return callGemini(systemPrompt, attempt + 1)
  }

  if (!res.ok) {
    const rawText = await res.text().catch(() => '')
    const errBody = parseGeminiBody(rawText)
    const apiMsg: string = errBody?.error?.message || rawText

    if (res.status === 429) {
      // Verifica se é cota zero (chave errada) ou rate limit temporário
      const isZeroQuota = /limit:\s*0/i.test(apiMsg)
      if (isZeroQuota) {
        throw new Error(
          'Gemini: sua chave API tem cota zero.\n' +
          'Acesse aistudio.google.com/apikey → "Create API key in new project"\n' +
          'e substitua a chave nas configurações.',
        )
      }
      // Rate limit temporário — extrai o tempo sugerido
      const retryMatch = apiMsg.match(/retry in ([\d.]+)s/i)
      const retrySec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null
      throw new Error(
        `Gemini: limite de requests atingido.${retrySec ? ` Tente novamente em ${retrySec}s.` : ' Aguarde alguns segundos e tente novamente.'}`,
      )
    }
    if (res.status === 401) {
      throw new Error(
        'Gemini: chave API inválida (401).\n' +
        'Verifique se copiou a chave corretamente em aistudio.google.com/apikey.',
      )
    }
    throw new Error(`Gemini error (${res.status}): ${apiMsg}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || '...'
}

function trimHistory(max: number) {
  while (history.length > max * 2) {
    history.shift()
  }
}

export function clearHistory() {
  history.length = 0
}
