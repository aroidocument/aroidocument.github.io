# aroidocument

サトイモ科植物の情報をまとめるサイト

## htmlの生成

```
npm run build
```

## 独自のasciidoc属性

### :sitetree-pariority-key:

ページツリー内での優先度を1～10で指定する。<br>
数値が小さいほど上に表示される。指定がない場合そのページの優先度は5。

### :sitetree-ignore:

自動生成されるサイトツリーから除外する