import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "fetch gold prices",
  { minutes: 5 },
  internal.pricesActions.fetchPrices
);

export default crons;
