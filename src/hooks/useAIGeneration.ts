/**
 * Custom React Hook for AI Generation State Management
 * Provides reusable logic for handling async generation requests with loading and error states
 */

import { useState } from 'react';

interface GenerationState {
  isLoading: boolean;
  result: string;
  error: string;
}

export function useAIGeneration(initialState: GenerationState = { isLoading: false, result: '', error: '' }) {
  const [state, setState] = useState<GenerationState>(initialState);

  const setLoading = (isLoading: boolean) => {
    setState((prev) => ({ ...prev, isLoading }));
  };

  const setResult = (result: string) => {
    setState((prev) => ({ ...prev, result }));
  };

  const setError = (error: string) => {
    setState((prev) => ({ ...prev, error }));
  };

  const clearError = () => {
    setState((prev) => ({ ...prev, error: '' }));
  };

  const clearResult = () => {
    setState((prev) => ({ ...prev, result: '' }));
  };

  const reset = () => {
    setState({ isLoading: false, result: '', error: '' });
  };

  return {
    ...state,
    setLoading,
    setResult,
    setError,
    clearError,
    clearResult,
    reset,
  };
}
