interface ImageConfig {
  title: string;
  imagesrc: string;
  author: string;
  description: string;
}

export class ImagePage {
  constructor(
    public config: ImageConfig,
    public sourcePath: string // 元画像のパス
  ) {}
}
