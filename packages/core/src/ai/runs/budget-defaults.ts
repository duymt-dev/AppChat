// Mặc định của run (Blueprint §5.1, agent-gateway §5): số bước tối đa theo loại + ngân sách credit của một cây run khi người gọi không đặt.
export const MAX_STEPS = { agent: 8, assistant: 16 } as const;
export const DEFAULT_RUN_BUDGET = 200;
