import { commands, Uri, window, workspace } from 'vscode';
import type { ExtensionContext, QuickPickItem as VSQuickPickItem } from 'vscode';

const EXTENSION_SECTION = 'addmultifile';

interface QuickPickItem extends VSQuickPickItem {
    name: string;
}

type Template = {
    name: string;
    description?: string;
    items: string[];
};

const templateCache = new Map<string, Omit<Template, 'name'>>();

const updateTemplateItems = () => {
    templateCache.clear();

    const configuration = workspace.getConfiguration(EXTENSION_SECTION, null);
    const templates = configuration.get<Template[]>('templates', []);

    for (const { name, ...template } of templates) {
        templateCache.set(name, template);
    }
};

const buildTemplate = async (rootUri: Uri, items: string[], args: string[]) => {
    console.log(args);

    for (const item of items) {
        if (item.endsWith('/')) {
            // We have a folder
            const folderUri = Uri.joinPath(rootUri, item.slice(0, -1));
            await workspace.fs.createDirectory(folderUri);
        }

        const itemUri = Uri.joinPath(rootUri, item);
        console.log(itemUri);
    }
};

export const activate = (context: ExtensionContext) => {
    updateTemplateItems();

    context.subscriptions.push(workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration(EXTENSION_SECTION)) {
            updateTemplateItems();
        }
    }));

    context.subscriptions.push(
        commands.registerCommand('addmultifile.new', async (uri: Uri) => {
            const templatePicks: QuickPickItem[] = Array.from(templateCache.entries()).map((
                [name, template]
            ) => ({
                label: `$(new-folder) ${name}`,
                description: template.description,
                name
            }));

            const templatePick = await window.showQuickPick(templatePicks, {
                placeHolder: 'Select your template',
                canPickMany: false,
                matchOnDescription: true
            });
            if (!templatePick) {
                return;
            }

            const args = (await window.showInputBox({ placeHolder: 'Template arguments' }))?.split(' ') ?? [];

            const items = templateCache.get(templatePick.name)?.items ?? [];

            await buildTemplate(uri, items, args);
        })
    );
};
