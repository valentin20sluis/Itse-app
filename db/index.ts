import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("Falta la variable de entorno DATABASE_URL. Configúrala en .env.local.");
}

export const db = drizzle(neon(url), { schema });
