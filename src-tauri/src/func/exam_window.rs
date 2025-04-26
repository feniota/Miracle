use tauri::{AppHandle, WebviewWindowBuilder};

pub fn launch_exam_window(app: &AppHandle) -> anyhow::Result<()> {
    let window = WebviewWindowBuilder::new(
        app,
        "exam_tool",
        tauri::WebviewUrl::App("/exam_tool/index.html".into()),
    )
    .decorations(false)
    .fullscreen(!cfg!(dev));
    window.build()?;
    Ok(())
}
