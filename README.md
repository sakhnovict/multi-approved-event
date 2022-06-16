# Multi-Approved-Event-Action

An action provides an event after a certain number of approvals.

## Inputs

### `approvalsCount`

The number of unique approvals to run event with `isApproved` = `true`.
Field is **optional**. Default value is `1`.

## Outputs

### `isApproved`

PR is approved or not `approvalsCount` times. If approved, then `isApproved` = `true`.

## Usage

    on: pull_request_review
    types: [submitted]
    name: Multi Approved Example Job
    jobs:
      onSubmit:
        runs-on: ubuntu-latest
        steps:
        - name: multi-approved-event
        - uses: sakhnovict/multi-approved-event-action@1.0.0
          id: approved
          with:
            approvalsCount: '2'
          env:
            GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        - run: echo "Approved 2 times."
          if: steps.approved.outputs.isApproved == 'true'
