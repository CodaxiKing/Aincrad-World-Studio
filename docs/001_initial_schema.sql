-- Proposta de migração PostgreSQL. Ainda não conectada ao editor e não homologada.
BEGIN;
CREATE TABLE projects (id uuid PRIMARY KEY, name text NOT NULL, owner_id text NOT NULL, target_version text NOT NULL DEFAULT '1.21.11');
CREATE TABLE floors (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects(id), number smallint NOT NULL CHECK(number BETWEEN 1 AND 100),
 kind text NOT NULL CHECK(kind IN ('city','exploration','island','maze','dungeon','boss','mixed')),
 config jsonb NOT NULL, UNIQUE(project_id,number)
);
CREATE TABLE floor_revisions (id uuid PRIMARY KEY, floor_id uuid NOT NULL REFERENCES floors(id), parent_id uuid REFERENCES floor_revisions(id), object_key text NOT NULL, checksum text NOT NULL, generator_version text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE realms (id uuid PRIMARY KEY, name text NOT NULL);
CREATE TABLE seasons (id uuid PRIMARY KEY, realm_id uuid NOT NULL REFERENCES realms(id), name text NOT NULL);
CREATE TABLE boss_attempts (
 id uuid PRIMARY KEY, season_id uuid NOT NULL REFERENCES seasons(id), gate smallint NOT NULL CHECK(gate BETWEEN 1 AND 100),
 server_id text NOT NULL, roster jsonb NOT NULL, rules_version integer NOT NULL,
 status text NOT NULL CHECK(status IN ('active','completed','failed')), completion_id uuid UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE TABLE first_clears (season_id uuid NOT NULL REFERENCES seasons(id), gate smallint NOT NULL CHECK(gate BETWEEN 1 AND 100), attempt_id uuid NOT NULL UNIQUE REFERENCES boss_attempts(id), PRIMARY KEY(season_id,gate));
CREATE TABLE unlocks (season_id uuid NOT NULL REFERENCES seasons(id), floor_number smallint NOT NULL CHECK(floor_number BETWEEN 1 AND 100), attempt_id uuid NOT NULL REFERENCES boss_attempts(id), PRIMARY KEY(season_id,floor_number));
CREATE TABLE outbox (id uuid PRIMARY KEY, aggregate_id uuid NOT NULL, event_type text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz);
CREATE INDEX outbox_pending ON outbox(created_at) WHERE delivered_at IS NULL;
CREATE TABLE reward_grants (id uuid PRIMARY KEY, attempt_id uuid NOT NULL REFERENCES boss_attempts(id), player_id uuid NOT NULL, reward_key text NOT NULL, payload jsonb NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','delivered')), UNIQUE(attempt_id,player_id,reward_key));
CREATE TABLE characters (player_id uuid PRIMARY KEY, state jsonb NOT NULL, version bigint NOT NULL DEFAULT 0, fencing_token bigint NOT NULL DEFAULT 0, lease_expires_at timestamptz);
COMMIT;

-- Contrato de primeira vitória para implementar no serviço autenticado:
-- BEGIN; SELECT attempt FOR UPDATE; validar servidor, roster e estado ativo.
-- Repetição do mesmo completion_id retorna o resultado prévio; ID diferente é rejeitado.
-- UPDATE boss_attempts ... status=completed ...;
-- INSERT first_clears ... ON CONFLICT (season_id,gate) DO NOTHING RETURNING attempt_id;
-- Somente se ganhou a inserção: INSERT unlocks (gate+1 quando gate<100), INSERT outbox.
-- Recompensas de replay são gravadas para cada tentativa com as chaves únicas acima.
-- COMMIT; publicar outbox com consumidores idempotentes. Redis não decide primeira vitória.
