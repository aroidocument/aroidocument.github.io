import _asciidoctor from 'asciidoctor';
import path from "path";
import { JSDOM } from "jsdom";

import { createTree } from './pageRepository';

export async function createPagemenu(articleDir: string): Promise<JSDOM> {
  // サイドメニューの構築

  // 記事を一式取得
  const allArticleTree = await createTree(articleDir, "/");
  console.log("articleTree", JSON.stringify(allArticleTree));
  // 記事のDOMを構築
  const sidemenuDom = constructPageMenuHTML(allArticleTree);
  return sidemenuDom;
}

/**
 * ページをプライオリティ毎にグループ化する
 */
function devidePariorityGroup(tree: PageTree) {
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
  return priorityGroup;
}

/**
 * 最大、最小の優先順位を取得する
 */
function minMaxPriority(tree: PageTree): [min: number, max: number] {
  let min = Number.MAX_VALUE;
  let max = 0;
  for(const page of Array.from(tree.values())){
    if(page.priority < min) min = page.priority;
    if(page.priority > max) max = page.priority;
  }
  return [min, max];
}

/**
 * ツリー情報をもとにサイドメニューhtmlの組み立てを行う
 * @param dom 制御対象のdomインスタンス
 * @param ulElem ulエレメントを入れる
 * @param tree ツリー情報
 */
function constructPageMenuHTML(tree: PageTree) {
  const dom = new JSDOM(`<!DOCTYPE html><div></div>`);
  const baseElem = dom.window.document.getElementsByTagName("div")![0];

  // 優先度毎
  const priorityGroup = devidePariorityGroup(tree);
  const [minPriority, maxPriority] = minMaxPriority(tree);

  let skipFlag = false;
  let ulElem = dom.window.document.createElement("ul");
  for(let i = minPriority; i < maxPriority + 1; i++) {
    const priority = i;
    const pages = priorityGroup.get(priority);
    if(pages == undefined) {
      skipFlag = true;
      continue;
    } else if(skipFlag == true) {
      // 空の優先度から復帰した場合、HRを挿入する
      const hr = dom.window.document.createElement("hr");
      baseElem.appendChild(hr);
      skipFlag = false;
      ulElem = dom.window.document.createElement("ul");
    }

    appendPages(dom, ulElem, pages);

    // 同じulElemを数回appendすることになるが同一インスタンスは重複しないのでOK
    baseElem.appendChild(ulElem);
  }
  return dom;
}

/**
 * ページをHTMLに追加する
 */
function appendPages(dom: JSDOM, ulElem: HTMLUListElement, pages: Page[]) {
  for(const page of pages) {
    const li = dom.window.document.createElement("li");

    if(page.title == undefined || page.path == undefined) {
      // 実体がない場合はリンクにしない
      const span = dom.window.document.createElement("span");
      span.textContent = page.name;
      li.appendChild(span);
    } else {
      // リンクで追加
      const a = dom.window.document.createElement("a");
      a.href = path.join("/", page.path);
      a.textContent = page.title;
      li.appendChild(a);
    }

    if(page.child.size != 0) {
      const subul = dom.window.document.createElement("ul");
      // TODO: このやり方だと子ツリーのpriorityが考慮されない
      appendPages(dom, subul, Array.from(page.child.values()));
      li.appendChild(subul);
      ulElem.appendChild(li);
    } else {
      ulElem.appendChild(li);
    }
  }
}
