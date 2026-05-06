# Business Logic Model — UoW-11

**Generated at**: 2026-05-05T21:38:00Z

This UoW has 5 distinct workflows. Each has a Mermaid sequence + text alternative.

---

## Workflow 1: Embedding Refresh (background)

```mermaid
sequenceDiagram
    participant Merchant
    participant ProductSvc as ProductService
    participant DB as Postgres
    participant Outbox as AgentEvent table
    participant Drain as OutboxDrainWorker
    participant Stream as Redis events:product
    participant Worker as EmbeddingRefreshWorker
    participant OpenAI

    Merchant->>ProductSvc: create / update Product
    ProductSvc->>DB: INSERT product (tx)
    ProductSvc->>Outbox: INSERT AgentEvent (product.created/updated, tx)
    ProductSvc-->>Merchant: 200 (immediate)

    Drain->>Outbox: poll undrained events
    Drain->>Stream: XADD events:product
    Drain->>Outbox: mark drained

    Worker->>Stream: XREAD events:product (poll @Interval(2000))
    Worker->>DB: SELECT product + variants + category
    Worker->>Worker: buildTextBlob(product) [BR-11-08]
    Worker->>OpenAI: POST /embeddings (text-embedding-3-small)
    alt success
        Worker->>DB: UPSERT product_search_index (embedding, textBlob, updatedAt)
        Worker->>Stream: cursor advance
    else failure (3 retries)
        Worker->>Stream: cursor stays (event re-delivered)
        Worker->>Outbox: after 3 failures → status=dead_letter
    end
```

**Text alternative**: When a merchant creates or updates a product, the ProductService writes both the product row and an outbox AgentEvent in the same transaction. The shared OutboxDrainWorker (UoW-03) drains the event onto a Redis stream `events:product`. A new EmbeddingRefreshWorker polls that stream every 2 seconds. For each event it loads the full product (with variants and category), builds a deterministic text blob, sends it to OpenAI's embedding API, and upserts the result into the `product_search_index` table. On API failure the cursor is not advanced — the event is retried by the next cycle. After 3 failures the AgentEvent row is marked dead_letter (using the existing dead-letter mechanism from UoW-03).

---

## Workflow 2: Semantic Search (SH-02)

```mermaid
sequenceDiagram
    participant Shopper
    participant Orchestrator
    participant Agent as ProductAgent
    participant LLM
    participant SearchSvc as ProductService
    participant OpenAI
    participant DB

    Shopper->>Orchestrator: "show me running shoes under $100"
    Orchestrator->>Agent: route → ProductAgent
    Agent->>LLM: complete(prompt, message, tools)
    LLM-->>Agent: { tool_call: product_search, args: { query, maxPrice } }
    Agent->>SearchSvc: search(query, filters)
    SearchSvc->>OpenAI: POST /embeddings (query)
    alt embed OK
        SearchSvc->>DB: kNN: ORDER BY embedding <=> $q LIMIT 8 WHERE active AND price <= max
        DB-->>SearchSvc: ranked products
    else embed fails
        SearchSvc->>DB: keyword fallback: ts_rank(tsv @@ plainto_tsquery)
        DB-->>SearchSvc: ranked products + usedFallback=true
    end
    SearchSvc-->>Agent: { products[], usedFallback }
    alt usedFallback
        Agent-->>Shopper: "I couldn't do semantic search; here are keyword matches:" + product_carousel
    else
        Agent-->>Shopper: product_carousel widget
    end
```

**Text alternative**: A shopper sends a natural-language search query. The orchestrator routes to ProductAgent. The agent invokes the `product_search` tool. ProductService first tries to embed the query via OpenAI and run a cosine-distance kNN query on `product_search_index`, joined back to active products with optional price/category filters. If embedding fails (timeout, error, vector index missing), the service falls back to a Postgres tsvector keyword search and tags the response with `usedFallback: true`. The agent surfaces a fallback notice to the shopper per SH-02 acceptance, then returns a `product_carousel` widget capped at 8 items.

---

## Workflow 3: Product Compare (SH-03)

```mermaid
sequenceDiagram
    participant Shopper
    participant Agent as ProductAgent
    participant LLM
    participant ProductSvc as ProductService
    participant DB

    Shopper->>Agent: "compare the first two"
    Note over Agent,LLM: LLM has prior context from previous product_carousel

    Agent->>LLM: complete with context
    LLM-->>Agent: { tool_call: product_compare, args: { productIds: [id1, id2] } }

    alt productIds.length > 3
        Agent-->>Shopper: "I can only compare up to 3 — comparing the first three"
    end

    Agent->>ProductSvc: getByIds(ids[])
    ProductSvc->>DB: SELECT products WHERE id IN (...) AND status='active'
    DB-->>ProductSvc: products[]
    ProductSvc->>ProductSvc: buildComparisonAttributes(products) (delta highlight)
    ProductSvc-->>Agent: comparison data
    Agent-->>Shopper: product_comparison widget
```

