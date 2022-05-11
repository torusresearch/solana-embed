import * as path from "path"
import * as fs from "fs"

export default async function teardown() {
  const storageStatePath = path.resolve(__dirname, "_artifacts", `state-testing.json`);
  if (fs.existsSync(storageStatePath)) {
    fs.unlinkSync(storageStatePath);
    return true;
  }
  return false;
}