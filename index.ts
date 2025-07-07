/*
記事をビルドするスクリプト
*/
import nunjucks from "nunjucks";
import _asciidoctor from 'asciidoctor';
import path from "path";
import * as fs from 'fs/promises';
import { globFiles } from "./src/glob";
import { pageTreeFactory } from "./src/pagemenuHtmlService";
import { generateImageHTMLs } from "./src/image-generator";

const mkdirp = require("mkdirp");

const asciidoctor = _asciidoctor();

// 各種設定値
const distDir = "dist";
const articleDir = "article";
const templateDir = "template";

const main = async () => {
  // 出力先の初期化
  await fs.rm(distDir, { recursive: true, force: true });
  await mkdirp(distDir);

  const pageTree = await pageTreeFactory(articleDir);
  const pageTreeHtml = await pageTree.createPageTreeHtml();

  // ページ間で共通的に使えるマクロ要素
  let commonAttribute = {
    "sidemenu": pageTreeHtml
  };

  // asciidoc事にページの出力を行う
  const articlePaths = await globFiles(path.join(articleDir, "**/*.adoc"));
  for(const asciidocPath of articlePaths) {
    await generatePageHtml(asciidocPath, commonAttribute);
  }

  const sitemapXml = pageTree.createSitemapXml();
  outputHtml(path.join(distDir, 'sitemap.xml'), sitemapXml);

  // 静的ファイルのコピー
  await staticFileCopy();

  await generateImageHTMLs("article/img/");
  console.log('Done.');
}

async function generatePageHtml(asciidocPath: string, commonAttribute: any) {
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
  let resultHtml = nunjucks.render(`${templateDir}/article.html`,  pageAttribute);

  // ファイルの出力先ディレクトリを確定する。入れ子構造になっている場合には入れ子先のディレクトリを指す
  const outputDir = path.join(distDir, path.relative(articleDir, path.dirname(asciidocPath)));
  const outputFilename = path.parse(asciidocPath).name + '.html';  // 元ファイル名にhtml拡張子をつける
  const outputPath = path.join(outputDir, outputFilename);

  // 結果の出力
  await outputHtml(outputPath, resultHtml);
}

/**
 * 静的ファイルのコピーを行う
 */
async function staticFileCopy() {
  try {
    await fs.copyFile(path.join(templateDir, 'favicon.ico'), path.join(distDir, 'favicon.ico'));
    await fs.copyFile(path.join(templateDir, 'style.css'), path.join(distDir, 'style.css'));
    await fs.copyFile(path.join(templateDir, 'logo.png'), path.join(distDir, 'logo.png'));
    await fs.copyFile(path.join(templateDir, 'sitemap.xsl'), path.join(distDir, 'sitemap.xsl'));
    await copyDir(path.join('article', 'img'), path.join(distDir, 'img'));
  }catch (err) {
    console.log(err);
    if(err instanceof Error) {
      console.log(err.stack);
    }
  }
}

/**
 * HTMLの出力を行う
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

export const copyDir = async (src: string, dest: string) => {
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
        await copyDir(srcPath, destPath);
      } else {
        // ファイルの場合、単純にコピーする
        await fs.copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    console.error(`Error while copying directory: ${error}`);
  }
};

main();
