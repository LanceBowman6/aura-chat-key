import React, { useState } from 'react';
import { Shield, Lock, Unlock } from 'lucide-react';

const SimpleEncryptedMessage: React.FC = () => {
  const [message, setMessage] = useState('');
  const [encryptedMessage, setEncryptedMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 简单的模拟加密函数（实际应用中会使用真正的FHEVM加密）
  const handleEncrypt = async () => {
    if (!message.trim()) {
      alert('请输入要加密的消息');
      return;
    }

    setIsProcessing(true);
    // 模拟加密过程
    setTimeout(() => {
      // 这里只是一个简单的模拟，实际应用中会使用FHEVM进行加密
      const mockEncrypted = btoa(message).split('').map(char => 
        char.charCodeAt(0).toString(16).padStart(2, '0')
      ).join('');
      setEncryptedMessage(mockEncrypted);
      setIsProcessing(false);
    }, 1000);
  };

  // 简单的模拟解密函数（实际应用中会使用真正的FHEVM解密）
  const handleDecrypt = async () => {
    if (!encryptedMessage.trim()) {
      alert('没有可解密的消息');
      return;
    }

    setIsProcessing(true);
    // 模拟解密过程
    setTimeout(() => {
      try {
        // 这里只是一个简单的模拟，实际应用中会使用FHEVM进行解密
        const hexArray = encryptedMessage.match(/.{1,2}/g) || [];
        const asciiArray = hexArray.map(hex => String.fromCharCode(parseInt(hex, 16)));
        const base64String = asciiArray.join('');
        const decrypted = atob(base64String);
        setMessage(decrypted);
        setIsProcessing(false);
      } catch (error) {
        alert('解密失败');
        setIsProcessing(false);
      }
    }, 1000);
  };

  const handleClear = () => {
    setMessage('');
    setEncryptedMessage('');
  };

  return (
    <div className="bg-card/50 border border-primary/30 rounded-2xl p-6 backdrop-blur-sm glow-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-primary/20 p-2 rounded-lg">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold glow-text">FHEVM 加密演示</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2">
            输入消息:
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="请输入要加密的消息..."
            className="w-full p-3 border border-border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleEncrypt}
            disabled={!message.trim() || isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground transition-colors"
          >
            <Lock className="h-4 w-4" />
            加密
          </button>
          <button
            onClick={handleDecrypt}
            disabled={!encryptedMessage.trim() || isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 disabled:bg-muted disabled:text-muted-foreground transition-colors"
          >
            <Unlock className="h-4 w-4" />
            解密
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            清空
          </button>
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm">处理中...</span>
          </div>
        )}

        {encryptedMessage && !isProcessing && (
          <div>
            <h4 className="text-sm font-medium mb-2">加密结果:</h4>
            <div className="p-3 bg-muted/50 rounded-lg font-mono text-sm break-all">
              {encryptedMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleEncryptedMessage;
