import { ArtColumnStaticPart } from '../../interfaces';
import { TablePipeline } from '../pipeline';
export interface SingleSelectFeatureOptions {
    /** Highlight Selected Row */
    highlightRowWhenSelected?: boolean;
    /** Uncontrolled: Default Selected Value */
    defaultValue?: string;
    /** Controlled: Current Selected Value */
    value?: string;
    /** Controlled: OnChange Callback */
    onChange?: (next: string) => void;
    /** Row Disabled Check */
    isDisabled?(row: any, rowIndex: number): boolean;
    /** Click Target Area */
    clickArea?: 'radio' | 'cell' | 'row';
    /** Radio Column Config: width, lock, etc. */
    radioColumn?: Partial<ArtColumnStaticPart>;
    /** Radio Column Position */
    radioPlacement?: 'start' | 'end';
    /** StopPropagation for onChange Click() */
    stopClickEventPropagation?: boolean;
}
export declare function singleSelect(opts?: SingleSelectFeatureOptions): (pipeline: TablePipeline) => TablePipeline;
