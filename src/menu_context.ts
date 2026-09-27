
const div_context_menu_action = document.createElement('div');
div_context_menu_action.classList.add('menu-context-action');
{
    const div_icon = document.createElement('div');
    div_icon.classList.add('menu-context-icon');
    const div_text = document.createElement('div');
    div_text.classList.add('menu-context-text');

    div_context_menu_action.appendChild(div_icon);
    div_context_menu_action.appendChild(div_text);
}

export interface ContextMenuAction<T> {
    name: string;
    icon_url?: string;
    callback: (target: T) => void;
}

export class ContextMenu<T> {
    private div: HTMLElement;
    private abort_controller: AbortController | null = null;

    constructor (div_selector: string, private actions: ContextMenuAction<T>[]) {
        const div = document.querySelector(div_selector);

        if (!div) {
            throw new Error(`ContextMenu: element with selector ${div_selector} has not found`);
        }

        this.div = div as HTMLElement;

        this.close();
    }

    open (e: MouseEvent, target: T) {
        e.preventDefault();

        this.close();
        this.div.style.display = 'flex';
        this.div.style.left = e.pageX + "px";
        this.div.style.top = e.pageY + "px";
        this.abort_controller = new AbortController();
        const { signal } = this.abort_controller;

        this.actions.forEach(action => {
            const div = div_context_menu_action.cloneNode(true) as HTMLDivElement;
            div.querySelector('.menu-context-text')!.textContent = action.name;

            div.addEventListener('click', () => {
                action.callback(target);
                this.close();
            }, { signal });

            this.div.appendChild(div);
        });

        document.addEventListener('click', (e) => {
            if (!this.div.contains(e.target as Node)) {
                this.close();
            }
        }, { signal });
    }
    close () {
        this.div.replaceChildren();
        this.div.style.display = 'none';
        this.div.style.left = "105%";

        if (this.abort_controller) {
            this.abort_controller.abort();
            this.abort_controller = null;
        }
    }
}
