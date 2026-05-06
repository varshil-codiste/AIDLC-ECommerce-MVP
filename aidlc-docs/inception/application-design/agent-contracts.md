# Agent Contracts

**Generated**: 2026-05-04T00:21:30Z

This is the contract between the orchestrator and each of the 5 agents, plus the structured-intent contract between widgets and the orchestrator. Concrete prompt files + tool implementations land in Stage 12; this doc fixes the **shape**.

---

## 0. Agent invocation envelope

Every agent receives:

```ts
type AgentInput = {
  request_id: string;            // correlates to logs / traces
  conversation_id: string;
  user: { id: string; role: 'shopper'|'merchant'|'admin' };
  message: string;               // user's natural-language input OR a synthesized prompt for inter-agent calls
  prior_context?: ContextSlice[]; // last N messages, agent-trimmed
  intent?: WidgetIntent;         // present when triggered by a widget tap
  budget: { max_tokens_in: number; max_tokens_out: number; soft_deadline_ms: number };
};
```

And returns:

```ts
type AgentOutput =
  | { type: 'text'; content: string; tokens_in: number; tokens_out: number; cost_usd: number; }
  | { type: 'widget'; widget: WidgetPayload; tokens_in: number; tokens_out: number; cost_usd: number; }
  | { type: 'error'; problem: ProblemDetails /* RFC 7807 */; }
  | { type: 'handoff'; to_agent: AgentName; reason: string; payload: object; };
```

The orchestrator handles `handoff` (multi-agent turns), assembles widgets into the final response, and is the **only** thing that emits SSE to the client.

---

## 1. Tool surface (Core API ports)

Agents call **typed tools** — they do NOT touch the DB directly. Each tool is a thin port the agent imports; the implementation lives in `core-api/`. Tool names are namespaced by entity.

### Product tools (called by Product Agent)
| Tool | Inputs | Outputs | Authorization |
|------|--------|---------|---------------|
| `product.create` | title, description, price, category, variants[] | created Product | merchant only |
| `product.update` | id, partial fields | updated Product | merchant only |
| `product.archive` | id | { archived: true } | merchant only |
| `product.search.semantic` | query, top_k, filters? | Product[] | both |
| `product.search.keyword` | query, top_k, filters? | Product[] | both (fallback) |
| `product.compare` | product_ids[2..3] | comparison table | shopper only |
| `product.get` | id | Product | both |

### Cart tools (Cart Agent)
| Tool | Inputs | Outputs | Authorization |
|------|--------|---------|---------------|
| `cart.add` | variant_id, quantity | Cart | shopper only (own cart) |
| `cart.update_quantity` | item_id, quantity | Cart | shopper only |
| `cart.remove` | item_id | Cart | shopper only |
| `cart.view` | — | Cart | shopper only |
| `cart.clear` | — | { cleared: true } | shopper only (DESTRUCTIVE — confirmation_prompt required) |

### Order tools (Order Agent)
| Tool | Inputs | Outputs | Authorization |
|------|--------|---------|---------------|
| `order.list_for_user` | user_id (own), filters? | Order[] | shopper (own only) / merchant (any) |
| `order.list_all` | filters | Order[] | merchant only |
| `order.get` | id | Order | shopper (own only) / merchant (any) |
| `order.update_status` | id, new_status, tracking? | Order | merchant only |
| `order.refund` | id, reason | Order | merchant only (DESTRUCTIVE — confirmation_prompt required) |
| `order.cancel` | id, reason | Order | merchant only (DESTRUCTIVE) |
| `order.start_return` | id, items[], reason | ReturnTicket | shopper (own only) |

### Customer tools (Customer Agent)
| Tool | Inputs | Outputs | Authorization |
|------|--------|---------|---------------|
| `customer.create` | name, email, phone? | Customer | merchant only |
| `customer.list` | filters | Customer[] | merchant only |
| `customer.get` | id | Customer | merchant only |
| `customer.update_tags` | id, tags_to_add, tags_to_remove | Customer | merchant only |
| `customer.anonymize` | id | { anonymized: true } | merchant only (DESTRUCTIVE — confirmation_prompt required) |

### Checkout tools (Checkout Agent)
| Tool | Inputs | Outputs | Authorization |
|------|--------|---------|---------------|
| `address.list_for_user` | user_id | Address[] | shopper (own) |
| `address.create` | line1, line2, city, state, postal_code, country_code, type | Address | shopper (own) |
| `payment.simulate` | cart_id, address_id, method | { ok: true; payment_ref?: string } | shopper |
| `order.create` | cart_id, payment_ref, address_id | Order | shopper (own) |

