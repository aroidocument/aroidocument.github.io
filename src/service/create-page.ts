/*
記事をビルドするスクリプト
*/
import nunjucks from "nunjucks";
import _asciidoctor, { Asciidoctor } from 'asciidoctor';
import path from "path";
import { pageTreeFactory } from "../model/page-tree";
import { globFiles } from "../glob";
import { OutputRepository } from "../repository-write/output-repository";

export class CraetePageService {
  constructor(
    public asciidoctor: Asciidoctor,
    public articleDir: string,
    public templateDir: string,
    public outputRepository: OutputRepository
) {}

  async service() {
    const pageTree = await pageTreeFactory(this.articleDir);
    const pageTreeHtml = await pageTree.createPageTreeHtml();

    // ページ間で共通的に使えるマクロ要素
    let commonAttribute = {
      "sidemenu": pageTreeHtml
    };

    // asciidoc事にページの出力を行う
    const articlePaths = await globFiles(path.join(this.articleDir, "**/*.adoc"));
    for(const asciidocPath of articlePaths) {
      await this.generateArticleHtml(asciidocPath, commonAttribute);
    }

    const sitemapXml = pageTree.createSitemapXml();
    await this.outputRepository.outputHtml('sitemap.xml', sitemapXml);
  }


  async generateArticleHtml(asciidocPath: string, commonAttribute: any) {
    const doc = this.asciidoctor.loadFile(asciidocPath);

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
    let resultHtml = nunjucks.render(`${this.templateDir}/article.html`,  pageAttribute);

    // ファイルの出力先ディレクトリを確定する。入れ子構造になっている場合には入れ子先のディレクトリを指す
    const outputDir = path.relative(this.articleDir, path.dirname(asciidocPath));
    const outputFilename = path.parse(asciidocPath).name + '.html';  // 元ファイル名にhtml拡張子をつける
    const outputPath = path.join(outputDir, outputFilename);

    // 結果の出力
    await this.outputRepository.outputHtml(outputPath, resultHtml);
  }

}



