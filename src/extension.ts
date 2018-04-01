'use strict';

//import * as path from 'path';

import { workspace, ExtensionContext, commands, window, languages, Hover, StatusBarAlignment } from 'vscode';
import { JsonHelperHoverProvider } from './JsonHelperHoverProvider';
// import { JsonSidebarProvider } from './JsonSidebarProvider';
import { LinkToDocCommandArgs, DocLink } from './commands/DocLink';
import { CopyToClipboard } from './commands/CopyToClipboard';
import { JsonCommonInfo } from './JsonCommonInfo';
import { StatusBarController } from './StatusBarController';
import * as cCmd from './commands/CommandCommonInfo';
import { MoveToPreKey, MoveToNextKey } from './commands/Navigator';

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
	const statusIconMovePreKey = window.createStatusBarItem(StatusBarAlignment.Left, 11);
	const statusIconMoveNextKey = window.createStatusBarItem(StatusBarAlignment.Left, 10);
	new StatusBarController(jsonCommonInfo, statusIconMovePreKey, statusIconMoveNextKey);

	// const jsonSidebarProvider = new JsonSidebarProvider(jsonCommonInfo, context);

	// context.subscriptions.push(
	// 	window.registerTreeDataProvider('jsonHelperSidebar', jsonSidebarProvider)
	// );
	// context.subscriptions.push(
	// 	commands.registerCommand('jsonHelperSidebar.refresh', () => jsonSidebarProvider.refresh())
	// );
	// context.subscriptions.push(
	// 	commands.registerCommand('jsonHelperSidebar.refreshNode', offset => jsonSidebarProvider.refresh(offset))
	// );
	// context.subscriptions.push(
	// 	commands.registerCommand('jsonHelperSidebar.renameNode', offset => jsonSidebarProvider.rename(offset))
	// );
}
