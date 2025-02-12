import "mdui/mdui.css";
import "./style.css";
import CONFIG from "./config.json";
import { debug, warn } from "@tauri-apps/plugin-log";
import _axios from "axios";
import axiosTauriApiAdapter from "axios-tauri-api-adapter";
import { snackbar } from "mdui";
import { listen } from "@tauri-apps/api/event";
import { animate_wallpaper_description } from "./lib/animation";
const axios = _axios.create({ adapter: axiosTauriApiAdapter });

// generate schedule text
if (CONFIG) {
  if (Array.isArray(CONFIG.schedule)) {
    let schedule_text = "";
    const today = new Date().getDay() == 7 ? 0 : new Date().getDay();
    CONFIG.schedule.forEach((item, index) => {
      if (Array.isArray(item)) {
        schedule_text += item[today] ? item[today] + " <br>" : "<br>";
      }
      if (Array.isArray(CONFIG.schedule_divider_indexes)) {
        CONFIG.schedule_divider_indexes.forEach((divider_index) => {
          if (divider_index - 1 === index) {
            schedule_text += "<br>";
          }
        });
      }
    });
    document.getElementById("schedule")!.innerHTML = schedule_text;
  }
}

// generate CEE countdown text
{
  const countdown = document.getElementById("countdown")!;
  const ceeDate = new Date(CONFIG.ceeDate);
  const currentDate = new Date();
  const timeDifference = ceeDate.getTime() - currentDate.getTime();
  const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));
  countdown.innerHTML = `现在距离高考还有 <span id="countdown-day-number">${daysDifference}</span> 天`;
}

// generate date text
{
  const now = new Date();
  const date = document.getElementById("date")!;
  date.innerHTML = `${now.getFullYear()}年<br>${
    now.getMonth() + 1
  }月<br>${now.getDate()}日<br>星期${"日一二三四五六"[now.getDay()]}`;
}

// generate clock
{
  const clock_hr1 = document.getElementById("clock-hour-1")!;
  const clock_hr2 = document.getElementById("clock-hour-2")!;
  const clock_min1 = document.getElementById("clock-min-1")!;
  const clock_min2 = document.getElementById("clock-min-2")!;
  const clock_sec1 = document.getElementById("clock-sec-1")!;
  const clock_sec2 = document.getElementById("clock-sec-2")!;

  const transformByDigit = function (digit: number, element: HTMLElement) {
    element.style.transform = `translateY(${-10 * digit}%)`;
  };

  setInterval(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    transformByDigit(Math.floor(hours / 10), clock_hr1);
    transformByDigit(hours % 10, clock_hr2);
    transformByDigit(Math.floor(minutes / 10), clock_min1);
    transformByDigit(minutes % 10, clock_min2);
    transformByDigit(Math.floor(seconds / 10), clock_sec1);
    transformByDigit(seconds % 10, clock_sec2);
  }, 1000);
}

// 如果壁纸获取失败并调用了 setTimeout，这将是返回的 id，否则是 -1
let wp_retry_id = -1;
// obtain daily wallpaper
const get_wallpaper = () => {
  debug("start fetching wallpaper");
  const Snackbar = snackbar({ message: "正在在线获取壁纸", placement: "top" });
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
        Snackbar.open = false;
        snackbar({
          message: "壁纸下载成功",
          placement: "top",
        });
        wp_retry_id = -1;
        const url = URL.createObjectURL(res.img.data);
        document.getElementById("body")!.style.backgroundImage = `url(${url})`;
        animate_wallpaper_description(
          res.desc.ad.title,
          res.desc.ad.description,
          res.desc.ad.copyright
        );
      } else {
        return Promise.reject({ msg: "下载图片失败", resp: res.img });
      }
    })
    .catch((e) => {
      warn("fetch wallpaper failed because of: " + (e.msg || e.code || e));
      Snackbar.open = false;
      snackbar({
        message:
          "由于 " +
          (e.msg || e.code || e) +
          "，壁纸下载失败，将于 5 分钟后重试",
        placement: "top",
        messageLine: 2,
      });
      if (e.resp) warn(e.resp);
      // retry after 5mins
      wp_retry_id = setTimeout(get_wallpaper, 300000);
    });
};
get_wallpaper();

listen<void>("update-wallpaper", (_) => {
  if (wp_retry_id !== -1) clearTimeout(wp_retry_id);
  get_wallpaper();
});
