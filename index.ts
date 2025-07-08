/*
記事をビルドするスクリプト
*/
import path from "path";
import _asciidoctor from 'asciidoctor';
import * as fs from 'fs/promises';
import { CraetePageService } from "./src/service/create-page";
import { OutputRepository } from './src/repository-write/output-repository';
import { ImagePageService } from "./src/service/image-generator";
import { ImagePageRepository } from "./src/repository-read/image-repository";

const mkdirp = require("mkdirp");

const asciidoctor = _asciidoctor();

// 各種設定値
const distDir = "dist";
const articleDir = "article";
const templateDir = "template";

const main = async () => {
  // 出力先の初期化

  console.log("clear dist dir.")
  await fs.rm(distDir, { recursive: true, force: true });
  await mkdirp(distDir);

  const outputRepository = new OutputRepository(distDir);

  console.log("Create Article pages.");
  const createPageService = new CraetePageService(asciidoctor, articleDir, templateDir, outputRepository);
  await createPageService.service();

  console.log("Create Image pages.");
  const imagePageRepository = new ImagePageRepository(articleDir);
  const imagePageService = new ImagePageService(templateDir, outputRepository, imagePageRepository);
  await imagePageService.service();

  console.log("Copy Static File.");
  try {
    await outputRepository.copyFile(path.join(templateDir, 'favicon.ico'), 'favicon.ico');
    await outputRepository.copyFile(path.join(templateDir, 'style.css'), 'style.css');
    await outputRepository.copyFile(path.join(templateDir, 'logo.png'), 'logo.png');
    await outputRepository.copyFile(path.join(templateDir, 'sitemap.xsl'), 'sitemap.xsl');
  }catch (err) {
    console.log(err);
    if(err instanceof Error) {
      console.log(err.stack);
    }
  }
  console.log('Done.');
}

main();
