import nunjucks from "nunjucks";
import _asciidoctor from 'asciidoctor';
import path from "path";
import * as fs from 'fs/promises';
import glob from "glob";
const mkdirp = require("mkdirp");
import { JSDOM } from "jsdom";

const asciidoctor = _asciidoctor();

type Page = {
  priority: number,
  child: PageTree,
  title?: string,
  path?: string,
  name: string
}

type PageTree = Map<string, Page>

// 各種設定値
const distDir = "dist";
const articleDir = "article";
const templateDir = "template";
const defaultPriority = 50;

const main = async () => {
  // 出力先のリセット
  await fs.rm(distDir, { recursive: true, force: true });
  await mkdirp(distDir);

  // サイドメニューの構築

  // 記事を一式取得
  const allArticleTree = await createTree(articleDir, "/");
  console.log("articleTree", JSON.stringify(allArticleTree));
  // 記事のDOMを構築
  const sidemenuDom = constructDom(allArticleTree);

  // ページ間で共通的に使えるマクロ要素
  let commonAttribute = {
    "sidemenu": sidemenuDom.window.document.body.innerHTML
  };

  // ページの出力を行う
  const articlePaths = await globFiles(path.join(articleDir, "**/*.adoc")) as string[];
  for(const asciidocPath of articlePaths) {
    const doc = asciidoctor.loadFile(asciidocPath);

    // 記事のDOMを構築
    //const childArticleTree = await createTree(articleDir, path.parse(asciidocPath).name);
    //const pageMenuDom = constructDom(childArticleTree);

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

/**
 * ディレクトリをglobする
 */
 function globFiles(pattern: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(pattern, function (err, files) {
      if(err) {
        reject(err);
      }
      resolve(files);
    });
  });
}

/**
 * asciidocのパス列からツリーを構築
 */
async function createTree(docBase: string, docRoot: string): Promise<PageTree> {
  const asciidocPaths = await globFiles(path.join(docBase, docRoot, "**/*.adoc")) as string[];

  /**
   * pathsからツリーを構築
   */
  function inner(base: PageTree, pathTokens: string[], fullpath: string) {
    if(pathTokens.length <= 1) {
      const doc = asciidoctor.loadFile(path.join(docBase, fullpath));
      const name = path.parse(pathTokens[0]).name

      const p = path.join(path.dirname(fullpath), path.parse(fullpath).name + '.html' )

      if(doc.getAttribute("sitetree-ignore") != undefined) {
        return
      }

      let priority = defaultPriority;
      if(doc.getAttribute("sitetree-pariority-key") != undefined) {
        priority = parseInt(doc.getAttribute("sitetree-pariority-key"))
      }

      base.set(name,
        {
          "title": doc.getDocumentTitle() as string,
          "priority":  priority,
          "path": p,
          "child": new Map(),
          name,
        }
      )
    } else {
      const name = pathTokens[0];
      const page = base.get(name)
      if(page == undefined) {
        base.set(name,
          {
            "child": new Map(),
            "priority": defaultPriority,
            name,
          }
        )
      }
      inner(base.get(name)!["child"], pathTokens.slice(1), fullpath)
    }
  }

  let base: PageTree = new Map();
  for(const asciidocPath of asciidocPaths) {
    const relativePath = path.relative(docBase, asciidocPath)
    const pathTokens = relativePath.split("/");
    inner(base, pathTokens , relativePath);
  }
  return base;
}

/**
 * ツリー情報をもとにhtmlの組み立てを行う
 * @param dom 制御対象のdomインスタンス
 * @param ulElem ulエレメントを入れる
 * @param tree ツリー情報
 */
function constructDom(tree: PageTree) {
  const dom = new JSDOM(`<!DOCTYPE html><div></div>`);
  const baseElem = dom.window.document.getElementsByTagName("div")![0];

  // 優先度毎
  const priorityGroup = new Map<number, Page[]>();
  for(const key of tree.keys()) {
    const page = tree.get(key);
    if(page == undefined) continue;

    const priorty = page?.priority;
    const group = priorityGroup.get(priorty);
    if(group != undefined) {
      priorityGroup.set(priorty, [page, ...group]);
    } else {
      priorityGroup.set(priorty, [page]);
    }
  }

  const maxPriority = Math.max(...Array.from(tree.values()).map(x => x.priority));
  const minPriority = Math.min(...Array.from(tree.values()).map(x => x.priority));

  let skipFlag = false;
  let ulElem = dom.window.document.createElement("ul");
  for(let i = minPriority; i < maxPriority + 1; i++) {
    const priority = i;
    const pages = priorityGroup.get(priority);
    if(pages == undefined) {
      skipFlag = true;
      continue;
    } else if(skipFlag == true) {
      // 優先度の空白から復帰した場合
      const hr = dom.window.document.createElement("hr");
      baseElem.appendChild(hr);
      skipFlag = false;
      ulElem = dom.window.document.createElement("ul");
    }

    constructUlElem(dom, ulElem, pages);

    // 同じulElemを数回appendすることになるが同一インスタンスは重複しないのでOK
    baseElem.appendChild(ulElem);
  }
  return dom;
}

function constructUlElem(dom: JSDOM, ulElem: HTMLUListElement, pages: Page[]) {
  for(const attribute of pages) {
    const li = dom.window.document.createElement("li");

    if(attribute.title == undefined || attribute["path"] == undefined) {
      const span = dom.window.document.createElement("span");
      span.textContent = attribute.name;
      li.appendChild(span);
    } else {
      const a = dom.window.document.createElement("a");
      a.href = path.join("/", attribute["path"]);
      a.textContent = attribute["title"];
      li.appendChild(a);
    }

    if(attribute["child"].size != 0) {
      const subul = dom.window.document.createElement("ul");
      constructUlElem(dom, subul, Array.from(attribute.child.values()));
      li.appendChild(subul);
      ulElem.appendChild(li);
    } else {
      ulElem.appendChild(li);
    }
  }
}