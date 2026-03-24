const {isDateRangeValid} = require('../src/scripts/dateUtils');

test("valid range",()=>{

    expect(

    isDateRangeValid(
    '2026-03-10',
    '2026-03-20'

    )

    ).toBe(true);

});

test("invalid range",()=>{

    expect(

    isDateRangeValid(
    '2026-03-22',
    '2026-03-16'

    )

    ).toBe(false);

});

test("same date valid",()=>{

    expect(

    isDateRangeValid(
    '2026-03-22',
    '2026-03-22'

    )

    ).toBe(true);

});

test("missing date invalid",()=>{

    expect(isDateRangeValid(null,null)).toBe(false);

});