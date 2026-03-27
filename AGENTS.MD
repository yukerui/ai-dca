# Project Workflow

This file defines the default execution flow for agents working in this repository.

## Default Requirement Flow

When the user gives a new requirement, follow this sequence by default:

1. Start in plan mode and confirm the requirement with the user first.
2. Use Stitch to produce the page design or interaction design before coding.
3. Wait for the user's confirmation on the Stitch design.
4. After the design is confirmed, move directly into code implementation without asking for another confirmation.
5. After implementation, use agent-browser to verify the result in the browser.
6. If agent-browser is unavailable, use the closest available browser automation or browser testing fallback and continue verification.
7. After verification passes, commit and push directly without asking the user for an extra confirmation.

## Scope Notes

- This workflow is the default for product and page-related requirements in this repository.
- If a requirement is purely backend, data, or infrastructure work and Stitch is not applicable, explain that briefly during the planning step and continue with the rest of the flow.
- If a higher-priority system, developer, or environment rule conflicts with this file, follow the higher-priority rule and then continue as close to this workflow as possible.
