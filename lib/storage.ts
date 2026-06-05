/**
 * localStorage persistence layer
 * Keys: "sea_leads" | "sea_websites"
 *
 * All functions are safe to call during SSR — they check for window first
 * and return empty arrays/null on the server.
 */

import type { Lead, LeadStatus, GeneratedWebsite, Business } from "@/types";

// ─── helpers ──────────────────────────────────────────────────────────────────

function isClient() {
  return typeof window !== "undefined";
}

function readKey<T>(key: string): T[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeKey<T>(key: string, data: T[]): void {
  if (!isClient()) return;
  localStorage.setItem(key, JSON.stringify(data));
}

function uuid(): string {
  return crypto.randomUUID();
}

// ─── LEADS ────────────────────────────────────────────────────────────────────

const LEADS_KEY = "sea_leads";

export function getLeads(): Lead[] {
  return readKey<Lead>(LEADS_KEY);
}

/** Add a business as a lead (status = "discovered"). Deduplicates by business_id. */
export function saveLead(business: Business): Lead {
  const leads = getLeads();
  const existing = leads.find((l) => l.business_id === business.id);
  if (existing) return existing;

  const lead: Lead = {
    id: uuid(),
    business_id: business.id,
    status: "discovered",
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    business,
  };

  writeKey(LEADS_KEY, [...leads, lead]);
  return lead;
}

export function updateLeadStatus(leadId: string, status: LeadStatus): void {
  const leads = getLeads();
  const updated = leads.map((l) =>
    l.id === leadId ? { ...l, status, updated_at: new Date().toISOString() } : l
  );
  writeKey(LEADS_KEY, updated);
}

export function updateLeadNotes(leadId: string, notes: string): void {
  const leads = getLeads();
  const updated = leads.map((l) =>
    l.id === leadId ? { ...l, notes, updated_at: new Date().toISOString() } : l
  );
  writeKey(LEADS_KEY, updated);
}

export function deleteLead(leadId: string): void {
  const leads = getLeads().filter((l) => l.id !== leadId);
  writeKey(LEADS_KEY, leads);
}

export function isLeadSaved(businessId: string): boolean {
  return getLeads().some((l) => l.business_id === businessId);
}

// ─── SAVED WEBSITES ───────────────────────────────────────────────────────────

const WEBSITES_KEY = "sea_websites";

export function getSavedWebsites(): GeneratedWebsite[] {
  return readKey<GeneratedWebsite>(WEBSITES_KEY);
}

/** Save or overwrite a generated website (upsert by business_id). */
export function saveWebsite(website: GeneratedWebsite): GeneratedWebsite {
  const sites = getSavedWebsites();
  const idx = sites.findIndex((s) => s.business_id === website.business_id);

  const toSave: GeneratedWebsite = {
    ...website,
    id: website.id || uuid(),
    updated_at: new Date().toISOString(),
  };

  if (idx >= 0) {
    sites[idx] = toSave;
  } else {
    sites.push(toSave);
  }

  writeKey(WEBSITES_KEY, sites);
  return toSave;
}

export function getWebsiteByBusinessId(businessId: string): GeneratedWebsite | null {
  return getSavedWebsites().find((s) => s.business_id === businessId) ?? null;
}

export function getWebsiteById(id: string): GeneratedWebsite | null {
  return getSavedWebsites().find((s) => s.id === id) ?? null;
}

export function updateWebsite(
  id: string,
  patch: Partial<GeneratedWebsite>
): GeneratedWebsite | null {
  const sites = getSavedWebsites();
  const idx = sites.findIndex((s) => s.id === id);
  if (idx < 0) return null;

  sites[idx] = { ...sites[idx], ...patch, updated_at: new Date().toISOString() };
  writeKey(WEBSITES_KEY, sites);
  return sites[idx];
}

export function deleteWebsite(id: string): void {
  const sites = getSavedWebsites().filter((s) => s.id !== id);
  writeKey(WEBSITES_KEY, sites);
}

// ─── SEARCH CACHE ─────────────────────────────────────────────────────────────
// Stores the last batch of search results so the profile page can load
// instantly without a second SerpApi call.

const SEARCH_CACHE_KEY = "sea_search_cache";

export function cacheBusinesses(businesses: Business[]): void {
  if (!isClient()) return;
  const map: Record<string, Business> = {};
  // Merge with existing cache so profiles from earlier searches still work
  try {
    const existing = localStorage.getItem(SEARCH_CACHE_KEY);
    if (existing) Object.assign(map, JSON.parse(existing));
  } catch { /* ignore */ }
  businesses.forEach((b) => { map[b.id] = b; });
  localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(map));
}

export function getCachedBusiness(id: string): Business | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(SEARCH_CACHE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, Business>;
    return map[id] ?? null;
  } catch {
    return null;
  }
}
