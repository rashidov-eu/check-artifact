## Check artifact

Check whether artifact with the given name was uploaded and return its information

## Usage

### Inputs

```yaml
- uses: rashidov-eu/check-artifact@v2
  with:
    # Name of the artifact to check
    # Required.
    name:

    # The GitHub token used to authenticate with the GitHub API.
    # Required.
    github-token:

    # The repository owner and the repository name joined together by "/".
    # If not specified, this is the repository where artifact will be searched for.
    # Optional. Default is ${{ github.repository }}
    repository:
```

### Outputs

| Name | Description | Example |
| - | - | - |
| `id` | Id of the artifact found. If not found, this will be empty string | `1234` |
| `run-id` | Id of the workflow run where the given artifact was uploaded from. | `56` |

### Examples

```yaml
steps:
- uses: rashidov-eu/check-artifact@v2
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }} # token with actions:read permissions on target repo
    name: artifact-name
  id: artifact

- name: Download checked artifact if found
  if: ${{ steps.artifact.outputs.id != '' }}
  uses: actions/download-artifact@v4
  with:
    name: artifact-name
    path: path/to/artifacts
    github-token: ${{ secrets.GITHUB_TOKEN }}
    run-id: ${{ steps.artifact.outputs.run-id }}
```
