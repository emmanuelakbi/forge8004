// Feature: nextjs-auth-data-layer, Property 5: Offline Read Operations Return Empty
// **Validates: Requirements 11.3**

import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// --- Spy trackers for Firestore query functions ---
const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();

// --- Mock firebase modules BEFORE importing erc8004Client ("use client" module) ---

vi.mock("@/app/lib/firebase", () => ({
  auth: { currentUser: { uid: "test-user" }, signOut: vi.fn() },
  db: {},
  handleFirestoreError: vi.fn((error) => {
    throw new Error(String(error));
  }),
  OperationType: {
    CREATE: "create",
    UPDATE: "update",
    DELETE: "delete",
    LIST: "list",
    GET: "get",
    WRITE: "write",
  },
  getIsOnline: vi.fn(() => false),
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  doc: vi.fn(),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  Timestamp: { now: vi.fn() },
  where: vi.fn(),
  runTransaction: vi.fn(),
  writeBatch: vi.fn(),
  deleteDoc: vi.fn(),
  initializeFirestore: vi.fn(() => ({})),
  memoryLocalCache: vi.fn(() => ({})),
}));

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
}));

vi.mock("@/firebase-applet-config.json", () => ({
  default: {
    apiKey: "test",
    authDomain: "test.firebaseapp.com",
    projectId: "test",
  },
}));

// Import the module under test AFTER mocks are set up
import { erc8004Client } from "@/app/lib/erc8004Client";

/**
 * Property 5: Offline Read Operations Return Empty
 *
 * When getIsOnline() returns false, every read method on erc8004Client
 * must return an empty array ([]) or null without calling any Firestore
 * query functions (getDocs, getDoc).
 */
describe("Property 5: Offline Read Operations Return Empty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Methods that return [] when offline ---

  it("getAllAgents returns [] without Firestore calls when offline", () => {
    fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const result = await erc8004Client.getAllAgents();

        expect(result).toStrictEqual([]);
        expect(mockGetDocs).not.toHaveBeenCalled();
        expect(mockGetDoc).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });

  it("getTradeIntents returns [] without Firestore calls when offline", () => {
    fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (agentId) => {
        mockGetDocs.mockClear();
        mockGetDoc.mockClear();

        const result = await erc8004Client.getTradeIntents(agentId);

        expect(result).toStrictEqual([]);
        expect(mockGetDocs).not.toHaveBeenCalled();
        expect(mockGetDoc).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });

  it("getCheckpoints returns [] without Firestore calls when offline", () => {
    fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (agentId) => {
        mockGetDocs.mockClear();
        mockGetDoc.mockClear();

        const result = await erc8004Client.getCheckpoints(agentId);

        expect(result).toStrictEqual([]);
        expect(mockGetDocs).not.toHaveBeenCalled();
        expect(mockGetDoc).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });

  it("getPnLHistory returns [] without Firestore calls when offline", () => {
    fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (agentId) => {
        mockGetDocs.mockClear();
        mockGetDoc.mockClear();

        const result = await erc8004Client.getPnLHistory(agentId);

        expect(result).toStrictEqual([]);
        expect(mockGetDocs).not.toHaveBeenCalled();
        expect(mockGetDoc).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });

  it("getVaultTransactions returns [] without Firestore calls when offline", () => {
    fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (agentId) => {
        mockGetDocs.mockClear();
        mockGetDoc.mockClear();

        const result = await erc8004Client.getVaultTransactions(agentId);

        expect(result).toStrictEqual([]);
        expect(mockGetDocs).not.toHaveBeenCalled();
        expect(mockGetDoc).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });

  it("getActivePositions returns [] without Firestore calls when offline", () => {
    fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (agentId) => {
        mockGetDocs.mockClear();
        mockGetDoc.mockClear();

        const result = await erc8004Client.getActivePositions(agentId);

        expect(result).toStrictEqual([]);
        expect(mockGetDocs).not.toHaveBeenCalled();
        expect(mockGetDoc).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });

  it("getPendingOrders returns [] without Firestore calls when offline", () => {
    fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (agentId) => {
        mockGetDocs.mockClear();
        mockGetDoc.mockClear();

        const result = await erc8004Client.getPendingOrders(agentId);

        expect(result).toStrictEqual([]);
        expect(mockGetDocs).not.toHaveBeenCalled();
        expect(mockGetDoc).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });

  it("getAiAccuracy returns [] without Firestore calls when offline", () => {
    fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (agentId) => {
        mockGetDocs.mockClear();
        mockGetDoc.mockClear();

        const result = await erc8004Client.getAiAccuracy(agentId);

        expect(result).toStrictEqual([]);
        expect(mockGetDocs).not.toHaveBeenCalled();
        expect(mockGetDoc).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });

  // --- Methods that return null when offline ---

  it("getAgentById returns null without Firestore calls when offline", () => {
    fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (agentId) => {
        mockGetDocs.mockClear();
        mockGetDoc.mockClear();

        const result = await erc8004Client.getAgentById(agentId);

        expect(result).toBeNull();
        expect(mockGetDocs).not.toHaveBeenCalled();
        expect(mockGetDoc).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });

  it("getRuntimeState returns null without Firestore calls when offline", () => {
    fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (agentId) => {
        mockGetDocs.mockClear();
        mockGetDoc.mockClear();

        const result = await erc8004Client.getRuntimeState(agentId);

        expect(result).toBeNull();
        expect(mockGetDocs).not.toHaveBeenCalled();
        expect(mockGetDoc).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });

  it("getGridRuntimeState returns null without Firestore calls when offline", () => {
    fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (agentId) => {
        mockGetDocs.mockClear();
        mockGetDoc.mockClear();

        const result = await erc8004Client.getGridRuntimeState(agentId);

        expect(result).toBeNull();
        expect(mockGetDocs).not.toHaveBeenCalled();
        expect(mockGetDoc).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });
});
