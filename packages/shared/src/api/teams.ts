// `GET /v1/teams` — nhóm phẳng (data scope `team`, TIP-042). Mảng `data` như trước (không phân trang — selector đọc đủ); thêm trưởng nhóm +
// version cho CAS. Mock transport (apps/web) và API thật parse cùng schema này.
import { z } from 'zod';

export const teamSchema = z.object({
  id: z.string(),
  name: z.string(),
  lead_user_id: z.string().nullable(),
  user_ids: z.array(z.string()),
  version: z.number().int(),
});
export const teamsSchema = z.array(teamSchema);
export type TeamDto = z.infer<typeof teamSchema>;
