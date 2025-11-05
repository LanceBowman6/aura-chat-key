// Simple mock encrypt/decrypt helpers
// In production, wire to real FHEVM routines
export const encryptMessage = (message: string): string => {
  try {
    const mockEncrypted = btoa(message).split('').map(char => 
      char.charCodeAt(0).toString(16).padStart(2, '0')
    ).join('');
    return mockEncrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    return message;
  }
};

export const decryptMessage = async (encryptedMessage: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const hexArray = encryptedMessage.match(/.{1,2}/g) || [];
        const asciiArray = hexArray.map(hex => String.fromCharCode(parseInt(hex, 16)));
        const base64String = asciiArray.join('');
        const decrypted = atob(base64String);
        resolve(decrypted);
      } catch (error) {
        console.error('Decryption failed:', error);
        reject(new Error('Decryption failed'));
      }
    }, 600); // slight delay to simulate work
  });
};

export const isMessageEncrypted = (message: string): boolean => {
  try {
    const hexArray = message.match(/.{1,2}/g) || [];
    if (hexArray.length === 0) return false;
    
    const isValidHex = hexArray.every(hex => /^[0-9a-f]{2}$/i.test(hex));
    if (!isValidHex) return false;
    
    const asciiArray = hexArray.map(hex => String.fromCharCode(parseInt(hex, 16)));
    const base64String = asciiArray.join('');
    atob(base64String);
    
    return true;
  } catch {
    return false;
  }
};
