import type { ChatSettings } from "./type_ChatSettings.ts";

export default async function chat_saveSettings(settings: ChatSettings): Promise<void> {
  await Bun.write(".settings.json", JSON.stringify(settings, null, 2));
}
