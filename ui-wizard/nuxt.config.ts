import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  // Keep the legacy layout (`pages/`, `components/` at the project root)
  // instead of moving everything into `app/` per Nuxt 4's new defaults.
  srcDir: ".",

  css: ["~/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
  },

  app: {
    head: {
      link: [{ rel: "icon", type: "image/png", href: "/favicon.png" }],
    },
  },

  nitro: {
    preset: "", // you can use 'vercel' or other providers here
  },

  runtimeConfig: {
    llmApiKey: "",
    public: {
      chatApiUrl: process.env.NUXT_PUBLIC_CHAT_API_URL,
      bridgeApiUrl: process.env.NUXT_PUBLIC_BRIDGE_API_URL,
      explorerUrl: process.env.NUXT_PUBLIC_EXPLORER_URL,
    },
  },

  compatibilityDate: "2026-04-01",
});
