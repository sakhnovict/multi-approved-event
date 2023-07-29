import {
  exportVariable,
  getInput,
  setFailed,
  setOutput,
} from '@actions/core';
import { readFile } from 'fs/promises';
import { flatten, map } from 'streaming-iterables';
import { GithubEnv } from './types/github-env';
import { GithubPayload } from './types/github-payload';
import { NonNullableProperties } from './types/non-nullable-propeties';
import Octokit from '@octokit/rest';

async function run(): Promise<void> {
  try {
    const token = process.env.GITHUB_TOKEN ?? null;
    const repositoryPath = process.env.GITHUB_REPOSITORY ?? null;
    const eventPath = process.env.GITHUB_EVENT_PATH ?? null;
    const githubEnv: GithubEnv = { token, repositoryPath, eventPath };

    if (!isExistGithubEnvironmentVariables(githubEnv)) {
      setFailed("GITHUB_TOKEN, GITHUB_REPOSITORY or GITHUB_EVENT doesn't set");
      return;
    }

    const payload = await getGithubPayload(githubEnv.eventPath);
  

    if (!payload.pull_request) {
      setFailed("This event doesn't contain PR");
    }

    const approvalsCount = getApprovalsCount();
    const onlyEqual = getInput('onlyEqual').toLocaleLowerCase() === 'true';
    const octokit = new Octokit({ auth: `token ${githubEnv.token}` });
    const [owner, repo] = githubEnv.repositoryPath.split('/');
    const options = octokit.pulls.listReviews.endpoint.merge({
      owner,
      repo,
      pull_number: payload.pull_request?.number
    });
    const list = map((
      response: Octokit.Response<Octokit.PullsListResponse>
    ) => response.data, octokit.paginate.iterator(options));

    const users = new Set<string>();
    for await (const review of flatten(list)) {
      if (review.state === 'APPROVED') {
        users.add(review.user.login);
        const condition = onlyEqual ? approvalsCount === users.size : approvalsCount <= users.size;

        log(review.user.login, users);

        if (condition) {
          setOutput('isApproved', 'true');
          exportVariable('isApproved', 'true');
        } else {
          setOutput('isApproved', 'false');
          exportVariable('isApproved', 'false');
        }
      }
    }

  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message);
    }
  }
}

run();


/**
 * Check is github env variables exist.
 * @param token Token.
 * @param repositoryPath Repository path.
 * @param eventPath Event path.
 */
function isExistGithubEnvironmentVariables(
  githubEnv: GithubEnv
): githubEnv is NonNullableProperties<GithubEnv, 'token' | 'eventPath' | 'repositoryPath'> {
  const { token, repositoryPath, eventPath } = githubEnv;
  return (
    token !== null &&
    repositoryPath !== null &&
    eventPath !== null
  );
}

/**
 * Get github payload.
 * @param path Event path.
 */
async function getGithubPayload(path: string): Promise<GithubPayload> {
  const raw = await readFile(path, { encoding: 'utf-8' });
  const payload = JSON.parse(raw) as GithubPayload;
  return payload;
}


function getApprovalsCount(): number {
  const DEFAULT_APPROVALS_COUNT = 1;
  const candidate = getInput('approvalsCount');

  if (/\d{1,2}/.test(candidate)) {
    const approvalsCount = Number.parseInt(candidate, 10);
    if (approvalsCount > 0) {
      return approvalsCount;
    }
  }
  return DEFAULT_APPROVALS_COUNT;
}

function log(userLogin: string, users: Set<string>): void {
  console.group();
  console.log('Current reviewer: ', userLogin);
  console.log('Unique approvals reviewers: ', users);
  console.groupEnd();
}
