import nunjucks from "nunjucks";
import _asciidoctor from 'asciidoctor';
import path from "path";
import fs from "fs";
import glob from "glob";
import mkdirp from "mkdirp";
import { JSDOM } from "jsdom";

const asciidoctor = _asciidoctor();

// 各種設定値
const distDir = "dist";
const asciidocDir = "article";
const templateDir = "template";

/**
 * ディレクトリをglobする
 * @param {string[]} pattern
 * @returns {Promise<string[]>}
 */
function globFiles(pattern) {
  return new Promise((resolve, reject) => {
    glob(pattern, function (err, files) {
      if(err) {
        reject(err);
      }
      resolve(files);
    });
  });
}

// 出力先のリセット
fs.rmSync(distDir, { recursive: true, force: true });
await mkdirp(distDir);

// asciidocを一式取得
const pattern = path.join(asciidocDir, "**/*.asciidoc");
const asciidocPaths = await globFiles(pattern);

// サイドメニューの構築
/**
 * asciidocのパス列からツリーを構築
 * @param {string[]} paths
 */
 function createTree(asciidocPaths) {

  /**
   * pathsからツリーを構築
   * @param {object} base
   * @param {string[]} pathTokens
   */
  function inner(base, pathTokens, fullpath) {
    
    if(pathTokens.length <= 1) {
      const doc = asciidoctor.loadFile(path.join(asciidocDir, fullpath));
      const name = path.parse(pathTokens[0]).name

      const p = path.join(path.dirname(fullpath), path.parse(fullpath).name + '.html' )

      let priority = 10
      if(doc.getAttribute("page-pariority-key") != undefined) {
        priority = parseInt(doc.getAttribute("page-pariority-key"))
      }

      base[name] = {
        "title": doc.getDocumentTitle(),
        "priority":  priority,
        "path": p,
        "child": {}
      }
    } else {
      const name = pathTokens[0];
      if(base[name] == undefined) {
        base[name] = {
          "child": {},
          "priority": 10,
        }
      }
      inner(base[name]["child"], pathTokens.slice(1), fullpath)
    }
  }

  let base = {};
  for(const asciidocPath of asciidocPaths) {
    const relativePath = path.relative(asciidocDir, asciidocPath)
    const pathTokens = relativePath.split("/");
    inner(base, pathTokens , relativePath);
  }
  return base;
}

/**
 * ツリー情報をもとにhtmlの組み立てを行う
 * @param {JSDOM} dom 制御対象のdomインスタンス
 * @param {HTMLElement} ulElem ulエレメントを入れる
 * @param {*} tree ツリー情報
 */
function constructDom(dom, ulElem, tree) {
  for(let i = 0; i < 11; i++) { // 10個ほど優先度を洗う
    for(const name in tree) {
      const attribute = tree[name];
      if(attribute["priority"] == i) {
        const li = dom.window.document.createElement("li");

        if(attribute["title"] == undefined) {
          const span = dom.window.document.createElement("span");
          span.textContent = name;
          li.appendChild(span);
        } else {
          const a = dom.window.document.createElement("a");
          a.href = path.join("/", attribute["path"]);
          a.textContent = attribute["title"];
          li.appendChild(a);
        }

        if(attribute["child"] != {}) {
          const subul = dom.window.document.createElement("ul");
          constructDom(dom, subul, attribute["child"]);
          li.appendChild(subul);
          ulElem.appendChild(li);
          
        }
        ulElem.appendChild(li);
      }
    }
  }
}

const tree = createTree(asciidocPaths);

const dom = new JSDOM(`<!DOCTYPE html><ul></ul>`);
const element = dom.window.document.querySelector("ul");
constructDom(dom, element, tree);

// ページの出力を行う
for(const asciidocPath of asciidocPaths) {
  const doc = asciidoctor.loadFile(asciidocPath);
  let htmlStr = nunjucks.render(`${templateDir}/index.html`,  {
    article: doc.convert(),
    title: doc.getDocumentTitle(),
    sidemenu: dom.window.document.body.innerHTML,
  });

  const outputDir = path.join(distDir, path.relative(asciidocDir, path.dirname(asciidocPath)));
  const outputFile = path.parse(asciidocPath).name + '.html';
  const outputPath = path.join(outputDir, outputFile);

  await mkdirp(outputDir);
  fs.writeFile(outputPath, htmlStr, (err) => {
    if (err) {
      console.log('error:', outputPath); throw err;
    }
    console.log('success:', outputPath);
  });
}
