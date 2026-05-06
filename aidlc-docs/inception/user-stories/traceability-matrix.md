# Requirements ↔ Stories Traceability Matrix

**Generated**: 2026-05-04T00:18:00Z
**Sources**: `requirements/requirements.md` + `user-stories.md`

For each requirement ID, the story (or stories) that satisfy it. Any FR/NFR with no story is flagged at the bottom — those will be picked up at Stage 6 Application Design or Stage 8 Functional Design (per UoW).

---

## Functional Requirements

### Chat surface (FR-CHAT-*)
| Req ID | Stories |
|--------|---------|
| FR-CHAT-01 | SH-01, MR-01 |
| FR-CHAT-02 | SH-01, MR-01 |
| FR-CHAT-03 | SH-02, SH-04, SH-08 (perf assertions in AC) |
| FR-CHAT-04 | covered transitively by every story that names a widget |
| FR-CHAT-05 | SH-04, SH-05, MR-13 |
| FR-CHAT-06 | SH-06, SH-07 |
| FR-CHAT-07 | (NFR-PERF-01/02 in SH-02 ACs implies SSE; explicit story-coverage at Stage 8) |

### Authentication (FR-AUTH-*)
| Req ID | Stories |
|--------|---------|
| FR-AUTH-01 | SH-01, MR-01 |
| FR-AUTH-02 | SH-01, MR-01 |
| FR-AUTH-03 | SH-01, MR-01 |
| FR-AUTH-04 | SH-09 (explicit cross-role denial), MR-13 |
| FR-AUTH-05 | (operational — no user story; pod activity at Stage 12 onboarding) |

### Widgets (FR-WIDGET-*)
| Req ID | Stories |
|--------|---------|
| FR-WIDGET-01 (`product_card`) | SH-04 |
| FR-WIDGET-02 (`product_carousel`) | SH-02 |
| FR-WIDGET-03 (`cart_summary`) | SH-04, SH-05 |
| FR-WIDGET-04 (`order_card`) | SH-08, SH-10, MR-10 |
| FR-WIDGET-05 (`order_list`) | MR-06 |
| FR-WIDGET-06 (`tracking_widget`) | SH-09 |
| FR-WIDGET-07 (`payment_widget`) | SH-08 (simulated) |
| FR-WIDGET-08 (`product_edit_preview`) | MR-02, MR-03 |
| FR-WIDGET-09 (`customer_card`) | MR-08, MR-09 |
| FR-WIDGET-10 (`dashboard_digest`) | MR-01 |
| FR-WIDGET-11 (`confirmation_prompt`) | MR-13, SH-05 (clear cart) |
| FR-WIDGET-12 (`notification_inbox`) | MR-10 |

### Agent — Product (FR-AGT-PROD-*)
| Req ID | Stories |
|--------|---------|
| FR-AGT-PROD-01 | MR-02 |
| FR-AGT-PROD-02 | MR-08 (search), MR-12 |
| FR-AGT-PROD-03 | MR-03 |
| FR-AGT-PROD-04 | (soft-delete — covered at Stage 8 Functional Design) |
| FR-AGT-PROD-05 | MR-04 |
| FR-AGT-PROD-06 | SH-02 |
| FR-AGT-PROD-07 | SH-02 |
| FR-AGT-PROD-08 | SH-03 |

### Agent — Cart (FR-AGT-CART-*)
| Req ID | Stories |
|--------|---------|
| FR-AGT-CART-01 | SH-04 |
| FR-AGT-CART-02 | SH-05 |
| FR-AGT-CART-03 | SH-05 |
| FR-AGT-CART-04 | SH-05 |
| FR-AGT-CART-05 | SH-06 |

### Agent — Order (FR-AGT-ORD-*)
| Req ID | Stories |
|--------|---------|
| FR-AGT-ORD-01 | SH-09 (variant: order list) |
| FR-AGT-ORD-02 | SH-09 |
| FR-AGT-ORD-03 | SH-10 |
| FR-AGT-ORD-04 | MR-06 |
| FR-AGT-ORD-05 | MR-07 |
| FR-AGT-ORD-06 | MR-05 |
| FR-AGT-ORD-07 | MR-13 (covered as destructive op) |
| FR-AGT-ORD-08 | MR-07, CC-03 |

### Agent — Customer (FR-AGT-CUST-*)
| Req ID | Stories |
|--------|---------|
| FR-AGT-CUST-01 | (manual create — Stage 8) |
| FR-AGT-CUST-02 | MR-08 |
| FR-AGT-CUST-03 | MR-05, MR-08 |
| FR-AGT-CUST-04 | MR-09 |

### Agent — Checkout (FR-AGT-CHK-*)
| Req ID | Stories |
|--------|---------|
| FR-AGT-CHK-01 | SH-08 |
| FR-AGT-CHK-02 | SH-08 |
| FR-AGT-CHK-03 | SH-08 |
| FR-AGT-CHK-04 | SH-08 |

