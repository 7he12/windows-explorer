import { convertFileSrc } from '@tauri-apps/api/core';
import { api } from "./api.ts";

export class FileItem {
    public name: String;
    public parent_path: String;
    public is_dir: boolean;
    public extension: String | null;
    public div: HTMLDivElement;

    constructor (full_path: String, name: String, is_dir: boolean, extension: string = "") {
        // принимаем путь папки с / на конце
        this.is_dir = is_dir;

        if (this.is_dir) {
            if (!full_path.endsWith("/")) {
                console.error("Путь не содержит / на конце");
            }
        }

        this.extension = extension;

        const clean_path = full_path;
        let last_slash = clean_path.lastIndexOf("/");

        if (is_dir) {
            last_slash = (clean_path.slice(0, last_slash)).lastIndexOf("/");
        }
        
        this.parent_path = clean_path.slice(0, last_slash);
        this.parent_path = this.parent_path + "/";

        if (is_dir) {
            if (full_path.split("/").length <= 2) {
                // console.log("root", this.parent_path, "is detected");
                this.parent_path = full_path;
            }
        }

        this.name = name;
        
        if (!this.is_dir) {
            if (this.extension !== "") {
                const last_dot = this.name.lastIndexOf(".");
                
                this.name = this.name.slice(0, last_dot);
            }
        }

        this.div = this.create_div();

        // this.rename = (new_name: String) => this.rename;
    }

    get path(): String {
        if (this.is_dir) {
            if (/[A-Z]:/.test(this.name as string)) {
                return this.parent_path;
            }
            
            return `${this.parent_path}${this.name}/`;
        }

        if (this.extension === "") return `${this.parent_path}${this.name}`;

        return `${this.parent_path}${this.name}.${this.extension}`;
    }

    public async rename (new_name: String) {
        console.log("renaming", this.path, "->", new_name)
        
        try {
            if (this.is_dir) {
                await api.rename(this.path, new_name);
            } else {
                if (this.extension === "") {
                    await api.rename(this.path, new_name);
                } else {
                    await api.rename(this.path, `${new_name}.${this.extension}`);
                }
            }
            
            this.name = new_name;
            const div_text = this.div.querySelector('.text');
            
            if (div_text) {
                div_text.textContent = new_name as string;
            }
            
            if (this.is_dir) {
                div_text!.textContent = this.name as string;
            } else {
                if (this.extension === "") {
                    div_text!.textContent = this.name as string;
                } else {
                    div_text!.textContent = `${this.name}.${this.extension}`;
                }
            }
            
            console.log("успешно переименовано");
        } catch (e) {
            console.error(e);
        }


    }

    private create_div (): HTMLDivElement {
        const div = document.createElement('div');
        const div_icon = document.createElement('div');
        const div_text = document.createElement('div');
        div.classList.add("item");
        div_icon.classList.add("icon");
        div_text.classList.add("text");

        let url = '';
        const imageExtensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
        
        if (imageExtensions.includes(this.extension as string)) {
            url = convertFileSrc(this.path as string);
        } else if (this.is_dir) {
            url = new URL(`./assets/file_folder.png`, import.meta.url).href;
        } else if (this.extension === 'txt') {
            url = new URL(`./assets/file_txt.png`, import.meta.url).href;
        }
        if (url) {
            div_icon.style.backgroundImage = `url(${url})`;
        }

        if (this.is_dir) {
            div_text.textContent = this.name as string;
        } else {
            if (this.extension !== "") {
                div_text.textContent = `${this.name}.${this.extension}`;
            } else {
                div_text.textContent = `${this.name}`;
            }
        }

        div.appendChild(div_icon);
        div.appendChild(div_text);

        return div;
    }
}