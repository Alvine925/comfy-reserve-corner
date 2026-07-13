/**
 * Custom furniture silhouette icons — clean line-art SVGs in the style of
 * Lucide icons (24×24 viewBox, stroke-based, strokeWidth ~1.75).
 * Each component accepts className and strokeWidth props for flexibility.
 */

interface IconProps {
  className?: string;
  strokeWidth?: number;
}

export function ChairIcon({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* seat */}
      <rect x="4" y="11" width="13" height="2.5" rx="1" />
      {/* back rest — vertical */}
      <rect x="4" y="4" width="2.5" height="7.5" rx="1.25" />
      {/* front leg */}
      <line x1="15" y1="13.5" x2="15" y2="20" />
      {/* back leg */}
      <line x1="5.25" y1="13.5" x2="5.25" y2="20" />
      {/* floor stretcher */}
      <line x1="5.25" y1="20" x2="15" y2="20" />
    </svg>
  );
}

export function OfficeDeskIcon({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* desktop surface */}
      <rect x="2" y="8" width="20" height="2.5" rx="1" />
      {/* left leg */}
      <line x1="5" y1="10.5" x2="5" y2="20" />
      {/* right leg */}
      <line x1="19" y1="10.5" x2="19" y2="20" />
      {/* under-desk panel / modesty board */}
      <rect x="7" y="10.5" width="10" height="6" rx="0.5" />
    </svg>
  );
}

export function ExecutiveDeskIcon({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* main surface */}
      <rect x="2" y="6" width="14" height="2.5" rx="1" />
      {/* return / side extension surface */}
      <rect x="13.5" y="8.5" width="8.5" height="2.5" rx="1" />
      {/* left leg */}
      <line x1="4" y1="8.5" x2="4" y2="18" />
      {/* right back leg */}
      <line x1="14" y1="8.5" x2="14" y2="18" />
      {/* far right leg (return) */}
      <line x1="21" y1="11" x2="21" y2="18" />
      {/* floor line connecting main legs */}
      <line x1="4" y1="18" x2="14" y2="18" />
    </svg>
  );
}

export function ReceptionDeskIcon({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* tall front fascia */}
      <rect x="2" y="9" width="20" height="10" rx="1" />
      {/* raised work-surface on top */}
      <rect x="2" y="6.5" width="14" height="2.5" rx="1" />
      {/* top-surface divider line */}
      <line x1="2" y1="9" x2="16" y2="9" />
      {/* decorative horizontal slot on fascia */}
      <line x1="6" y1="13.5" x2="18" y2="13.5" />
    </svg>
  );
}

export function ConferenceTableIcon({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* long oval conference table */}
      <rect x="2" y="9" width="20" height="6" rx="3" />
      {/* chairs along the top edge */}
      <line x1="6" y1="9" x2="6" y2="6.5" />
      <line x1="12" y1="9" x2="12" y2="6.5" />
      <line x1="18" y1="9" x2="18" y2="6.5" />
      {/* chairs along the bottom edge */}
      <line x1="6" y1="15" x2="6" y2="17.5" />
      <line x1="12" y1="15" x2="12" y2="17.5" />
      <line x1="18" y1="15" x2="18" y2="17.5" />
    </svg>
  );
}

export function DiningTableIcon({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* round table top */}
      <circle cx="12" cy="11" r="7" />
      {/* four legs going down */}
      <line x1="8.5" y1="17" x2="7" y2="21" />
      <line x1="15.5" y1="17" x2="17" y2="21" />
      {/* leg crossbar */}
      <line x1="7" y1="21" x2="17" y2="21" />
    </svg>
  );
}

export function SofaIcon({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* back cushion */}
      <rect x="3" y="7" width="18" height="5" rx="2" />
      {/* seat cushion */}
      <rect x="5" y="12" width="14" height="5" rx="1" />
      {/* left arm */}
      <rect x="2" y="10" width="3.5" height="7" rx="1" />
      {/* right arm */}
      <rect x="18.5" y="10" width="3.5" height="7" rx="1" />
      {/* feet */}
      <line x1="5" y1="17" x2="5" y2="20" />
      <line x1="19" y1="17" x2="19" y2="20" />
    </svg>
  );
}

export function StorageIcon({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* cabinet outline */}
      <rect x="4" y="3" width="16" height="19" rx="1" />
      {/* drawer dividers */}
      <line x1="4" y1="10" x2="20" y2="10" />
      <line x1="4" y1="16" x2="20" y2="16" />
      {/* handles */}
      <line x1="10.5" y1="6.5" x2="13.5" y2="6.5" />
      <line x1="10.5" y1="13" x2="13.5" y2="13" />
      <line x1="10.5" y1="19" x2="13.5" y2="19" />
    </svg>
  );
}

export function BedIcon({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* headboard */}
      <rect x="2" y="5" width="3" height="15" rx="1" />
      {/* mattress / base */}
      <rect x="5" y="11" width="17" height="7" rx="1" />
      {/* pillow */}
      <rect x="7" y="8.5" width="6" height="4" rx="1" />
      {/* floor line / legs */}
      <line x1="5" y1="18" x2="5" y2="21" />
      <line x1="22" y1="18" x2="22" y2="21" />
    </svg>
  );
}

export function OtherFurnitureIcon({ className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* wardrobe outline */}
      <rect x="3" y="3" width="18" height="18" rx="1" />
      {/* centre split */}
      <line x1="12" y1="3" x2="12" y2="21" />
      {/* handles */}
      <line x1="10" y1="12" x2="10" y2="13.5" />
      <line x1="14" y1="12" x2="14" y2="13.5" />
      {/* feet */}
      <line x1="6" y1="21" x2="6" y2="23" />
      <line x1="18" y1="21" x2="18" y2="23" />
    </svg>
  );
}
