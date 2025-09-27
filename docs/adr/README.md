# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the email-agent project. ADRs document important architectural decisions made during the development of this project.

## What are ADRs?

Architecture Decision Records are short text documents that capture important architectural decisions made during the development of a software project. Each ADR describes the context, decision, alternatives considered, and consequences of a particular architectural choice.

## ADR Format

All ADRs in this project follow a consistent format defined in [template.md](template.md). Each ADR includes:
- **Context**: The situation that led to the decision
- **Decision**: What was decided
- **Alternatives Considered**: Other options that were evaluated
- **Consequences**: The positive, negative, and neutral outcomes

## ADR Index

### Core Architecture Decisions (High Priority)
- [ADR-001: Google Apps Script Platform Choice](001-google-apps-script-platform.md)
- [ADR-002: Gemini API Integration Architecture](002-gemini-api-integration.md)
- [ADR-003: Label-Based Email Classification System](003-label-based-classification.md)
- [ADR-004: Pluggable Agents Architecture](004-pluggable-agents.md)

### Operational Decisions (Medium Priority)
- [ADR-005: Batch Processing and Budget Management](005-batch-processing-budget.md)
- [ADR-006: Dual Authentication Model](006-dual-authentication.md)
- [ADR-007: Google Drive Rules Document Integration](007-drive-rules-integration.md)

### Implementation Details (Lower Priority)
- [ADR-008: Interactive Web App Integration for Email Agent Dashboard](008-interactive-web-app-integration.md)
- ADR-009: Apps Script V8 Runtime Selection (planned)
- ADR-010: Clasp-Based Development Workflow (planned)
- ADR-011: Idempotency and State Management (planned)

## Status Legend

- **Proposed**: Decision has been proposed but not yet approved
- **Accepted**: Decision has been approved and is being implemented
- **Deprecated**: Decision is no longer relevant but kept for historical context
- **Superseded**: Decision has been replaced by a newer ADR

## Contributing

When making significant architectural decisions:
1. Create a new ADR using the template
2. Number it sequentially (ADR-XXX)
3. Discuss with the team before marking as "Accepted"
4. Update this index when adding new ADRs