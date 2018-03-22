'use strict';

import { Range, window, Uri, workspace, Selection, Position } from 'vscode';

export interface LinkToDocCommandArgs {
    //uri?:Uri;
    start?: Position;
    end?: Position;
    // selRange?: Range;
    // selection?: Selection;
}

export class DocLink{
    constructor(){

    }

    /**
     * linkToDoc
     * @param args Arguments
     */
    public linkToDoc(args:LinkToDocCommandArgs = {}) : void{
        //workspace.openTextDocument()
        let editor = window.activeTextEditor;
        //let range = editor.document.lineAt(args.line).range;
        editor.selection =  new Selection(
            new Position(args.start.line, args.start.character),
            new Position(args.end.line, args.end.character)
        );
        let range = new Range(
            new Position(args.start.line, args.start.character),
            new Position(args.end.line, args.end.character)
        );
        editor.revealRange(range);
    }
}