# Business Rules — UoW-07 (Product Agent + Product Tools)

---

## BR-PROD-01: Product title is required and bounded

**Applies to**: Product create, update  
**Statement**: "Product title must be between 3 and 255 characters."  
**Enforcement**:
- BE: service-layer validation before Prisma write
- Agent: if title missing, asks "What should we call this product?"
**Error code**: `product.title.invalid`  
**User-facing copy**: "Product name must be between 3 and 255 characters."

---

## BR-PROD-02: Price must be a positive integer in paise/cents

**Applies to**: Product create, update  
**Statement**: "priceCents must be a positive integer between 1 and 9,999,999 (≈ ₹99,999)."  
**Enforcement**:
- BE: service validates before write
- Agent: parses natural-language price (e.g. "₹45", "$45", "45 rupees") → converts to paise; asks if ambiguous
**Error code**: `product.price.invalid`  
**User-facing copy**: "Price must be a positive amount (max ₹99,999)."

---

## BR-PROD-03: Stock must be a non-negative integer

**Applies to**: Product create, variant stock update  
**Statement**: "Stock quantity must be ≥ 0."  
**Enforcement**:
- BE: service validates before Prisma write
- Agent: if stock missing or negative, asks "How many units are in stock?"
**Error code**: `product.stock.invalid`  
**User-facing copy**: "Stock quantity must be 0 or more."

---

## BR-PROD-04: Category must exist if provided

**Applies to**: Product create, update  
**Statement**: "If categoryId is supplied, it must reference an existing active category."  
**Enforcement**:
- BE: Prisma FK constraint + service pre-check (returns 400 before FK violation)
- Agent: resolves category name to ID via `product.list_categories` tool; if no match, offers to proceed without category
**Error code**: `product.category.not_found`  
**User-facing copy**: "Category not found. I'll create the product without a category — you can assign one later."

---

## BR-PROD-05: Archived products cannot be edited

**Applies to**: Product update  
**Statement**: "Products with status='archived' reject update and bulk-update operations."  
**Enforcement**:
- BE: service checks status before write; returns 409
- Agent: surfaces "That product is archived. Would you like to restore it first?"
**Error code**: `product.archived`  
**User-facing copy**: "That product is archived. Say 'restore it' to reactivate before editing."

---

## BR-PROD-06: SKU must be globally unique

**Applies to**: ProductVariant create  
**Statement**: "SKU must be unique across all product variants in the system."  
**Enforcement**:
- DB: UNIQUE constraint on `product_variants.sku`
- BE: catches unique violation, auto-retries with a suffix (`-2`, `-3`, etc.) up to 5 times, then surfaces error
**Error code**: `product.sku.conflict`  
**User-facing copy**: "Couldn't generate a unique SKU. Please provide one manually."

---

## BR-PROD-07: Bulk add is capped at 50 products per turn

**Applies to**: Bulk create (MR-04)  
**Statement**: "A single bulk-add message may not create more than 50 products."  
**Enforcement**:
- Agent: counts parsed lines before rendering preview; if > 50, asks merchant to split
**Error code**: `product.bulk.limit_exceeded`  
**User-facing copy**: "I can add up to 50 products at a time. Your list has {n} — could you split it?"

---

## BR-PROD-08: Bulk add is partial-success — individual failures do not block others

**Applies to**: Bulk create (MR-04)  
**Statement**: "When multiple products are created in a bulk operation, each is attempted independently. Successes are committed; failures are reported without rolling back successes."  
**Enforcement**:
- BE: `ProductService.bulkCreate()` iterates, collects succeeded + failed, returns both lists
- Agent: renders final summary ("49 created, 1 failed: 'Widget XL' — price was invalid")
**Error code**: per-item `product.*.invalid` codes  
**User-facing copy**: "{successCount} products added. {failCount} couldn't be saved — see below."

---

## BR-PROD-09: Every create / update / archive emits an AuditLog entry

**Applies to**: All write operations  
**Statement**: "Every successful product mutation must produce an AuditLog row with entityType='product', entityId, actorId, action ('create'/'update'/'archive'), and a JSON diff of changed fields."  
**Enforcement**:
- BE: `ProductService` wraps each mutation in a transaction that also inserts to `audit_logs`
**Error code**: N/A (audit failure surfaces as 500)  
**User-facing copy**: N/A (internal)

---

## BR-PROD-10: Only merchants and admins may create/update/archive products

**Applies to**: All write tools  
**Statement**: "Product create, update, archive, and bulk-create tools are restricted to role='merchant' and role='admin'. Role='shopper' may only invoke read tools."  
**Enforcement**:
- BE: `ProductAgent` checks `input.user.role` before any write tool; yields `{ type: 'error' }` if role is shopper
- Controller: `RolesGuard(['merchant', 'admin'])` on chat endpoint is already enforced upstream, but agent adds defence-in-depth
**Error code**: `product.unauthorized`  
**User-facing copy**: "Product management is only available to store merchants."
