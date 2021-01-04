# Summary

Gets information for all closed PRs historically for all repositories in an organisation
Writes the closed PRs into a timed stamped csv file.

## Requirements

Two env vars are required:
`ORGANISATION_REPOS_URL`
`GITHUB_TOKEN`

Example:
`ORGANISATION_REPOS_URL=https://api.github.com/orgs/{replace_with_your_org_name}/repos`

## Run

`node git-repo-commit-stat.js`
