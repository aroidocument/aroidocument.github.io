import _asciidoctor, { Asciidoctor } from 'asciidoctor';
import path from "path";
import { globFiles } from '../glob';

const asciidoctor = _asciidoctor();

const defaultPriority = 50;


/**
 * サイドメニュー向けのタイトルを確定させる
 */
function getMenuTitle(doc: Asciidoctor.Document): string {
  const menuTitle = doc.getAttribute("menu-title") as string;
  if(menuTitle != undefined) {
    return menuTitle;
  }
  return doc.getDocumentTitle() as string;
}

function getPriority(doc: Asciidoctor.Document): number {
  const priority = doc.getAttribute("sitetree-pariority-key") as string;
  if(priority != undefined) {
    return parseInt(priority);
  }
  return defaultPriority;
}

/**
 * pathsからツリーを構築
 */
function createTree(docBase: string, base: PageTree, pathTokens: string[], fullpath: string) {
  if(pathTokens.length <= 1) {
    const doc = asciidoctor.loadFile(path.join(docBase, fullpath));

    const name = path.parse(pathTokens[0]).name;
    const urlPath = path.join(path.dirname(fullpath), path.parse(fullpath).name + '.html' );

    // サイドメニューから無視するページの場合
    if(doc.getAttribute("sitetree-ignore") != undefined) return

    base.set(name,
      {
        "menu_title": getMenuTitle(doc),
        "title": doc.getDocumentTitle() as string,
        "priority":  getPriority(doc),
        "path": urlPath,
        "child": new Map(),
        name,
      }
    )
  } else {
    // 子ノードしか存在しない親ノードが発見された場合
    // 基本的には起こり得ないパターン
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
    createTree(docBase, base.get(name)!["child"], pathTokens.slice(1), fullpath)
  }
}


/**
 * asciidocのパス列からサイドメニューを構築
 */
export async function fetchPageTree(docBase: string, docRoot: string): Promise<PageTree> {
  const asciidocPaths = await globFiles(path.join(docBase, docRoot, "**/*.adoc")) as string[];
  const base: PageTree = new Map();
  for(const asciidocPath of asciidocPaths) {
    const relativePath = path.relative(docBase, asciidocPath)
    const pathTokens = relativePath.split("/");
    createTree(docBase, base, pathTokens , relativePath);
  }
  return base;
}
