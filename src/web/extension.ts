import * as vscode from 'vscode';

function getLineIndexUp(editor: vscode.TextEditor, hungry: boolean): vscode.Position {
    const document = editor.document;
    let lineIdx = editor.selection.active.line;
    
    // If we are on the whitespace line, but text island starts in the prev line and we 
    // are in hungry more, then we want to skip the island only, so it's easiest to just 
    // start from the prev line
    if (!hungry && 
        lineIdx > 0 && 
        document.lineAt(lineIdx).isEmptyOrWhitespace && 
        !document.lineAt(lineIdx - 1).isEmptyOrWhitespace) {
        lineIdx--;
    }

    if (document.lineAt(lineIdx).isEmptyOrWhitespace) {
        while (lineIdx > 0 && document.lineAt(lineIdx - 1).isEmptyOrWhitespace) {
            lineIdx--;
        }
        
        // If not in hungry mode, or we're already at the start, stop here
        if (!hungry || lineIdx === 0) {
            return new vscode.Position(lineIdx, 0);
        }

        lineIdx--;
    }

    while (lineIdx > 0 && !document.lineAt(lineIdx).isEmptyOrWhitespace) {
        lineIdx--;
    }

    return new vscode.Position(lineIdx, 0);
}

function getLineIndexDown(editor: vscode.TextEditor, hungry: boolean): vscode.Position {
    const document = editor.document;
    const lastLineIdx = document.lineCount - 1;
    let lineIdx = editor.selection.active.line;
    
    // If we are on the whitespace line, but text island starts in the next line and we 
    // are in hungry more, then we want to skip the island only, so it's easiest to just 
    // start from the next line
    if (!hungry && 
        lineIdx < lastLineIdx && 
        document.lineAt(lineIdx).isEmptyOrWhitespace && 
        !document.lineAt(lineIdx + 1).isEmptyOrWhitespace) {
        lineIdx++;
    }

    if (document.lineAt(lineIdx).isEmptyOrWhitespace) {
        while (lineIdx < lastLineIdx && document.lineAt(lineIdx + 1).isEmptyOrWhitespace) {
            lineIdx++;
        }
        
        // If not in hungry mode, or we're already at the end, stop here
        if (!hungry || lineIdx === lastLineIdx) {
            const idxInLine = lineIdx === lastLineIdx ? document.lineAt(lineIdx).text.length : 0;
            return new vscode.Position(lineIdx, idxInLine);
        }

        lineIdx++;
    }

    while (lineIdx < lastLineIdx && !document.lineAt(lineIdx).isEmptyOrWhitespace) {
        lineIdx++;
    }

    const idxInLine = lineIdx === lastLineIdx ? document.lineAt(lineIdx).text.length : 0;
    return new vscode.Position(lineIdx, idxInLine);
}

function travelPara(editor: vscode.TextEditor, moveDown: boolean, hungry: boolean, select: boolean) {
    const moveTo = moveDown ? getLineIndexDown(editor, hungry) : getLineIndexUp(editor, hungry);
    editor.selection = new vscode.Selection(select ? editor.selection.anchor : moveTo, moveTo);
    editor.revealRange(new vscode.Range(moveTo, moveTo));
}

export function activate(context: vscode.ExtensionContext)  {
	// TODO: log something?

    var jumpDown = vscode.commands.registerTextEditorCommand("test1.paraDown", function(editor) {
        travelPara(editor, true, false, false);
    });

    var jumpDownSelect = vscode.commands.registerTextEditorCommand("test1.paraDownSelect", function(editor) {
        travelPara(editor, true, false, true);
    });

    var jumpDownHungry = vscode.commands.registerTextEditorCommand("test1.paraDownHungry", function(editor) {
        travelPara(editor, true, true, false);
    });

    var jumpDownSelectHungry = vscode.commands.registerTextEditorCommand("test1.paraDownSelectHungry", function(editor) {
        travelPara(editor, true, true, true);
    });

    var jumpUp = vscode.commands.registerTextEditorCommand("test1.paraUp", function(editor) {
        travelPara(editor, false, false, false);
    });

    var jumpUpSelect = vscode.commands.registerTextEditorCommand("test1.paraUpSelect", function(editor) {
        travelPara(editor, false, false, true);
    });

    var jumpUpHungry = vscode.commands.registerTextEditorCommand("test1.paraUpHungry", function(editor) {
        travelPara(editor, false, true, false);
    });

    var jumpUpSelectHungry = vscode.commands.registerTextEditorCommand("test1.paraUpSelectHungry", function(editor) {
        travelPara(editor, false, true, true);
    });

    context.subscriptions.push(
        jumpDown, jumpDownSelect, jumpDownHungry, jumpDownSelectHungry,
        jumpUp, jumpUpSelect, jumpUpHungry, jumpUpSelectHungry);
}

export function deactivate() {
}
