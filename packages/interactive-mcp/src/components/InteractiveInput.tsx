import React, { FC, useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import logger from '@/utils/logger.js';

const VIEWPORT_SIZE = 8;

interface InteractiveInputProps {
  question: string;
  questionId: string;
  predefinedOptions?: string[];
  onSubmit: (questionId: string, value: string) => void;
}

export const InteractiveInput: FC<InteractiveInputProps> = ({
  question,
  questionId,
  predefinedOptions = [],
  onSubmit,
}) => {
  const [mode, setMode] = useState<'option' | 'input'>(
    predefinedOptions.length > 0 ? 'option' : 'input',
  );
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [inputValue, setInputValue] = useState<string>('');
  const [viewportStart, setViewportStart] = useState<number>(0);

  useEffect(() => {
    if (selectedIndex < viewportStart) {
      setViewportStart(selectedIndex);
    } else if (selectedIndex >= viewportStart + VIEWPORT_SIZE) {
      setViewportStart(selectedIndex - VIEWPORT_SIZE + 1);
    }
  }, [selectedIndex, viewportStart]);

  useInput((input, key) => {
    if (predefinedOptions.length > 0) {
      if (key.upArrow) {
        setMode('option');
        setSelectedIndex(
          (prev) =>
            (prev - 1 + predefinedOptions.length) % predefinedOptions.length,
        );
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
        } else {
          onSubmit(questionId, selectedOption);
        }
      } else {
        onSubmit(questionId, inputValue);
      }
      return;
    }

    // Any other key press switches to input mode
    if (
      !key.ctrl &&
      !key.meta &&
      !key.escape &&
      !key.tab &&
      !key.shift &&
      !key.leftArrow &&
      !key.rightArrow &&
      input
    ) {
      setMode('input');
      // Update inputValue only if switching to input mode via typing
      // TextInput's onChange will handle subsequent typing
      if (mode === 'option') {
        setInputValue(input); // Start input with the typed character
      }
    }
  });

  const handleInputChange = (value: string) => {
    if (value !== inputValue) {
      setInputValue(value);
      // If user starts typing, switch to input mode
      if (value.length > 0 && mode === 'option') {
        setMode('input');
      } else if (value.length === 0 && predefinedOptions.length > 0) {
        // Optionally switch back to option mode if input is cleared
        // setMode('option');
      }
    }
  };

  const handleSubmit = (value: string) => {
    // The primary submit logic is now handled in useInput via Enter key
    // This might still be called by TextInput's internal onSubmit, ensure consistency
    if (mode === 'option' && predefinedOptions.length > 0) {
      const selectedOption = predefinedOptions[selectedIndex];
      if (selectedOption.toLowerCase() === 'outros') {
        setMode('input');
        setInputValue('');
      } else {
        onSubmit(questionId, selectedOption);
      }
    } else {
      onSubmit(questionId, value); // Use the value from TextInput in case it triggered submit
    }
  };

  return (
    <>
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan" wrap="wrap">
          {question}
        </Text>
      </Box>

      {predefinedOptions.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor={true}>
            Use ↑/↓ to select options, type for custom input, Enter to submit
          </Text>
          {viewportStart > 0 && (
            <Text dimColor>  ↑ {viewportStart} more above</Text>
          )}
          {predefinedOptions.slice(viewportStart, viewportStart + VIEWPORT_SIZE).map((opt, relativeI) => {
            const i = viewportStart + relativeI;
            return (
              <Text
                key={i}
                color={
                  i === selectedIndex && mode === 'option'
                    ? 'greenBright'
                    : undefined
                }
              >
                {i === selectedIndex && mode === 'option' ? '› ' : '  '}
                {opt}
              </Text>
            );
          })}
          {viewportStart + VIEWPORT_SIZE < predefinedOptions.length && (
            <Text dimColor>  ↓ {predefinedOptions.length - viewportStart - VIEWPORT_SIZE} more below</Text>
          )}
        </Box>
      )}

      <Box>
        <Text color={mode === 'input' ? 'greenBright' : undefined}>
          {mode === 'input' ? '✎ ' : '› '}
          <TextInput
            placeholder={
              mode === 'input' &&
              predefinedOptions[selectedIndex]?.toLowerCase() === 'outros'
                ? 'Digite o valor para "Outros"...'
                : predefinedOptions.length > 0
                  ? 'Type or select an option...'
                  : 'Type your answer...'
            }
            onChange={handleInputChange}
            onSubmit={handleSubmit}
          />
        </Text>
      </Box>
    </>
  );
};
