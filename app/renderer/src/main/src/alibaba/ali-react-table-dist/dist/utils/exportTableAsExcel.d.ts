import type XLSX_NS from 'xlsx';
import { ArtColumn } from '../interfaces';
/** Export table data to Excel based on BaseTable's dataSource and column */
export default function exportTableAsExcel(xlsxPackage: typeof XLSX_NS, dataSource: any[], columns: ArtColumn[], filename: string): void;
