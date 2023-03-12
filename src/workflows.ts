import { continueAsNew, defineQuery, defineSignal, setHandler, Trigger } from '@temporalio/workflow';
import { assign, createMachine, interpret, StateFrom } from 'xstate';

const userMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QFVZgE4DoCGBjALgJYBuYAxAB6z7b5g4Bmd6AFAEwAMXAlGahjgIkwAbQ4BdRKAAOAe1iEisgHZSQFRGwBsbTABYAHAGYDOvXrZGtARi0AaEAE9NNzNusB2LR44e2ATgMDPQBfEId+LEJlPCJSSmpaemwmDHYuDl5IzGjY4TFJJBA5BSVVIo0ENg8jTBMa4P8tfz0OaodnBAt9Xz0rUwN-DiG9AFYw8JBlWQg4NUi1EsVCFTVKgFp7J0R1scwOQeHRj2DqrT1-MIi0LDzSRfll1YrECw7Ea2s9TFGtIyGmkY+oEjEYriBsrkhPciksymtEP8OJhrP5rBxQWxPqNRoN3ghrKDMP4TkYOKN-EY2HoPHovhMQkA */
    id: 'User',
    initial: 'off',
    states: {
      on: {
        entry: ['logOn'],
        after: {
          2_000: {
            target: 'off',
            actions: ['incrementCount'],
          },
        },
      },
      off: {
        entry: ['logOff'],
        after: {
          2_000: {
            target: 'on',
            actions: ['incrementCount'],
          },
        },
      },
    },
    context: { count: 0 },
    predictableActionArguments: true,
    preserveActionOrder: true,
  },
  {
    actions: {
      logOff: ({ count }) => console.log('become off', count),
      logOn: ({ count }) => console.log('become on', count),
      incrementCount: assign({ count: ({ count }) => count + 1 }),
    },
  }
);

export const stateQuery = defineQuery('state');
export const updateMachineSignal = defineSignal<any>('updateMachine');

export async function loopingWorkflow(
  initialState?: StateFrom<typeof userMachine>
): Promise<StateFrom<typeof userMachine>> {
  const machine = userMachine;

  let state = initialState ?? machine.initialState;
  console.log('will start from state', state);

  const service = interpret(machine, {
    clock: {
      setTimeout(...args) {
        console.log('calling setTimeout', ...args);

        return setTimeout(...args);
      },
      clearTimeout(timerId) {
        console.log('calling clearTimeout', timerId);

        /**
         * When rehydrating the machine, an action that should cancel the timer that
         * was still pending when the machine was stopped will still be triggered,
         * leading to `clearTimeout` being called with a timeoutId equal to `undefined`.
         * 
         * We should not call clearTimeout in this case.
         * 
         * The action: `{ type: 'xstate.cancel', sendId: 'xstate.after(2000)#User.off' }`
         */
        if (timerId === undefined) {
          return undefined;
        }

        return clearTimeout(timerId);
      },
    },
  });

  setHandler(stateQuery, () => state);

  service.onTransition((updatedState) => {
    state = updatedState;
  });

  service.start(state);

  const shouldContinueAsNew = new Trigger<void>();

  setHandler(updateMachineSignal, () => {
    shouldContinueAsNew.resolve();
  });

  await Promise.race([
    new Promise((resolve) => {
      service.onDone(resolve);
    }),
    shouldContinueAsNew.then(() => {
      console.log('continue as new');

      return continueAsNew(state);
    }),
  ]);

  return state;
}
