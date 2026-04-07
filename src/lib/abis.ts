export const IDENTITY_REGISTRY_ABI = [
  {
    name: 'getAgent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256', name: 'agentId' }],
    outputs: [
      { type: 'address', name: 'owner' },
      { type: 'string', name: 'name' },
      { type: 'string', name: 'description' },
      { type: 'string', name: 'avatarUrl' },
      { type: 'string', name: 'strategyType' },
      { type: 'string', name: 'riskProfile' },
    ],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'tokenByIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256', name: 'index' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256', name: 'tokenId' }],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'registerAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'string', name: 'name' },
      { type: 'string', name: 'description' },
      { type: 'string', name: 'avatarUrl' },
      { type: 'string', name: 'strategyType' },
      { type: 'string', name: 'riskProfile' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export const REPUTATION_REGISTRY_ABI = [
  {
    name: 'getReputation',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256', name: 'agentId' }],
    outputs: [
      { type: 'int256', name: 'cumulativePnl' },
      { type: 'uint256', name: 'maxDrawdown' },
      { type: 'uint256', name: 'tradesCount' },
      { type: 'uint256', name: 'sharpeLikeScore' },
    ],
  },
  {
    name: 'updateReputation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'uint256', name: 'agentId' },
      { type: 'int256', name: 'pnl' },
      { type: 'uint256', name: 'drawdown' },
      { type: 'uint256', name: 'trades' },
      { type: 'uint256', name: 'sharpe' },
    ],
    outputs: [],
  },
] as const;

export const VALIDATION_REGISTRY_ABI = [
  {
    name: 'getLatestValidation',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256', name: 'agentId' }],
    outputs: [
      {
        type: 'tuple',
        name: '',
        components: [
          { type: 'address', name: 'validator' },
          { type: 'uint8', name: 'validationType' },
          { type: 'uint8', name: 'score' },
          { type: 'string', name: 'comment' },
          { type: 'uint256', name: 'timestamp' },
        ],
      },
    ],
  },
  {
    name: 'getValidationHistory',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256', name: 'agentId' }],
    outputs: [
      {
        type: 'tuple[]',
        name: '',
        components: [
          { type: 'address', name: 'validator' },
          { type: 'uint8', name: 'validationType' },
          { type: 'uint8', name: 'score' },
          { type: 'string', name: 'comment' },
          { type: 'uint256', name: 'timestamp' },
        ],
      },
    ],
  },
  {
    name: 'recordValidation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'uint256', name: 'agentId' },
      { type: 'uint8', name: 'validationType' },
      { type: 'uint8', name: 'score' },
      { type: 'string', name: 'comment' },
    ],
    outputs: [],
  },
] as const;
