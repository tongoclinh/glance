// Run with: node internal/glance/static/js/_lunar.test.js
import assert from "node:assert/strict";
import { lunarCellInfo, toLunarDate } from "./lunar.js";

const lunar = (y, m, d) => toLunarDate(new Date(y, m - 1, d));
const cell = (y, m, d) => lunarCellInfo(new Date(y, m - 1, d));
const label = (y, m, d) => cell(y, m, d).label;

// Tết, i.e. lunar 1/1, is the strongest available anchor: these solar dates are
// published, non-derived facts.
const tet = [
    [2017, 1, 28], [2018, 2, 16], [2019, 2, 5], [2020, 1, 25], [2021, 2, 12],
    [2022, 2, 1], [2023, 1, 22], [2024, 2, 10], [2025, 1, 29], [2026, 2, 17],
    [2027, 2, 6], [2028, 1, 26],
];

for (const [y, m, d] of tet) {
    const l = lunar(y, m, d);
    assert.deepEqual(
        [l.day, l.month, l.leap], [1, 1, false],
        `Tết ${y}: ${y}-${m}-${d} should be lunar 1/1, got ${l.day}/${l.month}`,
    );
    assert.equal(l.year, y, `lunar year at Tết ${y}`);
    assert.equal(label(y, m, d), "1/1");
}

// Leap month 2 of 2023 begins 22 Mar 2023 and must be distinguishable from the
// regular month 2 that began 20 Feb 2023.
assert.deepEqual(lunar(2023, 3, 22), { day: 1, month: 2, year: 2023, leap: true });
assert.deepEqual(lunar(2023, 2, 20), { day: 1, month: 2, year: 2023, leap: false });
assert.equal(label(2023, 3, 22), "1/2+");
assert.equal(label(2023, 2, 20), "1/2");

// Giỗ Tổ Hùng Vương is lunar 10/3; 2024 fell on 18 Apr.
assert.deepEqual(lunar(2024, 4, 18), { day: 10, month: 3, year: 2024, leap: false });

// Mùng 1 and ngày rằm are flagged; no other lunar day is. Over a 5-year span
// exactly the days numbered 1 and 15 must be notable.
for (const date = new Date(2024, 0, 1); date < new Date(2029, 0, 1); date.setDate(date.getDate() + 1)) {
    const l = toLunarDate(date);
    const expected = l.day === 1 || l.day === 15;
    assert.equal(
        lunarCellInfo(date).notable, expected,
        `${date.toISOString().slice(0, 10)}: lunar day ${l.day} notable should be ${expected}`,
    );
}

// Tết and the first full moon of the lunar year (Tết Nguyên Tiêu) are notable.
assert.equal(cell(2026, 2, 17).notable, true);
assert.equal(cell(2026, 3, 3).notable, true);
assert.equal(label(2026, 3, 3), "15");
assert.equal(cell(2026, 2, 18).notable, false);

// A lunar month is 29 or 30 days, and days must advance by exactly one per
// solar day across a multi-year span with no gaps, repeats or out-of-range days.
let previous = lunar(2020, 1, 1);
for (const date = new Date(2020, 0, 2); date < new Date(2030, 0, 1); date.setDate(date.getDate() + 1)) {
    const current = toLunarDate(date);
    const iso = date.toISOString().slice(0, 10);

    assert.ok(current.day >= 1 && current.day <= 30, `${iso}: day ${current.day} out of range`);
    assert.ok(current.month >= 1 && current.month <= 12, `${iso}: month ${current.month} out of range`);

    if (current.day !== 1) {
        assert.equal(current.day, previous.day + 1, `${iso}: day should follow ${previous.day}`);
        assert.equal(current.month, previous.month, `${iso}: month changed mid-month`);
    } else {
        assert.ok(previous.day === 29 || previous.day === 30,
            `${iso}: previous month ended on day ${previous.day}, expected 29 or 30`);
    }

    previous = current;
}

// Days before a lunar new year belong to the previous lunar year.
assert.equal(lunar(2024, 2, 9).year, 2023);
assert.equal(lunar(2024, 2, 9).month, 12);

console.log("lunar.test.js: all assertions passed");
