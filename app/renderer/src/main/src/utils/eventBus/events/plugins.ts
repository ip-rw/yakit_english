export type PluginsEventProps = {
    /** Refresh Local Plugin List */
    onRefLocalPluginList: string
    /** Trigger Edit Plugin Function Plugin ID */
    sendEditPluginId: string
    /** Create|Signal Sent After Editing Plugin Successfully (Includes Local & Online Save, Data Definition [SavePluginInfoSignalProps]]) */
    savePluginInfoSignal: string
    /** Refresh Plugin Store List */
    onRefOnlinePluginList: string
    /** Refresh My Plugins List */
    onRefUserPluginList: string
    /** Refresh Selected Plugin Data on Local Plugin Detail Page */
    onRefLocalDetailSelectPlugin: string
    /** Signal Sent After Modifying Private Domain Successfully */
    onSwitchPrivateDomain: string
    /** Import Refresh Local Plugin List */
    onImportRefLocalPluginList: string
    /** Refresh Local Plugin Group List in Plugin Group Management */
    onRefPluginGroupMagLocalQueryYakScriptGroup: string
    /** Refresh Local Plugin List in Plugin Group Management */
    onRefPluginGroupMagLocalPluginList: string
    /** Refresh Online Plugin Group List in Plugin Group Management */
    onRefPluginGroupMagOnlineQueryYakScriptGroup: string
    /** Refresh Online Plugin List in Plugin Group Management */
    onRefPluginGroupMagOnlinePluginList: string
    /** Refresh Selected Plugin Group in PluginGroup */
    onRefpluginGroupSelectGroup: string
    /** Refresh Online Plugin Group Management List */
    onRefpluginGroupList?: string
    /**Refresh Plugin Data on Single Execution Page */
    onRefSinglePluginExecution?: string
}
