import { createApp, Component } from "vue";
import ContentMenu from "./content-menu.vue";

export function openContextMenu(options: ContextMenu) {
  function close() {
    app.unmount();
    document.body.removeChild(div);
  }
  const app = createApp(ContentMenu, { ...options, close });
  const div = document.createElement("div");
  document.body.appendChild(div);
  app.mount(div);
  return {
    close,
  };
}
