import {
  AggregatedAgentView,
  AgentIdentity,
  ValidationRecord,
  AgentReputation,
  PnLPoint,
  VaultTransaction,
  TradeIntent,
  AgentCheckpoint,
  AgentRuntimeState,
  GridRuntimeState,
} from "../lib/types";
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  getIsOnline,
} from "./firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  Timestamp,
  where,
  runTransaction,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import {
  createSequencedIntentNonce,
  normalizeStrategyType,
  parseIntentNonceCounter,
  AiAccuracyRecord,
} from "../services/trustArtifacts";

const EMPTY_REPUTATION = (agentId: string): AgentReputation => ({
  agentId,
  cumulativePnl: 0,
  totalFunds: 0,
  maxDrawdown: 0,
  tradesCount: 0,
  sharpeLikeScore: 0,
});

function normalizeTimestamp(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  return typeof value === "number" ? value : Date.now();
}

/** Recursively strip `undefined` values from an object/array — Firestore rejects them at any depth. */
function stripUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (typeof obj === "object") {
    // Preserve Firestore Timestamp and FieldValue sentinels (serverTimestamp, increment, etc.)
    if (obj instanceof Timestamp) return obj;
    if (typeof obj.isEqual === "function" && typeof obj.toJSON === "undefined")
      return obj;
    if (obj._methodName) return obj; // Firestore FieldValue sentinel
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) clean[key] = stripUndefined(value);
    }
    return clean;
  }
  return obj;
}

function getCurrentUserId() {
  return auth.currentUser?.uid ?? null;
}

function normalizeAgentIdentity(
  identity:
    | AgentIdentity
    | (Omit<AgentIdentity, "strategyType"> & { strategyType?: string }),
) {
  return {
    ...identity,
    strategyType: normalizeStrategyType(identity.strategyType),
  } as AgentIdentity;
}

const ownershipCache = new Map<string, { uid: string; expiresAt: number }>();

async function userOwnsAgent(agentId: string) {
  const userId = getCurrentUserId();
  if (!userId) return false;

  const cached = ownershipCache.get(agentId);
  if (cached && cached.uid === userId && Date.now() < cached.expiresAt)
    return true;

  const agentDoc = await getDoc(doc(db, "agents", agentId));
  const owns = agentDoc.exists() && agentDoc.data().owner === userId;
  if (owns)
    ownershipCache.set(agentId, {
      uid: userId,
      expiresAt: Date.now() + 5 * 60_000,
    });
  return owns;
}

