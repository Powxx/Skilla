"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { getConversations, getMessages, sendMessage, markAsRead, getAuthorizedContacts, getChatRetentionDays } from "@/app/actions/chat";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Send, UserCircle, Plus, X, MessageSquare, Check, CheckCheck, Loader2 } from "lucide-react";

export default function ChatClient() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [showContacts, setShowContacts] = useState(false);
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);

  const [retentionDays, setRetentionDays] = useState<number>(7);
  const [showBanner, setShowBanner] = useState<boolean>(true);

  useEffect(() => {
    loadConversations();
    getChatRetentionDays().then(setRetentionDays);
    const timer = setTimeout(() => {
      setShowBanner(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  // Polling intelligent : suspendu si l'onglet est masqué
  useEffect(() => {
    if (!selectedConversation?.id) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      loadMessages(selectedConversation.id);
      loadConversations();
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (selectedConversation) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (showContacts) {
      const timer = setTimeout(() => {
        getAuthorizedContacts(search).then(setContacts);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [search, showContacts]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      console.error("[loadConversations] Error:", err);
    }
  };

  const loadMessages = async (conversationId: string) => {
    if (!conversationId) return;
    try {
      const msgs = await getMessages(conversationId);
      setMessages(msgs);
      await markAsRead(conversationId);
    } catch (err) {
      console.error("[loadMessages] Error:", err);
    }
  };

  // Envoi optimiste immédiat
  const handleSendMessage = async () => {
    const textToSend = content.trim();
    if (!textToSend || !selectedConversation) return;

    const currentUserId = (session?.user as any)?.id || "me";
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      content: textToSend,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      sender: {
        firstName: session?.user?.name?.split(" ")[0] || "Moi",
        lastName: ""
      }
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setContent("");
    setLoading(true);

    try {
      const newMsg = await sendMessage(selectedConversation.otherParticipant.id, textToSend);
      const targetConvId = selectedConversation.id || newMsg.conversationId;
      if (!selectedConversation.id) {
        setSelectedConversation((prev: any) => prev ? { ...prev, id: newMsg.conversationId } : null);
      }
      await loadMessages(targetConvId);
      await loadConversations();
    } catch (e: any) {
      // Annulation du message optimiste en cas d'échec
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setContent(textToSend);
      alert("Erreur lors de l'envoi du message : " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full min-h-[560px] flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Bandeau d'information sur la suppression automatique */}
      {showBanner && (
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between shrink-0 transition-all duration-300 animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <span className="text-sm">⏳</span>
            <span>
              Rappel : Les messages sont temporaires et automatiquement supprimés au bout de <strong>{retentionDays} jour{retentionDays > 1 ? 's' : ''}</strong>.
            </span>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-amber-700 hover:text-amber-950 p-1 rounded-lg hover:bg-amber-100 transition shrink-0"
            title="Fermer le rappel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Sidebar - Liste des discussions avec pastille non lue */}
        <div className={`w-full lg:w-80 xl:w-96 lg:min-w-[320px] border-b lg:border-b-0 lg:border-r border-slate-100 flex-shrink-0 ${selectedConversation && !showContacts ? 'hidden lg:flex' : 'flex'} flex-col min-h-0`}>
          <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
            <h2 className="font-bold text-lg text-slate-900">Discussions</h2>
            <button 
              onClick={() => setShowContacts(!showContacts)} 
              className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-700 transition"
              title={showContacts ? "Voir les discussions" : "Nouveau message"}
            >
              {showContacts ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </button>
          </div>
          
          {showContacts ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 min-h-0">
              <input 
                autoFocus
                placeholder="Rechercher un contact..."
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {contacts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Aucun contact trouvé.</p>
              ) : (
                contacts.map(c => (
                  <button key={c.id} onClick={() => { 
                    setShowContacts(false);
                    setSelectedConversation({ otherParticipant: c });
                    setMessages([]);
                  }} className="w-full p-2.5 hover:bg-slate-50 rounded-xl text-left transition border border-transparent hover:border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-sm">{c.firstName} {c.lastName}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">{c.role}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 divide-y divide-slate-50">
              {conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Aucune discussion</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
                    Démarrez une nouvelle conversation avec un enseignant, élève ou responsable.
                  </p>
                  <button 
                    onClick={() => setShowContacts(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-sm"
                  >
                    Nouveau message
                  </button>
                </div>
              ) : (
                conversations.map(conv => {
                  const hasUnread = (conv.unreadCount || 0) > 0;
                  return (
                    <button 
                      key={conv.id} 
                      onClick={() => { setSelectedConversation(conv); loadMessages(conv.id); }} 
                      className={`w-full p-4 text-left flex items-center gap-3 hover:bg-slate-50/80 transition relative ${selectedConversation?.id === conv.id ? 'bg-blue-50/50' : ''} ${hasUnread ? 'bg-blue-50/20' : ''}`}
                      title={conv.lastMessage?.content || "Aucun message"}
                    >
                      <div className="relative shrink-0">
                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                          {conv.otherParticipant?.firstName?.[0] || "?"}
                        </div>
                        {hasUnread && (
                          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-blue-600 rounded-full border-2 border-white ring-1 ring-blue-500/30" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className={`truncate text-sm ${hasUnread ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`}>
                            {conv.otherParticipant?.firstName} {conv.otherParticipant?.lastName}
                          </div>
                          {hasUnread && (
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-blue-600 text-white shrink-0 shadow-xs">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className={`text-xs truncate mt-0.5 ${hasUnread ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                          {conv.lastMessage?.content || "Aucun message"}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Zone de discussion principale */}
        <div className={`flex-1 flex flex-col bg-slate-50/50 min-w-0 min-h-0 ${selectedConversation || showContacts ? 'flex' : 'hidden lg:flex'}`}>
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => setSelectedConversation(null)} className="lg:hidden p-1 mr-1 rounded-full hover:bg-slate-100">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                  </button>
                  <UserCircle className="h-9 w-9 text-slate-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm leading-tight truncate">
                      {selectedConversation.otherParticipant?.firstName} {selectedConversation.otherParticipant?.lastName}
                    </div>
                  </div>
                </div>
                {selectedConversation.otherParticipant?.role && (
                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full shrink-0">
                    {selectedConversation.otherParticipant.role}
                  </span>
                )}
              </div>
              
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-3.5 min-h-[200px]">
                {messages.map(m => {
                  const isMe = m.senderId !== selectedConversation.otherParticipant?.id;
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-sm shadow-xs break-words whitespace-pre-wrap select-text leading-relaxed ${
                        isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                      } ${m.isOptimistic ? 'opacity-75 ring-1 ring-blue-400' : ''}`}>
                        {m.content}
                        <div className={`text-[10px] mt-1.5 flex items-center justify-between gap-2 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                          <span>{format(new Date(m.createdAt), "HH:mm", { locale: fr })}</span>
                          {isMe && (
                            <span className="inline-flex items-center gap-0.5">
                              {m.isOptimistic ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-end gap-2 shrink-0">
                <textarea 
                  rows={1}
                  value={content} 
                  onChange={e => setContent(e.target.value)} 
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 border border-slate-200 p-3 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 max-h-32 min-h-[46px] resize-none text-sm custom-scrollbar leading-relaxed" 
                  placeholder="Écrivez un message (Entrée pour envoyer, Maj+Entrée pour saut de ligne)..." 
                />
                <button 
                  onClick={handleSendMessage} 
                  disabled={loading || !content.trim()} 
                  className="bg-blue-600 text-white p-3 rounded-2xl hover:bg-blue-700 transition disabled:opacity-50 shrink-0 h-[46px] w-[46px] flex items-center justify-center shadow-sm"
                  title="Envoyer"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 font-medium">
              <MessageSquare className="h-12 w-12 text-slate-300 mb-3" />
              <p>Sélectionnez une discussion pour afficher les messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
