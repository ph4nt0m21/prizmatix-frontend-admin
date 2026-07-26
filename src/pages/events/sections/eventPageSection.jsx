import React, { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import BasicInfoStep from '../steps/basicInfoStep';
import LocationStep from '../steps/locationStep';
import DateTimeStep from '../steps/dateTimeStep';
import DescriptionStep from '../steps/descriptionStep';
import ArtStep from '../steps/artStep';
import { mapEventApiPayloadToLocationForm } from '../../../utils/eventUtil';
import { mapApiDateTimeToFormDateTime } from '../../../utils/datetimeUtil';
import styles from './eventPageSection.module.scss';

const STEPS = [
  { number: 1, key: 'basicInfo', label: 'Basic Info' },
  { number: 2, key: 'location', label: 'Location' },
  { number: 3, key: 'dateTime', label: 'Date & Time' },
  { number: 4, key: 'description', label: 'Description' },
  { number: 5, key: 'art', label: 'Art' },
];

const getFileNameFromUrl = (urlValue) => {
  if (!urlValue || typeof urlValue !== 'string') return null;
  try {
    const pathname = new URL(urlValue).pathname || '';
    const fileName = pathname.split('/').pop();
    return fileName || null;
  } catch {
    const fileName = urlValue.split('?')[0].split('/').pop();
    return fileName || null;
  }
};

/**
 * Map GetEventAPI payload into the form-shaped data the edit steps expect.
 */
function mapEventApiToEditFormData(event = {}) {
  return {
    id: event.id,
    name: event.name || '',
    slug: event.slug,
    isPublished: event.isPublished,
    eventType: event.isPrivate ? 'private' : 'public',
    organizerName: event.organizationName || 'Organiser',
    category: event.category || '',
    searchTags: event.keywords
      ? event.keywords.split(',').map((tag) => tag.trim()).filter(Boolean)
      : [],
    location: mapEventApiPayloadToLocationForm(event),
    dateTime: mapApiDateTimeToFormDateTime(
      {
        startDate: event.dateTime?.startDate || event.startDate || '',
        startTime: event.dateTime?.startTime || event.startTime,
        endDate: event.dateTime?.endDate || event.endDate || '',
        endTime: event.dateTime?.endTime || event.endTime,
        timezone: event.dateTime?.timezone || event.timezone || event.timeZone,
      },
      {}
    ),
    description: event.description || '',
    art: {
      thumbnailFile: null,
      bannerFile: null,
      thumbnailUrl: event.thumbnailImage || event.art?.thumbnailUrl || null,
      bannerUrl: event.bannerImage || event.art?.bannerUrl || null,
      thumbnailName: getFileNameFromUrl(
        event.thumbnailImage || event.art?.thumbnailUrl
      ),
      bannerName: getFileNameFromUrl(event.bannerImage || event.art?.bannerUrl),
    },
  };
}

/**
 * Read-only Event Page details — same Basic Info → Art steps as org edit event.
 */
const EventPageSection = ({ eventData = {} }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const formData = useMemo(() => mapEventApiToEditFormData(eventData), [eventData]);
  const noopInputChange = useCallback(() => {}, []);

  const stepStatus = useMemo(
    () => ({
      completed: true,
      valid: true,
      visited: true,
    }),
    []
  );

  const stepProps = {
    eventData: formData,
    handleInputChange: noopInputChange,
    isValid: true,
    stepStatus,
    viewOnly: true,
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfoStep {...stepProps} />;
      case 2:
        return <LocationStep {...stepProps} />;
      case 3:
        return <DateTimeStep {...stepProps} />;
      case 4:
        return <DescriptionStep {...stepProps} />;
      case 5:
        return <ArtStep {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.banner}>
        <h2 className={styles.title}>Event page</h2>
        <p className={styles.subtitle}>
          Read-only event details — same layout as Edit Event in the organiser app.
        </p>
      </div>

      <nav className={styles.stepTabs} aria-label="Event page sections">
        {STEPS.map((step) => (
          <button
            key={step.key}
            type="button"
            className={`${styles.stepTab} ${
              currentStep === step.number ? styles.stepTabActive : ''
            }`}
            onClick={() => setCurrentStep(step.number)}
          >
            {step.label}
          </button>
        ))}
      </nav>

      <fieldset className={styles.readonlyFieldset} disabled>
        <div className={styles.stepContent}>{renderCurrentStep()}</div>
      </fieldset>
    </div>
  );
};

EventPageSection.propTypes = {
  eventData: PropTypes.object,
};

export default EventPageSection;
