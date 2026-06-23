import { createClient } from "@libsql/client/web";

const tursoUrl = process.env.TURSO_URL || "";
const tursoToken = process.env.TURSO_TOKEN || "";

export const db = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});
