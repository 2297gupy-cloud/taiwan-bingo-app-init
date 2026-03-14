# 台灣賓果應用 - Docker 容器化

# 構建階段
FROM node:22-alpine AS builder

WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm

# 複製 package 檔案
COPY package.json pnpm-lock.yaml ./

# 安裝依賴
RUN pnpm install --frozen-lockfile

# 複製源代碼
COPY . .

# 構建應用
RUN pnpm build

# 運行階段
FROM node:22-alpine

WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm

# 複製 package 檔案
COPY package.json pnpm-lock.yaml ./

# 安裝生產依賴
RUN pnpm install --prod --frozen-lockfile

# 複製構建輸出
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

# 複製種子資料和初始化腳本
COPY seed-data.mjs init-ui-config.mjs ./

# 暴露埠
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# 啟動命令
CMD ["node", "dist/index.js"]
