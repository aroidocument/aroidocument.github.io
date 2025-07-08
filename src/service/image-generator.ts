import nunjucks from "nunjucks";
import path from "path";
import { OutputRepository } from "../repository-write/output-repository";
import { ImagePageRepository } from "../repository-read/image-repository";
import { ImagePage } from "../model/image-page";

const mkdirp = require("mkdirp");

export class ImagePageService {
  constructor(
    public templateDir: string,
    public outputRepository: OutputRepository,
    public imagePageRepository: ImagePageRepository
  ) {}

  /**
   * 画像向けHTMLを生成する
   */
  async service() {
    const imagePages = await this.imagePageRepository.fetchImagePages();
    for(const imagePage of imagePages) {
      await this.generateImageHTML(imagePage);
    }
  }

  /**
   * 画像向けのHTMLを作成
   */
  async generateImageHTML(imagePage: ImagePage): Promise<void> {
    const imagesrc= imagePage.config.imagesrc;
    const dirimage = path.dirname(imagesrc);
    const htmlFilename = path.parse(imagesrc).name + ".html";

    // テンプレートにパラメータを適応
    let resultHtml = nunjucks.render(`${this.templateDir}/image.html`,  imagePage.config);

    const distHTMLPath = path.join(dirimage, htmlFilename);
    await this.outputRepository.outputHtml(distHTMLPath, resultHtml);
    await this.outputRepository.copyFile(imagePage.sourcePath, imagesrc);
  }
}

