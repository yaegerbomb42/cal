import { useState, useRef } from 'react';
import { Send, ImagePlus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import CalCharacter from '../AI/CalCharacter';
import './AIChatInput.css';

const AIChatInput = ({
    onSubmit,
    disabled = false,
    compact = false,
    hideCharacter = false
}) => {
    const [inputInternal, setInputInternal] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const fileInputRef = useRef(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if ((!inputInternal.trim() && selectedFiles.length === 0) || disabled) return;

        onSubmit({ text: inputInternal, files: selectedFiles });
        setInputInternal('');
        setSelectedFiles([]);
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setSelectedFiles(prev => [...prev, ...files]);
        }
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <form onSubmit={handleSubmit} className={`ai-chat-input-wrapper ${compact ? 'compact' : ''}`}>
            <div className="ai-input-container glass-card">
                {!hideCharacter && (
                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px' }}>
                        <CalCharacter size="mini" />
                    </div>
                )}

                <input
                    type="text"
                    value={inputInternal}
                    onChange={(e) => setInputInternal(e.target.value)}
                    placeholder="Ask Cal anything..."
                    className="ai-text-input"
                    disabled={disabled}
                />

                <div className="ai-actions">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden-file-input"
                        onChange={handleFileChange}
                        hidden
                    />
                    <button
                        type="button"
                        className="ai-action-btn file-btn"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach files"
                    >
                        <ImagePlus size={16} />
                        {selectedFiles.length > 0 && <span className="file-count-badge">{selectedFiles.length}</span>}
                    </button>

                    <button
                        type="submit"
                        className="ai-action-btn send-btn"
                        disabled={(!inputInternal.trim() && selectedFiles.length === 0) || disabled}
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {selectedFiles.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="ai-file-previews"
                    >
                        {selectedFiles.map((file, i) => (
                            <div key={i} className="file-chip">
                                <span className="file-name">{file.name}</span>
                                <button type="button" onClick={() => removeFile(i)} className="file-remove">
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </form>
    );
};

export default AIChatInput;
