"use client";

import { useState, useEffect, useRef } from "react";
import { getConversations, getMessages, sendMessage, markAsRead, getAuthorizedContacts } from "@/app/actions/chat";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Send, UserCircle, Plus } from "lucide-react";

export default function ChatClient() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [showContacts, setShowContacts] = useState(false);
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
        scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (showContacts) {
        getAuthorizedContacts(search).then(setContacts);
    }
  }, [search, showContacts]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = async () => {
    const data = await getConversations();
    setConversations(data);
  };

  const loadMessages = async (conversationId: string) => {
    const msgs = await getMessages(conversationId);
    setMessages(msgs);
    await markAsRead(conversationId);
  };

  const handleSendMessage = async () => {
    if (!content.trim() || !selectedConversation) return;
    setLoading(true);
    try {
      await sendMessage(selectedConversation.otherParticipant.id, content);
      setContent("");
      loadMessages(selectedConversation.id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-slate-100 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold text-lg">Discussions</h2>
            <button onClick={() => setShowContacts(!showContacts)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                <Plus className="h-5 w-5" />
            </button>
        </div>
        
        {showContacts ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <input 
                    autoFocus
                    placeholder="Rechercher un contact..."
                    className="w-full p-2 border rounded-xl"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                {contacts.map(c => (
                    <button key={c.id} onClick={() => { 
                        setShowContacts(false);
                        // Créer la conversation en envoyant un message vide ou en laissant l'utilisateur envoyer le premier message
                        // Puisque sendMessage nécessite un contenu, nous allons simplement sélectionner le destinataire
                        // et attendre que l'utilisateur tape un message.
                        setSelectedConversation({ otherParticipant: c });
                        setMessages([]);
                    }} className="w-full p-2 hover:bg-slate-50 rounded text-left">
                        {c.firstName} {c.lastName} <span className="text-xs text-slate-400">({c.role})</span>
                    </button>
                ))}
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto">
              {conversations.map(conv => (
                <button 
                    key={conv.id} 
                    onClick={() => { setSelectedConversation(conv); loadMessages(conv.id); }} 
                    className={`w-full p-4 text-left border-b border-slate-50 flex items-center gap-3 hover:bg-slate-50 transition ${selectedConversation?.id === conv.id ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                    {conv.otherParticipant.firstName[0]}
                  </div>
                  <div>
                    <div className="font-bold">{conv.otherParticipant.firstName} {conv.otherParticipant.lastName}</div>
                    <div className="text-xs text-slate-400 truncate">{conv.lastMessage?.content || "Aucun message"}</div>
                  </div>
                </button>
              ))}
            </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50/50">
        {selectedConversation ? (
            <>
                <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-3">
                    <UserCircle className="h-8 w-8 text-slate-300" />
                    <span className="font-bold">{selectedConversation.otherParticipant.firstName} {selectedConversation.otherParticipant.lastName}</span>
                </div>
                
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {messages.map(m => (
                    <div key={m.id} className={`flex ${m.senderId !== selectedConversation.otherParticipant.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm ${m.senderId !== selectedConversation.otherParticipant.id ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                            {m.content}
                            <div className={`text-[10px] mt-1 opacity-70 ${m.senderId !== selectedConversation.otherParticipant.id ? 'text-blue-100' : 'text-slate-400'}`}>
                                {format(new Date(m.createdAt), "HH:mm", { locale: fr })}
                            </div>
                        </div>
                    </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
                    <input 
                        value={content} 
                        onChange={e => setContent(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 border border-slate-200 p-3 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                        placeholder="Écrivez un message..." 
                    />
                    <button onClick={handleSendMessage} disabled={loading || !content.trim()} className="bg-blue-600 text-white p-3 rounded-2xl hover:bg-blue-700 transition disabled:opacity-50">
                        <Send className="h-5 w-5" />
                    </button>
                </div>
            </>
        ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">Sélectionnez une conversation</div>
        )}
      </div>
    </div>
  );
}
