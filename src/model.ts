export type Page = {
  priority: number,
  child: PageTree,
  title?: string,
  path?: string,
  name: string
}

export type PageTree = Map<string, Page>
