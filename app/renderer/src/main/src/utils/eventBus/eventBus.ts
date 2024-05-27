import mitt from "mitt"
import {MitmEventProps} from "./events/mitm"
import {WebFuzzerEventProps} from "./events/webFuzzer"
import {SimpleDetectEventProps} from "./events/simpleDetect"
import {EditorEventProps} from "./events/editor"
import {HistoryEventProps} from "./events/history"
import {PluginsEventProps} from "./events/plugins"
import {MainOperatorEventProps} from "./events/main"
import {PayLoadEventProps} from "./events/payload"
import {ProjectMagEventProps} from "./events/projectMag"
import {WebShellEventProps} from "./events/webShell"
import {RefreshDataEventProps} from "./events/refreshData"
import {UpdateYakitYaklangEventProps} from "./events/updateYakitYaklang"
import {GlobalEventProps} from "./events/global"
import {PluginBatchExecutorProps} from "./events/pluginBatchExecutor"

type Contrast<T extends object, E extends object> = [keyof T & keyof E] extends [never] ? never : string
type OneToArr<T extends object, E extends object[]> = E extends [infer X extends object, ...infer Y extends object[]]
    ? [Contrast<T, X>] extends [never]
        ? OneToArr<T, Y>
        : string
    : number
type ArrContrast<E extends object[]> = E extends [infer X extends object, ...infer Y extends object[]]
    ? OneToArr<X, Y> extends number
        ? ArrContrast<Y>
        : string
    : number
type Exchange<T> = T extends number ? boolean : never
type Joins<T extends object[]> = T extends [infer H extends object, ...infer U extends object[]] ? H & Joins<U> : {}

/**
 * @name Definition of the event bus signal source
 * @description Rules for defining event signals
 * - Event signal definition variable naming for each page: `${Page name (English)}EventProps`
 *
 * - The value sent by the event signal within the page, if no value is added, it is recommended to define as optional in TS，
 *   Prefer type string for definitions (Note: Complex types may lead to cross-type never type in signal definitions across pages.)
 *
 * - It’s advised not to set event listeners inside the map method of components; if necessary, solve how to distinguish listeners for the same event across different pages on your own.
 */
type Events = [
    MitmEventProps,
    WebFuzzerEventProps,
    SimpleDetectEventProps,
    EditorEventProps,
    HistoryEventProps,
    PluginsEventProps,
    MainOperatorEventProps,
    PayLoadEventProps,
    ProjectMagEventProps,
    WebShellEventProps,
    RefreshDataEventProps,
    UpdateYakitYaklangEventProps,
    GlobalEventProps,
    PluginBatchExecutorProps
]

type CheckVal = Exchange<ArrContrast<Events>>
// !!! This variable declaration must not be changed
// If the editor (vscode) reports an error for this variable, it indicates a duplicate signal declaration; please check for duplicates.
let checkVal: CheckVal = true

const emiter = mitt<Joins<Events>>()

export default emiter
