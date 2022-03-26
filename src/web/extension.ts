import * as vscode from 'vscode';

function emptyLineBelow(editor: vscode.TextEditor, hungry: boolean) {
    const document = editor.document;
    let line = editor.selection.active.line;
    let max = document.lineCount - 1;

    // First, if we are in whitespace we first need to skip to the end of an island
    if (document.lineAt(line).isEmptyOrWhitespace) {
        while (line < max && document.lineAt(line + 1).isEmptyOrWhitespace) {
            line++;
        }

        if (line === max) { // TODO: Perhaps not necesarry?
            return document.lineAt(line);
        }
        
        // TODO: Don't do this if not in hungry mode?
        line++;
    }

    while (line < max && !document.lineAt(line).isEmptyOrWhitespace) {
        line++;
    }

    return document.lineAt(line);
}

function travelParagraphDown(editor: vscode.TextEditor, hungry: boolean, select: boolean) {
    const line = emptyLineBelow(editor, hungry);
    const newPosn = new vscode.Position(line.lineNumber, line.text.length); // End of line, in case is last line
    editor.selection = new vscode.Selection(select ? editor.selection.anchor : newPosn, newPosn);
    editor.revealRange(new vscode.Range(newPosn, newPosn));
}

export function activate(context: vscode.ExtensionContext)  {
	console.log('Congratulations, your extension "test1" is now active in the web extension host!');

	let disposable = vscode.commands.registerCommand('test1.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from test1 in a web extension host!');
	});

    var jumpDown = vscode.commands.registerTextEditorCommand("test1.travelParagraphDown", function(editor) {
        travelParagraphDown(editor, true, false);
    });

    var jumpDownSelect = vscode.commands.registerTextEditorCommand("test1.selectParagraphDown", function(editor) {
        travelParagraphDown(editor, true, true);
    });

    context.subscriptions.push(disposable, jumpDown, jumpDownSelect);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
