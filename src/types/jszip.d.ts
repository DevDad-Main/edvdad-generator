declare module 'jszip' {
  interface JSZipObject {
    file(path: string, content: string): void;
    generateAsync(options: { type: string }): Promise<Blob>;
  }
  interface JSZip {
    new (): JSZipObject;
  }
  const JSZip: JSZip;
  export default JSZip;
}