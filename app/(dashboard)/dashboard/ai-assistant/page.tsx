"use client"

import { useState, useRef, useEffect } from "react"
import { useAuthViewModel } from "@/hooks/viewmodels"
import { generateQueryPlan } from "@/lib/ai/rag-query-planner"
import { retrieveData } from "@/lib/ai/rag-data-retriever"
import { generateResponse } from "@/lib/ai/rag-response-generator"
import { ChatMessage, TypingIndicator } from "@/components/ai-assistant/chat-message"
import { GlassCard } from "@/components/ui/glass-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Bot, MessageSquare, Trash2, Plus, Send } from "lucide-react"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { collection, addDoc, updateDoc, doc, query, where, orderBy, limit as firestoreLimit, getDocs, Timestamp, deleteDoc } from "firebase/firestore"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Conversation {
  id: string
  userId: string
  tenantId: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  lastMessageAt: Date
}

export default function AIAssistantPage() {
  const { user } = useAuthViewModel()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  useEffect(() => {
    if (!user) return
    
    const loadConversations = async () => {
      try {
        const q = query(
          collection(db, "ai_conversations"),
          where("tenantId", "==", user.tenantId),
          where("userId", "==", user.id),
          orderBy("lastMessageAt", "desc"),
          firestoreLimit(50)
        )
        
        const snapshot = await getDocs(q)
        const convs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          lastMessageAt: doc.data().lastMessageAt?.toDate() || new Date(),
        })) as Conversation[]
        
        setConversations(convs)
        
        if (convs.length > 0 && !currentConversationId) {
          setCurrentConversationId(convs[0].id)
          setMessages(convs[0].messages)
        }
      } catch (error) {
        console.error('Error loading conversations:', error)
      }
    }
    
    loadConversations()
  }, [user])

  const handleNewConversation = async () => {
    if (!user) return
    
    try {
      const docRef = await addDoc(collection(db, "ai_conversations"), {
        userId: user.id,
        tenantId: user.tenantId,
        title: "Nuova conversazione",
        messages: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastMessageAt: Timestamp.now(),
      })
      
      const newConv: Conversation = {
        id: docRef.id,
        userId: user.id,
        tenantId: user.tenantId,
        title: "Nuova conversazione",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: new Date(),
      }
      
      setConversations(prev => [newConv, ...prev])
      setCurrentConversationId(newConv.id)
      setMessages([])
    } catch (error) {
      console.error('Error creating conversation:', error)
      toast.error('Errore creazione conversazione')
    }
  }

  const saveMessageToFirestore = async (newMessages: Message[], convId: string) => {
    if (!user || !convId) return
    
    try {
      const currentConv = conversations.find(c => c.id === convId)
      const title = currentConv?.title === "Nuova conversazione" && newMessages.length > 0
        ? newMessages[0].content.substring(0, 50) + (newMessages[0].content.length > 50 ? '...' : '')
        : currentConv?.title || "Nuova conversazione"
      
      await updateDoc(doc(db, "ai_conversations", convId), {
        messages: newMessages,
        title,
        updatedAt: Timestamp.now(),
        lastMessageAt: Timestamp.now(),
      })
      
      setConversations(prev => prev.map(c => 
        c.id === convId 
          ? { ...c, messages: newMessages, title, updatedAt: new Date(), lastMessageAt: new Date() }
          : c
      ))
    } catch (error) {
      console.error('Error saving message:', error)
    }
  }

  const handleDeleteConversation = async () => {
    if (!currentConversationId) return
    
    try {
      await deleteDoc(doc(db, "ai_conversations", currentConversationId))
      setConversations(prev => prev.filter(c => c.id !== currentConversationId))
      setCurrentConversationId(null)
      setMessages([])
      toast.success('Conversazione eliminata')
    } catch (error) {
      console.error('Error deleting conversation:', error)
      toast.error('Errore eliminazione conversazione')
    }
  }

  const handleSelectConversation = (convId: string) => {
    const conv = conversations.find(c => c.id === convId)
    if (conv) {
      setCurrentConversationId(convId)
      setMessages(conv.messages)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || !user) return
    
    let conversationId = currentConversationId
    
    if (!conversationId) {
      try {
        const docRef = await addDoc(collection(db, "ai_conversations"), {
          userId: user.id,
          tenantId: user.tenantId,
          title: "Nuova conversazione",
          messages: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          lastMessageAt: Timestamp.now(),
        })
        
        conversationId = docRef.id
        setCurrentConversationId(conversationId)
        
        const newConv: Conversation = {
          id: docRef.id,
          userId: user.id,
          tenantId: user.tenantId,
          title: "Nuova conversazione",
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastMessageAt: new Date(),
        }
        
        setConversations(prev => [newConv, ...prev])
      } catch (error) {
        console.error('Error creating conversation:', error)
        toast.error('Errore creazione conversazione')
        return
      }
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }
    
    const updatedMessagesWithUser = [...messages, userMessage]
    setMessages(updatedMessagesWithUser)
    setInput('')
    setIsLoading(true)
    
    await saveMessageToFirestore(updatedMessagesWithUser, conversationId)
    
    try {
      const planResult = await generateQueryPlan({
        userMessage: userMessage.content,
        tenantId: user.tenantId,
        userId: user.id,
      })
      
      if (!planResult.success || !planResult.queryPlan) {
        throw new Error(planResult.error || 'Errore nel query planning')
      }
      
      const dataResult = await retrieveData(planResult.queryPlan)
      
      if (!dataResult.success) {
        throw new Error(dataResult.error || 'Errore nel recupero dati')
      }
      
      const responseResult = await generateResponse({
        userMessage: userMessage.content,
        retrievedData: dataResult.data,
        intent: planResult.intent,
        context: {
          collectionQueried: dataResult.collectionQueried,
          recordCount: dataResult.count,
        },
      })
      
      if (!responseResult.success) {
        throw new Error(responseResult.error || 'Errore nella generazione risposta')
      }
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseResult.response,
        timestamp: new Date(),
      }
      
      const finalMessages = [...updatedMessagesWithUser, aiMessage]
      setMessages(finalMessages)
      await saveMessageToFirestore(finalMessages, conversationId)
      
      toast.success('Risposta generata', {
        description: `${responseResult.tokensUsed} token utilizzati`
      })
      
    } catch (error) {
      console.error('RAG error:', error)
      toast.error('Errore nell\'AI Assistant', {
        description: error instanceof Error ? error.message : 'Errore sconosciuto'
      })
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Mi dispiace, si è verificato un errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}. Riprova più tardi.`,
        timestamp: new Date(),
      }
      
      const errorMessages = [...updatedMessagesWithUser, errorMessage]
      setMessages(errorMessages)
      await saveMessageToFirestore(errorMessages, conversationId)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-slate-600 dark:text-slate-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              AI Assistant
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Fai domande sui tuoi progetti, task e contenuti
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 h-[calc(100vh-12rem)]">
        <div className="md:col-span-1">
          <GlassCard variant="elevated" padding="sm" className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200/30 dark:border-gray-700/30">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Conversazioni
              </h2>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleNewConversation}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              {conversations.length === 0 ? (
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nessuna conversazione</p>
                  <p className="text-xs mt-1">Inizia chattando!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        currentConversationId === conv.id
                          ? 'bg-purple-500/20 border border-purple-500/30'
                          : 'hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {conv.title || 'Nuova conversazione'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {conv.messages?.length || 0} messaggi
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </GlassCard>
        </div>

        <div className="md:col-span-3 lg:col-span-4">
          <GlassCard variant="elevated" padding="none" className="h-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200/30 dark:border-gray-700/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      Assistente AI
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Online • Pronto ad aiutarti
                    </p>
                  </div>
                </div>
                {currentConversationId && (
                  <Button size="sm" variant="ghost" onClick={handleDeleteConversation}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <Bot className="h-10 w-10 text-slate-600 dark:text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Inizia una conversazione
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Fai domande sui tuoi progetti, task, clienti o contenuti editoriali.
                      L'AI analizzerà i dati e ti darà risposte precise.
                    </p>
                    <div className="space-y-2 text-sm text-left bg-gray-50/50 dark:bg-gray-800/50 rounded-lg p-4">
                      <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Esempi:</p>
                      <p className="text-gray-600 dark:text-gray-400">• "Mostra i task in ritardo"</p>
                      <p className="text-gray-600 dark:text-gray-400">• "Analizza i progetti di [cliente]"</p>
                      <p className="text-gray-600 dark:text-gray-400">• "Contenuti Instagram questo mese"</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      role={message.role}
                      content={message.content}
                      timestamp={message.timestamp}
                    />
                  ))}
                  
                  {isLoading && <TypingIndicator />}
                </div>
              )}
            </ScrollArea>

            <div className="px-6 py-4 border-t border-gray-200/30 dark:border-gray-700/30">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Fai una domanda sui tuoi progetti, task o contenuti..."
                  disabled={isLoading || !user}
                  className="flex-1 px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/30 dark:border-gray-700/30 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 max-h-32"
                  rows={1}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || !user}
                  className="px-4 py-3 bg-righello-pink hover:bg-righello-pink-dark disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Premi Enter per inviare, Shift+Enter per nuova riga
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
