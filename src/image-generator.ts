import nunjucks from "nunjucks";
import * as fs from 'fs/promises';
import { globFiles } from "./glob";
import yaml from "js-yaml";
import path from "path";

const mkdirp = require("mkdirp");

const templateDir = "template";
const distDir = "dist";

/**
 * 画像向けHTMLを生成する
 */
export async function generateImageHTMLs(imagePath: string) {
  const sourceImagePaths = await globFiles(imagePath + "**/*.{jpg,jpeg,png}");
  console.log("files:", sourceImagePaths);

  for(const sourceImagePath of sourceImagePaths) {
    await generateImageHTML(sourceImagePath);
  }
}

/**
 * 画像向けのHTMLを作成
 */
async function generateImageHTML(sourceImagePath: string): Promise<void> {
  const tomlPath = sourceImagePath.replace(".jpg", ".yaml");

  let imageAttr: Record<string, any> = {};
  try {
    await fs.stat(tomlPath);
    const yamlContent = await fs.readFile(tomlPath, "utf8");
    imageAttr = yaml.load(yamlContent) as Record<string, any>;
  } catch {}

  const imageFilename = path.basename(sourceImagePath);
  const htmlFilename = path.parse(imageFilename).name + ".html";

  const pageAttribute = {
    title: "タイトル",
    imagesrc: path.join("/img", imageFilename),
    author: imageAttr["author"],
    description: toHTML(imageAttr["description"])
  }

  let resultHtml = nunjucks.render(`${templateDir}/image.html`,  pageAttribute);

  const distImagePath = path.join(distDir, "img", path.basename(imageFilename));
  const distHTMLPath = path.join(distDir, "img", path.basename(htmlFilename));
  outputHtml(distHTMLPath, resultHtml);
  await fs.copyFile(sourceImagePath, distImagePath);
}

function toHTML(s: string) {
  if(s == undefined) return ""
  return s.trim().replace("\n", "<br>\n")
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
