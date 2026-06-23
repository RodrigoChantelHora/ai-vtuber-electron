import { ConfigManager } from './ConfigManager'

export async function describeImage(
  imageBase64: string,
  prompt = 'O que você vê nesta imagem? Descreva em detalhes.'
): Promise<string> {
  const cfg = ConfigManager.getConfig()

  if (!cfg.openai_api_key) throw new Error('OpenAI key not configured')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.openai_api_key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${imageBase64}`, detail: 'high' },
            },
          ],
        },
      ],
      max_tokens: 500,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Vision error: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'Não vi nada de especial.'
}
