# Pull Request Details

Action to get details related to a pull request which are not available all the events published to trigger workflows

## Inputs

### `approvalsCount`

The number of unique approvals to run event with `isApproved` = `true`.
Field is **optional**. Default value is `1`.

### `onlyEqual`

Set `isApproved` = `true` only when the number of approvals `=` `approvalsCount`, not `>=`.

## Outputs

### `isApproved`

PR is approved or not `approvalsCount` times. If approved, then `isApproved` = `true`.

## Usage

    on: pull_request_review
    types: [submitted]
    name: Pull Request Details Example Job
    jobs:
      onApprovedSubmit:
        if: github.event.review.state == 'approved'
        runs-on: ubuntu-latest
        steps:
        - name: pull-request-details
        - uses: ihtkas/pull-request-details@release/v1
          id: approved
          with:
            approvalsCount: '1'
            onlyEqual: 'true
          env:
            GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        - run: echo "Approved 1 times."
          if: steps.approved.outputs.isApproved == 'true'
