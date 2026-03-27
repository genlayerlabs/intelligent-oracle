# Bridge & Chat API 

## Overview

This project provides two core APIs that power the GenLayer Intelligent Oracle:
1. A Bridge API for deploying Intelligent Oracles to the GenLayer blockchain
2. A Chat API that integrates OpenAI's GPT models to provide natural language assistance in the UI wizard component

## Features

### Bridge API
- Handles deployment of Intelligent Oracles to GenLayer
- Manages transaction signing and blockchain interactions
- Provides status updates during deployment process

### Chat API
- Integrates with OpenAI's GPT models
- Streams AI responses in real-time
- Processes natural language inputs for the wizard interface
- Maintains conversation context for multi-step configurations

## Technologies Used

- Node.js
- OpenAI API
- GenLayer SDK
- Edge Functions (Vercel/Cloudflare)

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   Create a `.env` file in the root directory and add:
   ```
   NUXT_LLM_BASE_URL=https://openrouter.ai/api/v1
   NUXT_LLM_API_KEY=your_llm_api_key_here
   NUXT_LLM_API_MODEL=openai/gpt-5-mini
   NUXT_BRIDGE_PRIVATE_KEY=your_bridge_api_key_here
   NUXT_SIMULATOR_ENDPOINT=simulator_endpoint_here
   NUXT_IC_REGISTRY_ADDRESS=ic_registry_address_here
   ```

## Usage
1. Install dependencies:   
   ```
   npm install
   ```
2. Start the development server:
   ```
   npm run dev
   ```
3. Open your browser and navigate to `http://localhost:3000`

Note: the port may vary depending on the configuration of your local machine and other running services. For example, if you are running the [ui-wizard](../ui-wizard) project, it will use port 3001 by default.

## API Reference

### Bridge API Endpoints
- `POST /api/bridge/deploy-intelligent-oracle`: Deploy a new Intelligent Oracle

### Chat API Endpoints
- `POST /api/chat`: Send message to AI assistant

