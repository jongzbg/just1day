---
name: ai-system-workflow
description: Agentic AI development workflow used in this project — System Architect → UI Conversion → UI Pixel Polish → Self Review loop. Load when starting a new feature or task.
tags: [workflow, agent, development, planning, fullstack]
triggers:
  - "เริ่มทำ"
  - "สร้างฟีเจอร์"
  - "new feature"
  - "develop"
  - "implement"
  - "วางแผน"
  - "planning"
  - "workflow"
created: 2026-05-05
---

# AI System Development Workflow

Strict step-by-step execution. NEVER skip, reorder, or merge steps.

---

## STEP 1: Requirement Analysis
- Understand user intent
- Identify missing requirements
- Clarify assumptions if needed

---

## STEP 2: System Design
- Define overall architecture
- Identify modules and services
- Ensure alignment with architecture-guidelines

---

## STEP 3: Database Design
- Define tables and relationships
- Add indexes for performance
- Validate against backend-rules

---

## STEP 4: API Design
- Define endpoints
- Define request/response structure
- Ensure consistency and scalability

---

## STEP 5: Frontend Structure
- Define MainLayout (Navbar + Left + Center + Right)
- Define reusable components
- Ensure consistency with frontend-rules

---

## STEP 6: Implementation

### 6.1 Backend Implementation
Build core APIs (auth, post, feed, user)

### 6.2 Frontend Implementation
Integrate APIs, apply component structure

### 6.3 UI Conversion (MANDATORY)
- Convert design/HTML into component-based UI
- MUST follow MainLayout system
- Map HTML → JSX + TailwindCSS

### 6.4 UI Polish (MANDATORY)
- Fix spacing, alignment, font, layout issues
- MUST achieve near pixel-perfect accuracy

---

## STEP 7: Performance Optimization
- Apply caching (Redis — planned)
- Optimize database queries
- Move heavy tasks to background jobs

---

## STEP 8: Validation (CRITICAL)

### 8.1 Self Review
Execute ALL checks from self-review.md

### 8.2 Validation Loop
IF any issue is found:
- UI issue → return to UI Pixel Polish
- Structure issue → return to UI Conversion
- Logic issue → return to Implementation

REPEAT until ALL checks pass

---

## STEP 9: Definition of Done Check

Validate against constraints:
- Layout is consistent across all pages
- Navbar is identical everywhere
- MainLayout is reused
- No duplicate components exist
- UI is visually consistent
- Performance optimizations applied

IF ANY condition fails → RETURN to STEP 8

---

## STEP 10: Final Output
- Deliver complete system
- Follow execution-template.md format strictly

---

## AGENT EXECUTION CHAIN

1. **System Architect** — Analyze + Plan, control entire flow
2. **UI Conversion Agent** — Build component structure
3. **UI Pixel Polish Agent** — Fix visual accuracy
4. **Self Review** — Validate and trigger loop if needed

---

## Agent Skills

### System Architect
Skills: system design, task decomposition, architecture planning, fullstack knowledge
Rules: MUST follow workflow.md, MUST enforce constraints.md, MUST ensure no duplication

### UI Conversion Agent
Skills: HTML to JSX, TailwindCSS mapping, layout replication, component extraction, responsive behavior
Rules: MUST match spacing exactly, MUST preserve font hierarchy, MUST break into reusable components

### UI Pixel Polish Agent
Skills: visual comparison, CSS fine-tuning, layout correction, spacing alignment
Rules: MUST fix spacing differences, MUST match font sizes exactly, MUST eliminate visual inconsistencies

---

## CONSTRAINTS (STRICT)

- **NEVER skip design phase**
- **NEVER jump directly to coding**
- **NEVER create duplicated components**
- **NEVER design pages independently without shared layout**

### UI Rules
- MUST use single MainLayout
- Navbar MUST be identical across all pages
- Only center content can change

### Architecture Rules
- MUST separate frontend and backend
- MUST use modular backend structure
- MUST use pagination for feed

### Performance Rules
- MUST avoid heavy queries
- MUST cache frequently used data

---

## Self-Review Checklist

Before final output, check ALL:
- Is the architecture consistent?
- Is there any duplicated logic?
- Are all components reusable?
- Is the layout consistent across pages?
- Are performance optimizations applied?
- Are there missing features?
- Is Navbar identical across all pages?
- Is MainLayout reused?
- Are there duplicate components?

If issues are found → Fix before responding
If YES to any → MUST fix before final output
