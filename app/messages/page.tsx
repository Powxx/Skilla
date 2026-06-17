import ChatClient from "./chat-client";
import { Suspense } from "react";

export default function MessagesPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <ChatClient />
    </Suspense>
  );
}
