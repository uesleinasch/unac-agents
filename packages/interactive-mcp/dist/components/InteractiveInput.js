import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
const VIEWPORT_SIZE = 8;
export const InteractiveInput = ({ question, questionId, predefinedOptions = [], onSubmit, }) => {
    const [mode, setMode] = useState(predefinedOptions.length > 0 ? 'option' : 'input');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [viewportStart, setViewportStart] = useState(0);
    useEffect(() => {
        setViewportStart((prev) => {
            if (selectedIndex < prev)
                return selectedIndex;
            if (selectedIndex >= prev + VIEWPORT_SIZE)
                return selectedIndex - VIEWPORT_SIZE + 1;
            return prev;
        });
    }, [selectedIndex]);
    useEffect(() => {
        setSelectedIndex(0);
        setViewportStart(0);
    }, [predefinedOptions]);
    useInput((input, key) => {
        if (predefinedOptions.length > 0) {
            if (key.upArrow) {
                setMode('option');
                setSelectedIndex((prev) => (prev - 1 + predefinedOptions.length) % predefinedOptions.length);
                return;
            }
            if (key.downArrow) {
                setMode('option');
                setSelectedIndex((prev) => (prev + 1) % predefinedOptions.length);
                return;
            }
        }
        if (key.return) {
            if (mode === 'option' && predefinedOptions.length > 0) {
                const selectedOption = predefinedOptions[selectedIndex];
                if (selectedOption.toLowerCase() === 'outros') {
                    // "Outros" selected: switch to input mode so user can type a custom value
                    setMode('input');
                    setInputValue('');
                }
                else {
                    onSubmit(questionId, selectedOption);
                }
            }
            else {
                onSubmit(questionId, inputValue);
            }
            return;
        }
        // Any other key press switches to input mode
        if (!key.ctrl &&
            !key.meta &&
            !key.escape &&
            !key.tab &&
            !key.shift &&
            !key.leftArrow &&
            !key.rightArrow &&
            input) {
            setMode('input');
            // Update inputValue only if switching to input mode via typing
            // TextInput's onChange will handle subsequent typing
            if (mode === 'option') {
                setInputValue(input); // Start input with the typed character
            }
        }
    });
    const handleInputChange = (value) => {
        if (value !== inputValue) {
            setInputValue(value);
            // If user starts typing, switch to input mode
            if (value.length > 0 && mode === 'option') {
                setMode('input');
            }
            else if (value.length === 0 && predefinedOptions.length > 0) {
                // Optionally switch back to option mode if input is cleared
                // setMode('option');
            }
        }
    };
    const handleSubmit = (value) => {
        // The primary submit logic is now handled in useInput via Enter key
        // This might still be called by TextInput's internal onSubmit, ensure consistency
        if (mode === 'option' && predefinedOptions.length > 0) {
            const selectedOption = predefinedOptions[selectedIndex];
            if (selectedOption.toLowerCase() === 'outros') {
                setMode('input');
                setInputValue('');
            }
            else {
                onSubmit(questionId, selectedOption);
            }
        }
        else {
            onSubmit(questionId, value); // Use the value from TextInput in case it triggered submit
        }
    };
    return (React.createElement(React.Fragment, null,
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { bold: true, color: "cyan", wrap: "wrap" }, question)),
        predefinedOptions.length > 0 && (React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { dimColor: true }, "Use \u2191/\u2193 to select options, type for custom input, Enter to submit"),
            viewportStart > 0 && (React.createElement(Text, { dimColor: true },
                "  \u2191 ",
                viewportStart,
                " more above")),
            predefinedOptions.slice(viewportStart, viewportStart + VIEWPORT_SIZE).map((opt, relativeI) => {
                const i = viewportStart + relativeI;
                return (React.createElement(Text, { key: i, color: i === selectedIndex && mode === 'option'
                        ? 'greenBright'
                        : undefined },
                    i === selectedIndex && mode === 'option' ? '› ' : '  ',
                    opt));
            }),
            viewportStart + VIEWPORT_SIZE < predefinedOptions.length && (React.createElement(Text, { dimColor: true },
                "  \u2193 ",
                predefinedOptions.length - viewportStart - VIEWPORT_SIZE,
                " more below")))),
        React.createElement(Box, null,
            React.createElement(Text, { color: mode === 'input' ? 'greenBright' : undefined },
                mode === 'input' ? '✎ ' : '› ',
                React.createElement(TextInput, { placeholder: mode === 'input' &&
                        predefinedOptions[selectedIndex]?.toLowerCase() === 'outros'
                        ? 'Digite o valor para "Outros"...'
                        : predefinedOptions.length > 0
                            ? 'Type or select an option...'
                            : 'Type your answer...', onChange: handleInputChange, onSubmit: handleSubmit })))));
};
