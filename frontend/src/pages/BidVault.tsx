import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BID_VAULT_ABI, getBidVaultAddressForChain } from '@/contracts/bidVault';
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi';
import { keccak256, encodePacked, stringToBytes, toHex } from 'viem';
import { toast } from '@/components/ui/use-toast';

const BidVaultPage = () => {
  const [amount, setAmount] = useState('');
  const [salt, setSalt] = useState('');
  const chainId = useChainId();
  const address = useMemo(() => getBidVaultAddressForChain(chainId), [chainId]);
  const { address: wallet } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [committed, setCommitted] = useState<string>('0x');
  const [revealed, setRevealed] = useState<boolean>(false);
  const [isActiveCommit, setIsActiveCommit] = useState<boolean>(false);

  const hash = useMemo(() => {
    const amt = BigInt(isNaN(Number(amount)) || amount === '' ? 0 : amount);
    const saltBytes = toHex(stringToBytes(salt ?? '')) as `0x${string}`;
    return keccak256(encodePacked(['uint256','bytes32'], [amt, saltBytes]));
  }, [amount, salt]);

  async function refresh() {
    if (!publicClient || !wallet || !address) return;
    try {
      const [h, r] = await publicClient.readContract({
        address,
        abi: BID_VAULT_ABI as any,
        functionName: 'commitOf',
        args: [wallet],
      }) as any[];
      setCommitted(h as string);
      setRevealed(Boolean(r));
      const active = await publicClient.readContract({
        address,
        abi: BID_VAULT_ABI as any,
        functionName: 'isCommitted',
        args: [wallet],
      });
      setIsActiveCommit(Boolean(active));
    } catch {}
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">Cipher Bid Vault</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Commit–reveal demo. Commit a bid hash, then reveal amount and salt.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-sm">Amount</label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 42" />
        </div>
        <div>
          <label className="text-sm">Salt</label>
          <Input value={salt} onChange={(e) => setSalt(e.target.value)} placeholder="random secret" />
        </div>
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={async () => {
              if (!walletClient || !wallet || !address) return;
              const tx = await walletClient.writeContract({
                account: wallet,
                address,
                abi: BID_VAULT_ABI as any,
                functionName: 'commitBid',
                args: [hash],
              });
              await refresh();
              toast({ title: 'Committed', description: String(tx) });
            }}
          >
            Commit
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              if (!walletClient || !wallet || !address) return;
              const amt = BigInt(isNaN(Number(amount)) || amount === '' ? 0 : amount);
              const saltBytes = toHex(stringToBytes(salt ?? '')) as `0x${string}`;
              const tx = await walletClient.writeContract({
                account: wallet,
                address,
                abi: BID_VAULT_ABI as any,
                functionName: 'revealBid',
                args: [amt, saltBytes],
              });
              await refresh();
              toast({ title: 'Revealed', description: String(tx) });
            }}
          >
            Reveal
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!walletClient || !wallet || !address) return;
              const tx = await walletClient.writeContract({
                account: wallet,
                address,
                abi: BID_VAULT_ABI as any,
                functionName: 'cancelCommit',
                args: [],
              });
              await refresh();
              toast({ title: 'Cancelled', description: String(tx) });
            }}
          >
            Cancel
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          <div>Committed hash: <code>{committed}</code></div>
          <div>Revealed: {revealed ? 'yes' : 'no'}</div>
        </div>
        <div className="text-xs">Active commitment: {isActiveCommit ? 'yes' : 'no'}</div>
      </div>
    </div>
  );
};

export default BidVaultPage;
