import { useEffect, useState } from 'react';
import EventModalShell from './EventModalShell';
import type { EventDataInput } from '../forms/EventForm';
import type { EventFormValues } from '../../utils/formValidators';
import type { EventListItem } from './EventCollectionsPanel';

export type EditEventModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EventFormValues) => void;
  eventData: EventDataInput;
  upcomingEvents?: EventListItem[];
  archivedEvents?: EventListItem[];
  onDeleteEvents?: (events: EventListItem[]) => void;
};

const EditEventModal = ({
  isOpen,
  onClose,
  onSubmit,
  eventData,
  upcomingEvents,
  archivedEvents,
  onDeleteEvents,
}: EditEventModalProps) => {
  const [activeEvent, setActiveEvent] = useState<EventDataInput>(eventData);

  useEffect(() => {
    if (isOpen) {
      setActiveEvent(eventData);
    }
  }, [eventData, isOpen]);

  return (
    <EventModalShell
      isOpen={isOpen}
      title="Edit event"
      mode="edit"
      eventData={activeEvent}
      onClose={onClose}
      onSubmit={onSubmit}
      upcomingEvents={upcomingEvents}
      archivedEvents={archivedEvents}
      onDeleteEvents={onDeleteEvents}
    />
  );
};

export default EditEventModal;
