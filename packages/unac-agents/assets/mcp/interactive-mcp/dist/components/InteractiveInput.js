import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
const VIEWPORT_SIZE = 8;
function isOtherOption(opt) {
    const lower = opt.toLowerCase().trim();
    return lower === 'outro' || lower === 'outros' || lower === 'other' || lower === 'others';
}
export const InteractiveInput = ({ question, questionId, predefinedOptions = [], onSubmit, }) => {
    const [mode, setMode] = useState(predefinedOptions.length > 0 ? 'option' : 'input');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [viewportStart, setViewportStart] = useState(0);
    const [otherInputValue, setOtherInputValue] = useState('');
    const isOtherHighlighted = mode === 'option' &&
        predefinedOptions.length > 0 &&
        isOtherOption(predefinedOptions[selectedIndex] ?? '');
    useEffect(() => {
        setViewportStart((prev) => {
            if (selectedIndex < prev)
                return selectedIndex;
            if (selectedIndex >= prev + VIEWPORT_SIZE)
                return selectedIndex - VIEWPORT_SIZE + 1;
            return prev;
        });
    }, [selectedIndex]);
    useInput((input, key) => {
        if (predefinedOptions.length > 0) {
            if (key.upArrow) {
                setMode('option');
                setSelectedIndex((prev) => (prev - 1 + predefinedOptions.length) % predefinedOptions.length);
                setOtherInputValue('');
                return;
            }
            if (key.downArrow) {
                setMode('option');
                setSelectedIndex((prev) => (prev + 1) % predefinedOptions.length);
                setOtherInputValue('');
                return;
            }
        }
        if (key.return) {
            if (mode === 'option' && predefinedOptions.length > 0) {
                const selectedOption = predefinedOptions[selectedIndex];
                if (isOtherOption(selectedOption)) {
                    onSubmit(questionId, otherInputValue.trim() || selectedOption);
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
        // Backspace/delete for inline "outro" input
        if (key.backspace || key.delete) {
            if (isOtherHighlighted) {
                setOtherInputValue((prev) => prev.slice(0, -1));
                return;
            }
        }
        // Character input
        if (!key.ctrl &&
            !key.meta &&
            !key.escape &&
            !key.tab &&
            !key.leftArrow &&
            !key.rightArrow &&
            input) {
            if (isOtherHighlighted) {
                setOtherInputValue((prev) => prev + input);
                return;
            }
            setMode('input');
            if (mode === 'option') {
                setInputValue(input);
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
        if (mode === 'option' && predefinedOptions.length > 0) {
            const selectedOption = predefinedOptions[selectedIndex];
            if (isOtherOption(selectedOption)) {
                onSubmit(questionId, otherInputValue.trim() || selectedOption);
            }
            else {
                onSubmit(questionId, selectedOption);
            }
        }
        else {
            onSubmit(questionId, value);
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
                const isSelected = i === selectedIndex && mode === 'option';
                const showOtherInput = isSelected && isOtherOption(opt);
                return (React.createElement(Box, { key: i, flexDirection: "column" },
                    React.createElement(Text, { color: isSelected ? 'greenBright' : undefined },
                        isSelected ? '› ' : '  ',
                        opt),
                    showOtherInput && (React.createElement(Box, { marginLeft: 2, marginTop: 0, borderStyle: "single", borderColor: "greenBright", paddingX: 1 },
                        React.createElement(Text, { color: "greenBright" },
                            '✎ ',
                            otherInputValue,
                            React.createElement(Text, { bold: true, color: "greenBright" }, '█'))))));
            }),
            viewportStart + VIEWPORT_SIZE < predefinedOptions.length && (React.createElement(Text, { dimColor: true },
                "  \u2193 ",
                predefinedOptions.length - viewportStart - VIEWPORT_SIZE,
                " more below")))),
        !isOtherHighlighted && (React.createElement(Box, { borderStyle: "single", borderColor: mode === 'input' ? 'greenBright' : 'gray', paddingX: 1 },
            React.createElement(Text, { color: mode === 'input' ? 'greenBright' : 'dim' },
                mode === 'input' ? '✎ ' : '› ',
                React.createElement(TextInput, { placeholder: predefinedOptions.length > 0
                        ? 'Type or select an option...'
                        : 'Type your answer...', onChange: handleInputChange, onSubmit: handleSubmit }))))));
};
