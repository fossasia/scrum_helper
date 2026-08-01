use std::env;

// ─── A CLI argument parser that teaches ownership, borrowing, lifetimes, traits, generics ───

// ---- Step 1: Core types (structs, enums, ownership) ----

/// What kind of argument to expect
#[derive(Debug, Clone, PartialEq)]
pub enum ArgKind {
    Flag,                // --verbose
    String,              // --name <value>
    Positional,          // <file>
}

/// A single argument definition
#[derive(Debug, Clone)]
pub struct Arg<'a> {
    pub long: &'a str,
    pub short: Option<&'a str>,
    pub kind: ArgKind,
    pub help: &'a str,
}

// ---- Step 2: The parser (lifetimes, borrowing) ----

pub struct ArgParser<'a> {
    args: Vec<Arg<'a>>,        // definitions live as long as the parser
}

impl<'a> ArgParser<'a> {
    pub fn new() -> Self {
        ArgParser { args: Vec::new() }
    }

    /// Register an argument definition (borrows the parser mutably)
    pub fn add_arg(&mut self, arg: Arg<'a>) -> &mut Self {
        self.args.push(arg);
        self
    }

    /// Parse raw OS strings into a matched result (lifetimes: output borrows from `args`)
    pub fn parse(&self, raw: &[String]) -> Result<Parsed<'_, 'a>, String> {
        let mut parsed = Parsed {
            flags: Vec::new(),
            strings: Vec::new(),
            positional: Vec::new(),
            args: &self.args,
        };

        let mut i = 1; // skip program name
        while i < raw.len() {
            let token = &raw[i];

            if token.starts_with("--") {
                let name = &token[2..];
                let arg = self.args.iter().find(|a| a.long == name)
                    .ok_or_else(|| format!("unknown flag: {}", token))?;
                match arg.kind {
                    ArgKind::Flag => parsed.flags.push(arg.long),
                    ArgKind::String => {
                        i += 1;
                        let val = raw.get(i).ok_or_else(|| format!("{} needs a value", token))?;
                        parsed.strings.push((arg.long, val.as_str()));
                    }
                    _ => return Err(format!("{} is not a flag or option", token)),
                }
            } else if token.starts_with("-") && token.len() == 2 {
                let short = &token[1..2];
                let arg = self.args.iter().find(|a| a.short == Some(short))
                    .ok_or_else(|| format!("unknown flag: {}", token))?;
                match arg.kind {
                    ArgKind::Flag => parsed.flags.push(arg.long),
                    ArgKind::String => {
                        i += 1;
                        let val = raw.get(i).ok_or_else(|| format!("{} needs a value", token))?;
                        parsed.strings.push((arg.long, val.as_str()));
                    }
                    _ => return Err(format!("{} is not a flag or option", token)),
                }
            } else {
                // positional
                parsed.positional.push(token.as_str());
            }
            i += 1;
        }

        Ok(parsed)
    }
}

// ---- Step 3: Parsed output (lifetime ties back to parser definitions) ----

pub struct Parsed<'a, 'b> {
    pub flags: Vec<&'b str>,
    pub strings: Vec<(&'b str, &'b str)>,
    pub positional: Vec<&'b str>,
    args: &'a [Arg<'b>],
}

impl<'a, 'b> Parsed<'a, 'b> {
    /// Check if a flag was present — generic over types that can match &str
    pub fn has_flag(&self, name: &str) -> bool {
        self.flags.contains(&name) || self.flags.iter().any(|f| *f == name)
    }

    /// Get a string option value (returns Option)
    pub fn get_string(&self, name: &str) -> Option<&'b str> {
        self.strings.iter()
            .find(|(key, _)| *key == name)
            .map(|(_, val)| *val)
    }

    /// Get a positional argument by index (demonstrates borrowing)
    pub fn get_pos(&self, index: usize) -> Option<&'b str> {
        self.positional.get(index).copied()
    }
}

// ---- Step 4: A trait for display (traits) ----

pub trait DisplayHelp {
    fn print_help(&self);
}

impl<'a> DisplayHelp for ArgParser<'a> {
    fn print_help(&self) {
        println!("Usage: program [OPTIONS] [POSITIONAL...]\n");
        for arg in &self.args {
            let short = match arg.short {
                Some(s) => format!("-{}, ", s),
                None => String::new(),
            };
            println!("  {}{:<15} {}", short, arg.long, arg.help);
        }
    }
}

// ---- Step 5: Generic helper (generics + trait bounds) ----

/// Parse a positional arg into any type that implements FromStr
pub fn parse_pos<T: std::str::FromStr>(parsed: &Parsed<'_, '_>, index: usize) -> Result<T, String> {
    let raw = parsed.get_pos(index)
        .ok_or_else(|| format!("missing positional arg at index {}", index))?;
    raw.parse::<T>().map_err(|_| format!("cannot parse '{}'", raw))
}

// ---- Step 6: Main — puts it all together ----

fn main() {
    // --- Build parser ---
    let mut parser = ArgParser::new();
    parser
        .add_arg(Arg {
            long: "verbose",
            short: Some("v"),
            kind: ArgKind::Flag,
            help: "Enable verbose output",
        })
        .add_arg(Arg {
            long: "name",
            short: Some("n"),
            kind: ArgKind::String,
            help: "Your name",
        })
        .add_arg(Arg {
            long: "count",
            short: Some("c"),
            kind: ArgKind::String,
            help: "How many times",
        });

    // --- Parse ---
    let raw: Vec<String> = env::args().collect();
    match parser.parse(&raw) {
        Ok(parsed) => {
            // --- Use parsed data ---
            if parsed.has_flag("verbose") {
                println!("(verbose mode on)");
            }

            if let Some(name) = parsed.get_string("name") {
                println!("Hello, {}!", name);
            }

            // Extract the optional "count" string argument and parse it
            if let Some(count_str) = parsed.get_string("count") {
                match count_str.parse::<u32>() {
                    Ok(n) => println!("Count: {}", n),
                    Err(e) => eprintln!("Invalid count: {}", e),
                }
            }

            // --- Demonstrate ownership/borrowing ---
            // parsed owns the vectors of borrowed references
            // --verbose         => flags: ["verbose"]
            // --name Alice      => strings: [("name", "Alice")]
            // 42                => positional: ["42"]
            println!("\nDebug: {:#?}", parsed);
        }
        Err(e) => {
            parser.print_help();
            eprintln!("\nError: {}", e);
        }
    }
}