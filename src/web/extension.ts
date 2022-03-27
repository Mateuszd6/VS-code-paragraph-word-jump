import * as vscode from 'vscode';

// TODO: Figure out how to recognize alpha numerics correctly in vscode
function isAlpha(ch: string) {
    return ((ch >= 'a' && ch <= 'z') ||
            (ch >= 'A' && ch <= 'Z') ||
            (ch >= '0' && ch <= '9') ||
            ch === '_');
}

function getLineIndexUp(document: vscode.TextDocument, sel: vscode.Selection, hungry: boolean): vscode.Position {
    let lineIdx = sel.active.line;

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

function getLineIndexDown(document: vscode.TextDocument, sel: vscode.Selection, hungry: boolean): vscode.Position {
    const lastLineIdx = document.lineCount - 1;
    let lineIdx = sel.active.line;

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
    const document = editor.document;
    const sels: vscode.Selection[] = [];
    editor.selections.forEach(sel => {
        const moveTo = (moveForward
                        ? getLineIndexDown(document, sel, hungry)
                        : getLineIndexUp(document, sel, hungry));

        sels.push(new vscode.Selection(select ? sel.anchor : moveTo, moveTo));
    });

    editor.selections = sels;
    if (editor.selections.length === 1) {
        const toReveal = moveForward ? sels[0].end : sels[0].start;
        editor.revealRange(new vscode.Range(toReveal, toReveal));
    }
}

function travelWord(editor: vscode.TextEditor, moveForward: boolean, select: boolean, kill: boolean) {
    const document = editor.document;
    const sels: vscode.Selection[] = [];
    const kills: vscode.Range[] = [];
    let somethingToKill = true; // TODO: set to false

    editor.selections.forEach(sel => {
        const startPos = sel.active;
        const pos = (moveForward
                    ? getWordPosForward(document, startPos)
                    : getWordPosBackward(document, startPos));

        // Avoid deleting when range is empty, because it records undo
        somethingToKill = somethingToKill || pos.compareTo(startPos) !== 0;

        if (kill) {
            const rangeToDelete = (moveForward
                                   ? new vscode.Range(startPos, pos)
                                   : new vscode.Range(pos, startPos));
            kills.push(rangeToDelete);
        } 
        else {
            sels.push(new vscode.Selection(select ? sel.anchor : pos, pos));
        }
    });

    if (kill && somethingToKill) {
        editor.edit((eb: vscode.TextEditorEdit) => {
            kills.forEach((range: vscode.Range) => {
                eb.delete(range);
            });
        }).then((succ: boolean) => {
            if (succ) {
                const s: vscode.Selection[] = [];
                kills.forEach((range: vscode.Range) => {
                    s.push(new vscode.Selection(range.start, range.start));
                });

                editor.selections = s;
                if (editor.selections.length === 1) {
                    editor.revealRange(new vscode.Range(s[0].end, s[0].end));
                }
            }
        }).then(undefined, err => {
            vscode.window.showErrorMessage("ERROR: " + String(err));
        });
    } 
    else {
        editor.selections = sels;
        if (editor.selections.length === 1) {
            const toReveal = moveForward ? sels[0].end : sels[0].start;
            editor.revealRange(new vscode.Range(toReveal, toReveal));
        }
    }
}

export function activate(context: vscode.ExtensionContext)  {
    // TODO: log something?
    const exportFuncs = [
        vscode.commands.registerTextEditorCommand(
            "faster-para-word-movement.paraDown", (ed) => travelPara(ed, true, false, false)),
        vscode.commands.registerTextEditorCommand(
            "faster-para-word-movement.paraDownSelect", (ed) => travelPara(ed, true, false, true)),
        vscode.commands.registerTextEditorCommand(
            "faster-para-word-movement.paraDownHungry", (ed) => travelPara(ed, true, true, false)),
        vscode.commands.registerTextEditorCommand(
            "faster-para-word-movement.paraDownSelectHungry", (ed) => travelPara(ed, true, true, true)),
        vscode.commands.registerTextEditorCommand(
            "faster-para-word-movement.paraUp", (ed) => travelPara(ed, false, false, false)),
        vscode.commands.registerTextEditorCommand(
            "faster-para-word-movement.paraUpSelect", (ed) => travelPara(ed, false, false, true)),
        vscode.commands.registerTextEditorCommand(
            "faster-para-word-movement.paraUpHungry", (ed) => travelPara(ed, false, true, false)),
        vscode.commands.registerTextEditorCommand(
            "faster-para-word-movement.paraUpSelectHungry", (ed) => travelPara(ed, false, true, true)),
        vscode.commands.registerTextEditorCommand(
            "faster-para-word-movement.wordRightHungry", (ed) => travelWord(ed, true, false, false)),
        vscode.commands.registerTextEditorCommand(
            "faster-para-word-movement.wordRightSelectHungry", (ed) => travelWord(ed, true, true, false)),
        vscode.commands.registerTextEditorCommand(
            "faster-para-word-movement.wordLeftHungry", (ed) => travelWord(ed, false, false, false)),
        vscode.commands.registerTextEditorCommand(
            "faster-para-word-movement.wordLeftSelectHungry", (ed) => travelWord(ed, false, true, false)),
        vscode.commands.registerTextEditorCommand(
            "faster-para-word-movement.wordLeftKillHungry", (ed) => travelWord(ed, false, false, true)),
        vscode.commands.registerTextEditorCommand(
            "faster-para-word-movement.wordRightKillHungry", (ed) => travelWord(ed, true, false, true))
    ];

    context.subscriptions.push(...exportFuncs);
}

export function deactivate() {
}
