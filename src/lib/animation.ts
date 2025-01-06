export function animate_wallpaper_description(
  header: string,
  content: string,
  copyright: string
) {
  const header_elem = document.querySelector("#wallpaper-desc .header")!;
  const content_elem = document.querySelector("#wallpaper-desc .content")!;
  const copyright_elem = document.querySelector("#wallpaper-desc .copyright")!;

  const keyframes1: Keyframe[] = [{ opacity: 1 }, { opacity: 0 }];
  const keyframes2: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];

  header_elem
    .animate(keyframes1, { duration: 500, fill: "forwards" })
    .finished.then(
      () =>
        content_elem.animate(keyframes1, { duration: 500, fill: "forwards" })
          .finished
    )
    .then(
      () =>
        copyright_elem.animate(keyframes1, { duration: 500, fill: "forwards" })
          .finished
    )
    .then(() => {
      header_elem.innerHTML = header;
      content_elem.innerHTML = content;
      copyright_elem.innerHTML = copyright;
      return Promise.resolve();
    })
    .then(
      () =>
        header_elem.animate(keyframes2, { duration: 500, fill: "forwards" })
          .finished
    )
    .then(
      () =>
        content_elem.animate(keyframes2, {
          duration: 500,
          fill: "forwards",
        }).finished
    )
    .then(
      () =>
        copyright_elem.animate(keyframes2, {
          duration: 500,
          fill: "forwards",
        }).finished
    );
}
