export const ZODIAC_SEQUENCE = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"] as const;

export const WAVE_COLORS = ["red", "blue", "green"] as const;

export const LOTTERY_TYPES = ["macau", "hongkong"] as const;

export const DRAW_API_PRIMARY_URL = "https://api3.marksix6.net/lottery_api.php";

export const DRAW_API_BACKUP_URL = "https://marksix6.net/api/lottery_api.php";

export const DRAW_API_URL = DRAW_API_PRIMARY_URL;

export const BUSINESS_DAY_START_HOUR = 6;

export const SESSION_COOKIE_NAME = "statisticalsystem_session";

export const DEFAULT_TEMA_DIRECT_ODDS = 47;

export const DEFAULT_PING_TE_ODDS = 2;

export const DEFAULT_PING_TE_TAIL_ODDS = 1.8;

export const DEFAULT_NUMBER_ODDS = DEFAULT_TEMA_DIRECT_ODDS;

export const DEFAULT_ZODIAC_ODDS = DEFAULT_PING_TE_ODDS;

export const NUMBER_ORDER_NATURAL = Array.from({ length: 49 }, (_, index) => String(index + 1).padStart(2, "0"));
