import { task } from "@trigger.dev/sdk";

import { runFoundationContract } from "../foundation";

export const foundationContractTask = task({
  id: "foundation-contract-v1",
  run: runFoundationContract,
});
