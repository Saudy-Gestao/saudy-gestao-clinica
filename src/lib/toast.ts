import { notifications } from '@mantine/notifications';
import { resolveApiErrorMessage } from './apiError';

export const showSuccessToast = (params: { title: string; message: string }) => {
  notifications.show({
    title: params.title,
    message: params.message,
    color: 'green',
    autoClose: 4200,
    withCloseButton: true,
    className: 'saudy-toast',
  });
};

export const showErrorToast = (params: { title: string; error: unknown; fallback: string }) => {
  notifications.show({
    title: params.title,
    message: resolveApiErrorMessage(params.error, params.fallback),
    color: 'red',
    autoClose: 7000,
    withCloseButton: true,
    className: 'saudy-toast',
  });
};

export const showInfoToast = (params: { title: string; message: string }) => {
  notifications.show({
    title: params.title,
    message: params.message,
    color: 'blue',
    autoClose: 5000,
    withCloseButton: true,
    className: 'saudy-toast',
  });
};

