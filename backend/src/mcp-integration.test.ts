import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { generateAllMCPTools, generateToolCommandMapping } from "./mcp-generator.ts";
import { createUniversalHandler } from "./universal-handler.ts";
import { BattleStore } from "./battle-store.ts";
import { CampaignStore } from "./campaign-store.ts";

Deno.test("MCP Integration - Tool Generation Works", () => {
    const tools = generateAllMCPTools();

    // Should generate tools
    assert(tools.length > 0, "Should generate at least one tool");

    // Should include key battle management tools
    assert(tools.find(t => t.name === 'create_battle'), "Should include create_battle tool");
    assert(tools.find(t => t.name === 'list_battles'), "Should include list_battles tool");
    assert(tools.find(t => t.name === 'add_creature'), "Should include add_creature tool");
});

Deno.test("MCP Integration - Universal Handler Basic Flow", async () => {
    // Set up test stores with disabled saves
    Deno.env.set("DISABLE_SAVES", "true");
    const campaignStore = new CampaignStore();
    const battleStore = new BattleStore(campaignStore);
    const handler = createUniversalHandler(battleStore, campaignStore);

    // Test basic list operation
    const result = await handler.handle('LIST_BATTLES', {});

    assertEquals(result.success, true, "Should succeed for valid command");
    assert(Array.isArray(result.data), "Should return array for LIST_BATTLES");

    // Clean up
    Deno.env.delete("DISABLE_SAVES");
});

Deno.test("MCP Integration - Tool Command Mapping", () => {
    const mapping = generateToolCommandMapping();

    // Should map key tools correctly
    assertEquals(mapping['create_battle'], 'CREATE_BATTLE');
    assertEquals(mapping['list_battles'], 'LIST_BATTLES');
    assertEquals(mapping['add_creature'], 'ADD_CREATURE');
    assertEquals(mapping['list_campaigns'], 'LIST_CAMPAIGNS');

    // Should have reasonable number of mappings
    const mappingCount = Object.keys(mapping).length;
    assert(mappingCount > 10, `Should have multiple tool mappings, got ${mappingCount}`);
});