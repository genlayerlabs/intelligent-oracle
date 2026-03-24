// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ["@nuxtjs/tailwindcss"],

  app: {
    head: {
      link: [{ rel: "icon", type: "image/png", href: "/favicon.png" }],
    },
  },

  nitro: {
    preset: "", // you can use 'vercel' or other providers here
  },

  runtimeConfig: {
    openaiApiKey: "",
    public: {
      chatApiUrl: process.env.NUXT_PUBLIC_CHAT_API_URL,
      bridgeApiUrl: process.env.NUXT_PUBLIC_BRIDGE_API_URL,
      explorerUrl: process.env.NUXT_PUBLIC_EXPLORER_URL,
    },
  },

  compatibilityDate: "2024-07-05",

  tailwindcss: {
    configPath: "~/tailwind.config.js",
  },
});
