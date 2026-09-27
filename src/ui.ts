// import { invoke } from "@tauri-apps/api/core";
import { api } from "./api.ts"
import { FileItem } from "./model.ts"
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { ContextMenu, ContextMenuAction } from "./menu_context.ts";
import { RenameMenu } from "./menu_rename.ts";

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
    
    console.log("passed", path);
    return true;
}

async function open_folder (path: String): Promise<boolean> {
    console.log("open_folder", path);

    try {
        const entries = await api.read_items_from_directory_path(path);

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
    console.log("finding parent folder of", path);

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
                if (await open_folder(header_input.input.value)) {
                    console.log("success");

                    if (!header_input.input.value.endsWith("/")) {
                        header_input.input.value = header_input.input.value + "/";
                    }
                } else {
                    console.log("fail");
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
let menu_context_actions: ContextMenuAction<FileItem>[] = [
    {
        name: "Open",
        callback: (fileitem: FileItem) => {
            console.log('open', fileitem.path);
            open_folder(fileitem.path);
        }
    },
    {
        name: "Open in new window",
        callback: (fileitem: FileItem) => {
            console.log('open in new window', fileitem.path);
            open_folder_new_window(fileitem)
        }
    },
    {
        name: "Rename",
        callback:  async (fileitem: FileItem) => {
            const new_name = await menu_rename.open(fileitem.name);

            console.log(new_name);
            // проверить имя
            // item.rename(new_name)

            if (/[\\\/\:\*\?\"\<\>\|]$/.test(new_name)) {
                throw new Error('new name contains symbols  \  : * ? " < > |');
            }

            fileitem.rename(new_name);
        }
    },
];
let menu_context = new ContextMenu('#menu-context', menu_context_actions);
let menu_rename = new RenameMenu('#menu-rename');

// ========================================
// один общий listener для всего сразу
// ========================================
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    
    if (menu_context !== null) {
        menu_context.close();
    }

    const item_element = (e.target as HTMLElement).closest('.item') as HTMLDivElement;

    if (!item_element) {
        // clear_selection();
        return;
    }

    const fileitem = map_items_output.get(item_element) as FileItem;

    if (fileitem) {
        menu_context.open(e, fileitem);
        return;
    }
});

document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    if (!target.closest('#menu_context')) {
        menu_context.close();
    }

    const item_element = (e.target as HTMLElement).closest('.item') as HTMLDivElement;
    
    if (item_element) {
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
        console.log(Array.from(map_items_side_bar)[0][1]);
        preload_path = Array.from(map_items_side_bar)[0][1].path;
    }
    
    if (!preload_path!.endsWith("/")) {
        preload_path = preload_path + "/";   
    }
    
    // preload_path = "C:/Users/pavel/OneDrive/Рабочий стол/1313/";
    await open_folder(preload_path!);

    // {
    //     const item = Array.from(map_items_output)[0][1];
    //     const newname = "newname";
    
    //     console.log("find", item.path);
    //     console.log("rename to", newname);
    //     item.rename(newname);
    // }
});

btn_go_parent_folder!.addEventListener("click", () => {
    go_parent_folder(header_input.path as string);
});
btn_reload_output!.addEventListener("click", () => {
    open_folder(header_input.path);
});

btn_radio_view_list!.addEventListener('click', () => {
  console.log('list');
  output!.classList.remove('view-table');
  output!.classList.add('view-list');
});
btn_radio_view_table!.addEventListener('click', () => {
  console.log('table');
  output!.classList.remove('view-list');
  output!.classList.add('view-table');
});