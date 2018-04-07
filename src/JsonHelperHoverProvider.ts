'use strict';

import * as vscode from 'vscode';
import * as json from 'jsonc-parser';
import { MarkDownCmd } from './utils/MarkDownCmd';
import { isNumber } from 'util';
import { LinkToDocCommandArgs } from './commands/DocLink';
import { JsonCommonInfo } from './JsonCommonInfo';
import { DOCLINK_COMMAND, COPYTOCLIPBOARD_COMMAND, SHOW_NODES_QUICK_PICK_CMD } from './commands/CommandCommonInfo';


export class JsonHelperHoverProvider implements vscode.HoverProvider{

    private jsonCommonInfo:JsonCommonInfo;

    constructor(jsonCommonInfo:JsonCommonInfo){
        this.jsonCommonInfo = jsonCommonInfo;
    }


    provideHover(document : vscode.TextDocument, position : vscode.Position, token : vscode.CancellationToken) : vscode.ProviderResult<vscode.Hover>{
        if(!this.jsonCommonInfo.getJsonTree()){
            //make sure the json tree has been initialized currectly
            return null;
        }
        //offset for the current position
        let offset:number = document.offsetAt(position);
        const currentLocation = json.getLocation(this.jsonCommonInfo.getJsonText(), offset);
        let path = currentLocation.path.slice(0);

        if(!currentLocation.previousNode){
            let node = json.findNodeAtLocation(this.jsonCommonInfo.getJsonTree(), path);

            if(path.length == 0 || (isNumber(path[path.length-1]) && node.offset == offset)){
                // Head of an array item or root
                // Reset previous node info
                currentLocation.previousNode = node;
            } else {
                // not on a node
                return null;
            }
        }

        if(path.length != 0 && (!currentLocation.isAtPropertyKey && !isNumber(path[path.length - 1]))){
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
            

        let pathCopy:json.Segment[] = JSON.parse(JSON.stringify(path));

        let node = json.findNodeAtLocation(this.jsonCommonInfo.getJsonTree(), path);
        
        let nodeMsgList = [];
        let plainPathList = [];
        let currentKey;

        if(path.length != 0){

            while((currentKey = path.pop()) != null){
                if(isNumber(currentKey)){
                    //nodeMsgList.push(`[\`${currentKey}\`]`);
                    let keyHint = this.getKeyHint(node);
                    nodeMsgList.push(`[${this.generateDocLinkCommandStr(`${currentKey}`, document.positionAt(node.offset), document.positionAt(node.offset), keyHint)}]`);
                    plainPathList.push(`[${currentKey}]`);
                } else {
                    if(node.parent.type === 'property'){
                        let keyNode = node.parent.children[0];
                        //in order to get the origin text, in case of escape character
                        let keyOrignText = this.jsonCommonInfo.getJsonText().substr(keyNode.offset, keyNode.length);
                        let keyHint = this.getKeyHint(node);
                        nodeMsgList.push(`[${this.generateDocLinkCommandStr(keyOrignText, document.positionAt(keyNode.offset), document.positionAt(keyNode.offset + keyNode.length), keyHint)}]`);
                        plainPathList.push(`[${keyOrignText}]`);
                    } else {
                        nodeMsgList.push(`[\`Error\`]`);
                        plainPathList.push(`[\`Error\`]`);
                    }
                }
                node = json.findNodeAtLocation(this.jsonCommonInfo.getJsonTree(), path);
            }
        }

        //root node
        let keyRootName:string = vscode.workspace.getConfiguration().get('jsonHelper.object.name');
        node = json.findNodeAtLocation(this.jsonCommonInfo.getJsonTree(), []);
        nodeMsgList.push(`${this.generateDocLinkCommandStr(keyRootName, 
            document.positionAt(node.offset), document.positionAt(node.offset), this.getKeyHint(node))}`);
        plainPathList.push(`${keyRootName}`);

        return this.generateMsg(nodeMsgList, plainPathList, pathCopy);
    }

    /**
     * get hint for node
     * @param node Node
     */
    private getKeyHint(node:json.Node) : string {
        let keyHint:string;
        if(node.type == 'array' || node.type == 'object'){
            keyHint = `${node.type}, length:${node.children.length}`;
        } else {
            keyHint = `${node.type}`;
        }
        return keyHint;
    }

    /**
     * Generate message by node list
     * @param nodeMsgList node message list
     * @param plainPathList node plain message list
     */
    private generateMsg(nodeMsgList:string[], plainPathList:string[] = [], path:json.Segment[]) : string{
        //let msg:string = vscode.workspace.getConfiguration().get('jsonHelper.object.name');
        let plainMsg:string = "";
        let quickPickMsg:string = this.generateJsonQuickPickCommandStr('▤', path);
        if(plainPathList.length != 0){
            plainMsg = this.generateCopyToClipboardCommandStr('✎', plainPathList.reverse().join(""));
            //plainMsg = this.generateCopyToClipboardCommandPic(msg + plainPathList.reverse().join(""));
        }

        return quickPickMsg + "&nbsp;" + plainMsg + "  \n" + nodeMsgList.reverse().join('');
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

    /**
     * generateJsonQuickPickCommandStr
     * @param name Name
     * @param path Path for current node
     */
    private generateJsonQuickPickCommandStr(name:string, path:json.Segment[]) {
        let args = {path: path};
        return MarkDownCmd.generateMarkedCommandStr(`\`${name}\``, SHOW_NODES_QUICK_PICK_CMD, args, 'Show outline of the current key/object');
    }

}