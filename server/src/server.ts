'use strict';

import {
	IPCMessageReader, IPCMessageWriter, createConnection, IConnection, TextDocuments,
	 InitializeResult, Hover, MarkedString
} from 'vscode-languageserver';

// Create a connection for the server. The connection uses Node's IPC as a transport
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initialize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilities.
connection.onInitialize((_params): InitializeResult => {
	return {
		capabilities: {
			// Tell the client that the server works in FULL text document sync mode
			textDocumentSync: documents.syncKind,
			// Announce that the extension provides hover 
			hoverProvider: true
		}
	}
});

const ROOT_NAME = 'jsonObj';


//bracket information class
class BracketInfo {
	public keyName = '';
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

//get string for the key cursor's hovering now
function getKeyCursorIn(lines:string[], lineNumber:number, character:number):any{
	let startP, endP;
	let line = lines[lineNumber];
	//calculate the start point
	for(var i=character; i>=0; i--){
		if(line[i] == '"'){
			startP = i;
			break;
		}
	}
	if(!startP){
		return null;
	}

	//calculate the end point
	for(var i=character+1; i<line.length; i++){
		if(line[i] == '"'){
			endP = i;
			break;
		}
	}
	if(!endP){
		return null;
	}

	//make sure it's a key
	for(var i=lineNumber; i<lines.length; i++){
		let j;
		if(i == lineNumber){
			j = endP+1;
		}
		for(; j<lines[i].length; j++){
			let c = lines[i].charAt(j);
			if(c == ' '){
				continue;
			} else if(c == ':'){
				return {
					name : line.substr(startP+1, endP-startP-1),
					start: { line: lineNumber, character: startP+1 },
					 end: { line: lineNumber, character: endP }
			   };
			} else {
				return null;
			}
		}
	}

	return null;
}

function generateMessage(route:BracketInfo[]):string{
	let message = ROOT_NAME;
	for(var i=0; i<route.length; i++){
		let bInfo = route[i];
		if(bInfo.notation == '{' && bInfo.keyName != ''){
			message += '["' + bInfo.keyName + '"]';
		} else if(bInfo.notation == '[' && bInfo.keyName != ''){
			message += '["' + bInfo.keyName + '"]' + '['+bInfo.listIndex+']';
		}
	}
	return message;
}


connection.onHover((event):Hover =>{
	//connection.console.log(documents.get(event.textDocument.uri).getText());
	let text: string = documents.get(event.textDocument.uri).getText();
	let lines = text.split(/\r?\n/g);
	let route = [];
	let isInDoublequotation = false;
	let message = '';
	let loopEnd = false;
	let bLabel = '';
	let isAfterColon = false;

	let keyCursorIn = getKeyCursorIn(lines, event.position.line, event.position.character);
	if(!keyCursorIn){
		return null;
	}


	for(var i=0; i<=event.position.line; i++){
		if(loopEnd){
			break;
		}

		let line = lines[i];
		for(var j=0; j<line.length; j++){
			if(loopEnd){
				break;
			}

			if(i == event.position.line && j == event.position.character){
				break;
			}

			let c = line.charAt(j);
			if(c == '"'){
				isInDoublequotation = !isInDoublequotation;
				if(isInDoublequotation){
					bLabel ='';
				}
			} else {
				if(isInDoublequotation){
					bLabel += c;
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

			if(c != ' ' && c != ':'){
				isAfterColon = false;
			}
		}
	}

	if(!loopEnd){
		message = generateMessage(route) + '["' + keyCursorIn.name + '"]';
	}

	let hoverContent:MarkedString = {
		language : "javascript",
		value : message
	};

	return {
			contents:hoverContent, 
			range:{
				start: { line: keyCursorIn.start.line, character: keyCursorIn.start.character },
				end: { line: keyCursorIn.end.line, character: keyCursorIn.end.character }
		}};
	
});

// Listen on the connection
connection.listen();
