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

function travelPara(editor: vscode.TextEditor, moveForward: boolean, hungry: boolean, select: boolean) {
    const moveTo = moveForward ? getLineIndexDown(editor, hungry) : getLineIndexUp(editor, hungry);
    editor.selection = new vscode.Selection(select ? editor.selection.anchor : moveTo, moveTo);
    editor.revealRange(new vscode.Range(moveTo, moveTo));
}

function isAlpha(ch: string) {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '_';
}

function travelWord(editor: vscode.TextEditor, moveForward: boolean, select: boolean) {
    const document = editor.document;

    // If outside of word, first skip to the first alpha character,
    // possibly moving to the next line
    let lineIdx = editor.selection.active.line;
    let charIdx = editor.selection.active.character;
    let currLine = document.lineAt(lineIdx).text;
    const lastLineIdx = document.lineCount - 1;
    
    if (!isAlpha(currLine.charAt(charIdx)) || charIdx === currLine.length) { 
        for (;;) {
            while (charIdx < currLine.length && !isAlpha(currLine.charAt(charIdx))) {
                charIdx++;
            }

            // If in word or end of buffer is reached, break
            if (isAlpha(currLine.charAt(charIdx)) || lineIdx === lastLineIdx) {
                break;
            }

            lineIdx++;
            charIdx = 0;
            currLine = document.lineAt(lineIdx).text;
        }
    }

    // Now move to the end of a current character
    while (charIdx < currLine.length && isAlpha(currLine.charAt(charIdx))) {
        charIdx++;
    }

    const pos = new vscode.Position(lineIdx, charIdx);
    editor.selection = new vscode.Selection(select ? editor.selection.anchor : pos, pos);
    editor.revealRange(new vscode.Range(pos, pos));
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

    var jumpWordRight = vscode.commands.registerTextEditorCommand("test1.wordRightHungry", function(editor) {
        travelWord(editor, true, false);
    });

    var jumpWordLeft = vscode.commands.registerTextEditorCommand("test1.wordLeftHungry", function(editor) {
        travelWord(editor, false, false);
    });

    context.subscriptions.push(
        jumpDown, jumpDownSelect, jumpDownHungry, jumpDownSelectHungry,
        jumpUp, jumpUpSelect, jumpUpHungry, jumpUpSelectHungry,
        jumpWordRight);
}

export function deactivate() {
}
