# Aigenikz Technologies LLC

# CONTRIBUTING GUIDE

Version: 1.0.0

Status: Active

Classification: Internal Engineering Standard

Copyright © Aigenikz Technologies LLC

All Rights Reserved.

---

# Welcome

Thank you for contributing to Aigenikz Technologies LLC.

Aigenikz is more than a software project.

It is an engineering effort dedicated to building an Artificial Intelligence Operating System that helps people transform ideas into reality.

Every contribution should strengthen that mission.

---

# Our Engineering Philosophy

Before writing code, ask yourself:

**Does this help someone transform an idea into reality?**

If the answer is yes...

Build it.

If the answer is no...

Challenge the requirement before writing code.

---

# Engineering Principles

Every contribution should improve one or more of the following:

- Intelligence
- Reliability
- Security
- Performance
- Simplicity
- Maintainability
- Extensibility
- User Experience

Avoid changes that increase complexity without providing meaningful value.

---

# Architecture First

Understand the architecture before making changes.

Read these documents first:

- README.md
- VISION.md
- ARCHITECTURE.md
- SECURITY-ARCHITECTURE.md
- ROADMAP.md

Do not bypass architectural principles to achieve short-term results.

---

# Kernel-First Development

The Aigenikz Intelligence Kernel coordinates the platform.

New functionality should integrate through:

Kernel

↓

Mission

↓

Capability Router

↓

Capability

Avoid direct subsystem-to-subsystem coupling.

---

# Branch Strategy

Never develop directly on `main`.

```
main
│
├── develop
│
└── feature/*
```

Feature work should be isolated in feature branches.

---

# Commit Guidelines

Write descriptive commits.

Good

```
Add Mission lifecycle tracking
```

Good

```
Implement Capability Registry
```

Avoid

```
Update files
```

Avoid

```
Fix stuff
```

Every commit should describe a meaningful engineering change.

---

# Code Quality

Every contribution should:

Compile successfully.

Pass tests.

Follow existing architecture.

Remain modular.

Remain readable.

Avoid unnecessary duplication.

Document complex logic.

---

# Documentation

Architecture changes require documentation updates.

If you change:

Kernel

Mission

Capabilities

Memory

Provider Layer

Security

Update the relevant documentation in the repository.

Code and documentation should evolve together.

---

# Security

Never commit:

API Keys

Passwords

Secrets

Private Keys

Environment Files

Security issues should be reported privately.

---

# Testing

Before requesting review:

Build successfully.

Run available tests.

Verify backward compatibility.

Confirm no regression in existing features.

Review logs for unexpected warnings.

---

# Artificial Intelligence

AI-generated code is permitted.

However:

Every contribution must be reviewed by a human.

Engineering responsibility remains with the contributor.

Generated code should improve clarity rather than introduce unnecessary complexity.

---

# Decision Making

When multiple solutions exist:

Prefer the simpler architecture.

Prefer reusable components.

Prefer modular design.

Prefer long-term maintainability over short-term convenience.

---

# Performance

Optimize only after measuring.

Premature optimization should not compromise readability or maintainability.

---

# Professional Standards

Contributors are expected to:

Respect architecture.

Respect documentation.

Respect security.

Respect users.

Respect fellow contributors.

Build software that future engineers will appreciate.

---

# Our Standard

Every line of code should leave Aigenikz stronger than it was before.

---

# Guiding Question

Before submitting code ask:

**Would I be proud if this implementation became the permanent way Aigenikz solved this problem?**

If not...

Keep improving it.

---

# Closing

Aigenikz is not being built for the next release.

It is being built for the next generation.

Build accordingly.

---

Document Owner

Aigenikz Technologies LLC

Founder

Ivan Perez

Version

1.0.0