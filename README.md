# Release Process - Interactive Quiz / Checklist

A static, browser-only decision tree for checking you've done the release process properly. It does **not** store answers or make release decisions.

## Contents

- `index.html` — user interface and branching logic
- `workflows/electronics.json` — questions, branches and action definitions
- `.github/workflows/deploy.yml` — validates the JSON and deploys the site to GitHub Pages

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
