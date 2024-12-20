import "./style.css";
import CONFIG from "./config.json";
import { fetch } from "@tauri-apps/plugin-http";

(() => {
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
  (() => {
    const countdown = document.getElementById("countdown")!;
    const ceeDate = new Date(CONFIG.ceeDate);
    const currentDate = new Date();
    const timeDifference = ceeDate.getTime() - currentDate.getTime();
    const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));
    countdown.innerHTML = `现在距离高考还有 <span id="countdown-day-number">${daysDifference}</span> 天`;
  })();

  // generate date text
  (() => {
    const now = new Date();
    const date = document.getElementById("date")!;
    date.innerHTML = `${now.getFullYear()}年<br>${
      now.getMonth() + 1
    }月<br>${now.getDate()}日<br>星期${"日一二三四五六"[now.getDay()]}`;
  })();

  // generate clock
  (() => {
    const clock_hr1 = document.getElementById("clock-hour-1")!;
    const clock_hr2 = document.getElementById("clock-hour-2")!;
    const clock_min1 = document.getElementById("clock-min-1")!;
    const clock_min2 = document.getElementById("clock-min-2")!;
    const clock_sec1 = document.getElementById("clock-sec-1")!;
    const clock_sec2 = document.getElementById("clock-sec-2")!;

    const transformByDigit = function (digit: number, element: HTMLElement) {
      element.style.transform = `translateY(-${10 * digit}%)`;
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
  })();

  // obtain daily wallpaper
  (() => {
    fetch("https://api.nguaduot.cn/spotlight/today?json=1")
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          return Promise.reject();
        }
      })
      .then((res) => {
        if (res.status == 1) {
          return fetch(res.data.imgurl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
            },
          });
        } else {
          return Promise.reject();
        }
      })
      .then((res) => {
        if (res.ok) {
          return res.blob();
        } else {
          return Promise.reject();
        }
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        document.body.style.backgroundImage = `url(${url})`;
      })
      .catch((_) => {});
  })();
})();
