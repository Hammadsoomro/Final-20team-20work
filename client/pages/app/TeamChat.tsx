import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function TeamChat() {
  const [messages, setMessages] = useState<string[]>(() => {
    const raw = localStorage.getItem("team_chat");
    return raw ? (JSON.parse(raw) as string[]) : ["Welcome to Team Chat!"];
  });
  const [input, setInput] = useState("");
  const { user } = useAuth();

  const send = () => {
    if (!input.trim()) return;
    const next = [...messages, `${user?.name ?? "User"}: ${input.trim()}`];
    setMessages(next);
    localStorage.setItem("team_chat", JSON.stringify(next));
    setInput("");
  };

  return (
    <div className="grid h-[60vh] grid-rows-[1fr_auto] rounded-lg border overflow-hidden">
      <div className="space-y-2 p-4 overflow-y-auto bg-gradient-to-b from-background to-background/60">
        {messages.map((m, i) => (
          <div key={i} className="rounded-md bg-secondary/50 px-3 py-2 text-sm">
            {m}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t p-3">
        <Input
          placeholder="Type message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button onClick={send}>
          <MessageCircle className="mr-1" /> Send
        </Button>
      </div>
    </div>
  );
}
