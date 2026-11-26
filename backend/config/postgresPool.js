import { Pool } from "pg";

/** Build an independent PostgreSQL pool. No environment files are loaded here. */
export function createPostgresPool(options) {
  if (!options || typeof options !== "object") {
    throw new TypeError("PostgreSQL pool options are required.");
  }
  return new Pool(options);
}

/** Set the verified application user for RLS inside the current transaction. */
export async function setDatabaseUser(client, userId) {
  if (!userId) throw new TypeError("A verified user ID is required.");
  await client.query("SELECT set_config('app.user_id', $1, true)", [String(userId)]);
}

/** Run scoped SQL atomically and always clear the transaction-local identity. */
export async function withUserTransaction(pool, userId, callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await setDatabaseUser(client, userId);
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
