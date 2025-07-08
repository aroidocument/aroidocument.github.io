import path from "path";
import * as fs from 'fs/promises';

const mkdirp = require("mkdirp");

export class OutputRepository {
  constructor(public outputBaseDir: string) {}

  async outputHtml(outputRelativePath: string, htmlString: string) {
    const outputFullPath = path.join(this.outputBaseDir, outputRelativePath);

    // 書き出し先ディレクトリの作成
    const outputDir = path.dirname(outputFullPath);
    await mkdirp(outputDir);

    // htmlの出力
    try {
      await fs.writeFile(outputFullPath, htmlString);
      console.log('success:', outputFullPath);
    } catch(err) {
      console.log('error:', outputFullPath); throw err;
    }
  }

  async copyFile(src: string, destPath: string) {
    const dest = path.join(this.outputBaseDir, destPath);
    await fs.copyFile(src, dest);
  }

  async copyDir(src: string, destPath: string) {
    const dest = path.join(this.outputBaseDir, destPath);

    try {
      // コピー先ディレクトリが存在しない場合、作成する
      await fs.mkdir(dest, { recursive: true });

      // コピー元のファイル・ディレクトリ一覧を取得する
      const files = await fs.readdir(src, { withFileTypes: true });

      // 各エントリに対してコピー操作を実行する
      for (const file of files) {
        const srcPath = path.join(src, file.name);
        const destPath = path.join(dest, file.name);

        if (file.isDirectory()) {
          // ディレクトリの場合、再帰的にコピーする
          await this.copyDir(srcPath, destPath);
        } else {
          // ファイルの場合、単純にコピーする
          await fs.copyFile(srcPath, destPath);
        }
      }
    } catch (error) {
      console.error(`Error while copying directory: ${error}`);
    }
  }
}


