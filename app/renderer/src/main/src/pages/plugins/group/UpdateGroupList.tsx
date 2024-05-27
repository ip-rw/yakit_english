import React, {useEffect, useImperativeHandle, useState} from "react"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {useMemoizedFn} from "ahooks"
import {OutlineSearchIcon} from "@/assets/icon/outline"
import {Tooltip} from "antd"
import styles from "./UpdateGroupList.module.scss"

export interface UpdateGroupListItem {
    groupName: string
    checked: boolean
}

interface UpdateGroupListProps {
    ref: React.Ref<any>
    originGroupList: UpdateGroupListItem[] // Original Group Data
}

export const UpdateGroupList: React.FC<UpdateGroupListProps> = React.forwardRef((props, ref) => {
    const {originGroupList} = props
    const [groupList, setGroupList] = useState<UpdateGroupListItem[]>([])
    const [searchFlag, setSearchFlag] = useState<boolean>(false)
    const [searchVal, setSearchVal] = useState<string>("")
    const [searchGroupList, setSearchGroupList] = useState<UpdateGroupListItem[]>([])
    const [addGroupList, setAddGroupList] = useState<UpdateGroupListItem[]>([])

    useEffect(() => {
        setGroupList(structuredClone(originGroupList))
        resetSearch()
    }, [originGroupList])

    useImperativeHandle(
        ref,
        () => ({
            latestGroupList: groupList
        }),
        [groupList]
    )

    const getTextWidth = (text: string) => {
        const tempElement = document.createElement("span")
        tempElement.style.cssText = `
          display: inline-block;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
      `
        tempElement.textContent = text
        document.body.appendChild(tempElement)
        const width = tempElement.clientWidth
        document.body.removeChild(tempElement)
        return width
    }

    const onSearch = useMemoizedFn((groupName: string) => {
        if (groupName) {
            setSearchVal(groupName)
            const filterList = groupList.filter((item) => item.groupName === groupName)
            if (filterList.length) {
                setAddGroupList([])
                setSearchGroupList(filterList)
            } else {
                setAddGroupList([
                    {
                        groupName,
                        checked: false
                    }
                ])
            }
            setSearchFlag(true)
        } else {
            resetSearch()
        }
    })

    const resetSearch = () => {
        setSearchVal("")
        setSearchFlag(false)
        setSearchGroupList([])
        setAddGroupList([])
    }

    const changeFiled = (list: UpdateGroupListItem[], groupName: string, checked: boolean) => {
        const copyList = structuredClone(list)
        copyList.forEach((i) => {
            if (i.groupName === groupName) {
                i.checked = checked
            }
        })
        return copyList
    }

    const onCheckedChange = useMemoizedFn((e, item, newAddFlag) => {
        const checked: boolean = e.target.checked
        if (searchFlag) {
            if (addGroupList.length) {
                if (checked) {
                    setGroupList([{groupName: item.groupName, checked}, ...groupList])
                } else {
                    setGroupList(groupList.filter((i) => i.groupName !== item.groupName))
                }
                setAddGroupList(changeFiled(addGroupList, item.groupName, checked))
            } else {
                setSearchGroupList(changeFiled(searchGroupList, item.groupName, checked))
                setGroupList(changeFiled(groupList, item.groupName, checked))
            }
        } else {
            setGroupList(changeFiled(groupList, item.groupName, checked))
        }

        // Add & Clear Search
        if (newAddFlag) {
            resetSearch()
        }
    })

    return (
        <div className={styles["add-group-list-wrap"]}>
            <div className={styles["search-heard"]}>
                <YakitInput
                    value={searchVal}
                    size='middle'
                    prefix={<OutlineSearchIcon className='search-icon' />}
                    allowClear={true}
                    onChange={(e) => onSearch(e.target.value.trim())}
                />
            </div>
            <div className={styles["group-list"]}>
                {searchFlag
                    ? addGroupList.length
                        ? addGroupList.map((item) => (
                              <div className={styles["group-list-item"]} key={item.groupName}>
                                  <Tooltip
                                      title={getTextWidth(`Add Group “${item.groupName}"`) > 204 ? item.groupName : ""}
                                  >
                                      <YakitCheckbox
                                          wrapperClassName={styles["group-name-wrap"]}
                                          checked={item.checked}
                                          onChange={(e) => onCheckedChange(e, item, true)}
                                      >
                                          Add Group “{item.groupName}"
                                      </YakitCheckbox>
                                  </Tooltip>
                              </div>
                          ))
                        : searchGroupList.map((item) => (
                              <div className={styles["group-list-item"]} key={item.groupName}>
                                  <Tooltip title={getTextWidth(item.groupName) > 204 ? item.groupName : ""}>
                                      <YakitCheckbox
                                          wrapperClassName={styles["group-name-wrap"]}
                                          checked={item.checked}
                                          onChange={(e) => onCheckedChange(e, item, false)}
                                      >
                                          {item.groupName}
                                      </YakitCheckbox>
                                  </Tooltip>
                              </div>
                          ))
                    : groupList.map((item) => (
                          <div className={styles["group-list-item"]} key={item.groupName}>
                              <Tooltip title={getTextWidth(item.groupName) > 204 ? item.groupName : ""}>
                                  <YakitCheckbox
                                      wrapperClassName={styles["group-name-wrap"]}
                                      checked={item.checked}
                                      onChange={(e) => onCheckedChange(e, item, false)}
                                  >
                                      {item.groupName}
                                  </YakitCheckbox>
                              </Tooltip>
                          </div>
                      ))}
            </div>
        </div>
    )
})
