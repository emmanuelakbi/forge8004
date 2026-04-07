import { BrowserProvider, Contract } from 'ethers';
import AgentRegistryABI from '../lib/AgentRegistryABI.json';
import { CONFIG } from '../lib/config';

function getProvider() {
  if (!(window as any).ethereum) return null;
  return new BrowserProvider((window as any).ethereum);
}

async function getContract(withSigner = false) {
  const address = CONFIG.REGISTRIES.IDENTITY;
  if (!address || address.startsWith('0x1234')) return null; // placeholder check

  const provider = getProvider();
  if (!provider) return null;

  if (withSigner) {
    const signer = await provider.getSigner();
    return new Contract(address, AgentRegistryABI, signer);
  }
  return new Contract(address, AgentRegistryABI, provider);
}

export const onChainService = {
  isAvailable(): boolean {
    const address = CONFIG.REGISTRIES.IDENTITY;
    return !!(window as any).ethereum && !!address && !address.startsWith('0x1234');
  },

  async registerAgent(firestoreId: string, name: string, strategyType: string): Promise<{ tokenId: number; txHash: string } | null> {
    try {
      const contract = await getContract(true);
      if (!contract) return null;

      const signer = await getProvider()!.getSigner();
      const tx = await contract.registerAgent(signer.address, firestoreId, name, strategyType);
      const receipt = await tx.wait();

      // Parse the AgentRegistered event to get tokenId
      const event = receipt.logs.find((log: any) => {
        try { return contract.interface.parseLog(log)?.name === 'AgentRegistered'; } catch { return false; }
      });

      const parsed = event ? contract.interface.parseLog(event) : null;
      const tokenId = parsed ? Number(parsed.args.tokenId) : 0;

      return { tokenId, txHash: receipt.hash };
    } catch (error: any) {
      console.error('[OnChain] registerAgent failed:', error.message || error);
      return null;
    }
  },

  async anchorCheckpoint(tokenId: number, checkpointHash: string): Promise<{ txHash: string } | null> {
    try {
      const contract = await getContract(true);
      if (!contract) return null;

      const tx = await contract.anchorCheckpoint(tokenId, checkpointHash);
      const receipt = await tx.wait();
      return { txHash: receipt.hash };
    } catch (error: any) {
      console.error('[OnChain] anchorCheckpoint failed:', error.message || error);
      return null;
    }
  },

  async getAgentMeta(tokenId: number): Promise<{ strategyType: string; name: string; registeredAt: number } | null> {
    try {
      const contract = await getContract();
      if (!contract) return null;

      const meta = await contract.agents(tokenId);
      return { strategyType: meta.strategyType, name: meta.name, registeredAt: Number(meta.registeredAt) };
    } catch { return null; }
  },

  async getCheckpointAnchor(tokenId: number): Promise<{ hash: string; timestamp: number } | null> {
    try {
      const contract = await getContract();
      if (!contract) return null;

      const [hash, ts] = await Promise.all([
        contract.checkpointAnchors(tokenId),
        contract.checkpointTimestamps(tokenId)
      ]);
      if (hash === '0x' + '0'.repeat(64)) return null;
      return { hash, timestamp: Number(ts) };
    } catch { return null; }
  },

  async getTokenIdForAgent(firestoreId: string): Promise<number | null> {
    try {
      const contract = await getContract();
      if (!contract) return null;

      const tokenId = Number(await contract.firestoreToToken(firestoreId));
      return tokenId > 0 ? tokenId : null;
    } catch { return null; }
  }
};
