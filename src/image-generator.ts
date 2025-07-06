import * as fs from 'fs/promises';
import { globFiles } from "./glob";

export async function generateImage(imagePath: string) {
  const p = imagePath + "/*.jpg";
  const files = await globFiles(p);

  for(const file of files) {
    const tomlPath = file.replace(".jpg", ".yaml");

    try {
      await fs.stat(tomlPath);
      console.log(file)
    } catch {

    }
  }
}
