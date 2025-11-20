export default [
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                global: "readonly",
                log: "readonly",
                print: "readonly",
                imports: "readonly",
                ARGV: "readonly",
                Adw: "readonly",
                Gtk: "readonly",
                Gio: "readonly",
                GLib: "readonly",
                GObject: "readonly",
                St: "readonly",
                Clutter: "readonly",
                Shell: "readonly",
                Main: "readonly"
            }
        },
        rules: {
            // Level 1: Cleanliness
            "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
            "no-undef": "off",

            // Level 2: Best Practices
            "eqeqeq": "warn",
            "no-var": "error",
            "prefer-const": "warn",
            
            // Allow empty catch blocks (which we just made), but warn on other empty blocks
            "no-empty": ["warn", { "allowEmptyCatch": true }]
        }
    }
];
