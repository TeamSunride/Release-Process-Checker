# Engineering Change Checker

A static, browser-only decision tree for engineering changes affecting schematics, PCB layout and associated deliverables. It generates a list of next actions from the engineer's answers. It does **not** store answers or make release decisions.

## Contents

- `index.html` — user interface and branching logic
- `workflows/electronics.json` — questions, branches and action definitions
- `.github/workflows/deploy.yml` — validates the JSON and deploys the site to GitHub Pages

## Publish in your GitHub organisation

1. Create a repository in your organisation, for example `engineering-release-checker`.
2. Add these files to the repository, preserving the directory structure.
3. In **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**.
4. Ensure Actions are enabled for the repository and that the workflow permissions allow Pages deployment. Organisation policies may restrict these settings.
5. Push the files to the `main` branch, or run **Actions → Deploy Engineering Change Checker → Run workflow**.
6. Open the deployment URL shown by the `github-pages` environment. The URL is usually shaped like `https://ORG.github.io/REPOSITORY/`.
7. Test at least one path that creates actions and one path that creates no actions before sharing it with the team.

For internal engineering procedures, confirm Pages visibility with your GitHub organisation administrators before publishing. Do not put credentials, tokens, secrets or confidential design data in this static site.

## Run locally

Because the browser fetches a JSON workflow file, serve the directory over HTTP rather than opening `index.html` as a `file://` URL.

With Python installed:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Edit the decision tree

Edit `workflows/electronics.json`.

### Add an action

Add a unique entry under `actions`:

```json
"update_test_report": {
  "title": "Update the test report",
  "detail": "Record the test impact and update the controlled report."
}
```

### Add a question

Every question node has:
- `question`: the prompt shown to the engineer
- `help`: optional explanatory text
- `options`: buttons shown to the user
- `next`: a mapping from each option's `value` to the next node (`to`) and optional `addActions` / `removeActions`

Example:

```json
"test_report_updated": {
  "question": "Has the test report been updated?",
  "options": [
    {"label": "Yes", "value": "yes"},
    {"label": "No", "value": "no"}
  ],
  "next": {
    "yes": {"to": "result"},
    "no": {"to": "result", "addActions": ["update_test_report"]}
  }
}
```

`start` must point to the first node. A result node has `"type": "result"`. Every branch must point to a valid node, and every action ID must exist under `actions`.

### Add guidance links

An action can include a `link` field. Use a stable URL to an approved internal procedure or a relevant repository document, and verify the destination is accessible to the intended users.

### Tailor before rollout

This starter workflow is illustrative, not an approved engineering procedure. Your design authority should define when schematic/PCB checks, BOM review, manufacturing outputs, tests, peer review and formal approval are applicable. Replace generic text and add project-specific branches before treating the result as a controlled checklist.

## Behaviour and limitations

- No database, analytics, cookies or server-side storage.
- Answers exist only in the current page session and are not transmitted.
- The Copy action list button copies the generated actions to the clipboard.
- It does not verify that files were actually changed, tests passed or an approval is genuine.
- It is not a release gate. Use your approved engineering process and, where appropriate, repository branch protection / required checks for enforcement.
- This static app uses no GitHub API token, so it can be hosted without exposing credentials.
