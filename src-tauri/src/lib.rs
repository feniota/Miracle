use raw_window_handle::RawWindowHandle::Win32;
use raw_window_handle::{HasWindowHandle, RawWindowHandle};
use std::ffi::c_void;
use std::sync::atomic::AtomicPtr;
use std::sync::OnceLock;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_dialog::MessageDialogKind;
use windows::core::{w, PCWSTR};
use windows::Win32::Foundation::{BOOL, HWND, LPARAM, TRUE, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, FindWindowExW, FindWindowW, SendMessageTimeoutW, SetParent,
    SEND_MESSAGE_TIMEOUT_FLAGS,
};
mod func;
use crate::func::{exam_window::launch_exam_window, forecast_window::launch_forecast_window};

// // 定义一个全局变量来存储 workview 句柄
// lazy_static! {
//     static ref WORKVIEW_HANDLE: Arc<Mutex<AtomicPtr<c_void>>> =
//         Arc::new(Mutex::new(AtomicPtr::new(std::ptr::null_mut())));
// }

static WORKVIEW_HANDLE: OnceLock<AtomicPtr<c_void>> = OnceLock::new();

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
                //*WORKVIEW_HANDLE.lock().unwrap() = AtomicPtr::new(workview.0);
                WORKVIEW_HANDLE.get_or_init(|| AtomicPtr::new(workview.0));
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
                    WORKVIEW_HANDLE.get_or_init(|| AtomicPtr::new(workview.0));
                }
            }
        }
        _ => {}
    }
    // 忽略错误处理，因为如果最终没获取到 WorkerW 的句柄的话会在下面报错，这里就不用操心了。

    TRUE
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("miracle.log".to_string()),
                    },
                ))
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![launch_forecast_window,])
        .setup(|app: &mut tauri::App| {
            let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let wallpaper_i =
                MenuItem::with_id(app, "update-wallpaper", "更新壁纸", true, None::<&str>)?;
            let restart_i = MenuItem::with_id(app, "restart", "重启壁纸", true, None::<&str>)?;
            let exam_tool_i = MenuItem::with_id(app, "exam_tool", "考试工具", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i, &wallpaper_i, &restart_i, &exam_tool_i])?;

            #[cfg(debug_assertions)]
            {
                let debug_i = MenuItem::with_id(app, "debug", "启动 DevTools", true, None::<&str>)?;
                let _ = menu.append(&debug_i);
            }

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Miracle")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "update-wallpaper" => {
                        let _ = app.emit("update-wallpaper", ());
                    }
                    "restart" => {
                        app.restart();
                    }
                    "debug" => {
                        #[cfg(debug_assertions)]
                        let _ = app.get_webview_window("main").unwrap().open_devtools();
                    }
                    "exam_tool" => {
                        let _ = launch_exam_window(app);
                    }
                    _ => {
                        println!("menu item {:?} not handled", event.id);
                    }
                })
                .menu_on_left_click(true)
                .build(app);

            // 调试时不设置成壁纸，否则无法和应用交互
            if !cfg!(dev) {
                let main_window = app.get_window("main").unwrap();
                // 理论上经过下面的原生操作将窗口设置成 WorkerW 的子窗口后
                // 程序的任务栏图标会消失，但是测试发现某些情况下不会，因此
                // 要手动指定隐藏图标
                let _ = main_window.set_skip_taskbar(true);
                let _ = main_window.set_fullscreen(true);

                let failure_dialog = |message: &str| {
                    app.dialog()
                        .message(message)
                        .kind(MessageDialogKind::Error)
                        .title("壁纸启动失败")
                        .blocking_show()
                        .then(|| {
                            app.handle().exit(1);
                        });
                };

                match main_window.window_handle() {
                    Ok(handle) => {
                        let raw: RawWindowHandle = handle.into();
                        if let Win32(win32handle) = raw {
                            unsafe {
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
                                if let Some(workview_handle) = WORKVIEW_HANDLE.get() {
                                    if let Err(e) = SetParent(
                                        HWND(win32handle.hwnd.get() as *mut c_void),
                                        HWND(
                                            workview_handle
                                                .load(std::sync::atomic::Ordering::Acquire),
                                        ),
                                    ) {
                                        failure_dialog(&format!(
                                            "由于{e}，无法设置父窗口为 WorkerW。"
                                        ));
                                    }
                                } else {
                                    failure_dialog("未获取到 WorkerW 窗口句柄。");
                                }
                            }
                        } else {
                            failure_dialog("获取到主窗口句柄，但不是 Win32 形式。");
                        }
                    }
                    Err(e) => {
                        failure_dialog(&format!("由于{e}，无法获取主窗口句柄。"));
                    }
                };
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
