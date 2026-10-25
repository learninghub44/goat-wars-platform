import { createContext, useContext } from 'react';
import type { AppConfig } from '../types';

export const SiteContext = createContext<AppConfig>({ siteUrl: typeof window !== 'undefined' ? window.location.origin : '', supportEmail: null, currency: 'KES' });
export const useSite = () => useContext(SiteContext);
