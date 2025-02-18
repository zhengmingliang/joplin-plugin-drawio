import joplin from 'api'
import { ContentScriptType, MenuItem, MenuItemLocation } from 'api/types'
import { Settings } from './settings'
import { EmptyDiagram, EditorDialog } from './editorDialog'
import { isDiagramResource } from './resources'
import { ChangeEvent } from 'api/JoplinSettings'
import { tmpdir } from 'os'
import { sep } from 'path'
const fs = joplin.require('fs-extra')

const Config = {
    ContentScriptId: 'drawio-content-script',
    DiagramsCacheFolder: `${tmpdir}${sep}joplin-drawio-plugin${sep}`,
}

const CommandsId = {
    NewDiagramPng: 'drawio-new-diagram-png',
    NewDiagramSvg: 'drawio-new-diagram-svg',
    NewSketchPng: 'drawio-new-sketch-png',
    NewSketchSvg: 'drawio-new-sketch-svg',
}

// new clearDiskCache function
function clearDiskCache(): void {
    fs.emptyDirSync(Config.DiagramsCacheFolder)
}

joplin.plugins.register({
    onStart: async function () {
        const settings = new Settings()
        const dialog = new EditorDialog(settings)
        // const resourceDir = await joplin.settings.globalValue('resourceDir')

        // Clean and create cache folder
        clearDiskCache()

        // Register settings
        await settings.register()
        joplin.settings.onChange(async (event: ChangeEvent) => {
            await settings.read(event)
            dialog.reset()
        })

        // Register command
        await joplin.commands.register({
            name: CommandsId.NewDiagramPng,
            label: '创建新的图表(PNG格式)',
            iconName: 'fa fa-pencil',
            execute: async () => {
                await dialog.new(EmptyDiagram.PNG)
            },
        })
        await joplin.commands.register({
            name: CommandsId.NewDiagramSvg,
            label: '创建新的图表(SVG)',
            iconName: 'fa fa-pencil',
            execute: async () => {
                await dialog.new(EmptyDiagram.SVG)
            },
        })
        await joplin.commands.register({
            name: CommandsId.NewSketchPng,
            label: '创建新草图(PNG)',
            iconName: 'fa fa-pencil',
            execute: async () => {
                await dialog.new(EmptyDiagram.PNG, true)
            },
        })
        await joplin.commands.register({
            name: CommandsId.NewSketchSvg,
            label: '创建新草图(SVG)',
            iconName: 'fa fa-pencil',
            execute: async () => {
                await dialog.new(EmptyDiagram.SVG, true)
            },
        })

        // Register menu
        const commandsSubMenu: MenuItem[] = Object.values(CommandsId).map(command => ({ commandName: command }))
        await joplin.views.menus.create('menu-drawio', 'Draw.io', commandsSubMenu, MenuItemLocation.Tools)

        // Content Scripts
        await joplin.contentScripts.register(
            ContentScriptType.MarkdownItPlugin,
            Config.ContentScriptId,
            './contentScript/contentScript.js',
        )
        /**
         * Messages handling
         */
        await joplin.contentScripts.onMessage(Config.ContentScriptId, async (request: { diagramId: string, action: string }) => {
            console.log('contentScripts.onMessage Input:', request)
            switch (request.action) {
                case 'edit':
                    await dialog.edit(request.diagramId)
                    await joplin.commands.execute('focusElement', 'noteBody')
                    return
                case 'check':
                    return { isValid: await isDiagramResource(request.diagramId) }
                default:
                    return `Invalid action: ${request.action}`
            }
        })
    },
});
