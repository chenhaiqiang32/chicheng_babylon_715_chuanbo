interface Window {
  electronAPI: {
    init: () => Promise<{ dir: string } | null>;
    saveFile: (
      name: string,
      data: FileSystemWriteChunkType,
      dir?: string,
    ) => Promise<string | null>;
    getFileArrayBuffer: (name: string, dir?: string) => any;
    getFileText: (name: string, dir?: string) => any;
  };
  registry: boolean;
}
