import { Client } from '@temporalio/client';
import { loopingWorkflow } from './workflows';
import { setTimeout } from 'node:timers/promises'

async function run() {
  const client = new Client();

  const handle = await client.workflow.start(loopingWorkflow, { taskQueue: 'continue-as-new', workflowId: 'loop-0' });

  await setTimeout(8_000)

  await handle.signal('updateMachine')
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
