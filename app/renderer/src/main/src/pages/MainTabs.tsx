const {ipcRenderer} = window.require("electron")

// IPC Comm - Open Page Remotely
export const addToTab = (type: string, data?: any) => {
    ipcRenderer.invoke("send-to-tab", {type, data})
}
