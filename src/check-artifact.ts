import {getOctokit} from '@actions/github'
import {retry} from '@octokit/plugin-retry'
import * as core from '@actions/core'
import {OctokitOptions} from '@octokit/core/dist-types/types'
import {defaults as defaultGitHubOptions} from '@actions/github/lib/utils'
import {requestLog} from '@octokit/plugin-request-log'
import {getRetryOptions} from './retry-options'
import {Inputs, Outputs} from './constants'

type Artifact = {
  /**
   * The name of the artifact
   */
  name: string
  /**
   * The ID of the artifact
   */
  id: number
  /**
   * The size of the artifact in bytes
   */
  size: number
  /**
   * WorkflowRun when the artifact was created
   */
  workflowRunId: number
  /**
   * The time when the artifact was created
   */
  createdAt?: Date
}

async function checkArtifact(
  artifactName: string,
  repositoryOwner: string,
  repositoryName: string,
  token: string
): Promise<Artifact | undefined> {
  const [retryOpts, requestOpts] = getRetryOptions(defaultGitHubOptions)

  const opts: OctokitOptions = {
    log: undefined,
    userAgent: 'check-artifact',
    previews: undefined,
    retry: retryOpts,
    request: requestOpts
  }

  const github = getOctokit(token, opts, retry, requestLog)

  const getArtifactResp = await github.request(
    'GET /repos/{owner}/{repo}/actions/artifacts{?name}',
    {
      owner: repositoryOwner,
      repo: repositoryName,
      name: artifactName
    }
  )

  if (getArtifactResp.status !== 200) {
    throw new Error(
      `Invalid response from GitHub API: ${getArtifactResp.status} (${getArtifactResp?.headers?.['x-github-request-id']})`
    )
  }

  if (getArtifactResp.data.artifacts.length === 0) {
    return
  }

  let artifact = getArtifactResp.data.artifacts[0]
  if (getArtifactResp.data.artifacts.length > 1) {
    artifact = getArtifactResp.data.artifacts.sort((a, b) => b.id - a.id)[0]
    core.debug(
      `More than one artifact found for a single name, returning newest (id: ${artifact.id})`
    )
  }

  return {
    name: artifact.name,
    id: artifact.id,
    size: artifact.size_in_bytes,
    workflowRunId: artifact.workflow_run?.id,
    createdAt: artifact.created_at ? new Date(artifact.created_at) : undefined
  }
}

async function run(): Promise<void> {
  const inputs = {
    name: core.getInput(Inputs.Name, {required: false}),
    token: core.getInput(Inputs.GitHubToken, {required: false}),
    repository: core.getInput(Inputs.Repository, {required: false})
  }
  const [repositoryOwner, repositoryName] = inputs.repository.split('/')
  if (!repositoryOwner || !repositoryName) {
    throw new Error(
      `Invalid repository: '${inputs.repository}'. Must be in format owner/repo`
    )
  }

  core.info(`Checking artifact`)

  const targetArtifact = await checkArtifact(
    inputs.name,
    repositoryOwner,
    repositoryName,
    inputs.token
  )

  if (targetArtifact) {
    core.debug(
      `Found named artifact '${inputs.name}' (ID: ${targetArtifact.id}, Size: ${targetArtifact.size}, RunID: ${targetArtifact.workflowRunId})`
    )
  }

  core.setOutput(Outputs.Found, !!targetArtifact)
  core.setOutput(Outputs.RunId, targetArtifact?.workflowRunId)
  core.info('Checked artifact successfully')
}

run().catch(err => core.setFailed(`Unable to check artifact: ${err.message}`))
