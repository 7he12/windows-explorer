import { invoke } from "@tauri-apps/api/core";

// export async function api_rename_file (item: FileSystemWritableFileStream, new_name: String) {
//     const new_path = item.is_dir
//     ? `${item.parent_path}/${new_name}`
//     : `${item.parent_path}/${new_name}`;

//     await invoke("rename_file", { oldpath: item.path, newpath: new_path});

//     item.update_name(new_name);
// }

// export async function api_get_files_hot_bar (): Promise<FileItem[]> {
//     let entries: any[] = await invoke("get_files_hot_bar");
//     let file_items: FileItem[] = [];

//     entries.forEach(entry => {
//         file_items.push(new FileItem(entry.path, entry.is_dir, entry.extension));
//     });
//     return file_items;
// }
// export async function api_get_files_drives (): Promise<FileItem[]> {
//     let entries: any[] = await invoke("get_files_drives");
//     let file_items: FileItem[] = [];

//     entries.forEach(entry => {
//         file_items.push(new FileItem(entry.path, entry.is_dir, entry.extension));
//     });
//     return file_items;
// }
// export async function api_get_exe_path (): Promise<FileItem> {
//     let path: string = await invoke("get_exe_path");
//     return new FileItem(path, true);
// }

export const api = {
    async read_items_from_directory_path (path: String): Promise<any[]> {
        let entries: any[] = await invoke("read_items_from_directory_path", { dirpath: path });
        return entries;
    },
    async get_items_hot_bar (): Promise<any[]> {
        let entries: any[] = await invoke("get_items_hot_bar");
        return entries;
    },
    async get_items_drives (): Promise<any[]> {
        let entries: any[] = await invoke("get_items_drives");
        return entries;
    },
    async rename (oldpath: String, new_name: String): Promise<any> {
        let result: any = await invoke("rename", { oldpath: oldpath, newname: new_name });
        // let result = "lsfdj"
        return result;
    },
    async fileitem_from_string (path: String): Promise<any> {
        let result: any = await invoke("fileitem_from_string", { pathStr: path });
        return result;
    },
    async create_item (parentpath: String, name: String, is_dir: boolean, extension: String): Promise<any> {
        let result: any = await invoke("create_item", { parentpath: parentpath, name: name, isdir: is_dir, extension: extension });
        return result;
    },
    async remove_to_recycle_bin (path: String): Promise<any> {
        let result: any = await invoke("remove_to_recycle_bin", { pathstr: path });
        return result;
    },
}