export const erc8004Client = {
  async getAllAgents(): Promise<AggregatedAgentView[]> {
    try {
      const userId = getCurrentUserId();
      if (!userId || !getIsOnline()) {
        return [];
      }

      const agentsSnap = await getDocs(
        query(collection(db, "agents"), where("owner", "==", userId)),
      );
      if (agentsSnap.empty) {
        return [];
      }

      // Warm the ownership cache for all agents at once
      agentsSnap.docs.forEach((agentDoc) => {
        ownershipCache.set(agentDoc.id, {
          uid: userId,
          expiresAt: Date.now() + 5 * 60_000,
        });
      });

      // Fetch reputation + latest validations in parallel for all agents
      const agents = await Promise.all(
        agentsSnap.docs.map(async (agentDoc) => {
          const rawIdentity = agentDoc.data() as
            | AgentIdentity
            | (Omit<AgentIdentity, "strategyType"> & { strategyType?: string });
          const identity = normalizeAgentIdentity(rawIdentity);
          if (identity.owner !== userId) return null;

          const [reputationDoc, validationsSnap] = await Promise.all([
            getDoc(doc(db, "reputation", agentDoc.id)),
            getDocs(
              query(
                collection(db, `agents/${agentDoc.id}/validations`),
                orderBy("timestamp", "desc"),
                limit(20),
              ),
            ),
          ]);

          const reputation = reputationDoc.exists()
            ? (reputationDoc.data() as AgentReputation)
            : EMPTY_REPUTATION(agentDoc.id);
          const validationDocs = validationsSnap.docs.map(
            (vDoc) =>
              ({
                ...vDoc.data(),
                id: vDoc.id,
                timestamp:
                  vDoc.data().timestamp instanceof Timestamp
                    ? vDoc.data().timestamp.toMillis()
                    : vDoc.data().timestamp,
              }) as ValidationRecord,
          );

          return {
            identity,
            reputation,
            latestValidation: validationDocs[0],
            validationAverageScore:
              validationDocs.length > 0
                ? validationDocs.reduce((sum, v) => sum + v.score, 0) /
                  validationDocs.length
                : 0,
          } as AggregatedAgentView;
        }),
      );

      return agents.filter(Boolean) as AggregatedAgentView[];
    } catch (error: any) {
      handleFirestoreError(error, OperationType.LIST, "agents");
      return [];
    }
  },

  async getAgentById(agentId: string): Promise<AggregatedAgentView | null> {
    try {
      const userId = getCurrentUserId();
      if (!userId || !getIsOnline()) {
        return null;
      }

      const agentDoc = await getDoc(doc(db, "agents", agentId));
      if (!agentDoc.exists()) {
        return null;
      }

      const rawIdentity = agentDoc.data() as
        | AgentIdentity
        | (Omit<AgentIdentity, "strategyType"> & { strategyType?: string });
      const identity = normalizeAgentIdentity(rawIdentity);
      if (identity.owner !== userId) {
        return null;
      }

      if (rawIdentity.strategyType !== identity.strategyType) {
        void setDoc(
          doc(db, "agents", agentId),
          { strategyType: identity.strategyType },
          { merge: true },
        );
      }

      const reputationDoc = await getDoc(doc(db, "reputation", agentId));
      const validationsSnap = await getDocs(
        query(
          collection(db, `agents/${agentId}/validations`),
          orderBy("timestamp", "desc"),
          limit(20),
        ),
      );
      const reputation = reputationDoc.exists()
        ? (reputationDoc.data() as AgentReputation)
        : EMPTY_REPUTATION(agentId);
      const validationDocs = validationsSnap.docs.map(
        (vDoc) =>
          ({
            ...vDoc.data(),
            id: vDoc.id,
            timestamp:
              vDoc.data().timestamp instanceof Timestamp
                ? vDoc.data().timestamp.toMillis()
                : vDoc.data().timestamp,
          }) as ValidationRecord,
      );
      const latestValidation =
        validationDocs.length > 0 ? validationDocs[0] : undefined;
      const validationAverageScore =
        validationDocs.length > 0
          ? validationDocs.reduce((sum, v) => sum + v.score, 0) /
            validationDocs.length
          : 0;

      return {
        identity,
        reputation,
        latestValidation,
        validationAverageScore,
      };
    } catch (error: any) {
      handleFirestoreError(error, OperationType.GET, `agents/${agentId}`);
      return null;
    }
  },

  async getValidationHistory(agentId: string): Promise<ValidationRecord[]> {
    try {
      if (!getIsOnline() || !(await userOwnsAgent(agentId))) {
        return [];
      }

      const validationsSnap = await getDocs(
        query(
          collection(db, `agents/${agentId}/validations`),
          orderBy("timestamp", "desc"),
        ),
      );
      if (!validationsSnap.empty) {
        return validationsSnap.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            timestamp:
              data.timestamp instanceof Timestamp
                ? data.timestamp.toMillis()
                : data.timestamp,
          } as ValidationRecord;
        });
      }

      return [];
    } catch (error: any) {
      handleFirestoreError(
        error,
        OperationType.LIST,
        `agents/${agentId}/validations`,
      );
      return [];
    }
  },

  async saveAgent(agent: AgentIdentity): Promise<void> {
    try {
      const userId = getCurrentUserId();
      if (!userId || agent.owner !== userId) {
        throw new Error(
          "You can only create agents for the authenticated user.",
        );
      }

      const normalizedAgent = normalizeAgentIdentity(agent);
      await setDoc(
        doc(db, "agents", agent.agentId),
        stripUndefined({
          ...normalizedAgent,
          createdAt: serverTimestamp(),
        }),
      );
      // Initialize reputation
      await setDoc(doc(db, "reputation", normalizedAgent.agentId), {
        agentId: normalizedAgent.agentId,
        cumulativePnl: 0,
        totalFunds: 10000, // Default starting funds
        maxDrawdown: 0,
        tradesCount: 0,
        sharpeLikeScore: 0,
      });
      await this.ensurePnLHistoryBaseline(normalizedAgent.agentId, 10000);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `agents/${agent.agentId}`,
      );
    }
  },

  async updateAgentOnChainMeta(
    agentId: string,
    meta: { tokenId: number; txHash: string; chainId: number },
  ): Promise<void> {
    try {
      if (!(await userOwnsAgent(agentId))) return;
      await setDoc(
        doc(db, "agents", agentId),
        { onChain: meta },
        { merge: true },
      );
    } catch (error) {
      console.warn("[ERC-8004] On-chain meta update failed:", error);
    }
  },

  async saveValidation(
    validation: Omit<ValidationRecord, "id">,
  ): Promise<void> {
    try {
      if (!(await userOwnsAgent(validation.agentId))) {
        throw new Error("Validation writes are limited to the owning user.");
      }

      const validationRef = collection(
        db,
        `agents/${validation.agentId}/validations`,
      );
      await addDoc(
        validationRef,
        stripUndefined({
          ...validation,
          timestamp: Timestamp.fromMillis(validation.timestamp),
        }),
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `agents/${validation.agentId}/validations`,
      );
    }
  },

  async savePnLPoint(agentId: string, point: PnLPoint): Promise<void> {
    try {
      if (!(await userOwnsAgent(agentId))) {
        throw new Error("PnL writes are limited to the owning user.");
      }

      const pnlRef = collection(db, `agents/${agentId}/pnl_history`);
      await addDoc(pnlRef, {
        ...point,
        timestamp: Timestamp.fromMillis(point.timestamp),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `agents/${agentId}/pnl_history`,
      );
    }
  },

  async ensurePnLHistoryBaseline(
    agentId: string,
    value: number,
    timestamp = Date.now(),
  ): Promise<void> {
    try {
      if (!(await userOwnsAgent(agentId))) {
        throw new Error(
          "PnL history initialization is limited to the owning user.",
        );
      }

      const pnlRef = collection(db, `agents/${agentId}/pnl_history`);
      const existingSnap = await getDocs(
        query(pnlRef, orderBy("timestamp", "asc"), limit(1)),
      );
      if (!existingSnap.empty) {
        return;
      }

      await addDoc(pnlRef, {
        timestamp: Timestamp.fromMillis(timestamp),
        value,
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `agents/${agentId}/pnl_history`,
      );
    }
  },

  async saveReputation(reputation: AgentReputation): Promise<void> {
    try {
      if (!(await userOwnsAgent(reputation.agentId))) {
        throw new Error("Reputation updates are limited to the owning user.");
      }

      await setDoc(
        doc(db, "reputation", reputation.agentId),
        stripUndefined(reputation),
        {
          merge: true,
        },
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `reputation/${reputation.agentId}`,
      );
    }
  },

  async reserveIntentNonce(agentId: string): Promise<string> {
    try {
      if (!(await userOwnsAgent(agentId))) {
        throw new Error("Nonce allocation is limited to the owning user.");
      }

      const runtimeRef = doc(db, `agents/${agentId}/runtime/state`);

      return await runTransaction(db, async (transaction) => {
        const runtimeDoc = await transaction.get(runtimeRef);
        const currentCounter = runtimeDoc.exists()
          ? Number(runtimeDoc.data().nonceCounter || 0)
          : 0;
        const nonceCounter = currentCounter + 1;
        const nonce = createSequencedIntentNonce(nonceCounter);
        const nonceRef = doc(db, `agents/${agentId}/nonce_registry/${nonce}`);

        transaction.set(
          runtimeRef,
          {
            agentId,
            nonceCounter,
            lastNonce: nonce,
            updatedAt: Timestamp.now(),
          },
          { merge: true },
        );
        transaction.set(nonceRef, {
          agentId,
          nonce,
          status: "RESERVED",
          timestamp: Timestamp.now(),
        });

        return nonce;
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `agents/${agentId}/runtime/state`,
      );
      throw error;
    }
  },

  async saveTradeIntent(intent: TradeIntent): Promise<void> {
    try {
      if (!(await userOwnsAgent(intent.agentId))) {
        throw new Error("Trade intent writes are limited to the owning user.");
      }

      const intentId =
        intent.intentId || `intent_${intent.agentId}_${intent.timestamp}`;
      const nonceId = intent.nonce || intentId;
      const intentRef = doc(db, `agents/${intent.agentId}/intents/${intentId}`);
      const nonceRef = doc(
        db,
        `agents/${intent.agentId}/nonce_registry/${nonceId}`,
      );
      const runtimeRef = doc(db, `agents/${intent.agentId}/runtime/state`);

      await runTransaction(db, async (transaction) => {
        const [intentDoc, nonceDoc, runtimeDoc] = await Promise.all([
          transaction.get(intentRef),
          transaction.get(nonceRef),
          transaction.get(runtimeRef),
        ]);

        if (intentDoc.exists()) {
          return;
        }

        if (!nonceDoc.exists()) {
          throw new Error(`Trade nonce ${nonceId} was not reserved.`);
        }

        if (
          nonceDoc.data().status === "CONSUMED" ||
          nonceDoc.data().status === "VOID"
        ) {
          throw new Error(`Trade nonce ${nonceId} has already been finalized.`);
        }

        const parsedCounter = parseIntentNonceCounter(nonceId);
        const currentCounter = runtimeDoc.exists()
          ? Number(runtimeDoc.data().nonceCounter || 0)
          : 0;

        transaction.set(
          intentRef,
          stripUndefined({
            ...intent,
            timestamp: Timestamp.fromMillis(intent.timestamp),
          }),
        );
        transaction.set(nonceRef, {
          agentId: intent.agentId,
          intentId,
          nonce: nonceId,
          status: "CONSUMED",
          timestamp: Timestamp.fromMillis(intent.timestamp),
        });
        transaction.set(
          runtimeRef,
          {
            agentId: intent.agentId,
            nonceCounter:
              parsedCounter !== null
                ? Math.max(currentCounter, parsedCounter)
                : currentCounter,
            lastNonce: nonceId,
            lastIntentId: intentId,
            updatedAt: Timestamp.now(),
          },
          { merge: true },
        );
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `agents/${intent.agentId}/intents`,
      );
    }
  },

  async voidIntentNonce(agentId: string, nonce: string): Promise<void> {
    try {
      if (!(await userOwnsAgent(agentId))) {
        throw new Error("Nonce updates are limited to the owning user.");
      }

      const nonceRef = doc(db, `agents/${agentId}/nonce_registry/${nonce}`);

      await runTransaction(db, async (transaction) => {
        const nonceDoc = await transaction.get(nonceRef);

        if (!nonceDoc.exists()) {
          return;
        }

        if (nonceDoc.data().status === "CONSUMED") {
          return;
        }

        transaction.set(
          nonceRef,
          {
            ...nonceDoc.data(),
            status: "VOID",
            voidedAt: Timestamp.now(),
          },
          { merge: true },
        );
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `agents/${agentId}/nonce_registry/${nonce}`,
      );
      throw error;
    }
  },

  async getTradeIntents(agentId: string): Promise<TradeIntent[]> {
    try {
      if (!getIsOnline() || !(await userOwnsAgent(agentId))) {
        return [];
      }

      const intentsSnap = await getDocs(
        query(
          collection(db, `agents/${agentId}/intents`),
          orderBy("timestamp", "desc"),
        ),
      );
      return intentsSnap.docs.map(
        (doc) =>
          ({
            ...doc.data(),
            timestamp: normalizeTimestamp(doc.data().timestamp),
          }) as TradeIntent,
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.LIST,
        `agents/${agentId}/intents`,
      );
      return [];
    }
  },

  async saveCheckpoints(checkpoints: AgentCheckpoint[]): Promise<void> {
    try {
      if (checkpoints.length === 0) {
        return;
      }

      const agentId = checkpoints[0].agentId;
      if (!(await userOwnsAgent(agentId))) {
        throw new Error("Checkpoint writes are limited to the owning user.");
      }

      const batch = writeBatch(db);

      checkpoints.forEach((checkpoint) => {
        const checkpointRef = doc(
          db,
          `agents/${checkpoint.agentId}/checkpoints/${checkpoint.id}`,
        );
        batch.set(
          checkpointRef,
          stripUndefined({
            ...checkpoint,
            timestamp: Timestamp.fromMillis(checkpoint.timestamp),
          }),
          { merge: true },
        );
      });

      await batch.commit();
    } catch (error) {
      const agentId = checkpoints[0]?.agentId || "unknown";
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `agents/${agentId}/checkpoints`,
      );
      throw error;
    }
  },

  async persistIntentBundle(
    intent: TradeIntent,
    checkpoints: AgentCheckpoint[],
    validation?: Omit<ValidationRecord, "id">,
  ): Promise<void> {
    try {
      const agentId = intent.agentId;
      if (!(await userOwnsAgent(agentId))) {
        throw new Error("Bundle writes are limited to the owning user.");
      }

      const intentId =
        intent.intentId || `intent_${agentId}_${intent.timestamp}`;
      const nonceId = intent.nonce || intentId;
      const intentRef = doc(db, `agents/${agentId}/intents/${intentId}`);
      const nonceRef = doc(db, `agents/${agentId}/nonce_registry/${nonceId}`);
      const runtimeRef = doc(db, `agents/${agentId}/runtime/state`);

      await runTransaction(db, async (transaction) => {
        const [intentDoc, nonceDoc, runtimeDoc] = await Promise.all([
          transaction.get(intentRef),
          transaction.get(nonceRef),
          transaction.get(runtimeRef),
        ]);

        if (intentDoc.exists()) return;
        if (!nonceDoc.exists())
          throw new Error(`Trade nonce ${nonceId} was not reserved.`);
        if (
          nonceDoc.data().status === "CONSUMED" ||
          nonceDoc.data().status === "VOID"
        ) {
          throw new Error(`Trade nonce ${nonceId} has already been finalized.`);
        }

        const parsedCounter = parseIntentNonceCounter(nonceId);
        const currentCounter = runtimeDoc.exists()
          ? Number(runtimeDoc.data().nonceCounter || 0)
          : 0;

        transaction.set(
          intentRef,
          stripUndefined({
            ...intent,
            timestamp: Timestamp.fromMillis(intent.timestamp),
          }),
        );
        transaction.set(nonceRef, {
          agentId,
          intentId,
          nonce: nonceId,
          status: "CONSUMED",
          timestamp: Timestamp.fromMillis(intent.timestamp),
        });
        transaction.set(
          runtimeRef,
          {
            agentId,
            nonceCounter:
              parsedCounter !== null
                ? Math.max(currentCounter, parsedCounter)
                : currentCounter,
            lastNonce: nonceId,
            lastIntentId: intentId,
            updatedAt: Timestamp.now(),
          },
          { merge: true },
        );
      });

      // Checkpoints + validation in a single batch (outside the transaction to avoid read limits)
      if (checkpoints.length > 0 || validation) {
        const batch = writeBatch(db);
        checkpoints.forEach((cp) => {
          batch.set(
            doc(db, `agents/${agentId}/checkpoints/${cp.id}`),
            stripUndefined({
              ...cp,
              timestamp: Timestamp.fromMillis(cp.timestamp),
            }),
            { merge: true },
          );
        });
        if (validation) {
          const valRef = doc(collection(db, `agents/${agentId}/validations`));
          batch.set(
            valRef,
            stripUndefined({
              ...validation,
              timestamp: Timestamp.fromMillis(validation.timestamp),
            }),
          );
        }
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `agents/${intent.agentId}/intent-bundle`,
      );
    }
  },

  async getCheckpoints(agentId: string): Promise<AgentCheckpoint[]> {
    try {
      if (!getIsOnline() || !(await userOwnsAgent(agentId))) {
        return [];
      }

      const checkpointSnap = await getDocs(
        query(
          collection(db, `agents/${agentId}/checkpoints`),
          orderBy("timestamp", "desc"),
        ),
      );
      return checkpointSnap.docs.map(
        (checkpointDoc) =>
          ({
            ...checkpointDoc.data(),
            id: checkpointDoc.id,
            timestamp: normalizeTimestamp(checkpointDoc.data().timestamp),
          }) as AgentCheckpoint,
      );
    } catch (error) {
      console.warn(
        `[ERC-8004] Checkpoint timeline unavailable for agent ${agentId}.`,
        error,
      );
      return [];
    }
  },

  async getRuntimeState(agentId: string): Promise<AgentRuntimeState | null> {
    try {
      if (!getIsOnline() || !(await userOwnsAgent(agentId))) {
        return null;
      }

      const runtimeDoc = await getDoc(
        doc(db, `agents/${agentId}/runtime/state`),
      );
      if (!runtimeDoc.exists()) {
        return null;
      }

      return {
        ...runtimeDoc.data(),
        lastCycleAt: runtimeDoc.data().lastCycleAt
          ? normalizeTimestamp(runtimeDoc.data().lastCycleAt)
          : undefined,
        updatedAt: normalizeTimestamp(runtimeDoc.data().updatedAt),
      } as AgentRuntimeState;
    } catch (error) {
      console.warn(
        `[ERC-8004] Nonce runtime unavailable for agent ${agentId}.`,
        error,
      );
      return null;
    }
  },

  async updateRuntimeState(
    agentId: string,
    patch: Partial<AgentRuntimeState>,
  ): Promise<void> {
    try {
      if (!(await userOwnsAgent(agentId))) {
        throw new Error("Runtime updates are limited to the owning user.");
      }

      const sanitized = stripUndefined(patch) as Record<string, any>;

      if (sanitized.lastCycleAt)
        sanitized.lastCycleAt = Timestamp.fromMillis(sanitized.lastCycleAt);
      sanitized.updatedAt = Timestamp.now();

      const runtimeRef = doc(db, `agents/${agentId}/runtime/state`);
      await setDoc(runtimeRef, sanitized, { merge: true });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `agents/${agentId}/runtime/state`,
      );
    }
  },

  async getGridRuntimeState(agentId: string): Promise<GridRuntimeState | null> {
    try {
      if (!getIsOnline() || !(await userOwnsAgent(agentId))) {
        return null;
      }

      const runtimeDoc = await getDoc(
        doc(db, `agents/${agentId}/runtime/grid`),
      );
      if (!runtimeDoc.exists()) {
        return null;
      }

      const data = runtimeDoc.data();
      return {
        ...data,
        lastRebuildAt: normalizeTimestamp(data.lastRebuildAt),
        lastGridEventAt: data.lastGridEventAt
          ? normalizeTimestamp(data.lastGridEventAt)
          : undefined,
        updatedAt: normalizeTimestamp(data.updatedAt),
        // Backfill new fields for legacy grid runtimes
        configMode: data.configMode || "ai",
        totalInvestment: data.totalInvestment || data.capitalReserved || 0,
        previouslyWithdrawn: data.previouslyWithdrawn || 0,
        profitableTradesCount: data.profitableTradesCount || 0,
        totalTradesCount: data.totalTradesCount || 0,
        configHistory: data.configHistory || [],
        startedAt: data.startedAt
          ? normalizeTimestamp(data.startedAt)
          : normalizeTimestamp(data.lastRebuildAt),
      } as GridRuntimeState;
    } catch (error) {
      console.warn(
        `[ERC-8004] Grid runtime unavailable for agent ${agentId}.`,
        error,
      );
      return null;
    }
  },

  async updateGridRuntimeState(
    agentId: string,
    patch: Partial<GridRuntimeState>,
  ): Promise<void> {
    try {
      if (!(await userOwnsAgent(agentId))) {
        throw new Error("Grid runtime updates are limited to the owning user.");
      }

      // Firestore rejects `undefined` values at any depth — deep-strip them
      const sanitized = stripUndefined(patch) as Record<string, any>;

      // Convert timestamps
      if (sanitized.lastRebuildAt)
        sanitized.lastRebuildAt = Timestamp.fromMillis(sanitized.lastRebuildAt);
      if (sanitized.lastGridEventAt)
        sanitized.lastGridEventAt = Timestamp.fromMillis(
          sanitized.lastGridEventAt,
        );
      if (sanitized.startedAt)
        sanitized.startedAt = Timestamp.fromMillis(sanitized.startedAt);
      sanitized.updatedAt = Timestamp.now();

      const runtimeRef = doc(db, `agents/${agentId}/runtime/grid`);
      await setDoc(runtimeRef, sanitized, { merge: true });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `agents/${agentId}/runtime/grid`,
      );
    }
  },

  async updateActivePositions(
    agentId: string,
    positions: TradeIntent[],
  ): Promise<void> {
    try {
      if (!(await userOwnsAgent(agentId))) {
        throw new Error(
          "Active position writes are limited to the owning user.",
        );
      }

      await setDoc(
        doc(db, "active_positions", agentId),
        stripUndefined({
          agentId,
          positions,
          updatedAt: serverTimestamp(),
        }),
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `active_positions/${agentId}`,
      );
    }
  },

  async getActivePositions(agentId: string): Promise<TradeIntent[]> {
    try {
      if (!getIsOnline() || !(await userOwnsAgent(agentId))) {
        return [];
      }

      const posDoc = await getDoc(doc(db, "active_positions", agentId));
      if (posDoc.exists()) {
        return posDoc.data().positions as TradeIntent[];
      }
      return [];
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.GET,
        `active_positions/${agentId}`,
      );
      return [];
    }
  },

  async updatePendingOrders(
    agentId: string,
    orders: TradeIntent[],
  ): Promise<void> {
    try {
      if (!(await userOwnsAgent(agentId))) {
        throw new Error("Pending order writes are limited to the owning user.");
      }

      await setDoc(
        doc(db, "pending_orders", agentId),
        stripUndefined({
          agentId,
          orders,
          updatedAt: serverTimestamp(),
        }),
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `pending_orders/${agentId}`,
      );
    }
  },

  async getPendingOrders(agentId: string): Promise<TradeIntent[]> {
    try {
      if (!getIsOnline() || !(await userOwnsAgent(agentId))) {
        return [];
      }

      const ordDoc = await getDoc(doc(db, "pending_orders", agentId));
      if (ordDoc.exists()) {
        return ordDoc.data().orders as TradeIntent[];
      }
      return [];
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.GET,
        `pending_orders/${agentId}`,
      );
      return [];
    }
  },

  async getPnLHistory(agentId: string): Promise<PnLPoint[]> {
    try {
      if (!getIsOnline() || !(await userOwnsAgent(agentId))) {
        return [];
      }

      const pnlSnap = await getDocs(
        query(
          collection(db, `agents/${agentId}/pnl_history`),
          orderBy("timestamp", "asc"),
        ),
      );
      if (!pnlSnap.empty) {
        return pnlSnap.docs.map((doc) => {
          const data = doc.data();
          return {
            timestamp:
              data.timestamp instanceof Timestamp
                ? data.timestamp.toMillis()
                : data.timestamp,
            value: data.value,
          } as PnLPoint;
        });
      }
      return [];
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.LIST,
        `agents/${agentId}/pnl_history`,
      );
      return [];
    }
  },

  async fundAgent(agentId: string, amount: number): Promise<VaultTransaction> {
    try {
      if (!(await userOwnsAgent(agentId))) {
        throw new Error("Funding is limited to the owning user.");
      }

      // 1. Simulate blockchain transaction on Base Sepolia
      console.log(
        `[ERC-8004] Initiating Capital Vault funding for agent ${agentId} on Base Sepolia...`,
      );

      // In a real scenario, we would use walletClient to send a transaction to the CAPITAL_VAULT contract
      // For now, we simulate the delay and success
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const txHash = `0x${Math.random().toString(16).slice(2, 66)}`;

      // 2. Update reputation in Firestore
      const reputationRef = doc(db, "reputation", agentId);
      const reputationDoc = await getDoc(reputationRef);

      let previousTotalFunds = 0;
      let newTotalFunds = amount;
      if (reputationDoc.exists()) {
        const currentRep = reputationDoc.data() as AgentReputation;
        previousTotalFunds = currentRep.totalFunds || 0;
        newTotalFunds = (currentRep.totalFunds || 0) + amount;
        await setDoc(reputationRef, {
          ...currentRep,
          totalFunds: newTotalFunds,
        });
      } else {
        await setDoc(reputationRef, {
          agentId,
          cumulativePnl: 0,
          totalFunds: amount,
          maxDrawdown: 0,
          tradesCount: 0,
          sharpeLikeScore: 0,
        });
      }

      // 3. Record the transaction
      const transaction: VaultTransaction = {
        id: `tx_${Date.now()}`,
        agentId,
        amount,
        type: "VAULT_FUNDING",
        status: "COMPLETED",
        txHash,
        timestamp: Date.now(),
      };

      const transactionsRef = collection(
        db,
        `agents/${agentId}/vault_transactions`,
      );
      await addDoc(
        transactionsRef,
        stripUndefined({
          ...transaction,
          timestamp: Timestamp.fromMillis(transaction.timestamp),
        }),
      );

      await this.ensurePnLHistoryBaseline(
        agentId,
        previousTotalFunds,
        transaction.timestamp - 1,
      );
      await this.savePnLPoint(agentId, {
        timestamp: transaction.timestamp,
        value: newTotalFunds,
      });

      return transaction;
    } catch (error: any) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `agents/${agentId}/vault_transactions`,
      );
      throw error;
    }
  },

  async saveVaultTransaction(
    agentId: string,
    tx: VaultTransaction,
  ): Promise<void> {
    try {
      if (!(await userOwnsAgent(agentId))) {
        throw new Error(
          "Vault transaction writes are limited to the owning user.",
        );
      }
      const transactionsRef = collection(
        db,
        `agents/${agentId}/vault_transactions`,
      );
      await addDoc(
        transactionsRef,
        stripUndefined({
          ...tx,
          timestamp: Timestamp.fromMillis(tx.timestamp),
        }),
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `agents/${agentId}/vault_transactions`,
      );
    }
  },

  async saveAiAccuracy(record: AiAccuracyRecord): Promise<void> {
    try {
      if (!(await userOwnsAgent(record.agentId))) return;
      await addDoc(
        collection(db, `agents/${record.agentId}/ai_accuracy`),
        stripUndefined({
          ...record,
          timestamp: Timestamp.fromMillis(record.timestamp),
        }),
      );
    } catch (error) {
      console.warn("[ERC-8004] AI accuracy record failed to save:", error);
    }
  },

  async getAiAccuracy(agentId: string): Promise<AiAccuracyRecord[]> {
    try {
      if (!getIsOnline() || !(await userOwnsAgent(agentId))) return [];
      const snap = await getDocs(
        query(
          collection(db, `agents/${agentId}/ai_accuracy`),
          orderBy("timestamp", "desc"),
          limit(50),
        ),
      );
      return snap.docs.map(
        (d) =>
          ({
            ...d.data(),
            timestamp: normalizeTimestamp(d.data().timestamp),
          }) as AiAccuracyRecord,
      );
    } catch (error) {
      console.warn("[ERC-8004] AI accuracy history unavailable:", error);
      return [];
    }
  },

  async getVaultTransactions(agentId: string): Promise<VaultTransaction[]> {
    try {
      if (!getIsOnline() || !(await userOwnsAgent(agentId))) {
        return [];
      }

      const txSnap = await getDocs(
        query(
          collection(db, `agents/${agentId}/vault_transactions`),
          orderBy("timestamp", "desc"),
        ),
      );
      if (!txSnap.empty) {
        return txSnap.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            timestamp: normalizeTimestamp(data.timestamp),
          } as VaultTransaction;
        });
      }
      return [];
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.LIST,
        `agents/${agentId}/vault_transactions`,
      );
      return [];
    }
  },

  async deleteAgent(agentId: string): Promise<void> {
    try {
      const userId = getCurrentUserId();
      if (!userId || !(await userOwnsAgent(agentId))) {
        throw new Error("You can only delete agents you own.");
      }

      // Helper to delete all docs in a subcollection
      const deleteSubcollection = async (path: string) => {
        const snap = await getDocs(collection(db, path));
        if (snap.empty) return;
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      };

      // Delete all subcollections under agents/{agentId}
      await Promise.all([
        deleteSubcollection(`agents/${agentId}/validations`),
        deleteSubcollection(`agents/${agentId}/intents`),
        deleteSubcollection(`agents/${agentId}/checkpoints`),
        deleteSubcollection(`agents/${agentId}/pnl_history`),
        deleteSubcollection(`agents/${agentId}/vault_transactions`),
        deleteSubcollection(`agents/${agentId}/nonce_registry`),
        deleteSubcollection(`agents/${agentId}/ai_accuracy`),
      ]);

      // Delete runtime docs (these are nested under a "runtime" subcollection)
      await Promise.all([
        deleteDoc(doc(db, `agents/${agentId}/runtime/state`)).catch(() => {}),
        deleteDoc(doc(db, `agents/${agentId}/runtime/grid`)).catch(() => {}),
      ]);

      // Delete top-level related docs
      await Promise.all([
        deleteDoc(doc(db, "agents", agentId)),
        deleteDoc(doc(db, "reputation", agentId)).catch(() => {}),
        deleteDoc(doc(db, "active_positions", agentId)).catch(() => {}),
      ]);

      ownershipCache.delete(agentId);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `agents/${agentId}`);
      throw error;
    }
  },

  async deactivateAgent(agentId: string): Promise<void> {
    try {
      const userId = getCurrentUserId();
      if (!userId || !(await userOwnsAgent(agentId))) {
        throw new Error("You can only deactivate agents you own.");
      }
      await setDoc(
        doc(db, "agents", agentId),
        { status: "deactivated" },
        { merge: true },
      );
      ownershipCache.delete(agentId);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `agents/${agentId}`);
      throw error;
    }
  },

  async reactivateAgent(agentId: string): Promise<void> {
    try {
      const userId = getCurrentUserId();
      if (!userId || !(await userOwnsAgent(agentId))) {
        throw new Error("You can only reactivate agents you own.");
      }
      await setDoc(
        doc(db, "agents", agentId),
        { status: "active" },
        { merge: true },
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `agents/${agentId}`);
      throw error;
    }
  },
};
