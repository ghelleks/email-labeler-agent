Title: Feature: Integrate todo-forwarding-agent as a pluggable agent

Labels: enhancement

## Summary
Track integration work to connect this project with the external forwarding tool so threads labeled `todo` can be forwarded automatically using the separate project.

Repo: https://github.com/ghelleks/todo-forwarding-agent

## Proposal (phased)
- Phase 1 (label handoff):
  - Add/enable an agent for label `todo` that adds a secondary label (e.g., `todo:forward`).
  - Run the forwarding project on its own trigger to process `todo:forward`, forward, archive, and remove the secondary label.
- Phase 2 (optional): webhook or library integration for immediate forwarding.

## Acceptance Criteria
- Agent can be enabled/disabled via options and config.
- When enabled, newly labeled `todo` threads receive the forwarding handoff label.
- Forwarding tool successfully processes and clears handoff label in its own project.
- Docs updated with minimal setup steps for both repos.

## Notes
- Keep default behavior unchanged for users who don’t enable the agent.
- Ensure idempotency (per thread) and respect dry-run in this project.
