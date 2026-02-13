export const Timeframe = {
  OneMinute: '1m',
  FiveMinutes: '5m',
  TenMinutes: '10m',
  FifteenMinutes: '15m',
  ThirtyMinutes: '30m',
  OneHour: '1h',
  TwoHours: '2h',
  FourHours: '4h',
  SixHours: '6h',
  EightHours: '8h',
  TwelveHours: '12h',
  OneDay: '1d',
  ThreeDays: '3d',
  OneWeek: '1w',
  OneMonth: '1M',
} as const;

export type Timeframe = (typeof Timeframe)[keyof typeof Timeframe];
