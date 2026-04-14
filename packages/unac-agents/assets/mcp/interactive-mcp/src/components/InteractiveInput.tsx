import React, { FC, useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import logger from '@/utils/logger.js';

const VIEWPORT_SIZE = 8;

function isOtherOption(opt: string): boolean {
  const lower = opt.toLowerCase().trim();
  return lower === 'outro' || lower === 'outros' || lower === 'other' || lower === 'others';
}

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
  const [otherInputValue, setOtherInputValue] = useState<string>('');

  const isOtherHighlighted =
    mode === 'option' &&
    predefinedOptions.length > 0 &&
    isOtherOption(predefinedOptions[selectedIndex] ?? '');

  useEffect(() => {
    setViewportStart((prev) => {
      if (selectedIndex < prev) return selectedIndex;
      if (selectedIndex >= prev + VIEWPORT_SIZE) return selectedIndex - VIEWPORT_SIZE + 1;
      return prev;
    });
  }, [selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
    setViewportStart(0);
    setOtherInputValue('');
  }, [predefinedOptions]);

  useInput((input, key) => {
    if (predefinedOptions.length > 0) {
      if (key.upArrow) {
        setMode('option');
        setSelectedIndex(
          (prev) =>
            (prev - 1 + predefinedOptions.length) % predefinedOptions.length,
        );
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
        } else {
          onSubmit(questionId, selectedOption);
        }
      } else {
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
    if (
      !key.ctrl &&
      !key.meta &&
      !key.escape &&
      !key.tab &&
      !key.leftArrow &&
      !key.rightArrow &&
      input
    ) {
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
    if (mode === 'option' && predefinedOptions.length > 0) {
      const selectedOption = predefinedOptions[selectedIndex];
      if (isOtherOption(selectedOption)) {
        onSubmit(questionId, otherInputValue.trim() || selectedOption);
      } else {
        onSubmit(questionId, selectedOption);
      }
    } else {
      onSubmit(questionId, value);
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
            const isSelected = i === selectedIndex && mode === 'option';
            const showOtherInput = isSelected && isOtherOption(opt);
            return (
              <Box key={i} flexDirection="column">
                <Text color={isSelected ? 'greenBright' : undefined}>
                  {isSelected ? '› ' : '  '}
                  {opt}
                </Text>
                {showOtherInput && (
                  <Box
                    marginLeft={2}
                    marginTop={0}
                    borderStyle="single"
                    borderColor="greenBright"
                    paddingX={1}
                  >
                    <Text color="greenBright">
                      {'✎ '}
                      {otherInputValue}
                      <Text bold color="greenBright">
                        {'█'}
                      </Text>
                    </Text>
                  </Box>
                )}
              </Box>
            );
          })}
          {viewportStart + VIEWPORT_SIZE < predefinedOptions.length && (
            <Text dimColor>  ↓ {predefinedOptions.length - viewportStart - VIEWPORT_SIZE} more below</Text>
          )}
        </Box>
      )}

      {!isOtherHighlighted && (
        <Box
          borderStyle="single"
          borderColor={mode === 'input' ? 'greenBright' : 'gray'}
          paddingX={1}
        >
          <Text color={mode === 'input' ? 'greenBright' : 'dim'}>
            {mode === 'input' ? '✎ ' : '› '}
            <TextInput
              placeholder={
                predefinedOptions.length > 0
                  ? 'Type or select an option...'
                  : 'Type your answer...'
              }
              onChange={handleInputChange}
              onSubmit={handleSubmit}
            />
          </Text>
        </Box>
      )}
    </>
  );
};
