use std::path::Path;
use std::env;
use std::fs::{ self };
use std::collections::HashMap;
use std::time::SystemTime;
use std::path::PathBuf;

use tauri::{ Manager };
use walkdir::WalkDir;
use sysinfo::Disks;

#[derive(Debug)]
#[derive(serde::Serialize)]
struct FileItem {
    name: String,
    extension: String,
    path: String,
    is_dir: bool,
}

fn remake_slash (path: String) -> String {
    path.replace("\\", "/")
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn fileitem_from_string (path_str: &str) -> Result<FileItem, String> {
    let path_buf = Path::new(path_str);
    let metadata = fs::metadata(path_buf).map_err(|e| e.to_string())?;
    let is_dir = metadata.is_dir();

    let name = match path_buf.file_name() {
        Some(n) => n.to_string_lossy().into_owned(),
        None => {
            path_str.trim_end_matches(['/']).to_string()
        }
    };

    let extension = path_buf
        .extension()
        .map(|ext| ext.to_string_lossy().into_owned())
        .unwrap_or_default();
    
    let path = if is_dir {
        format!("{}/", path_str.to_string())
    } else {
        path_str.to_string()
    };

    let fileitem = FileItem {
        name: name,
        is_dir: is_dir,
        extension: extension,
        path: path,
    };

    Ok(fileitem)
}

fn sort_fileitems (items: Vec<FileItem>) -> Vec<FileItem> {
    let mut result = items;

    result.sort_by(|a, b| {
        // Папки ("directory") получат приоритет над остальными типами
        let a_is_dir = a.is_dir == true;
        let b_is_dir = b.is_dir == true;
        
        // Сравниваем: сначала по признаку папки (в обратном порядке, чтобы true было раньше false),
        // а если они одинаковые (обе папки или оба файлы) — по имени.
        b_is_dir.cmp(&a_is_dir).then_with(|| a.name.cmp(&b.name))
    });

    return result;
}



#[tauri::command]
fn read_items_from_directory_path(dirpath: String) -> Result<Vec<FileItem>, String> {
    let entries = fs::read_dir(dirpath).map_err(|e| e.to_string())?;
    
    let result = entries
        .filter_map(|entry| entry.ok())
        .map(|entry| {
            fileitem_from_string(&remake_slash(entry.path().to_string_lossy().to_string()))
        })
        .filter_map(|res| res.ok())
        .collect();
    
    Ok(sort_fileitems(result))
}

#[tauri::command]
fn get_items_hot_bar (app_handle: tauri::AppHandle) -> Result<Vec<FileItem>, String> {
    let mut paths = Vec::new();
    let path_resolver = app_handle.path();
    
    if let Ok(p) = path_resolver.desktop_dir() {
        paths.push(p.to_string_lossy().to_string());
    }
    if let Ok(p) = path_resolver.download_dir() {
        paths.push(p.to_string_lossy().to_string());
    }
    if let Ok(p) = path_resolver.picture_dir() {
        paths.push(p.to_string_lossy().to_string());
    }
    if let Ok(p) = path_resolver.video_dir() {
        paths.push(p.to_string_lossy().to_string());
    }
    if let Ok(p) = path_resolver.document_dir() {
        paths.push(p.to_string_lossy().to_string());
    }

    let result = paths.into_iter()
        .map(|p| {
            fileitem_from_string(&remake_slash(p))
        })
        .filter_map(|res| res.ok())
        .collect();

    Ok(result)
}

#[tauri::command]
fn get_items_drives (app_handle: tauri::AppHandle) -> Result<Vec<FileItem>, String> {
    let drives = Disks::new_with_refreshed_list();
    let mut strings = Vec::new();
    let mut result = Vec::new();
    
    for disk in &drives {
        let path_string = remake_slash(disk.mount_point().to_string_lossy().to_string());
        strings.push(path_string);
    }
    for string in strings {
        let fileitem = fileitem_from_string(&string);
        result.push(fileitem?);
    }
    
    Ok(sort_fileitems(result))
}

#[tauri::command]
fn rename (oldpath: String, newname: String) -> Result<String, String> {
    let old_path = Path::new(oldpath.trim_end_matches(['/', '\\']));
    
    if !old_path.exists() {
        return Err(format!("path {} dos not exist", oldpath));
    }
    
    let parent_path = old_path.parent().ok_or_else(|| "Error: невозможно получить родительский путь");
    let new_path = parent_path?.join(&newname);

    if new_path.exists() {
        return Err(format!("Элемент с именем '{}' уже существует в этой папке", &newname));
    }
    
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;
    
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
fn create_item (parentpath: String, name: String, isdir: bool, extension: String) -> Result<String, String> {
    let mut full_path = PathBuf::from(parentpath);
    
    let full_name = if isdir {
        name.to_string()
    } else {
        if !extension.is_empty() {
            format!("{}.{}", name, extension)
        } else {
            name.to_string()
        }
    };
    
    full_path.push(full_name);
    
    if full_path.exists() {
        return Err("Путь уже существует".to_string());
    }
    
    if isdir {
        fs::create_dir_all(&full_path).map_err(|e| e.to_string())?;
    } else {
        fs::File::create(&full_path).map_err(|e| e.to_string())?;
    }
    
    let result = full_path.to_string_lossy().to_string();
    
    Ok(result)
}

#[tauri::command]
fn remove_to_recycle_bin (pathstr: String) -> Result<String, String> {
    let path = Path::new(&pathstr);

    if !path.exists() {
        return Err(format!("path {} dos not exist", pathstr));
    }

    trash::delete(path).map_err(|e| e.to_string());

    Ok(format!("{} has been removed to recycle bin", pathstr))
}



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_items_from_directory_path,
            get_items_hot_bar,
            get_items_drives,
            rename,
            fileitem_from_string,
            create_item,
            remove_to_recycle_bin,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
