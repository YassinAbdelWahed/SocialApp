import { logout } from "./user.validation";
import { z } from "zod"

export type ILogoutDto = z.infer<typeof logout.body>;