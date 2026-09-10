# GitHub primitives for a cross-repo release

Research note for [wcpos/roadmap#180](https://github.com/wcpos/roadmap/issues/180) (map: [wcpos/roadmap#178](https://github.com/wcpos/roadmap/issues/178)).
Date: 2026-09-10. Sources: docs.github.com, the `github/docs` content source, the GitHub OpenAPI description, the GitHub changelog, and live GraphQL/REST introspection against the `wcpos` org.

Everything under **Confirmed** is either quoted from a primary doc or observed live on this account. Everything under **Unknown** is separated out deliberately — do not build on it without checking.

---

## 0. The short version

GitHub can express, natively:

- one parent issue in `wcpos/roadmap` with up to 100 sub-issues, 8 levels deep, spanning repos **and** orgs
- per-repo milestones, five separate copies, each with its own title/description/`due_on`/state
- one org Project (#4) that shows every item's repo, milestone, parent, sub-issue progress and issue type, filters on all of them, and holds a Status single-select
- an org-level `projects_v2_item` webhook, and repo-level `issues` / `milestone` webhooks and Actions triggers

GitHub **cannot** express:

- a milestone shared across repos, or any link between two same-titled milestones in different repos. There is no such object.
- a repository Actions workflow that fires on a project board change. `projects_v2*` is org-webhook-only.
- a bulk write. Every field value, every milestone assignment, every sub-issue link is one API call.

So the release issue can be the single source, but **every derived artefact — the five milestones, the ~700 board rows, the website page — has to be written by a loop that runs outside a repo Action.**

---

## 1. Sub-issues

### Confirmed

**Cross-repo and cross-org are both supported.**
- Docs: "To add issues from other repositories, click the back arrow next to the repository name and select a different repository." — [Adding sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues)
- Changelog 2025-09-11: "Sub-issues now support cross-organization issues, allowing a sub-issue to belong to a different organization than its parent." — [changelog](https://github.blog/changelog/2025-09-11-a-rest-api-for-github-projects-sub-issues-improvements-and-more/)
- **Observed live**: `wcpos/roadmap#3` has two sub-issues, `wcpos/woocommerce-pos#448` and `wcpos/monorepo#54`. Cross-repo sub-issues already exist in this org and work.

**Limits.** "You can add up to 100 sub-issues per parent issue and create up to eight levels of nested sub-issues." — [Adding sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues); the `100` comes from `data/variables/projects.yml` (`sub-issue_limit: '100'`) in `github/docs`. Raised from 50 on 2024-12-12.

**`subIssuesSummary` exists and is header-free.** Live introspection of `SubIssuesSummary` returns exactly three fields: `completed`, `percentCompleted`, `total`. REST returns the same as `sub_issues_summary: {total, completed, percent_completed}` on the issue payload. A plain `gh api graphql` query for `subIssuesSummary` and `subIssues` succeeds with **no `GraphQL-Features: sub_issues` header** — that header was beta-only and is obsolete post-GA (GA 2025-04-09, [Evolving GitHub Issues and Projects](https://github.blog/changelog/2025-04-09-evolving-github-issues-and-projects/)).

**Inheritance.** Changelog 2025-09-11, verbatim: *"Sub-issues now inherit the Project and Milestone of their parent issue by default."* Nothing in the docs says labels or assignees are inherited, and nothing says inheritance is re-applied when the parent changes later — it reads as a create-time default.

**API surface** (from the OpenAPI description and [REST: sub-issues](https://docs.github.com/en/rest/issues/sub-issues)):

| Op | Endpoint | Body | Permission |
|---|---|---|---|
| List | `GET /repos/{o}/{r}/issues/{n}/sub_issues` | — | Issues: read |
| Add | `POST /repos/{o}/{r}/issues/{n}/sub_issues` | `sub_issue_id` (int), `replace_parent` (bool) | Issues: **write** |
| Remove | `DELETE /repos/{o}/{r}/issues/{n}/sub_issue` (singular) | `sub_issue_id` (int) | Issues: write |
| Reprioritize | `PATCH /repos/{o}/{r}/issues/{n}/sub_issues/priority` | `sub_issue_id` + `after_id`/`before_id` | Issues: write |
| Get parent | `GET /repos/{o}/{r}/issues/{n}/parent` | — | Issues: read |

`sub_issue_id` is the **global database id** (`integer`), not the issue number and not the GraphQL node id. Get it from `GET /repos/{o}/{r}/issues/{n}` then read `.id`.

**Trap in the OpenAPI body description:** *"The sub-issue must belong to the same repository owner as the parent issue."* This sits awkwardly beside the 2025-09-11 cross-org changelog. Reading: the REST endpoint is still owner-scoped; cross-org sub-issues are reachable through the UI / GraphQL (`AddSubIssueInput` accepts `subIssueUrl`, which an owner-scoped `sub_issue_id` cannot express). Irrelevant to us — everything is under `wcpos` — but note it before anyone reuses this outside the org.

**GraphQL.** Mutations present in the live schema: `addSubIssue`, `removeSubIssue`, `reprioritizeSubIssue`. `CreateIssueInput` has **`parentIssueId: ID`** — a sub-issue can be created already parented in one call, which halves the write count for a fresh release tree.

### Unknown

- Whether closing all sub-issues closes the parent. No doc says either way. Nothing observed; assume **no** but do not rely on it.
- Whether the Project/Milestone inheritance is re-applied on later parent changes, or only at creation.
- Whether inheritance can even fire across repos: the parent's milestone is a `wcpos/roadmap` milestone number, which is meaningless in `wcpos/monorepo`. Live evidence is against it — `roadmap#3` carries milestone `v1.11.0`, its sub-issue `woocommerce-pos#448` has **no** milestone and `monorepo#54` has `Backlog`. (Those links predate the Sept 2025 change, so this is suggestive, not decisive.) **Treat cross-repo milestone inheritance as unavailable; derive it explicitly.**

---

## 2. Issue types (org-level)

### Confirmed

GA 2025-04-09 ([changelog](https://github.blog/changelog/2025-04-09-evolving-github-issues-and-projects/)); REST support 2025-03-18 ([changelog](https://github.blog/changelog/2025-03-18-github-issues-projects-rest-api-support-for-issue-types/)). Org-level only — configured at org Settings, Planning, Issue types, and applied to issues in any repo of that org. Limit **25** per org (`data/variables/projects.yml`, `issue_type_limit: '25'`).

**Live on `wcpos`:** three types exist and are enabled — `Task`, `Bug`, `Feature` (the GitHub defaults, created 2024-02-02). `GET /orgs/wcpos/issue-types` returns their ids (`10023205`, `10023207`, `10023210`) and node ids. **No issue in `wcpos/roadmap` currently carries a type** — every issue sampled returns `issueType: null`. The feature is provisioned and unused.

**GraphQL** (live introspection): `Issue.issueType`, `Issue.viewerCanType`; `IssueType` object with `color`, `description`, `id`, `isEnabled`, `issues`, `name`, `pinnedFields`. Mutations: `createIssueType`, `updateIssueType`, `deleteIssueType` (org-level), and **`updateIssueIssueType`** to set it on an issue. `CreateIssueInput.issueTypeId: ID` and `UpdateIssueInput.issueTypeId: ID` / `issueType: IssueTypeUpdateInput` both exist, so a type can be set at creation.

**REST**: `GET/POST /orgs/{org}/issue-types`, `PUT|DELETE /orgs/{org}/issue-types/{issue_type_id}`, `GET /repos/{o}/{r}/issue-types`. Set on an issue via `POST|PATCH /repos/{o}/{r}/issues/{n}` with `"type": "Bug"` (the **name**, a string; `null` clears).

**Permissions — this is the gotcha.** Org issue-type management needs a distinct fine-grained permission: **"Issue Types" organization permissions (read / write)**. It is not covered by Issues or Projects. Setting a type on an issue only needs Issues: write. See section 7 — **no wcpos App currently holds `issue_types`.**

**Filtering.** Advanced issue search supports `type:"Bug"`, combinable and nestable up to 5 levels: `(type:"Bug" AND assignee:octocat) OR (type:"Feature" AND assignee:hubot)` — [Filtering and searching issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests). **Legacy trap:** in old search syntax `type:` meant issue-vs-PR; that role moved to `is:issue` / `is:pr`. Projects v2 can show an `Issue type` field and filter on it — [About the issue type field](https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-the-issue-type-field). GraphQL advanced search uses `search(type: ISSUE_ADVANCED, ...)`.

### Unknown

Explicit plan-tier gating (Free/Team/Enterprise). No docs plans table found; it is live on this org, which is what matters here.

---

## 3. Issue dependencies (blocked by / blocking)

### Confirmed

GA **2025-08-21** — "Dependencies on issues are now generally available!" ([changelog](https://github.blog/changelog/2025-08-21-dependencies-on-issues/)). Available on Free, Pro, Team and Enterprise Cloud (stated in the frontmatter of [Creating issue dependencies](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies)). Triage permission is enough to create one.

Limit: **50 issues per relationship type** (50 blocked-by and 50 blocking, capped separately).

**REST:**
- `GET|POST /repos/{o}/{r}/issues/{n}/dependencies/blocked_by` — POST body `issue_id` (integer, the **database id** of the blocking issue). Read: Issues: read. Write: **Issues: write**.
- `DELETE /repos/{o}/{r}/issues/{n}/dependencies/blocked_by/{issue_id}`
- `GET /repos/{o}/{r}/issues/{n}/dependencies/blocking` — read only. There is **no POST for `/dependencies/blocking`**: you express "A blocks B" by POSTing A to B's `blocked_by`.

**GraphQL** (live introspection): `Issue.blockedBy`, `Issue.blocking`, `Issue.issueDependenciesSummary` (fields `blockedBy`, `blocking`, `totalBlockedBy`, `totalBlocking`). Mutations are **`addBlockedBy` / `removeBlockedBy`** — not `addIssueDependency`. Timeline events `BLOCKED_BY_ADDED_EVENT` / `BLOCKING_REMOVED_EVENT`.

**UI/board.** Blocked issues get a "Blocked" icon on project boards and the repo Issues page. Search/filter qualifiers: `is:blocked`, `is:blocking`, `blocked-by:`, `blocking:`. `gh` CLI 2.94.0+ has `--blocked-by` / `--blocking` on `gh issue create` and `--add-blocked-by` / `--remove-blocked-by` on `gh issue edit`, accepting **numbers or URLs**.

**Live on `wcpos`:** already in use — `roadmap#180` (this ticket) has `blocking: [#183, #185]`, all same-repo.

### Unknown

- **Cross-repo dependencies.** Not stated either way in the GA docs or the REST reference. A pre-GA community comment said same-repo-only; the CLI accepting URLs suggests otherwise. **Test it with one throwaway pair before designing around it.**
- No documented max chain depth (only the 50-per-type cap).
- Whether dependencies exist as a Projects v2 *field/column* rather than filter plus icon. The live `ProjectV2FieldType` enum has no dependency member (section 4), so: filter and icon only.

---

## 4. Projects v2

### Confirmed — field types (live enum, richer than the docs page)

`ProjectV2FieldType` introspected live:

```
ASSIGNEES  LINKED_PULL_REQUESTS  REVIEWERS  LABELS  MILESTONE  REPOSITORY  TITLE
TEXT  SINGLE_SELECT  MULTI_SELECT  NUMBER  DATE  ITERATION
TRACKS  TRACKED_BY  ISSUE_TYPE  PARENT_ISSUE  SUB_ISSUES_PROGRESS
CREATED  UPDATED  CLOSED
```

The docs page names only Text / Number / Date / Single select / Iteration as *custom* types; the schema also carries `MULTI_SELECT`, and the rest are built-ins the project surfaces from the underlying issue.

**Which are writable.** `ProjectV2FieldValue` (the `updateProjectV2ItemFieldValue` input) has exactly six members, live:

```
text: String   number: Float   date: Date
singleSelectOptionId: String   multiSelectOptionIds: [String!]   iterationId: String
```

So **Milestone, Labels, Assignees, Repository, Issue type, Parent issue and Sub-issues progress cannot be written through the project at all** — they are projections of the issue. To change them you call `updateIssue` / `addLabelsToLabelable` / `updateIssueIssueType` / `addSubIssue` against the issue itself, and the board follows. Docs agree: [Using the API to manage projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects).

### Confirmed — limits

- **50,000 items** per project, across active views and the archive ([Archiving items automatically](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/archiving-items-automatically); raised from 1,200 in [Feb 2025](https://github.blog/changelog/2025-02-26-increased-items-in-github-projects-now-in-public-preview/)). Project #4 holds **728** — nowhere near.
- **50 fields** per project including built-ins. #4 has 12, so 38 spare.
- **50 options** per single-select.
- **Auto-add workflows per project by plan**: Free 1, Pro 5, Team 5, Enterprise Cloud 20, Enterprise Server 20 ([Adding items automatically](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/adding-items-automatically)).

### Confirmed — built-in workflows

"When your project initializes, two workflows are enabled by default: When issues or pull requests in your project are closed, their status is set to **Done**, and when pull requests in your project are merged, their status is set to **Done**." — [Using the built-in automations](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-built-in-automations). Others exist but are off by default: *Item added to project* to Todo, *Auto-close issue*, *Auto-archive items*, *Auto-add to project*.

**Live on Project #4 — this is the root cause of the wrong website page:**

```
workflows.totalCount = 2
  #1  "Item closed"          enabled: false
  #2  "Pull request merged"  enabled: false
```

Both defaults are **explicitly disabled**. That is precisely the "closed to Done never reaches the board" symptom in #178, and it is a two-click fix in the project settings UI, not something the sync has to reimplement.

**Workflows are not creatable or configurable via the API.** The only workflow mutation in the whole schema is `deleteProjectV2Workflow`; `ProjectV2Workflow` exposes `name`, `enabled`, `number`, but there is no `updateProjectV2Workflow` and no create. **Enabling those two is a manual UI action.**

Auto-add filter qualifiers (if we use one): `is:` (open/closed/merged/draft/issue/pr), `label:`, `reason:`, `assignee:`, `no:`; all except `no:` support negation. Auto-archive: `is:`, `reason:`, `updated:<@today-14d`.

### Confirmed — roadmap layout

"When you set a view to a roadmap layout, GitHub will attempt to use existing **date and iteration** fields... Select a date or iteration field for **Start date** and **Target date**." Vertical markers can show "your iterations, the dates of items in your project, and the **milestones** associated with items." Zoom: Month / Quarter / Year. — [Customizing the roadmap layout](https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/customizing-the-roadmap-layout)

**So milestone dates can only ever be vertical markers — they cannot drive item bars.**

**Live on Project #4** — the three views are `Board` (BOARD_LAYOUT), `Roadmap` (ROADMAP_LAYOUT), `Triage` (TABLE_LAYOUT). Its fields are:

```
Title, Assignees, Status (single-select: Triage/Backlog/Up Next/In Progress/Done),
Labels, Linked pull requests, Reviewers, Repository, Milestone,
Parent issue, Sub-issues progress, Priority (single-select: High/Medium/Low),
Created, Updated, Closed
```

There is **no date field and no iteration field**. The Roadmap view therefore has nothing to position items with. A usable roadmap needs at least a Date field (e.g. `Target`) written per item by the sync, or an Iteration field.

**View configuration is not API-readable.** `ProjectV2ViewConfiguration` has exactly one field, `visibleFields`. The roadmap's start/target field choice and its marker settings are neither readable nor writable via GraphQL — UI only.

### Confirmed — REST API for Projects v2 (new, 2025-09-11)

Projects v2 is no longer GraphQL-only ([changelog](https://github.blog/changelog/2025-09-11-a-rest-api-for-github-projects-sub-issues-improvements-and-more/)). Verified live against `wcpos`:

```
GET    /orgs/{org}/projectsV2
GET    /orgs/{org}/projectsV2/{project_number}
GET    /orgs/{org}/projectsV2/{project_number}/fields[/{field_id}]
POST   /orgs/{org}/projectsV2/{project_number}/fields
GET    /orgs/{org}/projectsV2/{project_number}/items[/{item_id}]
POST   /orgs/{org}/projectsV2/{project_number}/items
PATCH  /orgs/{org}/projectsV2/{project_number}/items/{item_id}
DELETE /orgs/{org}/projectsV2/{project_number}/items/{item_id}
POST   /orgs/{org}/projectsV2/{project_number}/drafts
POST   /orgs/{org}/projectsV2/{project_number}/views
GET    /orgs/{org}/projectsV2/{project_number}/views/{view_number}/items
```

Add item: `{"type":"Issue","id":<db id>}` or `{"type":"Issue","owner":..,"repo":..,"number":..}` — the owner/repo/number form is nicer than GraphQL's node-id-first flow.
Update field values: `PATCH .../items/{item_id}` with `{"fields":[{"id":<field_id>,"value":<v>|null}]}` — text/number/date pass the value directly, single-select/iteration pass the option or iteration id, `null` clears. **Multiple fields in one PATCH** — the closest thing to a batch write anywhere in this surface.
Permissions: read is "Projects" **organization** permissions (read); add/update/delete is **(write)**.
Reads take `fields[]=` / `fields=`; by default only Title comes back. The item payload embeds the full issue object, so it is far heavier per item than GraphQL — for a 728-item pull, GraphQL wins.

**No bulk mutation in GraphQL**, and the docs are explicit: "You cannot add and update an item in the same call."

### Confirmed — GraphQL cost for a ~700-item board

Measured live: one query pulling 100 items with content, repository, milestone, state and 20 field values each returned `rateLimit.cost = 1`, `nodeCount = 2100`. **A full 728-item read is about 8 points of a 5,000/hour budget — reads are effectively free.** Writes are the constraint (section 6).

---

## 5. Milestones

### Confirmed

**Strictly per-repository.** Every milestone endpoint in the entire OpenAPI description sits under `/repos/{owner}/{repo}/milestones`; there is no org- or user-level milestone path, and the GraphQL `Milestone` object has a non-null `repository` field. No cross-repo link, alias, or shared-milestone object exists anywhere in the schema or REST surface. — [REST: Milestones](https://docs.github.com/en/rest/issues/milestones), [About milestones](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-milestones)

**REST is the only write path.**

| Op | Endpoint |
|---|---|
| List | `GET /repos/{o}/{r}/milestones?state=all&per_page=100` |
| Create | `POST /repos/{o}/{r}/milestones` |
| Get | `GET /repos/{o}/{r}/milestones/{number}` |
| Update / close | `PATCH /repos/{o}/{r}/milestones/{number}` |
| Delete | `DELETE /repos/{o}/{r}/milestones/{number}` |

Body: `title` (required on create), `state` (`open`/`closed`), `description`, `due_on` (ISO 8601). Permission for all of them: **"Issues" repository permissions (write)** — there is no separate milestone permission. Closing a milestone is `PATCH {"state":"closed"}`.

**GraphQL has no milestone write path.** A full introspection of `Mutation` returns zero fields matching `milestone` other than `updateEnterpriseMembersCanViewDependencyInsightsSetting`. There is no `createMilestone`, no `updateMilestone`, no `closeMilestone`. Reads and `Milestone.viewerCanClose` exist; writes do not. **A sync that creates/updates/closes milestones must use REST.**

**Setting an issue's milestone.** REST `PATCH /repos/{o}/{r}/issues/{n}` with `{"milestone": <number>}` (`null` clears); the docs note "Only users with push access can set the milestone for issues" and that it is silently dropped otherwise, not an error. GraphQL `UpdateIssueInput.milestoneId: ID` — confirmed present by live introspection. `CreateIssueInput.milestoneId: ID` too.

**Can an App with cross-repo access set milestones in each repo?** Yes — an installation token scoped to N repos can PATCH issues in all N, each against that repo's own milestone number. What it cannot do is put repo A's milestone on repo B's issue: the REST milestone number is only meaningful within its repo path, and the GraphQL `milestoneId` node id belongs to a specific repository. The docs never spell this out as an error case; it is structural.

**Live milestone landscape (2026-09-10)** — the divergence #178 describes, confirmed and worse than stated:

| Milestone | roadmap | monorepo | woocommerce-pos | ...-pro | electron |
|---|---|---|---|---|---|
| `v1.10.0` | open, due 2026-08-24 | open, due 2026-06-30 | open, due 2026-06-30 | open, due 2026-06-30 | **absent** |
| `v1.11.0` | open, due 2026-09-14 | open, due 2026-07-31 | open, due 2026-07-31 | open, due 2026-07-30 | **absent** |
| `Compliance / Fiscalization` | absent | absent | open, due 2026-12-31 | open, due 2026-12-31 | absent |
| `Backlog` | absent | open | absent | absent | absent |
| `v2.0.0` | absent | open | absent | absent | absent |
| `2026.1`–`2026.10` | closed x10 | closed x10 | closed x10 | closed x10 | closed x10 |

Four different `due_on` values for `v1.11.0`. `v1.10.0` is still **open** in all four repos despite `v1.10.10` having shipped. `electron` has no version milestones at all. Fifty dead sprint-train milestones remain.

### Unknown

Nothing material. The absence of cross-repo milestone linking is established by exhaustive absence across REST and GraphQL, not by an explicit prohibition sentence.

---

## 6. Automation surface

### Confirmed — the decisive fact

**`projects_v2_item` is not an Actions trigger, in any repo.** The canonical `github/docs` source file `content/actions/reference/workflows-and-actions/events-that-trigger-workflows.md` contains **zero** occurrences of `projects_v2`, `projects_v2_item`, `projects_v2_status_update` or `sub_issues`. GitHub staff, on the record: *"this is not currently supported given projects live at the organization level rather than repository level where events that trigger workflows live, so we'd need to implement organization-level actions."* — [community #17405](https://github.com/orgs/community/discussions/17405)

Webhook availability (not Actions):

| Event | Activity types | Deliverable to |
|---|---|---|
| `issues` | opened, edited, deleted, transferred, pinned, unpinned, closed, reopened, assigned, unassigned, labeled, unlabeled, locked, unlocked, **milestoned**, **demilestoned**, **typed**, **untyped**, field_added, field_removed | repo, org, app — **and Actions** |
| `milestone` | created, closed, opened, edited, deleted | repo, org, app — **and Actions** |
| `sub_issues` | parent_issue_added/removed, sub_issue_added/removed | repo, org, app — **webhook only, not Actions** |
| `projects_v2` | closed, created, deleted, edited, reopened | **org webhook only** (public preview) |
| `projects_v2_item` | archived, converted, created, deleted, edited, reordered, restored | **org webhook only** (public preview) |
| `projects_v2_status_update` | created, deleted, edited | **org webhook only** (public preview) |

The documented workaround for board-to-Action is: org webhook, then an external receiver, then `repository_dispatch` back into a repo. wcpos already has the receiver shape (openclaw) but **no org webhook is currently configured for projects** — the only hooks on `wcpos/roadmap` are `discord.wcpos.com/api/github-webhook` (issues, pull_request) and `openclaw.wcpos.com/review/webhook` (PR events). (Org-level hooks could not be enumerated; my token lacks `admin:org_hook`.)

### Confirmed — the other triggers

- `repository_dispatch`: `event_type` up to 100 chars, `client_payload` up to 10 top-level properties, whole payload up to 65,535 characters.
- `workflow_dispatch`: up to 25 top-level inputs, up to 65,535-character payload.
- `schedule`: minimum interval **5 minutes**; "can be delayed during periods of high load" and queued runs "may be dropped" — avoid the top of the hour; **runs only from the default branch**; in a public repo a schedule is **auto-disabled after 60 days of no repository activity**; `@daily`/`@hourly` aliases unsupported.
- `issues` and `milestone` workflows only run if the workflow file exists on the default branch.

— all from [Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)

### Confirmed — App permissions

| Capability | Fine-grained permission |
|---|---|
| Create/close/edit milestones; set an issue's milestone; add/remove sub-issues; add/remove dependencies; set an issue's type | **Issues** (repository) — write |
| Read/write org Project items and field values | **Projects** (organization) — write |
| Create/update/delete org issue **types** | **Issue Types** (organization) — write |
| Read org issue types | **Issue Types** (organization) — read |

The legacy REST installation payload spells the org Projects one `organization_projects`. Classic `repository_projects` does **not** cover Projects v2 (Projects classic was sunset 2025-04-01).

**`GITHUB_TOKEN` cannot write org Projects.** No doc says this in exactly those words, but `GITHUB_TOKEN` is repo-scoped and the docs route you to "create a GitHub App" or a PAT for anything beyond repo scope. wcpos already proves the pattern in practice — see section 7.

**Installation tokens** are per-installation, expire after 1 hour, and can be scoped to a subset of repos at mint time. (The 1-hour figure is well-established but was not re-quoted from a freshly fetched page in this pass.)

### Confirmed — rate limits for a ~700-item board

**Primary:**
- REST, installation token: **5,000/hour** minimum; +50/hr per repo past 20 and +50/hr per org member past 20, capped at 12,500/hr; 15,000/hr for Enterprise Cloud orgs. `GITHUB_TOKEN` in Actions: 1,000/hour per repository.
- GraphQL: **5,000 points/hour**. Cost equals the requests needed to satisfy every connection at its `first`/`last`, divided by 100 and rounded, with a floor of 1. Measured on Project #4: a 100-item page with nested field values costs **1 point**.

**Secondary — this is what actually bites a bulk sync:**
- **100 concurrent requests** max, shared REST and GraphQL.
- REST **900 points/minute**; GraphQL **2,000 points/minute**. REST GET/HEAD/OPTIONS = 1 point, **POST/PATCH/PUT/DELETE = 5 points**; GraphQL query = 1, **mutation = 5**.
- **"No more than 80 content-generating requests per minute and no more than 500 per hour."**
- GitHub's own recommendation: serialize mutative requests and leave **at least 1 second between them**.

— [Rate limits for the REST API](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api), [Best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api), [GraphQL resource limitations](https://docs.github.com/en/graphql/overview/resource-limitations)

**What that means concretely.** Reading the whole board is about 8 GraphQL points. Writing it is the problem: at one write per item, a full-board rewrite is about 728 mutations, which at 5 secondary points each is 3,640 points — over the 900/min REST budget and, more sharply, well past **500 content-generating requests per hour** if any of those writes create content. A one-second serialized cadence means a full-board pass takes about 12 minutes and a full rewrite may need to span more than one hour. **The sync must be a diff, not a rewrite** — compute desired state, compare against a cheap full read, and write only the deltas.

### Unknown

- Whether "content-generating" covers project field-value updates or only issue/comment creation. GitHub does not enumerate the endpoint list. Assume it does.
- Org webhook inventory for `wcpos` (needs `admin:org_hook`).

---

## 7. What wcpos already has

### `wcpos-com` — reads only

`src/services/core/external/github-auth.ts` builds an Octokit with `createAppAuth` from `env.GITHUB_APP_ID` / `GITHUB_PRIVATE_KEY` / `GITHUB_INSTALLATION_ID`, all `.optional()` in `src/utils/env.ts`, and falls back to an **unauthenticated** Octokit with a warning if any is missing. It also exposes `getGitHubToken()`, minting an installation token for direct `fetch`. `GITHUB_PROJECT_NUMBER` and `GITHUB_WEBHOOK_SECRET` are separate optional vars; `src/services/core/external/github-roadmap.ts` pages Project #4 one hundred items at a time via `octokit.graphql`, and logs a warning and returns empty if `GITHUB_PROJECT_NUMBER` is unset.

The matching installation on the org is **`wcpos-website`** (app id `2797441`, installation `108044301`), permissions:

```
contents: read   metadata: read   organization_projects: read
```

**Read-only, and no `issues` permission at all.** The website App cannot set a milestone, cannot move a board item, cannot touch an issue. If the website is ever meant to write, it needs a different App — and it should not be the one that writes, since the sync should not live in a Next.js request path.

### `wcpos-openclaw/services/board-ops` — the writer

`src/github-gh.ts` shells out to the `gh` CLI (`execFile("gh", args)`) rather than using Octokit. Auth comes from an installation token minted by `agents/shared/scripts/github-token-refresh.ts` (signs an RS256 JWT from `GITHUB_PRIVATE_KEY_PATH`, exchanges it at `/app/installations/{id}/access_tokens`) and exported as `GH_TOKEN`/`GITHUB_TOKEN` by `services/subscription-runtime/board-ops-runner.ts`. `docker-compose.yml` defaults: `GITHUB_APP_ID=2860316`, `GITHUB_INSTALLATION_ID=109975729`, which is the **`wcpos-bot`** App:

```
actions:write  checks:write  contents:write  discussions:write  issues:write
members:read   metadata:read  organization_projects:write  repository_projects:write
pull_requests:write  statuses:write  workflows:write
```

**This App already has everything the sync needs** for milestones (Issues: write), sub-issues (Issues: write), dependencies (Issues: write) and board writes (org Projects: write). The one thing it lacks is **`issue_types`** (org) — needed only if we want to *manage* org issue types; *applying* a type to an issue is Issues: write and is already covered.

Operations `board-ops` performs today:
- GraphQL: `updateProjectV2ItemFieldValue` (Status single-select only), `archiveProjectV2Item`; paged project item reads; issue evidence via `closedByPullRequestsReferences` plus timeline.
- REST via `gh api`: add/remove labels (creating the label if 404), **set an issue's milestone by title** (`GET /repos/{r}/milestones?state=all`, match title, then `PATCH issues/{n} {milestone: number}`), clear a milestone (`{milestone: null}`), close an issue with a `state_reason`, post a comment.

It already does the title-to-number milestone resolution a cross-repo sync needs — that logic is reusable.

### Third App

**`wcpos-project-bot`** (app id `2781103`, installation `107553210`): `issues:read`, `metadata:read`, `organization_projects:write`, `pull_requests:write`. Used by the `Add to Roadmap` workflow, which exists and is **active in all five repos** (`.github/workflows/add-to-roadmap.yml`): on `issues: [opened]` it mints a token with `actions/create-github-app-token`, runs `actions/add-to-project` against `https://github.com/orgs/wcpos/projects/4`, then calls `updateProjectV2ItemFieldValue` with hardcoded ids (project `PVT_kwDOAuNIQc4ADana`, field `PVTSSF_lADOAuNIQc4ADanazgB9yM4`, option `809e15bf` = Triage).

**This is a working, in-production proof that a repo Action plus an App token can write org Project #4** — the write path the sync needs is already proven in this org, in five repos.

### Board facts worth carrying forward

- Project #4 is `PVT_kwDOAuNIQc4ADana`, **public** (`public: true`), so the community-reported "an App cannot see items in a *private* Projects v2 because bots cannot be project collaborators" limitation does **not** apply here.
- 728 items; 12 fields; no date field, no iteration field.
- Both default automations are **disabled**.
- Org issue types `Task`/`Bug`/`Feature` exist and are enabled; **no roadmap issue uses them**.

---

## 8. What this constrains

1. **Milestone replication is unavoidable and must be a first-class sync output.** There is no cross-repo milestone object, no linking mechanism, no GraphQL write path, and today's five copies already disagree on `due_on` by up to three months. The release issue must own title/description/`due_on`/state, and the sync must REST-PATCH each repo's copy — creating it where it is absent (`electron` has neither `v1.10.0` nor `v1.11.0`) and closing all five together at release.

2. **The board cannot drive itself, and nothing repo-side can react to it.** `projects_v2_item` reaches org webhooks only, never an Actions workflow; project workflows cannot be created or enabled through any API; and the two defaults that would have solved "closed to Done" are switched **off** on Project #4. So: turn those two on by hand — a two-click fix for the biggest visible symptom in #178 — and accept that any board-to-elsewhere reaction has to be an org webhook into an external receiver, or a `schedule`d reconciler, not a repo Action.

3. **Every write is single-item and secondary-limited, so the sync must be a diff.** Reading all 728 items costs about 8 GraphQL points; writing them costs about 728 mutations at 5 secondary points each, against 900 REST points/min and a hard **500 content-generating requests/hour**, with GitHub advising at least a second between mutations. There is no bulk mutation (REST's multi-field item PATCH is the only batching anywhere). A converged, delta-only sync fits comfortably; a rewrite-every-run sync does not.

Two smaller shapes worth designing around: the Roadmap view is unusable until the project gains a **date or iteration field** (milestone dates can only be vertical markers, and view configuration is UI-only, neither API-readable nor writable); and `wcpos-bot` already holds every permission the sync needs, so no new App is required unless we want to *manage* org issue types.

## 9. Open questions for the design work

- Do issue dependencies work cross-repo? Undocumented. One throwaway pair answers it.
- Does sub-issue Project/Milestone inheritance fire across repos, and does it re-apply when the parent's milestone changes later? Live evidence says the milestone does not carry; the sync should set it explicitly regardless.
- Does closing every sub-issue close the parent? Undocumented; assume no.
- Are project field-value updates "content-generating" for the 500/hour secondary limit?
- What org-level webhooks exist on `wcpos` today? Needs `admin:org_hook`.
