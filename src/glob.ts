import glob from "glob";

/**
 * ディレクトリをglobする
 */
export function globFiles(pattern: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(pattern, (err, files) => {
      if(err) {
        reject(err);
      }
      resolve(files);
    });
  });
  }
