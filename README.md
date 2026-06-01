# Autonomous Solana Newsroom Agent (SAP & x402 Integration)

Submitted for **Reward Category 2: Ace Data Cloud Usage (x402 Facilitator)**

---

### Quick Links
* 🎥 **[Live Walkthrough Video](https://www.loom.com/share/02aa1fc373d8477aaa11b90fd206b303)**
* 💻 **[GitHub Repository](https://github.com/binismail/solana-newsroom-agent)**
* 🔑 **Agent Public Wallet:** `CN5KEkSrn89TW79uuPvkgnUYRDTZNHNJ4j2rmwhGWsBR`

---

## 🤖 Core Workflow Overview

The **Autonomous Solana Newsroom Agent** is a production-grade Web3 media agent that autonomously aggregates news, summarizes updates, and designs creative digital artwork for the Solana ecosystem. The entire workflow operates in a fully decentralized, pay-as-you-go paradigm:

```mermaid
graph TD
    A[Autonomous Trigger] --> B[SAP Tool Discovery]
    B --> C[Scraping via WebExtrator Extract API]
    C --> D[Text Analysis & Headline Synthesis via OpenAI Chat API]
    D --> E[Creative Artwork Generation via Flux Images API]
    E --> F[Verification & Cycle Completion]
```

### End-to-End Pipeline Steps
1. **Trigger:** The agent initiates a scheduled execution run.
2. **SAP Tool Discovery:** Programmatically discovers active protocol service configurations, USDC settlement settings, and registered PDA configurations on Solana Mainnet-Beta.
3. **Scraping (Ace Data Cloud WebExtrator):** Periodically scrapes Solana's official blog or dev portals to fetch target HTML data and converts it into structured Markdown.
4. **Text Analysis (OpenAI Chat Completion):** Processes the scraped Markdown through LLM completions to generate a punchy headline, structured news summary, and creative visual prompt.
5. **Creative Artwork Gen (Flux Images Generation):** Requests high-quality Flux image generation using the synthesized prompt to act as the primary graphic asset for the news item.
6. **Throttled Termination:** To conserve Ace Data Cloud platform credit metrics and optimize resource efficiency, the execution loop is hard-capped to exactly **3 continuous cycles** (Loops #1, #2, and #3) before gracefully terminating the process via `process.exit(0)`.

---

## 📽️ Walkthrough Video Deliverables

This repository is designed to cleanly satisfy all manual judging requirements. Key agent components demonstrated in the walkthrough video include:

### 🔍 1. Tool Discovery via Synapse Agent Protocol (SAP)
* **On-Chain Registry Queries:** The agent utilizes the `@oobe-protocol-labs/synapse-sap-sdk` library to programmatically fetch registered developer configurations, registry bumps, and active endpoints.
* **Capability Validation:** The program checks capabilities (such as `news-scraping`, `news-analysis`, and `visual-generation`) against active SAP coordination registry endpoints to ensure it discovers valid routing information before starting execution.

### ⚙️ 2. Core Execution
* **Endpoint Pipeline:** The agent sequentially triggers three distinct Ace Data Cloud API endpoints:
  1. **WebExtrator Extract API:** Handles javascript-heavy news sites and formats plain article contents.
  2. **OpenAI Chat Completion:** Evaluates and formats structured JSON containing final headlines and summary contents.
  3. **Flux Images Generation API:** Generates and serves high-definition visual assets.
* **Hybrid Polling Workaround:** Implements a custom polling loop that queries task completion via `finished_at` properties to resolve synchronous and asynchronous generation tasks cleanly, avoiding hanging issues present in standard SDK wait loops.

### ⛓️ 3. On-Chain Registration & Settlement
* **Mainnet PDA Identity:** The agent automatically checks if a registered PDA (`AgentAccount`) is active on Mainnet-Beta. If absent, it submits a transaction to register its identity under the Solana Mainnet-Beta SAP program registry.
* **x402 Payment Interceptor:** 
  * Intercepts standard `402 Payment Required` HTTP response headers returned by the SDK transport layer.
  * Extracted payment payloads are parsed by a custom `KeypairWalletAdapter`.
  * **ATA Auto-Initialization:** If the recipient's Associated Token Account (ATA) does not exist on-chain, the adapter dynamically unshifts a `createAssociatedTokenAccountInstruction` instruction into the Solana transaction to initialize the ATA.
  * **On-Chain Signing & Settlement:** Signs and submits the USDC payment transaction on-chain via the Mainnet-Beta RPC gateway, attaching the confirmed transaction signature to the `X-Payment` request headers to finalize API authentication natively.

---

## 🛠️ Installation & Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/binismail/solana-newsroom-agent.git
   cd solana-newsroom-agent
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env` file in the root directory:

   * **For on-chain x402 payments (Recommended for Category 2):** Leave `ACEDATACLOUD_API_TOKEN` empty or commented out. Fund the agent's keypair wallet (`CN5KEkSrn89TW79uuPvkgnUYRDTZNHNJ4j2rmwhGWsBR`) with **SOL** (for gas/registration fee) and **USDC** (to settle API calls on-chain).
   * **For API-token billing:** Provide your token in `ACEDATACLOUD_API_TOKEN` (this will bypass X402 as long as token has credits).

   ```env
   SOLANA_NETWORK=mainnet-beta
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   SOLANA_KEYPAIR_PATH=./agent-keypair.json
   # ACEDATACLOUD_API_TOKEN=
   ```

4. **Add Your Wallet Keypair:**
   Save your funded keypair as a JSON array inside a file named `agent-keypair.json` in the root directory.

5. **Build & Run:**
   ```bash
   npm run build
   npm run start
   ```

---

## 🔗 On-Chain Proof & Verification

A complete run log is saved in [`logs/run-2026-06-01-synapse-rpc.log`](logs/run-2026-06-01-synapse-rpc.log) showing the full 3-iteration pipeline execution on **Solana Mainnet-Beta** using the **Synapse RPC gateway**.

### Key On-Chain Addresses

| Resource | Address |
|---|---|
| **Agent Wallet** | [`CN5KEkSrn89TW79uuPvkgnUYRDTZNHNJ4j2rmwhGWsBR`](https://explorer.solana.com/address/CN5KEkSrn89TW79uuPvkgnUYRDTZNHNJ4j2rmwhGWsBR) |
| **Agent PDA (SAP)** | [`FDFUWf9YHkKuPKLnwf9koKGU4aYPBiSz3LTQUtfprxXZ`](https://explorer.solana.com/address/FDFUWf9YHkKuPKLnwf9koKGU4aYPBiSz3LTQUtfprxXZ) |
| **SAP Program** | [`SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ`](https://explorer.solana.com/address/SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ) |
| **USDC Mint** | [`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`](https://explorer.solana.com/address/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v) |

### Sample X402 USDC Payment Transactions

| Iteration | Service | Solana Explorer Link |
|---|---|---|
| **Iteration 1** | Web Scraper | [`Sfeq6BVh...`](https://explorer.solana.com/tx/Sfeq6BVhSWmS3cbdGNKt4ULt3KLNvLs4HiUHbaxm29cTznZ19pW1Akjd4HeNUP8YxZ579kddqPYDrnbQUUL1VkD) |
| **Iteration 1** | LLM Completion | [`34CVNk4C...`](https://explorer.solana.com/tx/34CVNk4CVHzJK6EibeSTLLAAxRd5pcd65ZYaAU2tgrxJqnYfvEb9avgGYQGAM9Dt17d5JnzBTBCS6bpppT9UZC4W) |
| **Iteration 1** | Image Generation | [`53d7SXS7...`](https://explorer.solana.com/tx/53d7SXS7cCLtG9V4T9oszN9tn3UUYaEcpG16XygaoGNMwvHqDBPuHPKBqE4AMeaBtgexMnshMnMzNPAALQaBrPX2) |
| **Iteration 2** | Web Scraper | [`ZY8hWKH5...`](https://explorer.solana.com/tx/ZY8hWKH5GEzwpN7deR3nMhrzkGVsXt2rPNqNr6QDP464NULmFrTkiSDab1MnDMcXJMeKZS3rVbMAirJefTAixJv) |
| **Iteration 2** | LLM Completion | [`5C2mp2UR...`](https://explorer.solana.com/tx/5C2mp2UR6EBQTK5HnpRNwCbB5MEQzR5JN5NRRVpRJfPSDa77oWnSVhy8yDpEsYVLxMmEpr7nAxTk9n4vbVfB5N5d) |
| **Iteration 2** | Image Generation | [`3KXKW7h1...`](https://explorer.solana.com/tx/3KXKW7h1QvyTdTo2DisALGfNFS7D6e12HPnZJPXnqVKuurMgHBct8VvboU2XnXfgAaEDegE2YiHbwyEo2y2uVjQn) |
| **Iteration 3** | Web Scraper | [`48zSfUPN...`](https://explorer.solana.com/tx/48zSfUPN7ABJNxjeJpfESqBihdPzBzxe9ZA1cPKyy79KAkZrcsEAsFcR22t3wEF9Qeq5AY3Yt3vvqzh4KKBwG5cC) |
| **Iteration 3** | LLM Completion | [`65wHoH8t...`](https://explorer.solana.com/tx/65wHoH8tKQt5tefm9DjgR1HWWrbKEK4ykGiLdP257CneDUwEVx2bJ6NuoescCB7kqMHycy32EbbekZR9DVbYsiwD) |
| **Iteration 3** | Image Generation | [`amKXrrcQ...`](https://explorer.solana.com/tx/amKXrrcQeL46kMxFigBPTob9LUdBn6rwAnEP1xjzBkT7jnpaEmZti7LbeyLgeKjdCmyQ5L7HhFQAckGbdpiN4we) |

### SAP Stats Report Transactions

| Iteration | Solana Explorer Link |
|---|---|
| **Iteration 1** | [`4abv7Ha6...`](https://explorer.solana.com/tx/4abv7Ha6sb8B9WAtvCBauci4ssCJd3NyY82748XVW9oBuaCMTR9fb9jMCxwmbLc81N77UPYqE7aqtdpSpoyxSoPz) |
| **Iteration 2** | [`4F2rw3zX...`](https://explorer.solana.com/tx/4F2rw3zXx4syXVX7eNJEYfUqZCPmjLo3cj4eejdnATvEbvW4cjiUEdfx3YWvKnmwkWCKxxFKLKiYmXgZHQMMm7Ho) |
| **Iteration 3** | [`2fKe3YbM...`](https://explorer.solana.com/tx/2fKe3YbMCupoVhNaNPpaCLY4fwphjVi7HgQ7eV3KGvDj2UvMnJjtQSPRcC3Wi4maCdomoJHYAzA7x4SYp6MPf7xp) |
