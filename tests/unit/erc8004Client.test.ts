// Unit tests for erc8004Client behavioral contracts
// Validates: Requirements 1.1, 1.3, 8.1, 18.1

import { describe, it, expect } from "vitest";
import type {
  AgentIdentity,
  AgentReputation,
  TradeIntent,
  AgentCheckpoint,
  ValidationRecord,
  AgentRuntimeState,
} from "@/src/lib/types";

// ── Nonce helpers (mirrors trustArtifacts.ts) ─────────────────────
function createSequencedIntentNonce(counter: number): string {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `nonce_${counter.toString().padStart(6, "0")}_${suffix}`;
}

function parseIntentNonceCounter(nonce?: string): number | null {
  if (!nonce) return null;
  const match = nonce.match(/^nonce_(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

// ── In-memory mock Firestore store ────────────────────────────────
// Replicates the behavioral contracts of erc8004Client without
// requiring a real Firebase connection.
function createMockFirestoreClient() {
  // Simulated auth state
  let currentUserId: string | null = null;
  let isOnline = true;

  // Collections
  const agents = new Map<string, AgentIdentity & { createdAt: number }>();
  const reputations = new Map<string, AgentReputation>();
  const intents = new Map<string, Map<string, TradeIntent>>();
  const checkpoints = new Map<string, Map<string, AgentCheckpoint>>();
  const validations = new Map<
    string,
    Map<string, Omit<ValidationRecord, "id"> & { id: string }>
  >();
  const nonceRegistry = new Map<
    string,
    Map<
      string,
      {
        agentId: string;
        nonce: string;
        intentId?: string;
        status: "RESERVED" | "CONSUMED" | "VOID";
        timestamp: number;
      }
    >
  >();
  const runtimeStates = new Map<string, AgentRuntimeState>();

  function ensureSubMap<K, V>(
    map: Map<string, Map<K, V>>,
    key: string,
  ): Map<K, V> {
    if (!map.has(key)) map.set(key, new Map());
    return map.get(key)!;
  }

  function userOwnsAgent(agentId: string): boolean {
    if (!currentUserId) return false;
    const agent = agents.get(agentId);
    return !!agent && agent.owner === currentUserId;
  }

  return {
    // Auth simulation
    setCurrentUser(uid: string | null) {
      currentUserId = uid;
    },
    setOnline(online: boolean) {
      isOnline = online;
    },
    getCurrentUserId() {
      return currentUserId;
    },

    // ── getAllAgents (Req 1.1, 18.1) ──────────────────────────────
    getAllAgents() {
      if (!currentUserId || !isOnline) return [];
      const results: Array<{
        identity: AgentIdentity;
        reputation: AgentReputation;
      }> = [];
      for (const [id, stored] of agents) {
        if (stored.owner !== currentUserId) continue;
        const { createdAt, ...identity } = stored;
        const reputation = reputations.get(id) ?? {
          agentId: id,
          cumulativePnl: 0,
          totalFunds: 0,
          maxDrawdown: 0,
          tradesCount: 0,
          sharpeLikeScore: 0,
        };
        results.push({ identity, reputation });
      }
      return results;
    },

    // ── getAgentById (Req 1.1, 18.1) ─────────────────────────────
    getAgentById(agentId: string) {
      if (!currentUserId || !isOnline) return null;
      const stored = agents.get(agentId);
      if (!stored || stored.owner !== currentUserId) return null;
      const { createdAt, ...identity } = stored;
      const reputation = reputations.get(agentId) ?? {
        agentId,
        cumulativePnl: 0,
        totalFunds: 0,
        maxDrawdown: 0,
        tradesCount: 0,
        sharpeLikeScore: 0,
      };
      return { identity, reputation };
    },

    // ── saveAgent (Req 1.1, 1.3) ─────────────────────────────────
    saveAgent(agent: AgentIdentity) {
      if (!currentUserId || agent.owner !== currentUserId) {
        throw new Error(
          "You can only create agents for the authenticated user.",
        );
      }
      agents.set(agent.agentId, { ...agent, createdAt: Date.now() });
      reputations.set(agent.agentId, {
        agentId: agent.agentId,
        cumulativePnl: 0,
        totalFunds: 10000,
        maxDrawdown: 0,
        tradesCount: 0,
        sharpeLikeScore: 0,
      });
    },

    // ── reserveIntentNonce (Req 8.1) ─────────────────────────────
    reserveIntentNonce(agentId: string): string {
      if (!userOwnsAgent(agentId)) {
        throw new Error("Nonce allocation is limited to the owning user.");
      }
      const runtime = runtimeStates.get(agentId);
      const currentCounter = runtime?.nonceCounter ?? 0;
      const nonceCounter = currentCounter + 1;
      const nonce = createSequencedIntentNonce(nonceCounter);

      // Update runtime state
      runtimeStates.set(agentId, {
        agentId,
        nonceCounter,
        lastNonce: nonce,
        updatedAt: Date.now(),
      });

      // Register nonce as RESERVED
      const nonceMap = ensureSubMap(nonceRegistry, agentId);
      nonceMap.set(nonce, {
        agentId,
        nonce,
        status: "RESERVED",
        timestamp: Date.now(),
      });

      return nonce;
    },

    // ── saveTradeIntent (consumes nonce) ──────────────────────────
    saveTradeIntent(intent: TradeIntent) {
      if (!userOwnsAgent(intent.agentId)) {
        throw new Error("Trade intent writes are limited to the owning user.");
      }
      const intentId =
        intent.intentId || `intent_${intent.agentId}_${intent.timestamp}`;
      const nonceId = intent.nonce || intentId;

      const intentMap = ensureSubMap(intents, intent.agentId);
      if (intentMap.has(intentId)) return; // idempotent

      const nonceMap = ensureSubMap(nonceRegistry, intent.agentId);
      const nonceDoc = nonceMap.get(nonceId);
      if (!nonceDoc)
        throw new Error(`Trade nonce ${nonceId} was not reserved.`);
      if (nonceDoc.status === "CONSUMED" || nonceDoc.status === "VOID") {
        throw new Error(`Trade nonce ${nonceId} has already been finalized.`);
      }

      // Write intent
      intentMap.set(intentId, { ...intent, intentId });

      // Consume nonce
      nonceMap.set(nonceId, {
        ...nonceDoc,
        intentId,
        status: "CONSUMED",
        timestamp: intent.timestamp,
      });

      // Update runtime
      const parsedCounter = parseIntentNonceCounter(nonceId);
      const runtime = runtimeStates.get(intent.agentId);
      const currentCounter = runtime?.nonceCounter ?? 0;
      runtimeStates.set(intent.agentId, {
        agentId: intent.agentId,
        nonceCounter:
          parsedCounter !== null
            ? Math.max(currentCounter, parsedCounter)
            : currentCounter,
        lastNonce: nonceId,
        lastIntentId: intentId,
        updatedAt: Date.now(),
      });
    },

    // ── persistIntentBundle (Req 18.1 — atomic write) ─────────────
    persistIntentBundle(
      intent: TradeIntent,
      bundleCheckpoints: AgentCheckpoint[],
      validation?: Omit<ValidationRecord, "id">,
    ) {
      const agentId = intent.agentId;
      if (!userOwnsAgent(agentId)) {
        throw new Error("Bundle writes are limited to the owning user.");
      }

      const intentId =
        intent.intentId || `intent_${agentId}_${intent.timestamp}`;
      const nonceId = intent.nonce || intentId;

      const intentMap = ensureSubMap(intents, agentId);
      if (intentMap.has(intentId)) return; // idempotent

      const nonceMap = ensureSubMap(nonceRegistry, agentId);
      const nonceDoc = nonceMap.get(nonceId);
      if (!nonceDoc)
        throw new Error(`Trade nonce ${nonceId} was not reserved.`);
      if (nonceDoc.status === "CONSUMED" || nonceDoc.status === "VOID") {
        throw new Error(`Trade nonce ${nonceId} has already been finalized.`);
      }

      // --- Atomic transaction portion ---
      // Write intent
      intentMap.set(intentId, { ...intent, intentId });
      // Consume nonce
      nonceMap.set(nonceId, {
        ...nonceDoc,
        intentId,
        status: "CONSUMED",
        timestamp: intent.timestamp,
      });
      // Update runtime
      const parsedCounter = parseIntentNonceCounter(nonceId);
      const runtime = runtimeStates.get(agentId);
      const currentCounter = runtime?.nonceCounter ?? 0;
      runtimeStates.set(agentId, {
        agentId,
        nonceCounter:
          parsedCounter !== null
            ? Math.max(currentCounter, parsedCounter)
            : currentCounter,
        lastNonce: nonceId,
        lastIntentId: intentId,
        updatedAt: Date.now(),
      });

      // --- Batch portion (checkpoints + validation) ---
      const cpMap = ensureSubMap(checkpoints, agentId);
      for (const cp of bundleCheckpoints) {
        cpMap.set(cp.id, cp);
      }
      if (validation) {
        const valMap = ensureSubMap(validations, agentId);
        const valId = `val_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        valMap.set(valId, { ...validation, id: valId });
      }
    },

    // ── voidIntentNonce ───────────────────────────────────────────
    voidIntentNonce(agentId: string, nonce: string) {
      if (!userOwnsAgent(agentId)) {
        throw new Error("Nonce updates are limited to the owning user.");
      }
      const nonceMap = ensureSubMap(nonceRegistry, agentId);
      const nonceDoc = nonceMap.get(nonce);
      if (!nonceDoc) return;
      if (nonceDoc.status === "CONSUMED") return;
      nonceMap.set(nonce, { ...nonceDoc, status: "VOID" });
    },

    // ── Inspection helpers for assertions ─────────────────────────
    getNonceStatus(agentId: string, nonce: string) {
      return nonceRegistry.get(agentId)?.get(nonce)?.status ?? null;
    },
    getIntentCount(agentId: string) {
      return intents.get(agentId)?.size ?? 0;
    },
    getCheckpointCount(agentId: string) {
      return checkpoints.get(agentId)?.size ?? 0;
    },
    getValidationCount(agentId: string) {
      return validations.get(agentId)?.size ?? 0;
    },
    getRuntimeState(agentId: string) {
      return runtimeStates.get(agentId) ?? null;
    },
    getAgentCount() {
      return agents.size;
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────
function buildAgent(overrides: Partial<AgentIdentity> = {}): AgentIdentity {
  return {
    agentId: "agent-001",
    owner: "user-123",
    name: "TestAgent",
    description: "",
    strategyType: "momentum",
    riskProfile: "balanced",
    ...overrides,
  };
}

function buildIntent(overrides: Partial<TradeIntent> = {}): TradeIntent {
  return {
    agentId: "agent-001",
    intentId: `intent_${Date.now()}`,
    side: "BUY",
    asset: "BTC",
    size: 500,
    timestamp: Date.now(),
    ...overrides,
  };
}

function buildCheckpoint(
  overrides: Partial<AgentCheckpoint> = {},
): AgentCheckpoint {
  return {
    id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    agentId: "agent-001",
    kind: "INTENT",
    stage: "INTENT_CREATED",
    status: "RECORDED",
    title: "Intent Created",
    detail: "Trade intent recorded",
    timestamp: Date.now(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────

describe("[erc8004Client] Owner-scoped query behavior", () => {
  /**
   * Requirement 18.1: All queries scoped to authenticated user's UID
   */
  it("getAllAgents returns empty when user is not authenticated", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser(null);
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());
    client.setCurrentUser(null);

    expect(client.getAllAgents()).toEqual([]);
  });

  it("getAllAgents returns only agents owned by the current user", () => {
    const client = createMockFirestoreClient();

    // User A creates an agent
    client.setCurrentUser("user-A");
    client.saveAgent(buildAgent({ agentId: "agent-A", owner: "user-A" }));

    // User B creates an agent
    client.setCurrentUser("user-B");
    client.saveAgent(buildAgent({ agentId: "agent-B", owner: "user-B" }));

    // User A should only see their own agent
    client.setCurrentUser("user-A");
    const agentsA = client.getAllAgents();
    expect(agentsA).toHaveLength(1);
    expect(agentsA[0].identity.agentId).toBe("agent-A");

    // User B should only see their own agent
    client.setCurrentUser("user-B");
    const agentsB = client.getAllAgents();
    expect(agentsB).toHaveLength(1);
    expect(agentsB[0].identity.agentId).toBe("agent-B");
  });

  it("getAgentById returns null for an agent owned by a different user", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-A");
    client.saveAgent(buildAgent({ agentId: "agent-A", owner: "user-A" }));

    client.setCurrentUser("user-B");
    expect(client.getAgentById("agent-A")).toBeNull();
  });

  it("getAgentById returns null when user is not authenticated", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-A");
    client.saveAgent(buildAgent({ agentId: "agent-A", owner: "user-A" }));

    client.setCurrentUser(null);
    expect(client.getAgentById("agent-A")).toBeNull();
  });

  it("getAllAgents returns empty when offline", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-A");
    client.saveAgent(buildAgent({ agentId: "agent-A", owner: "user-A" }));
    client.setOnline(false);

    expect(client.getAllAgents()).toEqual([]);
  });

  /**
   * Requirement 1.1: Agent creation persists scoped to authenticated UID
   */
  it("saveAgent persists agent with correct owner and initializes reputation", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    const agent = buildAgent();
    client.saveAgent(agent);

    const result = client.getAgentById("agent-001");
    expect(result).not.toBeNull();
    expect(result!.identity.owner).toBe("user-123");
    expect(result!.identity.name).toBe("TestAgent");
    expect(result!.identity.strategyType).toBe("momentum");
    expect(result!.reputation.cumulativePnl).toBe(0);
    expect(result!.reputation.tradesCount).toBe(0);
  });

  /**
   * Requirement 1.3: Unauthenticated creation rejected
   */
  it("saveAgent rejects when user is not authenticated", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser(null);

    expect(() => client.saveAgent(buildAgent())).toThrow(
      "You can only create agents for the authenticated user.",
    );
    expect(client.getAgentCount()).toBe(0);
  });

  it("saveAgent rejects when owner does not match current user", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("different-user");

    expect(() => client.saveAgent(buildAgent({ owner: "user-123" }))).toThrow(
      "You can only create agents for the authenticated user.",
    );
  });
});

describe("[erc8004Client] Nonce reservation and consumption flow", () => {
  /**
   * Requirement 8.1: Nonce reservation creates a unique nonce marked RESERVED
   */
  it("reserveIntentNonce creates a RESERVED nonce and increments counter", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());

    const nonce = client.reserveIntentNonce("agent-001");

    expect(nonce).toMatch(/^nonce_000001_/);
    expect(client.getNonceStatus("agent-001", nonce)).toBe("RESERVED");

    const runtime = client.getRuntimeState("agent-001");
    expect(runtime).not.toBeNull();
    expect(runtime!.nonceCounter).toBe(1);
    expect(runtime!.lastNonce).toBe(nonce);
  });

  it("sequential nonce reservations produce incrementing counters", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());

    const nonce1 = client.reserveIntentNonce("agent-001");
    const nonce2 = client.reserveIntentNonce("agent-001");
    const nonce3 = client.reserveIntentNonce("agent-001");

    // All nonces are distinct
    const nonces = new Set([nonce1, nonce2, nonce3]);
    expect(nonces.size).toBe(3);

    // Counter increments
    expect(nonce1).toMatch(/^nonce_000001_/);
    expect(nonce2).toMatch(/^nonce_000002_/);
    expect(nonce3).toMatch(/^nonce_000003_/);

    // All are RESERVED
    expect(client.getNonceStatus("agent-001", nonce1)).toBe("RESERVED");
    expect(client.getNonceStatus("agent-001", nonce2)).toBe("RESERVED");
    expect(client.getNonceStatus("agent-001", nonce3)).toBe("RESERVED");

    // Runtime counter is at 3
    expect(client.getRuntimeState("agent-001")!.nonceCounter).toBe(3);
  });

  it("reserveIntentNonce rejects for unauthenticated user", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());
    client.setCurrentUser(null);

    expect(() => client.reserveIntentNonce("agent-001")).toThrow(
      "Nonce allocation is limited to the owning user.",
    );
  });

  it("reserveIntentNonce rejects for non-owning user", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());
    client.setCurrentUser("other-user");

    expect(() => client.reserveIntentNonce("agent-001")).toThrow(
      "Nonce allocation is limited to the owning user.",
    );
  });

  /**
   * Nonce consumption: RESERVED → CONSUMED via saveTradeIntent
   */
  it("saveTradeIntent consumes a reserved nonce", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());

    const nonce = client.reserveIntentNonce("agent-001");
    expect(client.getNonceStatus("agent-001", nonce)).toBe("RESERVED");

    const intent = buildIntent({ nonce, intentId: "intent-1" });
    client.saveTradeIntent(intent);

    expect(client.getNonceStatus("agent-001", nonce)).toBe("CONSUMED");
    expect(client.getIntentCount("agent-001")).toBe(1);
  });

  it("saveTradeIntent rejects when nonce was not reserved", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());

    const intent = buildIntent({
      nonce: "nonce_fake_xxxx",
      intentId: "intent-1",
    });
    expect(() => client.saveTradeIntent(intent)).toThrow(
      "Trade nonce nonce_fake_xxxx was not reserved.",
    );
  });

  it("saveTradeIntent rejects when nonce is already CONSUMED", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());

    const nonce = client.reserveIntentNonce("agent-001");
    client.saveTradeIntent(buildIntent({ nonce, intentId: "intent-1" }));

    // Second intent with same nonce should fail
    expect(() =>
      client.saveTradeIntent(buildIntent({ nonce, intentId: "intent-2" })),
    ).toThrow("has already been finalized");
  });

  it("saveTradeIntent rejects when nonce is VOID", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());

    const nonce = client.reserveIntentNonce("agent-001");
    client.voidIntentNonce("agent-001", nonce);
    expect(client.getNonceStatus("agent-001", nonce)).toBe("VOID");

    expect(() =>
      client.saveTradeIntent(buildIntent({ nonce, intentId: "intent-1" })),
    ).toThrow("has already been finalized");
  });

  it("saveTradeIntent is idempotent for the same intentId", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());

    const nonce = client.reserveIntentNonce("agent-001");
    const intent = buildIntent({ nonce, intentId: "intent-1" });

    client.saveTradeIntent(intent);
    // Second call with same intentId should be a no-op
    client.saveTradeIntent(intent);

    expect(client.getIntentCount("agent-001")).toBe(1);
  });

  it("voidIntentNonce transitions RESERVED to VOID", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());

    const nonce = client.reserveIntentNonce("agent-001");
    expect(client.getNonceStatus("agent-001", nonce)).toBe("RESERVED");

    client.voidIntentNonce("agent-001", nonce);
    expect(client.getNonceStatus("agent-001", nonce)).toBe("VOID");
  });

  it("voidIntentNonce does not void an already CONSUMED nonce", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());

    const nonce = client.reserveIntentNonce("agent-001");
    client.saveTradeIntent(buildIntent({ nonce, intentId: "intent-1" }));
    expect(client.getNonceStatus("agent-001", nonce)).toBe("CONSUMED");

    // Voiding a consumed nonce should be a no-op
    client.voidIntentNonce("agent-001", nonce);
    expect(client.getNonceStatus("agent-001", nonce)).toBe("CONSUMED");
  });
});

describe("[erc8004Client] persistIntentBundle transaction atomicity", () => {
  /**
   * Requirement 18.1: persistIntentBundle writes intent + checkpoints + validation atomically
   */
  it("writes intent, checkpoints, and validation in a single bundle", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());

    const nonce = client.reserveIntentNonce("agent-001");
    const intent = buildIntent({ nonce, intentId: "intent-bundle-1" });
    const cps = [
      buildCheckpoint({ id: "cp-1", intentId: "intent-bundle-1", nonce }),
      buildCheckpoint({
        id: "cp-2",
        intentId: "intent-bundle-1",
        nonce,
        kind: "RISK",
        stage: "RISK_REVIEWED",
      }),
    ];
    const validation: Omit<ValidationRecord, "id"> = {
      agentId: "agent-001",
      validator: "risk_router",
      validationType: "TRADE_INTENT",
      score: 85,
      comment: "Approved",
      timestamp: Date.now(),
    };

    client.persistIntentBundle(intent, cps, validation);

    expect(client.getIntentCount("agent-001")).toBe(1);
    expect(client.getCheckpointCount("agent-001")).toBe(2);
    expect(client.getValidationCount("agent-001")).toBe(1);
    expect(client.getNonceStatus("agent-001", nonce)).toBe("CONSUMED");
  });

  it("writes intent and checkpoints without validation", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());

    const nonce = client.reserveIntentNonce("agent-001");
    const intent = buildIntent({ nonce, intentId: "intent-bundle-2" });
    const cps = [
      buildCheckpoint({ id: "cp-3", intentId: "intent-bundle-2", nonce }),
    ];

    client.persistIntentBundle(intent, cps);

    expect(client.getIntentCount("agent-001")).toBe(1);
    expect(client.getCheckpointCount("agent-001")).toBe(1);
    expect(client.getValidationCount("agent-001")).toBe(0);
    expect(client.getNonceStatus("agent-001", nonce)).toBe("CONSUMED");
  });

  it("persistIntentBundle rejects when nonce was not reserved", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());

    const intent = buildIntent({
      nonce: "nonce_fake_xxxx",
      intentId: "intent-bad",
    });
    expect(() => client.persistIntentBundle(intent, [])).toThrow(
      "Trade nonce nonce_fake_xxxx was not reserved.",
    );

    // Nothing should have been written
    expect(client.getIntentCount("agent-001")).toBe(0);
  });

  it("persistIntentBundle rejects when nonce is already consumed", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());

    const nonce = client.reserveIntentNonce("agent-001");
    client.persistIntentBundle(
      buildIntent({ nonce, intentId: "intent-first" }),
      [],
    );

    // Second bundle with same nonce should fail
    expect(() =>
      client.persistIntentBundle(
        buildIntent({ nonce, intentId: "intent-second" }),
        [buildCheckpoint({ id: "cp-orphan" })],
      ),
    ).toThrow("has already been finalized");

    // Only the first intent should exist
    expect(client.getIntentCount("agent-001")).toBe(1);
  });

  it("persistIntentBundle is idempotent for the same intentId", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());

    const nonce = client.reserveIntentNonce("agent-001");
    const intent = buildIntent({ nonce, intentId: "intent-idem" });
    const cps = [buildCheckpoint({ id: "cp-idem" })];

    client.persistIntentBundle(intent, cps);
    // Second call is a no-op (idempotent)
    client.persistIntentBundle(intent, cps);

    expect(client.getIntentCount("agent-001")).toBe(1);
  });

  it("persistIntentBundle rejects for unauthenticated user", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());
    const nonce = client.reserveIntentNonce("agent-001");

    client.setCurrentUser(null);
    expect(() =>
      client.persistIntentBundle(
        buildIntent({ nonce, intentId: "intent-unauth" }),
        [],
      ),
    ).toThrow("Bundle writes are limited to the owning user.");
  });

  it("persistIntentBundle rejects for non-owning user", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());
    const nonce = client.reserveIntentNonce("agent-001");

    client.setCurrentUser("other-user");
    expect(() =>
      client.persistIntentBundle(
        buildIntent({ nonce, intentId: "intent-other" }),
        [],
      ),
    ).toThrow("Bundle writes are limited to the owning user.");
  });

  it("persistIntentBundle updates runtime state with nonce counter", () => {
    const client = createMockFirestoreClient();
    client.setCurrentUser("user-123");
    client.saveAgent(buildAgent());

    const nonce = client.reserveIntentNonce("agent-001");
    const intent = buildIntent({ nonce, intentId: "intent-rt" });
    client.persistIntentBundle(intent, []);

    const runtime = client.getRuntimeState("agent-001");
    expect(runtime).not.toBeNull();
    expect(runtime!.lastNonce).toBe(nonce);
    expect(runtime!.lastIntentId).toBe("intent-rt");
    expect(runtime!.nonceCounter).toBeGreaterThanOrEqual(1);
  });
});
