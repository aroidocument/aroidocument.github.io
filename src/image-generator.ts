import * as fs from 'fs/promises';
import { globFiles } from "./glob";

export async function generateImage(imagePath: string) {
  const files = await globFiles(imagePath + "**/*.{jpg,jpeg,png}");
  console.log("files:", files);

  for(const file of files) {
    const tomlPath = file.replace(".jpg", ".yaml");

    try {
      await fs.stat(tomlPath);
      console.log(file)
    } catch {
      console.log("not found:", tomlPath);
      console.log(file)
    }
  }
}
