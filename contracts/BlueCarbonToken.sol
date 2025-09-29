// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BlueCarbonToken
 * @dev ERC-20 token for Blue Carbon Credits
 * @author Carbon Credit System
 * 
 * Features:
 * - Mintable by authorized minters
 * - Pausable for emergency stops
 * - Transfer restrictions for compliance
 * - Burn functionality for carbon offset verification
 * - Metadata for carbon credit tracking
 */
contract BlueCarbonToken is ERC20, Ownable, Pausable, ReentrancyGuard {
    
    // Token metadata
    uint8 private constant DECIMALS = 18;
    uint256 private constant INITIAL_SUPPLY = 0; // No initial supply, all tokens minted as needed
    
    // Carbon credit tracking
    struct CarbonCredit {
        uint256 amount;
        string projectId;
        string verificationHash;
        uint256 timestamp;
        bool verified;
    }
    
    // Mappings for carbon credit tracking
    mapping(address => CarbonCredit[]) public userCredits;
    mapping(string => bool) public verifiedProjects;
    
    // Authorized minters (admin addresses)
    mapping(address => bool) public authorizedMinters;
    
    // Transfer restrictions
    bool public transfersEnabled = true;
    mapping(address => bool) public blacklistedAddresses;
    
    // Events
    event CarbonCreditMinted(
        address indexed to,
        uint256 amount,
        string projectId,
        string verificationHash
    );
    
    event CarbonCreditBurned(
        address indexed from,
        uint256 amount,
        string reason
    );
    
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event ProjectVerified(string indexed projectId);
    
    // Modifiers
    modifier onlyMinter() {
        require(authorizedMinters[msg.sender] || msg.sender == owner(), "Not authorized minter");
        _;
    }
    
    modifier whenTransfersEnabled() {
        require(transfersEnabled, "Transfers are currently disabled");
        _;
    }
    
    modifier notBlacklisted(address account) {
        require(!blacklistedAddresses[account], "Address is blacklisted");
        _;
    }
    
    constructor() ERC20("Blue Carbon Credit Token", "BCCT") {
        // No initial supply - all tokens will be minted as needed
    }
    
    /**
     * @dev Returns the number of decimals for the token
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @dev Mint tokens to a specific address with carbon credit metadata
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     * @param projectId The carbon project ID
     * @param verificationHash The verification hash for the carbon credit
     */
    function mintCarbonCredit(
        address to,
        uint256 amount,
        string memory projectId,
        string memory verificationHash
    ) external onlyMinter whenNotPaused nonReentrant {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        require(bytes(projectId).length > 0, "Project ID cannot be empty");
        require(bytes(verificationHash).length > 0, "Verification hash cannot be empty");
        
        // Mint the tokens
        _mint(to, amount);
        
        // Record the carbon credit
        CarbonCredit memory credit = CarbonCredit({
            amount: amount,
            projectId: projectId,
            verificationHash: verificationHash,
            timestamp: block.timestamp,
            verified: false
        });
        
        userCredits[to].push(credit);
        
        emit CarbonCreditMinted(to, amount, projectId, verificationHash);
    }
    
    /**
     * @dev Mint tokens without carbon credit metadata (for admin use)
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyMinter whenNotPaused {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens (for carbon offset verification)
     * @param amount The amount of tokens to burn
     * @param reason The reason for burning (e.g., "Carbon offset verified")
     */
    function burnCarbonCredit(uint256 amount, string memory reason) external {
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(bytes(reason).length > 0, "Reason cannot be empty");
        
        _burn(msg.sender, amount);
        emit CarbonCreditBurned(msg.sender, amount, reason);
    }
    
    /**
     * @dev Override transfer to include restrictions
     */
    function transfer(address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        whenTransfersEnabled 
        notBlacklisted(msg.sender) 
        notBlacklisted(to) 
        returns (bool) 
    {
        return super.transfer(to, amount);
    }
    
    /**
     * @dev Override transferFrom to include restrictions
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        whenTransfersEnabled 
        notBlacklisted(from) 
        notBlacklisted(to) 
        returns (bool) 
    {
        return super.transferFrom(from, to, amount);
    }
    
    // Admin functions
    
    /**
     * @dev Add an authorized minter
     * @param minter The address to authorize as minter
     */
    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "Cannot add zero address as minter");
        authorizedMinters[minter] = true;
        emit MinterAdded(minter);
    }
    
    /**
     * @dev Remove an authorized minter
     * @param minter The address to remove as minter
     */
    function removeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit MinterRemoved(minter);
    }
    
    /**
     * @dev Enable or disable transfers
     * @param enabled Whether transfers should be enabled
     */
    function setTransfersEnabled(bool enabled) external onlyOwner {
        transfersEnabled = enabled;
    }
    
    /**
     * @dev Blacklist or unblacklist an address
     * @param account The address to blacklist/unblacklist
     * @param blacklisted Whether the address should be blacklisted
     */
    function setBlacklisted(address account, bool blacklisted) external onlyOwner {
        blacklistedAddresses[account] = blacklisted;
    }
    
    /**
     * @dev Verify a carbon project
     * @param projectId The project ID to verify
     */
    function verifyProject(string memory projectId) external onlyOwner {
        require(bytes(projectId).length > 0, "Project ID cannot be empty");
        verifiedProjects[projectId] = true;
        emit ProjectVerified(projectId);
    }
    
    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get carbon credits for a user
     * @param user The user address
     * @return Array of carbon credits
     */
    function getUserCarbonCredits(address user) external view returns (CarbonCredit[] memory) {
        return userCredits[user];
    }
    
    /**
     * @dev Get total carbon credits for a user
     * @param user The user address
     * @return Total amount of carbon credits
     */
    function getUserTotalCarbonCredits(address user) external view returns (uint256) {
        CarbonCredit[] memory credits = userCredits[user];
        uint256 total = 0;
        for (uint256 i = 0; i < credits.length; i++) {
            total += credits[i].amount;
        }
        return total;
    }
    
    /**
     * @dev Check if a project is verified
     * @param projectId The project ID to check
     * @return Whether the project is verified
     */
    function isProjectVerified(string memory projectId) external view returns (bool) {
        return verifiedProjects[projectId];
    }
}
