# Domain Entities — UoW-07 (Product Agent + Product Tools)

**Note**: No new DB models are introduced in this UoW. All entities below exist in `api/prisma/schema.prisma`. This document records the relevant fields, constraints, and lifecycle as they apply to the Product Agent feature set.

---

## Entity: Product

**Purpose**: A merchant-listed item for sale; the primary object managed by the Product Agent.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, server-generated | `gen_random_uuid()` |
| title | String | NOT NULL, 3–255 chars | Natural-language product name |
| description | String? | nullable, max 2000 chars | Optional — agent asks if missing |
| priceCents | Int | NOT NULL, > 0, ≤ 99_999_99 | Price in smallest currency unit (INR paise) |
| currency | String | NOT NULL, default "INR" | ISO 4217 code |
| categoryId | UUID? | FK → Category, nullable | Agent resolves category name → ID |
| status | String | NOT NULL, default "active" | Enum: `active`, `archived` |
| imageUrls | String[] | default [] | CDN URLs; agent accepts 0 for now (UoW-07) |
| createdByUserId | UUID | FK → User, NOT NULL | Set to authenticated merchant's userId |
| createdAt | DateTime | NOT NULL, default now() | |
| updatedAt | DateTime | NOT NULL, auto-updated | |

**Relationships**:
- belongs to `Category` (optional)
- belongs to `User` (createdBy)
- has many `ProductVariant`
- has one `ProductSearchIndex` (deferred to UoW-11)

**Lifecycle**:
- Created when merchant confirms `product_edit_preview` widget
- Archived (status='archived') via archive tool — never hard-deleted
- Updated via update tool when merchant describes a change

---

## Entity: ProductVariant

**Purpose**: A specific variant of a product (size, colour, etc.) with its own stock and SKU.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, server-generated | |
| productId | UUID | FK → Product, NOT NULL | |
| sku | String | UNIQUE across all variants | Agent generates `{title-slug}-{n}` if not provided |
| attributes | Json | default `{}` | e.g. `{"size": "M", "color": "Blue"}` |
| stock | Int | NOT NULL, ≥ 0 | |
| lowStockThreshold | Int | NOT NULL, default 5 | Dashboard alert trigger |
| createdAt | DateTime | NOT NULL, default now() | |
| updatedAt | DateTime | NOT NULL, auto-updated | |

**Relationships**:
- belongs to `Product`
- has many `CartItem`, `OrderItem`

**Lifecycle**:
- Created alongside Product (default variant) or when merchant specifies variants
- UoW-07 creates one default variant per product; multi-variant management deferred

---

## Entity: Category

**Purpose**: Merchant-defined product grouping for filtering and navigation.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, server-generated | |
| name | String | UNIQUE, NOT NULL, 1–100 chars | |
| slug | String | UNIQUE, NOT NULL | URL-safe lowercase |
| description | String? | nullable | |
| imageUrl | String? | nullable | |
| parentId | UUID? | FK → Category (self-ref), nullable | For subcategory support |

**Relationships**:
- has many `Product`
- optional parent `Category` (tree structure)

**Lifecycle**:
- Pre-seeded or created separately (not in UoW-07 scope)
- Agent resolves category names to IDs via `product.list_categories` tool

---

## ER Diagram

```
Product }o--|| Category : "belongs to (optional)"
Product ||--o{ ProductVariant : "has many"
User ||--o{ Product : "created by"
```

---

## New Agent Concepts (not DB entities)

### ProductAgentState (in-memory, per conversation turn)

| Field | Type | Notes |
|-------|------|-------|
| mode | `"create"` \| `"update"` \| `"bulk"` \| `"archive"` \| `"query"` | Derived from intent |
| draft | Partial\<ProductDraft\> | Fields collected so far this turn |
| targetProductId | UUID? | Set in update/archive mode |
| bulkLines | string[] | Raw lines from merchant paste |

### ProductDraft

| Field | Type | Required |
|-------|------|----------|
| title | string | Yes |
| priceCents | number | Yes |
| stock | number | Yes |
| description | string? | No |
| categoryId | UUID? | No |
| imageUrls | string[] | No |
| sku | string? | No (auto-generated) |
