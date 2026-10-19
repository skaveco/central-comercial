# Agents.md — AI Development Rules

This document defines the rules and workflow that AI agents must follow when working on this project.

The goal is to keep the project:
*   Safe
*   Maintainable
*   Scalable
*   Simple to understand
*   Consistent with the existing architecture
*   Consistent with the approved UI/UX
*   Easy for a Product/UI/UX Designer with basic frontend knowledge to supervise

The AI must prioritize **clarity, safety, maintainability and traceability over speed**.
* * *

# 1\. SOURCE OF TRUTH

## 1.1 Product rules
The [PRD](docs/Introdução/PRD.md) defines the product scope and summarizes the approved rules. [Functional specifications](docs/Funcionalidades/Funcionalidades.md) and [Settings](docs/Configurações/Configurações.md) contain the authoritative operational details, including validations, permissions, automations and metric formulas. Read the relevant module before implementation; do not infer missing rules from the PRD summary.

Explicit decisions approved by the user take precedence over older documentation or design notes. Keep the affected documents consistent. If a conflict has no recorded resolution, explain it before changing product behavior. [Overview Geral](docs/Introdução/Overview%20Geral.md) is a navigation summary, not a separate specification.

The AI must not silently change:
*   permissions;
*   statuses;
*   workflows;
*   commercial rules;
*   automation rules;
*   data retention;
*   user roles;
*   product behavior.

If implementation constraints conflict with the approved product specifications, the AI must explain the conflict before changing behavior.

## 1.2 Design rules
When the user provides a Figma link, component, frame or design reference, **Figma becomes the visual source of truth for that scope**, subject to subsequent approved user decisions. Example values and old annotations do not override the documented business rules.

The AI must:
*   inspect the provided design before implementation;
*   preserve layout, hierarchy, spacing, typography, states and interactions;
*   reuse the existing design system whenever possible;
*   not invent or reinterpret visual decisions without informing the user;
*   explain any technical constraint that prevents an accurate implementation.
* * *

# 2\. CORE PRINCIPLES

## 2.1 Do not make important decisions silently
The AI must not make significant product, architectural, database, security or UX decisions without informing the user.

Important decisions include changes that can affect:
*   product behavior;
*   user experience;
*   database structure;
*   security;
*   performance;
*   costs;
*   architecture;
*   future maintenance.

## 2.2 Inspect before modifying
Before changing existing code, inspect the relevant context:
*   files;
*   components;
*   patterns;
*   dependencies;
*   database structure;
*   types;
*   utilities;
*   design system.

Do not create something that already exists.

## 2.3 Prefer simple solutions
Prefer the smallest solution that correctly solves the problem.

Avoid:
*   unnecessary abstractions;
*   over-engineering;
*   excessive dependencies;
*   premature optimization;
*   duplicated logic;
*   unnecessary state management;
*   unnecessary API layers;
*   architecture added only for future hypothetical needs.

Complexity must have a clear reason.
* * *

# 3\. REQUIRED DEVELOPMENT WORKFLOW

## STEP 1 — UNDERSTAND
Before changing anything:
1. Understand the request.
2. Inspect the relevant project files.
3. Identify existing patterns.
4. Identify possible impacts.
5. Identify uncertainties.

Ask questions only when ambiguity materially changes the implementation.

## STEP 2 — PLAN
Before implementation, present a concise plan containing:

### Objective
What will be achieved.

### Changes
What will be created, modified or removed.

### Files
Main files expected to be affected.

### Technical approach
How the change will work.

### Impact
What changes in the application behavior.

### Risks
Relevant risks or side effects.

### Database
When applicable:
*   tables;
*   columns;
*   relationships;
*   indexes;
*   migrations;
*   RLS policies.

## STEP 3 — APPROVAL BY RISK

A direct user request to implement a defined scope counts as explicit approval for that scope. Present the relevant plan, but do not ask the user to approve the same work again. Request new approval only when the implementation introduces a material decision, risk or scope expansion that was not authorized by the original request.

### Low risk
Examples:
*   text changes;
*   small styling changes;
*   minor UI adjustments;
*   small component fixes.

If the user's request already clearly authorizes the change, the AI may proceed after presenting a short plan.

### Medium risk
Examples:
*   new features;
*   new data flows;
*   new dependencies;
*   significant refactoring;
*   meaningful behavior changes.

Present a clear plan. Proceed when the user's request already explicitly authorizes that scope; otherwise wait for explicit approval.

