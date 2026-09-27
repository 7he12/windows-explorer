

export class RenameMenu {
    private div: HTMLElement;
    private input: HTMLInputElement;
    private abort_controller: AbortController | null = null;

    private btn_close: HTMLButtonElement;
    private div_old_name: HTMLDivElement;
    private btn_confirm: HTMLButtonElement;

    constructor (div_selector: string) {
        const div = document.querySelector(div_selector);
        
        if (!div) {
            throw new Error(`ContextMenu: element with selector ${div_selector} has not found`);
        }

        this.div = div as HTMLElement;

        this.btn_close = document.createElement("button");
        this.btn_close.id = "menu-rename-btn-close";
        this.btn_close.textContent = "X";

        this.div_old_name = document.createElement("div");
        this.div_old_name.id = "menu-rename-div-old_name";
        
        this.btn_confirm = document.createElement("button");
        this.btn_confirm.id = "menu-rename-btn-confirm";
        this.btn_confirm.textContent = "Переименовать";

        this.input = document.createElement('input');
        this.input.id = "menu-rename-input";

        this.div.appendChild(this.btn_close);
        this.div.appendChild(this.div_old_name);
        this.div.appendChild(this.input);
        this.div.appendChild(this.btn_confirm);



        this.close();
    }
    open (old_name: String): Promise<string> {
        // e.preventDefault();

        this.close();
        this.div.style.display = 'flex';
        this.div.style.left = "50%";
        this.div.style.top = "50%";
        this.abort_controller = new AbortController();
        const { signal } = this.abort_controller;

        this.div_old_name.textContent = `Переименовать ${old_name}`;

        this.input.focus();

        return new Promise<string>((resolve, reject) => {
            const submit = () => {
                const trimmed = this.input.value.trim();

                if (trimmed) {
                    resolve(trimmed);
                    this.close();
                } else {
                    this.input.focus();
                }
            }

            this.btn_close.addEventListener('click', () => {
                reject(new Error("btn close pressed"));
                this.close();
            }, { signal });
            this.btn_confirm.addEventListener('click', submit, { signal });

            document.addEventListener('keydown', (e) => {
                if (e.key === "Escape") {
                    reject(new Error("escape pressed"));
                    this.close();
                }
                if (e.key === "Enter") {
                    submit();
                }
            }, { signal });
            
            setTimeout(() => {
                document.addEventListener('click', (e) => {
                    if (!this.div.contains(e.target as Node)) {
                        reject(new Error("клик мимо меню"));
                        this.close();
                    }
                }, { signal });
            }, 1);
        });
    }
    close () {
        this.div.style.display = 'none';
        this.div.style.left = "200%";
        this.input.value = "";

        if (this.abort_controller) {
            this.abort_controller.abort();
            this.abort_controller = null;
        }
    }
}