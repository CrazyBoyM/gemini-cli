/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';

interface ConfirmationDialogProps {
  prompt: string;
  onConfirmation: (confirmed: boolean) => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  prompt,
  onConfirmation,
}) => {
  useInput((input, key) => {
    if (key.return) {
      onConfirmation(true);
    } else if (input.toLowerCase() === 'y') {
      onConfirmation(true);
    } else if (key.escape || input.toLowerCase() === 'n') {
      onConfirmation(false);
    }
  });

  return (
    <Box
      borderStyle="round"
      borderColor={Colors.AccentYellow}
      paddingX={1}
      flexDirection="column"
    >
      <Text color={Colors.AccentYellow}>{prompt}</Text>
      <Text color={Colors.Gray}>(y/N)</Text>
    </Box>
  );
};
