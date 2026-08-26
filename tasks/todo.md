# WebView2 release migration

## Task 1: Define the source boundary and loopback endpoint

**Description:** Keep the WebView2 host and release scripts in this repo and fetch Vyline application/backend sources only during a release build.

**Acceptance criteria:**
- [ ] A manual build accepts a Vyline repository ref.
- [ ] The build workspace has no runtime dependency on a copied backend committed to Desktop.
- [ ] Web uses `3001`; Desktop reserves an available loopback port instead of using a fixed port.

**Verification:** Inspect the staged tree and run the local preparation command.

**Dependencies:** None

## Task 1a: Implement WebView2 host

**Description:** Start the fetched Vyline sidecar on a dynamically reserved loopback port and load the fetched renderer from that same origin in WebView2.

**Acceptance criteria:**
- [ ] WebView2 navigates only to the local loopback origin.
- [ ] Backend and WebView2 use the same dynamically selected port.
- [ ] WebView2 user data is stored in a writable per-user directory.

**Verification:** Run the host twice while the Web backend is running and confirm both instances start.

**Dependencies:** Task 1

## Task 2: Implement the manual draft workflow

**Description:** Checkout Desktop and Vyline independently, apply the WebView2 host preparation, build Windows artifacts, and create a draft prerelease.

**Acceptance criteria:**
- [ ] Workflow is triggered by `workflow_dispatch` only.
- [ ] Portable WebView2 ZIP is attached to a draft release.
- [ ] Invalid or mismatched versions fail before publishing.

**Verification:** YAML inspection plus a GitHub Actions run.

**Dependencies:** Task 1

## Task 3: Verify local overlay compatibility

**Description:** Prepare the workspace from a local Vyline checkout and confirm typecheck/build and packaged startup.

**Acceptance criteria:**
- [ ] The WebView2 renderer reaches the login route.
- [ ] The sidecar starts with user-writable data paths.
- [ ] Source metadata is present in the build output.

**Verification:** `bun run typecheck`, Windows unpacked build, and CDP DOM check.

**Dependencies:** Task 1

## Checkpoint

- [ ] Review generated workflow and staged source layout before deleting legacy vendored Vyline code.
