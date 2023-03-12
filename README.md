# Continue as New + XState

This example is adapted from Temporal's official sample for `continueAsNew` API used with TypeScript SDK. See the official documentation: https://github.com/temporalio/samples-typescript/tree/main/continue-as-new.

To use XState with long-running workflows, we need to be able to call `continueAsNew` regularly. But an error is thrown when we `continueAsNew` while a timer was active in the machine.

![Temporal throwing a Fatal("Missing associated machine for Timer(0)") error](docs/CleanShot%202023-03-13%20at%2000.16.12@2x.png)

It seems the issue is that when the machine will be rehydrated, an action will be triggered to cancel the last timer. This action comes the last state of the machine, just before `continueAsNew` is called. When rehydrating, `clearTimeout` will be called with an undefined timeout id, leading to the aforementioned error.

![An action to cancel the last timer will be called when rehydrating](docs/CleanShot%202023-03-13%20at%2000.10.54@2x.png)

I figured out that a solution is to don't call `clearTimeout` when the timeout id is empty. Seems hacky, but prevents a fatal error from being thrown.

![Do not call clearTimeout when timeout id is undefined](docs/CleanShot%202023-03-13%20at%2000.23.58@2x.png)
