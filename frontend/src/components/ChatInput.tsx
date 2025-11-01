import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Lock } from "lucide-react";
import { useState } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void> | void;
}

const ChatInput = ({ onSendMessage }: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    if (message.trim()) {
      try {
        await onSendMessage(message);
        setMessage("");
      } catch (e) {
        // noop; parent handles toasts
      }
    }
  };

  return (
    <div className="border-t border-border/50 bg-card/30 backdrop-blur-sm p-4">
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your encrypted message..."
            className="pr-10 bg-background/50 border-primary/30 focus:border-primary glow-border"
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
          />
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cipher" />
        </div>
        <Button
          onClick={handleSend}
          size="icon"
          className="bg-primary hover:bg-primary/80 glow-border"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
        <Lock className="h-3 w-3 text-cipher" />
        Messages are end-to-end encrypted and stored on-chain
      </p>
    </div>
  );
};

export default ChatInput;
