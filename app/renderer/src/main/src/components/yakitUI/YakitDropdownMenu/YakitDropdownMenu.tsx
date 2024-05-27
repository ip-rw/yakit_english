import {Dropdown, DropdownProps} from "antd"
import classNames from "classnames"
import {memo, ReactNode, useMemo} from "react"
import {YakitMenu, YakitMenuProp} from "../YakitMenu/YakitMenu"
import styles from "./YakitDropdownMenu.module.scss"

/** May be prepared as Basic Components */
interface YakitDropdownMenuProps {
    dropdown?: Omit<DropdownProps, "overlay">
    menu: YakitMenuProp
    children?: ReactNode
}
/** May be prepared as Basic Components */
export const YakitDropdownMenu: React.FC<YakitDropdownMenuProps> = memo((props) => {
    const {dropdown: {overlayClassName, ...restProps} = {}, menu, children} = props

    const overlay = useMemo(() => {
        return <YakitMenu {...menu} />
    }, [menu])

    return (
        <Dropdown
            {...restProps}
            overlay={overlay}
            overlayClassName={classNames(styles["yakit-dropdown-menu"], overlayClassName)}
        >
            {children}
        </Dropdown>
    )
})
