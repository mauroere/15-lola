import { z } from "zod";
import { cleanPhoneNumber } from "./phone-utils";
export const mealOptions = [
  { value: "standard", label: "Sin restricciones" },
  { value: "gluten_free", label: "Sin TACC" },
  { value: "vegetarian", label: "Vegetariano" },
  { value: "vegan", label: "Vegano" },
  { value: "other", label: "Otra necesidad" },
] as const;
export const memberSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    menu: z.enum(["standard", "gluten_free", "vegetarian", "vegan", "other"]),
    notes: z.string().trim().max(250),
  })
  .refine(
    (member) => member.menu !== "other" || member.notes.length >= 2,
    "Contanos cuál es la necesidad alimentaria.",
  );
export const rsvpSchema = z
  .object({
    id: z.uuid(),
    contactName: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .trim()
      .min(8)
      .max(40)
      .regex(/^\+?[\d\s()-]+$/)
      .transform(cleanPhoneNumber)
      .refine(
        (phone) => phone.length >= 8 && phone.length <= 15,
        "Ingresá un WhatsApp con código de área.",
      ),
    attending: z.boolean(),
    members: z.array(memberSchema).max(12),
    website: z.literal(""),
  })
  .refine(
    (input) =>
      input.attending ? input.members.length >= 1 : input.members.length === 0,
    "Revisá las personas que van a asistir.",
  );
export const songSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(100),
  song: z.string().trim().min(2).max(160),
  website: z.literal(""),
});
export type RSVPInput = z.infer<typeof rsvpSchema>;
export type SongInput = z.infer<typeof songSchema>;
export type Member = z.infer<typeof memberSchema>;
export type RSVPRecord = RSVPInput & {
  status: "pending" | "approved" | "rejected" | "superseded";
  created_at: string;
};
