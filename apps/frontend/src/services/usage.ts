/**
 * Real usage service. Source: contracts/api.md > Usage. There is no
 * billing/plan system configured (no payment provider), so `credits` comes
 * back as `null` from the backend rather than a fabricated number — callers
 * must render that as "not tracked" rather than inventing a figure.
 */

import { apiClient } from "./api-client";

export interface Usage {
  credits: number | null;
  uploads: number;
  exports: number;
  storage_bytes: number;
}

export const usageService = {
  async getUsage(): Promise<Usage> {
    return apiClient.get<Usage>("/usage");
  },
};
