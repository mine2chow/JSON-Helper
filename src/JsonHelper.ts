'use strict';

import { Hover, TextDocument, Position, CancellationToken, MarkdownString, Range, Selection, workspace } from 'vscode';
import { LinkToDocCommandArgs } from './commands/DocLink';

const DOCLINK_COMMAND = 'jsonHelper.docLink';

//bracket information class
class BracketInfo {
    public keyName = '';
    public keyRange:Range;
	public notation = '';
	public line : number;
	public character : number;
	public listIndex = 0;
	public getClosureNotation():string{
		if(this.notation == '{'){
			return '}';
		} else if(this.notation == '['){
			return ']'
		}
		return null;
	}
}

export class JsonHelper{
    constructor(){

    }

    /**
     * _generateMarkedCommandStr
     * @param name Name
     * @param command Command name
     * @param args Arguments
     * @param hint Hint for hover
     */
    private _generateMarkedCommandStr(name:string, command:string, args:object, hint:string){
        var str = `[${name}](command:${command}?` + encodeURIComponent(JSON.stringify(args));
        if(hint != null){
            str += ` "${hint}")`;
        } else {
            str += `)`;
        }
        return str;
    }


    /**
     * _generateDocLinkCommandStr
     * @param name Name
     * @param start Start point
     * @param end End point
     * @param hint Hint for hover
     */
    private _generateDocLinkCommandStr(name:string, start:Position, end:Position, hint:string = null){
        var args:LinkToDocCommandArgs = {
            start: start,
            end: end
        };
        return this._generateMarkedCommandStr(`"${name}"`, DOCLINK_COMMAND, args, hint);
    }


    /**
     * Get string for the key cursor's hovering now
     * @param lines 
     * @param lineNumber 
     * @param character 
     */
    private _getKeyCursorIn(lines:string[], lineNumber:number, character:number):any{
        let startP, endP;
        let line = lines[lineNumber];

        let last2DQ = [];
        let DQCount = 0;
        //check from 0 to itself
        for(var i=0; i<=character; i++){
            let c = line.charAt(i);
            if(c == '\\'){
                i++;
                continue;
            }

            if(c == '"'){
                DQCount++;
                last2DQ.push(i);
            }

            if(last2DQ.length > 2){
                last2DQ.shift();
            }
        }

        if(DQCount%2 != 0){
            startP = last2DQ[last2DQ.length - 1];
            let i;
            if(line.charAt(character) == '\\'){
                i = character + 2;
            } else {
                i = character + 1;
            }
            for(; i<line.length; i++){
                let c = line.charAt(i);
                if(c == '\\'){
                    i++;
                    continue;
                }
                if(c == '"'){
                    endP = i;
                    break;
                }
            }
        } else if(last2DQ.length != 0 && last2DQ[1] == character) {
            //on right double quotation
            startP = last2DQ[0];
            endP = last2DQ[1];
        }

        if(!startP || !endP){
            return null;
        }

        //make sure it's a key, not value
        for(var i=lineNumber; i<lines.length; i++){
            let j;
            if(i == lineNumber){
                j = endP+1;
            }
            for(; j<lines[i].length; j++){
                let c = lines[i].charAt(j);
                if(c == ' ' || c == '\t'){
                    continue;
                } else if(c == ':'){
                    return {
                        name : line.substr(startP+1, endP-startP-1),
                        start: { line: lineNumber, character: startP },
                        end: { line: lineNumber, character: endP+1 }
                };
                } else {
                    return null;
                }
            }
        }

        return null;
    }

    /**
     * Convert Route info list to message
     * @param route Route info list
     */
    private _generateMessage(route:BracketInfo[]):string{
        let message:string = workspace.getConfiguration().get('jsonHelper.object.name');
        //JSON is a list
        if(route[0].notation == '[' && route[0].keyName == ''){
            message += '['+route[0].listIndex+']';
        }

        for(var i=1; i<route.length; i++){
            let bInfo = route[i];
            if(bInfo.notation == '{' && bInfo.keyName != ''){
                message += `[${this._generateDocLinkCommandStr(bInfo.keyName, bInfo.keyRange.start, bInfo.keyRange.end, "Show key")}]`;
            } else if(bInfo.notation == '[' && bInfo.keyName != ''){
                message += `[${this._generateDocLinkCommandStr(bInfo.keyName, bInfo.keyRange.start, bInfo.keyRange.end, "Show key")}][${bInfo.listIndex}]`;
            }
        }
        return message;
    }

    /**
     * execute
     * @param document Document
     * @param position Position
     * @param token Token
     */
    public execute(document : TextDocument, position : Position, token : CancellationToken) : Hover{
        //connection.console.log(documents.get(event.textDocument.uri).getText());
        let text: string = document.getText();
        let lines = text.split(/\r?\n/g);
        let route = [];
        let isInDoublequotation = false;
        let message = '';
        let loopEnd = false;
        //lastest label in double quotation
        let bLabel = '';
        //lastest double quotation start postion
        let bLabelStart:Position;
        //lastest double quotation end postion
        let bLabelEnd:Position
        let isAfterColon = false;

        let keyCursorIn = this._getKeyCursorIn(lines, position.line, position.character);
        if(!keyCursorIn){
            return null;
        }


        for(var i=0; i<=position.line; i++){
            if(loopEnd){
                break;
            }

            let line = lines[i];
            for(var j=0; j<line.length; j++){
                if(loopEnd){
                    break;
                }

                if(i == position.line && j == position.character){
                    break;
                }

                let c = line.charAt(j);
                // double quatation switch
                if(c == '"'){
                    isInDoublequotation = !isInDoublequotation;
                    if(isInDoublequotation){
                        bLabel ='';
                        bLabelStart = new Position(i, j);
                    } else {
                        bLabelEnd = new Position(i, j + 1);
                    }
                } else {
                    if(isInDoublequotation){
                        bLabel += c;
                        if(c == "\\"){
                            //escape character support
                            bLabel += line.charAt(j + 1);
                            j += 1;
                        }
                        continue;
                    }
                }

                if(c == ':'){
                    isAfterColon = true;
                } 

                switch(c){
                    case '{':
                    case '[':
                        let bInfo = new BracketInfo();
                        bInfo.line = i;
                        bInfo.character = j;
                        bInfo.notation = c;
                        if(isAfterColon){
                            bInfo.keyName = bLabel;
                            bInfo.keyRange = new Range(bLabelStart, bLabelEnd);
                        }
                        route.push(bInfo);
                        break;
                    case '}':
                    case ']':
                        if(route[route.length-1].getClosureNotation() == c){
                            route.pop();
                        } else {
                            message = 'Incorrect JSON Format!';
                            loopEnd = true;
                        }
                        break;;
                    case ',':
                        if(route.length > 0 && route[route.length-1].notation == '['){
                            route[route.length-1].listIndex++;
                        }
                        break;
                    default:
                        break;
                }

                if(c != ' ' && c != ':' && c != '\r' && c != '\n' && c != '\t'){
                    isAfterColon = false;
                }
            }
        }

        if(!loopEnd){
            message = `${this._generateMessage(route)}[${this._generateDocLinkCommandStr(keyCursorIn.name, keyCursorIn.start, keyCursorIn.end, "Show key")}]`;
            //message = this._generateMessage(route) + '["' + keyCursorIn.name + '"]';
        }


        let hoverContent = new MarkdownString(message);
        hoverContent.isTrusted = true;

        let range = new Range(new Position(keyCursorIn.start.line, keyCursorIn.start.character), 
        						new Position(keyCursorIn.end.line, keyCursorIn.end.character));

        return new Hover(hoverContent,range);
    }
}