# Jons BK: setup guide

## A. Get the files into the repo (phone friendly)
1. Open github.com/gardefjord/jons-bk- in the browser (desktop mode helps).
2. Add file > Upload files. Upload `jons-bk.html` and `data.json`.
3. Workflow files must sit in `.github/workflows/`. Use Add file > Create new file,
   type `.github/workflows/deploy.yml` as the name (typing the slashes makes folders),
   paste the contents, commit. Repeat for `probe.yml`.
4. Same for `scripts/update.mjs` and `scripts/probe.mjs`.
   (Easier: install the Claude GitHub App and ask me to push. See B.)

## B. Or let Claude push
Install https://github.com/apps/claude/installations/select_target on the repo,
then tell Claude "push". Done in one step.

## C. Turn on the site
Repo > Settings > Pages > Source: **GitHub Actions**.

## D. Add the login (never paste it in chat or code)
Repo > Settings > Secrets and variables > Actions > New repository secret:
`KORPEN_USER` and `KORPEN_PASS`.

## E. Find the Zoezi data
Actions tab > "Probe Zoezi" > Run workflow. When done, open the run, download the
`probe-result` artifact (or read the log) and send it to Claude. If it says CAPTCHA
or two-factor, automation is not possible: edit `data.json` by hand on GitHub instead.

## F. Go live
Actions > "Update data and deploy" > Run workflow. Your site appears at
https://gardefjord.github.io/jons-bk-/
