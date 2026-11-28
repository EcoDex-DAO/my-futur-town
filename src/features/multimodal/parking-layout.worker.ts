import { generateParkingLayout, type LayoutParameters, type LayoutAccesses } from "./parking-layout";
import type { ProjectZone } from "./project-zone";

self.onmessage = (event: MessageEvent<{ zone: ProjectZone; parameters: LayoutParameters; accesses: LayoutAccesses }>) => {
  self.postMessage(generateParkingLayout(event.data.zone, event.data.parameters, event.data.accesses));
};
