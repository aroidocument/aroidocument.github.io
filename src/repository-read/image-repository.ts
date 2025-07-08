import nunjucks from "nunjucks";
import * as fs from 'fs/promises';
import { globFiles } from "../glob";
import yaml from "js-yaml";
import path from "path";
import { OutputRepository } from "../repository-write/output-repository";
import { ImagePage } from "../model/image-page";

const mkdirp = require("mkdirp");

export class ImagePageRepository {
  constructor(
    public articleDir: string
  ) {}

  /**
   * 画像向けHTMLを生成する
   */
  async fetchImagePages() {
    const sourceImagePaths = await globFiles(this.articleDir + "/**/*.{jpg,jpeg,png}");

    const imagePages: ImagePage[] = [];
    for(const sourceImagePath of sourceImagePaths) {
      const page = await this.imagePage(sourceImagePath);
      imagePages.push(page);
    }
    return imagePages;
  }

  async imagePage(sourceImagePath: string) {
    const pathdir = path.dirname(sourceImagePath);
    const filename = path.parse(path.basename(sourceImagePath)).name +  ".yaml";
    const yamlPath = path.join(pathdir, filename);

    let imageAttr: Record<string, any> = {};
    try {
      await fs.stat(yamlPath);
      const yamlContent = await fs.readFile(yamlPath, "utf8");
      imageAttr = yaml.load(yamlContent) as Record<string, any>;
    } catch {}

    // articleを除いたurl上のパスを作成
    const imagesrc = path.relative(this.articleDir, sourceImagePath);

    const pageAttribute = {
      title: imageAttr["title"],
      imagesrc: path.join("/", imagesrc),
      author: imageAttr["author"],
      description: this.serializeHtml(imageAttr["description"])
    }
    return new ImagePage(pageAttribute, sourceImagePath);
  }

  serializeHtml(s: string) {
    if(s == undefined) return ""
    return s.trim().replace("\n", "<br>\n")
  }
}
