---
name: adversarial-review
description: Try to falsify a phase's completion claims using a fresh review, tests, and counterexamples.
argument-hint: "[phase or PR]"
disable-model-invocation: true
context: fork
agent: adversarial-reviewer
---

Read the active goal, final diff, proof packet, and verification outputs. Search for missing acceptance criteria, false assumptions, untested failure modes, weakened tests, security/tenant leaks, UX regressions, cost explosions, provider lock-in, and claims unsupported by evidence. Run bounded read-only checks where possible. Return blocking findings first, then non-blocking risk, then what evidence would prove completion. Do not edit or approve your own findings away.
