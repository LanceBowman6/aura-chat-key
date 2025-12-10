# Aura Chat Key 🔐

A secure, privacy-focused chat application built with **Fully Homomorphic Encryption (FHE)** on the FHEVM blockchain. Send encrypted messages that remain private even during computation - only intended recipients can decrypt and read them.

## 🎥 Demo

**Live Demo**: [https://aura-chat-key-yxqbr.vercel.app/](https://aura-chat-key-yxqbr.vercel.app/)

**Demo Video**:

![Demo Video](./demo.mp4)

## ✨ Features

### 🔒 Privacy & Security
- **End-to-end FHE encryption** - Messages encrypted on-chain with full privacy
- **Access control** - Only sender and recipient can view message details
- **Rate limiting** - Built-in spam protection (5-second cooldown)
- **Input validation** - Comprehensive client and contract-side validation
- **Batch size limits** - DoS attack prevention with max 100 messages per batch

### 🚀 Performance & UX
- **Real-time updates** - Automatic message refresh via blockchain events
- **Memory leak prevention** - Proper cleanup and resource management
- **UI blocking prevention** - Non-blocking FHE operations with loading states
- **Error boundaries** - Graceful error handling with retry functionality
- **TypeScript strict mode** - Enhanced type safety and developer experience

### 💬 Chat Features
- **User registration** - Unique nicknames (alphanumeric + spaces, max 32 chars)
- **Encrypted messaging** - Send FHE-encrypted messages to registered users
- **Message decryption** - Mark messages as decrypted for better UX
- **Message history** - View sent and received messages with encryption status

## 🏗️ Architecture

### Smart Contracts
- **AuraChat.sol** - Main chat contract with FHE message handling
- **FHECounter.sol** - Example FHE counter with overflow/underflow protection

### Frontend (Next.js 14)
- **React 18** with TypeScript and Tailwind CSS
- **FHEVM integration** - Custom hooks for FHE operations
- **MetaMask integration** - Wallet connection and transaction signing
- **Real-time UI** - Event-driven updates and loading states

## 🚀 Quick Start

### Prerequisites
- **Node.js** 20+
- **MetaMask** browser extension
- **Git** for cloning

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/LanceBowman6/aura-chat-key.git
   cd aura-chat-key
   ```

2. **Install dependencies**
   ```bash
   # Install contract dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

3. **Set up environment variables**
   ```bash
   # Set up Hardhat variables
   npx hardhat vars set MNEMONIC
   npx hardhat vars set INFURA_API_KEY
   npx hardhat vars set ETHERSCAN_API_KEY
   ```

4. **Compile contracts**
   ```bash
   npm run compile
   ```

5. **Run tests**
   ```bash
   npm run test
   ```

### Local Development

1. **Start local FHEVM node**
   ```bash
   npx hardhat node
   ```

2. **Deploy contracts**
   ```bash
   npx hardhat deploy --network localhost
   ```

3. **Start frontend**
   ```bash
   cd frontend
   npm run dev
   ```

4. **Open application**
   - Navigate to `http://localhost:3000`
   - Connect MetaMask to localhost:8545
   - Start chatting with FHE encryption!

### Sepolia Testnet Deployment

1. **Deploy to Sepolia**
   ```bash
   npx hardhat deploy --network sepolia
   ```

2. **Verify contracts**
   ```bash
   npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
   ```

3. **Test on Sepolia**
   ```bash
   npx hardhat test --network sepolia
   ```

## 📁 Project Structure

```
aura-chat-key/
├── contracts/                 # Smart contracts
│   ├── AuraChat.sol          # Main chat contract
│   └── FHECounter.sol        # FHE counter example
├── deploy/                   # Deployment scripts
│   ├── 01_deploy_AuraChat.ts
│   └── deploy.ts
├── test/                     # Contract tests
│   ├── AuraChat.ts
│   ├── AuraChatSepolia.ts
│   ├── FHECounter.ts
│   └── FHECounterSepolia.ts
├── tasks/                    # Hardhat tasks
├── frontend/                 # Next.js frontend
│   ├── app/                  # App router pages
│   ├── components/           # React components
│   ├── hooks/                # Custom React hooks
│   ├── fhevm/                # FHEVM integration
│   └── abi/                  # Contract ABIs
├── hardhat.config.ts         # Hardhat configuration
└── package.json              # Dependencies
```

## 🛠️ Available Scripts

### Contract Scripts
| Script | Description |
|--------|-------------|
| `npm run compile` | Compile smart contracts |
| `npm run test` | Run contract tests |
| `npm run coverage` | Generate test coverage |
| `npm run lint` | Lint Solidity code |
| `npm run clean` | Clean build artifacts |

### Frontend Scripts
| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Lint TypeScript/React code |

## 🔧 Configuration

### Environment Variables
- `MNEMONIC` - Wallet mnemonic for deployments
- `INFURA_API_KEY` - Infura API key for network access
- `ETHERSCAN_API_KEY` - Etherscan API key for verification
- `PRIVATE_KEY` - Private key for Sepolia deployments

### Network Configuration
- **Local**: Hardhat node on port 8545
- **Sepolia**: Ethereum testnet with FHEVM support
- **Gas Settings**: Optimized for FHEVM operations

## 🧪 Testing

The project includes comprehensive tests covering:
- **Contract functionality** - Registration, messaging, decryption
- **Access control** - Authorization and permission checks
- **Edge cases** - Invalid inputs, unauthorized access
- **FHE operations** - Encryption, decryption, overflow protection

Run tests with:
```bash
npm run test                    # Local tests
npm run test:sepolia           # Sepolia tests
npm run coverage               # Coverage report
```

## 📚 Documentation

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Zama FHEVM GitHub](https://github.com/zama-ai/fhevm)
- [Next.js Documentation](https://nextjs.org/docs)
- [Hardhat Documentation](https://hardhat.org/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/LanceBowman6/aura-chat-key/issues)
- **FHEVM Docs**: [docs.zama.ai](https://docs.zama.ai)
- **Community**: [Zama Discord](https://discord.gg/zama)

---

**Built with ❤️ using FHEVM and Next.js**
