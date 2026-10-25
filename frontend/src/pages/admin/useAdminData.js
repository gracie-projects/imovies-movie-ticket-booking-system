import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../api/client.js';

/** Small helper hook: loads an admin endpoint and exposes reload/error state */
export function useAdminData(url, params) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const paramKey = JSON.stringify(params || {});

  const reload = useCallback(async () => {
    setError('');
    try {
      const { data: res } = await api.get(url, { params: JSON.parse(paramKey) });
      setData(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [url, paramKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}

/** Converts a Date/ISO string to the value format of <input type="datetime-local"> */
export function toLocalInput(value) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const splitList = (text) => text.split(',').map((s) => s.trim()).filter(Boolean);
