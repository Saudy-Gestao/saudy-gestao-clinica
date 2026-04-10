import { notifications } from '@mantine/notifications';
import { resolveApiErrorMessage } from './apiError';

export const showSuccessToast = (params: { title: string; message: string }) => {
  notifications.show({
    title: params.title,
    message: params.message,
    color: 'green',
  });
};

export const showErrorToast = (params: { title: string; error: unknown; fallback: string }) => {
  notifications.show({
    title: params.title,
    message: resolveApiErrorMessage(params.error, params.fallback),
    color: 'red',
  });
};

