// import { invoke } from "@tauri-apps/api/core";
import { api } from "./api.ts"
import { FileItem } from "./model.ts"
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { MenuConfirm, MenuInput, MenuContext, ContextMenuAction } from "./menus.ts";

function open_folder_new_window (item: FileItem) {
  const uniqueLabel = 'window_' + Math.random().toString(36).substring(2, 9);
  const webview = new WebviewWindow(uniqueLabel, {
    url: `/index.html?path=${item.path}`,
    title: 'Новое окно',
    width: 1000,
    height: 600
  });

  webview.once('tauri://created', function () {
    console.log('Окно успешно создано!');
  });

  webview.once('tauri://error', function (e) {
    console.error('Ошибка при создании окна:', e);
  });
}

function validate_path_header_input (path: String) {
    path = path.trim();
    path = path.replace("\\", "/");

    if (
        path === ""
        || path === "/"
    ) {
        return Error("path is empty");
    }
    
    const path_splitted = path.split("/");

    if (/[\\\:\*\?\"\<\>\|]$/.test(path as string)) {
        return Error(': * ? " < > | запрещены');
    }

    if (/^[A-Za-z]$/.test(path as string)) path = path + ":"; // C
    if (/^[A-Za-z]:$/.test(path as string)) path = path + "/"; // C:

    if (path_splitted.length < 2) {
        return Error ("path without /");
    }

    if (/^[A-Za-z]:$/.test(path_splitted[0]) === false) {
        return Error ("path without drive C:");
    }

    return true;
}

async function open_folder (path: String): Promise<boolean> {
    console.log("open_folder", path);

    try {
        map_items_output.clear();
        const entries = await api.read_items_from_directory_path(path);

        const opened_file = await api.fileitem_from_string(path.slice(0, path.length - 1));
        item_opened_folder = new FileItem(opened_file.path, opened_file.name, true, "");

        output!.replaceChildren();
        entries.forEach(entry => {
            const item = new FileItem(entry.path, entry.name, entry.is_dir, entry.extension);
            map_items_output.set(item.div, item);
            output!.appendChild(item.div);
        });

        header_input.update_crumbs(path);

        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

function go_parent_folder (path: string) {
    // if (!validate_path_header_input(path)) return;

    const path_splitted = path.split("/");

    // расчёт на то, что на конце есть /
    if (path_splitted.length < 3) return;
    
    open_folder(path_splitted.slice(0, path_splitted.length - 2).join("/") + "/");
}

// ============================================================================
// HEADER INPUT
// ============================================================================
const header_input = {
    input: document.querySelector('#header input#path') as HTMLInputElement,
    path: "" as String,
    last_valid_disk: "",
    is_input_focus: false,
    input_path: document.querySelector('input#path') as HTMLInputElement,
    div_path_points: document.querySelector('#header #path_points') as HTMLElement,

    update_crumbs: (new_path: String) => {
        if (!new_path.endsWith("/")) {
            new_path = new_path + "/";
        }
        header_input.path = new_path;
        header_input.input.value = new_path as string;

        map_items_header.clear();
        
        let path_splitted = header_input.path.split("/");
        path_splitted.pop();

        for (let i in path_splitted) {
            path_splitted[i] = path_splitted[i] + "/";
        }

        let full_path_global = "";
        
        for (let i in path_splitted) {
            let name = path_splitted[i];

            if (i === "0") {
                full_path_global = name;
            } else {
                full_path_global = full_path_global + name;
            }

            const full_path = full_path_global;

            name = name.replace("/", "");

            const item = new FileItem(full_path, name, true, "");

            map_items_header.set(item.div, item);
        }

        header_input.div_path_points!.replaceChildren();
        map_items_header.forEach(item => {
            header_input.div_path_points!.appendChild(item.div);
        });
    },

    event_listener: async (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            header_input.input.value = header_input.path as string;
            header_input.input.blur();
        }
        if (e.key === "Enter") {
            // валидация пути
            try {
                validate_path_header_input(header_input.input.value);

                // пытаемся открыть
                await open_folder(header_input.input.value);

                if (!header_input.input.value.endsWith("/")) {
                    header_input.input.value = header_input.input.value + "/";
                }

            } catch (e) {
                console.error(e);
            }

            header_input.input.blur();
        }
    }
}
header_input.input.addEventListener('focus', () => {
    header_input.is_input_focus = true;
    header_input.div_path_points!.style.display = "none";
    header_input.input_path!.classList.remove('hide_text');
    document.addEventListener("keydown", header_input.event_listener);
});
header_input.input.addEventListener('blur', () => {
    header_input.is_input_focus = false;
    header_input.div_path_points!.style.display = "flex";
    header_input.input_path!.classList.add('hide_text');
    
    header_input.input.value = header_input.path as string;
    if (!header_input.input.value.endsWith("/")) {
        header_input.input.value = header_input.input.value + "/";
    }
    document.removeEventListener("keydown", header_input.event_listener);
});
header_input.div_path_points!.style.display = "flex";
header_input.input_path!.classList.add('hide_text');
header_input.div_path_points?.addEventListener('click', (e) => {
  if (e.target === header_input.div_path_points) {
    header_input.input_path!.focus();
  }
});

// ============================================================================
// CONTEXT MENU
// ============================================================================
const menu_context_actions: Record<string, ContextMenuAction<any>> = {
    "open": {
        name: "Open",
        callback: (fileitem: FileItem) => {
            open_folder(fileitem.path);
        }
    },
    "reload": {
        name: "Reload",
        callback: (fileitem: FileItem) => {
            open_folder(fileitem.path);
        }
    },
    "open_in_new_window": {
        name: "Open in new window",
        callback: (fileitem: FileItem) => {
            open_folder_new_window(fileitem)
        }
    },
    "rename": {
        name: "Rename",
        callback:  async (fileitem: FileItem) => {
            const new_name = await menu_input.open(["Переименовать", fileitem.name as string], fileitem.name);
            if (new_name === "") return;

            // проверить имя
            if (/[\\\/\:\*\?\"\<\>\|]$/.test(new_name)) {
                throw new Error('new name contains symbols  \  : * ? " < > |');
            }
            fileitem.rename(new_name);
        }
    },
    "create_new_folder": {
        name: "Create new Folder",
        callback:  async () => {
            const new_name = await menu_input.open(["Создать новую папку"], "new folder");
            // проверить имя
            if (/[\\\/\:\*\?\"\<\>\|]$/.test(new_name)) {
                throw new Error('new name contains symbols  \  : * ? " < > |');
            }

            try {
                await api.create_item(item_opened_folder!.path, new_name, true, "");

                const full_path = item_opened_folder!.path + new_name + "/";
                const name = new_name;
    
                const item = new FileItem(full_path, name, true, "");
                map_items_output.set(item.div, item);
    
                output!.replaceChildren();
                map_items_output.forEach(entry => {
                    output!.appendChild(entry.div);
                });
            } catch (e) {
                console.error(e);
            }

        }
    },
    "create_new_file": {
        name: "Create new File",
        callback:  async () => {
            const new_name = await menu_input.open(["Создать файл"], "newfile.txt");
            // проверить имя
            if (/[\\\/\:\*\?\"\<\>\|]$/.test(new_name)) {
                throw new Error('new name contains symbols  \  : * ? " < > |');
            }

            // нужно проверить если после точки ничего нет

            const last_dot = new_name.lastIndexOf(".");
            let name = "";
            let extension = "";

            if (last_dot === -1) {
                name = new_name;
            } else {
                if (new_name.slice(last_dot, new_name.length) === "") {
                    name = new_name;
                } else {
                    name = new_name.slice(0, last_dot);
                    extension = new_name.slice(last_dot + 1);
                }
            }

            try {
                await api.create_item(item_opened_folder!.path, name, false, extension);

                const full_path = item_opened_folder!.path + new_name;
    
                let item: FileItem;
                if (extension === "") {
                    item = new FileItem(full_path, `${name}`, false, extension);
                } else {
                    item = new FileItem(full_path, `${name}.${extension}`, false, extension);
                }

                map_items_output.set(item.div, item);
    
                output!.replaceChildren();
                map_items_output.forEach(entry => {
                    output!.appendChild(entry.div);
                });
            } catch (e) {
                console.error(e);
            }
        }
    },
    "remove_to_recycle_bin": {
        name: "Remove to recycle bin",
        callback:  async (fileitem: FileItem) => {
            // сделать интерфейс подтверждения
            const access: boolean = await menu_confirm.open([`Remove ${fileitem.name} to bin?`]);

            if (!access) return;
            try {
                console.log('removing', fileitem)
                await api.remove_to_recycle_bin(fileitem.path);
                open_folder(header_input.path);
            } catch (e) {
                console.error(e);
            }
        }
    },
}

let menu_context = new MenuContext<FileItem>("body");
let menu_input = new MenuInput("body");
let menu_confirm = new MenuConfirm("body");




const map_items_header = new Map<HTMLDivElement, FileItem>();
const map_items_side_bar = new Map<HTMLDivElement, FileItem>();
const map_items_output = new Map<HTMLDivElement, FileItem>();

const btn_reload_output: HTMLButtonElement | null = document.querySelector('#header button#reload');
const btn_go_parent_folder: HTMLButtonElement | null = document.querySelector('#header button#go_up');

const btn_radio_view_list: HTMLInputElement | null = document.querySelector('input[type="radio"]#list');
const btn_radio_view_table: HTMLInputElement | null = document.querySelector('input[type="radio"]#table');

const div_side_bar_hot_bar: HTMLDivElement | null = document.querySelector('#side_bar #hot_bar');
const div_side_bar_drives: HTMLDivElement | null = document.querySelector('#side_bar #disks');

const output: HTMLInputElement | null = document.querySelector('#output');
let item_opened_folder: FileItem | null = null;

let item_selected_index = -1;
function update_selection (new_index: number) {
    const children = output!.children;

    children[item_selected_index]?.classList.remove('selected');
    
    item_selected_index = new_index;
    if (item_selected_index < 0) {
        return;
    }

    const selected_item = children[item_selected_index];

    if (selected_item) {
        selected_item.classList.add('selected');
        selected_item.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest"
        });
    } 
}

// ========================================
// один общий listener для всего сразу
// ========================================
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    
    // resets
    update_selection(-1);

    const item_element = (target as HTMLElement).closest('.item') as HTMLDivElement;

    if (item_element) {
        // clear_selection();
        const fileitem = map_items_output.get(item_element) as FileItem;
        
        if (!fileitem) return;

        menu_context.open(e, fileitem, [
            menu_context_actions.open,
            menu_context_actions.open_in_new_window,
            menu_context_actions.rename,
            menu_context_actions.remove_to_recycle_bin,
        ]);
        return;
    }

    if (target.closest("#output")) {
        menu_context.open(e, item_opened_folder as FileItem, [
            menu_context_actions.open,
            menu_context_actions.reload,
            menu_context_actions.open_in_new_window,
            menu_context_actions.create_new_folder,
            menu_context_actions.create_new_file,
        ]);
    }
});

document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // resets
    update_selection(-1);
    
    const item_element = (target as HTMLElement).closest('.item') as HTMLDivElement;
    
    if (item_element) {
        const fileitem_output = map_items_output.get(item_element);
        if (fileitem_output) {
            const children = Array.from(output!.children);
            update_selection(children.indexOf(target));
        }
        
        const fileitem_side_bar = map_items_side_bar.get(item_element);
        if (fileitem_side_bar) {
            if (fileitem_side_bar.is_dir) {
                open_folder(fileitem_side_bar.path);
            }
        }

        const fileitem_header = map_items_header.get(item_element);
        if (fileitem_header) {
            if (fileitem_header.is_dir) {
                open_folder(fileitem_header.path);
            }
        }
    }
});
document.addEventListener('dblclick', (e) => {
    const item_element = (e.target as HTMLElement).closest('.item') as HTMLDivElement;

    if (item_element) {
        const fileitem = map_items_output.get(item_element);
        if (fileitem) {
            if (fileitem.is_dir) {
                open_folder(fileitem.path);
            }
        }
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key.includes('Arrow')) {
        if (menu_context.is_open) return;
        if (menu_input.is_open) return;
    }
    if (e.key === "ArrowUp") {
        e.preventDefault();

        let new_index = item_selected_index - 1;

        if (new_index < 0) {
            new_index = map_items_output.size - 1;
        }
        update_selection(new_index);
    }
    if (e.key === "ArrowDown") {
        e.preventDefault();

        let new_index = item_selected_index + 1;

        if (new_index > map_items_output.size - 1) {
            new_index = 0;
        }
        update_selection(new_index);
    }
});
// ========================================
// 
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    {
        const entries = await api.get_items_hot_bar();
        
        entries.forEach(entry => {
            const item = new FileItem(entry.path, entry.name, entry.is_dir, entry.extension);
            map_items_side_bar.set(item.div, item);
            div_side_bar_hot_bar?.appendChild(item.div);
        });
    }
    {
        const entries = await api.get_items_drives();
        
        entries.forEach(entry => {
            const item = new FileItem(entry.path, entry.name, entry.is_dir, entry.extension);
            map_items_side_bar.set(item.div, item);
            div_side_bar_drives?.appendChild(item.div);
        });
    }

    let preload_path = new URLSearchParams(window.location.search).get("path") as String;
    if (!preload_path) {
        preload_path = Array.from(map_items_side_bar)[0][1].path;
    }
    
    if (!preload_path!.endsWith("/")) {
        preload_path = preload_path + "/";   
    }
    
    preload_path = "C:/Users/pavel/OneDrive/Рабочий стол/1313/";
    await open_folder(preload_path!);

    // console.log(await menu_confirm.open(["true?", "or false?"]));
    // console.log(await menu_input.open(["true?", "or false?"], "vallue"));
});

btn_go_parent_folder!.addEventListener("click", () => {
    go_parent_folder(header_input.path as string);
});
btn_reload_output!.addEventListener("click", () => {
    open_folder(header_input.path);
});

btn_radio_view_list!.addEventListener('click', () => {
  output!.classList.remove('view-table');
  output!.classList.add('view-list');
});
btn_radio_view_table!.addEventListener('click', () => {
  output!.classList.remove('view-list');
  output!.classList.add('view-table');
});