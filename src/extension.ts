'use strict';

//import * as path from 'path';

import { workspace, ExtensionContext, commands, window, languages, Hover } from 'vscode';
import { JsonHelper } from './JsonHelper';
import { LinkToDocCommandArgs, DocLink } from './commands/DocLink';

export function activate(context: ExtensionContext) {

	let disposable = languages.registerHoverProvider('json', {
			provideHover(document, position, token) {
				return new JsonHelper().execute(document, position, token);
			}
		});
	
	context.subscriptions.push(disposable);

	// Register docLink command
	disposable = commands.registerCommand('jsonHelper.docLink', (args:LinkToDocCommandArgs = {}) => {
		new DocLink().linkToDoc(args);
		//window.showInformationMessage('Hello World!');
	});

	context.subscriptions.push(disposable);
}
