import type { MarkerType } from "@/lib/api";

export const MARKER_TYPE_LABEL: Record<MarkerType, string> = {
  supply: "补给",
  photo: "美照",
  rest: "休息",
  view: "观景点",
  fork: "岔路",
  other: "其他",
};

export const MARKER_TYPE_COLOR: Record<MarkerType, string> = {
  supply: "#0071e3",
  photo: "#16a34a",
  rest: "#6e6e73",
  view: "#eab308",
  fork: "#dc2626",
  other: "#86868b",
};

export const MARKER_FILTER_TYPES: { key: MarkerType | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "supply", label: "补给" },
  { key: "photo", label: "美照" },
  { key: "rest", label: "休息" },
];