### Orchestrator (FR-ORCH-*)
| Req ID | Stories |
|--------|---------|
| FR-ORCH-01 | SH-01, MR-01 (role detection + routing) |
| FR-ORCH-02 | MR-05 (multi-agent), MR-12 |
| FR-ORCH-03 | covered transitively by widget-rendering stories |
| FR-ORCH-04 | MR-13, SH-05, MR-05, MR-09 |
| FR-ORCH-05 | MR-01, MR-12 |

### Notifications (FR-NOTIF-*)
| Req ID | Stories |
|--------|---------|
| FR-NOTIF-01 | MR-10 |
| FR-NOTIF-02 | MR-11 |
| FR-NOTIF-03 | MR-10, MR-11 |

---

## Non-Functional Requirements

### Performance / Reliability
| Req ID | Stories |
|--------|---------|
| NFR-PERF-01 | SH-02, SH-04, MR-01 (latency assertions in AC) |
| NFR-PERF-02 | SH-02, MR-01 |
| NFR-PERF-03 | (load-test — Stage 14 Build & Test) |
| NFR-PERF-04 | (operational target — no user story) |
| NFR-AVAIL-01 | (SLO — Stage 17 Observability) |
| NFR-RELI-01 | SH-02 (LLM 5xx fallback) |
| NFR-RELI-02 | MR-13 |

### Security
| Req ID | Stories |
|--------|---------|
| NFR-SEC-01 | (encryption-at-rest — Stage 11 Stack Selection + Stage 16 IaC) |
| NFR-SEC-02 | CC-03 |
| NFR-SEC-03 | (storage-layer segregation — Stage 8 / Stage 12) |
| NFR-SEC-04 | CC-03, MR-04, MR-09 |
| NFR-SEC-05 | SH-01 (rate-limit AC) |
| NFR-SEC-06 | SH-09, MR-13, SH-01 (cross-role denial) |
| NFR-SEC-07 | SH-01 (argon2id) |
| NFR-SEC-08 | SH-01 (RS256 + refresh) |
| NFR-SEC-09 | (PCI scope = zero — no card data; Stage 6 architecture confirms) |

### Privacy
| Req ID | Stories |
|--------|---------|
| NFR-PRIV-01 | MR-09 |
| NFR-PRIV-02 | (compliance posture — operational, no story) |
| NFR-PRIV-03 | SH-06, SH-07, MR-09, CC-03 |
| NFR-PRIV-04 | (operational, no story) |

### AI/ML Lifecycle
| Req ID | Stories |
|--------|---------|
| NFR-AIML-01 | (prompt versioning — Stage 12 Code Generation) |
| NFR-AIML-02 | (eval suite — Stage 13 Code Review per agent) |
| NFR-AIML-03 | SH-09 ("I don't see that order under your account" honesty) |
| NFR-AIML-04 | SH-02 (retrieval quality fallback) |
| NFR-AIML-05 | SH-09 (no cross-user RAG bleed) |
| NFR-AIML-06 | (PII redaction in LLM calls — Stage 12) |
| NFR-AIML-07 | CC-02 |
| NFR-AIML-08 | (prompt-injection defense — Stage 13 AI review) |

### Property-Based Testing (partial)
| Req ID | Stories |
|--------|---------|
| NFR-PBT-01 | (cart math PBT — Stage 13 in SH-05 review) |
| NFR-PBT-02 | (widget JSON round-trip — Stage 13) |
| NFR-PBT-03 | (order state machine — Stage 13) |
| NFR-PBT-04 | (role-gate cross-product — Stage 13) |

### Accessibility (Level A)
| Req ID | Stories |
|--------|---------|
| NFR-A11Y-01..08 | CC-01 |

### Observability
| Req ID | Stories |
|--------|---------|
| NFR-OBS-01..05 | CC-02 (and operational at Stage 17) |

### Maintainability
| Req ID | Stories |
|--------|---------|
| NFR-MAINT-01..04 | (operational — Stage 11 Stack Selection + Stage 12) |

---

## Coverage gaps (intentional)

These requirement IDs have **no direct story** because they are operational / infrastructural and surface at later stages — not at the user-facing story layer:

| Req ID | Surfaces at |
|--------|-------------|
| FR-AUTH-05, FR-AGT-CUST-01, FR-AGT-PROD-04 | Stage 8 Functional Design |
| FR-CHAT-07, NFR-PERF-03, NFR-PERF-04 | Stage 14 Build & Test |
| NFR-SEC-01, NFR-SEC-03, NFR-SEC-09, NFR-PRIV-02, NFR-PRIV-04 | Stage 11 / 16 / 17 |
| NFR-AIML-01, -02, -06, -08 | Stage 12 / Stage 13 |
| NFR-PBT-01..04 | Stage 13 |
| NFR-MAINT-01..04 | Stage 11 / Stage 12 |
| NFR-AVAIL-01 | Stage 17 / Stage 18 |

Coverage status: **all FR-/NFR-* either have a story OR are explicitly deferred to a named later stage**. No silent gaps.
