import { task } from "@trigger.dev/sdk";

import { runValidatedFoundationContract } from "../foundation";

export const foundationContractTask = task({
  id: "foundation-contract-v1",
  run: async (payload) => runValidatedFoundationContract(payload),
});
