
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
    public is_open: boolean;
    private actions: ContextMenuAction<T>[];

    constructor (div_selector: string) {
        this.is_open = false;
        const div = document.querySelector(div_selector);

        if (!div) {
            throw new Error(`ContextMenu: element with selector ${div_selector} has not found`);
        }

        this.div = div as HTMLElement;
        this.actions = [];

        this.close();
    }

    open (e: MouseEvent, target: T, actions: ContextMenuAction<T>[]) {
        e.preventDefault();

        this.close();
        this.is_open = true;
        this.div.style.display = 'flex';
        this.div.style.left = e.pageX + "px";
        this.div.style.top = e.pageY + "px";
        this.abort_controller = new AbortController();
        const { signal } = this.abort_controller;

        this.actions = actions;

        const divs_actions: HTMLDivElement[] = [];

        let selected_div_index = -1;
        const update_selection = (new_index: number) => {
            divs_actions[selected_div_index]?.classList.remove('selected');
            selected_div_index = new_index;

            divs_actions[new_index]?.classList.add('selected');
        }

        this.actions.forEach(action => {
            const div = div_context_menu_action.cloneNode(true) as HTMLDivElement;
            div.querySelector('.menu-context-text')!.textContent = action.name;

            divs_actions.push(div);

            div.addEventListener('mouseenter', () => {
                update_selection(-1);
            }, { signal });

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
        document.addEventListener('contextmenu', (e) => {
            if (!this.div.contains(e.target as Node)) {
                this.close();
            }
        }, { signal });

        document.addEventListener('keydown', (e) => {
            if (e.key === "Escape") {
                this.close();
            }
            
            if (e.key === "Enter") {
                if (selected_div_index >= 0) {
                    this.actions[selected_div_index].callback(target);
                    this.close();
                }
            }

            if (e.key === "ArrowUp") {
                let new_index = selected_div_index - 1;
                
                if (new_index < 0) {
                    new_index = this.actions.length - 1;
                }
                update_selection(new_index);
                return;
            }
            if (e.key === "ArrowDown") {
                let new_index = selected_div_index + 1;
                
                if (new_index > this.actions.length - 1) {
                    new_index = 0;
                }
                update_selection(new_index);
                return;
            }
        }, { signal });
    }
    close () {
        this.is_open = false;
        this.div.replaceChildren();
        this.div.style.display = 'none';
        this.div.style.left = "105%";

        if (this.abort_controller) {
            this.abort_controller.abort();
            this.abort_controller = null;
        }
    }
}