**Text alternative**: Shopper requests a comparison of products from a previous carousel. The LLM resolves which products to compare via conversation context and calls `product_compare` with up to 3 product IDs. If more than 3 are requested the agent caps at 3 and surfaces an explanation. ProductService loads the products, builds a comparison row (common + differing attributes), and returns a `product_comparison` widget.

---

## Workflow 4: Order Tracking (SH-09)

```mermaid
sequenceDiagram
    participant Shopper
    participant Agent as OrderAgent
    participant LLM
    participant OrderSvc as OrderService
    participant DB

    Shopper->>Agent: "where's my last order?"
    Agent->>LLM: complete
    LLM-->>Agent: { tool_call: order_get_tracking, args: {} (no orderId) }
    Agent->>OrderSvc: getTracking(actorId, orderId?)
    alt orderId provided
        OrderSvc->>DB: findFirst({id, userId: actorId})
    else orderId omitted
        OrderSvc->>DB: findFirst({userId: actorId}, orderBy: placedAt desc)
    end

    alt order not found OR not owned
        OrderSvc-->>Agent: null
        Agent-->>Shopper: "I don't see that order under your account."
    else order found
        OrderSvc->>OrderSvc: buildTrackingEvents(order) [BR-11-12]
        OrderSvc-->>Agent: { orderId, status, events[] }
        Agent-->>Shopper: tracking_widget
    end
```

**Text alternative**: Shopper asks about an order. OrderAgent invokes `order_get_tracking`. If `orderId` is supplied, OrderService fetches the order with both id AND userId in the WHERE clause (anti-enumeration). If `orderId` is missing, the most-recent order (by placedAt DESC) for the shopper is loaded. A null result yields a uniform "I don't see that order under your account" message regardless of whether it was missing or owned by another user. On success, `buildTrackingEvents` synthesizes the timeline from order timestamps and the agent emits a `tracking_widget`.

---

## Workflow 5: Return Initiation (SH-10)

```mermaid
sequenceDiagram
    participant Shopper
    participant Agent as OrderAgent
    participant LLM
    participant OrderSvc as OrderService
    participant DB
    participant Outbox

    Shopper->>Agent: "I want to return order 1234"
    Agent->>LLM: complete
    LLM-->>Agent: tool_call: order_get_tracking (verify order belongs to shopper)
    Agent->>OrderSvc: getTracking + ownership verified

    alt no reason in initial message
        Agent-->>Shopper: "What's the reason for the return?"
        Shopper-->>Agent: reason text
    end

    Agent->>LLM: complete (with reason in context)
    LLM-->>Agent: tool_call: order_start_return, args: {orderId, reason}

    Agent->>OrderSvc: startReturn(actorId, orderId, reason)
    OrderSvc->>DB: BEGIN
    OrderSvc->>DB: SELECT order FOR UPDATE
    alt order not found OR not owned
        OrderSvc-->>Agent: error order.not_found → "I don't see that order under your account."
    end
    alt status != 'delivered'
        OrderSvc-->>Agent: error order_return.invalid_status
    end
    OrderSvc->>DB: UPDATE order SET status='return_requested', returnReason=$r, returnRequestedAt=NOW()
    OrderSvc->>Outbox: INSERT AgentEvent order.return_requested
    OrderSvc->>DB: COMMIT
    OrderSvc-->>Agent: updated order
    Agent-->>Shopper: order_card widget (return_requested state, no destructive actions)
```

**Text alternative**: Shopper asks to return an order. OrderAgent first verifies the order belongs to the shopper via `order_get_tracking` (ownership guard). If the shopper hasn't supplied a reason in the initial message, the agent asks one clarifying question before proceeding. With orderId + reason in hand, the agent invokes `order_start_return`. OrderService loads the order with a row lock, validates current status is `delivered`, updates the row to `return_requested` plus the new reason and timestamp fields, and emits a `order.return_requested` outbox event in the same transaction. The agent then renders an `order_card` reflecting the new state with cancel/refund buttons hidden.

---

## State Diagram — Order Status (extended)

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> confirmed
    pending --> cancelled
    confirmed --> shipped
    confirmed --> cancelled
    shipped --> delivered
    delivered --> return_requested : SH-10 shopper
    return_requested --> refunded : merchant approves
    return_requested --> delivered : merchant rejects
    delivered --> refunded : direct refund (UoW-08, no return flow)
    confirmed --> refunded : direct refund (UoW-08)
    refunded --> [*]
    cancelled --> [*]
```

**Text alternative**: The new `return_requested` state sits between `delivered` and `refunded`. Only a delivered order can transition to return_requested (shopper-initiated). From return_requested the merchant can either approve (→ refunded) or reject (→ delivered). The pre-existing direct-refund paths from UoW-08 remain unchanged for refunds that don't go through a return flow.
