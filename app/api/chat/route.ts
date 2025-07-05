import { type NextRequest, NextResponse } from "next/server"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"

const SYSTEM_PROMPT = `Você é um ChatBot Escolar.`

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json()

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "API key do Gemini não configurada" }, { status: 500 })
    }

    
    const conversationHistory = history.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }))

    
    const hasFileContent = message.includes("Conteúdo do arquivo")

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: SYSTEM_PROMPT }],
        },
        ...conversationHistory,
        {
          role: "user",
          parts: [{ text: message }],
        },
      ],
      generationConfig: {
        temperature: hasFileContent ? 0.3 : 0.7,
        topK: hasFileContent ? 20 : 40,
        topP: hasFileContent ? 0.8 : 0.95,
        maxOutputTokens: hasFileContent ? 4096 : 2048,
      },
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`Erro na API do Gemini: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui gerar uma resposta."

    return NextResponse.json({ response: aiResponse })
  } catch (error) {
    console.error("Erro na API:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
