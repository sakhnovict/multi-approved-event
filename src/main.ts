import {
  exportVariable,
  getInput,
  info,
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
    const action = payload.action;
    const state = payload.review.state;

    if (!payload.pull_request) {
      setFailed("This event doesn't contain PR");
    }

    if (isSubmittedAction(action, state)) {
      const approvalsCount = getApprovalsCount();
      const onlyEqual = getInput('onlyEqual').toLocaleLowerCase() === 'true';
      const octokit = new Octokit({ auth: `token ${githubEnv.token}`});
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
          console.log('onlyEqual: ', onlyEqual);
          console.log('users: ', users);
          console.log('approvalsCount === users.size: ', approvalsCount === users.size);
          console.log('approvalsCount <= users.size: ', approvalsCount <= users.size);
          if (condition) {
            setOutput('isApproved', 'true');
            exportVariable('isApproved', 'true');
          } else {
            setOutput('isApproved', 'false');
            exportVariable('isApproved', 'false');
          }
          break;
        }
      }
    } else {
      info(`${process.env.GITHUB_EVENT_NAME}/${action}/${state} doesn't support.`);
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
  const raw = await readFile(path, { encoding: 'utf-8'});
  const payload = JSON.parse(raw) as GithubPayload;
  return payload;
}

/**
 * Check that action is submitted,
 * @param action Action.
 * @param state Review state.
 */
function isSubmittedAction(
  action: string | undefined,
  state: string | undefined,
): boolean {
  return (
    action === 'submitted' &&
    state === 'approved'
  );
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
