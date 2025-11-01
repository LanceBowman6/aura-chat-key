import { Lock, Unlock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface MessageBubbleProps {
  message: string;
  isOwn: boolean;
  isEncrypted?: boolean;
  onDecrypt?: (messageId: number) => Promise<void>;
  messageId?: number;
}

const MessageBubble = ({ 
  message, 
  isOwn, 
  isEncrypted = false, 
  onDecrypt,
  messageId
}: MessageBubbleProps) => {
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [decryptedMessage, setDecryptedMessage] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleDecrypt = async () => {
    if (!onDecrypt || !isEncrypted || isDecrypted || !messageId) return;
    
    setIsDecrypting(true);
    try {
      // Call parent component's decrypt function
      await onDecrypt(messageId);
      setIsDecrypted(true);
    } catch (error) {
      console.error('Decryption failed:', error);
      // Error handling can be added here
    } finally {
      setIsDecrypting(false);
    }
  };

  const toggleDecryption = () => {
    if (isDecrypted) {
      setIsDecrypted(false);
    } else {
      handleDecrypt();
    }
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`
          relative max-w-[70%] px-4 py-3 rounded-2xl cipher-line
          ${isOwn 
            ? "bg-primary/20 border border-primary/40 glow-border" 
            : "bg-card/50 border border-border/50"
          }
          backdrop-blur-sm transition-all hover:scale-[1.02]
        `}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-cipher">
            {isEncrypted && (
              <>
                {isDecrypted ? (
                  <>
                    <Unlock className="h-3 w-3" />
                    <span>Decrypted</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" />
                    <span>Encrypted</span>
                  </>
                )}
              </>
            )}
          </div>
          
          {isEncrypted && onDecrypt && (
            <button
              onClick={toggleDecryption}
              disabled={isDecrypting}
              className="flex items-center gap-1 text-xs bg-background/50 hover:bg-background/80 px-2 py-1 rounded-md transition-colors"
              title={isDecrypted ? "Hide decrypted content" : "Decrypt message"}
            >
              {isDecrypting ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
              ) : (
                isDecrypted ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
        
        <p className={`text-sm ${isOwn ? "text-foreground glow-text" : "text-muted-foreground"}`}>
          {message}
        </p>
      </div>
    </div>
  );
};

export default MessageBubble;
