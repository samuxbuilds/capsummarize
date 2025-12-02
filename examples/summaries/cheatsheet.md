# Rust Programming Full Course | Learn ⚙️ in 2024 | #rustprogramming #rust

**Source:** [Rust Programming Full Course | Learn ⚙️ in 2024 | #rustprogramming #rust](https://www.youtube.com/watch?v=rQ_J9WH6CGk)
**Style:** Cheatsheet
**Provider:** Mistral
**Generated:** 2025-12-02

---

# Rust Cheatsheet

## Quick Reference
- **Purpose**: Systems programming language focused on **speed, safety, concurrency, and portability**—like C/C++ but with modern features and memory safety guarantees.
- **Use Cases**:
  - Building operating systems, game engines, embedded systems
  - High-performance, low-level control with high-level ergonomics
  - WebAssembly, networking, CLI tools
- **Prerequisites**:
  - Install [Rustup](https://rustup.rs/) (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
  - `rustc` (compiler), `cargo` (package manager)

---

## Syntax Snapshot
- **File ext / run command**: `[main.rs]` / `rustc main.rs && ./main` or `cargo run`
- **Basic Hello/Print**:
```rust
fn main() {
    println!("Hello, world!");
}
```

---

## Core Concepts

### Variables
- **What**: Immutable by default. Use `mut` to make mutable.
- **Example**:
```rust
let x = 5; // immutable
let mut y = 10; // mutable
y = 15; // allowed
```

### Primitive Data Types
- **Integers**: `i8`, `i16`, `i32`, `i64`, `i128` (signed); `u8`, `u16`, `u32`, `u64`, `u128` (unsigned)
- **Floats**: `f32`, `f64`
- **Boolean**: `bool` (`true`/`false`)
- **Character**: `char` (Unicode scalar value)
- **Example**:
```rust
let a: i32 = -42;
let b: u64 = 100;
let pi: f64 = 3.14;
let is_snowing: bool = true;
let letter: char = 'A';
```

### Compound Data Types
- **Arrays**: Fixed-size, homogeneous
```rust
let numbers: [i32; 5] = [1, 2, 3, 4, 5];
let first = numbers[0]; // 1
```
- **Tuples**: Fixed-size, heterogeneous
```rust
let human: (&str, i32, bool) = ("Alice", 30, true);
let name = human.0; // "Alice"
```
- **Slices**: Dynamically sized view into a contiguous sequence
```rust
let slice: &[i32] = &numbers[1..3]; // [2, 3]
```
- **Strings**: Growable, UTF-8 encoded
```rust
let mut s = String::from("hello");
s.push_str(", world!");
```

### Functions
- **Definition**:
```rust
fn add(a: i32, b: i32) -> i32 {
    a + b // no semicolon = return value
}
```
- **Calling**:
```rust
let sum = add(2, 3); // 5
```

### Ownership & Borrowing
- **Rules**:
  1. Each value has one owner.
  2. Only one owner at a time.
  3. When owner goes out of scope, value is dropped.
- **Borrowing**: Use `&` for immutable, `&mut` for mutable references.
```rust
let s = String::from("hello");
let len = calculate_length(&s); // borrow
fn calculate_length(s: &String) -> usize {
    s.len()
}
```

### Structs
- **Definition**:
```rust
struct User {
    active: bool,
    username: String,
    email: String,
    sign_in_count: u64,
}
```
- **Instantiation**:
```rust
let user1 = User {
    email: String::from("user@example.com"),
    username: String::from("user1"),
    active: true,
    sign_in_count: 1,
};
```

### Enums
- **Definition**:
```rust
enum IpAddr {
    V4(u8, u8, u8, u8),
    V6(String),
}
```
- **Usage**:
```rust
let home = IpAddr::V4(127, 0, 0, 1);
```

### Error Handling
- **Option**:
```rust
fn divide(a: f64, b: f64) -> Option<f64> {
    if b == 0.0 { None } else { Some(a / b) }
}
```
- **Result**:
```rust
fn divide(a: f64, b: f64) -> Result<f64, String> {
    if b == 0.0 { Err(String::from("Cannot divide by zero")) }
    else { Ok(a / b) }
}
```

### Collections
- **Vector**:
```rust
let mut v = vec![1, 2, 3];
v.push(4); // [1, 2, 3, 4]
```
- **HashMap**:
```rust
use std::collections::HashMap;
let mut scores = HashMap::new();
scores.insert(String::from("Blue"), 10);
```

---

## Code Examples — From the Video

### Hello World
```rust
fn main() {
    println!("Hello, Rust!");
}
```

### Function with Return
```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}
fn main() {
    println!("Sum: {}", add(2, 3));
}
```

### Struct and Method
```rust
struct Rectangle {
    width: u32,
    height: u32,
}
impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }
}
fn main() {
    let rect = Rectangle { width: 30, height: 50 };
    println!("Area: {}", rect.area());
}
```

### Error Handling with Option
```rust
fn divide(a: f64, b: f64) -> Option<f64> {
    if b == 0.0 { None } else { Some(a / b) }
}
fn main() {
    match divide(10.0, 2.0) {
        Some(result) => println!("Result: {}", result),
        None => println!("Cannot divide by zero!"),
    }
}
```

---

## Quick Tips & Gotchas ⚠️
- **Tip**: Use `cargo new` to start a new project.
- **Gotcha**: Variables are immutable by default. Use `mut` to make them mutable.
- **Tip**: Use `&` to borrow, `&mut` to borrow mutably.
- **Gotcha**: Only one mutable reference or any number of immutable references per value at a time.

---

## Common Mistakes & Fixes ❌➡️✅

**Wrong:**
```rust
let x = 5;
x = 6; // Error: cannot assign twice to immutable variable
```

**Right:**
```rust
let mut x = 5;
x = 6; // OK
```

---

## Summary for Revision
- Rust is **fast, safe, and concurrent**.
- **Ownership** and **borrowing** are unique features for memory safety.
- **Structs** and **enums** are powerful for data modeling.
- **Error handling** is explicit with `Option` and `Result`.

---

## Key Interview Takeaways 💡
- **What to memorize**:
  - Ownership rules
  - Borrowing and references (`&`, `&mut`)
  - Common collections (`Vec`, `HashMap`, `String`)
- **What to explain**:
  - How Rust ensures memory safety without garbage collection
  - The difference between `String` and `&str`
  - How to handle errors with `Option` and `Result`