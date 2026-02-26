"use client";

import { useState, useEffect } from "react";
import { Sidebar, MobileNav } from "@/components/Navigation";
import { PlatformIcon } from "@/components/PlatformIcon";
import {
  PLATFORMS,
  PlatformId,
  AccountCredentials,
  ConnectedAccount,
} from "@/types";
import { loadCredentials, saveCredentials, loadAccounts, saveAccounts } from "@/lib/store";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
} from "lucide-react";

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  type?: string;
  help?: string;
}

const PLATFORM_FIELDS: Record<PlatformId, FieldDef[]> = {
  bluesky: [
    { key: "handle", label: "Handle", placeholder: "you.bsky.social", help: "Your Bluesky handle (without @)" },
    { key: "appPassword", label: "App Password", placeholder: "xxxx-xxxx-xxxx-xxxx", type: "password", help: "Create one at bsky.app → Settings → App Passwords" },
  ],
  twitter: [
    { key: "bearerToken", label: "Bearer Token", placeholder: "AAAA...", type: "password", help: "From Twitter Developer Portal → Your App → Keys & Tokens" },
    { key: "apiKey", label: "API Key (Consumer Key)", placeholder: "", type: "password" },
    { key: "apiSecret", label: "API Secret", placeholder: "", type: "password" },
    { key: "accessToken", label: "Access Token", placeholder: "", type: "password" },
    { key: "accessTokenSecret", label: "Access Token Secret", placeholder: "", type: "password" },
  ],
  mastodon: [
    { key: "instance", label: "Instance URL", placeholder: "mastodon.social", help: "Your Mastodon server (e.g., mastodon.social)" },
    { key: "accessToken", label: "Access Token", placeholder: "", type: "password", help: "Settings → Development → New Application" },
  ],
};

function FormField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const isPassword = field.type === "password";

  return (
    <div>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
        {field.label}
      </label>
      {field.help && (
        <p className="text-xs text-zinc-400 mb-1">{field.help}</p>
      )}
      <div className="relative">
        <input
          type={isPassword && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-violet-400 dark:focus:border-violet-600 transition-colors pr-8"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

interface PlatformCardProps {
  platformId: PlatformId;
  credentials: AccountCredentials;
  account: ConnectedAccount | undefined;
  onSave: (creds: Partial<AccountCredentials>) => Promise<void>;
  onDisconnect: () => void;
  onRefresh: () => Promise<void>;
}

function PlatformCard({
  platformId,
  credentials,
  account,
  onSave,
  onDisconnect,
  onRefresh,
}: PlatformCardProps) {
  const platform = PLATFORMS.find((p) => p.id === platformId)!;
  const fields = PLATFORM_FIELDS[platformId];
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!account?.connected);

  // Initialize form values from existing credentials
  useEffect(() => {
    const cred = credentials[platformId] as Record<string, string> | undefined;
    if (cred) {
      setValues(cred);
    }
  }, [credentials, platformId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const credPatch = { [platformId]: values } as Partial<AccountCredentials>;
      await onSave(credPatch);
      setExpanded(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <PlatformIcon platform={platformId} size={20} withBg />
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {platform.name}
            </h3>
            {account?.connected ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <CheckCircle size={12} className="text-green-500" />
                <span className="text-xs text-zinc-500">{account.handle}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-0.5">
                <XCircle size={12} className="text-zinc-300" />
                <span className="text-xs text-zinc-400">Not connected</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {account?.connected && (
            <>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 transition-colors"
                title="Refresh profile"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              </button>
              <button
                onClick={onDisconnect}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500 transition-colors"
                title="Disconnect"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
          >
            {account?.connected ? "Edit" : "Connect"}
          </button>
        </div>
      </div>

      {/* Profile info */}
      {account?.connected && (
        <div className="px-4 pb-3 flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          {account.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={account.avatarUrl}
              alt=""
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          )}
          <div>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {account.displayName}
            </span>
            <span className="ml-1 text-zinc-400">{account.handle}</span>
          </div>
        </div>
      )}

      {account?.error && (
        <div className="px-4 pb-3 text-xs text-red-500">{account.error}</div>
      )}

      {/* Form */}
      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 flex flex-col gap-3">
          {fields.map((field) => (
            <FormField
              key={field.key}
              field={field}
              value={values[field.key] || ""}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
            />
          ))}

          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <XCircle size={12} /> {error}
            </p>
          )}

          <div className="flex gap-2 mt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-semibold transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Connecting..." : "Save & Connect"}
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountsPage() {
  const [credentials, setCredentials] = useState<AccountCredentials>({});
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCredentials(loadCredentials());
    setAccounts(loadAccounts());
    setLoading(false);
  }, []);

  async function fetchProfile(platformId: PlatformId, creds: AccountCredentials): Promise<ConnectedAccount> {
    if (platformId === "bluesky" && creds.bluesky) {
      const res = await fetch("/api/bluesky/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds.bluesky),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return {
        platform: "bluesky",
        handle: `@${data.handle}`,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        connected: true,
      };
    }

    if (platformId === "twitter" && creds.twitter) {
      const res = await fetch("/api/twitter/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds.twitter),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return {
        platform: "twitter",
        handle: data.handle,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        connected: true,
      };
    }

    if (platformId === "mastodon" && creds.mastodon) {
      const res = await fetch("/api/mastodon/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creds.mastodon),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return {
        platform: "mastodon",
        handle: data.handle,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        connected: true,
      };
    }

    throw new Error("Missing credentials");
  }

  async function handleSave(platformId: PlatformId, credPatch: Partial<AccountCredentials>) {
    const merged = { ...credentials, ...credPatch };
    saveCredentials(merged);
    setCredentials(merged);

    // Test connection
    const account = await fetchProfile(platformId, merged);
    const next = [
      ...accounts.filter((a) => a.platform !== platformId),
      account,
    ];
    saveAccounts(next);
    setAccounts(next);
  }

  async function handleRefresh(platformId: PlatformId) {
    const account = await fetchProfile(platformId, credentials);
    const next = [
      ...accounts.filter((a) => a.platform !== platformId),
      account,
    ];
    saveAccounts(next);
    setAccounts(next);
  }

  function handleDisconnect(platformId: PlatformId) {
    const { [platformId]: _, ...rest } = credentials;
    void _;
    saveCredentials(rest);
    setCredentials(rest);

    const next = accounts.filter((a) => a.platform !== platformId);
    saveAccounts(next);
    setAccounts(next);
  }

  if (loading) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <MobileNav />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Accounts</h1>
              <p className="text-sm text-zinc-500 mt-1">
                Connect your social media accounts. Credentials are stored locally in your browser.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {PLATFORMS.map((p) => (
                <PlatformCard
                  key={p.id}
                  platformId={p.id}
                  credentials={credentials}
                  account={accounts.find((a) => a.platform === p.id)}
                  onSave={(patch) => handleSave(p.id, patch)}
                  onDisconnect={() => handleDisconnect(p.id)}
                  onRefresh={() => handleRefresh(p.id)}
                />
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4 text-xs text-zinc-500">
              <strong className="text-zinc-600 dark:text-zinc-400">Security note:</strong> All credentials
              are stored only in your browser&apos;s localStorage and sent directly to the platform APIs.
              They are never stored on any server.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
