import ReactDOM from "react-dom"
import reportWebVitals from "./reportWebVitals"
/** This style must be placed before the APP component, as it contains antd styles that will override the styles within the APP component if placed after. */
import "./index.css"
import NewApp from "./NewApp"
import {HTML5Backend} from "react-dnd-html5-backend"
import {DndProvider} from "react-dnd"
// import {createRoot} from "react-dom/client"
import "./yakitUI.scss"
import "./theme/yakit.scss"
import "./yakitLib.scss"
import "./assets/global.scss"

// const divRoot = document.getElementById("root")
// if (divRoot) {
//     createRoot(divRoot).render(
//         // <React.StrictMode>
//         <DndProvider backend={HTML5Backend}>
//             <NewApp />
//         </DndProvider>
//         // </React.StrictMode>,
//     )
// } else {
//     // Normal situation./In theory, this situation should not occur.
//     createRoot(document.body).render(<div>This installer has issues, please contact Yakit official administrator.</div>)
// }
// ahooks useVirtualList has issues with flickering and frame drops when rendering with createRoot(divRoot).render, temporarily switch to ReactDOM.render, waiting for official fix.
// When there are multiple submenus in antd menu, using createRoot(divRoot).render can cause the previous submenu not to disappear when moving the mouse from one submenu to the next, the reason is unclear, will retry after upgrading to antd5.
ReactDOM.render(
    // <React.StrictMode>
    <DndProvider backend={HTML5Backend}>
        <NewApp />
    </DndProvider>,
    // </React.StrictMode>,
    document.getElementById("root")
)
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
