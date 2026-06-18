
/**
 * ページツリー用にページの情報を保持する型
 */
type Page = {
    priority: number, // ページ上の優先順位
    child: PageTree,  // 子ページ
    menu_title?: string, // メニュー向けのタイトル
    title?: string, // フルタイトル
    path?: string, // ページのURL上のパス
    name: string // ファイル名
  }

/**
 * ページの木構造を保持する型
 */
type PageTree = Map<string, Page>
