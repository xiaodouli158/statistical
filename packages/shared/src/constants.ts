export const ZODIAC_SEQUENCE = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"] as const;

export const WAVE_COLORS = ["red", "blue", "green"] as const;

export const DRAW_API_URL = "https://macaumarksix.com/api/macaujc2.com";

export const BUSINESS_DAY_START_HOUR = 6;

export const SESSION_COOKIE_NAME = "statisticalsystem_session";

export const DEFAULT_NUMBER_ODDS = 47;

export const DEFAULT_ZODIAC_ODDS = 12;

export const NUMBER_ORDER_NATURAL = Array.from({ length: 49 }, (_, index) => String(index + 1).padStart(2, "0"));
