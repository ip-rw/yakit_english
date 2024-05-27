const {app, shell} = require("electron")
const process = require("process")

const isMac = process.platform === "darwin"

/**
 * @name Mac-Exclusive Context Menu Items
 * @type {Electron.MenuItemConstructorOptions}
 */
const macAppMenu = {
    label: app.name,
    submenu: [
        {role: "about"},
        {type: "separator"},
        {role: "services"},
        {type: "separator"},
        {role: "hide"},
        {role: "hideOthers"},
        {role: "unhide"},
        {type: "separator"},
        {role: "quit"}
    ]
}

/**
 * @name Developer Tools Menu Item
 * @type {Electron.MenuItemConstructorOptions}
 */
const devToolMenu = {
    label: "View",
    submenu: [
        {role: "reload", accelerator: ""},
        {role: "forceReload"},
        {role: "toggleDevTools"},
        {type: "separator"},
        {role: "resetZoom"},
        {role: "zoomIn"},
        {role: "zoomOut"},
        {type: "separator"},
        {role: "togglefullscreen"}
    ]
}

/**
 * @name Help Menu Item
 * @type {Electron.MenuItemConstructorOptions}
 */
const helpMenu = {
    role: "help",
    submenu: [
        {
            label: "Learn More",
            click: async () => {
                await shell.openExternal("https://www.yaklang.com")
            }
        },
        {
            label: "Yakit IDE",
            click: async () => {
                await shell.openExternal(`https://www.yaklang.com/products/intro`)
            }
        },
        {
            label: "Yaklang Documentation",
            click: async () => {
                await shell.openExternal("https://www.yaklang.com/docs/intro")
            }
        },
        {
            label: "Search Issues",
            click: async () => {
                await shell.openExternal("https://github.com/yaklang/yakit/issues")
            }
        }
    ]
}

/** @name Software Top Menu */
const MenuTemplate = [...(isMac ? [macAppMenu] : []), {role: "editMenu"}, devToolMenu, {role: "windowMenu"}, helpMenu]

module.exports = {MenuTemplate}
