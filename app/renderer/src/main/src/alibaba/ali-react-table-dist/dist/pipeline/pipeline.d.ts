import { BaseTableProps, PrimaryKey } from '../base-table';
import { ArtColumn, TableTransform, Transform } from '../interfaces';
declare type RowPropsGetter = BaseTableProps['getRowProps'];
export interface TablePipelineIndentsConfig {
    iconIndent: number;
    iconWidth: 16;
    iconGap: number;
    indentSize: number;
}
export interface TablePipelineCtx {
    primaryKey?: PrimaryKey;
    components: {
        [name: string]: any;
    };
    indents: TablePipelineIndentsConfig;
    [key: string]: any;
}
/**
 * Table data handling pipeline. TablePipeline offers tools and methods for processing table data, including……
 *
 * 1. ctx: Context object, steps in the pipeline can read and write ctx fields。
 * Certain ctx field names have specific meanings (e.g., primaryKey for row's primary key), avoid these names with custom context info。
 *
 * 2. rowPropsGetters: getRowProps callback queue, steps can add callbacks to queue with pipeline.appendRowPropsGetter，
 *   Invokes all functions in the pipeline.props() queue to form final getRowProps
 *
 * 3. Current pipeline state, includes dataSource, columns, rowPropsGetters
 *
 * 4. snapshots, pipeline.snapshot(name) records current state, which can later be accessed by name
 * */
export declare class TablePipeline {
    private readonly _snapshots;
    private readonly _rowPropsGetters;
    private _dataSource;
    private _columns;
    static defaultIndents: TablePipelineIndentsConfig;
    readonly ctx: TablePipelineCtx;
    private readonly state;
    private readonly setState;
    constructor({ state, setState, ctx, }: {
        state: any;
        setState: TablePipeline['setState'];
        ctx: Partial<TablePipelineCtx>;
    });
    appendRowPropsGetter(getter: RowPropsGetter): this;
    getDataSource(name?: string): any[];
    getColumns(name?: string): any[];
    getStateAtKey<T = any>(stateKey: string, defaultValue?: T): T;
    /** Set stateKey's state to partialState  */
    setStateAtKey(stateKey: string, partialState: any, extraInfo?: any): void;
    /** Ensure primaryKey is set and return primaryKey  */
    ensurePrimaryKey(hint?: string): PrimaryKey;
    /** Set pipeline input data */
    input(input: {
        dataSource: any[];
        columns: ArtColumn[];
    }): this;
    /** Set dataSource */
    dataSource(rows: any[]): this;
    /** Set columns */
    columns(cols: ArtColumn[]): this;
    /** Set primary key */
    primaryKey(key: PrimaryKey): this;
    /** Save Snapshot */
    snapshot(name: string): this;
    /** @deprecated
     *  Apply an ali-react-table-dist Table transform */
    useTransform(transform: TableTransform): this;
    /** Utilize pipeline functionalities */
    use(step: (pipeline: this) => this): this;
    /** Transform dataSource */
    mapDataSource(mapper: Transform<any[]>): this;
    /** Transform columns */
    mapColumns(mapper: Transform<ArtColumn[]>): this;
    /** Get BaseTable props, includes dataSource/columns/primaryKey/getRowProps four fields */
    getProps(): BaseTableProps;
}
export declare function useTablePipeline(ctx?: Partial<TablePipelineCtx>): TablePipeline;
export {};
