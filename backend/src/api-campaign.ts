import { Hono } from "hono";
import { z } from "zod";
import type { CampaignStore } from "./campaign-store.ts";

export function createCampaignAPI(campaignStore: CampaignStore) {
  const app = new Hono();

  app.get("/api/campaigns", (c) => {
    const campaigns = campaignStore.getAllCampaigns();
    return c.json({ success: true, data: campaigns });
  });

  app.post("/api/campaigns", async (c) => {
    try {
      const body = await c.req.json();
      const { name, description } = body;

      if (!name || typeof name !== "string") {
        return c.json({ success: false, error: "Campaign name is required" }, 400);
      }

      const campaign = campaignStore.createCampaign(name, description);
      return c.json({ success: true, data: campaign });
    } catch (error) {
      return c.json(
        { success: false, error: error instanceof Error ? error.message : "Failed to create campaign" },
        400
      );
    }
  });

  app.get("/api/campaigns/:id", (c) => {
    const { id } = c.req.param();
    const campaign = campaignStore.getCampaign(id);

    if (!campaign) {
      return c.json({ success: false, error: "Campaign not found" }, 404);
    }

    return c.json({ success: true, data: campaign });
  });

  app.put("/api/campaigns/:id", async (c) => {
    try {
      const { id } = c.req.param();
      const updates = await c.req.json();

      const campaign = campaignStore.updateCampaign(id, updates);

      if (!campaign) {
        return c.json({ success: false, error: "Campaign not found" }, 404);
      }

      return c.json({ success: true, data: campaign });
    } catch (error) {
      return c.json(
        { success: false, error: error instanceof Error ? error.message : "Failed to update campaign" },
        400
      );
    }
  });

  app.delete("/api/campaigns/:id", (c) => {
    const { id } = c.req.param();

    try {
      const success = campaignStore.deleteCampaign(id);

      if (!success) {
        return c.json({ success: false, error: "Campaign not found" }, 404);
      }

      return c.json({ success: true, data: {} });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete campaign",
        },
        400
      );
    }
  });

  app.get("/api/campaigns/creatures/search", (c) => {
    const query = c.req.query("q") || "";
    const campaignId = c.req.query("campaignId") || undefined;

    const results = campaignStore.searchCreatures(query, campaignId);
    return c.json({ success: true, data: results });
  });

  app.get("/api/campaigns/maps/search", (c) => {
    const query = c.req.query("q") || "";
    const campaignId = c.req.query("campaignId") || undefined;

    const results = campaignStore.searchMaps(query, campaignId);
    return c.json({ success: true, data: results });
  });

  return app;
}
