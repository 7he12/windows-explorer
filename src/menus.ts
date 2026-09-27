

const div_menu = document.createElement('div');
div_menu.classList.add('menu');

const div_icon = document.createElement('div');
div_icon.classList.add('menu-icon');
const div_text = document.createElement('div');
div_text.classList.add('menu-text');

const btn = document.createElement('button');
btn.classList.add('menu-btn');

const input = document.createElement('input');
input.type = "text";
input.classList.add('menu-input');

export class MenuConfirm {
    private div: HTMLDivElement;
    private btn_close: HTMLButtonElement;
    private btn_confirm: HTMLButtonElement;
    private abort_controller: AbortController | null = null;

    public is_open: boolean;

    constructor (container_selector: string) {
        this.div = div_menu.cloneNode(true) as HTMLDivElement;
        this.div.classList.add('menu-confirm');

        this.btn_close = btn.cloneNode(true) as HTMLButtonElement;
        this.btn_close.classList.add("menu-btn-square");
        this.btn_close.classList.add("menu-btn-close");
        this.btn_close.textContent = "X";
        
        this.btn_confirm = btn.cloneNode(true) as HTMLButtonElement;
        this.btn_confirm.classList.add("menu-btn-confirm");
        this.btn_confirm.textContent = "Confirm";

        this.abort_controller = null;
        
        document.querySelector(container_selector)?.appendChild(this.div);
        
        this.is_open = false;
        this.close();
    }
    open (strings: string[]): Promise<boolean> {
        this.close();
        this.is_open = true;
        this.div.style.display = 'flex';
        this.div.style.left = "50%";
        this.div.style.top = "50%";

        this.abort_controller = new AbortController();
        const { signal } = this.abort_controller;

        this.div.appendChild(this.btn_close);
        strings.forEach(str => {
            const text_elem = div_text.cloneNode(true);
            text_elem.textContent = str;
            
            this.div.appendChild(text_elem);
        });
        this.div.appendChild(this.btn_confirm);

        return new Promise<boolean>((resolve) => {
            const submit = () => {
                resolve(true);
                this.close();
            }
            const reject = () => {
                resolve(false);
                this.close();
            }
            
            this.btn_close.addEventListener('click', () => {
                reject();
            }, { signal });
            this.btn_confirm.addEventListener('click', () => {
                submit();
            }, { signal });
            
            document.addEventListener('keydown', (e) => {
                if (e.key === "Escape") {
                    reject();
                }
                if (e.key === "Enter") {
                    submit();
                }
            }, { signal });
            
            setTimeout(() => {
                document.addEventListener('click', (e) => {
                    if (!this.div.contains(e.target as Node)) {
                        reject();
                    }
                }, { signal });
                document.addEventListener('contextmenu', (e) => {
                    if (!this.div.contains(e.target as Node)) {
                        reject();
                    }
                }, { signal });
            }, 1);
        });
    }
    close () {
        this.is_open = false;

        this.div.style.display = "none";
        this.div.style.left = "150%";
        this.div.replaceChildren();

        if (this.abort_controller) {
            this.abort_controller.abort();
            this.abort_controller = null;
        }
    }
}

export class MenuInput {
    private div: HTMLDivElement;
    private btn_close: HTMLButtonElement;
    private btn_confirm: HTMLButtonElement;
    private input: HTMLInputElement;
    private abort_controller: AbortController | null = null;
    public is_open: boolean;

    constructor (container_selector: string) {
        this.div = div_menu.cloneNode(true) as HTMLDivElement;
        this.div.classList.add('menu-confirm');

        this.btn_close = btn.cloneNode(true) as HTMLButtonElement;
        this.btn_close.classList.add("menu-btn-square");
        this.btn_close.classList.add("menu-btn-close");
        this.btn_close.textContent = "X";
        
        this.btn_confirm = btn.cloneNode(true) as HTMLButtonElement;
        this.btn_confirm.classList.add("menu-btn-confirm");
        this.btn_confirm.textContent = "Confirm";

        this.input = input.cloneNode(true) as HTMLInputElement;

        
        document.querySelector(container_selector)?.appendChild(this.div);
        this.abort_controller = null;
        this.is_open = false;
        this.close();
    }
    open (strings: String[], value: String): Promise<string> {
        // e.preventDefault();
        this.close();
        this.is_open = true;
        this.div.style.display = 'flex';
        this.div.style.left = "50%";
        this.div.style.top = "50%";

        this.abort_controller = new AbortController();
        const { signal } = this.abort_controller;

        this.div.appendChild(this.btn_close);
        strings.forEach(str => {
            const text_elem = div_text.cloneNode(true);
            text_elem.textContent = str as string;
            
            this.div.appendChild(text_elem);
        });
        this.div.appendChild(this.input);
        this.div.appendChild(this.btn_confirm);

        this.input.value = value as string;
        this.input.focus();
        
        return new Promise<string>((resolve) => {
            const submit = () => {
                const trimmed = this.input.value.trim();

                if (trimmed) {
                    resolve(trimmed);
                    this.close();
                } else {
                    this.input.focus();
                }
            }
            const reject = () => {
                resolve("");
                this.close();
            }
            
            this.btn_close.addEventListener('click', () => {
                reject();
            }, { signal });
            this.btn_confirm.addEventListener('click', () => {
                submit();
            }, { signal });
            
            document.addEventListener('keydown', (e) => {
                if (e.key === "Escape") {
                    reject();
                }
                if (e.key === "Enter") {
                    submit();
                }
            }, { signal });
            
            setTimeout(() => {
                document.addEventListener('click', (e) => {
                    if (!this.div.contains(e.target as Node)) {
                        reject();
                    }
                }, { signal });
                document.addEventListener('contextmenu', (e) => {
                    if (!this.div.contains(e.target as Node)) {
                        reject();
                    }
                }, { signal });
            }, 1);
        });
    }
    close () {
        this.is_open = false;
        this.div.style.display = 'none';
        this.div.style.left = "150%";
        this.input.value = "";
        this.div.replaceChildren();

        if (this.abort_controller) {
            this.abort_controller.abort();
            this.abort_controller = null;
        }
    }
}





const div_menu_context_action = document.createElement('div');
div_menu_context_action.classList.add('menu-context-action');
div_menu_context_action.appendChild(div_icon);
div_menu_context_action.appendChild(div_text);

export interface ContextMenuAction<T> {
    name: string;
    icon_url?: string;
    callback: (target: T) => void;
}

export class MenuContext<T> {

    private actions: ContextMenuAction<T>[];
    private div: HTMLDivElement;
    private abort_controller: AbortController | null = null;

    public is_open: boolean;

    constructor (container_selector: string) {
        // this.is_open = false;
        // const div = document.querySelector(div_selector);

        // if (!div) {
        //     throw new Error(`ContextMenu: element with selector ${div_selector} has not found`);
        // }

        // this.div = div as HTMLElement;
        // this.actions = [];

        // this.close();
        this.div = div_menu.cloneNode(true) as HTMLDivElement;
        this.div.classList.add('menu-confirm');
        this.div.style.translate = "initial";

        this.actions = [];
        
        document.querySelector(container_selector)?.appendChild(this.div);
        
        this.abort_controller = null;
        this.is_open = false;
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
            const div = div_menu_context_action.cloneNode(true) as HTMLDivElement;
            div.querySelector('.menu-text')!.textContent = action.name;

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