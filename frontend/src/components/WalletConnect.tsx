import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState } from 'react';

const WalletConnect = () => {
  const [clicked, setClicked] = useState(false);
  return (
    <div>
      <ConnectButton
        chainStatus={{ smallScreen: 'icon', largeScreen: 'full' }}
        accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
        showBalance={false}
      />
      {clicked && (
        <p className="text-xs text-muted-foreground mt-2">Connecting...</p>
      )}
      {/* capture initial click for UX feedback, RainbowKit handles actual flow */}
      <button className="sr-only" onClick={() => setClicked(true)}>connect</button>
    </div>
  );
};

export default WalletConnect;
