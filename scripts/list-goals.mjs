import { readdir } from "node:fs/promises";
import { join } from "node:path";

const directory = new URL("../docs/goals/", import.meta.url);
const goals = (await readdir(directory)).filter((name) => name.endsWith(".md")).sort();
for (const goal of goals) {
  console.log(`${goal.slice(0, 2)}  ${goal.replace(/^[0-9]+-/, "").replace(/\.md$/, "")}`);
}
