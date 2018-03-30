'use strict';

//import * as path from 'path';

import { workspace, ExtensionContext, commands, window, languages, Hover } from 'vscode';
import { JsonHelperHoverProvider } from './JsonHelper';
import { LinkToDocCommandArgs, DocLink } from './commands/DocLink';
import { CopyToClipboard } from './commands/CopyToClipboard';

export function activate(context: ExtensionContext) {

	const jsonHelperHoverProvider = new JsonHelperHoverProvider();

	let disposable = languages.registerHoverProvider('json', jsonHelperHoverProvider);
	
	context.subscriptions.push(disposable);

	// Register docLink command
	disposable = commands.registerCommand('jsonHelper.docLink', (args:LinkToDocCommandArgs = {}) => {
		new DocLink().linkToDoc(args);
	});

	context.subscriptions.push(disposable);

	// Register copyToClipboard command
	disposable = commands.registerCommand('jsonHelper.copyToClipboard', (args = {}) => {
		if(!args.text){
			return;
		}
		new CopyToClipboard().copy(args.text);
	});

	context.subscriptions.push(disposable);
}
