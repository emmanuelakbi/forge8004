// Feature: forge8004-core
// Tests for on-chain agent registration (Properties 3–4)
// Uses Hardhat + ethers.js on local Hardhat network

import { expect } from "chai";
import hre from "hardhat";

describe("AgentRegistry", function () {
  let registry: any;
  let owner: any;
  let addr1: any;

  beforeEach(async function () {
    [owner, addr1] = await hre.ethers.getSigners();
    const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
    registry = await AgentRegistry.deploy();
    await registry.waitForDeployment();
  });

  // Feature: forge8004-core, Property 3: On-chain registration round-trip
  // **Validates: Requirements 2.1, 2.2, 2.3**
  describe("Property 3: On-chain registration round-trip", function () {
    const testCases = [
      {
        firestoreId: "agent-abc-123",
        name: "Alpha Trader",
        strategyType: "momentum",
      },
      {
        firestoreId: "agent-def-456",
        name: "Grid Master",
        strategyType: "spot_grid_bot",
      },
      {
        firestoreId: "agent-ghi-789",
        name: "Mean Rev Bot",
        strategyType: "mean_reversion",
      },
      {
        firestoreId: "agent-jkl-012",
        name: "Arb Scanner",
        strategyType: "arbitrage",
      },
      {
        firestoreId: "agent-mno-345",
        name: "Yield Farm",
        strategyType: "yield",
      },
    ];

    for (const { firestoreId, name, strategyType } of testCases) {
      it(`round-trips registration for firestoreId="${firestoreId}", name="${name}", strategy="${strategyType}"`, async function () {
        // Register the agent
        const tx = await registry.registerAgent(
          addr1.address,
          firestoreId,
          name,
          strategyType,
        );
        const receipt = await tx.wait();

        // Extract tokenId from the AgentRegistered event
        const event = receipt.logs
          .map((log: any) => {
            try {
              return registry.interface.parseLog(log);
            } catch {
              return null;
            }
          })
          .find((e: any) => e && e.name === "AgentRegistered");

        expect(event).to.not.be.undefined;
        const tokenId = event!.args.tokenId;

        // Requirement 2.2: AgentMeta should have matching name and strategyType
        const meta = await registry.agents(tokenId);
        expect(meta.name).to.equal(name);
        expect(meta.strategyType).to.equal(strategyType);
        expect(meta.registeredAt).to.be.greaterThan(0);

        // Requirement 2.3: firestoreToToken mapping should return the minted tokenId
        const mappedTokenId = await registry.firestoreToToken(firestoreId);
        expect(mappedTokenId).to.equal(tokenId);

        // Requirement 2.1: The ERC-721 token should be owned by the target address
        const tokenOwner = await registry.ownerOf(tokenId);
        expect(tokenOwner).to.equal(addr1.address);
      });
    }

    it("mints sequential tokenIds for multiple registrations", async function () {
      const tx1 = await registry.registerAgent(
        addr1.address,
        "id-1",
        "Agent 1",
        "momentum",
      );
      const receipt1 = await tx1.wait();
      const tx2 = await registry.registerAgent(
        addr1.address,
        "id-2",
        "Agent 2",
        "yield",
      );
      const receipt2 = await tx2.wait();

      const getTokenId = (receipt: any) => {
        const event = receipt.logs
          .map((log: any) => {
            try {
              return registry.interface.parseLog(log);
            } catch {
              return null;
            }
          })
          .find((e: any) => e && e.name === "AgentRegistered");
        return event!.args.tokenId;
      };

      const tokenId1 = getTokenId(receipt1);
      const tokenId2 = getTokenId(receipt2);

      expect(tokenId2).to.equal(tokenId1 + 1n);
    });
  });

  // Feature: forge8004-core, Property 4: Duplicate on-chain registration reverts
  // **Validates: Requirements 2.5**
  describe("Property 4: Duplicate on-chain registration reverts", function () {
    const duplicateCases = [
      {
        firestoreId: "dup-agent-001",
        name: "First Agent",
        strategyType: "momentum",
      },
      {
        firestoreId: "dup-agent-002",
        name: "Grid Bot",
        strategyType: "spot_grid_bot",
      },
      {
        firestoreId: "dup-agent-003",
        name: "Arb Bot",
        strategyType: "arbitrage",
      },
    ];

    for (const { firestoreId, name, strategyType } of duplicateCases) {
      it(`reverts on duplicate registration for firestoreId="${firestoreId}"`, async function () {
        // First registration should succeed
        await registry.registerAgent(
          addr1.address,
          firestoreId,
          name,
          strategyType,
        );

        // Second registration with the same firestoreId should revert
        await expect(
          registry.registerAgent(
            addr1.address,
            firestoreId,
            "Different Name",
            "yield",
          ),
        ).to.be.revertedWith("Already registered");
      });
    }

    it("reverts duplicate even when called by a different address", async function () {
      await registry.registerAgent(
        addr1.address,
        "shared-id",
        "Agent A",
        "momentum",
      );

      // Same firestoreId from a different caller should still revert
      await expect(
        registry
          .connect(addr1)
          .registerAgent(owner.address, "shared-id", "Agent B", "yield"),
      ).to.be.revertedWith("Already registered");
    });

    it("allows registration with different firestoreIds", async function () {
      await registry.registerAgent(
        addr1.address,
        "unique-id-1",
        "Agent 1",
        "momentum",
      );
      // Different firestoreId should succeed
      await expect(
        registry.registerAgent(
          addr1.address,
          "unique-id-2",
          "Agent 2",
          "momentum",
        ),
      ).to.not.be.reverted;
    });
  });

  // Feature: forge8004-core, Property 10: On-chain checkpoint anchoring access control
  // **Validates: Requirements 7.6**
  describe("Property 10: On-chain checkpoint anchoring access control", function () {
    let addr2: any;

    beforeEach(async function () {
      [, , addr2] = await hre.ethers.getSigners();
    });

    const checkpointCases = [
      {
        firestoreId: "anchor-agent-001",
        name: "Anchor Test 1",
        strategyType: "momentum",
        hash: "0x" + "ab".repeat(32),
      },
      {
        firestoreId: "anchor-agent-002",
        name: "Anchor Test 2",
        strategyType: "spot_grid_bot",
        hash: "0x" + "cd".repeat(32),
      },
      {
        firestoreId: "anchor-agent-003",
        name: "Anchor Test 3",
        strategyType: "yield",
        hash: "0x" + "ef".repeat(32),
      },
    ];

    for (const { firestoreId, name, strategyType, hash } of checkpointCases) {
      it(`allows token owner to anchor checkpoint for "${firestoreId}"`, async function () {
        const tx = await registry.registerAgent(
          addr1.address,
          firestoreId,
          name,
          strategyType,
        );
        const receipt = await tx.wait();
        const event = receipt.logs
          .map((log: any) => {
            try {
              return registry.interface.parseLog(log);
            } catch {
              return null;
            }
          })
          .find((e: any) => e && e.name === "AgentRegistered");
        const tokenId = event!.args.tokenId;

        // Owner (addr1) should be able to anchor
        await expect(registry.connect(addr1).anchorCheckpoint(tokenId, hash)).to
          .not.be.reverted;

        // Verify the anchor was stored
        const storedHash = await registry.checkpointAnchors(tokenId);
        expect(storedHash).to.equal(hash);

        const storedTimestamp = await registry.checkpointTimestamps(tokenId);
        expect(storedTimestamp).to.be.greaterThan(0);
      });

      it(`reverts when non-owner tries to anchor checkpoint for "${firestoreId}"`, async function () {
        const tx = await registry.registerAgent(
          addr1.address,
          firestoreId,
          name,
          strategyType,
        );
        const receipt = await tx.wait();
        const event = receipt.logs
          .map((log: any) => {
            try {
              return registry.interface.parseLog(log);
            } catch {
              return null;
            }
          })
          .find((e: any) => e && e.name === "AgentRegistered");
        const tokenId = event!.args.tokenId;

        // Non-owner (addr2) should be reverted
        await expect(
          registry.connect(addr2).anchorCheckpoint(tokenId, hash),
        ).to.be.revertedWith("Not agent owner");

        // Contract deployer (owner) is also not the token owner
        await expect(
          registry.anchorCheckpoint(tokenId, hash),
        ).to.be.revertedWith("Not agent owner");
      });
    }

    it("emits CheckpointAnchored event with correct data", async function () {
      const tx = await registry.registerAgent(
        addr1.address,
        "event-test-agent",
        "Event Agent",
        "momentum",
      );
      const receipt = await tx.wait();
      const regEvent = receipt.logs
        .map((log: any) => {
          try {
            return registry.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e && e.name === "AgentRegistered");
      const tokenId = regEvent!.args.tokenId;

      const checkpointHash = "0x" + "11".repeat(32);
      const anchorTx = await registry
        .connect(addr1)
        .anchorCheckpoint(tokenId, checkpointHash);
      const anchorReceipt = await anchorTx.wait();

      const anchorEvent = anchorReceipt.logs
        .map((log: any) => {
          try {
            return registry.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e && e.name === "CheckpointAnchored");

      expect(anchorEvent).to.not.be.undefined;
      expect(anchorEvent!.args.tokenId).to.equal(tokenId);
      expect(anchorEvent!.args.checkpointHash).to.equal(checkpointHash);
    });

    it("allows owner to overwrite a previous checkpoint anchor", async function () {
      const tx = await registry.registerAgent(
        addr1.address,
        "overwrite-agent",
        "Overwrite Agent",
        "momentum",
      );
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log: any) => {
          try {
            return registry.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e && e.name === "AgentRegistered");
      const tokenId = event!.args.tokenId;

      const hash1 = "0x" + "aa".repeat(32);
      const hash2 = "0x" + "bb".repeat(32);

      await registry.connect(addr1).anchorCheckpoint(tokenId, hash1);
      const stored1 = await registry.checkpointAnchors(tokenId);
      expect(stored1).to.equal(hash1);

      await registry.connect(addr1).anchorCheckpoint(tokenId, hash2);
      const stored2 = await registry.checkpointAnchors(tokenId);
      expect(stored2).to.equal(hash2);
    });
  });
});
