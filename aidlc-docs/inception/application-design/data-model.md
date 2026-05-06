# Data Model — Postgres schema

**Generated**: 2026-05-04T00:21:00Z
**Source**: PRD § 11 + Stage 4 NFRs (Strict classification, retention, audit)
**Engine**: Postgres 15+ with `pgvector` extension

Two schemas:
- `app` — operational entities (read+write by `app_role`)
- `audit` — append-only audit log (`audit_writer_role` has INSERT only; no UPDATE/DELETE grants)

---

## Schema overview

```
app schema
├── users                  ── role-aware accounts (shopper / merchant / admin)
├── addresses              ── shipping/billing per user
├── conversations          ── chat sessions
├── messages               ── individual chat turns + widget payloads
├── categories             ── product taxonomy
├── products               ── catalog
├── product_variants       ── SKU-level variants + stock
├── product_search_index   ── pgvector embedding column
├── carts                  ── one open cart per shopper
├── cart_items             ── cart line items
├── orders                 ── shopper orders
├── order_items            ── order line items (price-at-purchase frozen)
├── customers              ── merchant-view of shoppers (tags, segments, LTV)
├── notifications          ── in-app merchant notifications
├── agent_events           ── outbox for inter-agent events
└── idempotency_keys       ── deduplication for write requests

audit schema
└── audit_log              ── immutable record of every write
```

---

## Tables (DDL sketch — NestJS / Prisma will derive a more exact form at Stage 12)

### `app.users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| role | TEXT NOT NULL CHECK (role IN ('shopper','merchant','admin')) | NFR-AUTH |
| email | CITEXT UNIQUE NOT NULL | encrypted-at-rest column (NFR-SEC-01) |
| password_hash | TEXT NOT NULL | argon2id |
| name | TEXT | nullable; encrypted at rest |
| phone | TEXT | nullable; encrypted at rest |
| status | TEXT NOT NULL DEFAULT 'active' | active / disabled / anonymized |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() | |
| last_active_at | TIMESTAMPTZ | drives PII retention cutoff |

### `app.addresses`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users(id) | |
| type | TEXT CHECK (type IN ('shipping','billing')) | |
| line1, line2, city, state, postal_code, country_code | TEXT | encrypted at rest (NFR-SEC-01) |
| created_at, updated_at | TIMESTAMPTZ | |

### `app.conversations`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users(id) | |
| started_at | TIMESTAMPTZ | |
| last_activity_at | TIMESTAMPTZ | drives transcript retention cutoff (NFR-PRIV-03) |

### `app.messages`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| conversation_id | UUID FK → conversations(id) | |
| sender | TEXT CHECK (sender IN ('user','agent','system')) | |
| sender_role | TEXT NULL CHECK (sender_role IN ('shopper','merchant','admin')) | |
| content | TEXT | the textual content (encrypted at rest — transcripts are PII per BR § 2.8) |
| widget_payload | JSONB | structured widget JSON if assistant turn rendered one |
| agent_name | TEXT NULL | e.g., 'product_agent' |
| created_at | TIMESTAMPTZ | indexed for retention sweep |

### `app.categories`
Standard hierarchical taxonomy: `id`, `name`, `parent_id`, `slug`, `created_at`.

### `app.products`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| title | TEXT NOT NULL | |
| description | TEXT | |
| price_cents | INTEGER NOT NULL CHECK (price_cents >= 0) | INR paise |
| currency | TEXT NOT NULL DEFAULT 'INR' | en-IN MVP |
| category_id | UUID FK → categories(id) | |
| status | TEXT CHECK (status IN ('active','archived')) DEFAULT 'active' | soft-delete (FR-AGT-PROD-04) |
| image_urls | TEXT[] | |
| created_at, updated_at | TIMESTAMPTZ | |
| created_by_user_id | UUID FK → users(id) | merchant who added |

### `app.product_variants`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| product_id | UUID FK → products(id) | |
| sku | TEXT UNIQUE | |
| attributes | JSONB | size, color, etc. |
| stock | INTEGER NOT NULL CHECK (stock >= 0) | |
| low_stock_threshold | INTEGER NOT NULL DEFAULT 5 | drives FR-NOTIF-02 |
| created_at, updated_at | TIMESTAMPTZ | |

### `app.product_search_index` (pgvector)
| Column | Type | Notes |
|--------|------|-------|
| product_id | UUID PK FK → products(id) | one row per product |
| embedding | VECTOR(1536) | dim depends on LLM provider; MVP placeholder |
| text_blob | TEXT | concatenated title + desc + category for tsvector |
| tsv | TSVECTOR | for keyword fallback (ERR-03) |
| updated_at | TIMESTAMPTZ | rebuilt on schedule (BR § 2.11) |

Index: `ivfflat (embedding vector_cosine_ops) WITH (lists = 100)` + `gin (tsv)`.

### `app.carts`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK UNIQUE → users(id) | one open cart per shopper (FR-AGT-CART-05) |
| status | TEXT CHECK (status IN ('open','converted','abandoned')) DEFAULT 'open' | |
| created_at, updated_at | TIMESTAMPTZ | |

### `app.cart_items`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| cart_id | UUID FK → carts(id) | |
| variant_id | UUID FK → product_variants(id) | |
| quantity | INTEGER NOT NULL CHECK (quantity > 0) | |
| added_at | TIMESTAMPTZ | |

