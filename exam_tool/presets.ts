export type Preset = {
  name: string;
  periods: Period[];
};

export type Period = {
  available: boolean; // 如果此值为否，则这段时间被视为休息
  duration: number; //单位是分钟
};

export const default_presets: Preset[] = [
  {
    name: "120 分钟",
    periods: [
      {
        available: true,
        duration: 120,
      },
    ],
  },
  {
    name: "150 分钟",
    periods: [
      {
        available: true,
        duration: 150,
      },
    ],
  },{
    name: "100 分钟（英语笔试）",
    periods: [
      {
        available: true,
        duration: 100,
      },
    ],
  },
  {
    name: "75 分钟",
    periods: [
      {
        available: true,
        duration: 75,
      },
    ],
  },
  {
    name: "75 分钟*2（间隔 10 分钟）",
    periods: [
      {
        available: true,
        duration: 75,
      },
      { available: false, duration: 10 },
      {
        available: true,
        duration: 75,
      },
    ],
  },  {
    name: "75 分钟*2（间隔 15 分钟）",
    periods: [
      {
        available: true,
        duration: 75,
      },
      { available: false, duration: 15 },
      {
        available: true,
        duration: 75,
      },
    ],
  },  {
    name: "75 分钟*2（间隔 20 分钟）",
    periods: [
      {
        available: true,
        duration: 75,
      },
      { available: false, duration: 20 },
      {
        available: true,
        duration: 75,
      },
    ],
  },
  {
    name: "115 分钟",
    periods: [
      {
        available: true,
        duration: 115, // 120 - 5
      },
    ],
  },
  {
    name: "145 分钟",
    periods: [
      {
        available: true,
        duration: 145, // 150 - 5
      },
    ],
  },{
    name: "95 分钟（英语笔试）",
    periods: [
      {
        available: true,
        duration: 95,
      },
    ],
  },
  {
    name: "70 分钟",
    periods: [
      {
        available: true,
        duration: 70, // 75 - 5
      },
    ],
  },
  {
    name: "70 分钟*2（间隔 10 分钟）",
    periods: [
      {
        available: true,
        duration: 70, // 75 - 5
      },
      { available: false, duration: 10 }, // 休息时间不变
      {
        available: true,
        duration: 70, // 75 - 5
      },
    ],
  },{
    name: "70 分钟*2（间隔 15 分钟）",
    periods: [
      {
        available: true,
        duration: 70, // 75 - 5
      },
      { available: false, duration: 15 }, // 休息时间不变
      {
        available: true,
        duration: 70, // 75 - 5
      },
    ],
  },{
    name: "70 分钟*2（间隔 20 分钟）",
    periods: [
      {
        available: true,
        duration: 70, // 75 - 5
      },
      { available: false, duration: 20 }, // 休息时间不变
      {
        available: true,
        duration: 70, // 75 - 5
      },
    ],
  },
];
