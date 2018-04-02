'use strict';

import * as vscode from 'vscode';
import { JsonCommonInfo } from './JsonCommonInfo';
import { MOVE_PRE_CMD, MOVE_NEXT_CMD } from './commands/CommandCommonInfo';

export class StatusBarController {
    private josnCommonInfo:JsonCommonInfo;
    private statusIconMovePreKey:vscode.StatusBarItem;
    private statusIconMoveNextKey:vscode.StatusBarItem;

    constructor(jsonCommonInfo:JsonCommonInfo, statusIconMovePreKey:vscode.StatusBarItem, statusIconMoveNextKey:vscode.StatusBarItem) {
        this.josnCommonInfo = jsonCommonInfo;

        statusIconMovePreKey.text = '⇠';
        statusIconMovePreKey.tooltip = 'Navigate to the previous key of current layer';
        statusIconMovePreKey.command = MOVE_PRE_CMD;

        statusIconMoveNextKey.text = '⇢';
        statusIconMoveNextKey.tooltip = 'Navigate to the next key of current layer';
        statusIconMoveNextKey.command = MOVE_NEXT_CMD;

        this.statusIconMovePreKey = statusIconMovePreKey;
        this.statusIconMoveNextKey = statusIconMoveNextKey;
        vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());
        vscode.workspace.onDidOpenTextDocument(e => this.onDocumentOpened(e));
        
        this.onActiveEditorChanged();
    }

    private onActiveEditorChanged(): void {
		if (vscode.window.activeTextEditor) {
			if (vscode.window.activeTextEditor.document.uri.scheme === 'file' || vscode.window.activeTextEditor.document.isUntitled) {
				const enabled = vscode.window.activeTextEditor.document.languageId === 'json'/* || vscode.window.activeTextEditor.document.languageId === 'jsonc'*/;
				if (enabled) {
					this.statusIconMovePreKey.show();
                    this.statusIconMoveNextKey.show();
                    return;
                }
			}
        }
        this.statusIconMovePreKey.hide();
	    this.statusIconMoveNextKey.hide();
    }
    
    private onDocumentOpened(event: vscode.TextDocument): void {
        //only works for language mode change manually
        if (vscode.window.activeTextEditor) {
            //document to open is the same as what shown in editor
            if(event.uri.toString() === vscode.window.activeTextEditor.document.uri.toString()){
                if(event.languageId === 'json'){
                    this.statusIconMovePreKey.show();
                    this.statusIconMoveNextKey.show();
                } else {
                    this.statusIconMovePreKey.hide();
	                this.statusIconMoveNextKey.hide();
                }
            }
        }
    }
}