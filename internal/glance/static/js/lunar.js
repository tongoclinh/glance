// Vietnamese lunar calendar conversion.
// Algorithm by Hồ Ngọc Đức (https://www.informatik.uni-leipzig.de/~duc/amlich/),
// based on Jean Meeus, "Astronomical Algorithms". Timezone is fixed to UTC+7,
// which is what Vietnamese calendars have used since 1968.
// ponytail: UTC+7 hardcoded; pre-1968 dates used UTC+8 and will be off by a day
// near month boundaries. Add a year-dependent offset if historical dates matter.

const TIMEZONE = 7;
const SYNODIC_MONTH = 29.530588853;
const EPOCH_NEW_MOON = 2415021.076998695;

// Julian day number from a Gregorian (or Julian, before 1582-10-15) date.
function julianDay(day, month, year) {
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    const jd = day + Math.floor((153 * m + 2) / 5) + 365 * y +
        Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

    return jd < 2299161
        ? day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083
        : jd;
}

// Julian day of the k-th new moon since 1900-01-01.
function newMoon(k) {
    const T = k / 1236.85;
    const T2 = T * T;
    const T3 = T2 * T;
    const dr = Math.PI / 180;

    const jd1 = 2415020.76132 + SYNODIC_MONTH * k + 0.0001337 * T2 -
        0.000000150 * T3 + 0.00000000073 * T2 * T2;
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;

    let c1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    c1 -= 0.4068 * Math.sin(Mpr * dr);
    c1 += 0.0161 * Math.sin(2 * dr * Mpr);
    c1 -= 0.0004 * Math.sin(3 * dr * Mpr);
    c1 += 0.0104 * Math.sin(2 * dr * F);
    c1 -= 0.0051 * Math.sin(dr * (M + Mpr));
    c1 -= 0.0074 * Math.sin(dr * (M - Mpr));
    c1 += 0.0004 * Math.sin(dr * (2 * F + M));
    c1 -= 0.0004 * Math.sin(dr * (2 * F - M));
    c1 -= 0.0006 * Math.sin(dr * (2 * F + Mpr));
    c1 += 0.0010 * Math.sin(dr * (2 * F - Mpr));
    c1 += 0.0005 * Math.sin(dr * (2 * Mpr + M));

    const deltat = T < -11
        ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
        : -0.000278 + 0.000265 * T + 0.000262 * T2;

    return jd1 + c1 - deltat;
}

// Apparent solar longitude in radians at the given Julian day.
function sunLongitude(jd) {
    const T = (jd - 2451545.0) / 36525;
    const T2 = T * T;
    const dr = Math.PI / 180;

    const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;

    let dl = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    dl += (0.019993 - 0.000101 * T) * Math.sin(2 * dr * M);
    dl += 0.000290 * Math.sin(3 * dr * M);

    const L = (L0 + dl) * dr;

    return L - Math.PI * 2 * Math.floor(L / (Math.PI * 2));
}

// Which 30-degree zodiac sector the sun occupies, 0-11, at local midnight.
function sunSector(dayNumber) {
    return Math.floor(sunLongitude(dayNumber - 0.5 - TIMEZONE / 24) / Math.PI * 6);
}

// Local day containing the k-th new moon.
function newMoonDay(k) {
    return Math.floor(newMoon(k) + 0.5 + TIMEZONE / 24);
}

// Day of the 11th lunar month, the month containing the winter solstice.
function lunarMonth11(year) {
    const offset = julianDay(31, 12, year) - 2415021;
    const k = Math.floor(offset / SYNODIC_MONTH);
    const day = newMoonDay(k);

    // The solstice must fall inside this month; if the sun has already passed
    // it, step back one new moon.
    return sunSector(day) >= 9 ? newMoonDay(k - 1) : day;
}

// Index of the leap month within a 13-month lunar year: the first month that
// contains no zodiac sector transition.
function leapMonthOffset(month11) {
    const k = Math.floor((month11 - EPOCH_NEW_MOON) / SYNODIC_MONTH + 0.5);
    let i = 1;
    let sector = sunSector(newMoonDay(k + i));
    let previous;

    do {
        previous = sector;
        i++;
        sector = sunSector(newMoonDay(k + i));
    } while (sector !== previous && i < 14);

    return i - 1;
}

/**
 * Converts a solar date to the Vietnamese lunar calendar.
 * @param {Date} date
 * @returns {{ day: number, month: number, year: number, leap: boolean }}
 */
export function toLunarDate(date) {
    const dayNumber = julianDay(date.getDate(), date.getMonth() + 1, date.getFullYear());
    const solarYear = date.getFullYear();

    const k = Math.floor((dayNumber - EPOCH_NEW_MOON) / SYNODIC_MONTH);
    let monthStart = newMoonDay(k + 1);
    if (monthStart > dayNumber) monthStart = newMoonDay(k);

    let month11 = lunarMonth11(solarYear);
    let nextMonth11 = month11;
    let year;

    if (month11 >= monthStart) {
        year = solarYear;
        month11 = lunarMonth11(solarYear - 1);
    } else {
        year = solarYear + 1;
        nextMonth11 = lunarMonth11(solarYear + 1);
    }

    const monthsSince11 = Math.floor((monthStart - month11) / 29);
    let month = monthsSince11 + 11;
    let leap = false;

    if (nextMonth11 - month11 > 365) {
        const offset = leapMonthOffset(month11);

        if (monthsSince11 >= offset) {
            month = monthsSince11 + 10;
            leap = monthsSince11 === offset;
        }
    }

    if (month > 12) month -= 12;
    if (month >= 11 && monthsSince11 < 4) year -= 1;

    return { day: dayNumber - monthStart + 1, month, year, leap };
}

/**
 * Label and highlight flag for a calendar cell corner. The label is the lunar
 * day, or "day/month" on the first day of a lunar month so the month is
 * identifiable at a glance; a leap month is suffixed with "+". Mùng 1 and ngày
 * rằm (lunar day 15) are flagged so both dates in the cell can be emphasized.
 * @param {Date} date
 * @returns {{ label: string, notable: boolean }}
 */
export function lunarCellInfo(date) {
    const lunar = toLunarDate(date);

    return {
        label: lunar.day === 1 ? `1/${lunar.month}${lunar.leap ? "+" : ""}` : String(lunar.day),
        notable: lunar.day === 1 || lunar.day === 15,
    };
}
