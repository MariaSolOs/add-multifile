import { commands, window } from 'vscode';
import type { ExtensionContext } from 'vscode';

export const activate = (context: ExtensionContext) => {
    context.subscriptions.push(
        commands.registerCommand('multifile.add', () =>
            window.showInputBox({
                placeHolder: 'Select your template'
            }))
    );
};
