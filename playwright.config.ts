import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [["allure-playwright"]],
  use: {
    baseURL: "http://localhost:8080", // Укажите базовый URL вашего API
    trace: "on",
  },
  workers: 4,
});