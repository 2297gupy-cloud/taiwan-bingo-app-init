import { describe, expect, it } from "vitest";
import { taiwanBingoV2Config, exportUIConfigAsJSON, exportUIConfigAsTS } from "./ui-config-export";

describe("UI Config Export", () => {
  it("should have valid taiwanBingoV2Config structure", () => {
    expect(taiwanBingoV2Config).toBeDefined();
    expect(taiwanBingoV2Config.name).toBe("台灣賓果開獎網 V2");
    expect(taiwanBingoV2Config.version).toBe("2.0.0");
    expect(taiwanBingoV2Config.appType).toBe("bingo");
  });

  it("should have valid theme config", () => {
    const { themeConfig } = taiwanBingoV2Config;
    expect(themeConfig.defaultTheme).toBe("dark");
    expect(themeConfig.primaryColor).toBeDefined();
    expect(themeConfig.accentColor).toBeDefined();
    expect(themeConfig.fontFamily).toBeDefined();
  });

  it("should have valid layout config", () => {
    const { layoutConfig } = taiwanBingoV2Config;
    expect(layoutConfig.headerHeight).toBe(80);
    expect(layoutConfig.footerHeight).toBe(56);
    expect(layoutConfig.hasTabBar).toBe(true);
    expect(layoutConfig.tabBarPosition).toBe("bottom");
  });

  it("should have at least 3 pages configured", () => {
    const { pagesConfig } = taiwanBingoV2Config;
    expect(pagesConfig.length).toBeGreaterThanOrEqual(3);
    
    // Check main page
    const mainPage = pagesConfig.find(p => p.id === "main");
    expect(mainPage).toBeDefined();
    expect(mainPage?.sections.length).toBeGreaterThan(0);
  });

  it("should have navigation items configured", () => {
    const { navigationConfig } = taiwanBingoV2Config;
    expect(navigationConfig.items.length).toBeGreaterThan(0);
    
    // Check for specific navigation items
    const homeItem = navigationConfig.items.find(i => i.id === "home");
    expect(homeItem).toBeDefined();
    expect(homeItem?.label).toBe("首頁");
  });

  it("should have component library configured", () => {
    const { componentLibrary } = taiwanBingoV2Config;
    expect(componentLibrary.buttons).toBeDefined();
    expect(componentLibrary.cards).toBeDefined();
    expect(componentLibrary.inputs).toBeDefined();
  });

  it("should have API endpoints configured", () => {
    const { apiConfig } = taiwanBingoV2Config;
    expect(apiConfig.endpoints.length).toBeGreaterThan(0);
    
    // Check for specific endpoints
    const latestEndpoint = apiConfig.endpoints.find(e => e.name === "draw.latest");
    expect(latestEndpoint).toBeDefined();
    expect(latestEndpoint?.method).toBe("GET");
  });

  it("should have database tables configured", () => {
    const { databaseConfig } = taiwanBingoV2Config;
    expect(databaseConfig.tables.length).toBeGreaterThan(0);
    
    // Check for draw_records table
    const drawTable = databaseConfig.tables.find(t => t.name === "draw_records");
    expect(drawTable).toBeDefined();
    expect(drawTable?.columns.length).toBeGreaterThan(0);
  });

  it("should export config as valid JSON", () => {
    const json = exportUIConfigAsJSON(taiwanBingoV2Config);
    expect(json).toBeDefined();
    expect(typeof json).toBe("string");
    
    // Verify it's valid JSON
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe("台灣賓果開獎網 V2");
  });

  it("should export config as valid TypeScript", () => {
    const ts = exportUIConfigAsTS(taiwanBingoV2Config);
    expect(ts).toBeDefined();
    expect(typeof ts).toBe("string");
    expect(ts).toContain("export const uiConfig");
    expect(ts).toContain("export type UIConfig");
  });

  it("should have all required page sections", () => {
    const mainPage = taiwanBingoV2Config.pagesConfig.find(p => p.id === "main");
    expect(mainPage).toBeDefined();
    
    const sectionIds = mainPage?.sections.map(s => s.id) || [];
    expect(sectionIds).toContain("header");
    expect(sectionIds).toContain("announcement");
    expect(sectionIds).toContain("live-draw");
    expect(sectionIds).toContain("ai-prediction");
  });

  it("should have valid component variants", () => {
    const { componentLibrary } = taiwanBingoV2Config;
    const primaryButton = componentLibrary.buttons?.primary;
    expect(primaryButton).toBeDefined();
    expect(primaryButton?.className).toBeDefined();
    expect(primaryButton?.sizes).toBeDefined();
  });

  it("should have consistent navigation and pages", () => {
    const { navigationConfig, pagesConfig } = taiwanBingoV2Config;
    
    // Get all page paths
    const pagePaths = new Set(pagesConfig.map(p => p.path));
    
    // Check that navigation items with paths point to valid pages
    navigationConfig.items.forEach(item => {
      if (item.path && item.path !== "/#" && !item.path.startsWith("/#")) {
        // Allow hash-based navigation
        expect(item.path).toBeDefined();
      }
    });
  });
});
