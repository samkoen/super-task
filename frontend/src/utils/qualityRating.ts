export type QualityCategoryAverage = {
  category: string;
  average: number;
  count: number;
};

export type QualityRatingSummary = {
  average: number | null;
  count: number;
  by_category: QualityCategoryAverage[];
};

export function formatQualityAverage(average: number | null): string {
  if (average == null) return "";
  return average.toFixed(1);
}

export function hasQualityRatings(summary: QualityRatingSummary | null | undefined): boolean {
  return Boolean(summary && summary.count > 0 && summary.average != null);
}
