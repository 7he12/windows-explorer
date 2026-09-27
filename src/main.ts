import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from '@tauri-apps/api/core';

const open_folder_new_window = async (path: String) => {
  const uniqueLabel = 'window_' + Math.random().toString(36).substring(2, 9);
  const webview = new WebviewWindow(uniqueLabel, {
    url: `/index.html?path=${path}`,
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
};

const open_folder_statistics = async (path: String) => {
  const uniqueLabel = 'window_' + Math.random().toString(36).substring(2, 9);
  const webview = new WebviewWindow(uniqueLabel, {
    url: `/stats.html?path=${path}`,
    title: 'Новое окно',
    width: 500,
    height: 300
  });

  webview.once('tauri://created', function () {
    console.log('Окно успешно создано!');
  });

  webview.once('tauri://error', function (e) {
    console.error('Ошибка при создании окна:', e);
  });
};

class Item {
  path_parts: String[];
  name: string;
  file_type: String;
  extension: String | null;
  div: HTMLDivElement;

  constructor (path: string, file_type: string, open_by_dblclick: boolean = false) {
    this.path_parts = path.split("/");
    this.file_type = file_type;
    this.extension = 'defualt_value';

    if (this.file_type === 'directory') {
      this.extension = 'directory';

      if (this.path_parts[this.path_parts.length - 1] !== '') {
        this.path_parts.push('')
      }

      // this.path зависит от this.name
      this.name = this.path_parts[this.path_parts.length - 2] as string;
    } else {
      const last_elem = this.path_parts[this.path_parts.length - 1];
      const last_dot_index = last_elem.lastIndexOf('.');
      const last_slash_index = last_elem.lastIndexOf('/');
      
      if (last_dot_index === -1 || last_dot_index <= last_slash_index) {
        this.name = last_elem.slice(last_slash_index + 1);
        this.extension = "";
      } else {
        
        if (this.file_type === "file") {
          this.extension = null;
        }

        // this.path зависит от this.name
        this.extension = last_elem.slice(last_dot_index + 1);
        this.name = last_elem.slice(last_slash_index + 1, last_dot_index);
      }
    }
    
    // console.log(this.name, this.extension);
    // console.log(this.path_parts);
    // console.log(this.path);


    this.div = document.createElement('div');
    this.div.classList.add('item');
    const icon = document.createElement('div');
    const text = document.createElement('div');
    icon.classList.add('icon');
    text.classList.add('text');
    
    if (this.file_type === 'directory') {
      text.textContent = this.name as string;
    } else {
      let name_ext = this.name;
      if (this.extension) {
        name_ext = `${name_ext}.${this.extension}`;
      }
      text.textContent = name_ext;
    }

    this.div.appendChild(icon);
    this.div.appendChild(text);
    

    // сделать preview
    let url = '';
    const imageExtensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
    
    if (imageExtensions.includes(this.extension as string)) {
      url = convertFileSrc(this.path);
    } else if (this.file_type === 'directory') {
      url = new URL(`./assets/file_folder.png`, import.meta.url).href;
    } else if (this.extension === 'txt') {
      url = new URL(`./assets/file_txt.png`, import.meta.url).href;
    }
    if (url) {
      icon.style.backgroundImage = `url(${url})`;
    }
    
    if (this.file_type === 'directory') {
      this.div.addEventListener('click', () => {

        if (open_by_dblclick) {
          if (item_selected === this) {
            open_folder(this.path as string);
          } else {
            this.make_selected();
          }
        } else {
          open_folder(this.path as string);
        }
      });
      this.div.addEventListener('contextmenu', (e) => {
        e.preventDefault();

        close_context_menu();
        this.make_selected();
        open_context_menu(e, this);
      });
    }
  }
  get path(): string {
    let path_first = [];
    
    if (this.file_type === 'directory') {
      path_first = this.path_parts.slice(0, this.path_parts.length - 2);
      path_first.push(this.name);
      path_first.push("");
    } else {
      path_first = this.path_parts.slice(0, this.path_parts.length - 1);
      let name_ext = this.name;

      if (this.extension) {
        name_ext = `${name_ext}.${this.extension}`;
      }
      path_first.push(`${name_ext}`);
    }

    return path_first.join("/");
  }

  make_selected () {
    console.log(this);

    item_selected?.div.classList.remove('selected');
    item_selected = this;
    item_selected?.div.classList.add('selected');
  }
  async rename (new_name: string) {
    const path_splitted = this.path.split('/');

    if (path_splitted.length <= 2) {
      console.log('error renaming:', this.path, 'is root');
      throw new Error(this.path + "is root");
      return;
    }
    
    new_name = new_name.trim();

    if (new_name === "") {
      console.log('error renaming: new_name is blank', new_name);
      throw new Error("field is blank");
      return;
    }
    // /^[A-Za-zА-Яа-я0-9\s]/ ищет всё кроме символов a-z0-9
    // /[\\\/\:\*\?\"\<\>\|]$/ ищет символы (эти символы запрещены виндой для названия папок)
    if (/[\\\/\:\*\?\"\<\>\|]$/.test(new_name)) {
      console.log('error renaming: new_name have unpermissioned symbols', new_name);
      throw new Error('unpermissioned symbols \ \ / : * ? " < > |');
      return;
    }
    
    let new_path_with_new_name = "";
    let new_path = this.path_parts;
    
    if (this.file_type === 'directory') {
      new_path[new_path.length - 2] = new_name;
    } else {
      if (this.extension) {
        new_path[new_path.length - 1] = new_name;
      } else {
        new_path[new_path.length - 1] = `${new_name}.${this.extension}`;
      }
    }
    new_path_with_new_name = new_path.join('/');

    try {
      await invoke("rename_file", { oldpath: this.path, newpath: new_path_with_new_name });
      
      this.name = new_name;

      if (this.file_type === 'directory') {
        this.div.querySelector('.text')!.textContent = this.name as string;
      } else {
        let name_ext = this.name;
        if (this.extension) {
          name_ext = `${name_ext}.${this.extension}`;
        }
        this.div.querySelector('.text')!.textContent = name_ext;
      }
    } catch (err) {
      console.error(err);
      throw err;
      return;
    }
    // throw new Error("unknown error");
  }
}



async function open_folder (new_path: string) {
  // прверить путь
  // попытаться открыть
    // создать
  // close_context_menu();
  // close_rename_menu();

  // items_highlighted = [];
  new_path = new_path.replace(/\\/g, '/') as string;

  // нжуно перебрать проверки
  // if (new_path.startsWith('/')) {
  //   new_path = `${disk_letter}:${new_path}`;
  // }
  if (/^[A-Za-z]$/.test(new_path)) {
    new_path = new_path + ':/';
  }

  if (/^[A-Za-z][A-Za-z0-9]/.test(new_path)) {
    return;
  }

  if (/^[A-Za-z]\//.test(new_path)) {
    new_path = new_path[0] + ':/' + new_path.slice(2);
  } else if (/^[A-Za-z]:(?!\/)/.test(new_path)) {
    new_path = new_path.slice(0, 2) + '/' + new_path.slice(2);
  }

  if (new_path !== '' && !new_path.endsWith('/')) {
    new_path = new_path + '/';
  }
  
  // if (path === new_path) {
  //   console.log('already here');
  //   return;
  // }

  try {
    let entries: any[] = await invoke("read_folder", { path: new_path });
    
    output!.replaceChildren();
    items_output = [];

    entries.forEach(entry => {
      // console.log(entry.file_type);
      items_output.push(new Item(new_path + entry.name, entry.file_type, true));
    });

    update_header_input(new_path);

    items_output.forEach(item => {
      output?.appendChild(item.div);
    });

    getCurrentWindow().setTitle(new_path);
  } catch (error) {
    console.error("ошибка", error);
    header_input.input.value = header_input.path;

    if (header_input.path === "" || header_input.path  === null) {
      let new_path = await invoke("get_exe_dir") as string;
      new_path = new_path + '/';

      if (new_path === "" || new_path  === null) {
        new_path = items_side_bar_disks[0].path;
      }
      open_folder(new_path);
    }
  }
}

function update_header_input (path: string) {
  // ввести проверку что находиться в инпуте
  if (!path.endsWith('/')) {
    console.log('dont create header input - path dont ends width /', path);
    return;
  }

  const path_splitted = path.split('/');
  header_input.path = path;
  header_input.last_valid_disk = path_splitted[0];
  header_input.input.value = header_input.path;

  path_points!.replaceChildren();
  header_input.items = [];
  
  let temp_path = path_splitted[0];
  header_input.items.push(new Item(temp_path, 'directory'));
  
  for (let i = 1; i < path_splitted.length - 1; i++) {
    temp_path = `${temp_path}/${path_splitted[i]}`;
    header_input.items.push(new Item(temp_path, 'directory'));
  }
  header_input.items.forEach(i => {
    path_points!.appendChild(i.div);
  });
}

function close_context_menu () {
  is_context_menu_open = false;
  div_context_menu?.replaceChildren();
  div_context_menu?.classList.remove('opened');
}
function open_context_menu (event: MouseEvent, item: Item) {
  is_context_menu_open = true;
  div_context_menu?.classList.add('opened');
  div_context_menu!.style.left = `${event.pageX}px`;
  div_context_menu!.style.top = `${event.pageY}px`;
  
  div_context_menu?.replaceChildren();
  
  // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
  // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
  // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
  // сначала сделать бекап
  // рефактор
  // перенести функции на class Item и дальше делать выделение нескольких файлов
  const actions = [
    "sort",
    "open",
    "open_new_window",
    "rename",
    "copy_path",
    "copy",
    "delete",
    "open_stats",
  ];

  actions.forEach(action => {
    const row = document.createElement('div');
    row.classList.add('item');
    row.textContent = action;

    div_context_menu?.appendChild(row);

    row.addEventListener('click', (e) => {
      e.stopPropagation();
      if (action === 'open') {
        close_context_menu();
        open_folder(item.path);
      }
      if (action === 'open_new_window') {
        close_context_menu();
        open_folder_new_window(item.path);
      }
      if (action === 'rename') {
        open_rename_menu(item);
      }
    });
  });
}

function close_rename_menu () {
  is_rename_menu_open = false;
  div_rename!.querySelector('input')!.value = "";
  div_rename!.classList.remove('opened');
  console.log('closed');
}
function open_rename_menu (item: Item) {
  close_context_menu();

  is_rename_menu_open = true;
  div_rename?.classList.add('opened');

  const old_name = item.name as string;
  
  const div_old_path = div_rename!.querySelector('#rename-old-path');

  const div_text_path = div_rename!.querySelector('#rename-input-cont #path');
  const div_text_ext = div_rename!.querySelector('#rename-input-cont #ext');
  const div_error = div_rename!.querySelector('.item#error') as HTMLDivElement;

  const input = div_rename!.querySelector('input');
  input!.name = "rename_input";
  const btn_confirm = div_rename!.querySelector('button#btn-rename-confirm');
  div_error!.querySelector('.text')!.textContent = "";
  
  div_text_path!.textContent = item.path;
  if (item.extension) {
    div_text_ext!.textContent = item.extension as string;
  } else {
    div_text_ext!.textContent = "";
  }
  div_error!.style.opacity = "0";

  div_old_path!.textContent = old_name;
  input!.value = old_name;
  input!.focus();
  input!.select();

  const escape_enter_listener = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      close_rename_menu();
      document.removeEventListener('keydown', escape_enter_listener);
    }
    if (e.key === "Enter") {
      try {
        item.rename(input!.value);
        div_error!.querySelector('.text')!.textContent = "success";

        close_rename_menu();
        document.removeEventListener('keydown', escape_enter_listener);
      } catch (error) {
        div_error!.querySelector('.text')!.textContent = error as string;
      }
    }
  }
  const confirm = async () => {
    try {
      await item.rename(input!.value);
      div_error!.querySelector('.text')!.textContent = "success";
      div_error!.style.opacity = "0";

      close_rename_menu();
      btn_confirm!.addEventListener('click', confirm);
    } catch (error) {
      div_error!.style.opacity = "1";
      div_error!.querySelector('.text')!.textContent = error as string;
    }
  }

  document.addEventListener('keydown', escape_enter_listener);
  btn_confirm!.addEventListener('click', confirm);
}

let header_input = {
  input: document.querySelector('#header input#path') as HTMLInputElement,
  path: "",
  last_valid_disk: "",
  is_input_focus: false,
  items: [] as any[]
}

let items_side_bar_hot_bar: any[] = [];
let items_side_bar_disks: any[] = [];
let items_output: any[] = [];
// let items_header_input = header_input.items;
// let items_highlighted: Item[] = [];
let item_selected: Item | null = null;

const output: HTMLInputElement | null = document.querySelector('#output');
const input_path: HTMLInputElement | null = document.querySelector('input#path');
const path_points: HTMLDivElement | null = document.querySelector('#header #path_points');

const div_side_bar_hot_bar: HTMLDivElement | null = document.querySelector('#side_bar #hot_bar');
const div_side_bar_disks: HTMLDivElement | null = document.querySelector('#side_bar #disks');

const btn_reload_output: HTMLButtonElement | null = document.querySelector('#header button#reload');
const btn_go_up_path: HTMLButtonElement | null = document.querySelector('#header button#go_up');
const btn_open_folder: HTMLButtonElement | null = document.querySelector('#header button#read');
const btn_open_folder_new_window: HTMLButtonElement | null = document.querySelector('#header button#open_folder_new_window');
const btn_open_folder_stats: HTMLButtonElement | null = document.querySelector('#header button#open_folder_stats');

const btn_radio_view_list: HTMLInputElement | null = document.querySelector('input[type="radio"]#list');
const btn_radio_view_table: HTMLInputElement | null = document.querySelector('input[type="radio"]#table');

// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
const div_context_menu: HTMLDivElement | null = document.querySelector('#context_menu');
let is_context_menu_open: boolean = false;

const div_rename: HTMLDivElement | null = document.querySelector('#rename');
const btn_close_rename_menu: HTMLButtonElement | null = div_rename!.querySelector('button#btn-rename-close');
let is_rename_menu_open: boolean = false;
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^



document.addEventListener('DOMContentLoaded', async () => {
  const paths_side_bar_hot_bar: string[] = await invoke("get_paths_side_bar_hot_bar");
  for (let path of paths_side_bar_hot_bar) {
    items_side_bar_hot_bar.push(new Item(path, 'directory'));
  }
  div_side_bar_hot_bar?.replaceChildren();
  items_side_bar_hot_bar.forEach(item => {
    div_side_bar_hot_bar?.appendChild(item.div);
  });

  const paths_side_bar_disks: string[] = await invoke("get_paths_disks");
  for (let path of paths_side_bar_disks) {
    items_side_bar_disks.push(new Item(path, 'directory'));
  }
  div_side_bar_disks?.replaceChildren();
  items_side_bar_disks.forEach(item => {
    div_side_bar_disks?.appendChild(item.div);
  });

  

  const preload_path = new URLSearchParams(window.location.search).get('path');
  // const preload_path = "C:/Users/pavel/OneDrive/Рабочий стол/";
  let path_start = paths_side_bar_disks[0];

  if (preload_path) {
    path_start = preload_path;
  } else {
    if (items_side_bar_hot_bar[0]) {
      path_start = items_side_bar_hot_bar[0].path;
    }
  }
  open_folder(path_start);


  // await open_folder(items_side_bar_hot_bar[0].path);
  
  // items_output[0].rename("1313");
  // open_rename_menu(items_output[0])ж
  // items_output[7].rename("icon");
});



btn_reload_output?.addEventListener('click', () => {
  open_folder(header_input.path);
});
btn_go_up_path?.addEventListener('click', () => {
  const path_splitted = header_input.path.split('/');
  if (path_splitted.length < 3) {
    return;
  }
  const new_path = path_splitted.slice(0, header_input.path.split('/').length - 2).join('/');
  open_folder(new_path);
});
btn_open_folder?.addEventListener('click', () => {
  open_folder(header_input.input.value);
});
btn_open_folder_new_window?.addEventListener('click', () => {
  open_folder_new_window(header_input.input.value);
});
btn_open_folder_stats?.addEventListener('click', () => {
  console.log(header_input.path);
  open_folder_statistics(header_input.path);
});



input_path?.addEventListener('focus', () => {
  header_input.is_input_focus = true;
  path_points!.style.display = "none";
  input_path!.classList.remove('hide_text');
});
input_path?.addEventListener('blur', () => {
  header_input.is_input_focus = false;
  path_points!.style.display = "flex";
  input_path!.classList.add('hide_text');
});
path_points?.addEventListener('click', (e) => {
  if (e.target === path_points) {
    input_path?.focus();
  }
});
header_input.is_input_focus = false;
path_points!.style.display = "flex";
input_path!.classList.add('hide_text');

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

btn_close_rename_menu?.addEventListener('click', () => {
  close_rename_menu();
});
div_rename?.addEventListener('click', (e) => {
  e.stopPropagation();
})

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});
document.addEventListener('click', () => {
  if (is_context_menu_open) {
    close_context_menu();
  }
  if (is_rename_menu_open) {
    close_rename_menu();
  }
});
document.addEventListener('keydown', (e) => {
  if (is_context_menu_open) {
    if (e.key === "Escape") {
      close_context_menu();
    }
  }
});