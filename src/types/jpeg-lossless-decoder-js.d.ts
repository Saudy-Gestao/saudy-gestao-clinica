declare module 'jpeg-lossless-decoder-js' {
  export class Decoder {
    decompress(buffer: ArrayBufferLike, offset?: number, length?: number): ArrayBuffer;
  }
}
