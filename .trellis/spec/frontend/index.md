# Frontend Development Guidelines

> Conventions for the framework-free API documentation workbench.

---

## Overview

The site is a static HTML/CSS/vanilla JavaScript application. These guides
describe the real DOM, state, request serialization, accessibility, and
responsive behavior used by the current workbench.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Static shell and asset ownership | Maintained |
| [Component Guidelines](./component-guidelines.md) | Semantic regions and render functions | Maintained |
| [Hook Guidelines](./hook-guidelines.md) | Plain-function async and event patterns | Maintained |
| [State Management](./state-management.md) | Single-page state and async identity | Maintained |
| [Quality Guidelines](./quality-guidelines.md) | Tests, accessibility, and visual safety | Maintained |
| [Type Safety](./type-safety.md) | JavaScript shape contracts and validation | Maintained |
| [Provider and Request Contracts](./provider-request-contracts.md) | Provider registry, request serialization, sync, and canonical debug | Maintained |
| [Interaction and Deployment Contracts](./interaction-deployment-contracts.md) | Endpoint navigation, credential safety, responsive tester, and static deployment | Maintained |

---

## Pre-Development Checklist

- Read the directory, component, state, type, and quality guides relevant to
  the surface being changed.
- Read provider-request-contracts.md for protocol or serialization changes.
- Read interaction-deployment-contracts.md for navigation, credentials,
  responsive tester, or deployment changes.
- Search existing render and request helpers before adding a new one.
- State the change boundary for multi-file or cross-layer work.

## Quality Check

Run data generation, serialization, deployment, and browser regression checks
as applicable. Inspect desktop and compact layouts and keep browser console
errors at zero.

---

**Language**: All documentation should be written in **English**.
