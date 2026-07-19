# Event Storming: Facilitation Guide

## Sticky Legend
| Color | Meaning | What to write | Example |
|---|---|---|---|
| 🟧 Orange | **Domain Event** | Something that happened — past-tense verb | "Payment Received" |
| 🟦 Blue | **Command** | An action/intent that causes an event — imperative verb | "Submit Order" |
| 🟨 Yellow | **Aggregate** | The entity/cluster that accepts a command and emits events — noun | "Order" |
| 🟪 Purple | **Policy** | An automatic reaction or business rule — "when X, then Y" | "When order shipped, notify customer" |
| 🟩 Green | **Read Model** | Data/view a user needs to make a decision | "Stock availability list" |
| 🩷 Pink | **External System** | Third-party or other system involved — noun | "Payment gateway" |
| 🟥 Red | **Hotspot** | Problem, question, or disagreement to resolve later | "Who approves refunds?" |

## Prepare
1. Invite domain experts, developers, and stakeholders.
2. Provide a wide wall or digital board, sticky notes, and markers.
3. Reserve 2–4 hours; define scope.

## Kick Off
4. Explain the goal: map the business process as **events** (past tense, e.g., "Order Placed").
5. Walk through the sticky legend (above) with one example each.

## Explore
6. Ask everyone to write events and place them on a timeline — no discussion yet.
7. Sort events chronologically; remove duplicates.
8. Mark unclear or disputed points with red hotspots.

## Deepen
9. For each event, add the **command** that triggers it and the **aggregate** that handles it.
10. Add **policies** (rules: "when X, then Y") and external systems.
11. Walk the timeline forward and backward with the group; fix gaps.

## Wrap Up
12. Draw boundaries between subdomains/bounded contexts.
13. Photograph the board, capture hotspots as follow-ups.
14. Agree on next steps: refine, model, or start designing.
