'use strict';

import * as vscode from 'vscode';
import * as json from 'jsonc-parser';
import * as path from 'path';
import { MarkDownCmd } from './utils/MarkDownCmd';
import { isNumber } from 'util';
import { LinkToDocCommandArgs } from './commands/DocLink';

const DOCLINK_COMMAND = 'jsonHelper.docLink';
const COPYTOCLIPBOARD_COMMAND = 'jsonHelper.copyToClipboard';


export class JsonHelperHoverProvider implements vscode.HoverProvider{

    private tree: json.Node;
	private text: string;
    private editor: vscode.TextEditor;

    constructor(){
        vscode.workspace.onDidChangeTextDocument(e => this.onDocumentChanged(e));
        vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());
        this.parseTree();
    }


    provideHover(document : vscode.TextDocument, position : vscode.Position, token : vscode.CancellationToken) : vscode.ProviderResult<vscode.Hover>{
        if(!this.tree){
            //make sure the json tree has been initialized currectly
            return null;
        }
        //offset for the current position
        let offset:number = document.offsetAt(position);
        const currentLocation = json.getLocation(this.text, offset);
        let path = currentLocation.path.slice(0);

        if(!currentLocation.previousNode){
            // not on a node
            return null;
        }

        if(!currentLocation.isAtPropertyKey && !isNumber(path[path.length - 1])){
            // value except list item
            return null;
        }

        if(offset >= currentLocation.previousNode.offset + currentLocation.previousNode.length){
            return null;
        }

        
        let msg:string = this.generateMsgByPath(path, document);

        if (msg) {
            let range = new vscode.Range(
                document.positionAt(currentLocation.previousNode.offset),
                document.positionAt(currentLocation.previousNode.offset + currentLocation.previousNode.length)
            )
            let hoverContent = new vscode.MarkdownString(msg);
            hoverContent.isTrusted = true;

            return new vscode.Hover(hoverContent, range);
        }

        return null;
    }


    private generateMsgByPath(path : json.Segment[], document : vscode.TextDocument) : string {
        if(path.length == 0){
            return null;
        }

        let node = json.findNodeAtLocation(this.tree, path);
        
        let nodeMsgList = [];
        let plainPathList = [];
        let currentKey;

        while((currentKey = path.pop()) != null){
            if(isNumber(currentKey)){
                nodeMsgList.push(`[\`${currentKey}\`]`);
                plainPathList.push(`[${currentKey}]`);
            } else {
                if(node.parent.type == 'property'){
                    let keyNode = node.parent.children[0];
                    //in order to get the origin text, in case of escape character
                    let keyOrignText = this.text.substr(keyNode.offset, keyNode.length);
                    let keyHint;
                    if(node.type == 'array' || node.type == 'object'){
                        keyHint = `${node.type}, length:${node.children.length}`;
                    } else {
                        keyHint = `${node.type}`;
                    }
                    nodeMsgList.push(`[${this.generateDocLinkCommandStr(keyOrignText, document.positionAt(keyNode.offset), document.positionAt(keyNode.offset + keyNode.length), keyHint)}]`);
                    plainPathList.push(`[${keyOrignText}]`);
                } else {
                    nodeMsgList.push(`[\`Error\`]`);
                    plainPathList.push(`[\`Error\`]`);
                }
            }
            node = json.findNodeAtLocation(this.tree, path);
        }

        return this.generateMsg(nodeMsgList, plainPathList);
    }

    /**
     * Generate message by node list
     * @param nodeMsgList node message list
     * @param plainPathList node plain message list
     */
    private generateMsg(nodeMsgList:string[], plainPathList:string[] = []) : string{
        let msg:string = vscode.workspace.getConfiguration().get('jsonHelper.object.name');
        let plainMsg:string = "";
        if(plainPathList.length != 0){
            plainMsg = this.generateCopyToClipboardCommandStr('✎', msg + plainPathList.reverse().join(""));
            //plainMsg = this.generateCopyToClipboardCommandPic(msg + plainPathList.reverse().join(""));
        }

        return msg + nodeMsgList.reverse().join('') + "&nbsp;&nbsp;" + plainMsg;
    }


    /**
     * generateDocLinkCommandStr
     * @param name Name
     * @param start Start point
     * @param end End point
     * @param hint Hint for hover
     */
    private generateDocLinkCommandStr(name:string, start:vscode.Position, end:vscode.Position, hint:string = null){
        var args:LinkToDocCommandArgs = {
            start: start,
            end: end
        };
        return MarkDownCmd.generateMarkedCommandStr(`\`${name}\``, DOCLINK_COMMAND, args, hint);
    }

    /**
     * generateCopyToClipboardCommandStr
     * @param text Text to copy 
     */
    private generateCopyToClipboardCommandPic(text:string) {
        let args = {text: `${text}`};
        return MarkDownCmd.generateMarkedCommandPic('copy', COPYTOCLIPBOARD_COMMAND, args, 'icon-copy.png', 'Copy path to clipboard');
    }

    /**
     * generateCopyToClipboardCommandStr
     * @param text Text to copy 
     */
    private generateCopyToClipboardCommandStr(name:string, text:string) {
        let args = {text: `${text}`};
        return MarkDownCmd.generateMarkedCommandStr(`\`${name}\``, COPYTOCLIPBOARD_COMMAND, args, 'Copy path to clipboard');
    }


    private parseTree(): void {
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
				//const path = json.getLocation(this.text, this.editor.document.offsetAt(change.range.start)).path;
				//path.pop();
				//const node = path.length ? json.findNodeAtLocation(this.tree, path) : void 0;
				this.parseTree();
				//this._onDidChangeTreeData.fire(node ? node.offset : void 0);
			}
		}
    }
    
    private onActiveEditorChanged(): void {
		if (vscode.window.activeTextEditor) {
			if (vscode.window.activeTextEditor.document.uri.scheme === 'file') {
				const enabled = vscode.window.activeTextEditor.document.languageId === 'json'/* || vscode.window.activeTextEditor.document.languageId === 'jsonc'*/;
				//vscode.commands.executeCommand('setContext', 'jsonHelperEnabled', enabled);
				if (enabled) {
					this.parseTree();
				}
			}
		} else {
			//vscode.commands.executeCommand('setContext', 'jsonHelperEnabled', false);
		}
	}
}