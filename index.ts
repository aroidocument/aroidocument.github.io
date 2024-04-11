import nunjucks from "nunjucks";
import _asciidoctor from 'asciidoctor';
import path from "path";
import * as fs from 'fs/promises';
const mkdirp = require("mkdirp");
import { globFiles } from "./src/pageRepository";
import { createPagemenu as createPageTreeHtml } from "./src/pagemenuHtmlService";

const asciidoctor = _asciidoctor();

// 各種設定値
const distDir = "dist";
const articleDir = "article";
const templateDir = "template";

const main = async () => {
  // 出力先のリセット
  await fs.rm(distDir, { recursive: true, force: true });
  await mkdirp(distDir);

  const sidemenuDom = await createPageTreeHtml(articleDir);

  // ページ間で共通的に使えるマクロ要素
  let commonAttribute = {
    "sidemenu": sidemenuDom.window.document.body.innerHTML
  };

  // ページの出力を行う
  const articlePaths = await globFiles(path.join(articleDir, "**/*.adoc"));
  for(const asciidocPath of articlePaths) {
    const doc = asciidoctor.loadFile(asciidocPath);

    // 記事にマクロの適応を行う
    let htmlArticle = nunjucks.renderString(doc.convert(), {
      ...commonAttribute,
      //pagemenu: pageMenuDom.window.document.body.innerHTML
    });

    // ページ毎に定義されたマクロ要素
    const pageAttribute = {
      article: htmlArticle,
      title: doc.getDocumentTitle(),
      ...commonAttribute,
    }

    // ページ全体にマクロを適応する
    let resultHtml = nunjucks.render(`${templateDir}/index.html`,  pageAttribute);

    // ファイルの出力先ディレクトリを確定する。入れ子構造になっている場合には入れ子先のディレクトリを指す
    const outputDir = path.join(distDir, path.relative(articleDir, path.dirname(asciidocPath)));
    const outputFilename = path.parse(asciidocPath).name + '.html';  // 元ファイル名にhtml拡張子をつける
    const outputPath = path.join(outputDir, outputFilename);

    // 結果の出力
    await outputHtml(outputPath, resultHtml);
  }

  // faviconの設定
  try {
    await fs.copyFile(path.join(templateDir, 'favicon.ico'), path.join(distDir, 'favicon.ico'));
    await fs.copyFile(path.join(templateDir, 'style.css'), path.join(distDir, 'style.css'));
    await fs.copyFile(path.join(templateDir, 'logo.png'), path.join(distDir, 'logo.png'));
    console.log('Done.');
  }catch (err) {
    console.log(err);
    if(err instanceof Error) {
      console.log(err.stack);
    }
  }
}

main()

/**
 * HTMLの出力を行う
 * TODO: outputPathからoutputDirを計算するようにした方が良い
 */
async function outputHtml(outputPath: string, htmlString: string) {
  // 書き出し先ディレクトリの作成
  const outputDir = path.dirname(outputPath);
  await mkdirp(outputDir);

  // htmlの出力
  try {
    await fs.writeFile(outputPath, htmlString);
    console.log('success:', outputPath);
  } catch(err) {
    console.log('error:', outputPath); throw err;
  }
}
