// Render compatibility shim: some service runtime configurations resolve the preload
// relative to the backend working directory, producing backend/backend/preload.mjs.
// Keep the real preload implementation in ../preload.mjs.
await import('../preload.mjs');
