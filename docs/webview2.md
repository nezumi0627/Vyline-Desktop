# WebView2 Desktop architecture

The Desktop repository is intentionally a thin Windows host. Vyline application code is fetched from the selected Vyline repository ref during a manual GitHub Actions run.

## Runtime flow

1. The host reserves an available `127.0.0.1` TCP port.
2. It starts the compiled Bun backend sidecar with that port and a writable per-user data directory.
3. It waits for `/healthz`.
4. WebView2 loads the renderer from the same loopback origin.
5. Navigation outside that origin is cancelled and opened externally.

The web deployment keeps port `3001`; Desktop does not claim a fixed alternate port. This allows the web backend and multiple Desktop instances to coexist.

## Release source boundary

The workflow checks out Desktop and Vyline independently, initializes Vyline submodules recursively, applies only runtime compatibility patches, builds the renderer and backend sidecar, then packages the WebView2 host. No Vyline backend, protocol, plugin, or theme source is maintained in this repository.
