import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, User, Maximize2, Minimize2, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import Markdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: any;
}

export const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState(auth.currentUser);

  const [showConfirmClear, setShowConfirmClear] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chatMessages'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((d) => {
        msgs.push({ id: d.id, ...d.data() } as Message);
      });
      setMessages(msgs);
      scrollToBottom();
    }, (error) => {
      console.error("Error fetching messages:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isFullScreen]);

  const handleNewChat = () => {
    if (!user) return;
    setShowConfirmClear(true);
  };

  const confirmClearChat = async () => {
    if (!user) return;
    setShowConfirmClear(false);
    for (const msg of messages) {
      try {
        await deleteDoc(doc(db, 'chatMessages', msg.id));
      } catch (error) {
        console.error("Error deleting message:", error);
      }
    }
    setMessages([]);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || isLoading) return;

    const userText = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Save user message
      await addDoc(collection(db, 'chatMessages'), {
        userId: user.uid,
        role: 'user',
        text: userText,
        createdAt: serverTimestamp()
      });

      // Call OpenRouter API
      const formattedMessages = messages.map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.text || " "
      }));

      // Gemini requires alternating roles. Let's ensure we don't have consecutive user or assistant messages.
      const collapsedMessages: {role: string, content: string}[] = [];
      for (const msg of formattedMessages) {
        if (collapsedMessages.length > 0 && collapsedMessages[collapsedMessages.length - 1].role === msg.role) {
          collapsedMessages[collapsedMessages.length - 1].content += "\n\n" + msg.content;
        } else {
          collapsedMessages.push(msg);
        }
      }

      if (collapsedMessages.length > 0 && collapsedMessages[collapsedMessages.length - 1].role === 'user') {
        collapsedMessages[collapsedMessages.length - 1].content += "\n\n" + userText;
      } else {
        collapsedMessages.push({ role: 'user', content: userText });
      }

      const API_KEY = process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY;
      console.log("API_KEY:", API_KEY ? "defined" : "undefined", "GEMINI:", process.env.GEMINI_API_KEY ? "defined" : "undefined", "OPENROUTER:", process.env.OPENROUTER_API_KEY ? "defined" : "undefined");
      const IS_OPENROUTER = !!process.env.OPENROUTER_API_KEY || (API_KEY?.startsWith('sk-or-') ?? false);
      const BASE_URL = IS_OPENROUTER ? "https://openrouter.ai/api/v1" : "https://generativelanguage.googleapis.com/v1beta";
      const model = IS_OPENROUTER ? "openrouter/free" : "gemini-3-flash-preview";
      const url = IS_OPENROUTER ? `${BASE_URL}/chat/completions` : `${BASE_URL}/models/${model}:generateContent?key=${API_KEY}`;

      let modelText = "";

      if (IS_OPENROUTER) {
        const openRouterMessages = [
          {
            role: 'system',
            content: "Você é um assistente educacional amigável e inteligente do QuizGen AI. Seu objetivo é ajudar os usuários a aprenderem novos conhecimentos, responderem dúvidas sobre tópicos variados e darem dicas de estudo. Seja claro, conciso e encorajador."
          },
          ...collapsedMessages
        ];

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'QuizGen AI'
          },
          body: JSON.stringify({
            model: model,
            messages: openRouterMessages
          })
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("OpenRouter API error details:", errorText);
          throw new Error(`OpenRouter API error: ${res.status} - ${errorText}`);
        }

        const data = await res.json();
        modelText = data.choices[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";
      } else {
        // Gemini API
        const geminiContents = collapsedMessages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: "Você é um assistente educacional amigável e inteligente do QuizGen AI. Seu objetivo é ajudar os usuários a aprenderem novos conhecimentos, responderem dúvidas sobre tópicos variados e darem dicas de estudo. Seja claro, conciso e encorajador." }] },
            contents: geminiContents
          })
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Gemini API error details:", errorText);
          throw new Error(`Gemini API error: ${res.status} - ${errorText}`);
        }

        const data = await res.json();
        modelText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui gerar uma resposta.";
      }

      // Save model message
      await addDoc(collection(db, 'chatMessages'), {
        userId: user.uid,
        role: 'model',
        text: modelText,
        createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error("Error sending message:", error);
      // Fallback error message
      await addDoc(collection(db, 'chatMessages'), {
        userId: user.uid,
        role: 'model',
        text: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.",
        createdAt: serverTimestamp()
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 hover:scale-105 transition-all z-50 ${isOpen ? 'hidden' : 'flex'}`}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bg-white shadow-2xl flex flex-col z-50 overflow-hidden border border-slate-200 transition-all duration-300 ${
              isFullScreen 
                ? 'inset-0 w-full h-full rounded-none' 
                : 'bottom-6 right-6 w-full max-w-[350px] sm:max-w-[400px] h-[500px] max-h-[80vh] rounded-2xl'
            }`}
          >
            {/* Header */}
            <div className="bg-indigo-600 p-4 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6" />
                <h3 className="font-bold">QuizGen Tutor</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleNewChat} 
                  className="text-indigo-100 hover:text-white transition-colors p-1"
                  title="Novo Chat"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsFullScreen(!isFullScreen)} 
                  className="text-indigo-100 hover:text-white transition-colors p-1 hidden sm:block"
                  title={isFullScreen ? "Minimizar" : "Tela Cheia"}
                >
                  {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="text-indigo-100 hover:text-white transition-colors p-1"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmClear && (
              <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-[60] p-4">
                <div className="bg-white p-6 rounded-2xl shadow-xl max-w-[90%] text-center">
                  <h4 className="text-lg font-bold text-slate-800 mb-2">Novo Chat</h4>
                  <p className="text-sm text-slate-600 mb-6">Tem certeza que deseja apagar o histórico deste chat e começar um novo?</p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setShowConfirmClear(false)}
                      className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmClearChat}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
                    >
                      Apagar e Começar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 mt-10">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-50 text-indigo-400" />
                  <p>Olá! Sou seu tutor de IA. Como posso ajudar nos seus estudos hoje?</p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'}`}>
                    <div className="flex items-center gap-2 mb-1 opacity-70 text-xs">
                      {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                      <span>{msg.role === 'user' ? 'Você' : 'Tutor'}</span>
                    </div>
                    <div className="text-sm prose prose-sm prose-indigo max-w-none">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm p-3 shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span className="text-sm text-slate-500">Pensando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-slate-100">
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Faça uma pergunta..."
                  className="flex-1 px-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl outline-none transition-all text-sm"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
