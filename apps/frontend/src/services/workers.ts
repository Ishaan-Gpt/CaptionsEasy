/**
 * Local-worker pairing + management. Source: apps/backend/app/api/v1/
 * workers.py, pairing_public.py — cloud processing is paused (see
 * DEPLOYMENT.md); AI pipeline/render jobs run on a user's own paired
 * computer instead. Mirrors the projects.ts service pattern exactly.
 */

import { apiClient, ApiError } from "./api-client";

export interface Worker {
  id: string;
  name: string;
  status: "online" | "offline";
  lastSeenAt: string | null;
  lastError: string | null;
}

interface BackendWorker {
  id: string;
  name: string;
  status: string;
  lastSeenAt: string | null;
  lastError: string | null;
}

function toWorker(w: BackendWorker): Worker {
  return {
    id: w.id,
    name: w.name,
    status: w.status === "online" ? "online" : "offline",
    lastSeenAt: w.lastSeenAt,
    lastError: w.lastError,
  };
}

export interface PairingDetails {
  code: string;
  workerName: string;
  status: "pending" | "confirmed" | "denied" | "expired";
  expiresAt: string;
}

export const workersService = {
  async getMyWorkers(): Promise<Worker[]> {
    const workers = await apiClient.get<BackendWorker[]>("/workers");
    return workers.map(toWorker);
  },

  async deleteWorker(id: string): Promise<void> {
    await apiClient.delete(`/workers/${id}`);
  },

  async getPairingDetails(code: string): Promise<PairingDetails | null> {
    try {
      return await apiClient.get<PairingDetails>(`/pairing/${code}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "NOT_FOUND") return null;
      throw err;
    }
  },

  async confirmPairing(code: string): Promise<{ workerId: string; name: string }> {
    return apiClient.post(`/pairing/${code}/confirm`);
  },

  async denyPairing(code: string): Promise<void> {
    await apiClient.post(`/pairing/${code}/deny`);
  },
};
