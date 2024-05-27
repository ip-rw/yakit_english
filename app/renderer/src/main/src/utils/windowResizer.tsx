import React from "react";

export const hookWindowResize = (f: (e: UIEvent) => any) => {
    // Fix editor resize issue
    let origin = window.onresize;
    window.onresize = (e) => {
        f(e)
        // @ts-ignore
        if (origin) origin(e);
    };
    return () => {
        window.onresize = origin;
    }
}