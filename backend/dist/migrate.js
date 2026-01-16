import { pool } from './db.js';
export async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);
        // migration 001: base tables
        const migId = '001_initial';
        const { rows } = await client.query('SELECT 1 FROM schema_migrations WHERE id = $1', [migId]);
        if (rows.length === 0) {
            await client.query(`
        CREATE TABLE IF NOT EXISTS app_user (
          id uuid PRIMARY KEY,
          email text UNIQUE NOT NULL,
          password_hash text NOT NULL,

          key_ciphertext text NOT NULL,
          key_nonce text NOT NULL,
          key_tag text NOT NULL,
          key_alg text NOT NULL DEFAULT 'aes-256-gcm',

          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS vault_item (
          id uuid PRIMARY KEY,
          user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,

          -- minimal non-sensitive metadata for listing/search
          title text NOT NULL,
          type text NOT NULL,       -- 'Application' | 'Server'
          category text NOT NULL,

          enc_ciphertext text NOT NULL,
          enc_nonce text NOT NULL,
          enc_tag text NOT NULL,
          enc_alg text NOT NULL DEFAULT 'aes-256-gcm',
          enc_kid text NULL,

          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_vault_item_user ON vault_item(user_id);
        CREATE INDEX IF NOT EXISTS idx_vault_item_title ON vault_item(user_id, title);
        CREATE INDEX IF NOT EXISTS idx_vault_item_category ON vault_item(user_id, category);

        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS trigger AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_app_user_updated_at') THEN
            CREATE TRIGGER trg_app_user_updated_at
            BEFORE UPDATE ON app_user
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_vault_item_updated_at') THEN
            CREATE TRIGGER trg_vault_item_updated_at
            BEFORE UPDATE ON vault_item
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
          END IF;
        END$$;
      `);
            await client.query('INSERT INTO schema_migrations(id) VALUES ($1)', [migId]);
        }
        // 002_icons: add icon metadata fields to vault_item
        const mig002 = await client.query('SELECT 1 FROM schema_migrations WHERE id = $1', ['002_icons']);
        if (mig002.rows.length === 0) {
            await client.query(`
        ALTER TABLE vault_item
          ADD COLUMN IF NOT EXISTS icon_kind TEXT,
          ADD COLUMN IF NOT EXISTS icon_url TEXT,
          ADD COLUMN IF NOT EXISTS icon_ref TEXT,
          ADD COLUMN IF NOT EXISTS icon_mime TEXT;
      `);
            await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', ['002_icons']);
        }
        // 003_roles: add role to app_user and promote first user to admin if none exists
        const mig003 = await client.query('SELECT 1 FROM schema_migrations WHERE id = $1', ['003_roles']);
        if (mig003.rows.length === 0) {
            await client.query(`
        ALTER TABLE app_user
          ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
      `);
            // Backward compatibility: if upgrading an existing database that already has users,
            // ensure there is at least one admin by promoting the earliest-created account.
            await client.query(`
        UPDATE app_user
           SET role = 'admin'
         WHERE id = (
           SELECT id FROM app_user ORDER BY created_at ASC LIMIT 1
         )
           AND NOT EXISTS (SELECT 1 FROM app_user WHERE role = 'admin');
      `);
            await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', ['003_roles']);
        }
        // 004_icon_db: store uploaded/imported icons in PostgreSQL (BYTEA) instead of filesystem
        const mig004 = await client.query('SELECT 1 FROM schema_migrations WHERE id = $1', ['004_icon_db']);
        if (mig004.rows.length === 0) {
            await client.query(`
        CREATE TABLE IF NOT EXISTS vault_icon (
          vault_item_id uuid PRIMARY KEY REFERENCES vault_item(id) ON DELETE CASCADE,
          user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
          icon_ref text UNIQUE NOT NULL,
          content_type text NOT NULL,
          data bytea NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_vault_icon_user ON vault_icon(user_id);
        CREATE INDEX IF NOT EXISTS idx_vault_icon_ref ON vault_icon(icon_ref);

        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_vault_icon_updated_at') THEN
            CREATE TRIGGER trg_vault_icon_updated_at
            BEFORE UPDATE ON vault_icon
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
          END IF;
        END$$;
      `);
            await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', ['004_icon_db']);
        }
        await client.query('COMMIT');
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
}
