'use strict'
import { QuickPickOptions, QuickPickItem, window, workspace, commands, TextEditor } from "vscode";
import * as json from 'jsonc-parser';
import { JsonCommonInfo } from '../JsonCommonInfo';
import { DOCLINK_COMMAND } from './CommandCommonInfo';
import { LinkToDocCommandArgs } from './DocLink';
import { isNumber } from "util";

const MAX_LENGTH_CODE_LINE = 50;

interface JsonQuickPickItem extends QuickPickItem {
    jsonNode: json.Node;
}

export class JsonQuickPicker {
    private jsonCommonInfo: JsonCommonInfo;

    constructor(jsonCommonInfo:JsonCommonInfo){
        this.jsonCommonInfo = jsonCommonInfo;
    }


    /**
     * Get substring with out return, tab, spaceworkspace
     * @param start Start point
     * @param length Length
     */
    private getJsonSubstrPlain(start:number, length:number) {
        let sub1 = this.jsonCommonInfo.getJsonText().substr(start);
        sub1 = sub1.replace(/[\r\n\t ]/g, "");
        return sub1.substr(0, length);
    }

    /**
     * get Json item for quick pick
     * @param nodeParentType Parent node type
     * @param nodeItem Node
     * @param indent Indent for label
     * @param index idnex when it's a list item
     */
    private getJsonItem(nodeParentType:string, nodeItem:json.Node, indent:number = 0, index?:number):JsonQuickPickItem {
        let item:JsonQuickPickItem;
        let indentStr = "|　　".repeat(indent);

        if(nodeParentType === "array"){
            // Description
            let descriptionLocal:string = nodeItem.type;
            if(nodeItem.type === "array" || nodeItem.type === "object"){
                descriptionLocal +=" length:" +  nodeItem.children.length;
            }

            // Detail
            let detailLocal = "";
            if(MAX_LENGTH_CODE_LINE < nodeItem.length) {
                detailLocal = this.getJsonSubstrPlain(nodeItem.offset, MAX_LENGTH_CODE_LINE) + " ...";
            } else {
                detailLocal = this.getJsonSubstrPlain(nodeItem.offset, nodeItem.length);
            }

            item = {
                label: indentStr + `${index}`,
                description: descriptionLocal,
                detail: indentStr + detailLocal,
                jsonNode: nodeItem
            };

        } else {
            if(nodeItem.type === "property"){
                let descriptionLocal:string = nodeItem.children[1].type;
                if(nodeItem.children[1].type === "array" || nodeItem.children[1].type === "object"){
                    descriptionLocal +=" length:" +  nodeItem.children[1].children.length;
                }

                item = {
                    label: indentStr + nodeItem.children[0].value,
                    description: descriptionLocal,
                    jsonNode: nodeItem
                };
            } else {
                item = {
                    label: indentStr + `ERROR`,
                    jsonNode: nodeItem
                };
            }
        }
        return item;
    }

    /**
     * Recur children
     * @param pickerItems Items array (return value)
     * @param ttl Time to live 
     * @param nodeItem Current node
     * @param indent Indent
     */
    private recurChildren(pickerItems:JsonQuickPickItem[], ttl:number, nodeItem:json.Node, indent:number = 0) {
        if(ttl <= 0){
            return;
        }

        if(nodeItem.type === "array" || nodeItem.type == "object"){
            for(var j=0; j< nodeItem.children.length; j++){
                pickerItems.push(this.getJsonItem(nodeItem.type, nodeItem.children[j], indent, j));
                this.recurChildren(pickerItems, ttl-1, nodeItem.children[j], indent+1);
            }
        } else if(nodeItem.type === "property"){
            if(nodeItem.children[1].type === "array" || nodeItem.children[1].type == "object"){
                for(var j=0; j< nodeItem.children[1].children.length; j++){
                    pickerItems.push(this.getJsonItem(nodeItem.children[1].type, nodeItem.children[1].children[j], indent, j));
                    this.recurChildren(pickerItems, ttl-1, nodeItem.children[1].children[j], indent+1);
                }
            } else {
                return;
            }
        }
    }

    private moveToNode(textEditor: TextEditor, node:json.Node){
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

    /**
     * showChildBrotherNode
     */
    public showChildBrotherNode(path: json.Segment[] = [], ttl:number = -1) {
        if(!this.jsonCommonInfo){
            return;
        }

        let node = json.findNodeAtLocation(this.jsonCommonInfo.getJsonTree(), path);
        let pathLayer = path.length;
        let currentKey = path.pop();
        let nodeParent = json.findNodeAtLocation(this.jsonCommonInfo.getJsonTree(), path);

        // Items list
        let pickerItems:JsonQuickPickItem[] = [];
        for(var i=0; i< nodeParent.children.length; i++){

            let nodeItem:json.Node = nodeParent.children[i];
            pickerItems.push(this.getJsonItem(nodeParent.type, nodeItem, 0, i));

            if(node.parent == undefined || nodeItem.offset == node.parent.offset || 
                (isNumber(currentKey) && nodeItem.offset == node.offset)){
                // Reach current node
                let maxLayer:number = workspace.getConfiguration().get('jsonHelper.quickpick.maxlayer');
                if(ttl == -1){
                    ttl = maxLayer;
                }

                this.recurChildren(pickerItems, ttl - 1, nodeItem, 1);

            }
        }
        
        let placeHolderStr = "";
        if(pathLayer == 0) {
            placeHolderStr = `Outline of JSON file, input something to search`;
        } else if(currentKey && !isNumber(currentKey)) {
            placeHolderStr = `Outline of key [${currentKey}], input something to search`;
        } else if(isNumber(currentKey)) {
            let previousKeyName = "";
            if(pathLayer > 1){
                for(var i= path.length-1; i>=0; i--){
                    if(!isNumber(path[i])){
                        previousKeyName = `${path[i]}${previousKeyName}`;
                        break;
                    } else {
                        previousKeyName = `[${path[i]}]${previousKeyName}`;
                    }
                }
                if(i == -1){
                    previousKeyName = workspace.getConfiguration().get('jsonHelper.object.name') + previousKeyName;
                }
            } else {
                previousKeyName = workspace.getConfiguration().get('jsonHelper.object.name');
            }
            placeHolderStr = `Outline of ${previousKeyName}[${currentKey}], input something to search`;
        } else {
            placeHolderStr = `Input something to search`;
        }
        window.showQuickPick(pickerItems, {
            placeHolder: placeHolderStr
        }).then((selected: JsonQuickPickItem) => {
            this.moveToNode(this.jsonCommonInfo.getEditor(), selected.jsonNode);
        });
    }
}