### High risk
Examples:
*   database migrations;
*   RLS changes;
*   authentication architecture;
*   sensitive data handling;
*   production configuration;
*   destructive operations.

Always require explicit approval before implementation. A direct request that clearly authorizes the specific high-risk action may satisfy this requirement, but never infer approval for an unstated destructive action, production change, credential exposure or broader data access.

Do not interpret approval for one scope as approval for unrelated changes.

## STEP 4 — IMPLEMENT
After approval when required:
1. Implement only the approved scope.
2. Follow existing project patterns.
3. Avoid unrelated changes.
4. Do not refactor unrelated code.
5. Do not change visual design without approval.
6. Do not add dependencies without justification.
7. Keep the implementation as small and understandable as possible.

## STEP 5 — TEST
After implementation:
*   run the appropriate checks;
*   verify TypeScript;
*   verify lint when available;
*   test the affected functionality;
*   verify important user flows;
*   verify relevant loading, empty, error and success states;
*   verify desktop behavior for UI changes.

Do not claim something was tested if it was not actually tested.

## STEP 6 — REPORT
After completing the work, provide a concise report containing:

### What was done
Short explanation of the implementation.

### Files changed
List every relevant file created, modified or deleted.

### Where the logic lives
Identify the main:
*   files;
*   functions;
*   components;
*   server actions;
*   migrations;
*   policies.

### Business rule traceability
When implementing a business rule, cite its functional specification and state where it is implemented in the code.

Example:
> Lead cooling rule → `src/modules/commercial/...` → `checkStaleDeals()`

### Dependencies
List dependencies added or removed and why.

### Database changes
When applicable:
*   tables;
*   columns;
*   relationships;
*   indexes;
*   migrations;
*   RLS policies.

### Tests
Explain what was tested and the result.

### Known issues
Mention:
*   bugs;
*   limitations;
*   unverified areas;
*   technical debt.

### Next steps
Only when relevant.
* * *

# 4\. SCOPE CONTROL

## 4.1 Do not expand the scope
If another issue is discovered:
1. finish the approved scope when safe;
2. report the issue;
3. explain the recommended solution;
4. request approval before additional work when needed.

## 4.2 Do not refactor unnecessarily
Refactor only when:
*   required by the requested feature;
*   fixing a real problem;
*   explicitly requested;
*   the current structure creates meaningful risk.
* * *

# 5\. OFFICIAL PROJECT STACK

The approved stack is documented in [Stack e arquitetura](docs/Introdução/Stack%20e%20arquitetura.md):

*   **Next.js 16**
*   **React 19**
*   **TypeScript**
*   **Tailwind CSS 4**
*   **shadcn/ui**
*   **Heroicons**
*   **shadcn/ui Charts**
*   **dnd-kit**
*   **Supabase**
    *   PostgreSQL
    *   Auth
    *   RLS
    *   Storage
    *   Cron
*   **Zod**
*   **React Hook Form**
*   **Vercel**
*   **GitHub**
*   **pnpm**
*   **ESLint**
*   **Vitest**
*   **Playwright**

The AI must not replace an approved technology without explaining:
*   why the current option is insufficient;
*   what the replacement solves;
*   maintenance impact;
*   security impact;
*   migration cost.
* * *

# 6\. CODE QUALITY

Code must be:
*   clear;
*   predictable;
*   maintainable;
*   reusable when appropriate;
*   easy to debug;
*   easy for another developer to understand.

Prefer readability over cleverness.

## 6.1 Naming
Use descriptive names.

Avoid vague names such as:
`data`, `thing`, `temp`, `foo`, `handleStuff`.

## 6.2 Functions
Functions should have a clear responsibility.

Avoid mixing unrelated responsibilities without a good reason.

## 6.3 Components
Before creating a component:
1. search for an existing one;
2. check whether it can be reused;
3. create a new one only when necessary.

Avoid oversized components with unrelated responsibilities.
* * *

# 7\. TYPESCRIPT

Use TypeScript properly.

*   Avoid `any` unless there is a clear documented reason.
*   Prefer type inference when the type is obvious.
*   Use explicit types at important boundaries such as APIs, database operations, public functions and complex objects.
*   Avoid unnecessary type duplication.
*   Reuse existing/generated types when possible.
*   Do not use TypeScript merely to silence errors.
* * *

# 8\. NEXT.JS

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

