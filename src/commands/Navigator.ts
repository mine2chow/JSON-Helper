'use strict';
import { window, commands, TextEditor, TextEditorEdit, Position } from "vscode";
import { JsonCommonInfo } from '../JsonCommonInfo';
import * as json from 'jsonc-parser';
import { isNumber } from "util";
import { DOCLINK_COMMAND } from './CommandCommonInfo';
import { LinkToDocCommandArgs } from './DocLink';

function moveToNode(textEditor: TextEditor, node:json.Node){
    let linkArgs:LinkToDocCommandArgs;

    if(node.type === 'property'){
        linkArgs = {
            start: textEditor.document.positionAt(node.children[0].offset),
            end: textEditor.document.positionAt(node.children[0].offset + node.children[0].length)
        };
    } else if(node.type === 'array' || node.type === 'object'){
        linkArgs = {
            start: textEditor.document.positionAt(node.offset),
            end: textEditor.document.positionAt(node.offset)
        };
    } else {
        linkArgs = {
            start: textEditor.document.positionAt(node.offset),
            end: textEditor.document.positionAt(node.offset + node.length)
        };
    }

    commands.executeCommand(DOCLINK_COMMAND, linkArgs);
}
export class MoveToPreKey {
    private jsonCommonInfo:JsonCommonInfo;

    constructor(jsonCommonInfo:JsonCommonInfo){
        this.jsonCommonInfo = jsonCommonInfo;
    }

    /**
     * move
     */
    public move(textEditor: TextEditor, edit: TextEditorEdit, ...args: any[]) {
        const cursorPosition = textEditor.selection.active;
        const cursorOfffset = textEditor.document.offsetAt(cursorPosition);
        let jsonLocation = json.getLocation(this.jsonCommonInfo.getJsonText(), cursorOfffset);
        let path = jsonLocation.path;
        let node = json.findNodeAtLocation(this.jsonCommonInfo.getJsonTree(), path);

        let preNode:json.Node;

        if(!jsonLocation.previousNode){
            //not on a JSON element
            //get the closest node before
            let parent;

            path.pop();
            
            parent = json.findNodeAtLocation(this.jsonCommonInfo.getJsonTree(), path);
            let i;
            for(i= parent.children.length - 1; i>=0; i--){
                if(parent.children[i].offset < cursorOfffset){
                    break;
                }
            }

            if(i == -1){
                //already first node of current layer
                window.showInformationMessage('Top of the current layer');
                i = 0;
            }

            preNode = parent.children[i];

        } else {
            // get previous node by current node
            let currentProperty, parent;

            if(isNumber(path[path.length - 1])){
                parent = node.parent;
                currentProperty = node;
            } else {
                parent = node.parent.parent;
                currentProperty = node.parent;
            }
    
            const childrenList = parent.children;
            let index = childrenList.indexOf(currentProperty);
            if(index == 0){
                //already first node of current layer
                window.showInformationMessage('Top of the current layer');

                index = 1;
            }
            
            preNode = childrenList[index - 1];
        }


        moveToNode(textEditor, preNode);

    }
}

export class MoveToNextKey {
    private jsonCommonInfo:JsonCommonInfo;

    constructor(jsonCommonInfo:JsonCommonInfo){
        this.jsonCommonInfo = jsonCommonInfo;
    }

    /**
     * move
     */
    public move(textEditor: TextEditor, edit: TextEditorEdit, ...args: any[]) {
        const cursorPosition = textEditor.selection.active;
        const cursorOfffset = textEditor.document.offsetAt(cursorPosition);
        let jsonLocation = json.getLocation(this.jsonCommonInfo.getJsonText(), cursorOfffset);
        let path = jsonLocation.path;
        let node = json.findNodeAtLocation(this.jsonCommonInfo.getJsonTree(), path);

        let nextNode:json.Node;

        if(!jsonLocation.previousNode){
            //not on a JSON element
            //get the closest node before
            let parent;

            path.pop();
            
            parent = json.findNodeAtLocation(this.jsonCommonInfo.getJsonTree(), path);
            let i;
            for(i= 0; i < parent.children.length; i++){
                if(parent.children[i].offset > cursorOfffset){
                    break;
                }
            }

            if(i == parent.children.length){
                //already first node of current layer
                window.showInformationMessage('Buttom of the current layer');
                
                i = i - 1;
            }

            nextNode = parent.children[i];

        } else {
            // get previous node by current node
            let currentProperty, parent;

            if(isNumber(path[path.length - 1])){
                parent = node.parent;
                currentProperty = node;
            } else {
                parent = node.parent.parent;
                currentProperty = node.parent;
            }
    
            const childrenList = parent.children;
            let index = childrenList.indexOf(currentProperty);
            if(index == childrenList.length - 1){
                //already first node of current layer
                window.showInformationMessage('Buttom of the current layer');
                
                index = index - 1;
            }
            
            nextNode = childrenList[index + 1];
        }


        moveToNode(textEditor, nextNode);

    }
}