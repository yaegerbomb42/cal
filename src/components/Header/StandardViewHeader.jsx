import React from 'react';
import { Plus } from 'lucide-react';
import AIChatInput from '../UI/AIChatInput';
import './StandardViewHeader.css';

/**
 * StandardViewHeader
 * 
 * A unified header component for all calendar views (Year, Month, Week, Day).
 * Enforces a rigorous 3-column layout:
 * - Left: AI Chat Input (Mental note: make sure this doesn't get squashed)
 * - Center: Navigation / Titles / Dropdowns
 * - Right: Action Buttons / Stats
 */
const StandardViewHeader = ({
    onAIChatSubmit,     // { text, files } => void
    centerContent,      // ReactNode (Dropdowns, Titles)
    rightContent,       // ReactNode (Stats, Custom Buttons)
    onAddEvent,         // () => void (Optional, renders default Add button if provided)
    addEventLabel = "Add"
}) => {

    // Default AI Handler if none provided (dispatches global events)
    const handleAISubmit = onAIChatSubmit || (({ text, files }) => {
        if (text) {
            window.dispatchEvent(new CustomEvent('calai-ping', { detail: { text } }));
            // We assume the view might want to send specific navigation contexts, 
            // but the general 'ping' is safe default.
        }
        if (files?.length) {
            window.dispatchEvent(new CustomEvent('calai-image-upload', { detail: { files } }));
        }
        window.dispatchEvent(new CustomEvent('calai-open'));
    });

    return (
        <div className="standard-view-header glass-card">
            {/* Left: AI Chat */}
            <div className="header-section left">
                <AIChatInput
                    onSubmit={handleAISubmit}
                    compact
                />
            </div>

            {/* Center: Navigation & Controls */}
            <div className="header-section center">
                {centerContent}
            </div>

            {/* Right: Actions */}
            <div className="header-section right">
                {rightContent}
                {onAddEvent && (
                    <button
                        className="btn btn-primary header-add-btn"
                        onClick={onAddEvent}
                        title="Create New Event"
                    >
                        <Plus size={16} />
                        <span>{addEventLabel}</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default StandardViewHeader;
