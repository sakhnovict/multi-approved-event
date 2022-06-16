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
