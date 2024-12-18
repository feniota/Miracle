use lazy_static::lazy_static;
use raw_window_handle::RawWindowHandle::Win32;
use raw_window_handle::{HasWindowHandle, RawWindowHandle};
use std::ffi::c_void;
use std::sync::atomic::AtomicPtr;
use std::sync::{Arc, Mutex};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;
use windows::core::{w, PCWSTR};
use windows::Win32::Foundation::{BOOL, HWND, LPARAM, TRUE, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, FindWindowExW, FindWindowW, SendMessageTimeoutW, SetParent,
    SEND_MESSAGE_TIMEOUT_FLAGS,
};

// 定义一个全局变量来存储 workview 句柄
lazy_static! {
    static ref WORKVIEW_HANDLE: Arc<Mutex<AtomicPtr<c_void>>> =
        Arc::new(Mutex::new(AtomicPtr::new(std::ptr::null_mut())));
}

unsafe extern "system" fn enum_windows_callback(hwnd: HWND, _: LPARAM) -> BOOL {
    // 在这里处理每个窗口句柄 hwnd
    // 寻找桌面句柄
    let defview = FindWindowExW(
        hwnd,
        HWND(std::ptr::null_mut()),
        w!("SHELLDLL_DefView"),
        PCWSTR::null(),
    );

    // 如果找到桌面句柄再找壁纸句柄
    match defview {
        Ok(_) => {
            if let Ok(workview) = FindWindowExW(
                HWND(std::ptr::null_mut()),
                hwnd,
                w!("WorkerW"),
                PCWSTR::null(),
            ) {
                *WORKVIEW_HANDLE.lock().unwrap() = AtomicPtr::new(workview.0);
            } else {
                // try a different method
                // https://github.com/rocksdanister/lively/blob/d5ca68c17663242c15580b55962364ac4061f89e/src/Lively/Lively/Core/WinDesktopCore.cs#L1123
                let progman = FindWindowW(w!("Progman"), PCWSTR::null()).unwrap();
                if let Ok(workview) = FindWindowExW(
                    progman,
                    HWND(std::ptr::null_mut()),
                    w!("WorkerW"),
                    PCWSTR::null(),
                ) {
                    *WORKVIEW_HANDLE.lock().unwrap() = AtomicPtr::new(workview.0);
                } else {
                    // further error processing needed
                }
            }

            //
        }
        _ => {}
    }

    TRUE // 返回 TRUE 继续枚举，返回 FALSE 停止枚举
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .setup(|app: &mut tauri::App| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i])?;
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Miracle")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {
                        println!("menu item {:?} not handled", event.id);
                    }
                })
                .menu_on_left_click(true)
                .build(app);

            let main_window = app.get_window("main").unwrap();

            let _ = main_window.set_fullscreen(true);

            match main_window.window_handle() {
                Ok(handle) => {
                    let raw: RawWindowHandle = handle.into();
                    println!("{:?}", handle);
                    match raw {
                        Win32(win32handle) => unsafe {
                            println!("{:?}", win32handle);
                            let progman = FindWindowW(w!("Progman"), PCWSTR::null()).unwrap();
                            SendMessageTimeoutW(
                                progman,
                                0x052c_u32,
                                WPARAM(0xD),
                                LPARAM(0x1),
                                SEND_MESSAGE_TIMEOUT_FLAGS(0),
                                1000,
                                Option::None,
                            );
                            let _ = EnumWindows(Some(enum_windows_callback), LPARAM(0));
                            let workview_handle = *WORKVIEW_HANDLE.lock().unwrap().get_mut();
                            if workview_handle == std::ptr::null_mut() {
                                // further error processing needed
                            } else {
                                let _ = SetParent(
                                    HWND(win32handle.hwnd.get() as *mut c_void),
                                    HWND(workview_handle),
                                );
                            }
                        },
                        _ => {}
                    }
                }
                Err(_) => {}
            };

            Ok(())
        })
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