Use the App Router architecture established by the project.

*   Prefer Server Components by default.
*   Use Client Components only when required by browser APIs, state, event handlers, effects or client-side interaction.
*   Do not add `"use client"` automatically.
*   Do not turn entire pages into Client Components when only a small part requires interaction.
*   Prefer the simplest appropriate data flow.
*   Do not create API routes when Server Actions or server-side code already solve the problem cleanly.
* * *

# 9\. REACT

Avoid unnecessary:
*   state;
*   effects;
*   re-renders;
*   context;
*   memoization;
*   global state.

Do not use `useEffect` when derived state or server-side logic is sufficient.

Keep component logic understandable.
* * *

# 10\. SUPABASE

Supabase is a critical part of the application's security architecture.

## 10.1 Database
Before modifying schema, inspect:
*   primary keys;
*   foreign keys;
*   relationships;
*   constraints;
*   indexes;
*   nullability;
*   defaults;
*   RLS.

## 10.2 Migrations
All structural database changes must use versioned migrations.

Migrations must be:
*   clear;
*   reproducible;
*   ordered;
*   safe.

Do not make undocumented production schema changes.

## 10.3 Row Level Security
RLS must be considered for every user-accessible table.

Frontend visibility is never authorization.

Permissions must be enforced at the database/server level where appropriate.

## 10.4 Supabase keys
Understand the difference between client-safe project credentials and privileged secrets.

*   Public/client-safe Supabase credentials may be used in the browser when intended by Supabase and protected by RLS.
*   `service_role` and privileged secrets must NEVER be exposed to the browser.
*   Secrets must use environment variables.
*   Never commit secrets to Git.

## 10.5 User input
Never blindly trust data from:
*   forms;
*   URL parameters;
*   client requests;
*   external APIs;
*   browser storage.

Validate input at the appropriate server/database boundary.
* * *

# 11\. SECURITY

Security must be considered in every implementation.

Avoid:
*   exposed secrets;
*   hardcoded credentials;
*   unsafe database queries;
*   missing authorization;
*   insecure uploads;
*   trusting client-side permissions;
*   sensitive data in logs;
*   unnecessary exposure of private data.

Never solve a security problem only through UI restrictions.
* * *

# 12\. ENVIRONMENT VARIABLES

Never hardcode:
*   API keys;
*   passwords;
*   tokens;
*   private service credentials.

When adding an environment variable:
1. add it to the appropriate example env file when applicable;
2. explain what it is used for;
3. never expose secret values in code or documentation.
* * *

# 13\. DEPENDENCIES

Before installing a package, explain:
*   why it is needed;
*   what problem it solves;
*   whether the existing stack already solves it;
*   maintenance/security implications.

Prefer the approved stack and existing dependencies.

Avoid libraries for trivial functionality.
* * *

# 14\. UI / UX

The UI must respect:
1. the approved Figma design;
2. the existing design system;
3. existing component patterns.

Before creating UI, inspect:
*   components;
*   typography;
*   spacing;
*   borders;
*   shadows;
*   radius;
*   icons;
*   interaction patterns;
*   existing tokens.

Do not invent a new visual pattern when an approved one already exists.

## 14.1 UI states
Consider relevant states:
*   default;
*   hover;
*   focus;
*   active;
*   disabled;
*   loading;
*   error;
*   empty;
*   success.

## 14.2 Platform scope
The current product scope is **desktop only**.

The AI must:
*   implement and verify desktop layouts;
*   not spend time building full tablet/mobile responsiveness unless requested;
*   avoid introducing unnecessary mobile-specific complexity;
*   still avoid fragile layout techniques that would make future responsiveness unnecessarily difficult.

## 14.3 Accessibility
Consider:
*   keyboard navigation;
*   focus states;
*   semantic HTML;
*   accessible labels;
*   color contrast;
*   screen reader compatibility where appropriate.
* * *

# 15\. PERFORMANCE

Consider performance without premature optimization.

Prefer:
*   server-side data fetching when appropriate;
*   small client bundles;
*   optimized assets;
*   avoiding unnecessary requests;
*   efficient database queries;
*   pagination for large datasets.

Do not optimize without evidence of a real problem.
* * *

# 16\. ERROR HANDLING

Errors must be handled intentionally.

Consider:
*   user-facing feedback;
*   developer logging;
*   fallback behavior;
*   retry behavior;
*   security implications.

Never expose sensitive technical information to end users.
* * *

