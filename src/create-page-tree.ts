import nunjucks from "nunjucks";
import _asciidoctor, { Asciidoctor } from 'asciidoctor';
import path from "path";
import * as fs from 'fs/promises';
import glob from "glob";
const mkdirp = require("mkdirp");
import { JSDOM } from "jsdom";
import { PageTree } from "./model";
import { globFiles } from "./glob";


export class TreeGenerator {

  constructor(
    public asciidoctor: Asciidoctor,
    public defaultPriority: number,
    public docBase: string,
  ) {}

  /**
   * asciidocのパス列からツリーを構築
   */
  async createTree(): Promise<PageTree> {
    const asciidocPaths = await globFiles(path.join(this.docBase, "**/*.adoc")) as string[];

    let base: PageTree = new Map();
    for(const asciidocPath of asciidocPaths) {
      const relativePath = path.relative(this.docBase, asciidocPath)
      const pathTokens = relativePath.split("/");
      this.inner(base, pathTokens , relativePath);
    }
    return base;
  }

  /**
   * pathsからツリーを構築
   */
  inner(base: PageTree, pathTokens: string[], fullpath: string) {
    if(pathTokens.length <= 1) {
      const doc = this.asciidoctor.loadFile(path.join(this.docBase, fullpath));
      const name = path.parse(pathTokens[0]).name

      const p = path.join(path.dirname(fullpath), path.parse(fullpath).name + '.html' )

      if(doc.getAttribute("sitetree-ignore") != undefined) {
        return
      }

      let priority = this.defaultPriority;
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
            "priority": this.defaultPriority,
            name,
          }
        )
      }
      this.inner(base.get(name)!["child"], pathTokens.slice(1), fullpath)
    }
  }
}
