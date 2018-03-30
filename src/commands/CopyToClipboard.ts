'use strict'

import { Clipboard } from "../utils/Clipboard";
import { window } from "vscode";

export class CopyToClipboard {
    constructor() {

    }

    /**
     * copy
     * @param text text to copy
     */
    public copy(text:string) {
        if(!text){
            return;
        }

        Clipboard.Copy(text);
        window.showInformationMessage("Message has been copied to clipboard.");
    }
}