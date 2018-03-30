'use strict';

const clipboardy = require('clipboardy');

export class Clipboard {
  public static Copy(text: string) {
    clipboardy.writeSync(text);
  }

  public static Paste(): string {
    return clipboardy.readSync();
  }
}
