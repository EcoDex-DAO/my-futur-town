import { generateParkingLayout, type LayoutParameters } from "./parking-layout";
import type { ProjectZone } from "./project-zone";

self.onmessage = (event: MessageEvent<{ zone: ProjectZone; parameters: LayoutParameters }>) => {
  self.postMessage(generateParkingLayout(event.data.zone, event.data.parameters));
};
