import type { PlatformAdapter } from "../shared/types";
import { appleTvAdapter } from "./apple-tv";
import { crunchyrollAdapter } from "./crunchyroll";
import { disneyPlusAdapter } from "./disney-plus";
import { globoplayAdapter } from "./globoplay";
import { iqiyiAdapter } from "./iqiyi";
import { maxAdapter } from "./max";
import { netflixAdapter } from "./netflix";
import { paramountPlusAdapter } from "./paramount-plus";
import { primeVideoAdapter } from "./prime-video";
import { youtubeAdapter } from "./youtube";

export const platformAdapters: PlatformAdapter[] = [
  primeVideoAdapter,
  netflixAdapter,
  disneyPlusAdapter,
  maxAdapter,
  youtubeAdapter,
  globoplayAdapter,
  paramountPlusAdapter,
  appleTvAdapter,
  crunchyrollAdapter,
  iqiyiAdapter
];

export function getAdapterForLocation(location: Location): PlatformAdapter | null {
  return platformAdapters.find((adapter) => adapter.matchesLocation(location)) || null;
}