### `app.orders`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users(id) | |
| status | TEXT CHECK (status IN ('placed','paid','fulfilled','shipped','delivered','cancelled','refunded','returned')) | |
| total_cents | INTEGER NOT NULL | |
| currency | TEXT DEFAULT 'INR' | |
| shipping_address_id | UUID FK → addresses(id) | |
| payment_ref | TEXT | nullable in MVP (simulated) |
| tracking_number, tracking_carrier | TEXT | |
| placed_at, last_status_change_at | TIMESTAMPTZ | |

### `app.order_items`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| order_id | UUID FK → orders(id) | |
| variant_id | UUID FK → product_variants(id) | |
| quantity | INTEGER | |
| price_at_purchase_cents | INTEGER NOT NULL | frozen at order creation |

### `app.customers`
Merchant-view projection of shoppers + merchant-added metadata.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users(id) | the underlying shopper |
| tags | TEXT[] | merchant-added |
| segments | TEXT[] | derived (e.g., 'high-ltv') |
| ltv_cents | INTEGER NOT NULL DEFAULT 0 | recalculated on order events |
| order_count | INTEGER NOT NULL DEFAULT 0 | |
| created_at, updated_at | TIMESTAMPTZ | |

### `app.notifications` (NEW vs PRD)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| recipient_user_id | UUID FK → users(id) | merchant role only in MVP |
| type | TEXT CHECK (type IN ('new_order','low_stock','customer_action','system')) | |
| payload | JSONB | event-specific |
| read_at | TIMESTAMPTZ NULL | |
| created_at | TIMESTAMPTZ | |

### `app.agent_events` (outbox pattern)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| event_type | TEXT | e.g., 'order.created', 'order.shipped', 'product.created', 'cart.updated' |
| payload | JSONB | |
| emitted_by_module | TEXT | e.g., 'order_agent' |
| consumed_by | TEXT[] | append-only list of consumer names |
| committed_to_stream_at | TIMESTAMPTZ NULL | NULL = pending; populated by outbox worker |
| created_at | TIMESTAMPTZ | |

### `app.idempotency_keys`
| Column | Type | Notes |
|--------|------|-------|
| key | TEXT PK | client-supplied |
| user_id | UUID FK → users(id) | |
| request_fingerprint | TEXT | hash of method + path + body |
| response_status, response_body | for replay | |
| created_at | TIMESTAMPTZ | TTL 24 h |

### `audit.audit_log`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| actor_user_id | UUID NULL | NULL for system actions |
| actor_role | TEXT NULL | snapshot at action time |
| action | TEXT | e.g., 'product.create', 'order.refund' |
| entity | TEXT | e.g., 'products', 'orders' |
| entity_id | UUID | |
| before, after | JSONB | full row state pre/post |
| request_id | TEXT | correlates to logs |
| created_at | TIMESTAMPTZ | |

**Append-only enforcement**: `app_role` has SELECT only on `audit.audit_log`; `audit_writer_role` has INSERT only (no UPDATE / DELETE grants). No update triggers exist on the table.

---

## Indexes (initial)

| Table | Index | Purpose |
|-------|-------|---------|
| users | (email) UNIQUE | login lookup |
| users | (last_active_at) | retention sweep |
| messages | (conversation_id, created_at) | history fetch |
| messages | (created_at) | retention sweep |
| products | (category_id, status) | filter |
| product_variants | (product_id) | per-product lookup |
| product_variants | (stock) WHERE stock <= low_stock_threshold | low-stock notification trigger |
| product_search_index | ivfflat embedding + gin(tsv) | semantic + keyword search |
| carts | (user_id) UNIQUE WHERE status = 'open' | one open cart per shopper |
| orders | (user_id, placed_at DESC) | shopper order history |
| orders | (status) | merchant filter |
| order_items | (order_id) | line items per order |
| customers | (user_id) UNIQUE | merchant-view per shopper |
| notifications | (recipient_user_id, read_at) | inbox queries |
| agent_events | (committed_to_stream_at) WHERE committed_to_stream_at IS NULL | outbox drain |
| audit_log | (entity, entity_id, created_at DESC) | record reconstruction |

---

## Migrations & retention

| Concern | Approach |
|---------|----------|
| Migrations | Prisma Migrate with named timestamped migrations; one PR per migration |
| Retention sweep | Daily job: anonymize users whose `last_active_at < now() - 12 months`; delete messages where `created_at < now() - 6 months`; archive (not delete) audit_log > 1 year to cold storage |
| Backups | Daily logical dump (`pg_dump`); 30-day retention; tested monthly; lean stack uses cloud-native managed Postgres backup if available |
| PII encryption-at-rest | Cloud-target's volume encryption + column-level envelope encryption on PII columns (NFR-SEC-01); scheme finalized at Stage 11 / 16 |

---

## Coverage check

| PRD § 11 entity | Mapped table |
|----------------|--------------|
| users | `app.users` |
| products | `app.products` |
| product_variants | `app.product_variants` |
| categories | `app.categories` |
| carts | `app.carts` + `app.cart_items` |
| orders | `app.orders` |
| order_items | `app.order_items` |
| customers | `app.customers` |
| addresses | `app.addresses` |
| conversations | `app.conversations` |
| messages | `app.messages` |
| audit_log | `audit.audit_log` |
| agent_events | `app.agent_events` |

Plus 2 added: `app.notifications` (FR-NOTIF-*), `app.idempotency_keys` (NFR-RELI-01), `app.product_search_index` (FR-AGT-PROD-06).
