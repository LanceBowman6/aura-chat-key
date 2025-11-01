// 简单的加密解密工具函数
// 在实际应用中，这里应该使用真正的FHEVM加密解密

// 加密函数
export const encryptMessage = (message: string): string => {
  // 这里只是一个简单的模拟，实际应用中会使用FHEVM进行加密
  try {
    const mockEncrypted = btoa(message).split('').map(char => 
      char.charCodeAt(0).toString(16).padStart(2, '0')
    ).join('');
    return mockEncrypted;
  } catch (error) {
    console.error('加密失败:', error);
    return message;
  }
};

// 解密函数
export const decryptMessage = async (encryptedMessage: string): Promise<string> => {
  // 模拟异步解密过程
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        // 这里只是一个简单的模拟，实际应用中会使用FHEVM进行解密
        const hexArray = encryptedMessage.match(/.{1,2}/g) || [];
        const asciiArray = hexArray.map(hex => String.fromCharCode(parseInt(hex, 16)));
        const base64String = asciiArray.join('');
        const decrypted = atob(base64String);
        resolve(decrypted);
      } catch (error) {
        console.error('解密失败:', error);
        reject(new Error('解密失败'));
      }
    }, 1000); // 模拟1秒的解密延迟
  });
};

// 检查消息是否已加密
export const isMessageEncrypted = (message: string): boolean => {
  // 简单的检查，实际应用中应该有更复杂的方法
  try {
    // 尝试解密，如果成功则认为是加密的
    const hexArray = message.match(/.{1,2}/g) || [];
    if (hexArray.length === 0) return false;
    
    // 检查是否都是有效的十六进制字符
    const isValidHex = hexArray.every(hex => /^[0-9a-f]{2}$/i.test(hex));
    if (!isValidHex) return false;
    
    // 尝试转换为ASCII并解码base64
    const asciiArray = hexArray.map(hex => String.fromCharCode(parseInt(hex, 16)));
    const base64String = asciiArray.join('');
    atob(base64String); // 如果这里不报错，则可能是加密的
    
    return true;
  } catch {
    return false;
  }
};
