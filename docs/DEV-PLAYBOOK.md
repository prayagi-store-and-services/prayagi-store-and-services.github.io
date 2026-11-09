# Dev/agent playbook


## Bug/regression protocol: git bisect (owner rule, 9 Nov 2026)

For any bug or regression with a known-good past state, use `git bisect` to find the exact culprit commit before fixing. Record the culprit commit hash in the fix report/PR body. Bisect checkouts are local and read-only in effect: reset (`git bisect reset`) after the run. If bisect is not possible (no known-good state, unbuildable history), say so explicitly in the report instead of skipping silently.
