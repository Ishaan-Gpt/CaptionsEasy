/**
 * MotionScript service. Source: GET /projects/{id}/motion-script.
 */

import { apiClient, ApiError } from "./api-client";

export const motionScriptService = {
  async getMotionScript(projectId: string): Promise<any | null> {
    try {
      return await apiClient.get<any>(`/projects/${projectId}/motion-script`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "NOT_FOUND") return null;
      throw err;
    }
  },
};
