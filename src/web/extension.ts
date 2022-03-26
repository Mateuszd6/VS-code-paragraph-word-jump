import * as vscode from 'vscode';

// TODO: Figure out how to recognize alpha numerics correctly in vscode
function isAlpha(ch: string) {
    return ((ch >= 'a' && ch <= 'z') ||
            (ch >= 'A' && ch <= 'Z') ||
            (ch >= '0' && ch <= '9') ||
            ch == '_');
}

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
            const idxInLine = (lineIdx === lastLineIdx
                               ? document.lineAt(lineIdx).text.length
                               : 0);
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

function getWordPosForward(document: vscode.TextDocument, startPos: vscode.Position) {
    // If outside of word, first skip to the first alpha character,
    // possibly moving to the next line
    let lineIdx = startPos.line;
    let charIdx = startPos.character;
    let currLine = document.lineAt(lineIdx).text;
    const lastLineIdx = document.lineCount - 1;

    if (charIdx === currLine.length || !isAlpha(currLine.charAt(charIdx))) {
        for (;;) {
            while (charIdx < currLine.length && !isAlpha(currLine.charAt(charIdx))) {
                charIdx++;
            }

            // If in word or end of buffer is reached, break
            if (lineIdx === lastLineIdx || isAlpha(currLine.charAt(charIdx))) {
                break;
            }

            lineIdx++;
            currLine = document.lineAt(lineIdx).text;
            charIdx = 0;
        }
    }

    // Now move to the end of a current character
    while (charIdx < currLine.length && isAlpha(currLine.charAt(charIdx))) {
        charIdx++;
    }

    return new vscode.Position(lineIdx, charIdx);
}

function getWordPosBackward(document: vscode.TextDocument, startPos: vscode.Position) {

    // If outside of word, first skip to the first alpha character,
    // possibly moving to the next line
    let lineIdx = startPos.line;
    let charIdx = startPos.character;
    let currLine = document.lineAt(lineIdx).text;

    if (charIdx === 0 || !isAlpha(currLine.charAt(charIdx - 1))) {
        for (;;) {
            while (charIdx > 0 && !isAlpha(currLine.charAt(charIdx - 1))) {
                charIdx--;
            }

            // If in word or end of buffer is reached, break
            if (lineIdx === 0 || isAlpha(currLine.charAt(charIdx - 1))) {
                break;
            }

            lineIdx--;
            currLine = document.lineAt(lineIdx).text;
            charIdx = currLine.length;
        }
    }

    // Now move to the end of a current character
    while (charIdx > 0 && isAlpha(currLine.charAt(charIdx - 1))) {
        charIdx--;
    }

    return new vscode.Position(lineIdx, charIdx);
}

function travelPara(editor: vscode.TextEditor, moveForward: boolean, hungry: boolean, select: boolean) {
    const moveTo = (moveForward
                    ? getLineIndexDown(editor, hungry)
                    : getLineIndexUp(editor, hungry));
    editor.selection = new vscode.Selection(select ? editor.selection.anchor : moveTo, moveTo);
    editor.revealRange(new vscode.Range(moveTo, moveTo));
}

function travelWord(editor: vscode.TextEditor, moveForward: boolean, select: boolean, kill: boolean) {
    const document = editor.document;
    const startPos = editor.selection.active;
    const pos = (moveForward
                 ? getWordPosForward(document, startPos)
                 : getWordPosBackward(document, startPos));

    // Avoid deleting when range is empty, because it records undo
    if (kill && (pos.compareTo(startPos) !== 0)) {
        editor.edit((eb: vscode.TextEditorEdit) => {
            let rangeToDelete = (moveForward
                                 ? new vscode.Range(startPos, pos)
                                 : new vscode.Range(pos, startPos));
            eb.delete(rangeToDelete);
        }).then((succ: boolean) => {
            if (succ) {
                const endPos = moveForward ? startPos : pos;
                editor.selection = new vscode.Selection(endPos, endPos);
                editor.revealRange(new vscode.Range(endPos, endPos));
            }
        });
    } else {
        editor.selection = new vscode.Selection(select ? editor.selection.anchor : pos, pos);
        editor.revealRange(new vscode.Range(pos, pos));
    }
}

export function activate(context: vscode.ExtensionContext)  {
    // TODO: log something?
    const exportFuncs = [
        vscode.commands.registerTextEditorCommand(
            "hungry-movement.paraDown", 
            function(editor) { travelPara(editor, true, false, false) }),
        vscode.commands.registerTextEditorCommand(
            "hungry-movement.paraDownSelect", 
            function(editor) { travelPara(editor, true, false, true) }),
        vscode.commands.registerTextEditorCommand(
            "hungry-movement.paraDownHungry", 
            function(editor) { travelPara(editor, true, true, false) }),
        vscode.commands.registerTextEditorCommand(
            "hungry-movement.paraDownSelectHungry", 
            function(editor) { travelPara(editor, true, true, true) }),
        vscode.commands.registerTextEditorCommand(
            "hungry-movement.paraUp", 
            function(editor) { travelPara(editor, false, false, false) }),
        vscode.commands.registerTextEditorCommand(
            "hungry-movement.paraUpSelect", 
            function(editor) { travelPara(editor, false, false, true) }),
        vscode.commands.registerTextEditorCommand(
            "hungry-movement.paraUpHungry", 
            function(editor) { travelPara(editor, false, true, false) }),
        vscode.commands.registerTextEditorCommand(
            "hungry-movement.paraUpSelectHungry", 
            function(editor) { travelPara(editor, false, true, true) }),
        vscode.commands.registerTextEditorCommand(
            "hungry-movement.wordRightHungry", 
            function(editor) { travelWord(editor, true, false, false) }),
        vscode.commands.registerTextEditorCommand(
            "hungry-movement.wordRightSelectHungry", 
            function(editor) { travelWord(editor, true, true, false) }),
        vscode.commands.registerTextEditorCommand(
            "hungry-movement.wordLeftHungry", 
            function(editor) { travelWord(editor, false, false, false) }),
        vscode.commands.registerTextEditorCommand(
            "hungry-movement.wordLeftSelectHungry", 
            function(editor) { travelWord(editor, false, true, false) }),
        vscode.commands.registerTextEditorCommand(
            "hungry-movement.wordLeftKillHungry", 
            function(editor) { travelWord(editor, false, false, true) }),
        vscode.commands.registerTextEditorCommand(
            "hungry-movement.wordRightKillHungry", 
            function(editor) { travelWord(editor, true, false, true) })
    ];

    context.subscriptions.push(...exportFuncs);
}

export function deactivate() {
}
