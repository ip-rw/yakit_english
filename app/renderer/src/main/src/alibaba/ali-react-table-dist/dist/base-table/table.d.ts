import React, { CSSProperties, ReactNode } from 'react';
import { noop } from 'rxjs';
import { ArtColumn } from '../interfaces';
import { TableDOMHelper } from './helpers/TableDOMUtils';
import { ResolvedUseVirtual, VerticalRenderRange, VirtualEnum } from './interfaces';
import { LoadingContentWrapperProps } from './loading';
import { BaseTableCSSVariables } from './styles';
export declare type PrimaryKey = string | ((row: any) => string);
export interface BaseTableProps {
    /** Primary Key */
    primaryKey?: PrimaryKey;
    /** Table data source */
    dataSource: any[];
    /** Table footer data source */
    footerDataSource?: any[];
    /** Table column configuration */
    columns: ArtColumn[];
    /** Enable Virtual Scrolling */
    useVirtual?: VirtualEnum | {
        horizontal?: VirtualEnum;
        vertical?: VirtualEnum;
        header?: VirtualEnum;
    };
    /** Estimated row height in virtual scrolling */
    estimatedRowHeight?: number;
    /** @Deprecated: Use isStickyHeader, default true */
    isStickyHead?: boolean;
    /** Sticky Header, default true */
    isStickyHeader?: boolean;
    /** Sticky Header Top Offset */
    stickyTop?: number;
    /** Sticky Footer, default true */
    isStickyFooter?: boolean;
    /** Sticky Footer Bottom Offset */
    stickyBottom?: number;
    /** Custom class name */
    className?: string;
    /** Custom inline style */
    style?: CSSProperties & BaseTableCSSVariables;
    /** Table has header */
    hasHeader?: boolean;
    /** Table has horizontal sticky scrollbar */
    hasStickyScroll?: boolean;
    /** Horizontal Sticky Scrollbar Height */
    stickyScrollHeight?: 'auto' | number;
    /** Use outer div border instead of cell border */
    useOuterBorder?: boolean;
    /** Table loading */
    isLoading?: boolean;
    /** Empty cell height */
    emptyCellHeight?: number;
    /** @Deprecated: Use components.EmptyContent for empty data display */
    emptyContent?: ReactNode;
    /** Override internal components */
    components?: {
        /** Table content parent on load */
        LoadingContentWrapper?: React.ComponentType<LoadingContentWrapperProps>;
        /** Table loading icon */
        LoadingIcon?: React.ComponentType;
        /** Empty data display content。*/
        EmptyContent?: React.ComponentType;
        /** Override internal tbody render>tr component for context on tr */
        Row?: React.ComponentType<{
            row: any;
            rowIndex: number;
            trProps: unknown;
        }>;
        /** Override internal tbody render>td component for context on td */
        Cell?: React.ComponentType<{
            row: any;
            rowIndex: number;
            colIndex: number;
            tdProps: unknown;
            column: ArtColumn;
        }>;
        /** Override tbody component */
        TableBody?: React.ComponentType<{
            tbodyProps: unknown;
        }>;
    };
    /** Default column width */
    defaultColumnWidth?: number;
    /**
     * @deprecated
     * Remove flowRoot post v2.4
     * */
    flowRoot?: never;
    /** Virtual Scroll Debug Label */
    virtualDebugLabel?: string;
    getRowProps?(row: any, rowIndex: number): React.HTMLAttributes<HTMLTableRowElement>;
}
interface BaseTableState {
    /** Show custom scrollbar (stickyScroll)) */
    hasScroll: boolean;
    /** Render lock sections needed
     * No lock sections if all columns fully rendered in wide tables
     * Lock sections needed if total width < sum column widths */
    needRenderLock: boolean;
    /** Vertical Scroll Offset */
    offsetY: number;
    /** Vertical Max Render Size */
    maxRenderHeight: number;
    /** Horizontal Scroll Offset */
    offsetX: number;
    /** Horizontal Max Render Size */
    maxRenderWidth: number;
}
export declare class BaseTable extends React.Component<BaseTableProps, BaseTableState> {
    static defaultProps: {
        hasHeader: boolean;
        isStickyHeader: boolean;
        stickyTop: number;
        footerDataSource: any[];
        isStickyFooter: boolean;
        stickyBottom: number;
        hasStickyScroll: boolean;
        stickyScrollHeight: string;
        useVirtual: string;
        estimatedRowHeight: number;
        isLoading: boolean;
        components: {};
        getRowProps: typeof noop;
        dataSource: any[];
    };
    private rowHeightManager;
    private artTableWrapperRef;
    private domHelper;
    private rootSubscription;
    private lastInfo;
    private props$;
    /** @Deprecated: Do not use BaseTable.getDoms() */
    getDoms(): TableDOMHelper;
    constructor(props: Readonly<BaseTableProps>);
    /** Custom scrollbar width matches table */
    private updateStickyScroll;
    private renderTableHeader;
    private updateOffsetX;
    private syncHorizontalScrollFromTableBody;
    /** Sync Horizontal Scroll Offset */
    private syncHorizontalScroll;
    getVerticalRenderRange(useVirtual: ResolvedUseVirtual): VerticalRenderRange;
    private renderTableBody;
    private renderTableFooter;
    private renderLockShadows;
    private renderStickyScroll;
    render(): JSX.Element;
    componentDidMount(): void;
    componentDidUpdate(prevProps: Readonly<BaseTableProps>, prevState: Readonly<BaseTableState>): void;
    private didMountOrUpdate;
    private updateScrollLeftWhenLayoutChanged;
    private initSubscriptions;
    componentWillUnmount(): void;
    /** Update DOM refs for direct manipulation */
    private updateDOMHelper;
    private updateRowHeightManager;
    /** Check if lock columns needed by summing column widths */
    private adjustNeedRenderLock;
}
export {};
