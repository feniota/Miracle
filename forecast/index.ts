import "./styles.css";
declare global {
  interface Window {
    __MIRACLE_DATA_CLASSES: Array<string>;
  }
}

{
  const container = document.getElementById("schedule-container")!;
  const dividers: Array<number> = JSON.parse(
    window.__MIRACLE_DATA_CLASSES[window.__MIRACLE_DATA_CLASSES.length - 1]
  );
  const classes = window.__MIRACLE_DATA_CLASSES.slice(0, -1);
  for (const i in classes) {
    container.innerHTML += `<span class="class animatable">${
      classes[i] || "&emsp;"
    }</span>`;
    if (dividers.includes(parseInt(i) + 1)) {
      container.innerHTML += '<span class="class">&emsp;</span>';
    }
  }
}

{
  const items = window.__MIRACLE_DATA_CLASSES.length;
  const classes = document.getElementsByClassName("class")!;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const window_height = window.innerHeight;
  for (const element of classes as HTMLCollectionOf<HTMLElement>) {
    element.style.fontSize = `${(window_height - rem) / items - 30}px`;
  }
}

{
  const animatable_elements = document.getElementsByClassName("animatable");
  const keyframes: Array<Keyframe> = [
    {
      transform: "translateY(-20%)",
      opacity: 0,
    },
    {
      transform: "translateY(0%)",
      opacity: 1,
    },
  ];
  console.log(animatable_elements);
  function sleep(duration: number) {
    return new Promise<void>((resolve) => {
      setTimeout(() => resolve(), duration);
    });
  }
  (async () => {
    for (const element of animatable_elements) {
      console.log(element);
      element.animate(keyframes, {
        duration: 250,
        fill: "forwards",
      });
      await sleep(170);
    }
  })();
}
