# Postman Collection: Issue API

Import `Issue_API.postman_collection.json` and the Test Portal environment, set
`projectId` and `resultErrorId`, then run the login request. Its test script
stores the returned access and refresh tokens. All collection requests use
authenticated `/api/v2` routes.

## Category contract

Issue categories are required lowercase persisted values: `bug`, `infra`,
`performance`, `script`, or `other`. `Issue.category` is canonical for Issue and
Hypothesis display, so Issue create, update, reads, and `category` filtering use
that value.

`categorySummary` is also returned by Issue reads. Its `displayCategory` equals
the Issue category. Its distribution, `isMixed`, and `uncategorizedCount`
describe distinct linked Results across all confirmed and unconfirmed
assumptions. A Result is counted once per Issue. A summary is mixed only when at
least two supported effective Result categories are present; uncategorized
Results do not make it mixed.

Result and Dashboard analytics use
`analysisFeedbackCategory ?? analysisCategory`; human feedback overrides AI
analysis without changing the persisted Issue category.

## Collection workflow

1. Run **User Login (Get Tokens)**.
2. Run **Create Issue (Lowercase Category)** or use an existing `issueId`.
3. Read, filter, or update the Issue with the authenticated Issue requests.
4. For the Assign Issue modal, first retrieve **Get Modal Context**, then use
   **Create and Assign Confirmed Issue (Atomic)** or **Edit Confirmed Issue
   (Atomic)**.

The atomic create workflow creates the Issue, its confirmed assumption, and the
containing Result feedback together. The atomic edit synchronizes only that
confirmed assignment's containing Result feedback; it does not rewrite
historical Results linked to the Issue.

Generic assumption creation is not an assignment workflow and does not copy an
Issue category to a Result. Confirming an existing assumption does synchronize
its Issue category to Result feedback. Rejecting/unassigning it with
`isConfirmed: false` deletes the assumption while preserving existing feedback.
