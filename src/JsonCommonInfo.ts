'use strict';

import * as vscode from 'vscode';
import * as json from 'jsonc-parser';

export class JsonCommonInfo {

    private tree: json.Node;
    private text: string;
    private editor: vscode.TextEditor;

    /**
     * getJsonText
     */
    public getJsonText() : string {
        return this.text
    }

    /**
     * getJsonTree
     */
    public getJsonTree() : json.Node {
        return this.tree;
    }

    /**
     * getEditor
     */
    public getEditor() : vscode.TextEditor {
        return this.editor;
    }
    
    constructor(){
        vscode.workspace.onDidChangeTextDocument(e => this.onDocumentChanged(e));
        vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());
        this.parseTree();
    }

    public parseTree(): void {
		this.text = '';
		this.tree = null;
		this.editor = vscode.window.activeTextEditor;
		if (this.editor && this.editor.document) {
			this.text = this.editor.document.getText();
			this.tree = json.parseTree(this.text);
		}
    }
    

    private onDocumentChanged(changeEvent: vscode.TextDocumentChangeEvent): void {
		if (changeEvent.document.uri.toString() === this.editor.document.uri.toString()) {
			for (const change of changeEvent.contentChanges) {
				this.parseTree();
			}
		}
    }
    
    private onActiveEditorChanged(): void {
		if (vscode.window.activeTextEditor) {
			if (vscode.window.activeTextEditor.document.uri.scheme === 'file') {
				const enabled = vscode.window.activeTextEditor.document.languageId === 'json'/* || vscode.window.activeTextEditor.document.languageId === 'jsonc'*/;
				if (enabled) {
					this.parseTree();
				}
			}
		}
	}
}