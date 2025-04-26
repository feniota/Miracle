use tauri::window::EffectsBuilder;
use tauri::{AppHandle, Emitter, WebviewWindowBuilder};
use tauri_plugin_positioner::{Position, WindowExt};
use window_vibrancy::apply_acrylic;

#[tauri::command]
pub async fn launch_forecast_window(app: AppHandle, classes: Vec<String>) -> Result<(), ()> {
    let init_script = format!(
        "window.__MIRACLE_DATA_CLASSES=JSON.parse('{}');",
        serde_json::to_string(&classes).unwrap()
    );
    let effects = EffectsBuilder::new()
        //.effect(tauri::utils::WindowEffect::)
        .build();
    let monitor = app.primary_monitor().map_err(|_| ())?.unwrap();
    let window = WebviewWindowBuilder::new(
        &app,
        "forecast",
        tauri::WebviewUrl::App("/forecast/index.html".into()),
    )
    .always_on_top(true)
    .transparent(true)
    .decorations(false)
    .effects(effects)
    .inner_size(
        50.0,
        monitor.size().height as f64 / monitor.scale_factor() - 100.0,
    )
    .visible(false)
    .skip_taskbar(true)
    .initialization_script(&init_script.as_str())
    .build()
    .map_err(|_| ())?;
    window.move_window(Position::TopRight).map_err(|_| ())?;
    apply_acrylic(&window, Some((0, 0, 0, 20))).map_err(|_| ())?;
    window.show().map_err(|_| ())?;
    let _ = window.emit("ready", classes);
    Ok(())
}
