export interface ReportItem {
    type: string
    content: string
    direction?:boolean
}

/**
 * @name Report-JSON Data Types
 */
export type ReportJsonKindData = {
    /**
     * @name Bar Chart
     */
    "bar-graph": {
      color: string[];
      data: { name: string; value: number }[];
      type: string;
      title?: string
    };
    /**
     * @name Report Cover
     */
    "report-cover": {
      type: string;
      data: "critical" | "high" | "warning" | "low" | "security";
    };
  };