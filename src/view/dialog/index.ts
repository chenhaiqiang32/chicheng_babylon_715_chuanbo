import { createApp, Component } from 'vue';

export function useDialog<T extends Component>(component: T, options: any = {}) {
    function close() {
        app.unmount();
        document.body.removeChild(div);
    }
    const app = createApp(component, { ...options, close });
    const div = document.createElement('div');
    document.body.appendChild(div);
    app.mount(div);
    return {
        close,
    };
}
