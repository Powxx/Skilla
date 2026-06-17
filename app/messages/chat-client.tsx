"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getConversations, getMessages, sendMessage, markAsRead } from "@/app/actions/chat";

export default function ChatClient() {
  const searchParams = useSearchParams();
  const recipientId = searchParams.get("recipientId");
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

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
    if (!content.trim() || !recipientId) return;
    setLoading(true);
    try {
      await sendMessage(recipientId, content);
      setContent("");
      if (selectedConversation) {
          loadMessages(selectedConversation.id);
      } else {
          loadConversations();
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <h1 className="text-xl font-bold mb-4">Messages</h1>
      <div className="flex-1 border rounded-lg overflow-hidden flex">
        <div className="w-1/3 border-r p-4 overflow-y-auto">
          {conversations.map(conv => (
            <button key={conv.id} onClick={() => { setSelectedConversation(conv); loadMessages(conv.id); }} className="w-full text-left p-2 border-b">
              {conv.otherParticipant.firstName} {conv.otherParticipant.lastName}
            </button>
          ))}
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4 overflow-y-auto">
            {messages.map(m => (
              <div key={m.id} className={`p-2 my-2 rounded ${m.senderId === 'currentUserId' ? 'bg-blue-100 self-end' : 'bg-gray-100 self-start'}`}>
                {m.content}
              </div>
            ))}
          </div>
          <div className="p-4 border-t flex gap-2">
            <input value={content} onChange={e => setContent(e.target.value)} className="flex-1 border p-2 rounded" placeholder="Message..." />
            <button onClick={handleSendMessage} disabled={loading} className="bg-blue-600 text-white p-2 rounded">Envoyer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
