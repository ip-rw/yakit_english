import {YakURL,} from "@/pages/yakURLTree/data";
import {yakitFailed} from "@/utils/notification";
import {requestYakURLList} from "./yakURLTree/netif";
import {showModal} from "@/utils/showModal";
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor";
import {showYakitModal, YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import {Divider} from "antd";
import { TreeNode } from "@/components/WebTree/WebTree";

const {ipcRenderer} = window.require("electron");

// export const showFile = (url: YakURL, content: string, setContent: (value: string) => void, setLoading: (value: boolean) => void) => {
//     url.Query = url.Query.map(queryItem => {
//         if (queryItem.Key === 'mode') {
//             return {...queryItem, Value: 'show'};  // If the key is 'mode'，Then change the value to 'show'
//         } else {
//             return queryItem;  // Otherwise, keep as is
//         }
//     });
//     setLoading(true);  // Before starting request, set loading state to true
//
//     requestYakURLList({url}).then(
//         (rsp) => {
//             content = rsp.Resources[0]?.Extra.find(extra => extra.Key === 'content')?.Value || '';
//             // Find the echoed result and assign its value 'content'
//             console.log(content);
//             setLoading(false);  // After request ends, set loading state to false
//             const edit = showYakitModal({
//                 title: "Edit Shell",
//                 width: "60%",
//                 onCancelText: "Back",
//                 onOkText: "Save",
//                 content: (
//                     <>
//                         <div style={{height: 500, overflow: "hidden"}}>
//                             <YakitEditor
//                                 type={"yak"}
//                                 value={content}
//                                 setValue={setContent}
//                             />
//                         </div>
//                         <Divider type='vertical' style={{margin: "5px 0px 0px 5px", top: 1}}/>
//                     </>
//                 ),
//                 onOk: () => {
//                     console.log("content: ", content)
//                     requestYakURLList({ url, method: "PUT" }, Buffer.from(content)).then((r) => {
//                         console.log(r);
//                         edit.destroy();
//                     }).catch((e) => {
//                             yakitFailed(`Update Failed: ${e}`);
//                         }
//                     );
//                 },
//                 onCancel: () => {
//                     edit.destroy();
//                 },
//
//                 modalAfterClose: () => edit && edit.destroy(),
//             });
//         }
//     ).finally(() => {
//             setLoading(false);
//         }
//     );
//
//     //     rsp => {
//     //     const content = rsp.Resources[0]?.Extra.find(extra => extra.Key === 'content')?.Value || '';
//     //     // Find the echoed result and assign its value 'content'
//     //     console.log(content);
//     //     setLoading(false);  // After request ends, set loading state to false
//     //     const edit = YakitModalConfirm({
//     //         title: "Edit Shell",
//     //         width: "60%",
//     //         onCancelText: "Back",
//     //         onOkText: "Save",
//     //         content: (
//     //             <div style={{height: 500, overflow: "hidden"}}>
//     //                 <YakitEditor
//     //                     type={"yak"}
//     //                     value={content}
//     //                     setValue={setContent}
//     //                 />
//     //             </div>
//     //         ),
//     //         onOk: () => {
//     //             requestYakURLList({ url, method: "PUT" }, "PUT", Buffer.from(content)).then((r) => {
//     //                 console.log(r);
//     //                 edit.destroy();
//     //             }).catch((e) => {
//     //                     yakitFailed(`Update Failed: ${e}`);
//     //                 }
//     //             );
//     //         },
//     //         onCancel: () => {
//     //             edit.destroy();
//     //         },
//     //
//     //         modalAfterClose: () => edit && edit.destroy(),
//     //     });
//     // }).finally(() => {
//     //     setLoading(false);
//     // });
//
// }

// Return to previous level
export const goBack = (url: YakURL, setLoading: (value: boolean) => void, setGoBackTree: (data: TreeNode[]) => void) => {
    url.Path = url.Path + "../"
    setLoading(true);  // Before starting request, set loading state to true

    requestYakURLList({url}, rsp => {
        const resources = rsp.Resources;
        let indexCounter = 0; // Set index counter
        const files: TreeNode[] = resources
            .filter(i => !i.HaveChildrenNodes) // Filter out items with children, i.e., files
            .map((i, index) => ({
                title: i.VerboseName,
                key: `${indexCounter++}`,
                data: i,
                isLeaf: !i.HaveChildrenNodes,
            }));

        const dirs: TreeNode[] = resources
            .filter(i => i.HaveChildrenNodes) // Filter out items without children, i.e., directories
            .map((i, index) => ({
                title: i.VerboseName,
                key: `${indexCounter++}`,
                data: i,
                isLeaf: !i.HaveChildrenNodes,
            }));
        setGoBackTree(dirs);
        setLoading(false);  // After request ends, set loading state to false
    });
}


export const updateFile = (url: YakURL, setLoading: (value: boolean) => void) => {
    url.Query = url.Query.map(queryItem => {
        if (queryItem.Key === 'mode') {
            return {...queryItem, Value: 'show'};  // If the key is 'mode'，Then change the value to 'show'
        } else {
            return queryItem;  // Otherwise, keep as is
        }
    });
    setLoading(true);  // Before starting request, set loading state to true

    requestYakURLList({url}, rsp => {
        const content = rsp.Resources[0]?.Extra.find(extra => extra.Key === 'content')?.Value || '';
        // Find the echoed result and assign its value 'content'
        setLoading(false);  // After request ends, set loading state to false
        const edit = showModal({
            title: "Edit Shell",
            width: "60%",
            content: (
                <div style={{height: 500, overflow: "hidden"}}>
                    <YakitEditor
                        type={"yak"}
                        value={content}
                        readOnly={true}
                    />
                </div>
            ),
            modalAfterClose: () => edit && edit.destroy(),
        });
    });
}