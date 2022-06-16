/** Github environment. */
export interface GithubEnv {

  /** Token. */
  readonly token: string | null;

  /** Repository path. */
  readonly repositoryPath: string | null;

  /** Event path. */
  readonly eventPath: string | null;
}
