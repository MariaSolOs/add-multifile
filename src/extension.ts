import { commands, Uri, window, workspace, WorkspaceEdit } from 'vscode';
import type { ExtensionContext, QuickPickItem as VSQuickPickItem } from 'vscode';

/**
 * Prefix for workspace settings.
 */
const EXTENSION_SECTION = 'addmultifile';

interface QuickPickItem extends VSQuickPickItem {
    /**
     * The template's name corresponding to this choice.
     */
    name: string;
}

/**
 * A multi-file template.
 */
type Template = {
    name: string;
    description?: string;
    items: string[];
};

const templateCache = new Map<string, Omit<Template, 'name'>>();

/**
 * Updates the template cache based on the workspace configuration.
 */
const updateTemplateItems = () => {
    templateCache.clear();

    const configuration = workspace.getConfiguration(EXTENSION_SECTION, null);
    const templates = configuration.get<Template[]>('templates', []);

    for (const { name, ...template } of templates) {
        templateCache.set(name, template);
    }
};

/**
 * @returns The array of template items to create based on the user's choice.
 */
const getItems = async () => {
    const templateEntries = Array.from(templateCache.entries());

    // If there's only one template, just use that one.
    if (templateEntries.length === 1) {
        return templateEntries[0]?.[1].items ?? [];
    }

    const templatePicks: QuickPickItem[] = templateEntries.map(([name, template]) => ({
        label: `$(new-folder) ${name}`,
        description: template.description,
        name
    }));

    const templatePick = await window.showQuickPick(templatePicks, {
        placeHolder: 'Select your template',
        canPickMany: false,
        matchOnDescription: true
    });

    return templateCache.get(templatePick?.name ?? '')?.items ?? [];
};

/**
 * Creates a template's items.
 *
 * @param rootUri - URI where the new multi-file item will be rooted at.
 * @param items - The template items.
 * @param args - Any extra arguments provided by the user.
 */
const createItems = async (rootUri: Uri, items: string[], args: string[]) => {
    const edit = new WorkspaceEdit();

    for (let item of items) {
        // Replace placeholders with the provided arguments.
        for (const [index, arg] of args.entries()) {
            item = item.replaceAll(`$${index}`, arg);
        }

        const itemUri = Uri.joinPath(rootUri, item);
        edit.createFile(itemUri);
    }

    await workspace.applyEdit(edit);
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
            const items = await getItems();
            const args = (await window.showInputBox({ placeHolder: 'Template arguments' }))?.split(' ') ?? [];
            await createItems(uri, items, args);
        })
    );
};
