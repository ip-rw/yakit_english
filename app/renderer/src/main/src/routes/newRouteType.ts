/** @name Primary Menu Item Attrs */
export interface SendDatabaseFirstMenuProps {
    /** @name Primary Menu Display Name */
    Group: string
    /** @name Submenu Items */
    Items: SendDatabaseSecondMenuProps[]
    /** @name Primary Menu Order */
    GroupSort: number
    /** @name Menu Mode */
    Mode: string
    /** @name Primary Menu Initial Val */
    GroupLabel: string
}
/** @name Submenu Item Attrs */
export interface SendDatabaseSecondMenuProps {
    /** @name Plugin Name */
    YakScriptName: string
    /** @name Menu Mode */
    Mode: string
    /** @name Submenu Order */
    VerboseSort: number
    /** @name Primary Menu Order */
    GroupSort: number
    /** @name Submenu Route */
    Route: string
    /** @name Submenu Display Name */
    Verbose: string
    /** @name Submenu Initial Val */
    VerboseLabel: string
    /** @name Primary Menu Display Name */
    Group: string
    /** @name Primary Menu Initial Val */
    GroupLabel: string
}
