// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentRegistry (ERC-8004 Identity Layer)
 * @notice Minimal ERC-721 for Sentinel Protocol agent identity on Base Sepolia.
 *         Each token represents a registered autonomous agent.
 */
contract AgentRegistry is ERC721, Ownable {
    uint256 private _nextTokenId;

    struct AgentMeta {
        string strategyType;
        string name;
        uint256 registeredAt;
    }

    // tokenId => metadata
    mapping(uint256 => AgentMeta) public agents;

    // firestoreId => tokenId (for linking off-chain to on-chain)
    mapping(string => uint256) public firestoreToToken;

    // tokenId => latest checkpoint hash
    mapping(uint256 => bytes32) public checkpointAnchors;
    mapping(uint256 => uint256) public checkpointTimestamps;

    event AgentRegistered(uint256 indexed tokenId, address indexed owner, string firestoreId, string strategyType);
    event CheckpointAnchored(uint256 indexed tokenId, bytes32 checkpointHash, uint256 timestamp);

    constructor() ERC721("Sentinel Agent", "SAGENT") Ownable(msg.sender) {}

    /**
     * @notice Mint a new agent identity token.
     * @param to         Owner wallet address
     * @param firestoreId  Off-chain agent ID (links Firestore record to on-chain token)
     * @param name       Agent display name
     * @param strategyType  e.g. "momentum", "spot_grid_bot"
     */
    function registerAgent(
        address to,
        string calldata firestoreId,
        string calldata name,
        string calldata strategyType
    ) external returns (uint256) {
        require(bytes(firestoreId).length > 0, "Empty firestoreId");
        require(firestoreToToken[firestoreId] == 0 || !_exists(firestoreToToken[firestoreId]), "Already registered");

        _nextTokenId++;
        uint256 tokenId = _nextTokenId;

        _safeMint(to, tokenId);
        agents[tokenId] = AgentMeta(strategyType, name, block.timestamp);
        firestoreToToken[firestoreId] = tokenId;

        emit AgentRegistered(tokenId, to, firestoreId, strategyType);
        return tokenId;
    }

    /**
     * @notice Anchor a checkpoint hash on-chain for a given agent.
     *         Only the token owner can anchor.
     * @param tokenId        The agent's token ID
     * @param checkpointHash keccak256 of the serialized checkpoint batch
     */
    function anchorCheckpoint(uint256 tokenId, bytes32 checkpointHash) external {
        require(ownerOf(tokenId) == msg.sender, "Not agent owner");
        checkpointAnchors[tokenId] = checkpointHash;
        checkpointTimestamps[tokenId] = block.timestamp;
        emit CheckpointAnchored(tokenId, checkpointHash, block.timestamp);
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        if (tokenId == 0 || tokenId > _nextTokenId) return false;
        try this.ownerOf(tokenId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }

    function totalAgents() external view returns (uint256) {
        return _nextTokenId;
    }
}
