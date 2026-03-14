import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { uiConfigTemplates, userUIConfigs, uiComponents } from "../drizzle/ui-config-schema";
import type { InsertUIConfigTemplate, InsertUserUIConfig, InsertUIComponent } from "../drizzle/ui-config-schema";

/**
 * 保存 UI 配置範本到資料庫
 */
export async function saveUIConfigTemplate(config: InsertUIConfigTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const result = await db.insert(uiConfigTemplates).values(config);
    return result;
  } catch (error) {
    console.error("[UIConfig] Failed to save template:", error);
    throw error;
  }
}

/**
 * 獲取所有公開的 UI 配置範本
 */
export async function getPublicUIConfigTemplates() {
  const db = await getDb();
  if (!db) return [];

  try {
    const templates = await db
      .select()
      .from(uiConfigTemplates)
      .where(eq(uiConfigTemplates.isPublic, true));
    return templates;
  } catch (error) {
    console.error("[UIConfig] Failed to get public templates:", error);
    return [];
  }
}

/**
 * 按名稱獲取 UI 配置範本
 */
export async function getUIConfigTemplateByName(name: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const template = await db
      .select()
      .from(uiConfigTemplates)
      .where(eq(uiConfigTemplates.name, name))
      .limit(1);
    return template.length > 0 ? template[0] : null;
  } catch (error) {
    console.error("[UIConfig] Failed to get template by name:", error);
    return null;
  }
}

/**
 * 獲取使用者的 UI 配置
 */
export async function getUserUIConfigs(userId: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const configs = await db
      .select()
      .from(userUIConfigs)
      .where(eq(userUIConfigs.userId, userId));
    return configs;
  } catch (error) {
    console.error("[UIConfig] Failed to get user configs:", error);
    return [];
  }
}

/**
 * 保存使用者 UI 配置
 */
export async function saveUserUIConfig(config: InsertUserUIConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const result = await db.insert(userUIConfigs).values(config);
    return result;
  } catch (error) {
    console.error("[UIConfig] Failed to save user config:", error);
    throw error;
  }
}

/**
 * 保存 UI 組件到組件庫
 */
export async function saveUIComponent(component: InsertUIComponent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const result = await db.insert(uiComponents).values(component);
    return result;
  } catch (error) {
    console.error("[UIConfig] Failed to save component:", error);
    throw error;
  }
}

/**
 * 獲取所有公開的 UI 組件
 */
export async function getPublicUIComponents() {
  const db = await getDb();
  if (!db) return [];

  try {
    const components = await db
      .select()
      .from(uiComponents)
      .where(eq(uiComponents.isPublic, true));
    return components;
  } catch (error) {
    console.error("[UIConfig] Failed to get public components:", error);
    return [];
  }
}

/**
 * 按類型獲取 UI 組件
 */
export async function getUIComponentsByType(type: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const components = await db
      .select()
      .from(uiComponents)
      .where(eq(uiComponents.type, type));
    return components;
  } catch (error) {
    console.error("[UIConfig] Failed to get components by type:", error);
    return [];
  }
}

/**
 * 增加 UI 配置範本的下載次數
 */
export async function incrementTemplateDownloadCount(templateId: number) {
  const db = await getDb();
  if (!db) return;

  try {
    const template = await db
      .select()
      .from(uiConfigTemplates)
      .where(eq(uiConfigTemplates.id, templateId))
      .limit(1);

    if (template.length > 0) {
      const currentCount = template[0].downloadCount || 0;
      await db
        .update(uiConfigTemplates)
        .set({ downloadCount: currentCount + 1 })
        .where(eq(uiConfigTemplates.id, templateId));
    }
  } catch (error) {
    console.error("[UIConfig] Failed to increment download count:", error);
  }
}
