import { Badge } from "@/components/ui/badge";
import { getEventTemporalStatus, getEventStatusLabel, getEventStatusColor } from "@/lib/eventStatus";

interface EventStatusBadgeProps {
  dataInizio: string;
  dataFine?: string | null;
  className?: string;
}

const EventStatusBadge = ({ dataInizio, dataFine, className }: EventStatusBadgeProps) => {
  const status = getEventTemporalStatus(dataInizio, dataFine);
  const label = getEventStatusLabel(status);
  const color = getEventStatusColor(status);

  return (
    <Badge variant="outline" className={`${color} ${className || ""}`}>
      {label}
    </Badge>
  );
};

export default EventStatusBadge;