# 17\. DATA-DRIVEN STATES

Every data-driven interface should intentionally consider:

### Loading
What does the user see while data is loading?

### Empty
What does the user see when there is no data?

### Error
What happens when the request fails?

### Success
What happens after the operation succeeds?
* * *

# 18\. API AND DATA FLOW

Prefer the simplest valid flow.

Typical flow:

```plain
User
↓
UI
↓
Server / Client Component
↓
Server Action / Route Handler when needed
↓
Supabase
↓
PostgreSQL
```

Avoid unnecessary layers.
* * *

# 19\. GIT

Keep Git history understandable.

*   Use focused commits when commits are part of the workflow.
*   Avoid mixing unrelated changes.
*   Never rewrite or delete history without explicit approval.
*   Never run destructive Git commands without explicit approval.

Examples:
`git reset --hard`
`git clean -fd`
`git push --force`
* * *

# 20\. FILE STRUCTURE

Before creating files:
1. inspect the current structure;
2. follow existing conventions;
3. place files near similar functionality.

Do not reorganize the project without a clear reason.

The project should evolve as a **modular monolith**, organized by domain where appropriate.
* * *

# 21\. DOCUMENTATION

Create documentation only when it has lasting value.

Document:
*   important architectural decisions;
*   complex business rules;
*   non-obvious integrations;
*   database decisions;
*   environment configuration;
*   important technical constraints.

Do not create documentation only to increase the number of files.
* * *

# 22\. BUSINESS LOGIC

Business rules are more important than implementation convenience.

Never silently change business logic because another implementation is easier.

If a business rule is unclear and materially affects behavior, ask the user.

Business rules must remain explicit and easy to locate.
* * *

# 23\. DESIGN VS IMPLEMENTATION

The user owns product and visual decisions.

The AI helps translate those decisions into reliable software.

When design conflicts with a technical constraint:
1. explain the conflict;
2. explain the technical limitation;
3. present practical options;
4. explain the impact of each option;
5. wait for the user's decision when the choice materially affects the product.
* * *

# 24\. COMMUNICATION STYLE

The user is a Product/UI/UX Designer with basic knowledge of HTML, CSS, TypeScript and React, but limited backend/infrastructure experience.

Therefore:
*   use simple language;
*   avoid unnecessary jargon;
*   explain technical terms when they matter;
*   explain consequences, not only implementation details;
*   keep explanations concise unless more depth is requested.
* * *

# 25\. WHEN TO ASK QUESTIONS

Ask before implementing when:
*   the requirement is materially ambiguous;
*   there are multiple materially different solutions;
*   the choice affects product behavior;
*   the choice affects security;
*   the choice affects database architecture;
*   the choice affects cost;
*   the choice creates meaningful long-term technical debt;
*   the requested behavior conflicts with approved functional specifications and no explicit user decision resolves it.

Do not ask unnecessary questions when the implementation is obvious and low risk.
* * *

# 26\. WHEN SOMETHING GOES WRONG

If implementation fails:
1. state what was attempted;
2. state what failed;
3. explain the likely cause;
4. identify what changed before the failure;
5. propose the safest next step.

Do not hide failures.

Do not repeatedly try random fixes without investigation.
* * *

# 27\. DO NOT FAKE RESULTS

Never claim:
*   "it works" without testing;
*   "the database was updated" without updating it;
*   "the migration ran" without running it;
*   "the bug is fixed" without verification;
*   "the UI matches Figma" without checking it;
*   "the API is secure" without appropriate verification.

Be explicit about what was verified and what was not.
* * *

# 28\. DEFAULT PRIORITY

When uncertain, follow this order:

1. Protect user data.
2. Protect application security.
3. Preserve approved business rules from the PRD and functional specifications.
4. Preserve existing functionality.
5. Preserve approved UI/UX.
6. Follow established architecture.
7. Keep the solution simple.
8. Ask the user when a meaningful decision remains unclear.
* * *

# 29\. GOLDEN RULE

The AI is not the product owner.

The AI must not make important product decisions silently.

The expected workflow is:

```plain
UNDERSTAND
↓
INSPECT
↓
PLAN
↓
GET APPROVAL WHEN REQUIRED
↓
IMPLEMENT
↓
TEST
↓
REPORT
```

The goal is not to write as much code as possible.

The goal is to build the **smallest, safest and most maintainable solution that correctly implements the approved product and design.**
