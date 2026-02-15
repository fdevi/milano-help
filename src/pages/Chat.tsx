import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ChatList from "@/components/chat/ChatList";
import ChatDetail from "@/components/chat/ChatDetail";
import { useIsMobile } from "@/hooks/use-mobile";

// Mock data
const MOCK_USER_ID = "me-123";

export interface MockConversation {
  id: string;
  otherUser: { id: string; nome: string; cognome: string; quartiere: string };
  ultimoMessaggio: string;
  ultimoAggiornamento: string;
  nonLetti: number;
}

export interface MockMessage {
  id: string;
  mittenteId: string;
  testo: string;
  createdAt: string;
  letto: boolean;
}

const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    id: "conv-1",
    otherUser: { id: "user-1", nome: "Marco", cognome: "Rossi", quartiere: "Navigli" },
    ultimoMessaggio: "Ciao, sei disponibile per domani pomeriggio?",
    ultimoAggiornamento: new Date(Date.now() - 5 * 60000).toISOString(),
    nonLetti: 2,
  },
  {
    id: "conv-2",
    otherUser: { id: "user-2", nome: "Giulia", cognome: "Bianchi", quartiere: "Isola" },
    ultimoMessaggio: "Grazie mille per l'aiuto!",
    ultimoAggiornamento: new Date(Date.now() - 3600000).toISOString(),
    nonLetti: 0,
  },
  {
    id: "conv-3",
    otherUser: { id: "user-3", nome: "Luca", cognome: "Verdi", quartiere: "Brera" },
    ultimoMessaggio: "A che ora ci vediamo?",
    ultimoAggiornamento: new Date(Date.now() - 86400000).toISOString(),
    nonLetti: 1,
  },
];

const MOCK_MESSAGES: Record<string, MockMessage[]> = {
  "conv-1": [
    { id: "m1", mittenteId: "user-1", testo: "Ciao! Ho visto il tuo annuncio per le ripetizioni di matematica", createdAt: new Date(Date.now() - 3600000).toISOString(), letto: true },
    { id: "m2", mittenteId: MOCK_USER_ID, testo: "Ciao Marco! Sì, sono disponibile. Che argomenti ti servono?", createdAt: new Date(Date.now() - 3500000).toISOString(), letto: true },
    { id: "m3", mittenteId: "user-1", testo: "Analisi 1, integrali e derivate. Sono al primo anno di ingegneria", createdAt: new Date(Date.now() - 3000000).toISOString(), letto: true },
    { id: "m4", mittenteId: MOCK_USER_ID, testo: "Perfetto, posso aiutarti. Di solito faccio lezioni da 1.5h", createdAt: new Date(Date.now() - 600000).toISOString(), letto: true },
    { id: "m5", mittenteId: "user-1", testo: "Ottimo! Quanto costa una lezione?", createdAt: new Date(Date.now() - 360000).toISOString(), letto: false },
    { id: "m6", mittenteId: "user-1", testo: "Ciao, sei disponibile per domani pomeriggio?", createdAt: new Date(Date.now() - 300000).toISOString(), letto: false },
  ],
  "conv-2": [
    { id: "m7", mittenteId: MOCK_USER_ID, testo: "Ciao Giulia, come è andato il trasloco?", createdAt: new Date(Date.now() - 7200000).toISOString(), letto: true },
    { id: "m8", mittenteId: "user-2", testo: "Tutto bene, grazie! I mobili sono arrivati intatti", createdAt: new Date(Date.now() - 5400000).toISOString(), letto: true },
    { id: "m9", mittenteId: "user-2", testo: "Grazie mille per l'aiuto!", createdAt: new Date(Date.now() - 3600000).toISOString(), letto: true },
  ],
  "conv-3": [
    { id: "m10", mittenteId: "user-3", testo: "Ciao, possiamo organizzare per la spesa condivisa?", createdAt: new Date(Date.now() - 172800000).toISOString(), letto: true },
    { id: "m11", mittenteId: MOCK_USER_ID, testo: "Certo! Facciamo sabato mattina al mercato di Brera?", createdAt: new Date(Date.now() - 100000000).toISOString(), letto: true },
    { id: "m12", mittenteId: "user-3", testo: "A che ora ci vediamo?", createdAt: new Date(Date.now() - 86400000).toISOString(), letto: false },
  ],
};

export { MOCK_USER_ID, MOCK_CONVERSATIONS, MOCK_MESSAGES };

const Chat = () => {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState(MOCK_MESSAGES);

  const activeConversation = conversationId
    ? MOCK_CONVERSATIONS.find((c) => c.id === conversationId)
    : null;

  const handleSend = (text: string) => {
    if (!conversationId) return;
    const newMsg: MockMessage = {
      id: `m-${Date.now()}`,
      mittenteId: MOCK_USER_ID,
      testo: text,
      createdAt: new Date().toISOString(),
      letto: false,
    };
    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMsg],
    }));
  };

  const showList = !isMobile || !conversationId;
  const showDetail = !isMobile || !!conversationId;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 pt-16 flex">
        {/* Conversation list */}
        {showList && (
          <div className={`${isMobile ? "w-full" : "w-80 lg:w-96"} border-r bg-card flex flex-col`}>
            <ChatList
              conversations={MOCK_CONVERSATIONS}
              activeId={conversationId}
              onSelect={(id) => navigate(`/chat/${id}`)}
            />
          </div>
        )}

        {/* Chat detail */}
        {showDetail && (
          <div className="flex-1 flex flex-col">
            {activeConversation ? (
              <ChatDetail
                conversation={activeConversation}
                messages={messages[conversationId!] || []}
                currentUserId={MOCK_USER_ID}
                onSend={handleSend}
                onBack={isMobile ? () => navigate("/chat") : undefined}
              />
            ) : (
              !isMobile && (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <p className="text-lg font-medium">Seleziona una conversazione</p>
                    <p className="text-sm mt-1">Scegli una chat dalla lista per iniziare</p>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
