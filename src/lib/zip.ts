import { Zip, ZipPassThrough } from 'fflate';

export type ZipEntry = {
  name: string;
  data: Uint8Array;
};

/**
 * 無圧縮の zip を作る。MP4 は圧縮済みで、圧縮しても小さくならず時間だけかかるため、そのまま格納する。
 * ファイル名は UTF-8 で格納する（日本語のファイル名を Mac・Windows で展開できるように）。
 */
export function createZip(entries: readonly ZipEntry[]): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    const zip = new Zip((error, chunk, final) => {
      if (error) {
        reject(error);
        return;
      }
      chunks.push(chunk);
      // fflate が返すチャンクは ArrayBuffer を元にした Uint8Array のため、Blob の部品としてそのまま使える
      if (final) resolve(new Blob(chunks as Uint8Array<ArrayBuffer>[], { type: 'application/zip' }));
    });
    for (const entry of entries) {
      const file = new ZipPassThrough(entry.name);
      zip.add(file);
      file.push(entry.data, true);
    }
    zip.end();
  });
}
