import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env["DATABASE_URL"];
if (databaseUrl === undefined || databaseUrl === "") {
  throw new Error(
    "DATABASE_URL is not set. Drizzle Kit needs it to apply migrations and run Studio. Copy .env.example to .env.local and set the connection string from your Neon project.",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
