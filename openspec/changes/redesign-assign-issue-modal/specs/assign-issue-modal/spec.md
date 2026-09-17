## ADDED Requirements

### Requirement: Unified modal entry points
The client SHALL open the same Assign Issue modal from a result error message, the add-issue control, and a confirmed-issue pill. The modal SHALL open in assignment mode for unconfirmed errors and edit mode for a confirmed assignment.

#### Scenario: Open from an unassigned error
- **WHEN** a user selects an error message or add-issue control for an unassigned result error
- **THEN** the modal opens for that result error in assignment mode

#### Scenario: Open a confirmed assignment
- **WHEN** a user selects an existing confirmed-issue pill
- **THEN** the modal opens with the assigned issue populated in edit mode

### Requirement: Two-pane result and issue layout
The modal SHALL present error context in a left pane and issue assignment controls in a right pane, with a single title row containing result number, attempt, start time, duration, and close control. It SHALL use the client's existing design-system components, typography, theme tokens, and interaction patterns rather than copying visual styling from the HTML prototype, and SHALL remain usable at supported viewport sizes and in light and dark themes.

#### Scenario: Render desktop modal
- **WHEN** modal context finishes loading on a desktop viewport
- **THEN** both panes and the single-line result title are visible without opening another dialog or drawer

#### Scenario: Render supported themes
- **WHEN** the application theme is light or dark
- **THEN** all modal states, controls, code content, badges, and popovers meet the application's contrast and focus conventions

#### Scenario: Apply application styling
- **WHEN** a prototype structure requires a button, field, badge, tab, tooltip, popover, dialog region, or code section
- **THEN** the client uses or extends the corresponding existing application component and theme pattern instead of reproducing the prototype's element CSS

### Requirement: Error detail tabs
The left pane SHALL provide Error, Logs, Snippet, and Test Case icon tabs. Error SHALL expose message, call log, and call stack with a Copy action for each present section; the other tabs SHALL render supplied context or an explicit empty state.

#### Scenario: Copy error detail
- **WHEN** a user invokes Copy for a present error section
- **THEN** the section's complete text is copied without changing modal state

#### Scenario: Optional context is absent
- **WHEN** logs, a source snippet, or a generated test case is absent
- **THEN** its tab renders an informative empty state and the remainder of the modal stays functional

#### Scenario: Generated test case is absent
- **WHEN** no generated test case is available
- **THEN** the Test Case tab displays "A generated test case will appear here once available."

### Requirement: Explicit assignment state machine
The right pane SHALL represent opening search, AI categorising, unassigned, algorithm suggestion, AI suggestion, no similar issue, categorisation error, similarity error, and confirmed edit as explicit mutually exclusive states. Each state SHALL show the copy, enabled fields, and footer actions defined by the product prototype.

#### Scenario: Initial similarity search
- **WHEN** an unassigned modal opens with context available
- **THEN** it enters opening search and displays "Looking for issues that match this error…" until the request resolves

#### Scenario: Algorithm suggestion
- **WHEN** similarity search returns a match
- **THEN** the form shows the issue, a percent-match badge, affected-test count, and Reject and Confirm actions without treating it as assigned

#### Scenario: No match
- **WHEN** similarity search completes without a qualifying match
- **THEN** the modal permits manual entry and offers Categorise with AI

#### Scenario: Similarity request fails
- **WHEN** similarity search fails
- **THEN** the form remains usable, shows the specified failure message, supports name search, and offers Retry

#### Scenario: AI categorisation fails
- **WHEN** AI issue drafting fails
- **THEN** manual fields retain their usable values and the modal offers Retry

### Requirement: Issue draft and assignment actions
The right pane SHALL support category selection, issue name, description, AI drafting, per-field polish with Undo and Retry, and state-appropriate create, confirm, update, unassign, reject, cancel, and retry actions. Successful mutations SHALL refresh the affected Results and Issues views.

#### Scenario: Confirm algorithm match
- **WHEN** a user confirms an algorithm-suggested issue
- **THEN** the result error becomes confirmed against that issue and the modal enters confirmed edit mode

#### Scenario: Accept AI draft
- **WHEN** AI categorisation succeeds
- **THEN** category, name, and description are populated as an unconfirmed editable suggestion

#### Scenario: Update confirmed issue
- **WHEN** a user changes valid fields in confirmed edit mode and selects Update
- **THEN** the issue is updated and visible result and issue caches reflect the saved values

#### Scenario: Unassign confirmed issue
- **WHEN** a user selects Unassign in confirmed edit mode and confirms the action
- **THEN** the result error is no longer confirmed against the issue while the issue itself remains available

### Requirement: Explain suggestion provenance
The modal SHALL provide a similarity-score explainer and an AI-provenance explainer using the final prototype copy. The similarity explainer SHALL state that the score is similarity rather than probability and name message text, call-stack shape, and spec file as signals. The AI explainer SHALL enumerate transmitted fields and category priority Environment, Performance, Script, Bug, Other.

#### Scenario: Inspect similarity score
- **WHEN** a user opens "What does {score}% mean?"
- **THEN** the modal explains the three comparison signals and warns that flaky and timeout failures can look alike

#### Scenario: Inspect AI provenance
- **WHEN** a user opens "How this suggestion was generated"
- **THEN** the modal identifies all data sent to the model and the category priority order

### Requirement: Retire fragmented flows
After modal AI categorisation is available, the client SHALL remove `ManageIssueDrawer`, the former standalone Results error dialog, and the inline Categorise with AI button and its `POST /v2/result-errors/analyze` wiring from Results.

#### Scenario: View a failed result
- **WHEN** a failed result with errors renders after migration
- **THEN** issue assignment and AI issue drafting are available only through the unified modal and no inline AI categorisation control is shown
