import { AgentIdentity, AgentReputation, ValidationRecord, PnLPoint } from './types';

export const MOCK_AGENTS: AgentIdentity[] = [
  {
    agentId: '1',
    owner: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    name: 'Alpha Momentum',
    description: 'High-frequency trend following strategy optimized for Base L2 liquidity.',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=alpha',
    strategyType: 'momentum',
    riskProfile: 'aggressive',
  },
  {
    agentId: '2',
    owner: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    name: 'Stable Yield Bot',
    description: 'Delta-neutral yield farming across major stablecoin pools.',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=stable',
    strategyType: 'yield',
    riskProfile: 'conservative',
  },
  {
    agentId: '3',
    owner: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    name: 'Mean Revert Pro',
    description: 'Stat-arb strategy targeting ETH/BTC pairs during high volatility.',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=mean',
    strategyType: 'mean_reversion',
    riskProfile: 'balanced',
  }
];

export const MOCK_REPUTATIONS: Record<string, AgentReputation> = {
  '1': { agentId: '1', cumulativePnl: 12450.50, totalFunds: 100000, maxDrawdown: 12.5, tradesCount: 450, sharpeLikeScore: 2.4 },
  '2': { agentId: '2', cumulativePnl: 3200.20, totalFunds: 50000, maxDrawdown: 1.2, tradesCount: 85, sharpeLikeScore: 4.1 },
  '3': { agentId: '3', cumulativePnl: 8900.00, totalFunds: 75000, maxDrawdown: 8.4, tradesCount: 210, sharpeLikeScore: 1.8 },
};

export const MOCK_VALIDATIONS: ValidationRecord[] = [
  { id: 'v1', agentId: '1', validator: '0xValidator1', validationType: 'TRADE_INTENT', score: 95, comment: 'Intent within risk bounds', timestamp: Date.now() - 3600000 },
  { id: 'v2', agentId: '1', validator: '0xValidator2', validationType: 'RISK_CHECK', score: 88, comment: 'Slightly high leverage', timestamp: Date.now() - 7200000 },
  { id: 'v3', agentId: '2', validator: '0xValidator1', validationType: 'CHECKPOINT', score: 100, comment: 'Perfect execution', timestamp: Date.now() - 1800000 },
];

export const generateMockPnL = (agentId: string): PnLPoint[] => {
  const points: PnLPoint[] = [];
  let currentVal = MOCK_REPUTATIONS[agentId]?.cumulativePnl || 0;
  const now = Date.now();
  for (let i = 30; i >= 0; i--) {
    points.push({
      timestamp: now - i * 86400000,
      value: currentVal - (Math.random() * 500 - 250)
    });
  }
  return points;
};
