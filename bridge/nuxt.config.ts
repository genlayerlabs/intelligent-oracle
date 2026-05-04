import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  // Keep the legacy layout (`pages/`, `server/` at the project root) instead
  // of moving everything into `app/` per Nuxt 4's new defaults.
  srcDir: ".",

  css: ["~/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
  },

  nitro: {
    preset: "", // you can use 'vercel' or other providers here
  },

  runtimeConfig: {
    llmBaseUrl: process.env.NUXT_LLM_BASE_URL,
    llmApiKey: process.env.NUXT_LLM_API_KEY,
    llmApiModel: process.env.NUXT_LLM_API_MODEL,
    simulatorUrl: process.env.NUXT_SIMULATOR_ENDPOINT,
    bridgePrivateKey: process.env.NUXT_BRIDGE_PRIVATE_KEY,
    icRegistryAddress: process.env.NUXT_IC_REGISTRY_ADDRESS,
  },

  compatibilityDate: "2026-04-01",
});
