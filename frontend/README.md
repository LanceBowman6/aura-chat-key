# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/482506ea-7faf-4666-8914-85897a84d6de

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/482506ea-7faf-4666-8914-85897a84d6de) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Wallet Authentication

Sending messages and decrypting messages require wallet authentication:

- Connect your wallet using the Connect button in the header.
- On first send/decrypt, the app asks for a wallet signature to create a 24-hour session.
- If the session expires, you will be prompted to sign again.

## Contract Address Configuration

Set the EncryptedChat contract address via environment variables in `frontend/.env`:

- `VITE_ENCRYPTED_CHAT_ADDRESS` – default fallback address
- `VITE_ENCRYPTED_CHAT_ADDRESS_31337` – local Hardhat (chainId 31337)
- `VITE_ENCRYPTED_CHAT_ADDRESS_11155111` – Sepolia (chainId 11155111)

Example (see `frontend/env.example`):

```
VITE_WALLETCONNECT_PROJECT_ID=demo
VITE_ENCRYPTED_CHAT_ADDRESS_31337=0xDeployedLocalAddress
VITE_ENCRYPTED_CHAT_ADDRESS_11155111=0xDeployedSepoliaAddress
VITE_LOCAL_RPC_URL=http://127.0.0.1:8545
VITE_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

If no env is set, the app falls back to Hardhat’s default local address `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` for development.

## Dev server COOP/COEP notes

- The dev server now binds to `localhost` to satisfy browser “potentially trustworthy origin” rules.
- By default, Cross-Origin-Opener-Policy/Embedder-Policy headers are disabled to avoid conflicts with wallet SDKs.
- If you need SharedArrayBuffer for WASM threads, enable isolation via: `VITE_ENABLE_CROSS_ORIGIN_ISOLATION=1`.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/482506ea-7faf-4666-8914-85897a84d6de) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
