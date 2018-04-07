'use strict';

//import * as path from 'path';

import { workspace, ExtensionContext, commands, window, languages, Hover, StatusBarAlignment, StatusBarItem } from 'vscode';
import { JsonHelperHoverProvider } from './JsonHelperHoverProvider';
// import { JsonSidebarProvider } from './JsonSidebarProvider';
import { LinkToDocCommandArgs, DocLink } from './commands/DocLink';
import { CopyToClipboard } from './commands/CopyToClipboard';
import { JsonCommonInfo } from './JsonCommonInfo';
import { StatusBarController } from './StatusBarController';
import * as cCmd from './commands/CommandCommonInfo';
import { MoveToPreKey, MoveToNextKey } from './commands/Navigator';
import { JsonQuickPicker } from './commands/JsonQuickPicker';

let statusIconMovePreKey:StatusBarItem, statusIconMoveNextKey:StatusBarItem;

export function activate(context: ExtensionContext) {

	const jsonCommonInfo = new JsonCommonInfo();
	const jsonHelperHoverProvider = new JsonHelperHoverProvider(jsonCommonInfo);

	let disposable = languages.registerHoverProvider('json', jsonHelperHoverProvider);
	
	context.subscriptions.push(disposable);

	// Register docLink command
	disposable = commands.registerCommand(cCmd.DOCLINK_COMMAND, (args:LinkToDocCommandArgs = {}) => {
		new DocLink().linkToDoc(args);
	});

	context.subscriptions.push(disposable);

	// Register copyToClipboard command
	disposable = commands.registerCommand(cCmd.COPYTOCLIPBOARD_COMMAND, (args = {}) => {
		if(!args.text){
			return;
		}
		new CopyToClipboard().copy(args.text);
	});

	context.subscriptions.push(disposable);

	// Register showNodesInQuickPick command
	const jsonQuickPicker = new JsonQuickPicker(jsonCommonInfo);

	disposable = commands.registerCommand(cCmd.SHOW_NODES_QUICK_PICK_CMD, (args = {}) => {
		if(!args.path){
			return;
		}
		jsonQuickPicker.showChildBrotherNode(args.path);
	});

	context.subscriptions.push(disposable);

	//Navigator
	const moveToPreKey = new MoveToPreKey(jsonCommonInfo);
	const moveToNextKey = new MoveToNextKey(jsonCommonInfo);

	context.subscriptions.push(commands.registerTextEditorCommand(cCmd.MOVE_PRE_CMD, (textEditor, edit, ...args: any[]) =>{
		moveToPreKey.move(textEditor, edit, args);
	}));

	context.subscriptions.push(commands.registerTextEditorCommand(cCmd.MOVE_NEXT_CMD, (textEditor, edit, ...args: any[]) =>{
		moveToNextKey.move(textEditor, edit, args);
	}));


	//status bar navigation icon
	statusIconMovePreKey = window.createStatusBarItem(StatusBarAlignment.Left, 11);
	statusIconMoveNextKey = window.createStatusBarItem(StatusBarAlignment.Left, 10);
	new StatusBarController(jsonCommonInfo, statusIconMovePreKey, statusIconMoveNextKey);
}

function deactivate() {
	if(statusIconMovePreKey){
		statusIconMovePreKey.hide();
		statusIconMovePreKey.dispose();
		statusIconMovePreKey = null;
	}
	if(statusIconMoveNextKey){
		statusIconMoveNextKey.hide();
		statusIconMoveNextKey.dispose();
		statusIconMoveNextKey = null;
	}
}