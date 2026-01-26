import EventModalShell from './EventModalShell';
import type { EventDataInput } from '../forms/EventForm';
import type { EventFormValues } from '../../utils/formValidators';
import type { EventListItem } from './EventCollectionsPanel';

export type CreateEventModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EventFormValues) => void;
  seedData?: EventDataInput;
  upcomingEvents?: EventListItem[];
  archivedEvents?: EventListItem[];
  onDeleteEvents?: (events: EventListItem[]) => void;
};

const CreateEventModal = ({
  isOpen,
  onClose,
  onSubmit,
  seedData,
  upcomingEvents,
  archivedEvents,
  onDeleteEvents,
}: CreateEventModalProps) => (
  <EventModalShell
    isOpen={isOpen}
    title="Create event"
    mode="create"
    eventData={seedData}
    onClose={onClose}
    onSubmit={onSubmit}
    upcomingEvents={upcomingEvents}
    archivedEvents={archivedEvents}
    onDeleteEvents={onDeleteEvents}
  />
);

export default CreateEventModal;
