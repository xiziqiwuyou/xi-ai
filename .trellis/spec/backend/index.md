# Backend Development Guidelines

> Build-time and deployment conventions for this static project.

---

## Overview

This repository has no backend runtime. These guides document the current
build-time Node scripts, static data boundary, browser-facing error model, and
container deployment constraints so future work does not invent an implicit
server layer.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Build, source, and deployment layout | Maintained |
| [Database Guidelines](./database-guidelines.md) | No database; generated data and persistence boundary | Maintained |
| [Error Handling](./error-handling.md) | Build and browser request failures | Maintained |
| [Quality Guidelines](./quality-guidelines.md) | Contract checks and source/output rules | Maintained |
| [Logging Guidelines](./logging-guidelines.md) | Short-lived tool output and secret safety | Maintained |

---

## Pre-Development Checklist

- Confirm whether the change belongs to source parsing, generated data,
  browser code, or deployment.
- Read the frontend index as well for any browser-visible behavior.
- Preserve the read-only source boundary and generated coverage checks.
- Keep credentials out of logs, URLs, fixtures, and generated artifacts.

## Quality Check

Run the relevant Node contract tests and report Docker or external deployment
checks separately when the host cannot execute them.

---

**Language**: All documentation should be written in **English**.
