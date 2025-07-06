import _asciidoctor from 'asciidoctor';
import path from "path";
import { JSDOM } from "jsdom";

import { createTree } from './pageRepository';
import {create} from 'xmlbuilder2';


export async function pageTreeFactory(articleRootDir: string): Promise<PageTree> {
  const allArticleTree = await createTree(articleRootDir, "/");
  console.log("articleTree", JSON.stringify(allArticleTree));
  return new PageTree(allArticleTree);

}

export class PageTree {
  pageTree: Map<string, Page>;
  constructor(pageTree: Map<string, Page>) {
    this.pageTree = pageTree;
  }

  *pageTreeIterator(): IterableIterator<Page> {
    // childを再帰的に処理するためのジェネレータ
    function* inner(page: Page): IterableIterator<Page> {
      yield page;
      for(const child of page.child.values()) {
        yield* inner(child);
      }
    }
    for(const entries of this.pageTree.entries()) {
      yield* inner(entries[1]);
    }
  }

  createSitemapXml(): string {
    const urls = [];
    for(const page of this.pageTreeIterator()) {
      const url = {
        loc: page.path,
        lastmod: new Date().toISOString(),
      }
      urls.push(url);
    }

    const sitemap = {
      '?': 'xml-stylesheet type="text/xsl" href="/sitemap.xsl"',
      urlset: {
        '@xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
        '@xmlns:xsi': "http://www.w3.org/2001/XMLSchema-instance",
        "@xsi:schemaLocation": "http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd",
        "@xmlns:image": "http://www.google.com/schemas/sitemap-image/1.1",
        url: urls
      }
    };

    const doc = create({ version: '1.0', encoding: 'UTF-8' }, sitemap).doc();
    return doc.end({ prettyPrint: true });
  }

  /**
   * ツリー情報をもとにサイドメニューhtmlの組み立てを行う
   * @param dom 制御対象のdomインスタンス
   * @param ulElem ulエレメントを入れる
   * @param tree ツリー情報
   */
  async createPageTreeHtml(): Promise<string> {
    const dom = await this.createPageTreeDom();
    return dom.window.document.body.innerHTML
  }

  /**
   * ツリー情報をもとにサイドメニューhtmlの組み立てを行う
   * @param dom 制御対象のdomインスタンス
   * @param ulElem ulエレメントを入れる
   * @param tree ツリー情報
   */
  async createPageTreeDom(): Promise<JSDOM> {
    const dom = new JSDOM(`<!DOCTYPE html><div></div>`);
    const baseElem = dom.window.document.getElementsByTagName("div")![0];

    // 優先度毎
    const priorityGroup = this.devidePariorityGroup();
    const [minPriority, maxPriority] = this.minMaxPriority();

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
   * ページをプライオリティ毎にグループ化する
   */
  private devidePariorityGroup() {
    const priorityGroup = new Map<number, Page[]>();
    for(const key of this.pageTree.keys()) {
      const page = this.pageTree.get(key);
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
   * ページツリー内の最大、最小の優先順位を取得する
   */
  private minMaxPriority(): [min: number, max: number] {
    let min = Number.MAX_VALUE;
    let max = 0;
    for(const page of Array.from(this.pageTree.values())){
      if(page.priority < min) min = page.priority;
      if(page.priority > max) max = page.priority;
    }
    return [min, max];
  }
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
