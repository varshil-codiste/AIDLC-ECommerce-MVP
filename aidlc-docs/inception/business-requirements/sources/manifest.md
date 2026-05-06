# Sources Manifest

| # | Original | Format | Saved as | Ingested at | Notes |
|---|----------|--------|----------|-------------|-------|
| 1 | ecommerce-ops-hub-prd.md (user-supplied PRD v0.3, dated 2026-04-17) | Markdown | sources/ecommerce-ops-hub-prd.md | 2026-05-04T00:01:00Z | Already in markdown — no conversion required. 17,839 bytes. Comprehensive PRD covering executive summary, vision, problem, goals/non-goals, personas, experience, agent definitions, widget spec, NFRs, system architecture, data model, user stories, success metrics, milestones, risks, open questions. |

## Inferred attributes from sources

| Attribute | Value | Source citation |
|-----------|-------|-----------------|
| Product | Chat-Native E-Commerce Platform — Multi-Agent MVP | § 1 Executive Summary |
| Project type | Greenfield (no existing codebase) | Workspace Detection (Stage 0) + § 14 MVP Milestones |
| Target platforms | Web (responsive) only | § 4 Non-Goals: "Mobile native app (responsive web chat only)" |
| Tenancy | Single-tenant | § 4 Goals: "Single-tenant MVP (we host one store)" |
| Personas | Shopper ("Chat-native Chloe") + Merchant ("Operator Olivia") | § 5 |
| Agent count | 5 (Product, Cart, Order, Customer, Checkout) | § 7 |
| Widget count | 11 widget types | § 8 |
| Data entities | 12 tables (users, products, ... agent_events) | § 11 |
| Timeline | 17 weeks across M1–M7 | § 14 |
| Success metrics | 7 quantitative KPIs | § 13 |
| Open questions | 7 (payment provider, image quality, onboarding, multi-modal, bulk uploads, push notifications, analytics agent) | § 16 |
