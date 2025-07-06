# aroidocument

サトイモ科植物の情報をまとめるサイト

## htmlの生成

```
npm run build
```

## 画像の圧縮

```
mogrify -path article/image -resize '1500x1500>' -quality 50% -format jpg -strip "article/image/*.jpg"
```

## 独自のasciidoc属性

### :sitetree-pariority-key:

ページツリー内での優先度を1～10で指定する。<br>
数値が小さいほど上に表示される。指定がない場合そのページの優先度は5。

### :sitetree-ignore:

自動生成されるサイトツリーから除外する

### :menu-title:

サイトメニュー向けに短縮版の名前をつける。
存在しない場合はページのタイトルをメニューに使用する

## 独自のasciidoc要素

### インライン引用

```
[.inline-quote]
.参考にしたもの
****
****
```
