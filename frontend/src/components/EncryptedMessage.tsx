import React, { useState, useEffect } from 'react';
import { useFhevm } from '../fhevm';
import { ethers } from 'ethers';

interface EncryptedMessageProps {
  provider?: ethers.BrowserProvider;
  chainId?: number;
}

const EncryptedMessage: React.FC<EncryptedMessageProps> = ({ provider, chainId }) => {
  const { fhevmInstance, state, error } = useFhevm({ provider, chainId });
  const [message, setMessage] = useState('');
  const [encryptedMessage, setEncryptedMessage] = useState('');
  const [decryptedMessage, setDecryptedMessage] = useState('');

  const handleEncrypt = async () => {
    if (!message.trim()) {
      alert('请输入要加密的消息');
      return;
    }

    if (!fhevmInstance) {
      alert('FHEVM实例未初始化');
      return;
    }

    try {
      // 使用FHEVM实例加密消息
      const encrypted = await fhevmInstance.encrypt(message);
      setEncryptedMessage(encrypted);
      setDecryptedMessage(''); // 清空之前的解密结果
    } catch (error) {
      console.error('加密失败:', error);
      alert('加密失败: ' + (error as Error).message);
    }
  };

  const handleDecrypt = async () => {
    if (!encryptedMessage.trim()) {
      alert('没有可解密的消息');
      return;
    }

    if (!fhevmInstance) {
      alert('FHEVM实例未初始化');
      return;
    }

    try {
      // 使用FHEVM实例解密消息
      const decrypted = await fhevmInstance.decrypt(encryptedMessage);
      setDecryptedMessage(decrypted);
    } catch (error) {
      console.error('解密失败:', error);
      alert('解密失败: ' + (error as Error).message);
    }
  };

  const handleClear = () => {
    setMessage('');
    setEncryptedMessage('');
    setDecryptedMessage('');
  };

  if (state === 'loading') {
    return (
      <div className="encrypted-message-container">
        <h2>加密消息演示</h2>
        <div className="loading">正在初始化FHEVM...</div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="encrypted-message-container">
        <h2>加密消息演示</h2>
        <div className="error">
          错误: {error?.message}
        </div>
      </div>
    );
  }

  return (
    <div className="encrypted-message-container">
      <h2>加密消息演示</h2>
      
      <div className="input-group">
        <label htmlFor="message">输入消息:</label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="请输入要加密的消息..."
          rows={4}
          cols={50}
        />
      </div>

      <div className="button-group">
        <button onClick={handleEncrypt} disabled={!message.trim()}>
          加密
        </button>
        <button onClick={handleDecrypt} disabled={!encryptedMessage.trim()}>
          解密
        </button>
        <button onClick={handleClear}>
          清空
        </button>
      </div>

      {encryptedMessage && (
        <div className="result-group">
          <h3>加密结果:</h3>
          <div className="encrypted-result">
            {encryptedMessage}
          </div>
        </div>
      )}

      {decryptedMessage && (
        <div className="result-group">
          <h3>解密结果:</h3>
          <div className="decrypted-result">
            {decryptedMessage}
          </div>
        </div>
      )}

      <style jsx>{`
        .encrypted-message-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background-color: #f9f9f9;
        }

        h2 {
          text-align: center;
          color: #333;
        }

        .input-group {
          margin-bottom: 15px;
        }

        label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }

        textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          resize: vertical;
        }

        .button-group {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        button {
          padding: 8px 16px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        button:hover {
          background-color: #45a049;
        }

        button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }

        .result-group {
          margin-top: 20px;
        }

        h3 {
          margin-bottom: 5px;
        }

        .encrypted-result, .decrypted-result {
          padding: 10px;
          background-color: #e9e9e9;
          border-radius: 4px;
          word-break: break-all;
        }

        .loading, .error {
          padding: 10px;
          text-align: center;
          border-radius: 4px;
        }

        .loading {
          background-color: #e3f2fd;
          color: #1976d2;
        }

        .error {
          background-color: #ffebee;
          color: #d32f2f;
        }
      `}</style>
    </div>
  );
};

export default EncryptedMessage;
