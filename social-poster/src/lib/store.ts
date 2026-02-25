"use client";

import {
  AccountCredentials,
  ConnectedAccount,
  AnalyticsData,
  PlatformId,
} from "@/types";

const CREDS_KEY = "vibe_credentials";
const ACCOUNTS_KEY = "vibe_accounts";
const ANALYTICS_KEY = "vibe_analytics";

export function saveCredentials(creds: AccountCredentials): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
}

export function loadCredentials(): AccountCredentials {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveAccounts(accounts: ConnectedAccount[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function loadAccounts(): ConnectedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAnalytics(data: Record<PlatformId, AnalyticsData>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
}

export function loadAnalytics(): Partial<Record<PlatformId, AnalyticsData>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function clearAll(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CREDS_KEY);
  localStorage.removeItem(ACCOUNTS_KEY);
  localStorage.removeItem(ANALYTICS_KEY);
}
