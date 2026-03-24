const {formatDate, validateDate} = require('/src/scripts/utils');

test('formats date correctly', () => {

    const date = new Date();

    expect(formatDate(date)).toBe(date.toISOString().split('T')[0]);

});

test('validates date correctly', () => {

    expect(validateDate(null)).toBe(false);

    expect(validateDate(new Date())).toBe(true);

});