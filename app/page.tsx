"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Moon,
  Sun,
  Palette,
  Paperclip,
  Send,
  Bot,
  User,
  AlertCircle,
  X,
  FileText,
  PenTool,
  BookOpen,
  Copy,
  Check,
} from "lucide-react"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

type Theme = "dark-blue" | "dark-black" | "light"

const FormattedText = ({ text }: { text: string }) => {
  const formatText = (text: string) => {
    let html = text;

    
    
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

    
    html = html.replace(/^---$/gm, '<hr>');

    
    html = html.replace(
      /^> (.*$)/gm,
      '<blockquote>$1</blockquote>'
    );

    
    const lines = html.split('\n');
    let processedLines: string[] = [];
    let inUnorderedList = false;
    let inOrderedList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      
      if (trimmedLine.startsWith('* ')) {
        if (!inUnorderedList) {
          if (inOrderedList) { processedLines.push('</ol>'); inOrderedList = false; }
          processedLines.push('<ul>');
          inUnorderedList = true;
        }
        processedLines.push(`<li>${trimmedLine.substring(2)}</li>`);
      }
      
      else if (trimmedLine.match(/^\d+\. /)) {
        if (!inOrderedList) {
          if (inUnorderedList) { processedLines.push('</ul>'); inUnorderedList = false; }
          processedLines.push('<ol>');
          inOrderedList = true;
        }
        processedLines.push(`<li>${trimmedLine.replace(/^\d+\. /, '')}</li>`);
      }
      
      else {
        if (inUnorderedList) { processedLines.push('</ul>'); inUnorderedList = false; }
        if (inOrderedList) { processedLines.push('</ol>'); inOrderedList = false; }
        processedLines.push(line); 
      }
    }

    
    if (inUnorderedList) { processedLines.push('</ul>'); }
    if (inOrderedList) { processedLines.push('</ol>'); }

    html = processedLines.join('\n');

    
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"); 
    html = html.replace(/(\*([^*]+)\*|_([^_]+)_)/g, "<em>$2$3</em>"); 
    html = html.replace(/__(.*?)__/g, "<u>$1</u>"); 
    html = html.replace(/~~(.*?)~~/g, "<del>$1</del>"); 
    html = html.replace(/`(.*?)`/g, '<code>$1</code>'); 

    return html;
  };

  const formattedText = formatText(text);

  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: formattedText }}
    />
  );
}

const CopyButton = ({ text, className = "" }: { text: string; className?: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Erro ao copiar:", err)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity ${className}`}
      onClick={handleCopy}
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  )
}

const LoadingScreen = ({ theme }: { theme: Theme }) => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer)
          return 100
        }
        return prev + Math.random() * 15 + 5
      })
    }, 100)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className={`h-screen flex flex-col items-center justify-center bg-background text-foreground ${theme}`}>
      <Bot className="h-16 w-16 text-primary mb-6 animate-pulse" />
      <h1 className="text-2xl font-bold mb-2">StudyBot</h1>
      <p className="text-muted-foreground mb-8">Carregando...</p>
      <div className="w-64 h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  )
}

