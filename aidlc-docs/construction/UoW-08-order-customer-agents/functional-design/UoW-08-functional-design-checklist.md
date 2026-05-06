# Functional Design Checklist — UoW-08

- [x] Domain entities identified (no new DB models; Order, Customer, User, ProductVariant described)
- [x] Business rules documented (BR-ORD-01..08, BR-CUST-01..06, BR-MULTI-01..04, BR-ATTN-01..04)
- [x] State machine documented (Order status transitions)
- [x] Workflows documented (4: status update, refund+tag, anonymize, attention)
- [x] Multi-agent coordination design: Order Agent + cross-domain customer_add_tag tool (BR-MULTI-01)
- [x] Frontend components identified (3 stubs replaced + 2 new widgets + 2 new schemas + 3 schema updates)
- [x] AJV schema updates/additions listed (order_card, order_list, customer_card updated; order_status_update, attention_summary new)
- [x] Agent routing table defined
- [x] Confirmation protocol extensions identified (order.cancel, order.refund, customer.anonymize added to DESTRUCTIVE_INTENTS)
