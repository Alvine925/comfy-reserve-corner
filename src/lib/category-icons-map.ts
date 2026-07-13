// Central map of category value → custom furniture SVG icon component.
// Import from here anywhere you need the map.

import {
  ChairIcon,
  OfficeDeskIcon,
  ExecutiveDeskIcon,
  ReceptionDeskIcon,
  ConferenceTableIcon,
  DiningTableIcon,
  SofaIcon,
  StorageIcon,
  BedIcon,
  OtherFurnitureIcon,
} from "@/lib/category-icons";

type IconComponent = (props: { className?: string; strokeWidth?: number }) => JSX.Element;

export const CATEGORY_ICON_COMPONENTS: Record<string, IconComponent> = {
  chairs:            ChairIcon,
  office_desks:      OfficeDeskIcon,
  executive_desks:   ExecutiveDeskIcon,
  reception_desks:   ReceptionDeskIcon,
  conference_tables: ConferenceTableIcon,
  dining_tables:     DiningTableIcon,
  sofas:             SofaIcon,
  storage:           StorageIcon,
  beds:              BedIcon,
  other:             OtherFurnitureIcon,
};
