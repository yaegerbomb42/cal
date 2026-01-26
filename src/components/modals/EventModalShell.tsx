import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import EventForm from '../forms/EventForm';
import type { EventDataInput, EventFormProps } from '../forms/EventForm';
import type { EventFormValues } from '../../utils/formValidators';
import EventCollectionsPanel, { type EventListItem } from './EventCollectionsPanel';
import './EventModals.css';

type EventModalShellProps = {
  isOpen: boolean;
  title: string;
  mode: EventFormProps['mode'];
  eventData?: EventDataInput;
  onClose: () => void;
  onSubmit: (data: EventFormValues) => void;
  upcomingEvents?: EventListItem[];
  archivedEvents?: EventListItem[];
  onDeleteEvents?: (events: EventListItem[]) => void;
};

const EventModalShell = ({
  isOpen,
  title,
  mode,
  eventData,
  onClose,
  onSubmit,
  upcomingEvents,
  archivedEvents,
  onDeleteEvents,
}: EventModalShellProps) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const [bodyHeight, setBodyHeight] = useState<number | null>(null);

  const modalContent = useMemo(() => {
    if (!isOpen) return null;
    return (
      <div className="event-modal-overlay" role="presentation" onClick={onClose}>
        <div
          className="event-modal"
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="event-modal-header" ref={headerRef}>
            <span className="event-modal-title">{title}</span>
            <button type="button" className="event-modal-close" onClick={onClose}>
              Close
            </button>
          </div>
          <div className="event-modal-body" style={bodyHeight ? { height: bodyHeight } : undefined}>
            <div className="event-modal-layout">
              <EventForm eventData={eventData} mode={mode} onSubmit={onSubmit} onCancel={onClose} />
              <EventCollectionsPanel
                upcomingEvents={upcomingEvents}
                archivedEvents={archivedEvents}
                onDeleteEvents={onDeleteEvents}
              />
            </div>
          </div>
          <div className="event-modal-footer" ref={footerRef}>
            <span>Tip: Use filters to focus on event types.</span>
          </div>
        </div>
      </div>
    );
  }, [
    archivedEvents,
    bodyHeight,
    eventData,
    isOpen,
    mode,
    onClose,
    onDeleteEvents,
    onSubmit,
    title,
    upcomingEvents,
  ]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const updateBodyHeight = () => {
      if (!modalRef.current) return;
      const headerHeight = headerRef.current?.offsetHeight ?? 0;
      const footerHeight = footerRef.current?.offsetHeight ?? 0;
      const containerHeight = modalRef.current.clientHeight;
      const nextHeight = Math.max(containerHeight - headerHeight - footerHeight, 0);
      setBodyHeight(nextHeight);
    };

    updateBodyHeight();
    const observer = new ResizeObserver(updateBodyHeight);
    if (modalRef.current) observer.observe(modalRef.current);
    if (headerRef.current) observer.observe(headerRef.current);
    if (footerRef.current) observer.observe(footerRef.current);
    window.addEventListener('resize', updateBodyHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBodyHeight);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(modalContent, document.body);
};

export default EventModalShell;