export default function StudyChatbot() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [theme, setTheme] = useState<Theme>("dark-blue")
  const [previewTheme, setPreviewTheme] = useState<Theme>("dark-blue")
  const [showThemeSelector, setShowThemeSelector] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    
    const savedTheme = (localStorage.getItem("studybot-theme") as Theme) || "dark-blue"
    const hasSeenThemeSelector = localStorage.getItem("studybot-theme-selected")

    setTheme(savedTheme)
    setPreviewTheme(savedTheme)
    applyTheme(savedTheme)

    const timer = setTimeout(() => {
      setMounted(true)

      if (!hasSeenThemeSelector) {
        setShowThemeSelector(true)
      }

      setTimeout(() => setInitialLoading(false), 500)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  const applyTheme = (selectedTheme: Theme) => {
    const root = document.documentElement
    root.className = ""
    root.classList.add(selectedTheme)
  }

  const handleThemePreview = (selectedTheme: Theme) => {
    setPreviewTheme(selectedTheme)
    applyTheme(selectedTheme)
  }

  const handleThemeConfirm = () => {
    setTheme(previewTheme)
    localStorage.setItem("studybot-theme", previewTheme)
    localStorage.setItem("studybot-theme-selected", "true")
    setShowThemeSelector(false)
  }

  const cycleTheme = () => {
    const themes: Theme[] = ["dark-blue", "dark-black", "light"]
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    const nextTheme = themes[nextIndex]
    setTheme(nextTheme)
    applyTheme(nextTheme)
    localStorage.setItem("studybot-theme", nextTheme)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200)
      textareaRef.current.style.height = `${newHeight}px`

      
      const lineHeight = 24 
      const lines = Math.ceil(textareaRef.current.scrollHeight / lineHeight)
      textareaRef.current.style.overflowY = lines > 5 ? "auto" : "hidden"
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [input])

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const data = await response.json()
      return data.text || `Não foi possível extrair texto do arquivo ${file.name}`
    } catch (error) {
      console.error("Erro ao extrair texto do PDF:", error)
      return `Erro ao processar o arquivo ${file.name}. Tente converter para .txt ou cole o texto diretamente.`
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const pdfFiles = files.filter((file) => file.type === "application/pdf")
    const textFiles = files.filter((file) => file.type.startsWith("text/"))

    const totalFiles = [...uploadedFiles, ...pdfFiles, ...textFiles]

    if (totalFiles.length > 5) {
      alert("Máximo de 5 arquivos por mensagem")
      return
    }

    setUploadedFiles(totalFiles)
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const sendQuickPrompt = (prompt: string) => {
    setInput(prompt)
    setTimeout(() => adjustTextareaHeight(), 0)
  }

  const sendMessage = async () => {
    if (!input.trim() && uploadedFiles.length === 0) return

    setIsLoading(true)

    let fileContents = ""
    if (uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        if (file.type === "application/pdf") {
          const pdfText = await extractTextFromPDF(file)
          fileContents += `\n\nConteúdo do arquivo ${file.name}:\n${pdfText}`
        } else if (file.type.startsWith("text/")) {
          try {
            const text = await file.text()
            fileContents += `\n\nConteúdo do arquivo ${file.name}:\n${text}`
          } catch (error) {
            fileContents += `\n\nErro ao ler arquivo ${file.name}`
          }
        }
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input + fileContents,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = input
    setInput("")
    setUploadedFiles([])

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput + fileContents,
          history: messages,
        }),
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || "Desculpe, não consegui gerar uma resposta.",
        role: "assistant",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Desculpe, ocorreu um erro ao processar sua mensagem. Verifique sua conexão e tente novamente.",
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }

    setIsLoading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.ctrlKey) {
        
        const textarea = e.target as HTMLTextAreaElement
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const value = textarea.value
        const newValue = value.substring(0, start) + "\n" + value.substring(end)
        setInput(newValue)
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1
          adjustTextareaHeight()
        }, 0)
      } else if (!e.shiftKey) {
        
        e.preventDefault()
        sendMessage()
      }
    }
  }

  if (initialLoading) {
    return <LoadingScreen theme={theme} />
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {showThemeSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Escolha seu tema</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  applyTheme(theme)
                  setShowThemeSelector(false)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground mb-6">Clique nos temas para testar e depois confirme:</p>
            <div className="space-y-3 mb-6">
              <Button
                variant={previewTheme === "dark-blue" ? "default" : "outline"}
                className="w-full justify-start gap-3 h-12"
                onClick={() => handleThemePreview("dark-blue")}
              >
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                Dark Azul (Recomendado)
              </Button>
              <Button
                variant={previewTheme === "dark-black" ? "default" : "outline"}
                className="w-full justify-start gap-3 h-12"
                onClick={() => handleThemePreview("dark-black")}
              >
                <div className="w-4 h-4 rounded-full bg-gray-800"></div>
                Dark Preto
              </Button>
              <Button
                variant={previewTheme === "light" ? "default" : "outline"}
                className="w-full justify-start gap-3 h-12"
                onClick={() => handleThemePreview("light")}
              >
                <div className="w-4 h-4 rounded-full bg-gray-200 border border-gray-400"></div>
                Tema Claro
              </Button>
            </div>
            <Button onClick={handleThemeConfirm} className="w-full">
              Continuar com{" "}
              {previewTheme === "dark-blue" ? "Dark Azul" : previewTheme === "dark-black" ? "Dark Preto" : "Tema Claro"}
            </Button>
          </Card>
        </div>
      )}

      {}
      <header className="flex items-center justify-between p-3 md:p-2 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          <div>
            <h1 className="text-lg md:text-xl font-bold">StudyBot</h1>
            <p className="text-xs text-muted-foreground hidden md:block">Escrever & Resumir - ChatBot Escolar</p>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9"
            onClick={() => setShowThemeSelector(true)}
          >
            <Palette className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9" onClick={cycleTheme}>
            {theme === "light" ? <Moon className="h-4 w-4 md:h-5 md:w-5" /> : <Sun className="h-4 w-4 md:h-5 md:w-5" />}
          </Button>
        </div>
      </header>

      {}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full custom-scrollbar">
          <div className="p-3 md:p-4 pb-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-4">
                <Card className="p-4 md:p-6 text-center border-border">
                  <Bot className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 text-primary" />
                  <h2 className="text-lg md:text-xl font-semibold mb-2">ChatBot Escolar - Escrever & Resumir</h2>
                  <p className="text-sm md:text-base text-muted-foreground mb-4">
                    Seu assistente para estudos! Posso resumir textos longos, ajudar com textos acadêmicos e simplificar
                    conteúdos complexos.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
                    <Card
                      className="p-3 md:p-4 hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => sendQuickPrompt("Resuma este texto em tópicos principais: [cole seu texto aqui]")}
                    >
                      <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary mb-2" />
                      <h3 className="font-semibold text-sm">Resumir Textos</h3>
                      <p className="text-xs text-muted-foreground">Transforme textos longos em resumos objetivos</p>
                    </Card>
                    <Card
                      className="p-3 md:p-4 hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => sendQuickPrompt("Me ajude a escrever uma introdução acadêmica sobre: [seu tema]")}
                    >
                      <PenTool className="h-5 w-5 md:h-6 md:w-6 text-primary mb-2" />
                      <h3 className="font-semibold text-sm">Escrever Textos</h3>
                      <p className="text-xs text-muted-foreground">Crie introduções, conclusões e citações</p>
                    </Card>
                    <Card
                      className="p-3 md:p-4 hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() =>
                        sendQuickPrompt("Simplifique esta linguagem complexa para mim: [cole o texto difícil]")
                      }
                    >
                      <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-primary mb-2" />
                      <h3 className="font-semibold text-sm">Simplificar</h3>
                      <p className="text-xs text-muted-foreground">Torne conteúdos difíceis mais fáceis</p>
                    </Card>
                  </div>
                </Card>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="space-y-1 group">
                <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <span className="text-xs text-muted-foreground px-2">{message.timestamp.toLocaleTimeString()}</span>
                </div>
                <div className={`flex gap-2 md:gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "user" ? (
                    <div className="flex gap-2 md:gap-3 max-w-[85%] md:max-w-[80%] flex-row-reverse">
                      <div className="flex-shrink-0">
                        <div className="w-7 h-7 md:w-8 md:h-8 bg-primary rounded-full flex items-center justify-center">
                          <User className="h-3 w-3 md:h-4 md:w-4 text-primary-foreground" />
                        </div>
                      </div>
                      <div className="relative">
                        <Card className="p-2 md:p-3 bg-user-message text-user-message-foreground border-user-message-border">
                          <p className="whitespace-pre-wrap text-sm md:text-base">{message.content}</p>
                        </Card>
                        <div className="absolute top-2 -left-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <CopyButton text={message.content} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 md:gap-3 w-full relative group">
                      <div className="flex-shrink-0">
                        <div className="w-7 h-7 md:w-8 md:h-8 bg-secondary rounded-full flex items-center justify-center">
                          <Bot className="h-3 w-3 md:h-4 md:w-4 text-secondary-foreground" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm md:text-base">
                          <FormattedText text={message.content} />
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CopyButton text={message.content} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {}
            {isLoading && (
              <div className="flex gap-2 md:gap-3 justify-start">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-secondary rounded-full flex items-center justify-center">
                  <Bot className="h-3 w-3 md:h-4 md:w-4 text-secondary-foreground" />
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-current rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-current rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>
      </div>

      {}
      <div className="shrink-0 border-t border-border bg-background sticky bottom-0">
        {uploadedFiles.length > 0 && (
          <div className="p-3 border-b border-border">
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-secondary px-2 py-1 rounded-full text-xs md:text-sm"
                >
                  <span className="truncate max-w-[120px] md:max-w-none">{file.name}</span>
                  <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => removeFile(index)}>
                    ×
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                <span>{uploadedFiles.length}/5</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 md:p-4">
          <div className="flex gap-2 items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 md:h-10 md:w-10 shrink-0 bg-transparent"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Digite sua pergunta, cole um texto para resumir ou peça ajuda para escrever..."
              disabled={isLoading}
              className="flex-1 min-h-[36px] max-h-[200px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground placeholder:truncate placeholder:whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 custom-scrollbar-textarea"
              rows={1}
            />

            <Button
              onClick={sendMessage}
              disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)}
              className="h-9 w-9 md:h-10 md:w-10 shrink-0"
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
