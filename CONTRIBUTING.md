# Contributing to CapSummarize

Thank you for your interest in contributing to CapSummarize! We welcome contributions from the community to help improve this project.

## Getting Started

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone https://github.com/YOUR_USERNAME/capsummarize-frontend.git
    cd capsummarize-frontend
    ```
3.  **Install dependencies** (we recommend [Bun](https://bun.sh)):
    ```bash
    bun install
    # or
    npm install
    ```
4.  **Create a new branch** for your feature or fix:
    ```bash
    git checkout -b feature/my-awesome-feature
    ```

## Development

Run the development server to build the extension in watch mode:

```bash
bun run dev
# or
npm run dev
```

Load the `dist/` folder as an unpacked extension in Chrome (`chrome://extensions` -> "Load unpacked").

## Code Style & Quality

We use ESLint and Prettier to maintain code quality. Please ensure your code passes all checks before submitting a PR.

-   **Linting**: `npm run lint`
-   **Formatting**: `npm run format`
-   **Type Checking**: `npm run type-check`

## Submitting a Pull Request

1.  Ensure your code follows the project's style and passes all tests.
2.  Commit your changes with clear, descriptive messages.
3.  Push your branch to your fork.
4.  Open a Pull Request against the `main` branch of the original repository.
5.  Provide a clear description of your changes and the problem they solve.

## Reporting Issues

If you find a bug or have a feature request, please open an issue on the GitHub repository. Provide as much detail as possible, including steps to reproduce the issue.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
