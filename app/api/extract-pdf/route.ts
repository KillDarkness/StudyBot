import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Arquivo deve ser um PDF" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let extractedText = ""

    try {
      extractedText = await extractTextFromPDFBuffer(buffer)
    } catch (error) {
      console.error("Erro ao extrair texto do PDF:", error)
      return NextResponse.json({
        text: `Não foi possível extrair texto do arquivo ${file.name}. O arquivo pode estar protegido, corrompido ou conter apenas imagens. Tente converter o PDF para texto manualmente ou cole o conteúdo diretamente no chat.`,
      })
    }

    if (extractedText.trim()) {
      return NextResponse.json({ text: extractedText.trim() })
    } else {
      return NextResponse.json({
        text: `O arquivo ${file.name} não contém texto extraível. Pode ser um PDF com apenas imagens, gráficos ou estar protegido. Tente converter para texto ou cole o conteúdo manualmente.`,
      })
    }
  } catch (error) {
    console.error("Erro geral ao processar PDF:", error)
    return NextResponse.json(
      {
        text: "Erro interno ao processar o PDF. Tente novamente ou use um arquivo de texto (.txt).",
      },
      { status: 500 },
    )
  }
}

async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  const uint8Array = new Uint8Array(buffer)
  let text = ""

  try {
    text = await extractTextWithSimpleParser(uint8Array)
  } catch (error) {
    console.error("Erro no parser simples:", error)
    text = await extractTextWithBinarySearch(uint8Array)
  }

  return text
}

async function extractTextWithSimpleParser(uint8Array: Uint8Array): Promise<string> {
  const decoder = new TextDecoder("utf-8", { fatal: false })
  const pdfString = decoder.decode(uint8Array)

  const textRegex = /$$([^)]+)$$/g
  const streamRegex = /stream\s*(.*?)\s*endstream/gs
  const textObjects: string[] = []

  let match
  while ((match = textRegex.exec(pdfString)) !== null) {
    const text = match[1]
    if (text && text.length > 1 && !text.match(/^[0-9\s.-]+$/)) {
      textObjects.push(text)
    }
  }

  while ((match = streamRegex.exec(pdfString)) !== null) {
    const streamContent = match[1]
    const streamTextRegex = /$$([^)]+)$$/g
    let streamMatch
    while ((streamMatch = streamTextRegex.exec(streamContent)) !== null) {
      const text = streamMatch[1]
      if (text && text.length > 1 && !text.match(/^[0-9\s.-]+$/)) {
        textObjects.push(text)
      }
    }
  }

  return textObjects.join(" ")
}

async function extractTextWithBinarySearch(uint8Array: Uint8Array): Promise<string> {
  const textChunks: string[] = []
  const decoder = new TextDecoder("utf-8", { fatal: false })

  for (let i = 0; i < uint8Array.length - 10; i++) {
    if (uint8Array[i] === 0x28) {
      let j = i + 1
      let depth = 1
      while (j < uint8Array.length && depth > 0) {
        if (uint8Array[j] === 0x28) depth++
        if (uint8Array[j] === 0x29) depth--
        j++
      }

      if (depth === 0) {
        const textBytes = uint8Array.slice(i + 1, j - 1)
        const text = decoder.decode(textBytes)
        if (text.length > 1 && !text.match(/^[0-9\s.-]+$/)) {
          textChunks.push(text)
        }
        i = j
      }
    }
  }

  return textChunks.join(" ")
}