### Cross-cutting (orchestrator-only — agents cannot call)
- `notifications.create` (system-only; emitted from event consumer)
- `audit.write` (intercepted; agents emit normal writes, audit interceptor records)
- `agent_event.emit` (orchestrator outbox; transparent to agents)

---

## 2. Role gate (NFR-SEC-06)

Every tool has an authorization predicate evaluated **before** the tool body runs. Examples:

| Predicate | Meaning |
|-----------|---------|
| `merchant only` | `user.role === 'merchant'` |
| `shopper only (own)` | `user.role === 'shopper' && resource.user_id === user.id` |
| `both` | any authenticated user |

If the predicate fails, the tool returns RFC 7807 problem with `type=https://errors.ecommmer-aidlc/role-denied`. Orchestrator surfaces this as a polite redirect ("I can't do that — here are things I can help you with"). NEVER routes back to the LLM with the original (potentially-injected) request.

---

## 3. Widget interaction intent contract (FR-CHAT-05)

Every interactive widget element emits a structured intent rather than calling an API directly:

```ts
type WidgetIntent =
  | { intent: 'cart.add'; product_id: string; variant_id: string; quantity?: number; }
  | { intent: 'cart.update_quantity'; item_id: string; quantity: number; }
  | { intent: 'cart.remove'; item_id: string; }
  | { intent: 'cart.clear'; }
  | { intent: 'cart.checkout'; }
  | { intent: 'product.add_more_variant_clicked'; product_id: string; }
  | { intent: 'product.confirm_create'; product_id: string; }
  | { intent: 'product.edit_more'; product_id: string; field?: string; }
  | { intent: 'order.track'; order_id: string; }
  | { intent: 'order.start_return'; order_id: string; }
  | { intent: 'confirmation.confirm'; original_intent_id: string; }
  | { intent: 'confirmation.cancel'; original_intent_id: string; }
  | { intent: 'notification.open'; notification_id: string; };
```

Intents are POSTed to `/api/v1/orchestrator/intent` with the user's JWT. The orchestrator routes the intent to the appropriate agent (or executes it directly if no LLM call is needed) and streams the response on the same SSE channel as text messages.

---

## 4. Confirmation-prompt protocol (FR-ORCH-04)

Destructive intents (`cart.clear`, `order.cancel`, `order.refund`, `customer.anonymize`) follow:

1. Agent or intent handler decides the operation is destructive
2. Orchestrator emits a `confirmation_prompt` widget with `original_intent_id` (a server-generated UUID)
3. The user taps Confirm → FE emits `{intent: 'confirmation.confirm', original_intent_id}`
4. Orchestrator looks up the original intent (kept in Redis with 5-min TTL) and resumes
5. If the user taps Cancel or 5 minutes elapse, the operation is dropped

**No destructive op ever runs without a recorded confirm intent** — this is enforced at the middleware layer, not inside individual agents.

---

## 5. Per-agent tool whitelist

| Agent | Allowed tools |
|-------|---------------|
| Product Agent | `product.*` |
| Cart Agent | `cart.*` (own user only), `product.get` (read for variant resolution) |
| Order Agent | `order.*`, `customer.update_tags` (for the multi-agent refund + tag pattern), `notifications.create` (for shopper status updates — system-side only) |
| Customer Agent | `customer.*` |
| Checkout Agent | `address.*`, `payment.simulate`, `order.create`, `cart.view`, `cart.clear` (post-checkout) |

The whitelist is enforced at agent boot; calling an unlisted tool throws.

---

## 6. Streaming protocol (SSE — FR-CHAT-07)

Server emits these named events on a single SSE stream per chat turn:

| event | data shape | when |
|-------|-----------|------|
| `token` | `{ chunk: string }` | LLM token streaming (first within 1.5 s) |
| `widget` | `WidgetPayload` (one of the 12 widget shapes) | when an agent returns a widget |
| `done` | `{ usage: { tokens_in, tokens_out, cost_usd } }` | end of turn |
| `error` | `ProblemDetails` (RFC 7807) | recoverable error mid-turn |

Heartbeat: server emits a `:keep-alive` comment every 15 s to keep proxies happy.

---

## 7. Cost budget per turn

The orchestrator passes a `budget` field to each agent (see § 0). Defaults:

| Field | Default |
|-------|---------|
| `max_tokens_in` | 4,000 |
| `max_tokens_out` | 800 |
| `soft_deadline_ms` | 8,000 |

If an agent exceeds the deadline, the orchestrator returns a degraded response ("I'm taking longer than usual — try a more specific question?"). If it exceeds the token budget, the agent truncates and reports it.

Aggregated cost per agent / per role / per day flows to OTel + Grafana (NFR-AIML-07; story CC-02).
