import "./style.css";
import { default_presets, type Period } from "./presets";
import { Store } from "@tauri-apps/plugin-store";
import { debug, warn } from "@tauri-apps/plugin-log";
import _axios from "axios";
import axiosTauriApiAdapter from "axios-tauri-api-adapter";
const axios = _axios.create({
  adapter: axiosTauriApiAdapter,
});
import "mdui/mdui.css";
import "mdui";
import { Button, Dialog, Select, snackbar } from "mdui";

declare global {
  interface Window {
    wallpaper_url: string;
    timing: {
      activate: boolean;
      available: boolean;
      until: Date;
      remaining_periods: Period[];
    };
  }
}
window.timing = {
  activate: false,
  until: new Date(),
  remaining_periods: [],
  available: false,
};

// 如果壁纸获取失败并调用了 setTimeout，这将是返回的 id，否则是 -1
let wp_retry_id = -1;
// obtain daily wallpaper
const get_wallpaper = () => {
  debug("start fetching wallpaper");
  // Windows spotlight v4 api
  // from: https://github.com/ORelio/Spotlight-Downloader/blob/master/SpotlightAPI.md#api-v4
  const headers = {
    "User-Agent": "WindowsShellClient",
  };
  axios
    .get(
      "https://fd.api.iris.microsoft.com/v4/api/selection?&placement=88000820&bcnt=1&country=CN&locale=zh-CN&fmt=json",
      { headers }
    )
    .then((res) => {
      debug("fetched image info");
      let ok = false;
      try {
        ok = res.status === 200 && res.data.batchrsp.items[0].item;
      } catch (_) {}
      if (ok) {
        return Promise.resolve(JSON.parse(res.data.batchrsp.items[0].item));
      } else {
        return Promise.reject({ msg: "获取图像元信息失败", resp: res });
      }
    })
    .then((res) => {
      return axios
        .get(res.ad.landscapeImage.asset!, { responseType: "blob", headers })
        .then((res_) => ({ img: res_, desc: res }));
    })
    .then((res) => {
      debug("fetched image link");
      if (res.img.status === 200) {
        wp_retry_id = -1;
        if (window.wallpaper_url) URL.revokeObjectURL(window.wallpaper_url);
        const url = URL.createObjectURL(res.img.data);
        window.wallpaper_url = url;
        document.getElementById("body")!.style.backgroundImage = `url(${url})`;
      } else {
        return Promise.reject({ msg: "下载图片失败", resp: res.img });
      }
    })
    .catch((e) => {
      warn("fetch wallpaper failed because of: " + (e.msg || e.code || e));

      if (e.resp) warn(e.resp);
      // retry after 1mins, 指定 window 是为了不让 tsc 觉得是 Node.js 的 timeout
      wp_retry_id = window.setTimeout(get_wallpaper, 60_000);
    });
};
get_wallpaper();
const time_now = document.getElementById("time-now")!;
const time_cb = document.getElementById("time-cb__time")!;
const time_cb_label = document.getElementById("time-cb__label")!;
const time = () => {
  const now = new Date();

  // --- 更新当前时间显示 ---
  const currentHours = now.getHours().toString().padStart(2, "0");
  const currentMinutes = now.getMinutes().toString().padStart(2, "0");
  const currentSeconds = now.getSeconds().toString().padStart(2, "0");
  time_now.innerHTML = `${currentHours}:${currentMinutes}:${currentSeconds}`;

  // --- 更新倒计时显示 ---
  if (window.timing.activate) {
    const until = window.timing.until;
    const diff = until.getTime() - now.getTime(); // 毫秒差

    if (diff > 0) {
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      // 格式化倒计时
      const countdownHours = hours.toString().padStart(2, "0");
      const countdownMinutes = minutes.toString().padStart(2, "0");
      const countdownSeconds = seconds.toString().padStart(2, "0");

      time_cb.innerHTML = `${countdownHours}:${countdownMinutes}:${countdownSeconds}`;
      time_cb_label.innerHTML = window.timing.available
        ? "remaining"
        : "waiting";
    } else {
      // 倒计时结束
      time_cb.innerHTML = "--:--:--";
      // 这里可以添加倒计时结束后的逻辑，比如：
      // window.timing.activate = false;
      // console.log("一个时间段结束！");
      // triggerNextPeriod(); // 假设有这样一个函数来处理下一个时间段
      if (window.timing.remaining_periods.length > 0) {
        const current = window.timing.remaining_periods.shift();
        if (!current) {
          window.timing.activate = false;
          return;
        }
        window.timing.available = current.available;
        window.timing.until = new Date();
        window.timing.until.setTime(
          now.getTime() + current.duration * 60 * 1000
        );
        window.timing.until.setMilliseconds(0);
      } else if (window.timing.remaining_periods.length === 0) {
        window.timing.activate = false;
      }
    }
  } else {
    // 如果计时未激活，可以清空倒计时显示或显示默认文本
    time_cb.innerHTML = "--:--:--"; // 或者 time_cb.innerHTML = "";
  }
};
time();
// 确保在下一秒开始时启动计时器，避免初始跳动
setTimeout(() => {
  time(); // 先立即执行一次以显示当前时间
  setInterval(time, 1000); // 然后每秒更新
}, 1000 - new Date().getMilliseconds());

const control__start = document.getElementById("control__start")! as Button;
const control_dialog = document.getElementById(
  "control-dialog-dialog"
)! as Dialog;
control__start.addEventListener("click", () => {
  control_dialog.open = true;
});

const preset_select = document.getElementById("preset-select") as Select;
const hour_select = document.getElementById("hour-select") as Select;
const minute_select = document.getElementById("minute-select") as Select;
const start_button = document.getElementById("start-button") as Button;

preset_select.innerHTML = (() => {
  let $return: string = "";
  for (const i in default_presets) {
    $return += ` <mdui-menu-item value="${i}">${default_presets[i].name}</mdui-menu-item>`;
  }
  return $return;
})();

hour_select.innerHTML = (() => {
  let $return: string = "";
  for (let i = 0; i < 24; i++) {
    $return += ` <mdui-menu-item value="${i.toString().padStart(2, "0")}">${i
      .toString()
      .padStart(2, "0")}</mdui-menu-item>`;
  }
  return $return;
})();

minute_select.innerHTML = (() => {
  let $return: string = "";
  for (let i = 0; i < 60; i++) {
    $return += ` <mdui-menu-item value="${i}">${i
      .toString()
      .padStart(2, "0")}</mdui-menu-item>`;
  }
  return $return;
})();

start_button.addEventListener("click", () => {
  if (
    +hour_select.reportValidity() +
      +(+minute_select.reportValidity()) +
      +preset_select.reportValidity() !==
    3
  ) {
    snackbar({ message: "请填写必要字段" });
    return;
  }
  // @ts-ignore
  const hour = Number.parseInt(hour_select.value);
  // @ts-ignore
  const minute = Number.parseInt(minute_select.value);
  // @ts-ignore
  const preset = default_presets[preset_select.value];

  const until = new Date();
  until.setHours(hour);
  until.setMinutes(minute);
  until.setSeconds(0);
  until.setMilliseconds(0);

  if (until.getTime() - new Date().getTime() <= 0) {
    snackbar({ message: "不能设置过去开始的倒计时" });
    return;
  }
  window.timing.until = until;
  window.timing.remaining_periods = preset.periods;
  control__start.style.display = "none";
  control_dialog.open = false;
  window.timing.activate = true;
});
