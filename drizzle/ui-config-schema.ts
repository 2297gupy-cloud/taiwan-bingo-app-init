import { int, mysqlTable, text, varchar, json, timestamp, boolean } from "drizzle-orm/mysql-core";

/**
 * UI 配置範本表 - 儲存完整的 APP 介面配置
 * 用於下次使用者可直接調用而無需重新建立畫面
 */
export const uiConfigTemplates = mysqlTable("ui_config_templates", {
  id: int("id").autoincrement().primaryKey(),
  /** 範本名稱，例如 "台灣賓果開獎網 V2" */
  name: varchar("name", { length: 255 }).notNull(),
  /** 範本描述 */
  description: text("description"),
  /** 範本版本，例如 "2.0.0" */
  version: varchar("version", { length: 20 }).notNull().default("1.0.0"),
  /** 應用類型：bingo / lottery / sports 等 */
  appType: varchar("appType", { length: 50 }).notNull().default("bingo"),
  /** 主題配置 (深色/淺色、顏色方案等) */
  themeConfig: json("themeConfig").notNull().$type<{
    defaultTheme: "dark" | "light";
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
  }>(),
  /** 頁面佈局配置 */
  layoutConfig: json("layoutConfig").notNull().$type<{
    headerHeight: number;
    footerHeight: number;
    sidebarWidth?: number;
    hasTabBar: boolean;
    tabBarPosition: "top" | "bottom";
  }>(),
  /** 所有頁面的配置 */
  pagesConfig: json("pagesConfig").notNull().$type<Array<{
    id: string;
    name: string;
    path: string;
    title: string;
    icon?: string;
    sections: Array<{
      id: string;
      type: string;
      title?: string;
      props: Record<string, any>;
    }>;
  }>>(),
  /** 導航欄配置 */
  navigationConfig: json("navigationConfig").notNull().$type<{
    items: Array<{
      id: string;
      label: string;
      icon?: string;
      path?: string;
      onClick?: string;
    }>;
    quickActions?: Array<{
      id: string;
      label: string;
      icon?: string;
      onClick: string;
    }>;
  }>(),
  /** 組件庫配置 */
  componentLibrary: json("componentLibrary").notNull().$type<{
    buttons: Record<string, any>;
    cards: Record<string, any>;
    inputs: Record<string, any>;
    modals: Record<string, any>;
    [key: string]: Record<string, any>;
  }>(),
  /** API 路由配置 */
  apiConfig: json("apiConfig").notNull().$type<{
    endpoints: Array<{
      name: string;
      path: string;
      method: "GET" | "POST" | "PUT" | "DELETE";
      description?: string;
    }>;
  }>(),
  /** 資料庫配置 */
  databaseConfig: json("databaseConfig").notNull().$type<{
    tables: Array<{
      name: string;
      columns: Array<{
        name: string;
        type: string;
        required: boolean;
      }>;
    }>;
  }>(),
  /** 是否為公開範本 */
  isPublic: boolean("isPublic").notNull().default(false),
  /** 建立者 ID */
  createdBy: varchar("createdBy", { length: 64 }),
  /** 下載次數 */
  downloadCount: int("downloadCount").default(0).notNull(),
  /** 評分 (1-5) */
  rating: int("rating"),
  /** 建立時間 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新時間 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UIConfigTemplate = typeof uiConfigTemplates.$inferSelect;
export type InsertUIConfigTemplate = typeof uiConfigTemplates.$inferInsert;

/**
 * 使用者 UI 配置表 - 儲存使用者自訂的 UI 配置
 */
export const userUIConfigs = mysqlTable("user_ui_configs", {
  id: int("id").autoincrement().primaryKey(),
  /** 使用者 ID */
  userId: varchar("userId", { length: 64 }).notNull(),
  /** 配置名稱 */
  configName: varchar("configName", { length: 255 }).notNull(),
  /** 基於哪個範本 */
  baseTemplateId: int("baseTemplateId"),
  /** 完整的 UI 配置 */
  config: json("config").notNull().$type<any>(),
  /** 是否為預設配置 */
  isDefault: boolean("isDefault").default(false).notNull(),
  /** 建立時間 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新時間 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserUIConfig = typeof userUIConfigs.$inferSelect;
export type InsertUserUIConfig = typeof userUIConfigs.$inferInsert;

/**
 * UI 組件庫表 - 儲存可重用的組件配置
 */
export const uiComponents = mysqlTable("ui_components", {
  id: int("id").autoincrement().primaryKey(),
  /** 組件名稱 */
  name: varchar("name", { length: 255 }).notNull(),
  /** 組件類型 */
  type: varchar("type", { length: 50 }).notNull(),
  /** 組件描述 */
  description: text("description"),
  /** 組件 Props 配置 */
  propsSchema: json("propsSchema").notNull().$type<{
    [key: string]: {
      type: string;
      default?: any;
      description?: string;
      options?: any[];
    };
  }>(),
  /** 組件樣式配置 */
  styleConfig: json("styleConfig").notNull().$type<{
    className?: string;
    styles?: Record<string, string>;
    variants?: Record<string, Record<string, string>>;
  }>(),
  /** 組件預覽 HTML */
  previewHTML: text("previewHTML"),
  /** 組件使用範例 */
  exampleCode: text("exampleCode"),
  /** 建立者 ID */
  createdBy: varchar("createdBy", { length: 64 }),
  /** 是否為公開組件 */
  isPublic: boolean("isPublic").notNull().default(false),
  /** 建立時間 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 更新時間 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UIComponent = typeof uiComponents.$inferSelect;
export type InsertUIComponent = typeof uiComponents.$inferInsert;
