import has from "lodash/has"

export const isEqualObject = (obj1: object, obj2: object) => {
    // Check if two variables are of object type
    let isObj = toString.call(obj1) === "[object Object]" && toString.call(obj2) === "[object Object]"
    if (!isObj) {
        return false
    }

    // Check if lengths of two objects are equal, return false if not
    if (Object.keys(obj1).length !== Object.keys(obj2).length) {
        return false
    }

    // Check if every property value of two objects is equal
    for (const key in obj1) {
        // Check if keys of two objects are equal
        if (has(obj2, key)) {
            let obj1Type = toString.call(obj1[key])
            let obj2Type = toString.call(obj2[key])
            // If value is an object, recurse
            if (obj1Type === "[object Object]" || obj2Type === "[object Object]") {
                if (!isEqualObject(obj1[key], obj2[key])) {
                    return false
                }
            } else if (obj1[key] !== obj2[key]) {
                return false // If value is not an object, check if values are equal
            }
        } else {
            return false
        }
    }
    return true // If all above conditions pass, return true
}
