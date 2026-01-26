import { isAfter, isValid } from 'date-fns';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export type EventImageMeta = {
  width?: number;
  height?: number;
  size?: number;
  type?: string;
};

export type EventFormValues = {
  title: string;
  description: string;
  start: Date;
  end: Date;
  type: string;
  location: string;
  imageUrl?: string;
  imageAlt?: string;
  imageMeta?: EventImageMeta | null;
};

export type EventFormErrors = Partial<Record<keyof EventFormValues, string>>;

export const validateEventForm = (values: EventFormValues): EventFormErrors => {
  const errors: EventFormErrors = {};

  if (!values.title.trim()) {
    errors.title = 'Title is required.';
  }

  if (!isValid(values.start)) {
    errors.start = 'Start date is invalid.';
  }

  if (!isValid(values.end)) {
    errors.end = 'End date is invalid.';
  }

  if (isValid(values.start) && isValid(values.end) && isAfter(values.start, values.end)) {
    errors.end = 'End date must be after the start date.';
  }

  if (values.imageMeta?.size && values.imageMeta.size > MAX_IMAGE_SIZE_BYTES) {
    errors.imageUrl = 'Image must be smaller than 5MB.';
  }

  return errors;
};

export const normalizeEventValues = (values: EventFormValues) => ({
  ...values,
  title: values.title.trim(),
  description: values.description.trim(),
  location: values.location.trim(),
  start: values.start.toISOString(),
  end: values.end.toISOString(),
});

export const analyzeImage = async (file: File) => {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      dataUrl: '',
      altText: '',
      metadata: {
        size: file.size,
        type: file.type,
      } satisfies EventImageMeta,
      error: 'File exceeds 5MB limit.',
    };
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });

  const metadata = await new Promise<EventImageMeta>((resolve) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.width,
        height: image.height,
        size: file.size,
        type: file.type,
      });
    };
    image.onerror = () => {
      resolve({
        size: file.size,
        type: file.type,
      });
    };
    image.src = dataUrl;
  });

  const altText = file.name.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, '').trim();

  return {
    dataUrl,
    altText,
    metadata,
  };
};
