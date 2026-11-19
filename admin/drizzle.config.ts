import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      process.env.SUPABASE_DATABASE_URL_WRITER ||
      "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});
