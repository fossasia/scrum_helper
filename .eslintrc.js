module.exports = {
    "env": {
        "browser": true,
        "webextensions": true
    },
    "extends": "eslint:recommended",
    'parserOptions': {
        'parser': 'babel-eslint',
        'ecmaVersion': 2018
    },
    "rules": {
        "indent": [
            "error",
            "tab"
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-unused-vars": [0]
    }
};
