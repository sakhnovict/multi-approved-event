import { WebhookPayload } from "@actions/github/lib/interfaces";

/** Github payload. */
export type GithubPayload = WebhookPayload & {

  /** Review. */
  readonly review: {

    /** State. */
    readonly state: string;
  }
}
