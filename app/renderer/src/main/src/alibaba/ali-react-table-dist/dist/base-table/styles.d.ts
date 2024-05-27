export declare const LOCK_SHADOW_PADDING = 20;
export declare const Classes: {
    /** BaseTable Wrapper div */
    readonly artTableWrapper: "art-table-wrapper";
    readonly artTable: "art-table";
    readonly tableHeader: "art-table-header";
    readonly tableBody: "art-table-body";
    readonly tableFooter: "art-table-footer";
    /** TableRow */
    readonly tableRow: "art-table-row";
    /** HeaderRow */
    readonly tableHeaderRow: "art-table-header-row";
    /** Cell */
    readonly tableCell: "art-table-cell";
    /** HeaderCell */
    readonly tableHeaderCell: "art-table-header-cell";
    readonly virtualBlank: "art-virtual-blank";
    readonly stickyScroll: "art-sticky-scroll";
    readonly stickyScrollItem: "art-sticky-scroll-item";
    readonly horizontalScrollContainer: "art-horizontal-scroll-container";
    readonly lockShadowMask: "art-lock-shadow-mask";
    readonly lockShadow: "art-lock-shadow";
    readonly leftLockShadow: "art-left-lock-shadow";
    readonly rightLockShadow: "art-right-lock-shadow";
    /** Empty Data Table Wrapper div */
    readonly emptyWrapper: "art-empty-wrapper";
    readonly loadingWrapper: "art-loading-wrapper";
    readonly loadingIndicatorWrapper: "art-loading-indicator-wrapper";
    readonly loadingIndicator: "art-loading-indicator";
};
export declare type BaseTableCSSVariables = Partial<{
    /** Row Height in Table, CSS var only, no shorthand */
    '--row-height': string;
    /** Table FontColor */
    '--color': string;
    /** Table BgColor */
    '--bgcolor': string;
    /** Hover BgColor */
    '--hover-bgcolor': string;
    /** Cell Highlight BgColor */
    '--highlight-bgcolor': string;
    /** Header Row Height, CSS var only, no shorthand */
    '--header-row-height': string;
    /** Header FontColor */
    '--header-color': string;
    /** Header BgColor */
    '--header-bgcolor': string;
    /** Header Hover BgColor */
    '--header-hover-bgcolor': string;
    /** Header Cell Highlight BgColor */
    '--header-highlight-bgcolor': string;
    /** Cell Padding */
    '--cell-padding': string;
    /** FontSize */
    '--font-size': string;
    /** LineHeight in Table */
    '--line-height': string;
    /** Fixed Column Shadow, def=rgba(152,152,152,0.5) 0 0 6px 2px */
    '--lock-shadow': string;
    /** Cell Border Color */
    '--border-color': string;
    /** Cell Border, def=1px solid var(--border-color) */
    '--cell-border': string;
    /** Cell Top/Bottom Borders, def=var(--cell-border) */
    '--cell-border-horizontal': string;
    /** Cell H/V Borders, def=var(--cell-border) */
    '--cell-border-vertical': string;
    /** Header Cell Border, def=1px solid var(--border-color) */
    '--header-cell-border': string;
    /** Header Cell Top/Bottom Borders, def=var(--header-cell-border) */
    '--header-cell-border-horizontal': string;
    /** Header Cell H/V Borders, def=var(--header-cell-border) */
    '--header-cell-border-vertical': string;
}>;
export declare const StyledArtTableWrapper: import("styled-components").StyledComponent<"div", any, {}, never>;
