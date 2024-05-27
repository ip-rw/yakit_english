import omitBy from "lodash/omitBy"
import isNil from "lodash/isNil"

/** @name Remove null/undefined key-values */
export const toolDelInvalidKV = (data: any) => {
    try {
        if (!data) return data
        if (!isObject(data)) return data
        for (const key in data) {
            if (isNil(data[key])) {
                delete data[key]
            } else if (isObject(data[key])) {
                toolDelInvalidKV(data[key])
            }
        }
        return data
    } catch (error) {
        return data
    }
}

/**Object check */
export const isObject = (value) => {
    return Object.prototype.toString.call(value) === "[object Object]"
}
/**Array check */
export const isArray = (value) => {
    return Object.prototype.toString.call(value) === "[object Array]"
}

/**Empty object check */
export const isEmptyObject = (obj: object) => {
    return !(obj && Object.keys(obj).length > 0)
}