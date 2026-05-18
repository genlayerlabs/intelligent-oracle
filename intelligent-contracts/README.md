# Intelligent Oracle System

This repository contains an AI-powered oracle system that can resolve prediction markets using natural language processing and web data analysis.

## System Overview

The system consists of two main contracts:

### Factory Contract

The `Factory` contract serves as both a factory and registry for Intelligent Oracle contracts:

- **Contract Deployment**: Creates new oracle instances with customized parameters
- **Address Registry**: Maintains a list of all deployed oracle addresses
- **Code Management**: Stores and manages the oracle contract code

### IntelligentOracle

The `IntelligentOracle` contract is an AI-powered oracle that resolves prediction market outcomes through web content analysis using Large Language Models (LLMs).

#### Key Features

- **Dual Resolution Methods**: 
  - Predefined URLs: Fixed set of trusted sources
  - Dynamic Evidence: Validated URLs from allowed domains
- **Multi-Source Analysis**: Analyzes multiple sources for consensus
- **LLM-Powered Resolution**: Uses AI to interpret web content and determine outcomes
- **Time-Locked Resolution**: Enforces minimum resolution date
- **Comprehensive Validation**: Includes domain validation and outcome verification

#### Initialization Parameters

- `prediction_market_id`: Unique identifier for the prediction market
- `title`: Oracle title
- `description`: Detailed prediction description
- `potential_outcomes`: List of possible outcomes
- `rules`: Resolution rules
- `data_source_domains`: Allowed domains for evidence (mutually exclusive with resolution_urls)
- `resolution_urls`: Predefined resolution sources (mutually exclusive with data_source_domains)
- `earliest_resolution_date`: Minimum date for resolution

## Resolution Process

1. **Validation Phase**
   - Verifies resolution timing against earliest_resolution_date
   - Validates evidence URLs against allowed domains (if applicable)

2. **Analysis Phase**
   - Fetches content from each source
   - Processes data using LLM analysis
   - Validates source relevance and event occurrence
   - Generates detailed reasoning for each source

3. **Consensus Phase**
   - Aggregates analyses from all sources
   - Resolves any contradictions using rules
   - Determines final outcome

## Status States

- `ACTIVE`: Initial state, awaiting resolution
- `RESOLVED`: Successfully determined outcome
- `ERROR`: Resolution failed or invalid outcome detected
- `UNDETERMINED`: Insufficient data to determine outcome

## Deployment & Usage

### Deployment Instructions

1. **Environment Setup**
   First, make sure you have a `.env` file in your project root with the RPC URL:
   ```
   RPC_URL=your_rpc_endpoint_here
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run the Deploy Script**
   ```bash
   npm run deploy
   ```

   The script will:
   - Deploy the IntelligentOracleFactory contract
   - Pass the IntelligentOracle source into the factory constructor so new markets can deploy oracle instances
   - Output the deployed contract address
   - Save this address as you'll need it to interact with the contract

### Creating New Prediction Markets

Once deployed, you can create new prediction markets using the `create_new_prediction_market` method. Here's an example:

```javascript
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const account = createAccount(bridgePrivateKey);
const client = createClient({
  chain: studionet,
  account,
  endpoint: rpcUrl || undefined
});

// Create a new prediction market
const deploymentArgs = [
  "PM_001",  // predictionMarketId
  "World Cup 2026 Winner",  // title
  "Predict which country will win the 2026 FIFA World Cup",  // description
  [  // potentialOutcomes
    "USA",
    "Brazil",
    "Argentina",
    "France",
    "Other"
  ],
  [  // rules
    "Resolution based on official FIFA announcement",
    "Market resolves after the World Cup final",
    "If tournament is cancelled, market resolves as 'Invalid'"
  ],
  ["fifa.com", "uefa.com"],  // dataSourceDomains
  [],  // resolutionURLs (empty if using dataSourceDomains)
  "2026-07-20"  // earliestResolutionDate
];

const registerContractTransactionHash = await client.writeContract({
  address: icAddress,
  functionName: "create_new_prediction_market",
  args: deploymentArgs,
  value: BigInt(0)
});

const receipt = await client.waitForTransactionReceipt({
  hash: registerContractTransactionHash,
  status: TransactionStatus.FINALIZED
});
const triggered = await client.getTriggeredTransactionIds({
  hash: registerContractTransactionHash
});

// The receipt will contain the transaction details and deployment status
console.log("Deployment receipt:", receipt);
console.log("Triggered oracle deploy transactions:", triggered);
```

Key points to remember:
- `prediction_market_id` must be unique
- Use either `data_source_domains` or `resolution_urls`, not both
- `earliest_resolution_date` should be in "YYYY-MM-DD" format
- `potential_outcomes` should include all possible outcomes
- `rules` should clearly define how the market will be resolved

The created oracle will start in an `ACTIVE` state and can be resolved once the `earliest_resolution_date` has passed using the resolution process described above.

## Example Usage

```python
# Creating a new prediction market oracle via Registry
registry.create_new_prediction_market(
    prediction_market_id="0",
    title="Spain vs Italy Euro 2024",
    description="Predict the match outcome",
    potential_outcomes=["Spain Wins", "Italy Wins", "Draw"],
    rules=["Result based on official score", "..."],
    data_source_domains=[],
    resolution_urls=["https://example.com/results"],
    earliest_resolution_date="2024-06-21"
)

# Resolving an oracle with evidence
oracle.resolve(evidence_url="https://trusted-domain.com/evidence")
```
